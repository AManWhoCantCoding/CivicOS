import { randomUUID } from 'node:crypto';

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
import { assertIncidentTransition, canApproveIncidentAction } from './domain';

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

async function advanceIncidentSla(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
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

async function updateIncidentStatus(
  incidentId: string,
  next: IncidentStatus,
  actor: IncidentActor,
  payload: Record<string, unknown> = {},
) {
  return prisma.$transaction(async (tx) => {
    const incident = await tx.incident.findUnique({
      where: { id: incidentId },
    });
    if (!incident) throw new Error('INCIDENT_NOT_FOUND');
    assertIncidentTransition(incident.status as IncidentStatus, next);
    if (next === 'transferred' || next === 'resolved' || next === 'closed') {
      if (!canApproveIncidentAction(actor.roles)) throw new Error('FORBIDDEN');
    } else {
      await assertAccess(
        actor,
        { resourceType: 'Incident', resourceId: incidentId },
        'mutate',
        tx,
      );
    }
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
      payload: { ...payload, status: next },
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
  });
}

export async function registerIntakeReport(
  input: IntakeReportInput,
  actor: IncidentActor,
) {
  requireRole(actor, 'commander', 'duty_officer');
  if (!input.content.trim()) throw new Error('CONTENT_REQUIRED');
  const reportId = randomUUID();
  const incidentId = randomUUID();
  const receivedAt = new Date(input.receivedAt);
  if (Number.isNaN(receivedAt.getTime()))
    throw new Error('INVALID_RECEIVED_AT');
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
    await tx.incident.create({
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
      payload: { intakeReportId: reportId },
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
      payload: { category, severity },
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
  return updateIncidentStatus(incidentId, 'transferred', actor, {
    organizationId,
  });
}

export async function resolveIncident(
  incidentId: string,
  actor: IncidentActor,
  resolution: string,
) {
  if (!resolution.trim()) throw new Error('RESOLUTION_REQUIRED');
  return updateIncidentStatus(incidentId, 'resolved', actor, { resolution });
}

export async function closeIncident(incidentId: string, actor: IncidentActor) {
  return updateIncidentStatus(incidentId, 'closed', actor);
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
  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
  });
  if (!incident) throw new Error('INCIDENT_NOT_FOUND');
  const events = await prisma.eventRecord.findMany({
    where: { aggregateType: 'Incident', aggregateId: incidentId },
    orderBy: { aggregateVersion: 'asc' },
  });
  return { incident, events };
}
