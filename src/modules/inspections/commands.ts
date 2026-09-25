import { randomUUID } from 'node:crypto';

import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { appendEvent, getAggregateVersion } from '@/modules/eventing';
import {
  assertAccess,
  carryActiveAssignments,
  grantAssignments,
  recordAudit,
  requireRole,
} from '@/modules/identity';
import { createGeoPoint, createSla } from '@/modules/platform';

import type {
  EstablishmentInput,
  InspectionActor,
  InspectionStatus,
} from './contracts';
import {
  assertChecklistComplete,
  assertChecklistEvidence,
  assertInspectionTransition,
  isInspectionResult,
  type ChecklistItem,
  type ChecklistResponse,
} from './domain';
import { establishmentState, inspectionState } from './projection';
import { INSPECTION_SLA } from './config';

function actorSnapshot(actor: InspectionActor) {
  return {
    id: actor.id,
    name: actor.name,
    role: actor.roles[0],
    organizationId: actor.organizationUnitId,
  };
}

function assertCoordinates(input: { latitude?: number; longitude?: number }) {
  const hasLatitude = input.latitude !== undefined;
  const hasLongitude = input.longitude !== undefined;
  if (hasLatitude !== hasLongitude) throw new Error('GEOPOINT_INCOMPLETE');
  if (hasLatitude && hasLongitude)
    createGeoPoint(input.latitude!, input.longitude!);
}

function assertCadenceMonths(value: number | undefined): number {
  const cadenceMonths = value ?? 6;
  if (
    !Number.isInteger(cadenceMonths) ||
    cadenceMonths < 1 ||
    cadenceMonths > 6
  )
    throw new Error('INVALID_INSPECTION_CADENCE');
  return cadenceMonths;
}

async function assertCadenceCapability(
  actor: InspectionActor,
  cadenceMonths: number,
  establishmentId: string,
  client: Prisma.TransactionClient | typeof prisma,
) {
  if (cadenceMonths >= 6) return;
  assertOrganizationUnit(actor);
  try {
    await assertAccess(
      actor,
      { resourceType: 'Establishment', resourceId: establishmentId },
      'mutate',
      client,
    );
  } catch {
    throw new Error('INSPECTION_CADENCE_PERMISSION_REQUIRED');
  }
}

function assertOrganizationUnit(actor: InspectionActor): string {
  if (!actor.organizationUnitId?.trim()) throw new Error('FORBIDDEN');
  return actor.organizationUnitId;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  const day = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0),
  ).getUTCDate();
  next.setUTCDate(Math.min(day, lastDay));
  return next;
}

async function ensureTemplate(
  type: string,
  client: Prisma.TransactionClient | typeof prisma,
) {
  const normalizedType = type.trim().toLowerCase();
  const items =
    normalizedType.includes('nhà nghỉ') || normalizedType.includes('khách sạn')
      ? [
          { key: 'license', label: 'Giấy phép lưu trú hợp lệ', required: true },
          {
            key: 'security',
            label: 'Sổ theo dõi khách lưu trú và điều kiện an ninh',
            required: true,
          },
          {
            key: 'safety',
            label: 'Điều kiện an toàn tại cơ sở',
            required: false,
            evidenceRequired: true,
          },
        ]
      : normalizedType.includes('karaoke') || normalizedType.includes('bar')
        ? [
            {
              key: 'license',
              label: 'Giấy phép kinh doanh hợp lệ',
              required: true,
            },
            {
              key: 'security',
              label: 'Điều kiện an ninh và kiểm soát ra vào',
              required: true,
            },
            {
              key: 'safety',
              label: 'Điều kiện phòng cháy và an toàn',
              required: false,
              evidenceRequired: true,
            },
          ]
        : normalizedType.includes('cầm đồ') || normalizedType.includes('cam do')
          ? [
              {
                key: 'license',
                label: 'Giấy phép kinh doanh và hồ sơ tài sản',
                required: true,
              },
              {
                key: 'security',
                label: 'Sổ giao nhận và nhận diện tài sản',
                required: true,
              },
              {
                key: 'safety',
                label: 'Điều kiện an toàn kho',
                required: false,
                evidenceRequired: true,
              },
            ]
          : normalizedType.includes('game')
            ? [
                {
                  key: 'license',
                  label: 'Giấy phép kinh doanh trò chơi',
                  required: true,
                },
                {
                  key: 'security',
                  label: 'Kiểm soát người chơi và an ninh',
                  required: true,
                },
                {
                  key: 'safety',
                  label: 'Điều kiện an toàn thiết bị',
                  required: false,
                  evidenceRequired: true,
                },
              ]
            : [
                {
                  key: 'license',
                  label: 'Giấy phép và hồ sơ hợp lệ',
                  required: true,
                },
                {
                  key: 'security',
                  label: 'Điều kiện an ninh, trật tự',
                  required: true,
                },
                {
                  key: 'safety',
                  label: 'Điều kiện an toàn tại cơ sở',
                  required: false,
                  evidenceRequired: true,
                },
              ];
  return client.checklistTemplate.upsert({
    where: {
      establishmentType_version: { establishmentType: type, version: 1 },
    },
    update: {},
    create: {
      establishmentType: type,
      version: 1,
      title: `Checklist ${type}`,
      items: items as Prisma.InputJsonValue,
    },
  });
}

