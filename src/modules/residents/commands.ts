import { createHash, randomUUID } from 'node:crypto';

import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { appendEvent, getAggregateVersion } from '@/modules/eventing';
import {
  assertResidentActivityAccess,
  assertResidentActivityRole,
} from '@/modules/identity/authorization';
import {
  ROLE_BASE_CAPABILITIES,
  blindIndex,
  decryptSensitive,
  encryptSensitive,
  recordAudit,
  requireRole,
} from '@/modules/identity';
import { createGeoPoint, createSla } from '@/modules/platform';

import {
  RESIDENT_FOLLOWUP_TASK,
  isResidentSubjectType,
  maskDisplayName,
  nextCheckForPurpose,
  slaRuleForPurpose,
} from './contracts';
import type { ResidentActor, ResidentSubjectType } from './contracts';

type ResidentTx = Prisma.TransactionClient;

function actorSnapshot(actor: ResidentActor) {
  return {
    id: actor.id,
    name: actor.name,
    role: actor.roles[0],
    organizationId: actor.organizationUnitId,
  };
}

function sameUnit(actor: ResidentActor, organizationId?: string | null) {
  if (!actor.organizationUnitId?.trim() || !organizationId?.trim())
    return false;
  return actor.organizationUnitId === organizationId;
}

async function hasResidentAssignment(
  client: ResidentTx,
  recordId: string,
  actor: ResidentActor,
): Promise<boolean> {
  const assignment = await client.assignment.findFirst({
    where: {
      resourceType: 'SubjectManagementRecord',
      resourceId: recordId,
      task: RESIDENT_FOLLOWUP_TASK,
      assigneeUserId: actor.id,
      status: 'active',
    },
    select: { organizationId: true },
  });
  if (!assignment) return false;
  return sameUnit(actor, assignment.organizationId);
}

async function assertRecordAccess(
  client: ResidentTx,
  record: { id: string; assignedOrganizationId: string | null },
  actor: ResidentActor,
) {
  if (!sameUnit(actor, record.assignedOrganizationId)) {
    throw new Error('FORBIDDEN');
  }
  if (!(await hasResidentAssignment(client, record.id, actor))) {
    throw new Error('FORBIDDEN');
  }
}

export async function canViewResidentSensitive(
  record: { id: string; assignedOrganizationId: string | null },
  actor: ResidentActor,
  client: ResidentTx | typeof prisma = prisma,
): Promise<boolean> {
  const capable = actor.roles.some((role) =>
    (ROLE_BASE_CAPABILITIES[role] ?? []).includes('read_sensitive'),
  );
  if (!capable) return false;
  if (!sameUnit(actor, record.assignedOrganizationId)) return false;
  if (client === prisma) {
    return prisma.$transaction((tx) =>
      hasResidentAssignment(tx, record.id, actor),
    );
  }
  return hasResidentAssignment(client, record.id, actor);
}

export type RegisterSubjectInput = {
  displayName: string;
  subjectType: ResidentSubjectType;
  sensitiveProfile?: string;
  latitude?: number;
  longitude?: number;
};

