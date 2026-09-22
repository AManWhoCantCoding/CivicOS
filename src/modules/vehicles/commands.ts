import { randomUUID } from 'node:crypto';

import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { appendEvent, getAggregateVersion } from '@/modules/eventing';
import { recordAudit, requireRole } from '@/modules/identity';
import {
  createGeoPoint,
  createInAppNotification,
  createEvidenceRecord,
  createSla,
} from '@/modules/platform';
import type { EvidenceInput, EvidenceStorageAdapter } from '@/modules/platform';

import type {
  VehicleActor,
  VehicleObservationInput,
  VehicleVerificationInput,
} from './contracts';
import { assertPlateFormat, normalizeOwnerLookup } from './contracts';
import {
  assertRegistryStatus,
  assertVehicleMatchConfirmation,
  canVerifyVehicle,
  isRegistryActive,
  VEHICLE_ESCALATION_SLA,
} from './domain';
import { observationState, registryState } from './projection';

function isRecordNotFound(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  );
}

function isUniqueConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

async function assertObservationEvidence(
  tx: Prisma.TransactionClient,
  evidenceIds: string[],
  actor: VehicleActor,
  pendingToken?: string,
): Promise<void> {
  const evidence = await tx.evidence.findMany({
    where: { id: { in: evidenceIds } },
    select: {
      id: true,
      mimeType: true,
      resourceType: true,
      resourceId: true,
      actorId: true,
    },
  });
  if (evidence.length !== evidenceIds.length)
    throw new Error('EVIDENCE_NOT_FOUND');
  if (
    !pendingToken ||
    evidence.some(
      ({ resourceType, resourceId, actorId }) =>
        resourceType !== 'VehicleObservation' ||
        resourceId !== `pending-${pendingToken}` ||
        actorId !== actor.id,
    )
  ) {
    throw new Error('EVIDENCE_SCOPE_FORBIDDEN');
  }
  if (evidence.some(({ mimeType }) => !mimeType.startsWith('image/'))) {
    throw new Error('EVIDENCE_NOT_IMAGE');
  }
}

function actorSnapshot(actor: VehicleActor) {
  return {
    id: actor.id,
    name: actor.name,
    role: actor.roles[0],
    organizationId: actor.organizationUnitId,
  };
}

function assertDate(value: string, error: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(error);
  return parsed;
}

function assertRegistryWindow(validFrom: Date, validUntil?: Date) {
  if (validUntil && validUntil <= validFrom)
    throw new Error('INVALID_REGISTRY_WINDOW');
}

async function assertObservationAccess(
  observationId: string,
  observedById: string,
  actor: VehicleActor,
  action: 'read' | 'mutate',
) {
  const observer = await prisma.user.findUnique({
    where: { id: observedById },
    select: { organizationUnitId: true },
  });
  if (
    actor.organizationUnitId &&
    observer?.organizationUnitId &&
    actor.organizationUnitId !== observer.organizationUnitId
  )
    throw new Error('FORBIDDEN');
  const assignment = await prisma.assignment.findFirst({
    where: {
      resourceType: 'VehicleObservation',
      resourceId: observationId,
      assigneeUserId: actor.id,
      status: 'active',
      task: { in: ['vehicle_report', 'vehicle_verification'] },
      ...(actor.organizationUnitId
        ? { organizationId: actor.organizationUnitId }
        : {}),
    },
  });
  const commandRead =
    action === 'read' &&
    (actor.roles.includes('commander') ||
      actor.roles.includes('superior_commander'));
  if (!assignment && !commandRead) throw new Error('FORBIDDEN');
}

async function grantVehicleAssignment(
  tx: Prisma.TransactionClient,
  observationId: string,
  actor: VehicleActor,
  task: 'vehicle_report' | 'vehicle_verification' = 'vehicle_report',
) {
  const assignment = await tx.assignment.create({
    data: {
      resourceType: 'VehicleObservation',
      resourceId: observationId,
      task,
      assigneeUserId: actor.id,
      grantedById: actor.id,
      organizationId: actor.organizationUnitId,
    },
  });
  await appendEvent(tx, {
    eventId: randomUUID(),
    eventType: 'AssignmentGranted',
    eventVersion: 1,
    aggregateType: 'Assignment',
    aggregateId: assignment.id,
    aggregateVersion: 1,
    occurredAt: assignment.grantedAt,
    actor: actorSnapshot(actor),
    payload: {
      resourceType: assignment.resourceType,
      resourceId: assignment.resourceId,
      assigneeUserId: assignment.assigneeUserId,
      task: assignment.task,
    },
    metadata: {},
  });
  await recordAudit(
    {
      actor,
      resourceType: 'VehicleObservation',
      resourceId: observationId,
      operation: 'assignment.granted',
      reason: assignment.task,
      metadata: { assignmentIds: [assignment.id] },
    },
    tx,
  );
}

