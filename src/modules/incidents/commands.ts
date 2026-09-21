import { randomUUID } from 'node:crypto';

import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { appendEvent } from '@/modules/eventing';
import {
  assertAccess,
  canAccess,
  blindIndex,
  encryptSensitive,
  grantAssignments,
  recordAudit,
  requireRole,
} from '@/modules/identity';
import { createGeoPoint, createSla } from '@/modules/platform';

import type {
  IncidentActor,
  IncidentStatus,
  IntakeReportInput,
} from './contracts';
import { assertIncidentTransition } from './domain';
import { getIncidentReadModel, incidentState } from './projection';

function eventActor(actor: IncidentActor) {
  return {
    id: actor.id,
    name: actor.name,
    role: actor.roles[0],
    organizationId: actor.organizationUnitId,
  };
}

const incidentSlaByStatus: Partial<Record<IncidentStatus, string>> = {
  received: 'incident_classification_24h',
  classified: 'incident_verification_24h',
  verifying: 'incident_transfer_24h',
  transferred: 'incident_resolution_7d',
};

type IncidentTransaction = Parameters<
  Parameters<typeof prisma.$transaction>[0]
>[0];
type IncidentApprovalAction = 'transfer' | 'resolve' | 'close';

const approvalNextStatus: Record<IncidentApprovalAction, IncidentStatus> = {
  transfer: 'transferred',
  resolve: 'resolved',
  close: 'closed',
};

const approvalEventType: Record<IncidentApprovalAction, string> = {
  transfer: 'IncidentTransferRequested',
  resolve: 'IncidentResolutionRequested',
  close: 'IncidentClosureRequested',
};

async function advanceIncidentSla(
  tx: IncidentTransaction,
  incidentId: string,
  next: IncidentStatus,
  assigneeUserId: string,
) {
  if (next === 'resolved' || next === 'closed') {
    await tx.slaInstance.updateMany({
      where: {
        resourceType: 'Incident',
        resourceId: incidentId,
        status: 'active',
      },
      data: { status: 'completed', completedAt: new Date() },
    });
    return;
  }
  await tx.slaInstance.updateMany({
    where: {
      resourceType: 'Incident',
      resourceId: incidentId,
      status: 'active',
    },
    data: { status: 'completed', completedAt: new Date() },
  });
  const kind = incidentSlaByStatus[next];
  if (!kind) return;
  const durationMs = kind.endsWith('7d')
    ? 7 * 24 * 60 * 60 * 1000
    : 24 * 60 * 60 * 1000;
  await createSla(
    {
      resourceType: 'Incident',
      resourceId: incidentId,
      rule: { kind, durationMs },
      assigneeUserId,
    },
    tx,
  );
}

async function commitIncidentStatus(
  tx: IncidentTransaction,
  incidentId: string,
  next: IncidentStatus,
  actor: IncidentActor,
  payload: Record<string, unknown> = {},
) {
  const incident = await tx.incident.findUnique({
    where: { id: incidentId },
  });
  if (!incident) throw new Error('INCIDENT_NOT_FOUND');
  assertIncidentTransition(incident.status as IncidentStatus, next);
  const nextVersion = incident.version + 1;
  const updated = await tx.incident.update({
    where: { id: incidentId, version: incident.version },
    data: {
      status: next,
      version: nextVersion,
      ...(next === 'resolved' ? { resolvedAt: new Date() } : {}),
      ...(next === 'closed' ? { closedAt: new Date() } : {}),
    },
  });
  await appendEvent(tx, {
    eventId: randomUUID(),
    eventType: `Incident${next[0].toUpperCase()}${next.slice(1)}`,
    eventVersion: 1,
    aggregateType: 'Incident',
    aggregateId: incidentId,
    aggregateVersion: nextVersion,
    occurredAt: new Date(),
    actor: eventActor(actor),
    payload: { ...payload, status: next, state: incidentState(updated) },
    metadata: {},
  });
  await recordAudit(
    {
      actor,
      resourceType: 'Incident',
      resourceId: incidentId,
      operation: 'incident.mutated',
      metadata: { status: next },
    },
    tx,
  );
  await advanceIncidentSla(tx, incidentId, next, actor.id);
  return updated;
}

async function updateIncidentStatus(
  incidentId: string,
  next: IncidentStatus,
  actor: IncidentActor,
  payload: Record<string, unknown> = {},
) {
  if (next !== 'verifying') throw new Error('APPROVAL_REQUIRED');
  await assertAccess(
    actor,
    { resourceType: 'Incident', resourceId: incidentId },
    'mutate',
  );
  return prisma.$transaction((tx) =>
    commitIncidentStatus(tx, incidentId, next, actor, payload),
  );
}