export async function registerSubject(
  input: RegisterSubjectInput,
  actor: ResidentActor,
) {
  requireRole(actor, 'commander', 'duty_officer', 'office_officer');
  if (!input.displayName.trim()) throw new Error('DISPLAY_NAME_REQUIRED');
  if (!isResidentSubjectType(input.subjectType)) {
    throw new Error('INVALID_SUBJECT_TYPE');
  }
  if ((input.latitude === undefined) !== (input.longitude === undefined)) {
    throw new Error('GEOPOINT_INCOMPLETE');
  }
  if (input.latitude !== undefined && input.longitude !== undefined) {
    createGeoPoint(input.latitude, input.longitude);
  }
  return prisma.$transaction(async (tx) => {
    const subject = await tx.subject.create({
      data: {
        displayName: input.displayName.trim(),
        subjectType: input.subjectType,
        sensitiveProfile: input.sensitiveProfile
          ? encryptSensitive(input.sensitiveProfile)
          : undefined,
        sensitiveIndex: input.sensitiveProfile
          ? blindIndex(input.sensitiveProfile)
          : undefined,
        latitude: input.latitude,
        longitude: input.longitude,
      },
    });
    await appendEvent(tx, {
      eventId: randomUUID(),
      eventType: 'SubjectRegistered',
      eventVersion: 1,
      aggregateType: 'Subject',
      aggregateId: subject.id,
      aggregateVersion: 1,
      occurredAt: subject.createdAt,
      actor: actorSnapshot(actor),
      payload: {
        displayName: subject.displayName,
        subjectType: subject.subjectType,
      },
      metadata: {},
    });
    await recordAudit(
      {
        actor,
        resourceType: 'Subject',
        resourceId: subject.id,
        operation: 'subject.registered',
        metadata: { subjectType: subject.subjectType },
      },
      tx,
    );
    const capable = actor.roles.some((role) =>
      (ROLE_BASE_CAPABILITIES[role] ?? []).includes('read_sensitive'),
    );
    return {
      id: subject.id,
      displayName: capable
        ? subject.displayName
        : maskDisplayName(subject.displayName),
      subjectType: subject.subjectType,
      status: subject.status,
      masked: !capable,
      latitude: subject.latitude ? String(subject.latitude) : null,
      longitude: subject.longitude ? String(subject.longitude) : null,
      createdAt: subject.createdAt,
      updatedAt: subject.updatedAt,
    };
  });
}

export type CreateRecordInput = {
  subjectId: string;
  purpose: ResidentSubjectType;
  riskLevel?: string;
  sourceOrganizationId?: string;
  assignedOrganizationId?: string;
};

export async function createManagementRecord(
  input: CreateRecordInput,
  actor: ResidentActor,
) {
  requireRole(actor, 'commander', 'duty_officer', 'office_officer');
  if (!isResidentSubjectType(input.purpose)) {
    throw new Error('INVALID_SUBJECT_TYPE');
  }
  const subject = await prisma.subject.findUnique({
    where: { id: input.subjectId },
  });
  if (!subject) throw new Error('SUBJECT_NOT_FOUND');
  const organizationId =
    input.assignedOrganizationId ?? actor.organizationUnitId;
  if (!sameUnit(actor, organizationId)) throw new Error('FORBIDDEN');
  return prisma.$transaction(async (tx) => {
    const record = await tx.subjectManagementRecord.create({
      data: {
        subjectId: subject.id,
        purpose: input.purpose,
        riskLevel: input.riskLevel ?? 'normal',
        sourceOrganizationId: input.sourceOrganizationId,
        assignedOrganizationId: organizationId,
        nextCheckAt: nextCheckForPurpose(input.purpose, new Date()),
      },
    });
    await appendEvent(tx, {
      eventId: randomUUID(),
      eventType: 'SubjectManagementRecordCreated',
      eventVersion: 1,
      aggregateType: 'SubjectManagementRecord',
      aggregateId: record.id,
      aggregateVersion: 1,
      occurredAt: record.createdAt,
      actor: actorSnapshot(actor),
      payload: {
        subjectId: subject.id,
        purpose: record.purpose,
        riskLevel: record.riskLevel,
      },
      metadata: {},
    });
    await createSla(
      {
        resourceType: 'SubjectManagementRecord',
        resourceId: record.id,
        rule: slaRuleForPurpose(input.purpose, 'registration'),
        startedAt: record.createdAt,
        assigneeUserId: actor.id,
      },
      tx,
    );
    if (input.purpose === 'reintegration') {
      await createSla(
        {
          resourceType: 'SubjectManagementRecord',
          resourceId: record.id,
          rule: slaRuleForPurpose(input.purpose, 'checkup'),
          startedAt: record.createdAt,
          assigneeUserId: actor.id,
        },
        tx,
      );
    }
    if (input.purpose === 'foreign_resident') {
      await createSla(
        {
          resourceType: 'SubjectManagementRecord',
          resourceId: record.id,
          rule: slaRuleForPurpose(input.purpose, 'same_day'),
          startedAt: record.createdAt,
          assigneeUserId: actor.id,
        },
        tx,
      );
    }
    await recordAudit(
      {
        actor,
        resourceType: 'SubjectManagementRecord',
        resourceId: record.id,
        operation: 'subject_record.created',
        metadata: { subjectId: subject.id, purpose: record.purpose },
      },
      tx,
    );
    return record;
  });
}

