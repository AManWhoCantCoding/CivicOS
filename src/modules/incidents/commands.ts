import { randomUUID } from 'node:crypto';

import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { appendEvent, getAggregateVersion } from '@/modules/eventing';
import {
  assertAccess,
  canAccess,
  canViewSensitive,
  blindIndex,
  decryptSensitive,
  encryptSensitive,
  grantAssignments,
  recordAudit,
  requireRole,
} from '@/modules/identity';
import {
  createGeoPoint,
  createInAppNotification,
  createSla,
} from '@/modules/platform';

import type {
  IncidentActor,
  IncidentInput,
  IncidentStatus,
  IntakeCloseInput,
  IntakeProcessInput,
  IntakeRejectInput,
  IntakeReportInput,
  IntakeReportStatus,
  IntakeReportView,
  IntakeSourceChannel,
  IntakeTransferInput,
  IntakeVerifyInput,
} from './contracts';
import {
  INTAKE_SLA,
  MASKED_IDENTITY,
  assertIncidentTransition,
  assertIntakeTransition,
  assertNoSelfApproval,
  assertTransferDecisionScope,
  normalizeSourceChannel,
} from './domain';
import { incidentState } from './projection';

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

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

function approvalPayload(value: Prisma.JsonValue): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Receiving organization named by the latest approved transfer request. */
function transferReceivingId(approval: {
  payload: Prisma.JsonValue;
}): string | undefined {
  const payload = approvalPayload(approval.payload);
  return typeof payload.organizationId === 'string'
    ? payload.organizationId
    : undefined;
}

async function assertApprovalDecisionAccess(
  tx: IncidentTransaction,
  approval: {
    action: string;
    organizationId: string | null;
    payload: Prisma.JsonValue;
    requestedById: string;
  },
  incidentId: string,
  actor: IncidentActor,
): Promise<void> {
  assertNoSelfApproval(approval.requestedById, actor.id);
  if (approval.action === 'transfer') {
    const scope = assertTransferDecisionScope({
      action: approval.action,
      approvalOrganizationId: approval.organizationId,
      receivingOrganizationId: transferReceivingId(approval),
      actor,
    });
    if (scope === 'same_unit') {
      await assertAccess(
        actor,
        { resourceType: 'Incident', resourceId: incidentId },
        'approve',
        tx,
      );
    }
    return;
  }
  if (
    approval.organizationId &&
    approval.organizationId !== actor.organizationUnitId
  )
    throw new Error('FORBIDDEN');
  await assertAccess(
    actor,
    { resourceType: 'Incident', resourceId: incidentId },
    'approve',
    tx,
  );
}

/** Receiving-unit read seam for incidents handed to the superior organization. */
async function canReadTransferredIncident(
  incidentId: string,
  actor: IncidentActor,
): Promise<boolean> {
  if (!actor.organizationUnitId) return false;
  if (
    !actor.roles.includes('superior_officer') &&
    !actor.roles.includes('superior_commander')
  ) {
    return false;
  }
  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
  });
  if (!incident || incident.status !== 'transferred') return false;
  const handoff = await prisma.approval.findFirst({
    where: {
      resourceType: 'Incident',
      resourceId: incidentId,
      action: 'transfer',
      status: 'approved',
    },
    orderBy: { decidedAt: 'desc' },
  });
  if (!handoff) return false;
  return transferReceivingId(handoff) === actor.organizationUnitId;
}