async function requestIncidentApproval(
  incidentId: string,
  actor: IncidentActor,
  action: IncidentApprovalAction,
  payload: Record<string, unknown>,
) {
  await assertAccess(
    actor,
    { resourceType: 'Incident', resourceId: incidentId },
    'mutate',
  );
  return prisma.$transaction(async (tx) => {
    const incident = await tx.incident.findUnique({
      where: { id: incidentId },
    });
    if (!incident) throw new Error('INCIDENT_NOT_FOUND');
    assertIncidentTransition(
      incident.status as IncidentStatus,
      approvalNextStatus[action],
    );
    const existing = await tx.approval.findFirst({
      where: {
        resourceType: 'Incident',
        resourceId: incidentId,
        action,
        status: 'pending',
      },
    });
    if (existing) return { approval: existing, incident };

    const approval = await tx.approval.create({
      data: {
        resourceType: 'Incident',
        resourceId: incidentId,
        action,
        organizationId: actor.organizationUnitId,
        requestedById: actor.id,
        payload: payload as Prisma.InputJsonValue,
      },
    });
    const updated = await tx.incident.update({
      where: { id: incidentId, version: incident.version },
      data: { version: incident.version + 1 },
    });
    await appendEvent(tx, {
      eventId: randomUUID(),
      eventType: approvalEventType[action],
      eventVersion: 1,
      aggregateType: 'Incident',
      aggregateId: incidentId,
      aggregateVersion: updated.version,
      occurredAt: approval.requestedAt,
      actor: eventActor(actor),
      payload: {
        ...payload,
        approvalId: approval.id,
        state: incidentState(updated),
      },
      metadata: {},
    });
    await recordAudit(
      {
        actor,
        resourceType: 'Incident',
        resourceId: incidentId,
        operation: `incident.${action}_approval_requested`,
        metadata: { approvalId: approval.id },
      },
      tx,
    );
    return { approval, incident: updated };
  });
}

function approvalPayload(value: Prisma.JsonValue): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function approveIncident(
  incidentId: string,
  approvalId: string,
  actor: IncidentActor,
) {
  requireRole(actor, 'commander');
  return prisma.$transaction(async (tx) => {
    const approval = await tx.approval.findUnique({
      where: { id: approvalId },
    });
    if (!approval) throw new Error('APPROVAL_NOT_FOUND');
    if (approval.status !== 'pending')
      throw new Error('APPROVAL_ALREADY_DECIDED');
    if (approval.resourceType !== 'Incident')
      throw new Error('APPROVAL_RESOURCE_INVALID');
    if (approval.resourceId !== incidentId)
      throw new Error('APPROVAL_RESOURCE_MISMATCH');
    if (
      approval.organizationId &&
      approval.organizationId !== actor.organizationUnitId
    )
      throw new Error('FORBIDDEN');
    if (!(approval.action in approvalNextStatus))
      throw new Error('APPROVAL_ACTION_INVALID');
    const action = approval.action as IncidentApprovalAction;
    const updated = await commitIncidentStatus(
      tx,
      approval.resourceId,
      approvalNextStatus[action],
      actor,
      { ...approvalPayload(approval.payload), approvalId },
    );
    const decided = await tx.approval.update({
      where: { id: approvalId, status: 'pending' },
      data: {
        status: 'approved',
        decidedById: actor.id,
        decidedAt: new Date(),
      },
    });
    return { approval: decided, incident: updated };
  });
}

export async function rejectIncidentApproval(
  incidentId: string,
  approvalId: string,
  actor: IncidentActor,
  reason: string,
) {
  requireRole(actor, 'commander');
  if (!reason.trim()) throw new Error('REJECTION_REASON_REQUIRED');
  return prisma.$transaction(async (tx) => {
    const approval = await tx.approval.findUnique({
      where: { id: approvalId },
    });
    if (!approval) throw new Error('APPROVAL_NOT_FOUND');
    if (approval.status !== 'pending')
      throw new Error('APPROVAL_ALREADY_DECIDED');
    if (approval.resourceType !== 'Incident')
      throw new Error('APPROVAL_RESOURCE_INVALID');
    if (approval.resourceId !== incidentId)
      throw new Error('APPROVAL_RESOURCE_MISMATCH');
    if (
      approval.organizationId &&
      approval.organizationId !== actor.organizationUnitId
    )
      throw new Error('FORBIDDEN');
    const incident = await tx.incident.findUnique({
      where: { id: approval.resourceId },
    });
    if (!incident) throw new Error('INCIDENT_NOT_FOUND');
    const updated = await tx.incident.update({
      where: { id: incident.id, version: incident.version },
      data: { version: incident.version + 1 },
    });
    await appendEvent(tx, {
      eventId: randomUUID(),
      eventType: 'IncidentApprovalRejected',
      eventVersion: 1,
      aggregateType: 'Incident',
      aggregateId: incident.id,
      aggregateVersion: updated.version,
      occurredAt: new Date(),
      actor: eventActor(actor),
      payload: {
        approvalId,
        reason: reason.trim(),
        state: incidentState(updated),
      },
      metadata: {},
    });
    const decided = await tx.approval.update({
      where: { id: approvalId, status: 'pending' },
      data: {
        status: 'rejected',
        decidedById: actor.id,
        decidedAt: new Date(),
        reason: reason.trim(),
      },
    });
    await recordAudit(
      {
        actor,
        resourceType: 'Incident',
        resourceId: incident.id,
        operation: 'incident.approval_rejected',
        reason: reason.trim(),
        metadata: { approvalId },
      },
      tx,
    );
    return { approval: decided, incident: updated };
  });
}