async function assertInspectionAccess(
  inspectionId: string,
  actor: InspectionActor,
  action: 'read' | 'mutate' | 'approve',
) {
  const organizationId = assertOrganizationUnit(actor);
  const inspection = await prisma.inspection.findUnique({
    where: { id: inspectionId },
    select: { establishmentId: true },
  });
  const establishment = inspection
    ? await prisma.establishment.findUnique({
        where: { id: inspection.establishmentId },
        select: { organizationId: true },
      })
    : null;
  if (
    !establishment?.organizationId ||
    establishment.organizationId !== organizationId
  )
    throw new Error('FORBIDDEN');
  await assertAccess(
    actor,
    { resourceType: 'Inspection', resourceId: inspectionId },
    action,
  );
}

async function assertEstablishmentScope(
  establishmentId: string,
  actor: InspectionActor,
  client: Prisma.TransactionClient | typeof prisma,
) {
  const organizationId = assertOrganizationUnit(actor);
  const establishment = await client.establishment.findUnique({
    where: { id: establishmentId },
    select: { organizationId: true },
  });
  if (
    !establishment?.organizationId ||
    establishment.organizationId !== organizationId
  ) {
    throw new Error('FORBIDDEN');
  }
}

function assertFieldworkRole(actor: InspectionActor) {
  requireRole(actor, 'field_officer');
}

export async function registerEstablishment(
  input: EstablishmentInput,
  actor: InspectionActor,
) {
  requireRole(actor, 'commander', 'office_officer');
  assertOrganizationUnit(actor);
  if (
    !input.name.trim() ||
    !input.ownerName.trim() ||
    !input.address.trim() ||
    !input.type.trim()
  ) {
    throw new Error('ESTABLISHMENT_FIELDS_REQUIRED');
  }
  assertCoordinates(input);

  return prisma.$transaction(async (tx) => {
    const duplicate = await tx.establishment.findFirst({
      where: {
        name: input.name.trim(),
        address: input.address.trim(),
        active: true,
        ...(actor.organizationUnitId
          ? { organizationId: actor.organizationUnitId }
          : {}),
      },
    });
    if (duplicate) throw new Error('DUPLICATE_ESTABLISHMENT');

    const establishment = await tx.establishment.create({
      data: {
        name: input.name.trim(),
        ownerName: input.ownerName.trim(),
        address: input.address.trim(),
        type: input.type.trim(),
        ...(input.licenseRef?.trim()
          ? { licenseRef: input.licenseRef.trim() }
          : {}),
        ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
        ...(input.longitude !== undefined
          ? { longitude: input.longitude }
          : {}),
        risk: input.risk ?? 'medium',
        status: input.status ?? 'active',
        organizationId: actor.organizationUnitId,
      },
    });
    await appendEvent(tx, {
      eventId: randomUUID(),
      eventType: 'EstablishmentRegistered',
      eventVersion: 1,
      aggregateType: 'Establishment',
      aggregateId: establishment.id,
      aggregateVersion: 1,
      occurredAt: establishment.createdAt,
      actor: actorSnapshot(actor),
      payload: {
        establishmentId: establishment.id,
        type: establishment.type,
        state: establishmentState(establishment),
      },
      metadata: {},
    });
    await recordAudit(
      {
        actor,
        resourceType: 'Establishment',
        resourceId: establishment.id,
        operation: 'establishment.created',
      },
      tx,
    );
    return establishment;
  });
}

