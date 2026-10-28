import { randomUUID } from 'node:crypto';

import { Prisma } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import type { IdentityUser } from '@/modules/identity';
import {
  approveReport,
  assignRecord,
  createManagementRecord,
  generateMonthlyReport,
  getRecord,
  getSubjectDetail,
  listReportPreviews,
  listSubjects,
  recordActivity,
  registerSubject,
  sendReport,
  transferRecord,
} from '@/modules/residents';

const postgresEnabled = process.env.RUN_DB_TESTS === '1';
const stamp = randomUUID().slice(0, 8);
const ORG = `t05-org-${stamp}`;
const UPPER = `t05-upper-${stamp}`;

function userRef(
  id: string,
  roles: IdentityUser['roles'],
  organizationUnitId: string,
): IdentityUser {
  return {
    id,
    email: `${id}@civicos.local`,
    name: id,
    roles,
    organizationUnitId,
  };
}

const commander = userRef(`e005-commander-${stamp}`, ['commander'], ORG);
const field = userRef(`e005-field-${stamp}`, ['field_officer'], ORG);
const outsiderCommander = userRef(`e005-lonely-${stamp}`, ['commander'], ORG);
const crossCommander = userRef(`e005-cross-${stamp}`, ['commander'], UPPER);
const dbUsers = [commander, field, outsiderCommander, crossCommander];

const trackedSubjects: string[] = [];
const trackedRecords: string[] = [];
const trackedReports: string[] = [];
// Global Role rows this run PROVABLY created. Role rows that already existed
// (detected via P2002 below) are left untouched — teardown deletes only these
// tracked IDs, never by name.
const ownedRoleIds: string[] = [];

