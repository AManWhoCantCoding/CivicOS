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

import type {
  EstablishmentInput,
  InspectionActor,
  InspectionStatus,
} from './contracts';
import {
  assertChecklistComplete,
  assertInspectionTransition,
  isInspectionResult,
  type ChecklistItem,
  type ChecklistResponse,
} from './domain';

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

async function ensureTemplate(
  type: string,
  client: Prisma.TransactionClient | typeof prisma,
) {
  return client.checklistTemplate.upsert({
    where: {
      establishmentType_version: { establishmentType: type, version: 1 },
    },
    update: {},
    create: {
      establishmentType: type,
      version: 1,
      title: `Checklist ${type}`,
      items: [
        { key: 'license', label: 'Giấy phép và hồ sơ hợp lệ', required: true },
        {
          key: 'security',
          label: 'Điều kiện an ninh, trật tự',
          required: true,
        },
        {
          key: 'safety',
          label: 'Điều kiện an toàn tại cơ sở',
          required: false,
        },
      ] as Prisma.InputJsonValue,
    },
  });
}

async function assertInspectionAccess(
  inspectionId: string,
  actor: InspectionActor,
  action: 'read' | 'mutate',
) {
  if (actor.roles.includes('commander')) return;
  await assertAccess(
    actor,
    { resourceType: 'Inspection', resourceId: inspectionId },
    action,
  );
}

export async function registerEstablishment(
  input: EstablishmentInput,
  actor: InspectionActor,
) {
  requireRole(actor, 'commander', 'office_officer');
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
      },
    });
    if (duplicate) throw new Error('DUPLICATE_ESTABLISHMENT');

    const establishment = await tx.establishment.create({
      data: {
        name: input.name.trim(),
        ownerName: input.ownerName.trim(),
        address: input.address.trim(),
        type: input.type.trim(),
        licenseRef: input.licenseRef?.trim() || undefined,
        latitude: input.latitude,
        longitude: input.longitude,
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
      payload: { establishmentId: establishment.id, type: establishment.type },
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
  },
  actor: InspectionActor,
) {
  requireRole(actor, 'commander', 'office_officer');
  const scheduledAt = new Date(input.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) throw new Error('INVALID_SCHEDULE');

  return prisma.$transaction(async (tx) => {
    const establishment = await tx.establishment.findUnique({
      where: { id: input.establishmentId },
    });
    if (!establishment || !establishment.active)
      throw new Error('ESTABLISHMENT_NOT_FOUND');
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

    const inspection = await tx.inspection.create({
      data: {
        establishmentId: input.establishmentId,
        assignedUserId: input.assignedUserId,
        templateId: template.id,
        templateVersion: template.version,
        scheduledAt,
        version: 1,
      },
    });

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
      },
      metadata: {},
    });
    await createSla(
      {
        resourceType: 'Inspection',
        resourceId: inspection.id,
        rule: {
          kind: 'inspection_completion_7d',
          durationMs: 7 * 24 * 60 * 60 * 1000,
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
  },
  actor: InspectionActor,
) {
  requireRole(actor, 'commander', 'office_officer');
  assertCoordinates(input);
  return prisma.$transaction(async (tx) => {
    const current = await tx.establishment.findUnique({
      where: { id: input.establishmentId },
    });
    if (!current) throw new Error('ESTABLISHMENT_NOT_FOUND');
    const updated = await tx.establishment.update({
      where: { id: current.id },
      data: {
        ...(input.name?.trim() ? { name: input.name.trim() } : {}),
        ...(input.ownerName?.trim()
          ? { ownerName: input.ownerName.trim() }
          : {}),
        ...(input.address?.trim() ? { address: input.address.trim() } : {}),
        ...(input.type?.trim() ? { type: input.type.trim() } : {}),
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
      payload: { establishmentId: current.id },
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

export async function startInspection(
  inspectionId: string,
  actor: InspectionActor,
) {
  return transitionInspection(inspectionId, 'in_progress', actor, {});
}

export async function saveChecklistResponses(
  input: { inspectionId: string; responses: ChecklistResponse[] },
  actor: InspectionActor,
) {
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
      payload: { responseCount: input.responses.length },
      metadata: {},
    });
    return updated;
  });
}

export async function completeInspection(
  input: { inspectionId: string; result: string },
  actor: InspectionActor,
) {
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
      assertChecklistComplete(
        (template.items as unknown as ChecklistItem[]) ?? [],
        (inspection.checklistResponses as unknown as ChecklistResponse[]) ?? [],
      );
    },
  );
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
      payload,
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
          status: 'active',
        },
        data: {
          status: 'completed',
          completedAt: updated.completedAt ?? new Date(),
        },
      });
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
  },
  actor: InspectionActor,
) {
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
      payload: { recommendationId: recommendation.id },
      metadata: {},
    });
    await createSla(
      {
        resourceType: 'EnforcementRecommendation',
        resourceId: recommendation.id,
        rule: {
          kind: 'inspection_recommendation_7d',
          durationMs: 7 * 24 * 60 * 60 * 1000,
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
  recommendationId: string,
  actor: InspectionActor,
) {
  requireRole(actor, 'commander');
  return updateRecommendationStatus(recommendationId, actor, 'approved');
}

export async function rejectRecommendation(
  recommendationId: string,
  actor: InspectionActor,
  reason: string,
) {
  requireRole(actor, 'commander');
  if (!reason.trim()) throw new Error('REJECTION_REASON_REQUIRED');
  return updateRecommendationStatus(
    recommendationId,
    actor,
    'rejected',
    reason.trim(),
  );
}

async function updateRecommendationStatus(
  recommendationId: string,
  actor: InspectionActor,
  status: 'approved' | 'rejected',
  reason?: string,
) {
  return prisma.$transaction(async (tx) => {
    const recommendation = await tx.enforcementRecommendation.findUnique({
      where: { id: recommendationId },
    });
    if (!recommendation) throw new Error('RECOMMENDATION_NOT_FOUND');
    if (recommendation.status !== 'pending_approval') {
      throw new Error('RECOMMENDATION_ALREADY_DECIDED');
    }
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
      payload: { recommendationId, reason },
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
        status: 'active',
      },
      data: { status: 'completed', completedAt: new Date() },
    });
    return updatedRecommendation;
  });
}