const RESIDENT_ASSIGNABLE_ROLES: readonly string[] = [
  'commander',
  'duty_officer',
  'field_officer',
  'office_officer',
  'village_officer',
  'superior_officer',
  'superior_commander',
];

export async function assignRecord(
  recordId: string,
  input: { assigneeUserIds: string[] },
  actor: ResidentActor,
) {
  requireRole(actor, 'commander', 'superior_commander');
  if (!input.assigneeUserIds.length) throw new Error('ASSIGNEE_REQUIRED');
  const record = await prisma.subjectManagementRecord.findUnique({
    where: { id: recordId },
  });
  if (!record) throw new Error('RECORD_NOT_FOUND');
  if (!sameUnit(actor, record.assignedOrganizationId)) {
    throw new Error('FORBIDDEN');
  }
  return prisma.$transaction(async (tx) => {
    const assignments = [];
    for (const assigneeUserId of input.assigneeUserIds) {
      const assignee = await tx.user.findUnique({
        where: { id: assigneeUserId },
        select: {
          active: true,
          organizationUnitId: true,
          roles: { select: { role: { select: { name: true } } } },
        },
      });
      if (!assignee?.active) throw new Error('ASSIGNEE_NOT_FOUND');
      const assigneeRoles = (assignee.roles ?? []).map(({ role }) => role.name);
      if (
        !assigneeRoles.some((role) =>
          (RESIDENT_ASSIGNABLE_ROLES as readonly string[]).includes(role),
        )
      ) {
        throw new Error('INCOMPATIBLE_TASK');
      }
      const organizationId =
        record.assignedOrganizationId ?? actor.organizationUnitId;
      if (organizationId && assignee.organizationUnitId !== organizationId) {
        throw new Error('ASSIGNEE_ORGANIZATION_MISMATCH');
      }
      const assignment = await tx.assignment.create({
        data: {
          resourceType: 'SubjectManagementRecord',
          resourceId: record.id,
          task: RESIDENT_FOLLOWUP_TASK,
          assigneeUserId,
          grantedById: actor.id,
          organizationId,
        },
      });
      assignments.push(assignment);
      await appendEvent(tx, {
        eventId: randomUUID(),
        eventType: 'AssignmentGranted',
        eventVersion: 1,
        aggregateType: 'Assignment',
        aggregateId: assignment.id,
        aggregateVersion: 1,
        occurredAt: assignment.grantedAt,
        actor: actorSnapshot(actor),
        payload: {
          resourceType: assignment.resourceType,
          resourceId: assignment.resourceId,
          assigneeUserId,
          task: assignment.task,
        },
        metadata: {},
      });
    }
    const aggregateVersion =
      (await getAggregateVersion(tx, 'SubjectManagementRecord', record.id)) + 1;
    await appendEvent(tx, {
      eventId: randomUUID(),
      eventType: 'SubjectAssigned',
      eventVersion: 1,
      aggregateType: 'SubjectManagementRecord',
      aggregateId: record.id,
      aggregateVersion,
      occurredAt: new Date(),
      actor: actorSnapshot(actor),
      payload: {
        assigneeUserIds: input.assigneeUserIds,
        task: RESIDENT_FOLLOWUP_TASK,
      },
      metadata: {},
    });
    await recordAudit(
      {
        actor,
        resourceType: 'SubjectManagementRecord',
        resourceId: record.id,
        operation: 'subject_record.assigned',
        reason: RESIDENT_FOLLOWUP_TASK,
        metadata: {
          assignmentIds: assignments.map(({ id }) => id),
        },
      },
      tx,
    );
    return { assignments };
  });
}

export type RecordActivityInput = {
  recordId: string;
  activityType: string;
  occurredAt: string;
  content: string;
  evaluation?: string;
  latitude?: number;
  longitude?: number;
  evidenceIds?: string[];
  assignmentId?: string;
  idempotencyKey?: string;
};