export async function registerIntakeReport(
  input: IntakeReportInput,
  actor: IncidentActor,
) {
  requireRole(actor, 'commander', 'duty_officer');
  if (!input.content.trim()) throw new Error('CONTENT_REQUIRED');
  if (
    input.channel !== 'in_person' &&
    input.channel !== 'telephone' &&
    input.channel !== 'manual_other'
  ) {
    throw new Error('INVALID_CHANNEL');
  }
  const reportId = randomUUID();
  const incidentId = randomUUID();
  const receivedAt = new Date(input.receivedAt);
  if (Number.isNaN(receivedAt.getTime()))
    throw new Error('INVALID_RECEIVED_AT');
  if ((input.latitude === undefined) !== (input.longitude === undefined)) {
    throw new Error('GEOPOINT_INCOMPLETE');
  }
  if (input.latitude !== undefined && input.longitude !== undefined) {
    createGeoPoint(input.latitude, input.longitude);
  }

  return prisma.$transaction(async (tx) => {
    if (input.idempotencyKey) {
      const existing = await tx.intakeReport.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing?.incidentId) {
        return { reportId: existing.id, incidentId: existing.incidentId };
      }
    }
    await tx.intakeReport.create({
      data: {
        id: reportId,
        channel: input.channel,
        receivedAt,
        content: input.content.trim(),
        sourceName: input.sourceName
          ? encryptSensitive(input.sourceName)
          : undefined,
        sourceContact: input.sourceContact
          ? encryptSensitive(input.sourceContact)
          : undefined,
        latitude: input.latitude,
        longitude: input.longitude,
        sensitiveRef: input.sensitiveRef
          ? encryptSensitive(input.sensitiveRef)
          : undefined,
        sensitiveRefIndex: input.sensitiveRef
          ? blindIndex(input.sensitiveRef)
          : undefined,
        createdById: actor.id,
        idempotencyKey: input.idempotencyKey,
        incidentId,
      },
    });
    const incident = await tx.incident.create({
      data: {
        id: incidentId,
        intakeReportId: reportId,
        description: input.content.trim(),
        latitude: input.latitude,
        longitude: input.longitude,
        version: 1,
      },
    });
    const eventActorSnapshot = eventActor(actor);
    await appendEvent(tx, {
      eventId: randomUUID(),
      eventType: 'IntakeReportReceived',
      eventVersion: 1,
      aggregateType: 'IntakeReport',
      aggregateId: reportId,
      aggregateVersion: 1,
      occurredAt: receivedAt,
      actor: eventActorSnapshot,
      payload: { channel: input.channel, incidentId },
      metadata: {},
    });
    await appendEvent(tx, {
      eventId: randomUUID(),
      eventType: 'IncidentRegistered',
      eventVersion: 1,
      aggregateType: 'Incident',
      aggregateId: incidentId,
      aggregateVersion: 1,
      occurredAt: new Date(),
      actor: eventActorSnapshot,
      payload: { intakeReportId: reportId, state: incidentState(incident) },
      metadata: {},
    });
    await recordAudit(
      {
        actor,
        resourceType: 'IntakeReport',
        resourceId: reportId,
        operation: 'intake.created',
        metadata: { incidentId, channel: input.channel },
      },
      tx,
    );
    await createSla(
      {
        resourceType: 'Incident',
        resourceId: incidentId,
        rule: {
          kind: 'incident_classification_24h',
          durationMs: 24 * 60 * 60 * 1000,
        },
        assigneeUserId: actor.id,
      },
      tx,
    );
    return { reportId, incidentId };
  });
}

