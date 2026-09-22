import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import {
  canApprove,
  canAssign,
  canMutate,
  canRead,
  canViewSensitive,
  createAssignments,
  listIdentityUsers,
  revokeAssignment,
} from '@/modules/identity';
import type { IdentityUser } from '@/modules/identity';

const postgresEnabled = process.env.RUN_DB_TESTS === '1';
const stamp = randomUUID().slice(0, 8);
const orgA = `t02d-org-a-${stamp}`;
const resourceId = `t02d-record-${stamp}`;

function userRef(
  id: string,
  roles: IdentityUser['roles'],
  organizationUnitId: string,
  name = id,
): IdentityUser {
  return { id, email: `${id}@civicos.local`, name, roles, organizationUnitId };
}

describe('identity display boundary seam', () => {
  it('exposes read/mutate/assign/approve/sensitive helpers', () => {
    for (const helper of [
      canRead,
      canMutate,
      canAssign,
      canApprove,
      canViewSensitive,
    ]) {
      expect(typeof helper).toBe('function');
    }
  });

  it('keeps migration rollback free of User/Assignment/Event history deletes', () => {
    const dir = join(
      process.cwd(),
      'prisma',
      'migrations',
      '20260922_identity_role_catalog',
    );
    const down = join(dir, 'down.sql');
    expect(existsSync(down)).toBe(true);
    const sql = readFileSync(down, 'utf-8');
    expect(sql).not.toMatch(/DELETE\s+FROM\s+"User"/i);
    expect(sql).not.toMatch(/DELETE\s+FROM\s+"Assignment"/i);
    expect(sql).not.toMatch(/DELETE\s+FROM\s+"EventRecord"/i);
    expect(sql).not.toMatch(/DELETE\s+FROM\s+"AuditEvent"/i);
    expect(sql).not.toMatch(/DROP\s+TABLE/i);
  });
});

describe.skipIf(!postgresEnabled)('identity display integration seam', () => {
  const commander = userRef(`t02d-commander-${stamp}`, ['commander'], orgA);
  const member = userRef(`t02d-member-${stamp}`, ['field_officer'], orgA);
  const outsider = userRef(`t02d-outsider-${stamp}`, ['field_officer'], orgA);
  let assignmentId = '';

  beforeAll(async () => {
    await prisma.organizationUnit.create({
      data: { id: orgA, name: 'T02D unit A', level: 'commune' },
    });
    for (const name of ['commander', 'field_officer'] as const) {
      await prisma.role.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    }
    for (const user of [commander, member, outsider]) {
      const created = await prisma.user.create({
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          passwordHash: `t02d-hash-${stamp}`,
          organizationUnitId: orgA,
        },
      });
      const role = await prisma.role.findUniqueOrThrow({
        where: { name: user.roles[0] },
      });
      await prisma.userRole.create({
        data: { userId: created.id, roleId: role.id },
      });
    }
    const granted = await createAssignments(
      {
        resourceType: 'T02DRecord',
        resourceId,
        task: 'incident_verification',
        assigneeUserIds: [member.id],
        organizationId: orgA,
      },
      commander,
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
      where: { userId: { in: [commander.id, member.id, outsider.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [commander.id, member.id, outsider.id] } },
    });
    await prisma.organizationUnit.deleteMany({ where: { id: orgA } });
  });

  it('lists users with role and organization unit for display', async () => {
    const users = await listIdentityUsers(commander);
    const listed = users.find(({ id }) => id === member.id);
    expect(listed?.roles).toContain('field_officer');
    expect(listed).toMatchObject({ organizationUnitId: orgA });
  });

  it('keeps authorization helpers consistent with the policy seam', async () => {
    const resource = {
      resourceType: 'T02DRecord',
      resourceId,
      organizationId: orgA,
    };
    await expect(canRead(member, resource)).resolves.toBe(true);
    await expect(canMutate(member, resource)).resolves.toBe(true);
    await expect(canViewSensitive(member, resource)).resolves.toBe(true);
    await expect(canAssign(member, resource)).resolves.toBe(false);
    await expect(canApprove(member, resource)).resolves.toBe(false);
    await expect(canRead(outsider, resource)).resolves.toBe(false);
    await expect(canAssign(commander, resource)).resolves.toBe(true);
    await expect(canApprove(commander, resource)).resolves.toBe(true);
  });

  it('preserves actor snapshots on stored events after the user changes', async () => {
    const grantEvent = await prisma.eventRecord.findFirstOrThrow({
      where: {
        aggregateType: 'Assignment',
        aggregateId: assignmentId,
        eventType: 'AssignmentGranted',
      },
      orderBy: { aggregateVersion: 'asc' },
    });
    expect(grantEvent.actorId).toBe(commander.id);
    expect(grantEvent.actorName).toBe(commander.name);

    await prisma.user.update({
      where: { id: commander.id },
      data: { name: `renamed-${stamp}` },
    });

    const reread = await prisma.eventRecord.findFirstOrThrow({
      where: { eventId: grantEvent.eventId },
    });
    expect(reread.actorName).toBe(commander.name);

    const revoked = await revokeAssignment(
      assignmentId,
      { ...commander, name: `renamed-${stamp}` },
      'T02D display handover',
    );
    expect(revoked.status).toBe('revoked');
    expect(revoked.revokeReason).toBe('T02D display handover');
    const revokeEvent = await prisma.eventRecord.findFirstOrThrow({
      where: {
        aggregateType: 'Assignment',
        aggregateId: assignmentId,
        eventType: 'AssignmentRevoked',
      },
    });
    expect(revokeEvent.actorName).toBe(`renamed-${stamp}`);
    const storedGrant = await prisma.eventRecord.findFirstOrThrow({
      where: { eventId: grantEvent.eventId },
    });
    expect(storedGrant.actorName).toBe(commander.name);
  });
});