export async function approveIncident(
  incidentId: string,
  approvalId: string,
  actor: IncidentActor,
) {
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
    if (!(approval.action in approvalNextStatus))
      throw new Error('APPROVAL_ACTION_INVALID');
    await assertApprovalDecisionAccess(tx, approval, incidentId, actor);
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
    await assertApprovalDecisionAccess(tx, approval, incidentId, actor);
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
  requireRole(actor, 'duty_officer', 'commander');
  if (!input.content.trim()) throw new Error('CONTENT_REQUIRED');
  const sourceChannel = normalizeSourceChannel(
    input.sourceChannel ?? input.channel,
  );
  const reportId = randomUUID();
  const receivedAt = new Date(input.receivedAt);
  if (Number.isNaN(receivedAt.getTime()))
    throw new Error('INVALID_RECEIVED_AT');
  if ((input.latitude === undefined) !== (input.longitude === undefined)) {
    throw new Error('GEOPOINT_INCOMPLETE');
  }
  if (input.latitude !== undefined && input.longitude !== undefined) {
    createGeoPoint(input.latitude, input.longitude);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      if (input.idempotencyKey) {
        const existing = await tx.intakeReport.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
        });
        if (existing) {
          return {
            reportId: existing.id,
            incidentId: existing.incidentId,
          };
        }
      }
      const report = await tx.intakeReport.create({
        data: {
          id: reportId,
          channel: null,
          sourceChannel,
          status: 'RECEIVED',
          receivedAt,
          content: input.content.trim(),
          createdById: actor.id,
          version: 1,
          ...(input.sourceName
            ? { sourceName: encryptSensitive(input.sourceName) }
            : {}),
          ...(input.sourceContact
            ? { sourceContact: encryptSensitive(input.sourceContact) }
            : {}),
          ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
          ...(input.longitude !== undefined
            ? { longitude: input.longitude }
            : {}),
          ...(input.sensitiveRef
            ? {
                sensitiveRef: encryptSensitive(input.sensitiveRef),
                sensitiveRefIndex: blindIndex(input.sensitiveRef),
              }
            : {}),
          ...(actor.organizationUnitId
            ? { organizationId: actor.organizationUnitId }
            : {}),
          ...(input.idempotencyKey
            ? { idempotencyKey: input.idempotencyKey }
            : {}),
        },
      });
      const receivedEvent = await appendEvent(tx, {
        eventId: randomUUID(),
        eventType: 'IntakeReportReceived',
        eventVersion: 1,
        aggregateType: 'IntakeReport',
        aggregateId: reportId,
        aggregateVersion: 1,
        occurredAt: receivedAt,
        actor: eventActor(actor),
        payload: { sourceChannel, status: 'RECEIVED' },
        metadata: {},
      });
      await recordAudit(
        {
          actor,
          resourceType: 'IntakeReport',
          resourceId: reportId,
          operation: 'intake.created',
          reason: 'IntakeReport received',
          correlationId: reportId,
          metadata: { sourceChannel, status: 'RECEIVED' },
        },
        tx,
      );
      await createSla(
        {
          resourceType: 'IntakeReport',
          resourceId: reportId,
          rule: {
            kind: INTAKE_SLA.recording.kind,
            durationMs: INTAKE_SLA.recording.durationMs,
          },
          startedAt: receivedAt,
          assigneeUserId: actor.id,
        },
        tx,
      );
      await createSla(
        {
          resourceType: 'IntakeReport',
          resourceId: reportId,
          rule: {
            kind: INTAKE_SLA.verification.kind,
            durationMs: INTAKE_SLA.verification.durationMs,
          },
          startedAt: receivedAt,
          assigneeUserId: actor.id,
        },
        tx,
      );
      await createSla(
        {
          resourceType: 'IntakeReport',
          resourceId: reportId,
          rule: {
            kind: INTAKE_SLA.result.kind,
            durationMs: INTAKE_SLA.result.durationMs,
          },
          startedAt: receivedAt,
          assigneeUserId: actor.id,
        },
        tx,
      );
      await createInAppNotification(
        {
          userId: actor.id,
          type: 'intake_received',
          title: 'Đã ghi nhận tin báo',
          body: `IntakeReport ${reportId.slice(0, 8)} đã ghi nhận, chờ phân loại.`,
          resourceType: 'IntakeReport',
          resourceId: reportId,
          sourceEventId: receivedEvent.eventId,
        },
        tx,
      );
      return { reportId: report.id, incidentId: report.incidentId };
    });
  } catch (error) {
    if (input.idempotencyKey && isUniqueConstraintError(error)) {
      const existing = await prisma.intakeReport.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) {
        return { reportId: existing.id, incidentId: existing.incidentId };
      }
    }
    throw error;
  }
}