export async function assertVehicleObservationAccess(
  observationId: string,
  actor: VehicleActor,
  action: 'read' | 'mutate',
) {
  const observation = await prisma.vehicleObservation.findUnique({
    where: { id: observationId },
    select: { observedById: true },
  });
  if (!observation) throw new Error('OBSERVATION_NOT_FOUND');
  await assertObservationAccess(
    observationId,
    observation.observedById,
    actor,
    action,
  );
}

export async function createRegistryEntry(
  input: {
    plate: string;
    source: string;
    reason: string;
    validFrom: string;
    validUntil?: string;
  },
  actor: VehicleActor,
) {
  requireRole(actor, 'commander');
  if (!input.plate?.trim() || !input.source.trim() || !input.reason.trim()) {
    throw new Error('REGISTRY_FIELDS_REQUIRED');
  }
  const plate = assertPlateFormat(input.plate);
  const validFrom = assertDate(input.validFrom, 'REGISTRY_FIELDS_REQUIRED');
  const validUntil = input.validUntil
    ? assertDate(input.validUntil, 'REGISTRY_FIELDS_REQUIRED')
    : undefined;
  assertRegistryWindow(validFrom, validUntil);

  try {
    return await prisma.$transaction(async (tx) => {
      const activeEntries = await tx.suspiciousVehicleEntry.findMany({
        where: { plate, status: 'active' },
      });
      const overlaps = activeEntries.some(
        (entry) =>
          entry.validFrom <=
            (validUntil ?? new Date('9999-12-31T23:59:59.999Z')) &&
          (!entry.validUntil || entry.validUntil >= validFrom),
      );
      if (overlaps) throw new Error('DUPLICATE_ACTIVE_REGISTRY');

      const entry = await tx.suspiciousVehicleEntry.create({
        data: {
          plate,
          source: input.source.trim(),
          reason: input.reason.trim(),
          validFrom,
          validUntil,
          createdById: actor.id,
        },
      });
      await appendEvent(tx, {
        eventId: randomUUID(),
        eventType: 'SuspiciousVehicleRegistered',
        eventVersion: 1,
        aggregateType: 'SuspiciousVehicleRegistry',
        aggregateId: entry.id,
        aggregateVersion: 1,
        occurredAt: entry.createdAt,
        actor: actorSnapshot(actor),
        payload: {
          plate,
          validFrom: validFrom.toISOString(),
          state: registryState(entry),
        },
        metadata: {},
      });
      await recordAudit(
        {
          actor,
          resourceType: 'SuspiciousVehicleRegistry',
          resourceId: entry.id,
          operation: 'vehicle_registry.created',
        },
        tx,
      );
      return entry;
    });
  } catch (error) {
    if (isUniqueConflict(error)) throw new Error('DUPLICATE_ACTIVE_REGISTRY');
    throw error;
  }
}