export async function classifyIncident(
  incidentId: string,
  actor: IncidentActor,
  category: string,
  severity: string,
) {
  if (!category.trim() || !severity.trim())
    throw new Error('CLASSIFICATION_FIELDS_REQUIRED');
  await assertAccess(
    actor,
    { resourceType: 'Incident', resourceId: incidentId },
    'mutate',
  );
  return prisma.$transaction(async (tx) => {
    const incident = await tx.incident.findUnique({
      where: { id: incidentId },
    });
    if (!incident) throw new Error('INCIDENT_NOT_FOUND');
    assertIncidentTransition(incident.status as IncidentStatus, 'classified');
    const updated = await tx.incident.update({
      where: { id: incidentId, version: incident.version },
      data: {
        category,
        severity,
        status: 'classified',
        version: incident.version + 1,
      },
    });
    await appendEvent(tx, {
      eventId: randomUUID(),
      eventType: 'IncidentClassified',
      eventVersion: 1,
      aggregateType: 'Incident',
      aggregateId: incidentId,
      aggregateVersion: updated.version,
      occurredAt: new Date(),
      actor: eventActor(actor),
      payload: { category, severity, state: incidentState(updated) },
      metadata: {},
    });
    await recordAudit(
      {
        actor,
        resourceType: 'Incident',
        resourceId: incidentId,
        operation: 'incident.classified',
        metadata: { category, severity },
      },
      tx,
    );
    await advanceIncidentSla(tx, incidentId, 'classified', actor.id);
    return updated;
  });
}

export async function assignIncident(
  incidentId: string,
  actor: IncidentActor,
  assigneeUserIds: string[],
  task = 'incident_verification',
) {
  requireRole(actor, 'commander');
  if (!assigneeUserIds.length) throw new Error('ASSIGNEE_REQUIRED');
  return prisma.$transaction(async (tx) => {
    const incident = await tx.incident.findUnique({
      where: { id: incidentId },
    });
    if (!incident) throw new Error('INCIDENT_NOT_FOUND');
    const assignments = await grantAssignments(
      tx,
      {
        resourceType: 'Incident',
        resourceId: incidentId,
        task,
        assigneeUserIds,
        organizationId: actor.organizationUnitId,
      },
      actor,
    );
    const updated = await tx.incident.update({
      where: { id: incidentId, version: incident.version },
      data: { assignedAt: new Date(), version: incident.version + 1 },
    });
    await appendEvent(tx, {
      eventId: randomUUID(),
      eventType: 'IncidentAssigned',
      eventVersion: 1,
      aggregateType: 'Incident',
      aggregateId: incidentId,
      aggregateVersion: updated.version,
      occurredAt: new Date(),
      actor: eventActor(actor),
      payload: {
        assignmentIds: assignments.map((assignment) => assignment.id),
        state: incidentState(updated),
      },
      metadata: {},
    });
    await recordAudit(
      {
        actor,
        resourceType: 'Incident',
        resourceId: incidentId,
        operation: 'incident.assigned',
        metadata: {
          assignmentIds: assignments.map((assignment) => assignment.id),
        },
      },
      tx,
    );
    return { incident: updated, assignments };
  });
}

export async function startVerification(
  incidentId: string,
  actor: IncidentActor,
  note?: string,
) {
  return updateIncidentStatus(incidentId, 'verifying', actor, { note });
}

export async function transferIncident(
  incidentId: string,
  actor: IncidentActor,
  organizationId: string,
) {
  if (!organizationId.trim()) throw new Error('ORGANIZATION_REQUIRED');
  return requestIncidentApproval(incidentId, actor, 'transfer', {
    organizationId,
  });
}

export async function resolveIncident(
  incidentId: string,
  actor: IncidentActor,
  resolution: string,
) {
  if (!resolution.trim()) throw new Error('RESOLUTION_REQUIRED');
  return requestIncidentApproval(incidentId, actor, 'resolve', { resolution });
}

export async function closeIncident(incidentId: string, actor: IncidentActor) {
  return requestIncidentApproval(incidentId, actor, 'close', {});
}

export async function getIncident(incidentId: string, actor: IncidentActor) {
  const allowed = await canAccess(
    actor,
    { resourceType: 'Incident', resourceId: incidentId },
    'read',
  );
  if (!allowed) throw new Error('FORBIDDEN');
  await recordAudit({
    actor,
    resourceType: 'Incident',
    resourceId: incidentId,
    operation: 'incident.read',
  });
  const incident = await getIncidentReadModel(incidentId);
  if (!incident) throw new Error('INCIDENT_NOT_FOUND');
  const events = await prisma.eventRecord.findMany({
    where: { aggregateType: 'Incident', aggregateId: incidentId },
    orderBy: { aggregateVersion: 'asc' },
  });
  const approvals = await prisma.approval.findMany({
    where: {
      resourceType: 'Incident',
      resourceId: incidentId,
      status: 'pending',
      OR: [
        { requestedById: actor.id },
        ...(actor.roles.includes('commander')
          ? [
              actor.organizationUnitId
                ? { organizationId: actor.organizationUnitId }
                : {},
            ]
          : []),
      ],
    },
    orderBy: { requestedAt: 'asc' },
  });
  return { incident: incident.state, events, approvals };
}
