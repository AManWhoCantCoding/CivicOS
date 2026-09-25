import { createHash, randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/prisma';
import * as identity from '@/modules/identity';
import type { IdentityUser } from '@/modules/identity';
import {
  authenticateLocal,
  createAssignments,
  createIdentityUser,
  createSession,
  deleteCurrentSession,
  ensureDevelopmentUsers,
  getCurrentUser,
  revokeAssignment,
  sessionCookieName,
} from '@/modules/identity';
import { cookies } from 'next/headers';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));

const postgresEnabled = process.env.RUN_DB_TESTS === '1';
const stamp = randomUUID().slice(0, 8);

function mockSessionCookie(token?: string) {
  const deleted: string[] = [];
  vi.mocked(cookies).mockResolvedValue({
    get: (name: string) =>
      token && name === sessionCookieName ? { value: token } : undefined,
    delete: (name: string) => {
      deleted.push(name);
    },
  } as never);
  return deleted;
}

describe('identity public entry point', () => {
  it('exposes only the documented domain surface without database internals', () => {
    expect(Object.keys(identity).sort()).toEqual(
      [
        'ASSIGNMENT_TASKS',
        'ROLE_BASE_CAPABILITIES',
        'ROLE_CATALOG',
        'TASK_ALLOWED_ROLES',
        'TASK_CAPABILITIES',
        'assertAccess',
        'authenticateLocal',
        'blindIndex',
        'canAccess',
        'canApprove',
        'canAssign',
        'canMutate',
        'canRead',
        'canViewSensitive',
        'carryActiveAssignments',
        'createAssignments',
        'createIdentityUser',
        'createSession',
        'decryptSensitive',
        'deleteCurrentSession',
        'encryptSensitive',
        'ensureDevelopmentUsers',
        'evaluatePolicy',
        'getCurrentUser',
        'grantAssignments',
        'hasActiveAssignmentForRead',
        'isTaskCompatibleWithRoles',
        'listAssignments',
        'listIdentityUsers',
        'listOrganizationUnits',
        'recordAudit',
        'requireMobileReadAccess',
        'requireRole',
        'revokeAssignment',
        'sessionCookieName',
      ].sort(),
    );
    expect('prisma' in identity).toBe(false);
  });
});

describe.skipIf(!postgresEnabled)(
  'identity development seed PostgreSQL seam',
  () => {
    it('seeds commander, assigned-candidate and unassigned users with a superior unit', async () => {
      await ensureDevelopmentUsers();

      const commander = await prisma.user.findUniqueOrThrow({
        where: { email: 'truong@civicos.local' },
        include: { roles: { include: { role: true } } },
      });
      expect(commander.active).toBe(true);
      expect(commander.roles.map(({ role }) => role.name)).toContain(
        'commander',
      );
      expect(commander.organizationUnitId).toBe('unit-nghia-tru');

      const assigned = await prisma.user.findUniqueOrThrow({
        where: { email: 'hientruong@civicos.local' },
      });
      expect(assigned.active).toBe(true);
      expect(assigned.organizationUnitId).toBe('unit-nghia-tru');

      const unassigned = await prisma.user.findUniqueOrThrow({
        where: { email: 'khongduocphancong@civicos.local' },
        include: { roles: { include: { role: true } } },
      });
      expect(unassigned.active).toBe(true);
      expect(unassigned.roles.map(({ role }) => role.name)).toContain(
        'field_officer',
      );

      const unit = await prisma.organizationUnit.findUniqueOrThrow({
        where: { id: 'unit-nghia-tru' },
      });
      const superior = await prisma.organizationUnit.findUniqueOrThrow({
        where: { id: 'unit-cap-tren' },
      });
      expect(superior.level).toBe('district');
      expect(superior.parentId).toBeNull();
      expect(unit.parentId).toBe(superior.id);
    });

    it('keeps development credentials out of plaintext without real secrets', async () => {
      const users = await prisma.user.findMany({
        where: { email: { endsWith: '@civicos.local' } },
        select: { email: true, passwordHash: true },
      });
      expect(users.length).toBeGreaterThan(0);
      for (const user of users) {
        expect(user.passwordHash).not.toBeNull();
        expect(user.passwordHash).not.toContain('civicos-dev');
      }
    });

    it('authenticates seeded users through the local provider seam', async () => {
      const commander = await authenticateLocal(
        'truong@civicos.local',
        'civicos-dev',
      );
      expect(commander?.roles).toContain('commander');
      await expect(
        authenticateLocal('truong@civicos.local', 'wrong-password'),
      ).resolves.toBeNull();
      await expect(
        authenticateLocal('unknown@civicos.local', 'civicos-dev'),
      ).resolves.toBeNull();
    });
  },
);