export async function updateRegistryEntry(
  input: {
    entryId: string;
    status?: string;
    validUntil?: string;
    reason?: string;
  },
  actor: VehicleActor,
) {
  requireRole(actor, 'commander');
  if (input.status !== undefined) assertRegistryStatus(input.status.trim());
  try {
    return await prisma.$transaction(async (tx) => {
      const current = await tx.suspiciousVehicleEntry.findUnique({
        where: { id: input.entryId },
      });
      if (!current) throw new Error('REGISTRY_NOT_FOUND');
      const origin = await tx.eventRecord.findFirst({
        where: {
          aggregateType: 'SuspiciousVehicleRegistry',
          aggregateId: input.entryId,
        },
        orderBy: { aggregateVersion: 'asc' },
        select: { organizationId: true },
      });
      if (
        origin?.organizationId &&
        origin.organizationId !== actor.organizationUnitId
      ) {
        throw new Error('FORBIDDEN');
      }
      const nextStatus = input.status?.trim() || current.status;
      const validUntil = input.validUntil
        ? assertDate(input.validUntil, 'INVALID_REGISTRY_WINDOW')
        : (current.validUntil ?? undefined);
      assertRegistryWindow(current.validFrom, validUntil);
      if (nextStatus === 'active') {
        const rivals = await tx.suspiciousVehicleEntry.findMany({
          where: {
            plate: current.plate,
            status: 'active',
            id: { not: current.id },
          },
        });
        const windowEnd = validUntil ?? new Date('9999-12-31T23:59:59.999Z');
        const overlaps = rivals.some(
          (entry) =>
            entry.validFrom <= windowEnd &&
            (!entry.validUntil || entry.validUntil >= current.validFrom),
        );
        if (overlaps) throw new Error('DUPLICATE_ACTIVE_REGISTRY');
      }
      const updated = await tx.suspiciousVehicleEntry.update({
        where: { id: current.id },
        data: {
          status: nextStatus,
          reason: input.reason?.trim() || current.reason,
          validUntil,
        },
      });
      const aggregateVersion =
        (await getAggregateVersion(
          tx,
          'SuspiciousVehicleRegistry',
          current.id,
        )) + 1;
      await appendEvent(tx, {
        eventId: randomUUID(),
        eventType: 'SuspiciousVehicleRegistryUpdated',
        eventVersion: 1,
        aggregateType: 'SuspiciousVehicleRegistry',
        aggregateId: current.id,
        aggregateVersion,
        occurredAt: updated.updatedAt,
        actor: actorSnapshot(actor),
        payload: {
          status: updated.status,
          validUntil: updated.validUntil?.toISOString(),
          state: registryState(updated),
        },
        metadata: {},
      });
      await recordAudit(
        {
          actor,
          resourceType: 'SuspiciousVehicleRegistry',
          resourceId: current.id,
          operation: 'vehicle_registry.updated',
        },
        tx,
      );
      return updated;
    });
  } catch (error) {
    if (isUniqueConflict(error)) throw new Error('DUPLICATE_ACTIVE_REGISTRY');
    throw error;
  }
}