describe.skipIf(!postgresEnabled)(
  'PS-E1-004 resident business regression',
  () => {
    beforeAll(async () => {
      await prisma.organizationUnit.createMany({
        data: [
          { id: ORG, name: 'E005 unit', level: 'commune', parentId: UPPER },
          { id: UPPER, name: 'E005 upper unit', level: 'district' },
        ],
      });
      for (const roleName of ['commander', 'field_officer']) {
        try {
          // Atomic create: tracks ONLY the role this run actually created.
          const created = await prisma.role.create({
            data: { name: roleName },
          });
          ownedRoleIds.push(created.id);
        } catch (error) {
          if (
            !(error instanceof Prisma.PrismaClientKnownRequestError) ||
            error.code !== 'P2002'
          ) {
            throw error;
          }
          // Unique-key race: a global role with this name already existed from
          // seed or a prior run; adopt it without recording ownership.
          await prisma.role.findUniqueOrThrow({ where: { name: roleName } });
        }
      }
      for (const user of dbUsers) {
        await prisma.user.create({
          data: {
            id: user.id,
            email: user.email,
            name: user.name,
            passwordHash: `e005-hash-${stamp}`,
            organizationUnitId: user.organizationUnitId,
          },
        });
        const role = await prisma.role.findUniqueOrThrow({
          where: { name: user.roles[0] },
        });
        await prisma.userRole.create({
          data: { userId: user.id, roleId: role.id },
        });
      }
    });

    afterAll(async () => {
      // Event/audit/approval cleanup is scoped to this run's unique actors,
      // tracked report IDs, and exact SLA instances this run created via its
      // tracked records (L-20261024-01: no broad deletes, no outbox
      // processing, checkpoints untouched). Outbox rows are removed before
      // their EventRecord rows; AuditEvent rows share the run-unique actor IDs.
      const actorIds = dbUsers.map((user) => user.id);
      // SlaStarted events are recorded with `actor: {}`, so their EventRecord
      // rows have a null actorId and actor-scoped selection misses them.
      // Select the exact SLA instance IDs created for this run's tracked
      // records, then the events whose aggregate is one of those exact
      // instance IDs — never by event type, date, status, or resource scope.
      const ownedSlaIds = trackedRecords.length
        ? await prisma.slaInstance.findMany({
            where: {
              resourceType: 'SubjectManagementRecord',
              resourceId: { in: trackedRecords },
            },
            select: { id: true },
          })
        : [];
      const slaEventIds = ownedSlaIds.length
        ? await prisma.eventRecord.findMany({
            where: {
              aggregateType: 'SlaInstance',
              aggregateId: { in: ownedSlaIds.map((sla) => sla.id) },
            },
            select: { eventId: true },
          })
        : [];
      const ownedEvents = await prisma.eventRecord.findMany({
        where: { actorId: { in: actorIds } },
        select: { eventId: true },
      });
      const ownedEventIds = [
        ...new Set(
          [...ownedEvents, ...slaEventIds].map((event) => event.eventId),
        ),
      ];
      if (ownedEventIds.length) {
        await prisma.outboxMessage.deleteMany({
          where: { eventId: { in: ownedEventIds } },
        });
        await prisma.eventRecord.deleteMany({
          where: { eventId: { in: ownedEventIds } },
        });
      }
      await prisma.auditEvent.deleteMany({
        where: { actorId: { in: actorIds } },
      });
      if (trackedReports.length) {
        await prisma.approval.deleteMany({
          where: {
            resourceType: 'ResidentMonthlyReport',
            resourceId: { in: trackedReports },
          },
        });
        await prisma.residentMonthlyReport.deleteMany({
          where: { id: { in: trackedReports } },
        });
      }
      if (trackedRecords.length) {
        await prisma.subjectManagementActivity.deleteMany({
          where: { recordId: { in: trackedRecords } },
        });
        await prisma.slaInstance.deleteMany({
          where: {
            resourceType: 'SubjectManagementRecord',
            resourceId: { in: trackedRecords },
          },
        });
        await prisma.assignment.deleteMany({
          where: { resourceId: { in: trackedRecords } },
        });
        await prisma.subjectManagementRecord.deleteMany({
          where: { id: { in: trackedRecords } },
        });
      }
      if (trackedSubjects.length) {
        await prisma.subject.deleteMany({
          where: { id: { in: trackedSubjects } },
        });
      }
      await prisma.user.deleteMany({
        where: { id: { in: dbUsers.map((user) => user.id) } },
      });
      // Role cleanup runs only after this run's users (and their UserRole
      // links, which cascade on user deletion) are gone, and deletes solely
      // IDs this setup created — never a name, never a pre-existing row. The
      // `users: { none: {} }` filter additionally spares any owned row a
      // concurrent writer has linked a user to by now.
      if (ownedRoleIds.length) {
        await prisma.role.deleteMany({
          where: {
            id: { in: ownedRoleIds },
            users: { none: {} },
          },
        });
      }
      await prisma.organizationUnit.deleteMany({
        where: { id: { in: [ORG, UPPER] } },
      });
    });

    it('denies same-unit commanders without an assignment', async () => {
      const subject = await registerSubject(
        {
          displayName: `E005 Narrow ${stamp}`,
          subjectType: 'temporary_resident',
        },
        commander,
      );
      trackedSubjects.push(subject.id);
      const record = await createManagementRecord(
        { subjectId: subject.id, purpose: 'temporary_resident' },
        commander,
      );
      trackedRecords.push(record.id);
      await assignRecord(record.id, { assigneeUserIds: [field.id] }, commander);
      const visible = await listSubjects(field, {});
      expect(visible.map((entry) => entry.id)).toContain(subject.id);
      await expect(
        getSubjectDetail(subject.id, outsiderCommander),
      ).rejects.toThrow('FORBIDDEN');
      await expect(getRecord(record.id, outsiderCommander)).rejects.toThrow(
        'FORBIDDEN',
      );
    });

    it('never returns encrypted or raw sensitiveProfile from register', async () => {
      const subject = (await registerSubject(
        {
          displayName: `E005 Masked ${stamp}`,
          subjectType: 'foreign_resident',
          sensitiveProfile: `secret-${stamp}`,
        },
        commander,
      )) as Record<string, unknown>;
      trackedSubjects.push(subject['id'] as string);
      expect(subject).not.toHaveProperty('sensitiveProfile');
      expect(subject).not.toHaveProperty('sensitiveIndex');
      const stored = await prisma.subject.findUniqueOrThrow({
        where: { id: subject['id'] as string },
      });
      expect(stored.sensitiveProfile ?? '').not.toContain(`secret-${stamp}`);
      const audit = await prisma.auditEvent.findFirst({
        where: {
          resourceType: 'Subject',
          resourceId: subject['id'] as string,
          operation: 'subject.registered',
        },
      });
      expect(audit?.actorId).toBe(commander.id);
    });

    it('bumps record version when a checkup refreshes nextCheck', async () => {
      const subject = await registerSubject(
        {
          displayName: `E005 Checkup ${stamp}`,
          subjectType: 'reintegration',
        },
        commander,
      );
      trackedSubjects.push(subject.id);
      const record = await createManagementRecord(
        { subjectId: subject.id, purpose: 'reintegration' },
        commander,
      );
      trackedRecords.push(record.id);
      await assignRecord(record.id, { assigneeUserIds: [field.id] }, commander);
      const occurredAt = new Date('2026-09-05T00:00:00.000Z').toISOString();
      await recordActivity(
        {
          recordId: record.id,
          activityType: 'checkup',
          occurredAt,
          content: 'Monthly visit completed',
          idempotencyKey: `e005:${stamp}:${randomUUID()}`,
        },
        field,
      );
      const refreshed = await prisma.subjectManagementRecord.findUniqueOrThrow({
        where: { id: record.id },
      });
      expect(refreshed.version).toBe(record.version + 1);
      expect((refreshed.nextCheckAt as Date).getTime()).toBeGreaterThan(
        new Date(occurredAt).getTime(),
      );
    });

    it('requires an explicit runtime target organization for transfer and send', async () => {
      const subject = await registerSubject(
        {
          displayName: `E005 Target ${stamp}`,
          subjectType: 'temporary_resident',
        },
        commander,
      );
      trackedSubjects.push(subject.id);
      const record = await createManagementRecord(
        { subjectId: subject.id, purpose: 'temporary_resident' },
        commander,
      );
      trackedRecords.push(record.id);
      await assignRecord(
        record.id,
        { assigneeUserIds: [commander.id] },
        commander,
      );
      await expect(transferRecord(record.id, '   ', commander)).rejects.toThrow(
        'TARGET_ORGANIZATION_REQUIRED',
      );
      await expect(
        transferRecord(record.id, UPPER, outsiderCommander),
      ).rejects.toThrow('FORBIDDEN');
      const transferred = await transferRecord(record.id, UPPER, commander);
      expect(transferred.assignedOrganizationId).toBe(UPPER);
      const report = await generateMonthlyReport(
        { organizationId: ORG, period: '2026-09' },
        commander,
      );
      trackedReports.push(report.id);
      const approved = await approveReport(report.id, commander);
      expect(approved.status).toBe('approved');
      await expect(sendReport(report.id, '  ', commander)).rejects.toThrow(
        'TARGET_ORGANIZATION_REQUIRED',
      );
      // DB-backed persistence evidence (PS-E1-004): the approved snapshot must
      // be physically persisted in PostgreSQL and must never change when the
      // same OU/period is regenerated or when the report is sent.
      const persisted = await prisma.residentMonthlyReport.findUniqueOrThrow({
        where: { id: report.id },
      });
      expect(persisted.status).toBe('approved');
      expect(persisted.snapshotPayload).toEqual(approved.snapshotPayload);
      expect(persisted.snapshotHash).toBeTruthy();
      expect(persisted.snapshotHash).toBe(approved.snapshotHash);
      const regenerated = await generateMonthlyReport(
        { organizationId: ORG, period: '2026-09' },
        commander,
      );
      expect(regenerated.id).toBe(report.id);
      expect(regenerated.status).toBe('approved');
      expect(regenerated.snapshotPayload).toEqual(persisted.snapshotPayload);
      expect(regenerated.snapshotHash).toBe(persisted.snapshotHash);
      const sent = await sendReport(report.id, UPPER, commander);
      expect(sent.status).toBe('sent');
      const afterSend = await prisma.residentMonthlyReport.findUniqueOrThrow({
        where: { id: report.id },
      });
      expect(afterSend.status).toBe('sent');
      expect(afterSend.snapshotPayload).toEqual(persisted.snapshotPayload);
      expect(afterSend.snapshotHash).toBe(persisted.snapshotHash);
    });

    it('scopes report previews to the requested organization unit', async () => {
      const report = await generateMonthlyReport(
        { organizationId: ORG, period: '2026-10' },
        commander,
      );
      trackedReports.push(report.id);
      const previews = await listReportPreviews(ORG, commander);
      expect(previews.length).toBeGreaterThan(0);
      for (const preview of previews) {
        expect(preview.organizationId).toBe(ORG);
      }
      await expect(listReportPreviews(ORG, crossCommander)).rejects.toThrow(
        'FORBIDDEN',
      );
    });
  },
);