export async function recordActivity(
  input: RecordActivityInput,
  actor: ResidentActor,
) {
  assertResidentActivityRole(actor);
  if (!input.content.trim()) throw new Error('CONTENT_REQUIRED');
  const occurredAt = new Date(input.occurredAt);
  if (Number.isNaN(occurredAt.getTime())) {
    throw new Error('INVALID_OCCURRED_AT');
  }
  if ((input.latitude === undefined) !== (input.longitude === undefined)) {
    throw new Error('GEOPOINT_INCOMPLETE');
  }
  if (input.latitude !== undefined && input.longitude !== undefined) {
    createGeoPoint(input.latitude, input.longitude);
  }
  return prisma.$transaction(async (tx) => {
    const record = await tx.subjectManagementRecord.findUnique({
      where: { id: input.recordId },
      select: { id: true, assignedOrganizationId: true },
    });
    if (!record) throw new Error('RECORD_NOT_FOUND');
    await assertResidentActivityAccess(
      actor,
      {
        resourceType: 'SubjectManagementRecord',
        resourceId: record.id,
        organizationId: record.assignedOrganizationId ?? undefined,
      },
      input.assignmentId,
      tx,
    );
    if (input.idempotencyKey) {
      const existing = await tx.subjectManagementActivity.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        select: { id: true, recordId: true },
      });
      if (existing) {
        if (existing.recordId !== record.id) throw new Error('FORBIDDEN');
        await recordAudit(
          {
            actor,
            resourceType: 'SubjectManagementRecord',
            resourceId: record.id,
            operation: 'subject_activity.idempotency_replayed',
            metadata: { activityId: existing.id },
          },
          tx,
        );
        const replayedActivity = await tx.subjectManagementActivity.findFirst({
          where: { id: existing.id, recordId: record.id },
        });
        if (!replayedActivity || replayedActivity.recordId !== record.id) {
          throw new Error('FORBIDDEN');
        }
        return replayedActivity;
      }
    }
    const recordState = await tx.subjectManagementRecord.findUnique({
      where: { id: record.id },
      select: { id: true, status: true, purpose: true, version: true },
    });
    if (!recordState) throw new Error('RECORD_NOT_FOUND');
    if (
      recordState.status === 'closed' ||
      recordState.status === 'transferred'
    ) {
      throw new Error('RECORD_LOCKED');
    }
    const activity = await tx.subjectManagementActivity.create({
      data: {
        recordId: record.id,
        activityType: input.activityType,
        occurredAt,
        content: input.content.trim(),
        evaluation: input.evaluation,
        latitude: input.latitude,
        longitude: input.longitude,
        actorId: actor.id,
        assignmentId: input.assignmentId,
        evidenceIds: (input.evidenceIds ?? []) as Prisma.InputJsonValue,
        idempotencyKey: input.idempotencyKey,
      },
    });
    if (
      input.activityType === 'checkup' &&
      isResidentSubjectType(recordState.purpose)
    ) {
      const nextCheck = nextCheckForPurpose(
        recordState.purpose as ResidentSubjectType,
        occurredAt,
      );
      await tx.subjectManagementRecord.update({
        where: { id: recordState.id },
        data: { nextCheckAt: nextCheck, version: recordState.version + 1 },
      });
      await tx.slaInstance.updateMany({
        where: {
          resourceType: 'SubjectManagementRecord',
          resourceId: record.id,
          kind: 'resident_monthly_checkup',
        },
        data: {
          status: 'active',
          dueAt: nextCheck,
          overdueAt: null,
          completedAt: null,
        },
      });
    }
    const aggregateVersion =
      (await getAggregateVersion(tx, 'SubjectManagementRecord', record.id)) + 1;
    await appendEvent(tx, {
      eventId: randomUUID(),
      eventType: 'SubjectActivityRecorded',
      eventVersion: 1,
      aggregateType: 'SubjectManagementRecord',
      aggregateId: record.id,
      aggregateVersion,
      occurredAt,
      actor: actorSnapshot(actor),
      payload: {
        activityId: activity.id,
        activityType: activity.activityType,
      },
      metadata: {},
    });
    await recordAudit(
      {
        actor,
        resourceType: 'SubjectManagementRecord',
        resourceId: record.id,
        operation: 'subject_activity.recorded',
        metadata: {
          activityId: activity.id,
          activityType: activity.activityType,
        },
      },
      tx,
    );
    return activity;
  });
}