export async function recordVehicleObservation(
  input: VehicleObservationInput,
  actor: VehicleActor,
) {
  requireRole(actor, 'field_officer', 'village_officer');
  if (!input.plate?.trim()) throw new Error('OBSERVATION_FIELDS_REQUIRED');
  const plate = assertPlateFormat(input.plate);
  const observedAt = assertDate(
    input.observedAt,
    'OBSERVATION_FIELDS_REQUIRED',
  );
  createGeoPoint(input.latitude, input.longitude);
  const evidenceIds = input.evidenceIds ?? [];

  try {
    return await prisma.$transaction(async (tx) => {
      if (input.clientCommandId) {
        const existing = await tx.vehicleObservation.findUnique({
          where: { clientCommandId: input.clientCommandId },
        });
        if (existing) return { observation: existing, match: null };
      }
      if (evidenceIds.length)
        await assertObservationEvidence(
          tx,
          evidenceIds,
          actor,
          input.clientCommandId,
        );

      const activeEntries = await tx.suspiciousVehicleEntry.findMany({
        where: { plate, status: 'active' },
      });
      const match = activeEntries.find((entry) =>
        isRegistryActive(entry, observedAt),
      );
      const observation = await tx.vehicleObservation.create({
        data: {
          plate,
          observedAt,
          latitude: input.latitude,
          longitude: input.longitude,
          description: input.description?.trim() || undefined,
          observedById: actor.id,
          clientCommandId: input.clientCommandId,
          evidenceIds: (input.evidenceIds ?? []) as Prisma.InputJsonValue,
          matchedRegistryId: match?.id,
          version: match ? 2 : 1,
          status: match ? 'match_suggested' : 'recorded',
        },
      });
      if (evidenceIds.length) {
        await tx.evidence.updateMany({
          where: {
            id: { in: evidenceIds },
            resourceType: 'VehicleObservation',
            resourceId: `pending-${input.clientCommandId}`,
          },
          data: { resourceId: observation.id },
        });
      }
      const eventActor = actorSnapshot(actor);
      await appendEvent(tx, {
        eventId: randomUUID(),
        eventType: 'VehicleObservationRecorded',
        eventVersion: 1,
        aggregateType: 'VehicleObservation',
        aggregateId: observation.id,
        aggregateVersion: 1,
        occurredAt: observedAt,
        actor: eventActor,
        payload: {
          plate,
          matchedRegistryId: match?.id,
          state: observationState({
            ...observation,
            status: 'recorded',
            version: 1,
            matchedRegistryId: null,
            matchConfirmedAt: null,
            matchConfirmedById: null,
            escalatedAt: null,
          }),
        },
        metadata: {},
      });
      if (match) {
        const matchedEvent = await appendEvent(tx, {
          eventId: randomUUID(),
          eventType: 'SuspiciousVehicleMatched',
          eventVersion: 1,
          aggregateType: 'VehicleObservation',
          aggregateId: observation.id,
          aggregateVersion: 2,
          occurredAt: new Date(),
          actor: eventActor,
          payload: {
            registryId: match.id,
            requiresConfirmation: true,
            state: observationState(observation),
          },
          metadata: {},
        });
        await createInAppNotification(
          {
            userId: actor.id,
            type: 'vehicle_match_suggested',
            title: 'Phat hien trung khop bien so can chu y',
            body: `Bien so ${plate} trung khop danh muc theo doi. Can xac nhan truoc khi xac minh hoac leo thang.`,
            resourceType: 'VehicleObservation',
            resourceId: observation.id,
            sourceEventId: matchedEvent.eventId,
          },
          tx,
        );
      }
      await grantVehicleAssignment(tx, observation.id, actor);
      if (actor.roles.includes('field_officer'))
        await grantVehicleAssignment(
          tx,
          observation.id,
          actor,
          'vehicle_verification',
        );
      await createSla(
        {
          resourceType: 'VehicleObservation',
          resourceId: observation.id,
          rule: VEHICLE_ESCALATION_SLA,
          startedAt: observedAt,
          assigneeUserId: actor.id,
        },
        tx,
      );
      const creationAudit = await recordAudit(
        {
          actor,
          resourceType: 'VehicleObservation',
          resourceId: observation.id,
          operation: 'vehicle_observation.created',
          metadata: { matchedRegistryId: match?.id, evidenceIds },
        },
        tx,
      );
      return {
        observation,
        match: match ?? null,
        auditId: creationAudit.id,
      };
    });
  } catch (error) {
    if (isUniqueConflict(error) && input.clientCommandId) {
      const existing = await prisma.vehicleObservation.findUnique({
        where: { clientCommandId: input.clientCommandId },
      });
      if (existing) return { observation: existing, match: null };
    }
    throw error;
  }
}

export async function attachVehicleObservationEvidence(
  observationId: string,
  evidenceIds: string[],
  actor: VehicleActor,
) {
  if (!evidenceIds.length) throw new Error('EVIDENCE_REQUIRED');
  const observation = await prisma.vehicleObservation.findUnique({
    where: { id: observationId },
  });
  if (!observation) throw new Error('OBSERVATION_NOT_FOUND');
  requireRole(actor, 'field_officer', 'village_officer');
  await assertObservationAccess(
    observationId,
    observation.observedById,
    actor,
    'mutate',
  );

  return prisma.$transaction(async (tx) => {
    const evidence = await tx.evidence.findMany({
      where: {
        id: { in: evidenceIds },
        resourceType: 'VehicleObservation',
        resourceId: observationId,
      },
      select: { id: true, mimeType: true },
    });
    if (evidence.length !== evidenceIds.length)
      throw new Error('EVIDENCE_SCOPE_FORBIDDEN');
    if (evidence.some(({ mimeType }) => !mimeType.startsWith('image/')))
      throw new Error('EVIDENCE_NOT_IMAGE');

    const currentIds = Array.isArray(observation.evidenceIds)
      ? observation.evidenceIds.filter(
          (value): value is string => typeof value === 'string',
        )
      : [];
    const attachedIds = [...new Set([...currentIds, ...evidenceIds])];
    const updated = await tx.vehicleObservation.update({
      where: { id: observationId, version: observation.version },
      data: {
        evidenceIds: attachedIds as Prisma.InputJsonValue,
        version: observation.version + 1,
      },
    });
    await appendEvent(tx, {
      eventId: randomUUID(),
      eventType: 'VehicleObservationEvidenceAttached',
      eventVersion: 1,
      aggregateType: 'VehicleObservation',
      aggregateId: observationId,
      aggregateVersion: updated.version,
      occurredAt: new Date(),
      actor: actorSnapshot(actor),
      payload: { evidenceIds: attachedIds, state: observationState(updated) },
      metadata: {},
    });
    const creationAudit = await tx.auditEvent.findFirst({
      where: {
        resourceType: 'VehicleObservation',
        resourceId: observationId,
        operation: 'vehicle_observation.created',
      },
      orderBy: { occurredAt: 'asc' },
    });
    if (creationAudit) {
      await tx.auditEvent.update({
        where: { id: creationAudit.id },
        data: {
          metadata: {
            ...(creationAudit.metadata as Record<string, unknown>),
            evidenceIds: attachedIds,
          } as Prisma.InputJsonValue,
        },
      });
    }
    await recordAudit(
      {
        actor,
        resourceType: 'VehicleObservation',
        resourceId: observationId,
        operation: 'vehicle_observation.evidence_attached',
        metadata: { evidenceIds: attachedIds },
      },
      tx,
    );
    return updated;
  });
}