type IntakeReportRow = {
  id: string;
  channel: string | null;
  sourceChannel: string | null;
  status: string;
  receivedAt: Date;
  content: string;
  sourceName: string | null;
  sourceContact: string | null;
  latitude: unknown;
  longitude: unknown;
  sensitiveRef: string | null;
  createdById: string;
  organizationId: string | null;
  incidentId: string | null;
  classification: string | null;
  verificationNote: string | null;
  verificationResult: string | null;
  processedNote: string | null;
  confirmedAt: Date | null;
  confirmedById: string | null;
  transferToId: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

function safeSourceChannel(row: {
  channel: string | null;
  sourceChannel: string | null;
}): IntakeSourceChannel | null {
  if (row.sourceChannel) {
    try {
      return normalizeSourceChannel(row.sourceChannel);
    } catch {
      return null;
    }
  }
  if (row.channel) {
    try {
      return normalizeSourceChannel(row.channel);
    } catch {
      return null;
    }
  }
  return null;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (
    value !== null &&
    typeof value === 'object' &&
    typeof (value as { toString?: unknown }).toString === 'function'
  ) {
    const parsed = Number(String(value));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function intakeSlaSummary(
  receivedAt: Date,
  now: Date = new Date(),
  completed: {
    recording?: boolean;
    verification?: boolean;
    notification?: boolean;
  } = {},
): IntakeReportView['sla'] {
  const recordingDueAt = new Date(
    receivedAt.getTime() + INTAKE_SLA.recording.durationMs,
  );
  const verificationDueAt = new Date(
    receivedAt.getTime() + INTAKE_SLA.verification.durationMs,
  );
  const notificationDueAt = new Date(
    receivedAt.getTime() + INTAKE_SLA.result.durationMs,
  );
  const warningMs = 6 * 60 * 60 * 1000;
  const activeDeadlines = [
    { dueAt: recordingDueAt, completed: completed.recording },
    { dueAt: verificationDueAt, completed: completed.verification },
    { dueAt: notificationDueAt, completed: completed.notification },
  ].filter((sla) => !sla.completed);
  const overdue = activeDeadlines.some(
    (sla) => now.getTime() >= sla.dueAt.getTime(),
  );
  const warning =
    !overdue &&
    activeDeadlines.some(
      (sla) => now.getTime() >= sla.dueAt.getTime() - warningMs,
    );
  return {
    recordingDueAt: recordingDueAt.toISOString(),
    verificationDueAt: verificationDueAt.toISOString(),
    notificationDueAt: notificationDueAt.toISOString(),
    overdue,
    warning,
  };
}

function completedIntakeSlas(status: string) {
  return {
    recording: status !== 'RECEIVED',
    verification: !['RECEIVED', 'VERIFIED'].includes(status),
    notification: ['CLOSED', 'REJECTED'].includes(status),
  };
}

/** Secrecy boundary enforced at the domain layer, never only in UI. */
export function maskIntakeReport(
  row: IntakeReportRow,
  canReveal: boolean,
): IntakeReportView {
  const base = {
    id: row.id,
    sourceChannel: safeSourceChannel(row),
    status: row.status,
    classification: row.classification,
    verificationNote: row.verificationNote,
    verificationResult: row.verificationResult,
    processedNote: row.processedNote,
    content: row.content,
    receivedAt: row.receivedAt.toISOString(),
    latitude: toFiniteNumber(row.latitude),
    longitude: toFiniteNumber(row.longitude),
    incidentId: row.incidentId,
    transferToId: row.transferToId,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    sla: intakeSlaSummary(
      row.receivedAt,
      new Date(),
      completedIntakeSlas(row.status),
    ),
  };
  if (canReveal) {
    return {
      ...base,
      sourceName: row.sourceName ? decryptSensitive(row.sourceName) : null,
      sourceContact: row.sourceContact
        ? decryptSensitive(row.sourceContact)
        : null,
      sensitiveRef: row.sensitiveRef
        ? decryptSensitive(row.sensitiveRef)
        : null,
      revealed: true,
    };
  }
  return {
    ...base,
    sourceName: row.sourceName ? MASKED_IDENTITY : null,
    sourceContact: row.sourceContact ? MASKED_IDENTITY : null,
    sensitiveRef: row.sensitiveRef ? MASKED_IDENTITY : null,
    revealed: false,
  };
}

function assertIntakeReadScope(
  row: { organizationId: string | null },
  actor: IncidentActor,
): void {
  requireRole(
    actor,
    'duty_officer',
    'commander',
    'field_officer',
    'office_officer',
    'village_officer',
    'superior_officer',
    'superior_commander',
  );
  if (
    row.organizationId &&
    actor.organizationUnitId &&
    row.organizationId !== actor.organizationUnitId
  ) {
    throw new Error('FORBIDDEN');
  }
}

/** Reveal iff the shared policy seam grants read_sensitive, fail-closed. */
async function canRevealIntakeRow(
  row: { id: string; organizationId: string | null },
  actor: IncidentActor,
): Promise<boolean> {
  if (!actor.roles.includes('commander')) return false;
  if (!row.organizationId || actor.organizationUnitId !== row.organizationId) {
    return false;
  }
  try {
    return await canViewSensitive(actor, {
      resourceType: 'IntakeReport',
      resourceId: row.id,
      ...(row.organizationId ? { organizationId: row.organizationId } : {}),
    });
  } catch {
    return false;
  }
}

async function loadIntakeReport(
  tx: IncidentTransaction,
  reportId: string,
): Promise<IntakeReportRow> {
  const report = (await tx.intakeReport.findUnique({
    where: { id: reportId },
  })) as IntakeReportRow | null;
  if (!report) throw new Error('INTAKE_NOT_FOUND');
  return report;
}

export async function verifyIntakeReport(
  reportId: string,
  actor: IncidentActor,
  input: IntakeVerifyInput,
) {
  requireRole(actor, 'duty_officer', 'commander');
  if (
    input.classification !== 'sufficient' &&
    input.classification !== 'needs_verification'
  ) {
    throw new Error('CLASSIFICATION_REQUIRED');
  }
  return prisma.$transaction(async (tx) => {
    const report = await loadIntakeReport(tx, reportId);
    assertIntakeReadScope(report, actor);
    assertIntakeTransition(report.status as IntakeReportStatus, 'VERIFIED');
    const updated = (await tx.intakeReport.update({
      where: { id: reportId, version: report.version },
      data: {
        status: 'VERIFIED',
        classification: input.classification,
        verificationNote: input.verificationNote?.trim() || undefined,
        verificationResult: input.verificationResult?.trim() || undefined,
        version: report.version + 1,
      },
    })) as IntakeReportRow;
    await tx.slaInstance.updateMany({
      where: {
        resourceType: 'IntakeReport',
        resourceId: reportId,
        kind: INTAKE_SLA.verification.kind,
        completedAt: null,
      },
      data: { status: 'completed', completedAt: new Date() },
    });
    await appendEvent(tx, {
      eventId: randomUUID(),
      eventType: 'IntakeReportVerified',
      eventVersion: 1,
      aggregateType: 'IntakeReport',
      aggregateId: reportId,
      aggregateVersion: updated.version,
      occurredAt: new Date(),
      actor: eventActor(actor),
      payload: {
        classification: input.classification,
        status: 'VERIFIED',
      },
      metadata: {},
    });
    await recordAudit(
      {
        actor,
        resourceType: 'IntakeReport',
        resourceId: reportId,
        operation: 'intake.verified',
        metadata: { classification: input.classification },
      },
      tx,
    );
    return {
      report: maskIntakeReport(
        updated,
        await canRevealIntakeRow(updated, actor),
      ),
    };
  });
}

export async function confirmIntakeReport(
  reportId: string,
  actor: IncidentActor,
  options: { idempotencyKey?: string } = {},
) {
  requireRole(actor, 'duty_officer', 'commander');
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$queryRaw(
        Prisma.sql`SELECT "id" FROM "IntakeReport" WHERE "id" = ${reportId} FOR UPDATE`,
      );
      if (options.idempotencyKey) {
        const command = await tx.intakeCommand.findUnique({
          where: {
            reportId_command_idempotencyKey: {
              reportId,
              command: 'confirm',
              idempotencyKey: options.idempotencyKey,
            },
          },
        });
        if (command) return command.response as { report: IntakeReportView };
      }
      const report = await loadIntakeReport(tx, reportId);
      assertIntakeReadScope(report, actor);
      if (report.status !== 'VERIFIED') {
        throw new Error(`INVALID_INTAKE_CONFIRMATION:${report.status}`);
      }
      if (report.confirmedAt) {
        const response = {
          report: maskIntakeReport(
            report,
            await canRevealIntakeRow(report, actor),
          ),
        };
        if (options.idempotencyKey) {
          await tx.intakeCommand.create({
            data: {
              id: randomUUID(),
              reportId,
              command: 'confirm',
              idempotencyKey: options.idempotencyKey,
              response,
            },
          });
        }
        return response;
      }
      const updated = (await tx.intakeReport.update({
        where: { id: reportId, version: report.version },
        data: {
          confirmedAt: new Date(),
          confirmedById: actor.id,
          version: report.version + 1,
        },
      })) as IntakeReportRow;
      await recordAudit(
        {
          actor,
          resourceType: 'IntakeReport',
          resourceId: reportId,
          operation: 'intake.confirmed',
          metadata: {},
        },
        tx,
      );
      const response = {
        report: maskIntakeReport(
          updated,
          await canRevealIntakeRow(updated, actor),
        ),
      };
      if (options.idempotencyKey) {
        await tx.intakeCommand.create({
          data: {
            id: randomUUID(),
            reportId,
            command: 'confirm',
            idempotencyKey: options.idempotencyKey,
            response,
          },
        });
      }
      return response;
    });
  } catch (error) {
    if (options.idempotencyKey && isUniqueConstraintError(error)) {
      const command = await prisma.intakeCommand.findUnique({
        where: {
          reportId_command_idempotencyKey: {
            reportId,
            command: 'confirm',
            idempotencyKey: options.idempotencyKey,
          },
        },
      });
      if (command) return command.response as { report: IntakeReportView };
    }
    throw error;
  }
}

