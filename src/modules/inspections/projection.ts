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
import { canAccess, recordAudit, requireRole } from '@/modules/identity';

import type { InspectionActor } from './contracts';

const establishmentProjectionName = 'establishment-read-model';
const inspectionProjectionName = 'inspection-read-model';
const inspectionEventTypes = [
  'EstablishmentRegistered',
  'EstablishmentUpdated',
  'InspectionScheduled',
  'InspectionStarted',
  'InspectionChecklistSaved',
  'InspectionFindingRecorded',
  'InspectionCompleted',
  'EnforcementRecommendationSubmitted',
  'EnforcementApproved',
  'EnforcementRejected',
];

export function establishmentState(establishment: {
  id: string;
  name: string;
  ownerName: string;
  address: string;
  type: string;
  licenseRef: string | null;
  latitude: Prisma.Decimal | null;
  longitude: Prisma.Decimal | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: establishment.id,
    name: establishment.name,
    ownerName: establishment.ownerName,
    address: establishment.address,
    type: establishment.type,
    licenseRef: establishment.licenseRef,
    latitude: establishment.latitude?.toString() ?? null,
    longitude: establishment.longitude?.toString() ?? null,
    active: establishment.active,
    createdAt: establishment.createdAt.toISOString(),
    updatedAt: establishment.updatedAt.toISOString(),
  };
}

export function inspectionState(inspection: {
  id: string;
  establishmentId: string;
  assignedUserId: string | null;
  templateId: string;
  templateVersion: number;
  scheduledAt: Date;
  cadenceMonths: number;
  startedAt: Date | null;
  completedAt: Date | null;
  status: string;
  result: string | null;
  version: number;
  checklistResponses: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: inspection.id,
    establishmentId: inspection.establishmentId,
    assignedUserId: inspection.assignedUserId,
    templateId: inspection.templateId,
    templateVersion: inspection.templateVersion,
    scheduledAt: inspection.scheduledAt.toISOString(),
    cadenceMonths: inspection.cadenceMonths,
    startedAt: inspection.startedAt?.toISOString() ?? null,
    completedAt: inspection.completedAt?.toISOString() ?? null,
    status: inspection.status,
    result: inspection.result,
    version: inspection.version,
    checklistResponses: inspection.checklistResponses,
    createdAt: inspection.createdAt.toISOString(),
    updatedAt: inspection.updatedAt.toISOString(),
  };
}

function legacyEstablishmentState(
  previous: Record<string, unknown> | undefined,
  event: DomainEvent,
) {
  const payload = eventPayload(event);
  const occurredAt = event.occurredAt.toISOString();
  return {
    id: event.aggregateId,
    name: '',
    ownerName: '',
    address: '',
    type: typeof payload.type === 'string' ? payload.type : '',
    licenseRef: null,
    latitude: null,
    longitude: null,
    active: true,
    createdAt: occurredAt,
    ...previous,
    ...(typeof payload.type === 'string' ? { type: payload.type } : {}),
    updatedAt: occurredAt,
  };
}

function legacyInspectionState(
  previous: Record<string, unknown> | undefined,
  event: DomainEvent,
) {
  const payload = eventPayload(event);
  const occurredAt = event.occurredAt.toISOString();
  const current = {
    establishmentId:
      typeof payload.establishmentId === 'string'
        ? payload.establishmentId
        : '',
    assignedUserId: null,
    templateId: '',
    templateVersion:
      typeof payload.templateVersion === 'number' ? payload.templateVersion : 1,
    scheduledAt:
      typeof payload.scheduledAt === 'string'
        ? payload.scheduledAt
        : occurredAt,
    cadenceMonths:
      typeof payload.cadenceMonths === 'number' ? payload.cadenceMonths : 6,
    startedAt: null,
    completedAt: null,
    status: 'scheduled',
    result: null,
    checklistResponses: [],
    createdAt: occurredAt,
    ...previous,
    id: event.aggregateId,
    version: event.aggregateVersion,
    updatedAt: occurredAt,
  } as Record<string, unknown>;

  if (event.eventType === 'InspectionStarted') {
    current.status = 'in_progress';
    current.startedAt = occurredAt;
  }
  if (event.eventType === 'InspectionCompleted') {
    current.status = 'completed';
    current.completedAt = occurredAt;
    if (typeof payload.result === 'string') current.result = payload.result;
  }
  return current;
}

async function projectInspectionEvent(
  event: DomainEvent,
  client: PrismaClient = prisma,
) {
  if (event.aggregateType === 'Establishment') {
    await reduceReadModel(
      client,
      establishmentProjectionName,
      event,
      (previous, currentEvent) =>
        eventState(currentEvent) ??
        legacyEstablishmentState(previous, currentEvent),
    );
    return;
  }
  if (event.aggregateType !== 'Inspection') return;
  await reduceReadModel(
    client,
    inspectionProjectionName,
    event,
    (previous, currentEvent) =>
      eventState(currentEvent) ?? legacyInspectionState(previous, currentEvent),
  );
}

const projectionRegistration = globalThis as typeof globalThis & {
  civicosInspectionProjection?: boolean;
};

if (!projectionRegistration.civicosInspectionProjection) {
  for (const eventType of inspectionEventTypes) {
    registerEventConsumer(
      eventType,
      (event) => projectInspectionEvent(event).then(() => undefined),
      'inspection-read-model',
    );
  }
  projectionRegistration.civicosInspectionProjection = true;
}