export async function createVehicleObservationEvidence(
  storage: EvidenceStorageAdapter,
  input: EvidenceInput,
  actor: VehicleActor,
) {
  requireRole(actor, 'field_officer', 'village_officer');
  if (input.resourceType !== 'VehicleObservation')
    throw new Error('EVIDENCE_RESOURCE_TYPE_FORBIDDEN');
  if (input.actorId !== actor.id) throw new Error('EVIDENCE_ACTOR_MISMATCH');
  const observation = await prisma.vehicleObservation.findUnique({
    where: { id: input.resourceId },
  });
  if (!observation) throw new Error('OBSERVATION_NOT_FOUND');
  await assertObservationAccess(
    observation.id,
    observation.observedById,
    actor,
    'mutate',
  );

  let storedEvidenceKey: string | undefined;
  try {
    return await prisma.$transaction(async (tx) => {
      const created = await createEvidenceRecord(storage, input, tx);
      if (created.stored) storedEvidenceKey = created.evidence.storageKey;
      if (!created.evidence.mimeType.startsWith('image/'))
        throw new Error('EVIDENCE_NOT_IMAGE');

      const currentIds = Array.isArray(observation.evidenceIds)
        ? observation.evidenceIds.filter(
            (value): value is string => typeof value === 'string',
          )
        : [];
      const attachedIds = [...new Set([...currentIds, created.evidence.id])];
      const updated = await tx.vehicleObservation.update({
        where: { id: observation.id, version: observation.version },
        data: {
          evidenceIds: attachedIds as Prisma.InputJsonValue,
          version: observation.version + 1,
        },
      });
      await appendEvent(tx, {
        eventId: randomUUID(),
        eventType: 'VehicleObservationEvidenceAttached',
        eventVersion: 1,
        aggregateType: 'VehicleObservation',
        aggregateId: observation.id,
        aggregateVersion: updated.version,
        occurredAt: new Date(),
        actor: actorSnapshot(actor),
        payload: { evidenceIds: attachedIds, state: observationState(updated) },
        metadata: {},
      });
      const creationAudit = await tx.auditEvent.findFirst({
        where: {
          resourceType: 'VehicleObservation',
          resourceId: observation.id,
          operation: 'vehicle_observation.created',
        },
        orderBy: { occurredAt: 'asc' },
      });
      if (creationAudit) {
        await tx.auditEvent.update({
          where: { id: creationAudit.id },
          data: {
            metadata: {
              ...(creationAudit.metadata as Record<string, unknown>),
              evidenceIds: attachedIds,
            } as Prisma.InputJsonValue,
          },
        });
      }
      await recordAudit(
        {
          actor,
          resourceType: 'VehicleObservation',
          resourceId: observation.id,
          operation: 'evidence.uploaded',
          metadata: {
            evidenceId: created.evidence.id,
            originalHash: created.evidence.originalHash,
          },
        },
        tx,
      );
      await recordAudit(
        {
          actor,
          resourceType: 'VehicleObservation',
          resourceId: observation.id,
          operation: 'vehicle_observation.evidence_attached',
          metadata: { evidenceIds: attachedIds },
        },
        tx,
      );
      return created.evidence;
    });
  } catch (error) {
    if (storedEvidenceKey) await storage.remove(storedEvidenceKey);
    throw error;
  }
}