export async function processIntakeReport(
  reportId: string,
  actor: IncidentActor,
  input: IntakeProcessInput = {},
) {
  requireRole(actor, 'duty_officer', 'commander');
  return prisma.$transaction(async (tx) => {
    const report = await loadIntakeReport(tx, reportId);
    assertIntakeReadScope(report, actor);
    assertIntakeTransition(report.status as IntakeReportStatus, 'PROCESSED');
    const updated = (await tx.intakeReport.update({
      where: { id: reportId, version: report.version },
      data: {
        status: 'PROCESSED',
        processedNote:
          input.processedNote?.trim() || input.result?.trim() || undefined,
        version: report.version + 1,
      },
    })) as IntakeReportRow;
    await tx.slaInstance.updateMany({
      where: {
        resourceType: 'IntakeReport',
        resourceId: reportId,
        kind: INTAKE_SLA.result.kind,
        completedAt: null,
      },
      data: { status: 'completed', completedAt: new Date() },
    });
    await appendEvent(tx, {
      eventId: randomUUID(),
      eventType: 'IntakeReportProcessed',
      eventVersion: 1,
      aggregateType: 'IntakeReport',
      aggregateId: reportId,
      aggregateVersion: updated.version,
      occurredAt: new Date(),
      actor: eventActor(actor),
      payload: { status: 'PROCESSED' },
      metadata: {},
    });
    await recordAudit(
      {
        actor,
        resourceType: 'IntakeReport',
        resourceId: reportId,
        operation: 'intake.processed',
        metadata: {},
      },
      tx,
    );
    return {
      report: maskIntakeReport(
        updated,
        await canRevealIntakeRow(updated, actor),
      ),
    };
  });
}

