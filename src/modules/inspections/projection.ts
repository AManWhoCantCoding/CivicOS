import { prisma } from '@/lib/prisma';
import type { Prisma, PrismaClient } from '@prisma/client';

import {
  eventPayload,
  eventState,
  readModels,
  registerEventConsumer,
  reduceReadModel,
  replayAggregate,
  replayEvents,
  type DomainEvent,
} from '@/modules/eventing';
import {
  assertAccess,
  canAccess,
  recordAudit,
  requireRole,
} from '@/modules/identity';

import type { InspectionActor } from './contracts';

const establishmentProjectionName = 'establishment-read-model';
const inspectionProjectionName = 'inspection-read-model';
/** All establishment and inspection event types projected to read models. */
export const inspectionEventTypes = [
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
  'EnforcementTransferred',
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
  risk: string;
  status: string;
  organizationId: string | null;
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
    risk: establishment.risk,
    status: establishment.status,
    organizationId: establishment.organizationId,
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

export function registerInspectionProjections(): void {
  if (projectionRegistration.civicosInspectionProjection) return;
  for (const eventType of inspectionEventTypes) {
    const consumer =
      eventType === 'EstablishmentRegistered' ||
      eventType === 'EstablishmentUpdated'
        ? 'establishment-read-model'
        : 'inspection-read-model';
    registerEventConsumer(
      eventType,
      (event) => projectInspectionEvent(event).then(() => undefined),
      consumer,
    );
  }
  projectionRegistration.civicosInspectionProjection = true;
}

registerInspectionProjections();

export async function rebuildInspectionProjection(
  client: PrismaClient = prisma,
  inspectionIds?: string[],
): Promise<number> {
  await client.projectionRecord.deleteMany({
    where: {
      projectionName: inspectionIds
        ? inspectionProjectionName
        : { in: [establishmentProjectionName, inspectionProjectionName] },
      ...(inspectionIds ? { aggregateId: { in: inspectionIds } } : {}),
    },
  });
  if (inspectionIds) {
    let count = 0;
    for (const inspectionId of inspectionIds) {
      count += await replayAggregate(
        client,
        'Inspection',
        inspectionId,
        (event) => projectInspectionEvent(event, client).then(() => undefined),
      );
    }
    return count;
  }
  return replayEvents(
    client,
    (event) => projectInspectionEvent(event, client).then(() => undefined),
    { take: 1000 },
  );
}

export async function listEstablishments(
  actor: InspectionActor,
  filters: { type?: string; risk?: string; status?: string } = {},
) {
  requireRole(actor, 'commander', 'office_officer');
  if (!actor.organizationUnitId?.trim()) throw new Error('FORBIDDEN');
  const projected = await readModels(
    establishmentProjectionName,
    'Establishment',
    { organizationId: actor.organizationUnitId },
  );
  const establishments = (
    projected.length
      ? projected.map(({ state }) => state as Record<string, unknown>)
      : (
          await prisma.establishment.findMany({
            where: {
              active: filters.status === 'archived' ? false : true,
              ...(actor.organizationUnitId
                ? { organizationId: actor.organizationUnitId }
                : {}),
            },
            orderBy: { name: 'asc' },
            take: 100,
          })
        ).map(establishmentState)
  )
    .filter(
      ({ active, status, type, risk }) =>
        (filters.status === 'archived' ? active === false : active === true) &&
        (!filters.status || status === filters.status) &&
        (!filters.type || type === filters.type) &&
        (!filters.risk || risk === filters.risk) &&
        (filters.status !== 'archived' || status === 'archived'),
    )
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
  if (!actor.organizationUnitId?.trim()) throw new Error('FORBIDDEN');
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
  const origin = await prisma.eventRecord.findFirst({
    where: {
      aggregateType: 'Establishment',
      aggregateId: establishmentId,
    },
    orderBy: { aggregateVersion: 'asc' },
    select: { organizationId: true },
  });
  const organizationId =
    (establishment.state as Record<string, unknown>).organizationId ??
    origin?.organizationId;
  if (!organizationId || organizationId !== actor.organizationUnitId) {
    throw new Error('FORBIDDEN');
  }
  await recordAudit({
    actor,
    resourceType: 'Establishment',
    resourceId: establishmentId,
    operation: 'establishment.read',
  });
  return establishment.state;
}

export async function listInspections(actor: InspectionActor) {
  if (!actor.organizationUnitId?.trim()) throw new Error('FORBIDDEN');
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

export async function listDueInspections(
  actor: InspectionActor,
  now: Date = new Date(),
) {
  const inspections = await listInspections(actor);
  return inspections.filter(
    (inspection) =>
      inspection.status === 'scheduled' &&
      !Number.isNaN(new Date(String(inspection.scheduledAt)).getTime()) &&
      new Date(String(inspection.scheduledAt)).getTime() <= now.getTime(),
  );
}

export async function inspectionStats(
  actor: InspectionActor,
  filters: { from?: string; to?: string; establishmentType?: string } = {},
) {
  if (!actor.organizationUnitId?.trim()) throw new Error('FORBIDDEN');
  requireRole(actor, 'commander', 'office_officer');
  const from = filters.from ? new Date(filters.from) : undefined;
  const to = filters.to ? new Date(filters.to) : undefined;
  const establishmentIds = (
    await prisma.establishment.findMany({
      where: {
        ...(actor.organizationUnitId
          ? { organizationId: actor.organizationUnitId }
          : {}),
        ...(filters.establishmentType
          ? { type: filters.establishmentType }
          : {}),
      },
      select: { id: true },
    })
  ).map(({ id }) => id);
  const inspections = await prisma.inspection.findMany({
    where: {
      establishmentId: { in: establishmentIds },
      ...(from || to
        ? {
            scheduledAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
  });
  const scoped = inspections;
  const totalEstablishments = await prisma.establishment.count({
    where: {
      ...(actor.organizationUnitId
        ? { organizationId: actor.organizationUnitId }
        : {}),
      ...(filters.establishmentType ? { type: filters.establishmentType } : {}),
      active: true,
    },
  });
  const results = { pass: 0, reminder: 0, needs_action: 0 } as Record<
    'pass' | 'reminder' | 'needs_action',
    number
  >;
  for (const inspection of scoped)
    if (inspection.result && inspection.result in results)
      results[inspection.result as keyof typeof results] += 1;
  const recommendations = {
    pending_approval: 0,
    approved: 0,
    rejected: 0,
    transferred: 0,
  };
  const recommendationRows = await prisma.enforcementRecommendation.findMany({
    where: { inspectionId: { in: scoped.map(({ id }) => id) } },
    select: { status: true },
  });
  for (const recommendation of recommendationRows)
    if (recommendation.status in recommendations)
      recommendations[recommendation.status as keyof typeof recommendations] +=
        1;
  const grouped = new Map<string, { total: number; results: typeof results }>();
  for (const inspection of scoped) {
    const type = await prisma.establishment
      .findUnique({
        where: { id: inspection.establishmentId },
        select: { type: true },
      })
      .then((establishment) => establishment?.type ?? 'unknown');
    const group = grouped.get(type) ?? {
      total: 0,
      results: { pass: 0, reminder: 0, needs_action: 0 },
    };
    group.total += 1;
    if (inspection.result && inspection.result in group.results)
      group.results[inspection.result as keyof typeof group.results] += 1;
    grouped.set(type, group);
  }
  const ratesByType = Object.fromEntries(
    [...grouped.entries()].map(([type, group]) => [
      type,
      {
        total: group.total,
        passRate: group.total ? group.results.pass / group.total : 0,
        reminderRate: group.total ? group.results.reminder / group.total : 0,
        needsActionRate: group.total
          ? group.results.needs_action / group.total
          : 0,
      },
    ]),
  );
  return {
    generatedAt: new Date().toISOString(),
    ...filters,
    totalEstablishments,
    totalInspections: scoped.length,
    results,
    recommendations,
    ratesByType,
  };
}

export async function getInspection(
  inspectionId: string,
  actor: InspectionActor,
) {
  if (!actor.organizationUnitId?.trim()) throw new Error('FORBIDDEN');
  const source = await prisma.inspection.findUnique({
    where: { id: inspectionId },
  });
  if (!source) throw new Error('INSPECTION_NOT_FOUND');
  const inspection = { state: inspectionState(source) };
  const establishment = await prisma.establishment.findUnique({
    where: { id: source.establishmentId },
    select: { organizationId: true },
  });
  if (
    !establishment?.organizationId ||
    establishment.organizationId !== actor.organizationUnitId
  )
    throw new Error('FORBIDDEN');
  await assertAccess(
    actor,
    { resourceType: 'Inspection', resourceId: inspectionId },
    'read',
  );
  const canFieldwork = await canAccess(
    actor,
    { resourceType: 'Inspection', resourceId: inspectionId },
    'mutate',
  );
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
  const [findings, recommendations, template, recommendationSlas] =
    await Promise.all([
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
      prisma.slaInstance.findMany({
        where: {
          resourceType: 'EnforcementRecommendation',
          resourceId: {
            in: (
              await prisma.enforcementRecommendation.findMany({
                where: { inspectionId },
                select: { id: true },
              })
            ).map(({ id }) => id),
          },
        },
        select: { resourceId: true, dueAt: true, status: true },
      }),
    ]);
  const slaByRecommendation = new Map(
    recommendationSlas.map((sla) => [sla.resourceId, sla]),
  );
  return {
    inspection: inspection.state,
    permissions: { canFieldwork },
    template: template?.items ?? [],
    findings,
    recommendations: recommendations.map((recommendation) => ({
      ...recommendation,
      sla: slaByRecommendation.get(recommendation.id) ?? null,
    })),
  };
}