export async function scheduleInspection(
  input: {
    establishmentId: string;
    assignedUserId?: string;
    scheduledAt: string;
    cadenceMonths?: number;
  },
  actor: InspectionActor,
) {
  requireRole(actor, 'commander', 'office_officer');
  if (input.assignedUserId && !actor.roles.includes('commander')) {
    throw new Error('ASSIGNMENT_MANAGEMENT_FORBIDDEN');
  }
  const scheduledAt = new Date(input.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) throw new Error('INVALID_SCHEDULE');
  const cadenceMonths = assertCadenceMonths(input.cadenceMonths);
  return prisma.$transaction(async (tx) => {
    const establishment = await tx.establishment.findUnique({
      where: { id: input.establishmentId },
    });
    if (!establishment || !establishment.active)
      throw new Error('ESTABLISHMENT_NOT_FOUND');
    await assertEstablishmentScope(establishment.id, actor, tx);
    await assertCadenceCapability(actor, cadenceMonths, establishment.id, tx);
    const template = await ensureTemplate(establishment.type, tx);
    const existing = await tx.inspection.findUnique({
      where: {
        establishmentId_scheduledAt: {
          establishmentId: input.establishmentId,
          scheduledAt,
        },
      },
    });
    if (existing) throw new Error('DUPLICATE_SCHEDULE');

    let inspection;
    try {
      inspection = await tx.inspection.create({
        data: {
          establishmentId: input.establishmentId,
          assignedUserId: input.assignedUserId,
          templateId: template.id,
          templateVersion: template.version,
          scheduledAt,
          cadenceMonths,
          version: 1,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new Error('DUPLICATE_SCHEDULE');
      throw error;
    }

    if (input.assignedUserId) {
      await grantAssignments(
        tx,
        {
          resourceType: 'Inspection',
          resourceId: inspection.id,
          task: 'inspection_fieldwork',
          assigneeUserIds: [input.assignedUserId],
          organizationId: actor.organizationUnitId,
        },
        actor,
      );
    }

    await appendEvent(tx, {
      eventId: randomUUID(),
      eventType: 'InspectionScheduled',
      eventVersion: 1,
      aggregateType: 'Inspection',
      aggregateId: inspection.id,
      aggregateVersion: inspection.version,
      occurredAt: new Date(),
      actor: actorSnapshot(actor),
      payload: {
        establishmentId: establishment.id,
        scheduledAt: scheduledAt.toISOString(),
        templateVersion: template.version,
        state: inspectionState(inspection),
      },
      metadata: {},
    });
    await createSla(
      {
        resourceType: 'Inspection',
        resourceId: inspection.id,
        rule: {
          ...INSPECTION_SLA.completion,
        },
        startedAt: scheduledAt,
        assigneeUserId: input.assignedUserId,
      },
      tx,
    );
    await recordAudit(
      {
        actor,
        resourceType: 'Inspection',
        resourceId: inspection.id,
        operation: 'inspection.scheduled',
        metadata: { establishmentId: establishment.id },
      },
      tx,
    );
    return inspection;
  });
}

export async function updateEstablishment(
  input: {
    establishmentId: string;
    name?: string;
    ownerName?: string;
    address?: string;
    type?: string;
    licenseRef?: string;
    latitude?: number;
    longitude?: number;
    risk?: 'low' | 'medium' | 'high';
    status?: 'active' | 'archived';
  },
  actor: InspectionActor,
) {
  requireRole(actor, 'commander', 'office_officer');
  assertOrganizationUnit(actor);
  assertCoordinates(input);
  return prisma.$transaction(async (tx) => {
    const current = await tx.establishment.findUnique({
      where: { id: input.establishmentId },
    });
    if (!current) throw new Error('ESTABLISHMENT_NOT_FOUND');
    await assertEstablishmentScope(current.id, actor, tx);
    const updated = await tx.establishment.update({
      where: { id: current.id },
      data: {
        ...(input.name?.trim() ? { name: input.name.trim() } : {}),
        ...(input.ownerName?.trim()
          ? { ownerName: input.ownerName.trim() }
          : {}),
        ...(input.address?.trim() ? { address: input.address.trim() } : {}),
        ...(input.type?.trim() ? { type: input.type.trim() } : {}),
        ...(input.risk ? { risk: input.risk } : {}),
        ...(input.status
          ? { status: input.status, active: input.status === 'active' }
          : {}),
        ...(input.licenseRef !== undefined
          ? { licenseRef: input.licenseRef.trim() }
          : {}),
        ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
        ...(input.longitude !== undefined
          ? { longitude: input.longitude }
          : {}),
      },
    });
    const aggregateVersion =
      (await getAggregateVersion(tx, 'Establishment', current.id)) + 1;
    await appendEvent(tx, {
      eventId: randomUUID(),
      eventType: 'EstablishmentUpdated',
      eventVersion: 1,
      aggregateType: 'Establishment',
      aggregateId: current.id,
      aggregateVersion,
      occurredAt: updated.updatedAt,
      actor: actorSnapshot(actor),
      payload: {
        establishmentId: current.id,
        state: establishmentState(updated),
      },
      metadata: {},
    });
    await recordAudit(
      {
        actor,
        resourceType: 'Establishment',
        resourceId: current.id,
        operation: 'establishment.updated',
      },
      tx,
    );
    return updated;
  });
}

export async function archiveEstablishment(
  establishmentId: string,
  actor: InspectionActor,
) {
  requireRole(actor, 'commander', 'office_officer');
  assertOrganizationUnit(actor);
  return prisma.$transaction(async (tx) => {
    const current = await tx.establishment.findUnique({
      where: { id: establishmentId },
    });
    if (!current) throw new Error('ESTABLISHMENT_NOT_FOUND');
    await assertEstablishmentScope(establishmentId, actor, tx);
    const archived = await tx.establishment.update({
      where: { id: establishmentId },
      data: { active: false, status: 'archived' },
    });
    const aggregateVersion =
      (await getAggregateVersion(tx, 'Establishment', establishmentId)) + 1;
    await appendEvent(tx, {
      eventId: randomUUID(),
      eventType: 'EstablishmentUpdated',
      eventVersion: 1,
      aggregateType: 'Establishment',
      aggregateId: establishmentId,
      aggregateVersion,
      occurredAt: archived.updatedAt,
      actor: actorSnapshot(actor),
      payload: {
        establishmentId,
        archived: true,
        state: establishmentState(archived),
      },
      metadata: {},
    });
    await recordAudit(
      {
        actor,
        resourceType: 'Establishment',
        resourceId: establishmentId,
        operation: 'establishment.archived',
      },
      tx,
    );
    return archived;
  });
}

export async function startInspection(
  inspectionId: string,
  actor: InspectionActor,
  baseVersion?: number,
) {
  assertFieldworkRole(actor);
  return transitionInspection(
    inspectionId,
    'in_progress',
    actor,
    {},
    undefined,
    baseVersion,
  );
}

export async function saveChecklistResponses(
  input: {
    inspectionId: string;
    responses: ChecklistResponse[];
    baseVersion?: number;
  },
  actor: InspectionActor,
) {
  assertFieldworkRole(actor);
  const inspection = await prisma.inspection.findUnique({
    where: { id: input.inspectionId },
  });
  if (!inspection) throw new Error('INSPECTION_NOT_FOUND');
  await assertInspectionAccess(input.inspectionId, actor, 'mutate');
  if (inspection.status !== 'in_progress')
    throw new Error('INSPECTION_NOT_IN_PROGRESS');

  return prisma.$transaction(async (tx) => {
    const current = await tx.inspection.findUnique({
      where: { id: input.inspectionId },
    });
    if (!current) throw new Error('INSPECTION_NOT_FOUND');
    if (
      input.baseVersion !== undefined &&
      input.baseVersion !== current.version
    )
      throw new Error('STALE_OFFLINE_COMMAND');
    const template = await tx.checklistTemplate.findUnique({
      where: { id: current.templateId },
    });
    if (!template) throw new Error('CHECKLIST_TEMPLATE_NOT_FOUND');
    assertChecklistComplete(
      (template.items as unknown as ChecklistItem[]) ?? [],
      input.responses,
    );
    const updated = await tx.inspection.update({
      where: { id: current.id, version: current.version },
      data: {
        version: current.version + 1,
        checklistResponses: input.responses as unknown as Prisma.InputJsonValue,
      },
    });
    await appendEvent(tx, {
      eventId: randomUUID(),
      eventType: 'InspectionChecklistSaved',
      eventVersion: 1,
      aggregateType: 'Inspection',
      aggregateId: current.id,
      aggregateVersion: updated.version,
      occurredAt: new Date(),
      actor: actorSnapshot(actor),
      payload: {
        responseCount: input.responses.length,
        state: inspectionState(updated),
      },
      metadata: {},
    });
    return updated;
  });
}

export async function completeInspection(
  input: { inspectionId: string; result: string; baseVersion?: number },
  actor: InspectionActor,
) {
  assertFieldworkRole(actor);
  if (!isInspectionResult(input.result))
    throw new Error('INVALID_INSPECTION_RESULT');
  return transitionInspection(
    input.inspectionId,
    'completed',
    actor,
    {
      result: input.result,
    },
    async (tx, inspection) => {
      const template = await tx.checklistTemplate.findUnique({
        where: { id: inspection.templateId },
      });
      if (!template) throw new Error('CHECKLIST_TEMPLATE_NOT_FOUND');
      const items = (template.items as unknown as ChecklistItem[]) ?? [];
      assertChecklistComplete(
        items,
        (inspection.checklistResponses as unknown as ChecklistResponse[]) ?? [],
      );
      const findings = await tx.inspectionFinding.findMany({
        where: { inspectionId: inspection.id },
        select: { checklistKey: true, evidenceIds: true },
      });
      assertChecklistEvidence(
        items,
        (inspection.checklistResponses as unknown as ChecklistResponse[]) ?? [],
        findings.map((finding) => ({
          checklistKey: finding.checklistKey,
          evidenceIds: Array.isArray(finding.evidenceIds)
            ? (finding.evidenceIds as unknown as string[])
            : [],
        })),
      );
      if (input.result === 'needs_action') {
        const needsActionFindings = await tx.inspectionFinding.findMany({
          where: { inspectionId: inspection.id, result: 'needs_action' },
          select: { id: true },
        });
        const recommendations = await tx.enforcementRecommendation.findMany({
          where: { inspectionId: inspection.id },
          select: { findingIds: true, status: true },
        });
        for (const finding of needsActionFindings) {
          const related = recommendations.filter(
            ({ findingIds }) =>
              Array.isArray(findingIds) &&
              (findingIds as unknown[]).includes(finding.id),
          );
          if (related.some(({ status }) => status === 'approved')) continue;
          if (related.some(({ status }) => status === 'pending_approval'))
            throw new Error('RECOMMENDATION_PENDING_APPROVAL');
          if (related.some(({ status }) => status === 'rejected'))
            throw new Error('RECOMMENDATION_REJECTED');
          throw new Error('RECOMMENDATION_REQUIRED');
        }
      }
    },
    input.baseVersion,
  );
}

async function scheduleNextInspection(
  tx: Prisma.TransactionClient,
  inspection: Awaited<ReturnType<typeof prisma.inspection.findUniqueOrThrow>>,
  actor: InspectionActor,
) {
  const scheduledAt = addMonths(
    inspection.scheduledAt,
    inspection.cadenceMonths,
  );
  const existing = await tx.inspection.findUnique({
    where: {
      establishmentId_scheduledAt: {
        establishmentId: inspection.establishmentId,
        scheduledAt,
      },
    },
  });
  if (existing) return existing;

  const sourceAssignments = await tx.assignment.findMany({
    where: {
      resourceType: 'Inspection',
      resourceId: inspection.id,
      status: 'active',
    },
    select: { assigneeUserId: true },
  });
  const assignedUserId =
    sourceAssignments[0]?.assigneeUserId ??
    (actor.roles.includes('commander') ? inspection.assignedUserId : undefined);
  const next = await tx.inspection.create({
    data: {
      establishmentId: inspection.establishmentId,
      assignedUserId,
      templateId: inspection.templateId,
      templateVersion: inspection.templateVersion,
      scheduledAt,
      cadenceMonths: inspection.cadenceMonths,
      version: 1,
    },
  });
  if (sourceAssignments.length) {
    await carryActiveAssignments(
      tx,
      {
        sourceResourceType: 'Inspection',
        sourceResourceId: inspection.id,
        targetResourceType: 'Inspection',
        targetResourceId: next.id,
      },
      actor,
    );
  } else if (assignedUserId) {
    await grantAssignments(
      tx,
      {
        resourceType: 'Inspection',
        resourceId: next.id,
        task: 'inspection_fieldwork',
        assigneeUserIds: [assignedUserId],
        organizationId: actor.organizationUnitId,
      },
      actor,
    );
  }
  await appendEvent(tx, {
    eventId: randomUUID(),
    eventType: 'InspectionScheduled',
    eventVersion: 1,
    aggregateType: 'Inspection',
    aggregateId: next.id,
    aggregateVersion: next.version,
    occurredAt: new Date(),
    actor: actorSnapshot(actor),
    payload: {
      establishmentId: inspection.establishmentId,
      scheduledAt: scheduledAt.toISOString(),
      templateVersion: inspection.templateVersion,
      cadenceMonths: inspection.cadenceMonths,
      previousInspectionId: inspection.id,
      state: inspectionState(next),
    },
    metadata: {},
  });
  await createSla(
    {
      resourceType: 'Inspection',
      resourceId: next.id,
      rule: {
        ...INSPECTION_SLA.completion,
      },
      startedAt: scheduledAt,
      assigneeUserId: assignedUserId ?? undefined,
    },
    tx,
  );
  return next;
}

async function transitionInspection(
  inspectionId: string,
  next: InspectionStatus,
  actor: InspectionActor,
  payload: Record<string, unknown>,
  validate?: (
    tx: Prisma.TransactionClient,
    inspection: Awaited<ReturnType<typeof prisma.inspection.findUniqueOrThrow>>,
  ) => Promise<void>,
  baseVersion?: number,
) {
  const inspection = await prisma.inspection.findUnique({
    where: { id: inspectionId },
  });
  if (!inspection) throw new Error('INSPECTION_NOT_FOUND');
  await assertInspectionAccess(inspectionId, actor, 'mutate');

  return prisma.$transaction(async (tx) => {
    const current = await tx.inspection.findUnique({
      where: { id: inspectionId },
    });
    if (!current) throw new Error('INSPECTION_NOT_FOUND');
    if (baseVersion !== undefined && baseVersion !== current.version)
      throw new Error('STALE_OFFLINE_COMMAND');
    assertInspectionTransition(current.status as InspectionStatus, next);
    if (validate) await validate(tx, current);
    const updated = await tx.inspection.update({
      where: { id: inspectionId, version: current.version },
      data: {
        version: current.version + 1,
        status: next,
        ...(next === 'in_progress' ? { startedAt: new Date() } : {}),
        ...(next === 'completed'
          ? { completedAt: new Date(), result: String(payload.result) }
          : {}),
      },
    });
    await appendEvent(tx, {
      eventId: randomUUID(),
      eventType:
        next === 'in_progress' ? 'InspectionStarted' : 'InspectionCompleted',
      eventVersion: 1,
      aggregateType: 'Inspection',
      aggregateId: inspectionId,
      aggregateVersion: updated.version,
      occurredAt: new Date(),
      actor: actorSnapshot(actor),
      payload: { ...payload, state: inspectionState(updated) },
      metadata: {},
    });
    await recordAudit(
      {
        actor,
        resourceType: 'Inspection',
        resourceId: inspectionId,
        operation: `inspection.${next}`,
      },
      tx,
    );
    if (next === 'completed') {
      await tx.slaInstance.updateMany({
        where: {
          resourceType: 'Inspection',
          resourceId: inspectionId,
          status: { in: ['active', 'overdue'] },
        },
        data: {
          status: 'completed',
          completedAt: updated.completedAt ?? new Date(),
        },
      });
      await scheduleNextInspection(tx, updated, actor);
    }
    return updated;
  });
}

export async function recordFinding(
  input: {
    inspectionId: string;
    checklistKey: string;
    description: string;
    result: string;
    evidenceIds?: string[];
    severity?: string;
    category?: string;
    baseVersion?: number;
  },
  actor: InspectionActor,
) {
  assertFieldworkRole(actor);
  if (!input.checklistKey || !input.description.trim()) {
    throw new Error('FINDING_FIELDS_REQUIRED');
  }
  const inspection = await prisma.inspection.findUnique({
    where: { id: input.inspectionId },
  });
  if (!inspection) throw new Error('INSPECTION_NOT_FOUND');
  await assertInspectionAccess(input.inspectionId, actor, 'mutate');
  if (inspection.status !== 'in_progress')
    throw new Error('INSPECTION_NOT_IN_PROGRESS');
  if (!isInspectionResult(input.result))
    throw new Error('INVALID_FINDING_RESULT');

  return prisma.$transaction(async (tx) => {
    const current = await tx.inspection.findUnique({
      where: { id: input.inspectionId },
    });
    if (!current) throw new Error('INSPECTION_NOT_FOUND');
    if (
      input.baseVersion !== undefined &&
      input.baseVersion !== current.version
    )
      throw new Error('STALE_OFFLINE_COMMAND');
    const template = await tx.checklistTemplate.findUnique({
      where: { id: current.templateId },
    });
    const checklistItems =
      (template?.items as unknown as ChecklistItem[]) ?? [];
    if (!checklistItems.some((item) => item.key === input.checklistKey))
      throw new Error('CHECKLIST_KEY_INVALID');
    const evidenceIds = input.evidenceIds ?? [];
    if (evidenceIds.length) {
      const evidence = await tx.evidence.findMany({
        where: {
          id: { in: evidenceIds },
          resourceType: 'Inspection',
          resourceId: input.inspectionId,
        },
        select: { id: true },
      });
      if (evidence.length !== evidenceIds.length)
        throw new Error('EVIDENCE_NOT_FOUND');
    }
    const finding = await tx.inspectionFinding.create({
      data: {
        inspectionId: input.inspectionId,
        checklistKey: input.checklistKey,
        description: input.description.trim(),
        result: input.result,
        ...(input.severity?.trim() ? { severity: input.severity.trim() } : {}),
        ...(input.category?.trim() ? { category: input.category.trim() } : {}),
        evidenceIds: evidenceIds as Prisma.InputJsonValue,
      },
    });
    const updated = await tx.inspection.update({
      where: { id: current.id, version: current.version },
      data: { version: current.version + 1 },
    });
    await appendEvent(tx, {
      eventId: randomUUID(),
      eventType: 'InspectionFindingRecorded',
      eventVersion: 1,
      aggregateType: 'Inspection',
      aggregateId: input.inspectionId,
      aggregateVersion: updated.version,
      occurredAt: new Date(),
      actor: actorSnapshot(actor),
      payload: {
        findingId: finding.id,
        checklistKey: input.checklistKey,
        evidenceIds,
        state: inspectionState(updated),
      },
      metadata: {},
    });
    await recordAudit(
      {
        actor,
        resourceType: 'Inspection',
        resourceId: input.inspectionId,
        operation: 'inspection.finding_recorded',
        metadata: { findingId: finding.id },
      },
      tx,
    );
    return finding;
  });
}

export async function submitRecommendation(
  input: {
    inspectionId: string;
    findingIds: string[];
    action: string;
    reason: string;
  },
  actor: InspectionActor,
) {
  assertFieldworkRole(actor);
  if (
    !input.findingIds.length ||
    !input.action.trim() ||
    !input.reason.trim()
  ) {
    throw new Error('RECOMMENDATION_FIELDS_REQUIRED');
  }
  const inspection = await prisma.inspection.findUnique({
    where: { id: input.inspectionId },
  });
  if (!inspection) throw new Error('INSPECTION_NOT_FOUND');
  await assertInspectionAccess(input.inspectionId, actor, 'mutate');
  if (inspection.status === 'completed')
    throw new Error('INSPECTION_COMPLETED_IMMUTABLE');

  return prisma.$transaction(async (tx) => {
    const findings = await tx.inspectionFinding.findMany({
      where: { id: { in: input.findingIds }, inspectionId: input.inspectionId },
      select: { id: true },
    });
    if (findings.length !== input.findingIds.length)
      throw new Error('FINDING_NOT_FOUND');
    const current = await tx.inspection.findUnique({
      where: { id: input.inspectionId },
    });
    if (!current) throw new Error('INSPECTION_NOT_FOUND');
    const recommendation = await tx.enforcementRecommendation.create({
      data: {
        inspectionId: input.inspectionId,
        findingIds: input.findingIds as Prisma.InputJsonValue,
        action: input.action.trim(),
        reason: input.reason.trim(),
        submittedById: actor.id,
      },
    });
    const updated = await tx.inspection.update({
      where: { id: current.id, version: current.version },
      data: { version: current.version + 1 },
    });
    await appendEvent(tx, {
      eventId: randomUUID(),
      eventType: 'EnforcementRecommendationSubmitted',
      eventVersion: 1,
      aggregateType: 'Inspection',
      aggregateId: input.inspectionId,
      aggregateVersion: updated.version,
      occurredAt: new Date(),
      actor: actorSnapshot(actor),
      payload: {
        recommendationId: recommendation.id,
        state: inspectionState(updated),
      },
      metadata: {},
    });
    await createSla(
      {
        resourceType: 'EnforcementRecommendation',
        resourceId: recommendation.id,
        rule: {
          ...INSPECTION_SLA.recommendation,
        },
        assigneeUserId: actor.id,
      },
      tx,
    );
    await recordAudit(
      {
        actor,
        resourceType: 'Inspection',
        resourceId: input.inspectionId,
        operation: 'inspection.recommendation_submitted',
        metadata: { recommendationId: recommendation.id },
      },
      tx,
    );
    return recommendation;
  });
}

export async function approveRecommendation(
  inspectionId: string,
  recommendationId: string,
  actor: InspectionActor,
) {
  requireRole(actor, 'commander');
  return updateRecommendationStatus(
    inspectionId,
    recommendationId,
    actor,
    'approved',
  );
}

export async function rejectRecommendation(
  inspectionId: string,
  recommendationId: string,
  actor: InspectionActor,
  reason: string,
) {
  requireRole(actor, 'commander');
  if (!reason.trim()) throw new Error('REJECTION_REASON_REQUIRED');
  return updateRecommendationStatus(
    inspectionId,
    recommendationId,
    actor,
    'rejected',
    reason.trim(),
  );
}

export async function transferRecommendation(
  inspectionId: string,
  recommendationId: string,
  organizationId: string,
  actor: InspectionActor,
) {
  requireRole(actor, 'commander');
  assertOrganizationUnit(actor);
  if (!organizationId.trim()) throw new Error('TRANSFER_TARGET_REQUIRED');
  await assertInspectionAccess(inspectionId, actor, 'approve');
  return prisma.$transaction(async (tx) => {
    const recommendation = await tx.enforcementRecommendation.findUnique({
      where: { id: recommendationId },
    });
    if (!recommendation || recommendation.inspectionId !== inspectionId)
      throw new Error('RECOMMENDATION_NOT_FOUND');
    if (recommendation.status !== 'pending_approval')
      throw new Error('RECOMMENDATION_ALREADY_DECIDED');
    if (recommendation.submittedById === actor.id)
      throw new Error('SELF_APPROVAL_FORBIDDEN');
    const target = await tx.organizationUnit.findUnique({
      where: { id: organizationId },
      select: { id: true, level: true, active: true },
    });
    if (
      !target?.active ||
      !['district', 'huyen', 'huyện'].includes(target.level)
    )
      throw new Error('TRANSFER_TARGET_INVALID');
    if (target.id === actor.organizationUnitId)
      throw new Error('TRANSFER_TARGET_SAME_UNIT');
    const approval = await tx.approval.create({
      data: {
        resourceType: 'EnforcementRecommendation',
        resourceId: recommendationId,
        action: 'transfer',
        status: 'approved',
        organizationId,
        requestedById: recommendation.submittedById,
        decidedById: actor.id,
        decidedAt: new Date(),
        payload: { organizationId },
      },
    });
    const updated = await tx.enforcementRecommendation.update({
      where: { id: recommendationId },
      data: { status: 'transferred' },
    });
    const inspection = await tx.inspection.findUniqueOrThrow({
      where: { id: inspectionId },
    });
    const updatedInspection = await tx.inspection.update({
      where: { id: inspectionId, version: inspection.version },
      data: { version: inspection.version + 1 },
    });
    await appendEvent(tx, {
      eventId: randomUUID(),
      eventType: 'EnforcementTransferred',
      eventVersion: 1,
      aggregateType: 'Inspection',
      aggregateId: inspectionId,
      aggregateVersion: updatedInspection.version,
      occurredAt: new Date(),
      actor: actorSnapshot(actor),
      payload: {
        recommendationId,
        organizationId,
        approvalId: approval.id,
        state: inspectionState(updatedInspection),
      },
      metadata: {},
    });
    await recordAudit(
      {
        actor,
        resourceType: 'Inspection',
        resourceId: inspectionId,
        operation: 'inspection.recommendation_transferred',
        metadata: { recommendationId, organizationId, approvalId: approval.id },
      },
      tx,
    );
    return { ...updated, inspectionVersion: updatedInspection.version };
  });
}

async function updateRecommendationStatus(
  inspectionId: string,
  recommendationId: string,
  actor: InspectionActor,
  status: 'approved' | 'rejected',
  reason?: string,
) {
  await assertInspectionAccess(inspectionId, actor, 'approve');
  return prisma.$transaction(async (tx) => {
    const recommendation = await tx.enforcementRecommendation.findUnique({
      where: { id: recommendationId },
    });
    if (!recommendation) throw new Error('RECOMMENDATION_NOT_FOUND');
    if (recommendation.inspectionId !== inspectionId)
      throw new Error('RECOMMENDATION_RESOURCE_MISMATCH');
    if (recommendation.status !== 'pending_approval') {
      throw new Error('RECOMMENDATION_ALREADY_DECIDED');
    }
    if (recommendation.submittedById === actor.id)
      throw new Error('SELF_APPROVAL_FORBIDDEN');
    const inspection = await tx.inspection.findUnique({
      where: { id: recommendation.inspectionId },
    });
    if (!inspection) throw new Error('INSPECTION_NOT_FOUND');
    const updatedRecommendation = await tx.enforcementRecommendation.update({
      where: { id: recommendationId, status: 'pending_approval' },
      data: {
        status,
        ...(status === 'approved'
          ? { approvedById: actor.id, approvedAt: new Date() }
          : {}),
      },
    });
    await tx.approval.create({
      data: {
        resourceType: 'EnforcementRecommendation',
        resourceId: recommendationId,
        action: status === 'approved' ? 'approve' : 'reject',
        status,
        organizationId: actor.organizationUnitId,
        requestedById: recommendation.submittedById,
        decidedById: actor.id,
        reason,
        payload: { inspectionId },
        decidedAt: new Date(),
      },
    });
    const updatedInspection = await tx.inspection.update({
      where: { id: inspection.id, version: inspection.version },
      data: { version: inspection.version + 1 },
    });
    await appendEvent(tx, {
      eventId: randomUUID(),
      eventType:
        status === 'approved' ? 'EnforcementApproved' : 'EnforcementRejected',
      eventVersion: 1,
      aggregateType: 'Inspection',
      aggregateId: inspection.id,
      aggregateVersion: updatedInspection.version,
      occurredAt: new Date(),
      actor: actorSnapshot(actor),
      payload: {
        recommendationId,
        reason,
        state: inspectionState(updatedInspection),
      },
      metadata: {},
    });
    await recordAudit(
      {
        actor,
        resourceType: 'Inspection',
        resourceId: inspection.id,
        operation: `inspection.recommendation_${status}`,
        reason,
        metadata: { recommendationId },
      },
      tx,
    );
    await tx.slaInstance.updateMany({
      where: {
        resourceType: 'EnforcementRecommendation',
        resourceId: recommendationId,
        status: { in: ['active', 'overdue'] },
      },
      data: { status: 'completed', completedAt: new Date() },
    });
    return {
      ...updatedRecommendation,
      inspectionVersion: updatedInspection.version,
    };
  });
}
