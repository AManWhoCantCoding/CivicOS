import { prisma } from '@/lib/prisma';
import { upsertReadModel } from '@/modules/eventing';
import type { DomainEvent } from '@/modules/eventing';
import { decryptSensitive, recordAudit } from '@/modules/identity';

import { canViewResidentSensitive } from './commands';
import { maskDisplayName, slaBadge } from './contracts';
import type { ResidentActor } from './contracts';

export const residentProjectionName = 'resident-read-model';

export function projectResidentEvent(
  previous: Record<string, unknown> | null,
  event: DomainEvent,
): Record<string, unknown> {
  const payload = (event.payload ?? {}) as Record<string, unknown>;
  const occurredAt =
    event.occurredAt instanceof Date
      ? event.occurredAt.toISOString()
      : String(event.occurredAt);
  const current: Record<string, unknown> = { ...(previous ?? {}) };
  if (event.eventType === 'SubjectRegistered') {
    if (typeof payload.displayName === 'string') {
      current.displayName = payload.displayName;
    }
    if (typeof payload.subjectType === 'string') {
      current.subjectType = payload.subjectType;
    }
    current.status = 'active';
    current.createdAt = occurredAt;
  }
  if (event.eventType === 'SubjectManagementRecordCreated') {
    current.records = [...((current.records as unknown[]) ?? [])];
    if (typeof payload.purpose === 'string') {
      (current.records as Record<string, unknown>[]).push({
        recordId: event.aggregateId,
        purpose: payload.purpose,
      });
    }
  }
  if (event.eventType === 'SubjectActivityRecorded') {
    current.lastActivityAt = occurredAt;
  }
  if (event.eventType === 'SubjectRiskRaised') {
    current.riskLevel = payload.riskLevel ?? current.riskLevel;
  }
  if (event.eventType === 'SubjectTransferred') {
    current.status = 'transferred';
    current.assignedOrganizationId = payload.targetOrganizationId;
  }
  if (event.eventType === 'PeriodicReportGenerated') {
    current.status = 'draft';
  }
  if (event.eventType === 'PeriodicReportApproved') {
    current.status = 'approved';
    current.snapshotHash = payload.snapshotHash;
  }
  current.id = event.aggregateId;
  current.version = event.aggregateVersion;
  current.updatedAt = occurredAt;
  return current;
}

export async function applyResidentProjection(event: DomainEvent) {
  const existing = await prisma.projectionRecord.findUnique({
    where: {
      projectionName_aggregateType_aggregateId: {
        projectionName: residentProjectionName,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
      },
    },
  });
  const previous = (existing?.state as Record<string, unknown> | null) ?? null;
  const reduced = projectResidentEvent(previous, event);
  const organizationId =
    (typeof reduced['organizationId'] === 'string'
      ? (reduced['organizationId'] as string)
      : undefined) ??
    (typeof previous?.['organizationId'] === 'string'
      ? (previous?.['organizationId'] as string)
      : undefined) ??
    event.actor.organizationId;
  const state: Record<string, unknown> = organizationId
    ? { ...reduced, organizationId }
    : reduced;
  await upsertReadModel(prisma, residentProjectionName, event, state);
  return state;
}

export function registerResidentProjections() {
  return [residentProjectionName];
}

type RecordRow = {
  id: string;
  assignedOrganizationId: string | null;
};

async function visibleRecordIds(actor: ResidentActor): Promise<string[]> {
  const assignments = await prisma.assignment.findMany({
    where: {
      resourceType: 'SubjectManagementRecord',
      task: 'resident_followup',
      assigneeUserId: actor.id,
      status: 'active',
      ...(actor.organizationUnitId
        ? { organizationId: actor.organizationUnitId }
        : {}),
    },
    select: { resourceId: true },
  });
  return assignments.map(({ resourceId }) => resourceId);
}

async function scopedRecords(actor: ResidentActor): Promise<RecordRow[]> {
  const allowedIds = await visibleRecordIds(actor);
  return prisma.subjectManagementRecord.findMany({
    where: {
      id: { in: allowedIds },
      ...(actor.organizationUnitId
        ? { assignedOrganizationId: actor.organizationUnitId }
        : {}),
    },
    select: { id: true, assignedOrganizationId: true },
  });
}

