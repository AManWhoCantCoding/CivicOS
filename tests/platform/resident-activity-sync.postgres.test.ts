import { randomUUID } from 'node:crypto';

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { prisma } from '@/lib/prisma';
import { POST } from '@/app/api/sync/route';
import type { IdentityUser } from '@/modules/identity';
import {
  assignRecord,
  createManagementRecord,
  registerSubject,
} from '@/modules/residents';

// D-53: gated Postgres integration suite. The whole file is skipped unless
// RUN_DB_TESTS=1 is explicitly set, and it must only be enabled against a
// verified safe test database (D-53 DB identity confirmed before enabling).
const postgresEnabled = process.env.RUN_DB_TESTS === '1';

// Real route -> real assertAccess -> real recordActivity -> real OfflineCommand
// persistence. Only the session boundary (getCurrentUser) is replaced so the
// test can act as the seeded synthetic internal user; every authorization,
// service, and DB seam stays real.
const identityMock = vi.hoisted(() => ({ getCurrentUser: vi.fn() }));

vi.mock('@/modules/identity', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/modules/identity')>();
  return {
    ...mod,
    getCurrentUser: identityMock.getCurrentUser,
  };
});

const stamp = randomUUID().replace(/-/g, '');
const ORG = `t-syn-org-${stamp}`;
const OTHER = `t-syn-other-${stamp}`;

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

const commander = userRef(`t-syn-commander-${stamp}`, ['commander'], ORG);
const duty = userRef(`t-syn-duty-${stamp}`, ['duty_officer'], ORG);
const field = userRef(`t-syn-field-${stamp}`, ['field_officer'], ORG);
const outsider = userRef(`t-syn-outsider-${stamp}`, ['field_officer'], OTHER);
const dbUsers = [commander, duty, field, outsider];

const trackedSubjectIds: string[] = [];
const trackedRecordIds: string[] = [];
const trackedAssignmentIds: string[] = [];
const trackedCommandIds: string[] = [];
const createdRoleIds: string[] = [];

const occurredAt = '2026-10-22T08:00:00.000Z';
const activityContent = `t-syn visit note ${stamp}`;
const activityEvaluation = `t-syn evaluation ${stamp}`;

function activityPayload(overrides: Record<string, unknown> = {}) {
  return {
    activityType: 'visit',
    content: activityContent,
    evaluation: activityEvaluation,
    ...overrides,
  };
}

async function postResidentActivity(input: {
  clientCommandId: string;
  resourceId: string;
  baseVersion?: number;
  payload?: Record<string, unknown>;
}) {
  return POST(
    new Request('http://localhost/api/sync', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        clientCommandId: input.clientCommandId,
        commandType: 'resident.record_activity',
        resourceType: 'SubjectManagementRecord',
        resourceId: input.resourceId,
        occurredAt,
        payload: input.payload ?? activityPayload(),
        payloadVersion: 1,
        baseVersion: input.baseVersion,
      }),
    }),
  );
}

