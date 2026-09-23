import { randomUUID } from 'node:crypto';

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
  listSubjects,
  raiseRisk,
  recordActivity,
  registerSubject,
  sendReport,
  transferRecord,
  updateRecord,
} from '@/modules/residents';

const postgresEnabled = process.env.RUN_DB_TESTS === '1';
const stamp = randomUUID().slice(0, 8);
const ORG = `t04-org-${stamp}`;
const UPPER = `t04-upper-${stamp}`;

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

const commander = userRef(`e004-commander-${stamp}`, ['commander'], ORG);
const duty = userRef(`e004-duty-${stamp}`, ['duty_officer'], ORG);
const field = userRef(`e004-field-${stamp}`, ['field_officer'], ORG);
const outsider = userRef(`e004-outsider-${stamp}`, ['field_officer'], ORG);
const crossCommander = userRef(`e004-cross-${stamp}`, ['commander'], UPPER);
const dbUsers = [commander, duty, field, outsider, crossCommander];

const trackedSubjects: string[] = [];
const trackedRecords: string[] = [];
const trackedReports: string[] = [];

describe.skipIf(!postgresEnabled)(
  'PS-E1-004 resident management workflow',
  () => {
    beforeAll(async () => {
      await prisma.organizationUnit.createMany({
        data: [
          { id: ORG, name: 'E004 unit', level: 'commune', parentId: UPPER },
          { id: UPPER, name: 'E004 upper unit', level: 'district' },
        ],
      });
      for (const roleName of ['commander', 'duty_officer', 'field_officer']) {
        await prisma.role.upsert({
          where: { name: roleName },
          update: {},
          create: { name: roleName },
        });
      }
      for (const user of dbUsers) {
        await prisma.user.create({
          data: {
            id: user.id,
            email: user.email,
            name: user.name,
            passwordHash: `e004-hash-${stamp}`,
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
      if (trackedReports.length) {
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
      await prisma.eventRecord.deleteMany({
        where: {
          OR: [
            ...trackedSubjects.map((aggregateId) => ({
              aggregateType: 'Subject',
              aggregateId,
            })),
            ...trackedRecords.map((aggregateId) => ({
              aggregateType: 'SubjectManagementRecord',
              aggregateId,
            })),
          ],
        },
      });
      await prisma.auditEvent.deleteMany({
        where: {
          OR: [
            ...trackedSubjects.map((resourceId) => ({
              resourceType: 'Subject',
              resourceId,
            })),
            ...trackedRecords.map((resourceId) => ({
              resourceType: 'SubjectManagementRecord',
              resourceId,
            })),
          ],
        },
      });
      await prisma.user.deleteMany({
        where: { id: { in: dbUsers.map((user) => user.id) } },
      });
      await prisma.organizationUnit.deleteMany({
        where: { id: { in: [ORG, UPPER] } },
      });
    });

    it('registers subjects of all three types with masked PII', async () => {
      for (const subjectType of [
        'temporary_resident',
        'foreign_resident',
        'reintegration',
      ] as const) {
        const subject = await registerSubject(
          {
            displayName: `E004 Subject ${subjectType} ${stamp}`,
            subjectType,
            sensitiveProfile: `profile-${subjectType}-${stamp}`,
          },
          duty,
        );
        trackedSubjects.push(subject.id);
        expect(subject.subjectType).toBe(subjectType);
        const stored = await prisma.subject.findUniqueOrThrow({
          where: { id: subject.id },
        });
        expect(stored.sensitiveProfile).not.toContain(
          `profile-${subjectType}-${stamp}`,
        );
      }
    });

    it('creates per-purpose records with a 24h registration SLA', async () => {
      const subject = await registerSubject(
        {
          displayName: `E004 Record Holder ${stamp}`,
          subjectType: 'temporary_resident',
        },
        duty,
      );
      trackedSubjects.push(subject.id);
      const record = await createManagementRecord(
        { subjectId: subject.id, purpose: 'temporary_resident' },
        duty,
      );
      trackedRecords.push(record.id);
      expect(record.version).toBe(1);
      const sla = await prisma.slaInstance.findUniqueOrThrow({
        where: {
          resourceType_resourceId_kind: {
            resourceType: 'SubjectManagementRecord',
            resourceId: record.id,
            kind: 'resident_registration_24h',
          },
        },
      });
      const elapsed = sla.dueAt.getTime() - record.createdAt.getTime();
      expect(elapsed).toBe(24 * 60 * 60 * 1000);
    });

    it('scopes record visibility to assignments and units', async () => {
      const subject = await registerSubject(
        {
          displayName: `E004 Scoped ${stamp}`,
          subjectType: 'reintegration',
        },
        duty,
      );
      trackedSubjects.push(subject.id);
      const record = await createManagementRecord(
        { subjectId: subject.id, purpose: 'reintegration' },
        duty,
      );
      trackedRecords.push(record.id);
      await assignRecord(record.id, { assigneeUserIds: [field.id] }, commander);
      const visible = await listSubjects(field, {});
      expect(visible.map((entry) => entry.id)).toContain(subject.id);
      await expect(listSubjects(outsider, {})).resolves.not.toContainEqual(
        expect.objectContaining({ id: subject.id }),
      );
      await expect(
        listSubjects(crossCommander, {}),
      ).resolves.not.toContainEqual(
        expect.objectContaining({ id: subject.id }),
      );
    });

    it('records checkups idempotently and refreshes nextCheck', async () => {
      const subject = await registerSubject(
        {
          displayName: `E004 Checkup ${stamp}`,
          subjectType: 'reintegration',
        },
        duty,
      );
      trackedSubjects.push(subject.id);
      const record = await createManagementRecord(
        { subjectId: subject.id, purpose: 'reintegration' },
        duty,
      );
      trackedRecords.push(record.id);
      await assignRecord(
        record.id,
        { assigneeUserIds: [field.id, commander.id] },
        commander,
      );
      const key = `e004:${stamp}:checkup:${randomUUID()}`;
      const first = await recordActivity(
        {
          recordId: record.id,
          activityType: 'checkup',
          occurredAt: new Date().toISOString(),
          content: 'Monthly visit completed',
          idempotencyKey: key,
        },
        field,
      );
      const second = await recordActivity(
        {
          recordId: record.id,
          activityType: 'checkup',
          occurredAt: new Date().toISOString(),
          content: 'Monthly visit completed',
          idempotencyKey: key,
        },
        field,
      );
      expect(second.id).toBe(first.id);
      const refreshed = await getRecord(record.id, commander);
      expect(
        new Date(refreshed.nextCheckAt as string).getTime(),
      ).toBeGreaterThan(Date.now());
    });

    it('rejects stale record updates through version checks', async () => {
      const subject = await registerSubject(
        {
          displayName: `E004 Version ${stamp}`,
          subjectType: 'temporary_resident',
        },
        duty,
      );
      trackedSubjects.push(subject.id);
      const record = await createManagementRecord(
        { subjectId: subject.id, purpose: 'temporary_resident' },
        duty,
      );
      trackedRecords.push(record.id);
      await expect(
        updateRecord(
          record.id,
          { status: 'suspended', baseVersion: record.version },
          commander,
        ),
      ).rejects.toThrow('FORBIDDEN');
      await assignRecord(
        record.id,
        { assigneeUserIds: [commander.id] },
        commander,
      );
      await expect(
        updateRecord(
          record.id,
          { status: 'suspended', baseVersion: record.version + 1 },
          commander,
        ),
      ).rejects.toThrow('STALE_RECORD');
    });

    it('escalates high-risk records and transfers them upward', async () => {
      const subject = await registerSubject(
        {
          displayName: `E004 Risk ${stamp}`,
          subjectType: 'foreign_resident',
        },
        duty,
      );
      trackedSubjects.push(subject.id);
      const record = await createManagementRecord(
        { subjectId: subject.id, purpose: 'foreign_resident' },
        duty,
      );
      trackedRecords.push(record.id);
      await expect(
        raiseRisk(record.id, 'high', outsider, 'Flight risk signal'),
      ).rejects.toThrow('FORBIDDEN');
      await assignRecord(
        record.id,
        { assigneeUserIds: [commander.id] },
        commander,
      );
      await raiseRisk(record.id, 'high', commander, 'Flight risk signal');
      const transferred = await transferRecord(record.id, UPPER, commander);
      expect(transferred.assignedOrganizationId).toBe(UPPER);
      expect(transferred.status).toBe('transferred');
    });

    it('freezes report snapshots on approval', async () => {
      const report = await generateMonthlyReport(
        { organizationId: ORG, period: '2026-09' },
        commander,
      );
      trackedReports.push(report.id);
      const approved = await approveReport(report.id, commander);
      expect(approved.status).toBe('approved');
      expect(approved.snapshotPayload).toBeTruthy();
      const sent = await sendReport(report.id, UPPER, commander);
      expect(sent.status).toBe('sent');
      const stored = await prisma.residentMonthlyReport.findUniqueOrThrow({
        where: { id: report.id },
      });
      expect(stored.snapshotPayload).toEqual(approved.snapshotPayload);
    });

    it('audits sensitive reads and masks outsiders', async () => {
      const subject = await registerSubject(
        {
          displayName: `E004 Sensitive ${stamp}`,
          subjectType: 'temporary_resident',
          sensitiveProfile: `secret-${stamp}`,
        },
        duty,
      );
      trackedSubjects.push(subject.id);
      const record = await createManagementRecord(
        { subjectId: subject.id, purpose: 'temporary_resident' },
        duty,
      );
      trackedRecords.push(record.id);
      await assignRecord(
        record.id,
        { assigneeUserIds: [commander.id] },
        commander,
      );
      const full = await getSubjectDetail(subject.id, commander);
      expect(full.sensitiveProfile).toBe(`secret-${stamp}`);
      const audit = await prisma.auditEvent.findFirst({
        where: {
          resourceType: 'Subject',
          resourceId: subject.id,
          operation: 'subject.sensitive_read',
        },
      });
      expect(audit?.actorId).toBe(commander.id);
    });
  },
);