describe.skipIf(!postgresEnabled)(
  'identity session persistence PostgreSQL seam',
  () => {
    const userId = `t02-session-user-${stamp}`;

    afterAll(async () => {
      await prisma.session.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
      await prisma.organizationUnit.deleteMany({
        where: { id: `t02-session-org-${stamp}` },
      });
    });

    it('stores only a token hash with a future expiration', async () => {
      await prisma.organizationUnit.create({
        data: {
          id: `t02-session-org-${stamp}`,
          name: 'T02 session unit',
          level: 'commune',
        },
      });
      await prisma.user.create({
        data: {
          id: userId,
          email: `${userId}@civicos.local`,
          name: 'T02 session user',
          passwordHash: `t02-hash-${stamp}`,
          organizationUnitId: `t02-session-org-${stamp}`,
        },
      });

      const session = await createSession(userId);
      const expectedHash = createHash('sha256')
        .update(session.token)
        .digest('hex');
      const stored = await prisma.session.findUniqueOrThrow({
        where: { tokenHash: expectedHash },
      });
      expect(stored.userId).toBe(userId);
      expect(stored.tokenHash).toHaveLength(64);
      expect(JSON.stringify(stored)).not.toContain(session.token);
      expect(stored.expiresAt.getTime()).toBeGreaterThan(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      );

      mockSessionCookie(session.token);
      const current = await getCurrentUser();
      expect(current?.id).toBe(userId);
    });

    it('rejects expired and unknown sessions and clears state on logout', async () => {
      const session = await createSession(userId);
      await prisma.session.update({
        where: {
          tokenHash: createHash('sha256').update(session.token).digest('hex'),
        },
        data: { expiresAt: new Date(Date.now() - 60_000) },
      });
      mockSessionCookie(session.token);
      await expect(getCurrentUser()).resolves.toBeNull();

      mockSessionCookie(`t02-unknown-token-${stamp}`);
      await expect(getCurrentUser()).resolves.toBeNull();

      mockSessionCookie();
      await expect(getCurrentUser()).resolves.toBeNull();

      const active = await createSession(userId);
      const activeHash = createHash('sha256')
        .update(active.token)
        .digest('hex');
      const deleted = mockSessionCookie(active.token);
      await deleteCurrentSession();
      await expect(
        prisma.session.findUnique({ where: { tokenHash: activeHash } }),
      ).resolves.toBeNull();
      expect(deleted).toContain(sessionCookieName);
    });
  },
);