export async function rejectIntakeReport(
  reportId: string,
  actor: IncidentActor,
  input: IntakeRejectInput,
) {
  requireRole(actor, 'duty_officer', 'commander');
  if (!input.reason.trim()) throw new Error('REJECTION_REASON_REQUIRED');
  return prisma.$transaction(async (tx) => {
    const report = await loadIntakeReport(tx, reportId);
    assertIntakeReadScope(report, actor);
    assertIntakeTransition(report.status as IntakeReportStatus, 'REJECTED');
    const updated = (await tx.intakeReport.update({
      where: { id: reportId, version: report.version },
      data: {
        status: 'REJECTED',
        processedNote: input.reason.trim(),
        version: report.version + 1,
      },
    })) as IntakeReportRow;
    await appendEvent(tx, {
      eventId: randomUUID(),
      eventType: 'IntakeReportRejected',
      eventVersion: 1,
      aggregateType: 'IntakeReport',
      aggregateId: reportId,
      aggregateVersion: updated.version,
      occurredAt: new Date(),
      actor: eventActor(actor),
      payload: { status: 'REJECTED' },
      metadata: {},
    });
    await recordAudit(
      {
        actor,
        resourceType: 'IntakeReport',
        resourceId: reportId,
        operation: 'intake.rejected',
        reason: input.reason.trim(),
        metadata: {},
      },
      tx,
    );
    return {
      report: maskIntakeReport(
        updated,
        await canRevealIntakeRow(updated, actor),
      ),
    };
  });
}

export async function closeIntakeReport(
  reportId: string,
  actor: IncidentActor,
  input: IntakeCloseInput = {},
) {
  requireRole(actor, 'duty_officer', 'commander');
  return prisma.$transaction(async (tx) => {
    const report = await loadIntakeReport(tx, reportId);
    assertIntakeReadScope(report, actor);
    assertIntakeTransition(report.status as IntakeReportStatus, 'CLOSED');
    const updated = (await tx.intakeReport.update({
      where: { id: reportId, version: report.version },
      data: {
        status: 'CLOSED',
        processedNote:
          input.resultNote?.trim() || report.processedNote || undefined,
        version: report.version + 1,
      },
    })) as IntakeReportRow;
    const closedEvent = await appendEvent(tx, {
      eventId: randomUUID(),
      eventType: 'IntakeReportClosed',
      eventVersion: 1,
      aggregateType: 'IntakeReport',
      aggregateId: reportId,
      aggregateVersion: updated.version,
      occurredAt: new Date(),
      actor: eventActor(actor),
      payload: { status: 'CLOSED' },
      metadata: {},
    });
    await recordAudit(
      {
        actor,
        resourceType: 'IntakeReport',
        resourceId: reportId,
        operation: 'intake.closed',
        metadata: {},
      },
      tx,
    );
    await createInAppNotification(
      {
        userId: report.createdById,
        type: 'intake_result',
        title: 'Kết quả xử lý tin báo',
        body: `IntakeReport ${reportId.slice(0, 8)} đã kết thúc xử lý.`,
        resourceType: 'IntakeReport',
        resourceId: reportId,
        sourceEventId: closedEvent.eventId,
      },
      tx,
    );
    return {
      report: maskIntakeReport(
        updated,
        await canRevealIntakeRow(updated, actor),
      ),
    };
  });
}