describe.skipIf(!postgresEnabled)(
  'D-53 gated resident.record_activity offline sync against Postgres',
  () => {
    let recordId = '';
    let recordVersion = 0;
    let assignmentId = '';

    beforeAll(async () => {
      await prisma.organizationUnit.createMany({
        data: [
          { id: ORG, name: 'Sync integration unit', level: 'commune' },
          { id: OTHER, name: 'Sync other unit', level: 'commune' },
        ],
      });
      for (const roleName of ['commander', 'duty_officer', 'field_officer']) {
        const priorRole = await prisma.role.findUnique({
          where: { name: roleName },
        });
        await prisma.role.upsert({
          where: { name: roleName },
          update: {},
          create: { name: roleName },
        });
        if (!priorRole) {
          const role = await prisma.role.findUniqueOrThrow({
            where: { name: roleName },
          });
          createdRoleIds.push(role.id);
        }
      }
      for (const user of dbUsers) {
        await prisma.user.create({
          data: {
            id: user.id,
            email: user.email,
            name: user.name,
            passwordHash: `t-syn-hash-${stamp}`,
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
      const subject = await registerSubject(
        {
          displayName: `T-SYN Subject ${stamp}`,
          subjectType: 'reintegration',
        },
        duty,
      );
      trackedSubjectIds.push(subject.id);
      const record = await createManagementRecord(
        { subjectId: subject.id, purpose: 'reintegration' },
        duty,
      );
      trackedRecordIds.push(record.id);
      recordId = record.id;
      recordVersion = (
        await prisma.subjectManagementRecord.findUniqueOrThrow({
          where: { id: record.id },
          select: { version: true },
        })
      ).version;
      const { assignments } = await assignRecord(
        record.id,
        { assigneeUserIds: [field.id] },
        commander,
      );
      assignmentId = assignments[0].id;
      trackedAssignmentIds.push(...assignments.map(({ id }) => id));
    });

    beforeEach(() => {
      identityMock.getCurrentUser.mockReset();
      identityMock.getCurrentUser.mockResolvedValue(field);
    });

    afterAll(async () => {
      if (!postgresEnabled) return;
      const slas = trackedRecordIds.length
        ? await prisma.slaInstance.findMany({
            where: {
              resourceType: 'SubjectManagementRecord',
              resourceId: { in: trackedRecordIds },
            },
            select: { id: true },
          })
        : [];
      const slaIds = slas.map(({ id }) => id);
      if (trackedCommandIds.length) {
        await prisma.offlineCommand.deleteMany({
          where: { clientCommandId: { in: trackedCommandIds } },
        });
      }
      if (trackedRecordIds.length) {
        await prisma.subjectManagementActivity.deleteMany({
          where: { recordId: { in: trackedRecordIds } },
        });
        await prisma.slaInstance.deleteMany({
          where: {
            resourceType: 'SubjectManagementRecord',
            resourceId: { in: trackedRecordIds },
          },
        });
        await prisma.assignment.deleteMany({
          where: {
            resourceType: 'SubjectManagementRecord',
            resourceId: { in: trackedRecordIds },
          },
        });
        await prisma.subjectManagementRecord.deleteMany({
          where: { id: { in: trackedRecordIds } },
        });
      }
      if (trackedSubjectIds.length) {
        await prisma.subject.deleteMany({
          where: { id: { in: trackedSubjectIds } },
        });
      }
      const actorIds = dbUsers.map(({ id }) => id);
      const auditIds =
        trackedSubjectIds.length || trackedRecordIds.length || actorIds.length
          ? (
              await prisma.auditEvent.findMany({
                where: {
                  OR: [
                    ...trackedSubjectIds.map((resourceId) => ({
                      resourceType: 'Subject',
                      resourceId,
                    })),
                    ...trackedRecordIds.map((resourceId) => ({
                      resourceType: 'SubjectManagementRecord',
                      resourceId,
                    })),
                    ...(actorIds.length ? [{ actorId: { in: actorIds } }] : []),
                  ],
                },
                select: { id: true },
              })
            ).map(({ id }) => id)
          : [];
      const events =
        trackedSubjectIds.length ||
        trackedRecordIds.length ||
        trackedAssignmentIds.length ||
        slaIds.length ||
        auditIds.length ||
        actorIds.length
          ? await prisma.eventRecord.findMany({
              where: {
                OR: [
                  ...trackedSubjectIds.map((aggregateId) => ({
                    aggregateType: 'Subject',
                    aggregateId,
                  })),
                  ...trackedRecordIds.map((aggregateId) => ({
                    aggregateType: 'SubjectManagementRecord',
                    aggregateId,
                  })),
                  ...trackedAssignmentIds.map((aggregateId) => ({
                    aggregateType: 'Assignment',
                    aggregateId,
                  })),
                  ...(slaIds.length
                    ? [
                        {
                          aggregateType: 'SlaInstance',
                          aggregateId: { in: slaIds },
                        },
                      ]
                    : []),
                  ...(auditIds.length
                    ? [
                        {
                          aggregateType: 'AuditEvent',
                          aggregateId: { in: auditIds },
                        },
                      ]
                    : []),
                  ...(actorIds.length ? [{ actorId: { in: actorIds } }] : []),
                ],
              },
              select: { eventId: true, aggregateType: true, aggregateId: true },
            })
          : [];
      const eventIds = events.map(({ eventId }) => eventId);
      if (eventIds.length) {
        await prisma.outboxMessage.deleteMany({
          where: { eventId: { in: eventIds } },
        });
        await prisma.eventRecord.deleteMany({
          where: { eventId: { in: eventIds } },
        });
        await prisma.projectionRecord.deleteMany({
          where: {
            OR: events.map(({ aggregateType, aggregateId }) => ({
              aggregateType,
              aggregateId,
            })),
          },
        });
      }
      if (auditIds.length)
        await prisma.auditEvent.deleteMany({ where: { id: { in: auditIds } } });
      if (trackedRecordIds.length)
        await prisma.notification.deleteMany({
          where: { resourceId: { in: trackedRecordIds } },
        });
      await prisma.user.deleteMany({
        where: { id: { in: dbUsers.map((user) => user.id) } },
      });
      if (createdRoleIds.length)
        await prisma.role.deleteMany({
          where: { id: { in: createdRoleIds }, users: { none: {} } },
        });
      await prisma.organizationUnit.deleteMany({
        where: { id: { in: [ORG, OTHER] } },
      });
    });

    it('syncs a resident activity through the real route, service, and Postgres persistence', async () => {
      const clientCommandId = `t-syn-device:${randomUUID()}`;
      trackedCommandIds.push(clientCommandId);

      const response = await postResidentActivity({
        clientCommandId,
        resourceId: recordId,
        baseVersion: recordVersion,
      });
      expect(response.status).toBe(200);
      const { command } = (await response.json()) as {
        command: {
          status: string;
          response: { result: Record<string, unknown> };
        };
      };
      expect(command.status).toBe('synced');
      // The synced response carries only the minimal activityId, never the
      // activity content or evaluation payload.
      expect(Object.keys(command.response)).toEqual(['result']);
      expect(Object.keys(command.response.result)).toEqual(['activityId']);
      expect(typeof command.response.result.activityId).toBe('string');
      expect(JSON.stringify(command.response)).not.toContain(activityContent);
      expect(JSON.stringify(command.response)).not.toContain(
        activityEvaluation,
      );

      const stored = await prisma.offlineCommand.findUniqueOrThrow({
        where: { clientCommandId },
      });
      expect(stored.status).toBe('synced');
      expect(stored.error).toBeNull();
      expect(stored.response).toEqual({
        result: { activityId: command.response.result.activityId },
      });

      const activity = await prisma.subjectManagementActivity.findUniqueOrThrow(
        { where: { idempotencyKey: clientCommandId } },
      );
      expect(activity.id).toBe(command.response.result.activityId);
      expect(activity.recordId).toBe(recordId);
      expect(activity.activityType).toBe('visit');
      expect(activity.content).toBe(activityContent);
      expect(activity.evaluation).toBe(activityEvaluation);
      expect(activity.actorId).toBe(field.id);

      expect(
        await prisma.eventRecord.count({
          where: {
            aggregateType: 'SubjectManagementRecord',
            aggregateId: recordId,
            eventType: 'SubjectActivityRecorded',
          },
        }),
      ).toBe(1);
      expect(
        await prisma.auditEvent.count({
          where: {
            resourceType: 'SubjectManagementRecord',
            resourceId: recordId,
            operation: 'subject_activity.recorded',
          },
        }),
      ).toBe(1);
    });

    it('replays a synced client command id without duplicating activity, event, or audit', async () => {
      const clientCommandId = `t-syn-device:${randomUUID()}`;
      trackedCommandIds.push(clientCommandId);
      const eventCountBefore = await prisma.eventRecord.count({
        where: {
          aggregateType: 'SubjectManagementRecord',
          aggregateId: recordId,
          eventType: 'SubjectActivityRecorded',
        },
      });
      const auditCountBefore = await prisma.auditEvent.count({
        where: {
          resourceType: 'SubjectManagementRecord',
          resourceId: recordId,
          operation: 'subject_activity.recorded',
        },
      });

      const first = await postResidentActivity({
        clientCommandId,
        resourceId: recordId,
        baseVersion: recordVersion,
      });
      expect(first.status).toBe(200);
      const firstBody = (await first.json()) as {
        command: { id: string; receivedAt: unknown; response: unknown };
      };

      const replay = await postResidentActivity({
        clientCommandId,
        resourceId: recordId,
        baseVersion: recordVersion,
      });
      expect(replay.status).toBe(200);
      const replayBody = (await replay.json()) as {
        command: { id: string; receivedAt: unknown; response: unknown };
      };
      expect(replayBody.command.id).toBe(firstBody.command.id);
      expect(replayBody.command.receivedAt).toEqual(
        firstBody.command.receivedAt,
      );
      expect(replayBody.command.response).toEqual(firstBody.command.response);

      const activityId = (
        firstBody.command.response as { result: { activityId: string } }
      ).result.activityId;

      expect(
        await prisma.subjectManagementActivity.count({
          where: { idempotencyKey: clientCommandId },
        }),
      ).toBe(1);
      expect(
        await prisma.eventRecord.count({
          where: {
            aggregateType: 'SubjectManagementRecord',
            aggregateId: recordId,
            eventType: 'SubjectActivityRecorded',
          },
        }),
      ).toBe(eventCountBefore + 1);
      expect(
        await prisma.auditEvent.count({
          where: {
            resourceType: 'SubjectManagementRecord',
            resourceId: recordId,
            operation: 'subject_activity.recorded',
          },
        }),
      ).toBe(auditCountBefore + 1);
      expect(
        await prisma.eventRecord.count({
          where: {
            aggregateType: 'SubjectManagementRecord',
            aggregateId: recordId,
            eventType: 'SubjectActivityRecorded',
            payload: { path: ['activityId'], equals: activityId },
          },
        }),
      ).toBe(1);
    });

    it('rejects a stale baseVersion before any activity mutation', async () => {
      const clientCommandId = `t-syn-device:${randomUUID()}`;
      // Tracked defensively; nothing should be persisted for this command.
      trackedCommandIds.push(clientCommandId);

      const response = await postResidentActivity({
        clientCommandId,
        resourceId: recordId,
        baseVersion: recordVersion + 1,
      });
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error: 'STALE_OFFLINE_COMMAND',
      });
      expect(
        await prisma.offlineCommand.findUnique({
          where: { clientCommandId },
        }),
      ).toBeNull();
      expect(
        await prisma.subjectManagementActivity.count({
          where: { idempotencyKey: clientCommandId },
        }),
      ).toBe(0);
    });

    it('blocks a wrong-OU actor before the command is accepted', async () => {
      identityMock.getCurrentUser.mockResolvedValueOnce(outsider);
      const clientCommandId = `t-syn-device:${randomUUID()}`;
      // Tracked defensively; nothing should be persisted for this command.
      trackedCommandIds.push(clientCommandId);

      const response = await postResidentActivity({
        clientCommandId,
        resourceId: recordId,
        baseVersion: recordVersion,
      });
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'FORBIDDEN' });
      expect(
        await prisma.offlineCommand.findUnique({
          where: { clientCommandId },
        }),
      ).toBeNull();
      expect(
        await prisma.subjectManagementActivity.count({
          where: { idempotencyKey: clientCommandId },
        }),
      ).toBe(0);
    });

    it('blocks writes while the exact resident_followup assignment is inactive', async () => {
      const clientCommandId = `t-syn-device:${randomUUID()}`;
      // Tracked defensively; nothing should be persisted for this command.
      trackedCommandIds.push(clientCommandId);

      await prisma.assignment.update({
        where: { id: assignmentId },
        data: { status: 'inactive' },
      });
      try {
        const response = await postResidentActivity({
          clientCommandId,
          resourceId: recordId,
          baseVersion: recordVersion,
        });
        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: 'FORBIDDEN' });
        expect(
          await prisma.offlineCommand.findUnique({
            where: { clientCommandId },
          }),
        ).toBeNull();
        expect(
          await prisma.subjectManagementActivity.count({
            where: { idempotencyKey: clientCommandId },
          }),
        ).toBe(0);
      } finally {
        await prisma.assignment.update({
          where: { id: assignmentId },
          data: { status: 'active' },
        });
      }
    });

    it('persists a deterministic invalid activity command as rejected, not failed, with no activity', async () => {
      const clientCommandId = `t-syn-device:${randomUUID()}`;
      trackedCommandIds.push(clientCommandId);

      const response = await postResidentActivity({
        clientCommandId,
        resourceId: recordId,
        baseVersion: recordVersion,
        payload: activityPayload({ content: '   ', evaluation: undefined }),
      });
      expect(response.status).toBe(409);
      const { command } = (await response.json()) as {
        command: { status: string; error: string | null };
      };
      expect(command.status).toBe('rejected');
      expect(command.error).toBe('CONTENT_REQUIRED');

      const stored = await prisma.offlineCommand.findUniqueOrThrow({
        where: { clientCommandId },
      });
      expect(stored.status).toBe('rejected');
      expect(stored.error).toBe('CONTENT_REQUIRED');
      expect(stored.response).toBeNull();
      expect(
        await prisma.subjectManagementActivity.count({
          where: { idempotencyKey: clientCommandId },
        }),
      ).toBe(0);
    });
  },
);
