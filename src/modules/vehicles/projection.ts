import { prisma } from '@/lib/prisma';
import type { Prisma, PrismaClient } from '@prisma/client';

import {
  eventPayload,
  eventState,
  readModels,
  registerEventConsumer,
  reduceReadModel,
  replayEvents,
  type DomainEvent,
} from '@/modules/eventing';
import {
  recordAudit,
  requireMobileReadAccess,
  requireRole,
} from '@/modules/identity';

import type { VehicleActor } from './contracts';

const registryProjectionName = 'vehicle-registry-read-model';
const observationProjectionName = 'vehicle-observation-read-model';
/** All vehicle registry and observation event types projected to read models. */
export const vehicleEventTypes = [
  'SuspiciousVehicleRegistered',
  'SuspiciousVehicleRegistryUpdated',
  'VehicleObservationRecorded',
  'VehicleObservationEvidenceAttached',
  'SuspiciousVehicleMatched',
  'SuspiciousVehicleMatchConfirmed',
  'VehicleVerificationRecorded',
  'VehicleEscalated',
];

export function registryState(entry: {
  id: string;
  plate: string;
  source: string;
  reason: string;
  validFrom: Date;
  validUntil: Date | null;
  status: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: entry.id,
    plate: entry.plate,
    source: entry.source,
    reason: entry.reason,
    validFrom: entry.validFrom.toISOString(),
    validUntil: entry.validUntil?.toISOString() ?? null,
    status: entry.status,
    createdById: entry.createdById,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

export function observationState(observation: {
  id: string;
  plate: string;
  observedAt: Date;
  latitude: Prisma.Decimal;
  longitude: Prisma.Decimal;
  description: string | null;
  status: string;
  observedById: string;
  clientCommandId: string | null;
  version: number;
  evidenceIds: Prisma.JsonValue;
  matchedRegistryId: string | null;
  matchConfirmedAt: Date | null;
  matchConfirmedById: string | null;
  escalatedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: observation.id,
    plate: observation.plate,
    observedAt: observation.observedAt.toISOString(),
    latitude: observation.latitude.toString(),
    longitude: observation.longitude.toString(),
    description: observation.description,
    status: observation.status,
    observedById: observation.observedById,
    clientCommandId: observation.clientCommandId,
    version: observation.version,
    evidenceIds: observation.evidenceIds,
    matchedRegistryId: observation.matchedRegistryId,
    matchConfirmedAt: observation.matchConfirmedAt?.toISOString() ?? null,
    matchConfirmedById: observation.matchConfirmedById,
    escalatedAt: observation.escalatedAt?.toISOString() ?? null,
    createdAt: observation.createdAt.toISOString(),
  };
}

function legacyRegistryState(
  previous: Record<string, unknown> | undefined,
  event: DomainEvent,
) {
  const payload = eventPayload(event);
  const occurredAt = event.occurredAt.toISOString();
  return {
    id: event.aggregateId,
    plate: typeof payload.plate === 'string' ? payload.plate : '',
    source: '',
    reason: '',
    validFrom:
      typeof payload.validFrom === 'string' ? payload.validFrom : occurredAt,
    validUntil: null,
    status: 'active',
    createdById: event.actor.id ?? '',
    createdAt: occurredAt,
    ...previous,
    ...(typeof payload.plate === 'string' ? { plate: payload.plate } : {}),
    ...(typeof payload.validUntil === 'string' || payload.validUntil === null
      ? { validUntil: payload.validUntil }
      : {}),
    ...(typeof payload.status === 'string' ? { status: payload.status } : {}),
    updatedAt: occurredAt,
  };
}

function legacyObservationState(
  previous: Record<string, unknown> | undefined,
  event: DomainEvent,
) {
  const payload = eventPayload(event);
  const occurredAt = event.occurredAt.toISOString();
  const current = {
    plate: typeof payload.plate === 'string' ? payload.plate : '',
    observedAt: occurredAt,
    latitude: null,
    longitude: null,
    description: null,
    status: 'recorded',
    observedById: event.actor.id ?? '',
    clientCommandId: null,
    evidenceIds: [],
    matchedRegistryId: null,
    matchConfirmedAt: null,
    matchConfirmedById: null,
    escalatedAt: null,
    createdAt: occurredAt,
    ...previous,
    id: event.aggregateId,
    version: event.aggregateVersion,
  } as Record<string, unknown>;
  if (event.eventType === 'SuspiciousVehicleMatched') {
    current.status = 'match_suggested';
    current.matchedRegistryId = payload.registryId ?? null;
  }
  if (event.eventType === 'SuspiciousVehicleMatchConfirmed')
    current.status = 'match_confirmed';
  if (event.eventType === 'VehicleVerificationRecorded')
    current.status = 'verified';
  if (event.eventType === 'VehicleEscalated') current.status = 'escalated';
  return { ...current, updatedAt: occurredAt };
}

async function projectVehicleEvent(
  event: DomainEvent,
  client: PrismaClient = prisma,
) {
  if (event.aggregateType === 'SuspiciousVehicleRegistry') {
    await reduceReadModel(
      client,
      registryProjectionName,
      event,
      (previous, currentEvent) =>
        eventState(currentEvent) ?? legacyRegistryState(previous, currentEvent),
    );
    return;
  }
  if (event.aggregateType !== 'VehicleObservation') return;
  await reduceReadModel(
    client,
    observationProjectionName,
    event,
    (previous, currentEvent) =>
      eventState(currentEvent) ??
      legacyObservationState(previous, currentEvent),
  );
}

const projectionRegistration = globalThis as typeof globalThis & {
  civicosVehicleProjection?: boolean;
};

export function registerVehicleProjections(): void {
  if (projectionRegistration.civicosVehicleProjection) return;
  for (const eventType of vehicleEventTypes) {
    const consumer =
      eventType === 'SuspiciousVehicleRegistered' ||
      eventType === 'SuspiciousVehicleRegistryUpdated'
        ? 'vehicle-registry-read-model'
        : 'vehicle-observation-read-model';
    registerEventConsumer(
      eventType,
      (event) => projectVehicleEvent(event).then(() => undefined),
      consumer,
    );
  }
  projectionRegistration.civicosVehicleProjection = true;
}

registerVehicleProjections();

export async function rebuildVehicleProjection(
  client: PrismaClient = prisma,
): Promise<number> {
  await client.projectionRecord.deleteMany({
    where: {
      projectionName: {
        in: [registryProjectionName, observationProjectionName],
      },
    },
  });
  return replayEvents(
    client,
    (event) => projectVehicleEvent(event, client).then(() => undefined),
    { take: 1000 },
  );
}

export async function listRegistry(actor: VehicleActor) {
  requireRole(actor, 'commander', 'superior_commander');
  const projected = await readModels(
    registryProjectionName,
    'SuspiciousVehicleRegistry',
    { organizationId: actor.organizationUnitId },
  );
  const users = actor.organizationUnitId
    ? await prisma.user.findMany({
        where: { organizationUnitId: actor.organizationUnitId },
        select: { id: true },
      })
    : null;
  const sourceEntries = await prisma.suspiciousVehicleEntry.findMany({
    where: users
      ? { createdById: { in: users.map(({ id }) => id) } }
      : undefined,
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });
  const projectedEntries = projected.map(({ state }) => state);
  const projectedIds = new Set(
    projectedEntries.map((entry) => String((entry as { id: string }).id)),
  );
  const registry = [
    ...projectedEntries,
    ...sourceEntries
      .filter((entry) => !projectedIds.has(entry.id))
      .map(registryState),
  ];
  await recordAudit({
    actor,
    resourceType: 'SuspiciousVehicleRegistry',
    resourceId: '*',
    operation: 'vehicle_registry.listed',
    metadata: { count: registry.length },
  });
  return registry;
}

export async function listObservations(actor: VehicleActor) {
  const assignedResourceIds =
    actor.roles.includes('commander') ||
    actor.roles.includes('superior_commander')
      ? undefined
      : (
          await prisma.assignment.findMany({
            where: {
              resourceType: 'VehicleObservation',
              assigneeUserId: actor.id,
              status: 'active',
              ...(actor.organizationUnitId
                ? { organizationId: actor.organizationUnitId }
                : {}),
            },
            select: { resourceId: true },
          })
        ).map(({ resourceId }) => resourceId);
  const allowedIds = assignedResourceIds
    ? new Set(assignedResourceIds)
    : undefined;
  const projected = await readModels(
    observationProjectionName,
    'VehicleObservation',
    {
      aggregateIds: assignedResourceIds,
      organizationId: actor.organizationUnitId,
      take: assignedResourceIds ? undefined : 100,
    },
  );
  const users = actor.organizationUnitId
    ? await prisma.user.findMany({
        where: { organizationUnitId: actor.organizationUnitId },
        select: { id: true },
      })
    : null;
  const sourceObservations = await prisma.vehicleObservation.findMany({
    where: assignedResourceIds
      ? { id: { in: assignedResourceIds } }
      : users
        ? { observedById: { in: users.map(({ id }) => id) } }
        : undefined,
    orderBy: { observedAt: 'desc' },
    take: 100,
  });
  const projectedObservations = projected.map(({ state }) => state);
  const projectedObservationIds = new Set(
    projectedObservations.map((observation) =>
      String((observation as { id: string }).id),
    ),
  );
  const observations = [
    ...projectedObservations,
    ...sourceObservations
      .filter((observation) => !projectedObservationIds.has(observation.id))
      .map(observationState),
  ]
    .map((state) => state as Record<string, unknown>)
    .filter(
      (observation) => !allowedIds || allowedIds.has(String(observation.id)),
    );
  await recordAudit({
    actor,
    resourceType: 'VehicleObservation',
    resourceId: '*',
    operation: 'vehicle_observation.listed',
    metadata: { count: observations.length },
  });
  return observations;
}

export async function getObservation(
  observationId: string,
  actor: VehicleActor,
) {
  const observation = await loadObservationState(observationId);
  if (!observation) throw new Error('OBSERVATION_NOT_FOUND');
  const observer = await prisma.vehicleObservation.findUnique({
    where: { id: observationId },
    select: { observedById: true },
  });
  const observerUser = observer
    ? await prisma.user.findUnique({
        where: { id: observer.observedById },
        select: { organizationUnitId: true },
      })
    : null;
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
  const verificationAssignment = await prisma.assignment.findFirst({
    where: {
      resourceType: 'VehicleObservation',
      resourceId: observationId,
      assigneeUserId: actor.id,
      status: 'active',
      task: 'vehicle_verification',
      ...(actor.organizationUnitId
        ? { organizationId: actor.organizationUnitId }
        : {}),
    },
  });
  const allowed =
    (!actor.organizationUnitId ||
      !observerUser?.organizationUnitId ||
      actor.organizationUnitId === observerUser.organizationUnitId) &&
    (Boolean(assignment) ||
      actor.roles.includes('commander') ||
      actor.roles.includes('superior_commander'));
  if (!allowed) throw new Error('FORBIDDEN');
  await recordAudit({
    actor,
    resourceType: 'VehicleObservation',
    resourceId: observationId,
    operation: 'vehicle_observation.read',
  });
  const [verifications] = await Promise.all([
    prisma.vehicleVerification.findMany({
      where: { observationId },
      orderBy: { verifiedAt: 'asc' },
    }),
  ]);
  const isFieldOfficer = actor.roles.includes('field_officer');
  const hasAssignment = Boolean(assignment);
  const hasVerificationAssignment = Boolean(verificationAssignment);
  return {
    observation: observation.state,
    verifications,
    permissions: {
      canConfirm: isFieldOfficer && hasAssignment,
      canVerify: isFieldOfficer && hasVerificationAssignment,
      canEscalate: isFieldOfficer && hasVerificationAssignment,
    },
  };
}

async function loadObservationState(observationId: string) {
  return prisma.projectionRecord
    .findUnique({
      where: {
        projectionName_aggregateType_aggregateId: {
          projectionName: observationProjectionName,
          aggregateType: 'VehicleObservation',
          aggregateId: observationId,
        },
      },
    })
    .then(async (projection) => {
      if (projection) return projection;
      const source = await prisma.vehicleObservation.findUnique({
        where: { id: observationId },
      });
      return source ? { state: observationState(source) } : null;
    });
}

/** Mobile-safe vehicle projection: exactly the six DS-09 allowlist fields. */
export function mobileObservationState(state: Record<string, unknown>) {
  return {
    id: String(state.id ?? ''),
    plate: String(state.plate ?? ''),
    status: String(state.status ?? ''),
    observedAt: String(state.observedAt ?? ''),
    latitude: String(state.latitude ?? ''),
    longitude: String(state.longitude ?? ''),
  };
}

/** Mobile vehicle detail: same load path as web, `mobile_read` boundary, allowlist only. */
export async function getMobileObservation(
  observationId: string,
  actor: VehicleActor,
) {
  const observation = await loadObservationState(observationId);
  if (!observation) throw new Error('OBSERVATION_NOT_FOUND');
  await requireMobileReadAccess(actor, {
    resourceType: 'VehicleObservation',
    resourceId: observationId,
  });
  await recordAudit({
    actor,
    resourceType: 'VehicleObservation',
    resourceId: observationId,
    operation: 'vehicle_observation.read',
  });
  return mobileObservationState(observation.state as Record<string, unknown>);
}