export async function updateRecord(
  recordId: string,
  input: {
    status?: string;
    riskLevel?: string;
    nextCheckAt?: string;
    baseVersion: number;
  },
  actor: ResidentActor,
) {
  requireRole(actor, 'commander', 'duty_officer', 'office_officer');
  return prisma.$transaction(async (tx) => {
    const record = await tx.subjectManagementRecord.findUnique({
      where: { id: recordId },
    });
    if (!record) throw new Error('RECORD_NOT_FOUND');
    await assertRecordAccess(tx, record, actor);
    if (record.version !== input.baseVersion) {
      throw new Error('STALE_RECORD');
    }
    const data: Prisma.SubjectManagementRecordUpdateInput = {
      version: record.version + 1,
    };
    if (input.status) data.status = input.status;
    if (input.riskLevel) data.riskLevel = input.riskLevel;
    if (input.nextCheckAt) {
      const nextCheck = new Date(input.nextCheckAt);
      if (Number.isNaN(nextCheck.getTime())) {
        throw new Error('INVALID_NEXT_CHECK');
      }
      data.nextCheckAt = nextCheck;
    }
    try {
      const updated = await tx.subjectManagementRecord.update({
        where: { id: record.id, version: record.version },
        data,
      });
      const aggregateVersion =
        (await getAggregateVersion(tx, 'SubjectManagementRecord', record.id)) +
        1;
      await appendEvent(tx, {
        eventId: randomUUID(),
        eventType: 'SubjectManagementRecordUpdated',
        eventVersion: 1,
        aggregateType: 'SubjectManagementRecord',
        aggregateId: record.id,
        aggregateVersion,
        occurredAt: new Date(),
        actor: actorSnapshot(actor),
        payload: { status: updated.status, riskLevel: updated.riskLevel },
        metadata: {},
      });
      await recordAudit(
        {
          actor,
          resourceType: 'SubjectManagementRecord',
          resourceId: record.id,
          operation: 'subject_record.updated',
          metadata: { version: updated.version },
        },
        tx,
      );
      return updated;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new Error('STALE_RECORD');
      }
      throw error;
    }
  });
}

export async function raiseRisk(
  recordId: string,
  riskLevel: string,
  actor: ResidentActor,
  reason?: string,
) {
  requireRole(actor, 'commander', 'duty_officer', 'field_officer');
  return prisma.$transaction(async (tx) => {
    const record = await tx.subjectManagementRecord.findUnique({
      where: { id: recordId },
    });
    if (!record) throw new Error('RECORD_NOT_FOUND');
    await assertRecordAccess(tx, record, actor);
    const updated = await tx.subjectManagementRecord.update({
      where: { id: record.id },
      data: { riskLevel, version: record.version + 1 },
    });
    if (riskLevel === 'high') {
      await createSla(
        {
          resourceType: 'SubjectManagementRecord',
          resourceId: record.id,
          rule: {
            kind: 'resident_high_risk_escalation',
            durationMs: 24 * 60 * 60 * 1000,
          },
          assigneeUserId: actor.id,
        },
        tx,
      );
    }
    const aggregateVersion =
      (await getAggregateVersion(tx, 'SubjectManagementRecord', record.id)) + 1;
    await appendEvent(tx, {
      eventId: randomUUID(),
      eventType: 'SubjectRiskRaised',
      eventVersion: 1,
      aggregateType: 'SubjectManagementRecord',
      aggregateId: record.id,
      aggregateVersion,
      occurredAt: new Date(),
      actor: actorSnapshot(actor),
      payload: { riskLevel, reason: reason ?? null },
      metadata: {},
    });
    await recordAudit(
      {
        actor,
        resourceType: 'SubjectManagementRecord',
        resourceId: record.id,
        operation: 'subject_record.risk_raised',
        reason: reason ?? riskLevel,
        metadata: { riskLevel },
      },
      tx,
    );
    return updated;
  });
}

