import { randomUUID } from 'node:crypto';

import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { appendEvent, getAggregateVersion } from '@/modules/eventing';
import {
  assertAccess,
  grantAssignments,
  recordAudit,
  requireRole,
} from '@/modules/identity';
import { createGeoPoint, createSla } from '@/modules/platform';

import type { VehicleActor, VehicleObservationInput } from './contracts';
import { canVerifyVehicle, isRegistryActive } from './domain';
import { normalizePlate } from './contracts';

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
  if (actor.roles.includes('commander')) return;
  await assertAccess(
    actor,
    { resourceType: 'VehicleObservation', resourceId: observationId },
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
  requireRole(actor, 'commander', 'office_officer');
  const plate = normalizePlate(input.plate);
  const validFrom = assertDate(input.validFrom, 'REGISTRY_FIELDS_REQUIRED');
  const validUntil = input.validUntil
    ? assertDate(input.validUntil, 'REGISTRY_FIELDS_REQUIRED')
    : undefined;
  assertRegistryWindow(validFrom, validUntil);
  if (!plate || !input.source.trim() || !input.reason.trim()) {
    throw new Error('REGISTRY_FIELDS_REQUIRED');
  }

  return prisma.$transaction(async (tx) => {
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
      payload: { plate, validFrom: validFrom.toISOString() },
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
  requireRole(actor, 'commander', 'office_officer');
  return prisma.$transaction(async (tx) => {
    const current = await tx.suspiciousVehicleEntry.findUnique({
      where: { id: input.entryId },
    });
    if (!current) throw new Error('REGISTRY_NOT_FOUND');
    const validUntil = input.validUntil
      ? assertDate(input.validUntil, 'INVALID_REGISTRY_WINDOW')
      : (current.validUntil ?? undefined);
    assertRegistryWindow(current.validFrom, validUntil);
    const updated = await tx.suspiciousVehicleEntry.update({
      where: { id: current.id },
      data: {
        status: input.status?.trim() || current.status,
        reason: input.reason?.trim() || current.reason,
        validUntil,
      },
    });
    const aggregateVersion =
      (await getAggregateVersion(tx, 'SuspiciousVehicleRegistry', current.id)) +
      1;
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
}

export async function recordVehicleObservation(
  input: VehicleObservationInput,
  actor: VehicleActor,
) {
  requireRole(actor, 'commander', 'field_officer', 'village_officer');
  const plate = normalizePlate(input.plate);
  const observedAt = assertDate(
    input.observedAt,
    'OBSERVATION_FIELDS_REQUIRED',
  );
  createGeoPoint(input.latitude, input.longitude);
  if (!plate) throw new Error('OBSERVATION_FIELDS_REQUIRED');

  return prisma.$transaction(async (tx) => {
    if (input.clientCommandId) {
      const existing = await tx.vehicleObservation.findUnique({
        where: { clientCommandId: input.clientCommandId },
      });
      if (existing) return { observation: existing, match: null };
    }

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
      payload: { plate, matchedRegistryId: match?.id },
      metadata: {},
    });
    if (match) {
      await appendEvent(tx, {
        eventId: randomUUID(),
        eventType: 'SuspiciousVehicleMatched',
        eventVersion: 1,
        aggregateType: 'VehicleObservation',
        aggregateId: observation.id,
        aggregateVersion: 2,
        occurredAt: new Date(),
        actor: eventActor,
        payload: { registryId: match.id, requiresConfirmation: true },
        metadata: {},
      });
    }
    await grantAssignments(
      tx,
      {
        resourceType: 'VehicleObservation',
        resourceId: observation.id,
        task: 'vehicle_verification',
        assigneeUserIds: [actor.id],
        organizationId: actor.organizationUnitId,
      },
      actor,
      ['commander', 'field_officer', 'village_officer'],
    );
    await createSla(
      {
        resourceType: 'VehicleObservation',
        resourceId: observation.id,
        rule: { kind: 'vehicle_escalation_2h', durationMs: 2 * 60 * 60 * 1000 },
        startedAt: observedAt,
        assigneeUserId: actor.id,
      },
      tx,
    );
    await recordAudit(
      {
        actor,
        resourceType: 'VehicleObservation',
        resourceId: observation.id,
        operation: 'vehicle_observation.created',
        metadata: { matchedRegistryId: match?.id },
      },
      tx,
    );
    return { observation, match };
  });
}

export async function confirmVehicleMatch(
  observationId: string,
  actor: VehicleActor,
) {
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
  if (observation.status !== 'match_suggested')
    throw new Error('MATCH_NOT_PENDING');
  return prisma.$transaction(async (tx) => {
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
      payload: { registryId: observation.matchedRegistryId },
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
}

export async function verifyVehicleObservation(
  input: {
    observationId: string;
    result: string;
    notes: string;
    latitude?: number;
    longitude?: number;
    evidenceIds?: string[];
  },
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
  if (observation.status === 'match_suggested')
    throw new Error('MATCH_CONFIRMATION_REQUIRED');
  if (!input.result.trim() || !input.notes.trim())
    throw new Error('VERIFICATION_FIELDS_REQUIRED');
  if (input.latitude !== undefined && input.longitude !== undefined) {
    createGeoPoint(input.latitude, input.longitude);
  }

  return prisma.$transaction(async (tx) => {
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
        throw new Error('EVIDENCE_NOT_FOUND');
    }
    const verification = await tx.vehicleVerification.create({
      data: {
        observationId: input.observationId,
        result: input.result.trim(),
        notes: input.notes.trim(),
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
      payload: { verificationId: verification.id, result: input.result },
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
        metadata: { verificationId: verification.id },
      },
      tx,
    );
    return { observation: updated, verification };
  });
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
  if (observation.status === 'match_suggested')
    throw new Error('MATCH_CONFIRMATION_REQUIRED');
  return prisma.$transaction(async (tx) => {
    const updated = await tx.vehicleObservation.update({
      where: { id: observationId, version: observation.version },
      data: {
        status: 'escalated',
        version: observation.version + 1,
        escalatedAt: new Date(),
      },
    });
    await appendEvent(tx, {
      eventId: randomUUID(),
      eventType: 'VehicleEscalated',
      eventVersion: 1,
      aggregateType: 'VehicleObservation',
      aggregateId: observationId,
      aggregateVersion: updated.version,
      occurredAt: updated.escalatedAt ?? new Date(),
      actor: actorSnapshot(actor),
      payload: { organizationId },
      metadata: {},
    });
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
}