export async function convertIntakeToIncident(
  reportId: string,
  actor: IncidentActor,
  options: { idempotencyKey?: string } = {},
) {
  requireRole(actor, 'duty_officer', 'commander');
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw(
      Prisma.sql`UPDATE "IntakeReport" SET "version" = "version" WHERE "id" = ${reportId}`,
    );
    const authoritativeReport = await loadIntakeReport(tx, reportId);
    assertIntakeReadScope(authoritativeReport, actor);
    if (options.idempotencyKey) {
      const prior = await tx.intakeCommand.findUnique({
        where: {
          reportId_command_idempotencyKey: {
            reportId,
            command: 'convert_to_incident',
            idempotencyKey: options.idempotencyKey,
          },
        },
      });
      if (prior)
        return prior.response as { reportId: string; incidentId: string };
    }
    if (authoritativeReport.incidentId) {
      const incident = await tx.incident.findUnique({
        where: { id: authoritativeReport.incidentId },
      });
      if (!incident) throw new Error('INCIDENT_NOT_FOUND');
      const response = {
        reportId,
        incidentId: incident.id,
        report: maskIntakeReport(
          authoritativeReport,
          await canRevealIntakeRow(authoritativeReport, actor),
        ),
      };
      if (options.idempotencyKey) {
        await tx.intakeCommand.create({
          data: {
            id: randomUUID(),
            reportId,
            command: 'convert_to_incident',
            idempotencyKey: options.idempotencyKey,
            response,
          },
        });
      }
      return response;
    }
    if (
      authoritativeReport.status !== 'VERIFIED' ||
      !authoritativeReport.confirmedAt
    ) {
      throw new Error(
        `INTAKE_CONFIRMATION_REQUIRED:${authoritativeReport.status}`,
      );
    }
    const incidentId = randomUUID();
    const incident = await tx.incident.create({
      data: {
        id: incidentId,
        intakeReportId: reportId,
        description: authoritativeReport.content,
        latitude: toFiniteNumber(authoritativeReport.latitude) ?? undefined,
        longitude: toFiniteNumber(authoritativeReport.longitude) ?? undefined,
        version: 1,
      },
    });
    const updated = (await tx.intakeReport.update({
      where: { id: reportId, version: authoritativeReport.version },
      data: {
        status: 'PROCESSED',
        incidentId,
        version: authoritativeReport.version + 1,
      },
    })) as IntakeReportRow;
    const convertedEvent = await appendEvent(tx, {
      eventId: randomUUID(),
      eventType: 'IntakeReportConvertedToIncident',
      eventVersion: 1,
      aggregateType: 'IntakeReport',
      aggregateId: reportId,
      aggregateVersion:
        (await getAggregateVersion(tx, 'IntakeReport', reportId)) + 1,
      occurredAt: new Date(),
      actor: eventActor(actor),
      payload: { incidentId, status: 'PROCESSED' },
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
      actor: eventActor(actor),
      payload: { intakeReportId: reportId, state: incidentState(incident) },
      metadata: {},
    });
    await recordAudit(
      {
        actor,
        resourceType: 'IntakeReport',
        resourceId: reportId,
        operation: 'intake.converted',
        metadata: { incidentId },
      },
      tx,
    );
    await recordAudit(
      {
        actor,
        resourceType: 'Incident',
        resourceId: incidentId,
        operation: 'incident.created',
        metadata: { intakeReportId: reportId },
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
    await createInAppNotification(
      {
        userId: authoritativeReport.createdById,
        type: 'intake_result',
        title: 'Tin báo đã chuyển thành Incident',
        body: `IntakeReport ${reportId.slice(0, 8)} đã chuyển xử lý chuyên sâu.`,
        resourceType: 'IntakeReport',
        resourceId: reportId,
        sourceEventId: convertedEvent.eventId,
      },
      tx,
    );
    const response = {
      reportId,
      incidentId,
      report: maskIntakeReport(
        updated,
        await canRevealIntakeRow(updated, actor),
      ),
    };
    if (options.idempotencyKey) {
      await tx.intakeCommand.create({
        data: {
          id: randomUUID(),
          reportId,
          command: 'convert_to_incident',
          idempotencyKey: options.idempotencyKey,
          response,
        },
      });
    }
    return response;
  });
}

export async function transferIntakeReport(
  reportId: string,
  actor: IncidentActor,
  input: IntakeTransferInput,
) {
  requireRole(actor, 'commander', 'superior_commander');
  if (!input.organizationId.trim()) throw new Error('ORGANIZATION_REQUIRED');
  const receiving = await prisma.organizationUnit.findUnique({
    where: { id: input.organizationId },
  });
  if (!receiving || !receiving.active) {
    throw new Error('RECEIVING_ORGANIZATION_INVALID');
  }
  if (receiving.level !== 'district') {
    throw new Error('RECEIVING_ORGANIZATION_INVALID');
  }
  if (actor.organizationUnitId && receiving.id === actor.organizationUnitId) {
    throw new Error('RECEIVING_ORGANIZATION_INVALID');
  }
  return prisma.$transaction(async (tx) => {
    const report = await loadIntakeReport(tx, reportId);
    assertIntakeReadScope(report, actor);
    const approval = await tx.approval.create({
      data: {
        resourceType: 'IntakeReport',
        resourceId: reportId,
        action: 'transfer',
        status: 'pending',
        organizationId: actor.organizationUnitId,
        requestedById: actor.id,
        reason: input.reason?.trim() || undefined,
        payload: {
          organizationId: receiving.id,
          reason: input.reason?.trim() ?? null,
        } as Prisma.InputJsonValue,
      },
    });
    return {
      approval,
      report: maskIntakeReport(report, await canRevealIntakeRow(report, actor)),
    };
  });
}