export async function confirmVehicleMatch(
  observationId: string,
  actor: VehicleActor,
  options?: { baseVersion?: number },
) {
  const observation = await prisma.vehicleObservation.findUnique({
    where: { id: observationId },
  });
  if (!observation) throw new Error('OBSERVATION_NOT_FOUND');
  requireRole(actor, 'field_officer');
  await assertObservationAccess(
    observationId,
    observation.observedById,
    actor,
    'mutate',
  );
  if (
    options?.baseVersion !== undefined &&
    options.baseVersion !== observation.version
  )
    throw new Error('STALE_OBSERVATION');
  if (observation.status !== 'match_suggested')
    throw new Error('MATCH_NOT_PENDING');
  try {
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.vehicleObservation.update({
        where: { id: observationId, version: observation.version },
        data: {
          status: 'match_confirmed',
          version: observation.version + 1,
          matchConfirmedAt: new Date(),
          matchConfirmedById: actor.id,
        },
      });
      await appendEvent(tx, {
        eventId: randomUUID(),
        eventType: 'SuspiciousVehicleMatchConfirmed',
        eventVersion: 1,
        aggregateType: 'VehicleObservation',
        aggregateId: observationId,
        aggregateVersion: updated.version,
        occurredAt: new Date(),
        actor: actorSnapshot(actor),
        payload: {
          registryId: observation.matchedRegistryId,
          state: observationState(updated),
        },
        metadata: {},
      });
      await recordAudit(
        {
          actor,
          resourceType: 'VehicleObservation',
          resourceId: observationId,
          operation: 'vehicle_match.confirmed',
        },
        tx,
      );
      return updated;
    });
  } catch (error) {
    if (isRecordNotFound(error)) throw new Error('STALE_OBSERVATION');
    throw error;
  }
}

export async function verifyVehicleObservation(
  input: VehicleVerificationInput,
  actor: VehicleActor,
) {
  if (!canVerifyVehicle(actor.roles)) throw new Error('FORBIDDEN');
  const observation = await prisma.vehicleObservation.findUnique({
    where: { id: input.observationId },
  });
  if (!observation) throw new Error('OBSERVATION_NOT_FOUND');
  await assertObservationAccess(
    input.observationId,
    observation.observedById,
    actor,
    'mutate',
  );
  assertVehicleMatchConfirmation(observation.status);
  if (!input.result.trim() || !input.notes.trim())
    throw new Error('VERIFICATION_FIELDS_REQUIRED');
  const ownerLookup = normalizeOwnerLookup(input.ownerLookup);
  if ((input.latitude === undefined) !== (input.longitude === undefined)) {
    throw new Error('GEOPOINT_INCOMPLETE');
  }
  if (input.latitude !== undefined && input.longitude !== undefined) {
    createGeoPoint(input.latitude, input.longitude);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const evidenceIds = input.evidenceIds ?? [];
      if (evidenceIds.length) {
        const evidence = await tx.evidence.findMany({
          where: {
            id: { in: evidenceIds },
            resourceType: 'VehicleObservation',
            resourceId: input.observationId,
          },
          select: { id: true },
        });
        if (evidence.length !== evidenceIds.length)
          throw new Error('EVIDENCE_SCOPE_FORBIDDEN');
      }
      const verification = await tx.vehicleVerification.create({
        data: {
          observationId: input.observationId,
          result: input.result.trim(),
          notes: input.notes.trim(),
          ownerLookup,
          verifiedById: actor.id,
          latitude: input.latitude,
          longitude: input.longitude,
          evidenceIds: evidenceIds as Prisma.InputJsonValue,
        },
      });
      const updated = await tx.vehicleObservation.update({
        where: { id: input.observationId, version: observation.version },
        data: { status: 'verified', version: observation.version + 1 },
      });
      await appendEvent(tx, {
        eventId: randomUUID(),
        eventType: 'VehicleVerificationRecorded',
        eventVersion: 1,
        aggregateType: 'VehicleObservation',
        aggregateId: input.observationId,
        aggregateVersion: updated.version,
        occurredAt: verification.verifiedAt,
        actor: actorSnapshot(actor),
        payload: {
          verificationId: verification.id,
          result: input.result,
          ownerLookup,
          state: observationState(updated),
        },
        metadata: {},
      });
      await tx.slaInstance.updateMany({
        where: {
          resourceType: 'VehicleObservation',
          resourceId: input.observationId,
          status: 'active',
        },
        data: { status: 'completed', completedAt: new Date() },
      });
      await recordAudit(
        {
          actor,
          resourceType: 'VehicleObservation',
          resourceId: input.observationId,
          operation: 'vehicle_verification.recorded',
          metadata: {
            verificationId: verification.id,
            ownerLookup,
            evidenceIds,
          },
        },
        tx,
      );
      return { observation: updated, verification };
    });
  } catch (error) {
    if (isRecordNotFound(error)) throw new Error('STALE_OBSERVATION');
    throw error;
  }
}

