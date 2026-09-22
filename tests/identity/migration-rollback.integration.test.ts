import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import { createAssignments, ensureDevelopmentUsers } from '@/modules/identity';
import type { IdentityUser } from '@/modules/identity';

const postgresEnabled = process.env.RUN_DB_TESTS === '1';
const stamp = randomUUID().slice(0, 8);
const orgId = `t02r-org-${stamp}`;
const resourceId = `t02r-record-${stamp}`;
const commanderId = `t02r-commander-${stamp}`;
const memberId = `t02r-member-${stamp}`;

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

function loadRollbackStatements(): string[] {
  const sql = readFileSync(
    join(
      process.cwd(),
      'prisma',
      'migrations',
      '20260922_identity_role_catalog',
      'down.sql',
    ),
    'utf-8',
  );
  return sql
    .split(/\n\s*\n/)
    .map((block) =>
      block
        .split('\n')
        .filter((line) => !line.trimStart().startsWith('--'))
        .join('\n')
        .trim(),
    )
    .filter((block) => block.length > 0);
}

describe.skipIf(!postgresEnabled)('migration rollback safety seam', () => {
  let assignmentId = '';

  beforeAll(async () => {
    await ensureDevelopmentUsers();
    await prisma.organizationUnit.create({
      data: { id: orgId, name: 'T02R unit', level: 'commune' },
    });
    for (const name of ['commander', 'field_officer'] as const) {
      await prisma.role.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    }
    for (const [id, roleName] of [
      [commanderId, 'commander'],
      [memberId, 'field_officer'],
    ] as const) {
      const created = await prisma.user.create({
        data: {
          id,
          email: `${id}@civicos.local`,
          name: id,
          passwordHash: `t02r-hash-${stamp}`,
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
    const granted = await createAssignments(
      {
        resourceType: 'T02RRecord',
        resourceId,
        task: 'incident_verification',
        assigneeUserIds: [memberId],
        organizationId: orgId,
      },
      userRef(commanderId, ['commander'], orgId),
    );
    assignmentId = granted[0].id;
  });

  afterAll(async () => {
    const events = await prisma.eventRecord.findMany({
      where: { aggregateType: 'Assignment', aggregateId: assignmentId },
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
    const audits = await prisma.auditEvent.findMany({
      where: { resourceId },
      select: { id: true },
    });
    const auditIds = audits.map(({ id }) => id);
    if (auditIds.length) {
      const auditEvents = await prisma.eventRecord.findMany({
        where: { aggregateType: 'AuditEvent', aggregateId: { in: auditIds } },
        select: { eventId: true },
      });
      const auditEventIds = auditEvents.map(({ eventId }) => eventId);
      if (auditEventIds.length) {
        await prisma.outboxMessage.deleteMany({
          where: { eventId: { in: auditEventIds } },
        });
        await prisma.eventRecord.deleteMany({
          where: { eventId: { in: auditEventIds } },
        });
      }
      await prisma.auditEvent.deleteMany({ where: { id: { in: auditIds } } });
    }
    await prisma.assignment.deleteMany({ where: { id: assignmentId } });
    await prisma.session.deleteMany({
      where: { userId: { in: [commanderId, memberId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [commanderId, memberId] } },
    });
    await prisma.organizationUnit.deleteMany({ where: { id: orgId } });
  });

  it('records the role catalog migration as applied', async () => {
    const rows = await prisma.$queryRaw<
      Array<{ finished_at: Date | null; applied_steps_count: number }>
    >`
      SELECT finished_at, applied_steps_count FROM _prisma_migrations
      WHERE migration_name = '20260922_identity_role_catalog'
    `;
    expect(rows.length).toBe(1);
    expect(rows[0].finished_at).not.toBeNull();
    expect(rows[0].applied_steps_count).toBeGreaterThan(0);
  });

  it('applies down.sql without losing User, Assignment, Event or Audit history', async () => {
    const statements = loadRollbackStatements();
    expect(statements.length).toBe(2);

    const countFixture = async (
      client:
        | typeof prisma
        | Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    ) => {
      const [users, assignments, events, audits] = await Promise.all([
        client.user.count({
          where: { id: { in: [commanderId, memberId] } },
        }),
        client.assignment.count({ where: { id: assignmentId } }),
        client.eventRecord.count({
          where: { aggregateType: 'Assignment', aggregateId: assignmentId },
        }),
        client.auditEvent.count({ where: { resourceId } }),
      ]);
      return { users, assignments, events, audits };
    };
    const before = await countFixture(prisma);
    expect(before).toMatchObject({
      users: 2,
      assignments: 1,
    });
    expect(before.events).toBeGreaterThan(0);
    expect(before.audits).toBeGreaterThan(0);

    const captrenBefore = await prisma.user.findUniqueOrThrow({
      where: { email: 'captren@civicos.local' },
      include: { roles: { include: { role: true } } },
    });
    const captrenRolesBefore = captrenBefore.roles
      .map(({ role }) => role.name)
      .sort();
    expect(captrenRolesBefore).toContain('superior_officer');

    let rolledBack = false;
    try {
      await prisma.$transaction(async (tx) => {
        for (const statement of statements) {
          await tx.$executeRawUnsafe(statement);
        }
        await expect(countFixture(tx)).resolves.toEqual(before);
        const captrenInside = await tx.user.findUniqueOrThrow({
          where: { email: 'captren@civicos.local' },
          include: { roles: { include: { role: true } } },
        });
        expect(captrenInside.roles.map(({ role }) => role.name)).toContain(
          'field_officer',
        );
        throw new Error('T02R_ROLLBACK_SENTINEL');
      });
    } catch (error) {
      rolledBack =
        error instanceof Error && error.message === 'T02R_ROLLBACK_SENTINEL';
      if (!rolledBack) throw error;
    }
    expect(rolledBack).toBe(true);

    await expect(countFixture(prisma)).resolves.toEqual(before);
    const captrenAfter = await prisma.user.findUniqueOrThrow({
      where: { email: 'captren@civicos.local' },
      include: { roles: { include: { role: true } } },
    });
    expect(captrenAfter.roles.map(({ role }) => role.name).sort()).toEqual(
      captrenRolesBefore,
    );
  });
});
