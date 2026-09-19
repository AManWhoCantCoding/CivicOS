import { prisma } from '@/lib/prisma';
import type { Prisma, PrismaClient } from '@prisma/client';

import {
  readModels,
  registerEventConsumer,
  replayEvents,
  upsertReadModel,
  type DomainEvent,
} from '@/modules/eventing';
import { canAccess, recordAudit, requireRole } from '@/modules/identity';

import type { VehicleActor } from './contracts';

const registryProjectionName = 'vehicle-registry-read-model';
const observationProjectionName = 'vehicle-observation-read-model';
const vehicleEventTypes = [
  'SuspiciousVehicleRegistered',
  'SuspiciousVehicleRegistryUpdated',
  'VehicleObservationRecorded',
  'SuspiciousVehicleMatched',
  'SuspiciousVehicleMatchConfirmed',
  'VehicleVerificationRecorded',
  'VehicleEscalated',
];

function registryState(entry: {
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

function observationState(observation: {
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

async function projectVehicleEvent(
  event: DomainEvent,
  client: PrismaClient = prisma,
) {
  if (event.aggregateType === 'SuspiciousVehicleRegistry') {
    const entry = await client.suspiciousVehicleEntry.findUnique({
      where: { id: event.aggregateId },
    });
    if (entry) {
      await upsertReadModel(
        client,
        registryProjectionName,
        event,
        registryState(entry),
      );
    }
    return;
  }
  if (event.aggregateType !== 'VehicleObservation') return;
  const observation = await client.vehicleObservation.findUnique({
    where: { id: event.aggregateId },
  });
  if (!observation) return;
  await upsertReadModel(
    client,
    observationProjectionName,
    event,
    observationState(observation),
  );
}

const projectionRegistration = globalThis as typeof globalThis & {
  civicosVehicleProjection?: boolean;
};

if (!projectionRegistration.civicosVehicleProjection) {
  for (const eventType of vehicleEventTypes) {
    registerEventConsumer(
      eventType,
      (event) => projectVehicleEvent(event).then(() => undefined),
      'vehicle-read-model',
    );
  }
  projectionRegistration.civicosVehicleProjection = true;
}

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
  requireRole(actor, 'commander', 'office_officer');
  const registry = (
    await readModels(registryProjectionName, 'SuspiciousVehicleRegistry')
  ).map(({ state }) => state);
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
  const assignedResourceIds = actor.roles.includes('commander')
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
  const observations = (
    await readModels(observationProjectionName, 'VehicleObservation')
  )
    .map(({ state }) => state as Record<string, unknown>)
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
  const observation = await prisma.projectionRecord.findUnique({
    where: {
      projectionName_aggregateType_aggregateId: {
        projectionName: observationProjectionName,
        aggregateType: 'VehicleObservation',
        aggregateId: observationId,
      },
    },
  });
  if (!observation) throw new Error('OBSERVATION_NOT_FOUND');
  if (!actor.roles.includes('commander')) {
    const allowed = await canAccess(
      actor,
      { resourceType: 'VehicleObservation', resourceId: observationId },
      'read',
    );
    if (!allowed) throw new Error('FORBIDDEN');
  }
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
  return { observation: observation.state, verifications };
}
