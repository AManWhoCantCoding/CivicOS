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
import { recordAudit } from '@/modules/identity';
import type { IdentityUser } from '@/modules/identity';

const incidentProjectionName = 'incident-read-model';
const incidentEventTypes = [
  'IncidentRegistered',
  'IncidentClassified',
  'IncidentAssigned',
  'IncidentVerifying',
  'IncidentTransferRequested',
  'IncidentTransferred',
  'IncidentResolutionRequested',
  'IncidentResolved',
  'IncidentClosureRequested',
  'IncidentClosed',
  'IncidentApprovalRejected',
];

export function incidentState(incident: {
  id: string;
  status: string;
  category: string | null;
  severity: string | null;
  description: string;
  latitude: Prisma.Decimal | null;
  longitude: Prisma.Decimal | null;
  assignedAt: Date | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: incident.id,
    status: incident.status,
    category: incident.category,
    severity: incident.severity,
    description: incident.description,
    latitude: incident.latitude?.toString() ?? null,
    longitude: incident.longitude?.toString() ?? null,
    assignedAt: incident.assignedAt?.toISOString() ?? null,
    resolvedAt: incident.resolvedAt?.toISOString() ?? null,
    closedAt: incident.closedAt?.toISOString() ?? null,
    version: incident.version,
    createdAt: incident.createdAt.toISOString(),
    updatedAt: incident.updatedAt.toISOString(),
  };
}

function legacyIncidentState(
  previous: Record<string, unknown> | undefined,
  event: DomainEvent,
) {
  const payload = eventPayload(event);
  const current = previous ?? {
    id: event.aggregateId,
    status: 'received',
    category: null,
    severity: null,
    description: '',
    latitude: null,
    longitude: null,
    assignedAt: null,
    resolvedAt: null,
    closedAt: null,
    version: 0,
    createdAt: event.occurredAt.toISOString(),
    updatedAt: event.occurredAt.toISOString(),
  };
  const statusByEvent: Record<string, string> = {
    IncidentClassified: 'classified',
    IncidentVerifying: 'verifying',
    IncidentTransferred: 'transferred',
    IncidentResolved: 'resolved',
    IncidentClosed: 'closed',
  };
  const status = statusByEvent[event.eventType];
  return {
    ...current,
    id: event.aggregateId,
    version: event.aggregateVersion,
    updatedAt: event.occurredAt.toISOString(),
    ...(status ? { status } : {}),
    ...(typeof payload.category === 'string'
      ? { category: payload.category }
      : {}),
    ...(typeof payload.severity === 'string'
      ? { severity: payload.severity }
      : {}),
    ...(event.eventType === 'IncidentAssigned'
      ? { assignedAt: event.occurredAt.toISOString() }
      : {}),
    ...(event.eventType === 'IncidentResolved'
      ? { resolvedAt: event.occurredAt.toISOString() }
      : {}),
    ...(event.eventType === 'IncidentClosed'
      ? { closedAt: event.occurredAt.toISOString() }
      : {}),
  };
}

async function projectIncidentEvent(
  event: DomainEvent,
  client: PrismaClient = prisma,
) {
  if (event.aggregateType !== 'Incident') return;
  await reduceReadModel(
    client,
    incidentProjectionName,
    event,
    (previous, currentEvent) =>
      eventState(currentEvent) ?? legacyIncidentState(previous, currentEvent),
  );
}

const projectionRegistration = globalThis as typeof globalThis & {
  civicosIncidentProjection?: boolean;
};

if (!projectionRegistration.civicosIncidentProjection) {
  for (const eventType of incidentEventTypes) {
    registerEventConsumer(
      eventType,
      (event) => projectIncidentEvent(event).then(() => undefined),
      'incident-read-model',
    );
  }
  projectionRegistration.civicosIncidentProjection = true;
}

export async function rebuildIncidentProjection(
  client: PrismaClient = prisma,
): Promise<number> {
  await client.projectionRecord.deleteMany({
    where: {
      projectionName: incidentProjectionName,
      aggregateType: 'Incident',
    },
  });
  return replayEvents(
    client,
    (event) => projectIncidentEvent(event, client).then(() => undefined),
    { aggregateType: 'Incident', take: 1000 },
  );
}

export async function listIncidents(
  actor: IdentityUser,
  input?: { status?: string; category?: string },
) {
  const assignedResourceIds = actor.roles.includes('commander')
    ? undefined
    : (
        await prisma.assignment.findMany({
          where: {
            resourceType: 'Incident',
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
  const projected = await readModels(incidentProjectionName, 'Incident', {
    aggregateIds: assignedResourceIds,
    organizationId: actor.organizationUnitId,
    take: assignedResourceIds ? undefined : 100,
  });
  const incidents = (
    projected.length
      ? projected.map(({ state }) => state as Record<string, unknown>)
      : actor.organizationUnitId && !assignedResourceIds
        ? []
        : (
            await prisma.incident.findMany({
              where: assignedResourceIds
                ? { id: { in: assignedResourceIds } }
                : undefined,
              orderBy: { updatedAt: 'desc' },
              take: 100,
            })
          ).map(incidentState)
  ).filter((incident) => {
    if (allowedIds && !allowedIds.has(String(incident.id))) return false;
    if (input?.status && incident.status !== input.status) return false;
    if (input?.category && incident.category !== input.category) return false;
    return true;
  });
  await recordAudit({
    actor,
    resourceType: 'Incident',
    resourceId: '*',
    operation: 'incident.listed',
    metadata: { count: incidents.length },
  });
  return incidents;
}

export function getIncidentReadModel(incidentId: string) {
  return prisma.projectionRecord
    .findUnique({
      where: {
        projectionName_aggregateType_aggregateId: {
          projectionName: incidentProjectionName,
          aggregateType: 'Incident',
          aggregateId: incidentId,
        },
      },
    })
    .then(async (projection) => {
      if (projection) return projection;
      const incident = await prisma.incident.findUnique({
        where: { id: incidentId },
      });
      return incident ? { state: incidentState(incident) } : null;
    });
}