export async function transferRecord(
  recordId: string,
  targetOrganizationId: string,
  actor: ResidentActor,
) {
  requireRole(actor, 'commander', 'superior_commander');
  if (!targetOrganizationId.trim()) {
    throw new Error('TARGET_ORGANIZATION_REQUIRED');
  }
  return prisma.$transaction(async (tx) => {
    const record = await tx.subjectManagementRecord.findUnique({
      where: { id: recordId },
    });
    if (!record) throw new Error('RECORD_NOT_FOUND');
    await assertRecordAccess(tx, record, actor);
    const updated = await tx.subjectManagementRecord.update({
      where: { id: record.id },
      data: {
        assignedOrganizationId: targetOrganizationId,
        status: 'transferred',
        version: record.version + 1,
      },
    });
    const aggregateVersion =
      (await getAggregateVersion(tx, 'SubjectManagementRecord', record.id)) + 1;
    await appendEvent(tx, {
      eventId: randomUUID(),
      eventType: 'SubjectTransferred',
      eventVersion: 1,
      aggregateType: 'SubjectManagementRecord',
      aggregateId: record.id,
      aggregateVersion,
      occurredAt: new Date(),
      actor: actorSnapshot(actor),
      payload: { targetOrganizationId },
      metadata: {},
    });
    await recordAudit(
      {
        actor,
        resourceType: 'SubjectManagementRecord',
        resourceId: record.id,
        operation: 'subject_record.transferred',
        reason: targetOrganizationId,
        metadata: { targetOrganizationId },
      },
      tx,
    );
    return updated;
  });
}

function snapshotHash(payload: Record<string, unknown>): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export async function generateMonthlyReport(
  input: {
    organizationId: string;
    period: string;
    idempotencyKey?: string;
  },
  actor: ResidentActor,
) {
  requireRole(actor, 'commander', 'office_officer');
  if (!/^\d{4}-\d{2}$/.test(input.period)) {
    throw new Error('INVALID_PERIOD');
  }
  if (!sameUnit(actor, input.organizationId)) {
    throw new Error('FORBIDDEN');
  }
  return prisma.$transaction(async (tx) => {
    const existing = await tx.residentMonthlyReport.findUnique({
      where: {
        organizationId_period: {
          organizationId: input.organizationId,
          period: input.period,
        },
      },
    });
    if (existing) return existing;
    if (input.idempotencyKey) {
      const byKey = await tx.residentMonthlyReport.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (byKey) return byKey;
    }
    const records = await tx.subjectManagementRecord.findMany({
      where: { assignedOrganizationId: input.organizationId },
      select: {
        id: true,
        purpose: true,
        status: true,
        riskLevel: true,
        nextCheckAt: true,
      },
    });
    const now = Date.now();
    const byPurpose: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let overdue = 0;
    let highRisk = 0;
    for (const record of records) {
      byPurpose[record.purpose] = (byPurpose[record.purpose] ?? 0) + 1;
      byStatus[record.status] = (byStatus[record.status] ?? 0) + 1;
      if (
        record.status === 'open' &&
        record.nextCheckAt &&
        record.nextCheckAt.getTime() <= now
      ) {
        overdue += 1;
      }
      if (record.riskLevel === 'high' && record.status === 'open') {
        highRisk += 1;
      }
    }
    const report = await tx.residentMonthlyReport.create({
      data: {
        organizationId: input.organizationId,
        period: input.period,
        sourceRecordIds: records.map(({ id }) => id) as Prisma.InputJsonValue,
        aggregateCounts: {
          total: records.length,
          byPurpose,
          byStatus,
          overdue,
          highRisk,
        } as Prisma.InputJsonValue,
        idempotencyKey: input.idempotencyKey,
      },
    });
    await appendEvent(tx, {
      eventId: randomUUID(),
      eventType: 'PeriodicReportGenerated',
      eventVersion: 1,
      aggregateType: 'ResidentMonthlyReport',
      aggregateId: report.id,
      aggregateVersion: 1,
      occurredAt: report.createdAt,
      actor: actorSnapshot(actor),
      payload: { organizationId: report.organizationId, period: report.period },
      metadata: {},
    });
    await recordAudit(
      {
        actor,
        resourceType: 'ResidentMonthlyReport',
        resourceId: report.id,
        operation: 'resident_report.generated',
        metadata: { period: report.period },
      },
      tx,
    );
    return report;
  });
}

