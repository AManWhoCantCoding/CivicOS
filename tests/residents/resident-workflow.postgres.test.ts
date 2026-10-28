import { createHash, randomUUID } from 'node:crypto';

import { Prisma } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { GET as managementRecordGET } from '@/app/api/residents/[subjectId]/management-records/[recordId]/route';
import { GET as subjectDetailGET } from '@/app/api/residents/[subjectId]/route';

import { prisma } from '@/lib/prisma';
import type { IdentityUser } from '@/modules/identity';
import { createSession, sessionCookieName } from '@/modules/identity';
import { cookies } from 'next/headers';
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

vi.mock('next/headers', () => ({ cookies: vi.fn() }));

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
// Global Role rows this run PROVABLY created. Role rows that already existed
// (detected via P2002 below) are left untouched — teardown deletes only these
// tracked IDs by exact ID, never by name.
const ownedRoleIds: string[] = [];

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
      // Cleanup is scoped to exact values this run created: run-unique actor
      // IDs, tracked subject/record/report resource IDs, and the exact SLA
      // instances created for this run's tracked records. No name, status,
      // date, or resourceType-only filters; outbox rows are deleted, never
      // processed; projections and checkpoints are untouched.
      const actorIds = dbUsers.map(({ id }) => id);
      const assignmentIds = trackedRecords.length
        ? (
            await prisma.assignment.findMany({
              where: {
                resourceType: 'SubjectManagementRecord',
                resourceId: { in: trackedRecords },
              },
              select: { id: true },
            })
          ).map(({ id }) => id)
        : [];
      const slaInstanceIds = trackedRecords.length
        ? (
            await prisma.slaInstance.findMany({
              where: {
                resourceType: 'SubjectManagementRecord',
                resourceId: { in: trackedRecords },
              },
              select: { id: true },
            })
          ).map(({ id }) => id)
        : [];
      // AuditEvent rows written for this run's subjects, records, and reports;
      // selected by exact resource-ID pairs per aggregate type.
      const auditResourceClauses = [
        ...trackedSubjects.map((resourceId) => ({
          resourceType: 'Subject',
          resourceId,
        })),
        ...trackedRecords.map((resourceId) => ({
          resourceType: 'SubjectManagementRecord',
          resourceId,
        })),
        ...trackedReports.map((resourceId) => ({
          resourceType: 'ResidentMonthlyReport',
          resourceId,
        })),
      ];
      const auditEvents = auditResourceClauses.length
        ? await prisma.auditEvent.findMany({
            where: { OR: auditResourceClauses },
            select: { id: true },
          })
        : [];
      const auditEventIds = auditEvents.map(({ id }) => id);
      // SlaStarted events are recorded with `actor: {}`, so their EventRecord
      // rows have a null actorId and actor-scoped selection misses them; they
      // are selected by exact SLA instance ID instead. Every AuditEventRecorded
      // event this run produced carries a run-unique actorId; the AuditEvent
      // aggregate-ID clause additionally pins any event to the audit rows
      // collected above. Exact event IDs are deduped before deletion.
      const ownedEvents = await prisma.eventRecord.findMany({
        where: {
          OR: [
            { actorId: { in: actorIds } },
            ...(slaInstanceIds.length
              ? [
                  {
                    aggregateType: 'SlaInstance',
                    aggregateId: { in: slaInstanceIds },
                  },
                ]
              : []),
            ...(auditEventIds.length
              ? [
                  {
                    aggregateType: 'AuditEvent',
                    aggregateId: { in: auditEventIds },
                  },
                ]
              : []),
          ],
        },
        select: { eventId: true },
      });
      const ownedEventIds = [
        ...new Set([...ownedEvents].map(({ eventId }) => eventId)),
      ];
      if (ownedEventIds.length) {
        // Outbox rows go before their EventRecord rows so the event FK is
        // never violated; this only deletes rows, it never drains the queue.
        await prisma.outboxMessage.deleteMany({
          where: { eventId: { in: ownedEventIds } },
        });
        await prisma.eventRecord.deleteMany({
          where: { eventId: { in: ownedEventIds } },
        });
      }
      if (auditEventIds.length) {
        await prisma.auditEvent.deleteMany({
          where: { id: { in: auditEventIds } },
        });
      }
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
        if (slaInstanceIds.length) {
          await prisma.slaInstance.deleteMany({
            where: { id: { in: slaInstanceIds } },
          });
        }
        if (assignmentIds.length) {
          await prisma.assignment.deleteMany({
            where: { id: { in: assignmentIds } },
          });
        }
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
        where: { id: { in: dbUsers.map(({ id }) => id) } },
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

    it('persists foreign arrival time in SLA, event, and audit evidence', async () => {
      const arrivalAt = new Date('2026-09-30T16:00:00.000Z');
      const subject = await registerSubject(
        {
          displayName: `E004 Foreign ${stamp}`,
          subjectType: 'foreign_resident',
        },
        duty,
      );
      trackedSubjects.push(subject.id);
      const record = await createManagementRecord(
        {
          subjectId: subject.id,
          purpose: 'foreign_resident',
          arrivalAt: arrivalAt.toISOString(),
        },
        duty,
      );
      trackedRecords.push(record.id);
      for (const [kind, duration] of [
        ['resident_registration_24h', 24 * 60 * 60 * 1000],
        ['foreign_same_day_report', 24 * 60 * 60 * 1000],
      ] as const) {
        const sla = await prisma.slaInstance.findUniqueOrThrow({
          where: {
            resourceType_resourceId_kind: {
              resourceType: 'SubjectManagementRecord',
              resourceId: record.id,
              kind,
            },
          },
        });
        expect(sla.dueAt.getTime()).toBe(arrivalAt.getTime() + duration);
      }
      const event = await prisma.eventRecord.findFirstOrThrow({
        where: {
          aggregateType: 'SubjectManagementRecord',
          aggregateId: record.id,
          eventType: 'SubjectManagementRecordCreated',
        },
      });
      expect((event.payload as { arrivalAt?: string }).arrivalAt).toBe(
        arrivalAt.toISOString(),
      );
      expect(event.occurredAt.getTime()).toBe(record.createdAt.getTime());
      const audit = await prisma.auditEvent.findFirstOrThrow({
        where: {
          resourceType: 'SubjectManagementRecord',
          resourceId: record.id,
          operation: 'subject_record.created',
        },
      });
      expect((audit.metadata as { arrivalAt?: string }).arrivalAt).toBe(
        arrivalAt.toISOString(),
      );
    });

    it('sets the initial reintegration check and SLA to one creation-time deadline', async () => {
      const subject = await registerSubject(
        {
          displayName: `E004 Reintegration ${stamp}`,
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
      const sla = await prisma.slaInstance.findUniqueOrThrow({
        where: {
          resourceType_resourceId_kind: {
            resourceType: 'SubjectManagementRecord',
            resourceId: record.id,
            kind: 'resident_monthly_checkup',
          },
        },
      });
      expect(record.nextCheckAt?.getTime()).toBe(sla.dueAt.getTime());
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
      const auditWhere = {
        resourceType: 'SubjectManagementRecord',
        resourceId: record.id,
        operation: 'subject_record.read',
      };
      const tokens: string[] = [];
      try {
        const assignedSession = await createSession(field.id);
        tokens.push(assignedSession.token);
        vi.mocked(cookies).mockResolvedValue({
          get: (name: string) =>
            name === sessionCookieName
              ? { value: assignedSession.token }
              : undefined,
          delete: () => {},
        } as never);
        const assignedResponse = await managementRecordGET(
          new Request(
            `http://localhost/api/residents/${subject.id}/management-records/${record.id}`,
          ),
          {
            params: Promise.resolve({
              subjectId: subject.id,
              recordId: record.id,
            }),
          },
        );
        expect(assignedResponse.status).toBe(200);
        const assignedBody = (await assignedResponse.json()) as {
          record?: { subject?: { displayName?: string } };
        };
        expect(assignedBody.record?.subject?.displayName).not.toBe(
          `E004 Scoped ${stamp}`,
        );
        const assignedAuditCount = await prisma.auditEvent.count({
          where: { ...auditWhere, actorId: field.id },
        });
        expect(assignedAuditCount).toBe(1);

        const outsiderSession = await createSession(outsider.id);
        tokens.push(outsiderSession.token);
        vi.mocked(cookies).mockResolvedValue({
          get: (name: string) =>
            name === sessionCookieName
              ? { value: outsiderSession.token }
              : undefined,
          delete: () => {},
        } as never);
        const outsiderResponse = await managementRecordGET(
          new Request(
            `http://localhost/api/residents/${subject.id}/management-records/${record.id}`,
          ),
          {
            params: Promise.resolve({
              subjectId: subject.id,
              recordId: record.id,
            }),
          },
        );
        expect(outsiderResponse.status).toBe(403);
        await expect(
          prisma.auditEvent.count({ where: auditWhere }),
        ).resolves.toBe(assignedAuditCount);
      } finally {
        await prisma.session.deleteMany({
          where: {
            tokenHash: {
              in: tokens.map((token) =>
                createHash('sha256').update(token).digest('hex'),
              ),
            },
          },
        });
      }
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
          occurredAt: '2026-09-30T16:00:00.000Z',
          content: 'Monthly visit completed',
          idempotencyKey: key,
        },
        field,
      );
      const second = await recordActivity(
        {
          recordId: record.id,
          activityType: 'checkup',
          occurredAt: '2026-09-30T16:00:00.000Z',
          content: 'Monthly visit completed',
          idempotencyKey: key,
        },
        field,
      );
      expect(second.id).toBe(first.id);
      const refreshed = await getRecord(record.id, commander);
      const expectedDueAt = new Date('2026-10-31T17:00:00.000Z');
      expect(new Date(refreshed.nextCheckAt as string).getTime()).toBe(
        expectedDueAt.getTime(),
      );
      const checkupSla = await prisma.slaInstance.findUniqueOrThrow({
        where: {
          resourceType_resourceId_kind: {
            resourceType: 'SubjectManagementRecord',
            resourceId: record.id,
            kind: 'resident_monthly_checkup',
          },
        },
      });
      expect(checkupSla.dueAt.getTime()).toBe(expectedDueAt.getTime());
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
        {
          subjectId: subject.id,
          purpose: 'foreign_resident',
          arrivalAt: '2026-09-30T16:00:00.000Z',
        },
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

    it('protects sensitive subject details through the API handler', async () => {
      const sensitiveProfile = `api-secret-${stamp}-${randomUUID()}`;
      const subject = await registerSubject(
        {
          displayName: `E004 API Sensitive ${stamp}`,
          subjectType: 'temporary_resident',
          sensitiveProfile,
        },
        duty,
      );
      trackedSubjects.push(subject.id);
      const record = await createManagementRecord(
        { subjectId: subject.id, purpose: 'temporary_resident' },
        duty,
      );
      trackedRecords.push(record.id);
      await assignRecord(record.id, { assigneeUserIds: [field.id] }, commander);

      const auditWhere = {
        resourceType: 'Subject',
        resourceId: subject.id,
        operation: 'subject.sensitive_read',
      };
      const url = `http://localhost/api/residents/${subject.id}`;
      const context = { params: Promise.resolve({ subjectId: subject.id }) };
      vi.mocked(cookies).mockResolvedValue({ get: () => undefined } as never);
      const anonymousResponse = await subjectDetailGET(
        new Request(url),
        context,
      );
      expect(anonymousResponse.status).toBe(401);
      expect(await prisma.auditEvent.count({ where: auditWhere })).toBe(0);

      const tokens: string[] = [];
      try {
        const assignedSession = await createSession(field.id);
        tokens.push(assignedSession.token);
        vi.mocked(cookies).mockResolvedValue({
          get: (name: string) =>
            name === sessionCookieName
              ? { value: assignedSession.token }
              : undefined,
        } as never);
        const assignedResponse = await subjectDetailGET(
          new Request(url),
          context,
        );
        expect(assignedResponse.status).toBe(200);
        const assignedBody = (await assignedResponse.json()) as {
          subject: { masked: boolean; sensitiveProfile: string | null };
        };
        expect(assignedBody.subject.masked).toBe(false);
        expect(assignedBody.subject.sensitiveProfile).toBe(sensitiveProfile);
        const auditWhereWithActor = { ...auditWhere, actorId: field.id };
        expect(
          await prisma.auditEvent.count({ where: auditWhereWithActor }),
        ).toBe(1);

        const outsiderSession = await createSession(outsider.id);
        tokens.push(outsiderSession.token);
        vi.mocked(cookies).mockResolvedValue({
          get: (name: string) =>
            name === sessionCookieName
              ? { value: outsiderSession.token }
              : undefined,
        } as never);
        const outsiderResponse = await subjectDetailGET(
          new Request(url),
          context,
        );
        expect(outsiderResponse.status).toBe(403);
        expect(await prisma.auditEvent.count({ where: auditWhere })).toBe(1);
      } finally {
        await prisma.session.deleteMany({
          where: {
            tokenHash: {
              in: tokens.map((token) =>
                createHash('sha256').update(token).digest('hex'),
              ),
            },
          },
        });
      }
    });
  },
);