export async function listSubjects(
  actor: ResidentActor,
  filters: { subjectType?: string; overdue?: boolean },
) {
  const records = await scopedRecords(actor);
  const recordIds = records.map(({ id }) => id);
  const subjects = await prisma.subject.findMany({
    where: {
      ...(filters.subjectType ? { subjectType: filters.subjectType } : {}),
      records: { some: { id: { in: recordIds } } },
    },
    include: {
      records: {
        where: { id: { in: recordIds } },
        select: {
          id: true,
          purpose: true,
          status: true,
          riskLevel: true,
          nextCheckAt: true,
          assignedOrganizationId: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });
  const now = new Date();
  const entries = subjects.map((subject) => ({
    id: subject.id,
    displayName: maskDisplayName(subject.displayName),
    subjectType: subject.subjectType,
    status: subject.status,
    records: subject.records.map((record) => ({
      ...record,
      nextCheckAt: record.nextCheckAt?.toISOString() ?? null,
      sla: slaBadge(now, record.nextCheckAt),
    })),
  }));
  if (!filters.overdue) return entries;
  return entries.filter((entry) =>
    entry.records.some((record) => record.sla === 'overdue'),
  );
}

export async function listManagementRecords(
  subjectId: string,
  actor: ResidentActor,
) {
  const records = await scopedRecords(actor);
  const allowed = new Set(records.map(({ id }) => id));
  const rows = await prisma.subjectManagementRecord.findMany({
    where: { subjectId, id: { in: [...allowed] } },
    orderBy: { createdAt: 'desc' },
  });
  const now = new Date();
  return rows.map((record) => ({
    ...record,
    nextCheckAt: record.nextCheckAt?.toISOString() ?? null,
    sla: slaBadge(now, record.nextCheckAt),
  }));
}

export async function getSubjectDetail(
  subjectId: string,
  actor: ResidentActor,
) {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: {
      records: {
        select: {
          id: true,
          purpose: true,
          status: true,
          riskLevel: true,
          nextCheckAt: true,
          assignedOrganizationId: true,
          version: true,
        },
      },
    },
  });
  if (!subject) throw new Error('SUBJECT_NOT_FOUND');
  const records = await scopedRecords(actor);
  const allowed = new Set(records.map(({ id }) => id));
  const visibleRecords = subject.records.filter((record) =>
    allowed.has(record.id),
  );
  if (!visibleRecords.length) throw new Error('FORBIDDEN');
  const now = new Date();
  const primary = visibleRecords[0];
  const canView =
    primary &&
    (await canViewResidentSensitive(
      {
        id: primary.id,
        assignedOrganizationId: primary.assignedOrganizationId,
      },
      actor,
    ));
  if (canView && subject.sensitiveProfile) {
    await recordAudit({
      actor,
      resourceType: 'Subject',
      resourceId: subject.id,
      operation: 'subject.sensitive_read',
      metadata: { recordId: primary?.id },
    });
  }
  return {
    id: subject.id,
    displayName: canView
      ? subject.displayName
      : maskDisplayName(subject.displayName),
    subjectType: subject.subjectType,
    status: subject.status,
    sensitiveProfile:
      canView && subject.sensitiveProfile
        ? decryptSensitive(subject.sensitiveProfile)
        : null,
    masked: !canView,
    latitude: subject.latitude ? String(subject.latitude) : null,
    longitude: subject.longitude ? String(subject.longitude) : null,
    records: visibleRecords.map((record) => ({
      ...record,
      nextCheckAt: record.nextCheckAt?.toISOString() ?? null,
      sla: slaBadge(now, record.nextCheckAt),
    })),
  };
}

export async function getRecord(recordId: string, actor: ResidentActor) {
  const record = await prisma.subjectManagementRecord.findUnique({
    where: { id: recordId },
    include: {
      subject: {
        select: { id: true, displayName: true, subjectType: true },
      },
    },
  });
  if (!record) throw new Error('RECORD_NOT_FOUND');
  const scoped = await scopedRecords(actor);
  if (!scoped.some(({ id }) => id === record.id)) {
    throw new Error('FORBIDDEN');
  }
  const activities = await prisma.subjectManagementActivity.findMany({
    where: { recordId },
    orderBy: { occurredAt: 'desc' },
    take: 100,
  });
  await recordAudit({
    actor,
    resourceType: 'SubjectManagementRecord',
    resourceId: record.id,
    operation: 'subject_record.read',
    metadata: {},
  });
  return {
    ...record,
    nextCheckAt: record.nextCheckAt?.toISOString() ?? null,
    subject: {
      ...record.subject,
      displayName: maskDisplayName(record.subject.displayName),
    },
    sla: slaBadge(new Date(), record.nextCheckAt),
    activities,
  };
}

export async function listReportPreviews(
  organizationId: string,
  actor: ResidentActor,
) {
  if (
    actor.organizationUnitId &&
    actor.organizationUnitId !== organizationId &&
    !actor.roles.includes('superior_commander' as never)
  ) {
    throw new Error('FORBIDDEN');
  }
  return prisma.residentMonthlyReport.findMany({
    where: { organizationId },
    orderBy: { period: 'desc' },
    take: 24,
  });
}