export async function approveIntakeTransfer(
  reportId: string,
  approvalId: string,
  actor: IncidentActor,
) {
  requireRole(actor, 'commander');
  return prisma.$transaction(async (tx) => {
    const approval = await tx.approval.findUnique({
      where: { id: approvalId },
    });
    if (
      !approval ||
      approval.resourceType !== 'IntakeReport' ||
      approval.resourceId !== reportId
    ) {
      throw new Error('APPROVAL_NOT_FOUND');
    }
    if (approval.status !== 'pending')
      throw new Error('APPROVAL_ALREADY_DECIDED');
    assertNoSelfApproval(approval.requestedById, actor.id);
    const report = await loadIntakeReport(tx, reportId);
    assertIntakeReadScope(report, actor);
    const receivingId = transferReceivingId(approval);
    if (!receivingId) throw new Error('RECEIVING_ORGANIZATION_INVALID');
    const updated = (await tx.intakeReport.update({
      where: { id: reportId, version: report.version },
      data: { transferToId: receivingId, version: report.version + 1 },
    })) as IntakeReportRow;
    const decided = await tx.approval.update({
      where: { id: approvalId, status: 'pending' },
      data: {
        status: 'approved',
        decidedById: actor.id,
        decidedAt: new Date(),
      },
    });
    await appendEvent(tx, {
      eventId: randomUUID(),
      eventType: 'IntakeReportTransferred',
      eventVersion: 1,
      aggregateType: 'IntakeReport',
      aggregateId: reportId,
      aggregateVersion: updated.version,
      occurredAt: new Date(),
      actor: eventActor(actor),
      payload: { organizationId: receivingId, approvalId },
      metadata: {},
    });
    await recordAudit(
      {
        actor,
        resourceType: 'IntakeReport',
        resourceId: reportId,
        operation: 'intake.transferred',
        metadata: { approvalId, organizationId: receivingId },
      },
      tx,
    );
    return {
      approval: decided,
      report: maskIntakeReport(
        updated,
        await canRevealIntakeRow(updated, actor),
      ),
    };
  });
}

export async function listIntakeReports(
  actor: IncidentActor,
  input?: {
    status?: string;
    sourceChannel?: string;
    sla?: string;
  },
) {
  requireRole(
    actor,
    'duty_officer',
    'commander',
    'field_officer',
    'office_officer',
    'village_officer',
    'superior_officer',
    'superior_commander',
  );
  const rows = (await prisma.intakeReport.findMany({
    where: {
      ...(actor.organizationUnitId
        ? {
            OR: [
              { organizationId: actor.organizationUnitId },
              { organizationId: null },
            ],
          }
        : {}),
      ...(input?.status ? { status: input.status } : {}),
      ...(input?.sourceChannel ? { sourceChannel: input.sourceChannel } : {}),
    },
    orderBy: { receivedAt: 'desc' },
    take: 100,
  })) as IntakeReportRow[];
  const reports = rows
    .map((row) => maskIntakeReport(row, false))
    .filter((report) => {
      if (input?.sla === 'overdue' && !report.sla.overdue) return false;
      if (input?.sla === 'warning' && !report.sla.warning) return false;
      return true;
    });
  await recordAudit({
    actor,
    resourceType: 'IntakeReport',
    resourceId: '*',
    operation: 'intake.listed',
    metadata: { count: reports.length },
  });
  return reports;
}

export async function getIntakeReport(reportId: string, actor: IncidentActor) {
  const row = (await prisma.intakeReport.findUnique({
    where: { id: reportId },
  })) as IntakeReportRow | null;
  if (!row) throw new Error('INTAKE_NOT_FOUND');
  assertIntakeReadScope(row, actor);
  const revealed = await canRevealIntakeRow(row, actor);
  await recordAudit({
    actor,
    resourceType: 'IntakeReport',
    resourceId: reportId,
    operation: 'intake.read',
  });
  if (revealed) {
    await recordAudit({
      actor,
      resourceType: 'IntakeReport',
      resourceId: reportId,
      operation: 'intake.sensitive_reveal',
    });
  }
  const [events, approvals, evidence, audits, slas] = await Promise.all([
    prisma.eventRecord.findMany({
      where: { aggregateType: 'IntakeReport', aggregateId: reportId },
      orderBy: { aggregateVersion: 'asc' },
    }),
    prisma.approval.findMany({
      where: { resourceType: 'IntakeReport', resourceId: reportId },
      orderBy: { requestedAt: 'desc' },
    }),
    prisma.evidence.findMany({
      where: { resourceType: 'IntakeReport', resourceId: reportId },
      orderBy: { receivedAt: 'asc' },
    }),
    prisma.auditEvent.findMany({
      where: { resourceType: 'IntakeReport', resourceId: reportId },
      orderBy: { occurredAt: 'desc' },
      take: 50,
    }),
    prisma.slaInstance.findMany({
      where: { resourceType: 'IntakeReport', resourceId: reportId },
    }),
  ]);
  return {
    report: maskIntakeReport(row, revealed),
    events,
    approvals,
    evidence,
    audits,
    slas,
  };
}