async function assertEscalationTarget(
  tx: Prisma.TransactionClient,
  actor: VehicleActor,
  targetId: string,
) {
  if (!actor.organizationUnitId)
    throw new Error('ORGANIZATION_SCOPE_FORBIDDEN');
  const visited = new Set<string>();
  let currentId: string | null = actor.organizationUnitId;
  while (currentId) {
    if (visited.has(currentId))
      throw new Error('ORGANIZATION_HIERARCHY_INVALID');
    visited.add(currentId);
    if (currentId === targetId) return;
    const current: { parentId: string | null } | null =
      await tx.organizationUnit.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });
    currentId = current?.parentId ?? null;
  }
  throw new Error('ORGANIZATION_SCOPE_FORBIDDEN');
}

export async function escalateVehicleObservation(
  observationId: string,
  actor: VehicleActor,
  organizationId: string,
) {
  if (!canVerifyVehicle(actor.roles)) throw new Error('FORBIDDEN');
  if (!organizationId.trim()) throw new Error('ORGANIZATION_REQUIRED');
  const observation = await prisma.vehicleObservation.findUnique({
    where: { id: observationId },
  });
  if (!observation) throw new Error('OBSERVATION_NOT_FOUND');
  await assertObservationAccess(
    observationId,
    observation.observedById,
    actor,
    'mutate',
  );
  assertVehicleMatchConfirmation(observation.status);
  if (observation.status === 'escalated') return observation;
  try {
    return await prisma.$transaction(async (tx) => {
      const targetOrganization = await tx.organizationUnit.findUnique({
        where: { id: organizationId },
        select: { id: true, active: true },
      });
      if (!targetOrganization?.active)
        throw new Error('ORGANIZATION_NOT_FOUND');
      await assertEscalationTarget(tx, actor, organizationId);
      const updated = await tx.vehicleObservation.update({
        where: { id: observationId, version: observation.version },
        data: {
          status: 'escalated',
          version: observation.version + 1,
          escalatedAt: new Date(),
        },
      });
      const escalatedEvent = await appendEvent(tx, {
        eventId: randomUUID(),
        eventType: 'VehicleEscalated',
        eventVersion: 1,
        aggregateType: 'VehicleObservation',
        aggregateId: observationId,
        aggregateVersion: updated.version,
        occurredAt: updated.escalatedAt ?? new Date(),
        actor: actorSnapshot(actor),
        payload: { organizationId, state: observationState(updated) },
        metadata: {},
      });
      await createInAppNotification(
        {
          userId: actor.id,
          type: 'vehicle_escalated',
          title: 'Phuong tien leo thang xu ly',
          body: `Bien so ${observation.plate} da leo thang len ${organizationId}.`,
          resourceType: 'VehicleObservation',
          resourceId: observationId,
          sourceEventId: escalatedEvent.eventId,
        },
        tx,
      );
      await recordAudit(
        {
          actor,
          resourceType: 'VehicleObservation',
          resourceId: observationId,
          operation: 'vehicle_observation.escalated',
          metadata: { organizationId },
        },
        tx,
      );
      return updated;
    });
  } catch (error) {
    if (isRecordNotFound(error)) throw new Error('STALE_OBSERVATION');
    throw error;
  }
}