export async function approveReport(reportId: string, actor: ResidentActor) {
  requireRole(actor, 'commander', 'superior_commander');
  return prisma.$transaction(async (tx) => {
    const report = await tx.residentMonthlyReport.findUnique({
      where: { id: reportId },
    });
    if (!report) throw new Error('REPORT_NOT_FOUND');
    if (report.status !== 'draft') throw new Error('REPORT_LOCKED');
    if (!sameUnit(actor, report.organizationId)) {
      throw new Error('FORBIDDEN');
    }
    const snapshotPayload = {
      reportId: report.id,
      organizationId: report.organizationId,
      period: report.period,
      approvedAt: new Date().toISOString(),
      sourceRecordIds: report.sourceRecordIds,
      aggregateCounts: report.aggregateCounts,
    };
    const updated = await tx.residentMonthlyReport.update({
      where: { id: report.id, status: 'draft' },
      data: {
        status: 'approved',
        snapshotPayload: snapshotPayload as Prisma.InputJsonValue,
        snapshotHash: snapshotHash(snapshotPayload),
        approvedById: actor.id,
        approvedAt: new Date(),
        version: report.version + 1,
      },
    });
    await tx.approval.create({
      data: {
        resourceType: 'ResidentMonthlyReport',
        resourceId: report.id,
        action: 'approve',
        status: 'approved',
        organizationId: report.organizationId,
        requestedById: actor.id,
        decidedById: actor.id,
        payload: { period: report.period } as Prisma.InputJsonValue,
        decidedAt: new Date(),
      },
    });
    const aggregateVersion =
      (await getAggregateVersion(tx, 'ResidentMonthlyReport', report.id)) + 1;
    await appendEvent(tx, {
      eventId: randomUUID(),
      eventType: 'PeriodicReportApproved',
      eventVersion: 1,
      aggregateType: 'ResidentMonthlyReport',
      aggregateId: report.id,
      aggregateVersion,
      occurredAt: new Date(),
      actor: actorSnapshot(actor),
      payload: { snapshotHash: updated.snapshotHash },
      metadata: {},
    });
    await recordAudit(
      {
        actor,
        resourceType: 'ResidentMonthlyReport',
        resourceId: report.id,
        operation: 'resident_report.approved',
        metadata: { snapshotHash: updated.snapshotHash },
      },
      tx,
    );
    return updated;
  });
}

export async function sendReport(
  reportId: string,
  targetOrganizationId: string,
  actor: ResidentActor,
) {
  requireRole(actor, 'commander', 'superior_commander');
  if (!targetOrganizationId.trim()) {
    throw new Error('TARGET_ORGANIZATION_REQUIRED');
  }
  return prisma.$transaction(async (tx) => {
    const report = await tx.residentMonthlyReport.findUnique({
      where: { id: reportId },
    });
    if (!report) throw new Error('REPORT_NOT_FOUND');
    if (report.status !== 'approved') throw new Error('REPORT_NOT_APPROVED');
    if (!sameUnit(actor, report.organizationId)) {
      throw new Error('FORBIDDEN');
    }
    const updated = await tx.residentMonthlyReport.update({
      where: { id: report.id, status: 'approved' },
      data: {
        status: 'sent',
        sentAt: new Date(),
        sendTargetId: targetOrganizationId,
        version: report.version + 1,
      },
    });
    if (updated.snapshotHash !== report.snapshotHash) {
      throw new Error('SNAPSHOT_MUTATED');
    }
    const aggregateVersion =
      (await getAggregateVersion(tx, 'ResidentMonthlyReport', report.id)) + 1;
    await appendEvent(tx, {
      eventId: randomUUID(),
      eventType: 'PeriodicReportSent',
      eventVersion: 1,
      aggregateType: 'ResidentMonthlyReport',
      aggregateId: report.id,
      aggregateVersion,
      occurredAt: new Date(),
      actor: actorSnapshot(actor),
      payload: { targetOrganizationId },
      metadata: {},
    });
    await recordAudit(
      {
        actor,
        resourceType: 'ResidentMonthlyReport',
        resourceId: report.id,
        operation: 'resident_report.sent',
        reason: targetOrganizationId,
        metadata: { snapshotHash: report.snapshotHash },
      },
      tx,
    );
    return updated;
  });
}

export async function decryptResidentProfile(
  subjectId: string,
  actor: ResidentActor,
): Promise<string | null> {
  const capable = actor.roles.some((role) =>
    (ROLE_BASE_CAPABILITIES[role] ?? []).includes('read_sensitive'),
  );
  if (!capable) throw new Error('FORBIDDEN');
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
  });
  if (!subject) throw new Error('SUBJECT_NOT_FOUND');
  if (!subject.sensitiveProfile) return null;
  return decryptSensitive(subject.sensitiveProfile);
}