/** Source-compatible direct incident creation without an IntakeReport link. */
export async function registerIncident(
  input: IncidentInput,
  actor: IncidentActor,
) {
  requireRole(actor, 'duty_officer', 'commander');
  if (!input.description.trim()) throw new Error('DESCRIPTION_REQUIRED');
  if ((input.latitude === undefined) !== (input.longitude === undefined)) {
    throw new Error('GEOPOINT_INCOMPLETE');
  }
  if (input.latitude !== undefined && input.longitude !== undefined) {
    createGeoPoint(input.latitude, input.longitude);
  }
  const incidentId = randomUUID();
  return prisma.$transaction(async (tx) => {
    const incident = await tx.incident.create({
      data: {
        id: incidentId,
        description: input.description.trim(),
        category: input.category?.trim() || undefined,
        severity: input.severity?.trim() || undefined,
        latitude: input.latitude,
        longitude: input.longitude,
        version: 1,
      },
    });
    const registeredEvent = await appendEvent(tx, {
      eventId: randomUUID(),
      eventType: 'IncidentRegistered',
      eventVersion: 1,
      aggregateType: 'Incident',
      aggregateId: incidentId,
      aggregateVersion: 1,
      occurredAt: new Date(),
      actor: eventActor(actor),
      payload: { state: incidentState(incident) },
      metadata: {},
    });
    await recordAudit(
      {
        actor,
        resourceType: 'Incident',
        resourceId: incidentId,
        operation: 'incident.created',
        metadata: {},
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
    await createInAppNotification(
      {
        userId: actor.id,
        type: 'incident_created',
        title: 'Đã tạo Incident',
        body: `Incident ${incidentId.slice(0, 8)} đã tạo trực tiếp, chờ phân loại.`,
        resourceType: 'Incident',
        resourceId: incidentId,
        sourceEventId: registeredEvent.eventId,
      },
      tx,
    );
    return { incidentId };
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
  if (!assigneeUserIds.length) throw new Error('ASSIGNEE_REQUIRED');
  await assertAccess(
    actor,
    { resourceType: 'Incident', resourceId: incidentId },
    'assign',
  );
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
  requireRole(actor, 'field_officer');
  return updateIncidentStatus(incidentId, 'verifying', actor, { note });
}

export async function transferIncident(
  incidentId: string,
  actor: IncidentActor,
  organizationId: string,
) {
  if (!organizationId.trim()) throw new Error('ORGANIZATION_REQUIRED');
  const receiving = await prisma.organizationUnit.findUnique({
    where: { id: organizationId },
  });
  if (!receiving || !receiving.active) {
    throw new Error('RECEIVING_ORGANIZATION_INVALID');
  }
  if (actor.organizationUnitId && receiving.id === actor.organizationUnitId) {
    throw new Error('RECEIVING_ORGANIZATION_INVALID');
  }
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
  if (!allowed && !(await canReadTransferredIncident(incidentId, actor))) {
    throw new Error('FORBIDDEN');
  }
  await recordAudit({
    actor,
    resourceType: 'Incident',
    resourceId: incidentId,
    operation: 'incident.read',
  });
  const incidentRow = await prisma.incident.findUnique({
    where: { id: incidentId },
  });
  if (!incidentRow) throw new Error('INCIDENT_NOT_FOUND');
  const incident = { state: incidentState(incidentRow) };
  const report = incidentRow.intakeReportId
    ? await prisma.intakeReport.findUnique({
        where: { id: incidentRow.intakeReportId },
      })
    : null;
  const resource = { resourceType: 'Incident', resourceId: incidentId };
  const mayViewSensitive = report
    ? await canRevealIntakeRow(report, actor)
    : false;
  const informant =
    report && mayViewSensitive
      ? {
          name: report.sourceName ? decryptSensitive(report.sourceName) : null,
          contact: report.sourceContact
            ? decryptSensitive(report.sourceContact)
            : null,
        }
      : null;
  if (informant) {
    await recordAudit({
      actor,
      resourceType: 'Incident',
      resourceId: incidentId,
      operation: 'incident.sensitive_read',
    });
  }
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
        ...(actor.roles.includes('commander') ||
        actor.roles.includes('superior_commander')
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
  return { incident: incident.state, events, approvals, informant };
}