describe.skipIf(!postgresEnabled)(
  'identity validation and error shape PostgreSQL seam',
  () => {
    const orgId = `t02-validation-org-${stamp}`;
    const commanderId = `t02-validation-commander-${stamp}`;
    const memberId = `t02-validation-member-${stamp}`;
    const resourceId = `t02-validation-record-${stamp}`;
    let assignmentId = '';

    afterAll(async () => {
      const audits = await prisma.auditEvent.findMany({
        where: { resourceId },
        select: { id: true },
      });
      const auditIds = audits.map(({ id }) => id);
      if (auditIds.length) {
        const events = await prisma.eventRecord.findMany({
          where: { aggregateType: 'AuditEvent', aggregateId: { in: auditIds } },
          select: { eventId: true },
        });
        const eventIds = events.map(({ eventId }) => eventId);
        if (eventIds.length) {
          await prisma.outboxMessage.deleteMany({
            where: { eventId: { in: eventIds } },
          });
          await prisma.eventRecord.deleteMany({
            where: { eventId: { in: eventIds } },
          });
        }
        await prisma.auditEvent.deleteMany({ where: { id: { in: auditIds } } });
      }
      const assignmentEvents = assignmentId
        ? await prisma.eventRecord.findMany({
            where: { aggregateType: 'Assignment', aggregateId: assignmentId },
            select: { eventId: true },
          })
        : [];
      const assignmentEventIds = assignmentEvents.map(({ eventId }) => eventId);
      if (assignmentEventIds.length) {
        await prisma.outboxMessage.deleteMany({
          where: { eventId: { in: assignmentEventIds } },
        });
        await prisma.eventRecord.deleteMany({
          where: { eventId: { in: assignmentEventIds } },
        });
      }
      await prisma.assignment.deleteMany({ where: { resourceId } });
      await prisma.session.deleteMany({
        where: { userId: { in: [commanderId, memberId] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [commanderId, memberId] } },
      });
      await prisma.organizationUnit.deleteMany({ where: { id: orgId } });
    });

    it('rejects invalid assignment, revocation and user payloads with stable codes', async () => {
      await prisma.organizationUnit.create({
        data: { id: orgId, name: 'T02 validation unit', level: 'commune' },
      });
      await prisma.role.upsert({
        where: { name: 'commander' },
        update: {},
        create: { name: 'commander' },
      });
      await prisma.role.upsert({
        where: { name: 'field_officer' },
        update: {},
        create: { name: 'field_officer' },
      });
      for (const [id, roleName] of [
        [commanderId, 'commander'],
        [memberId, 'field_officer'],
      ] as const) {
        const created = await prisma.user.create({
          data: {
            id,
            email: `${id}@civicos.local`,
            name: id,
            passwordHash: `t02-hash-${stamp}`,
            organizationUnitId: orgId,
          },
        });
        const role = await prisma.role.findUniqueOrThrow({
          where: { name: roleName },
        });
        await prisma.userRole.create({
          data: { userId: created.id, roleId: role.id },
        });
      }
      const commander: IdentityUser = {
        id: commanderId,
        email: `${commanderId}@civicos.local`,
        name: commanderId,
        roles: ['commander'],
        organizationUnitId: orgId,
      };
      const member: IdentityUser = {
        id: memberId,
        email: `${memberId}@civicos.local`,
        name: memberId,
        roles: ['field_officer'],
        organizationUnitId: orgId,
      };

      await expect(
        createAssignments(
          {
            resourceType: 'T02Record',
            resourceId,
            task: 'incident_verification',
            assigneeUserIds: [],
            organizationId: orgId,
          },
          commander,
        ),
      ).rejects.toThrow('ASSIGNEE_REQUIRED');
      await expect(
        createAssignments(
          {
            resourceType: 'T02Record',
            resourceId,
            task: '   ',
            assigneeUserIds: [memberId],
            organizationId: orgId,
          },
          commander,
        ),
      ).rejects.toThrow('TASK_REQUIRED');
      await expect(
        createAssignments(
          {
            resourceType: 'T02Record',
            resourceId,
            task: 'incident_verification',
            assigneeUserIds: [memberId],
            organizationId: orgId,
          },
          member,
        ),
      ).rejects.toThrow('FORBIDDEN');

      const granted = await createAssignments(
        {
          resourceType: 'T02Record',
          resourceId,
          task: 'incident_verification',
          assigneeUserIds: [memberId],
          organizationId: orgId,
        },
        commander,
      );
      assignmentId = granted[0].id;
      await expect(
        revokeAssignment(assignmentId, commander, '   '),
      ).rejects.toThrow('REVOKE_REASON_REQUIRED');

      await expect(
        createIdentityUser(
          {
            email: 'invalid',
            name: '',
            role: 'field_officer',
            password: 'short',
          },
          commander,
        ),
      ).rejects.toThrow('INVALID_USER');
    });
  },
);