export async function rebuildInspectionProjection(
  client: PrismaClient = prisma,
): Promise<number> {
  await client.projectionRecord.deleteMany({
    where: {
      projectionName: {
        in: [establishmentProjectionName, inspectionProjectionName],
      },
    },
  });
  return replayEvents(
    client,
    (event) => projectInspectionEvent(event, client).then(() => undefined),
    { take: 1000 },
  );
}

export async function listEstablishments(actor: InspectionActor) {
  requireRole(actor, 'commander', 'office_officer');
  const projected = await readModels(
    establishmentProjectionName,
    'Establishment',
    { organizationId: actor.organizationUnitId },
  );
  const establishments = (
    projected.length
      ? projected.map(({ state }) => state as Record<string, unknown>)
      : actor.organizationUnitId
        ? []
        : (
            await prisma.establishment.findMany({
              where: { active: true },
              orderBy: { name: 'asc' },
              take: 100,
            })
          ).map(establishmentState)
  )
    .filter(({ active }) => active === true)
    .sort((left, right) => String(left.name).localeCompare(String(right.name)));
  await recordAudit({
    actor,
    resourceType: 'Establishment',
    resourceId: '*',
    operation: 'establishment.listed',
    metadata: { count: establishments.length },
  });
  return establishments;
}

export async function getEstablishment(
  establishmentId: string,
  actor: InspectionActor,
) {
  requireRole(actor, 'commander', 'office_officer');
  const establishment = await prisma.projectionRecord
    .findUnique({
      where: {
        projectionName_aggregateType_aggregateId: {
          projectionName: establishmentProjectionName,
          aggregateType: 'Establishment',
          aggregateId: establishmentId,
        },
      },
    })
    .then(async (projection) => {
      if (projection) return projection;
      const source = await prisma.establishment.findUnique({
        where: { id: establishmentId },
      });
      return source ? { state: establishmentState(source) } : null;
    });
  if (!establishment) throw new Error('ESTABLISHMENT_NOT_FOUND');
  await recordAudit({
    actor,
    resourceType: 'Establishment',
    resourceId: establishmentId,
    operation: 'establishment.read',
  });
  return establishment.state;
}

export async function listInspections(actor: InspectionActor) {
  const assignedResourceIds = actor.roles.includes('commander')
    ? undefined
    : (
        await prisma.assignment.findMany({
          where: {
            resourceType: 'Inspection',
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
  const projected = await readModels(inspectionProjectionName, 'Inspection', {
    aggregateIds: assignedResourceIds,
    organizationId: actor.organizationUnitId,
    take: assignedResourceIds ? undefined : 100,
  });
  const inspections = (
    projected.length
      ? projected.map(({ state }) => state)
      : actor.organizationUnitId && !assignedResourceIds
        ? []
        : (
            await prisma.inspection.findMany({
              where: assignedResourceIds
                ? { id: { in: assignedResourceIds } }
                : undefined,
              orderBy: { scheduledAt: 'asc' },
              take: 100,
            })
          ).map(inspectionState)
  )
    .map(
      (state) =>
        state as Record<string, unknown> & {
          id: string;
          scheduledAt: string;
          status: string;
        },
    )
    .filter(
      (inspection) => !allowedIds || allowedIds.has(String(inspection.id)),
    )
    .sort(
      (left, right) =>
        new Date(String(left.scheduledAt)).getTime() -
        new Date(String(right.scheduledAt)).getTime(),
    );
  const now = new Date();
  const scheduleView = inspections.map((inspection) => ({
    ...inspection,
    scheduleState:
      inspection.status === 'scheduled'
        ? new Date(String(inspection.scheduledAt)) <= now
          ? 'overdue'
          : 'upcoming'
        : inspection.status === 'in_progress'
          ? 'in_progress'
          : 'completed',
  }));
  await recordAudit({
    actor,
    resourceType: 'Inspection',
    resourceId: '*',
    operation: 'inspection.listed',
    metadata: { count: scheduleView.length },
  });
  return scheduleView;
}

export async function getInspection(
  inspectionId: string,
  actor: InspectionActor,
) {
  const inspection = await prisma.projectionRecord
    .findUnique({
      where: {
        projectionName_aggregateType_aggregateId: {
          projectionName: inspectionProjectionName,
          aggregateType: 'Inspection',
          aggregateId: inspectionId,
        },
      },
    })
    .then(async (projection) => {
      if (projection) return projection;
      const source = await prisma.inspection.findUnique({
        where: { id: inspectionId },
      });
      return source ? { state: inspectionState(source) } : null;
    });
  if (!inspection) throw new Error('INSPECTION_NOT_FOUND');
  if (!actor.roles.includes('commander')) {
    const allowed = await canAccess(
      actor,
      { resourceType: 'Inspection', resourceId: inspectionId },
      'read',
    );
    if (!allowed) throw new Error('FORBIDDEN');
  }
  await recordAudit({
    actor,
    resourceType: 'Inspection',
    resourceId: inspectionId,
    operation: 'inspection.read',
  });
  const templateId =
    inspection.state && typeof inspection.state === 'object'
      ? String((inspection.state as Record<string, unknown>).templateId ?? '')
      : '';
  const [findings, recommendations, template] = await Promise.all([
    prisma.inspectionFinding.findMany({
      where: { inspectionId },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.enforcementRecommendation.findMany({
      where: { inspectionId },
      orderBy: { createdAt: 'asc' },
    }),
    templateId
      ? prisma.checklistTemplate.findUnique({ where: { id: templateId } })
      : null,
  ]);
  return {
    inspection: inspection.state,
    template: template?.items ?? [],
    findings,
    recommendations,
  };
}
