import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/prisma';
import {
  ROLE_BASE_CAPABILITIES,
  ROLE_CATALOG,
  TASK_ALLOWED_ROLES,
  isTaskCompatibleWithRoles,
} from '@/modules/identity/contracts';
import { evaluatePolicy } from '@/modules/identity/authorization';
import {
  authenticateLocal,
  createAssignments,
  createSession,
  ensureDevelopmentUsers,
  getCurrentUser,
  listAssignments,
  revokeAssignment,
  sessionCookieName,
} from '@/modules/identity';
import type { IdentityUser } from '@/modules/identity';
import { cookies } from 'next/headers';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));

const EXPECTED_CATALOG = [
  'commander',
  'duty_officer',
  'field_officer',
  'office_officer',
  'village_officer',
  'superior_officer',
  'superior_commander',
  'system_operator',
] as const;

function mockSessionCookie(token?: string) {
  vi.mocked(cookies).mockResolvedValue({
    get: (name: string) =>
      token && name === sessionCookieName ? { value: token } : undefined,
    delete: () => {},
  } as never);
}

describe('slice A role catalog contract', () => {
  it('exposes the eight approved runtime roles plus land roles', () => {
    expect([...ROLE_CATALOG].sort()).toEqual(
      [...EXPECTED_CATALOG, 'land_officer', 'commune_leader', 'citizen'].sort(),
    );
  });

  it('treats supervisor as a non-business role', () => {
    expect(ROLE_CATALOG).not.toContain('supervisor');
    expect(ROLE_BASE_CAPABILITIES['supervisor'] ?? []).toEqual([]);
    for (const task of Object.keys(TASK_ALLOWED_ROLES)) {
      expect(TASK_ALLOWED_ROLES[task]).not.toContain('supervisor');
    }
    expect(
      isTaskCompatibleWithRoles('incident_verification', ['supervisor']),
    ).toBe(false);
  });

  it('reserves system_operator for health/worker without business tasks', () => {
    expect(ROLE_CATALOG).toContain('system_operator');
    for (const task of Object.keys(TASK_ALLOWED_ROLES)) {
      expect(TASK_ALLOWED_ROLES[task]).not.toContain('system_operator');
    }
    expect(
      isTaskCompatibleWithRoles('incident_verification', ['system_operator']),
    ).toBe(false);
  });

  it('grants a multi-role union without exceeding scope or task compatibility', () => {
    const multi: IdentityUser = {
      id: 'u-multi',
      email: 'u-multi@civicos.local',
      name: 'multi',
      roles: ['field_officer', 'office_officer'],
      organizationUnitId: 'unit-a',
    };
    const resource = {
      resourceType: 'Incident',
      resourceId: 'res-1',
      organizationId: 'unit-a',
    };
    expect(
      evaluatePolicy({
        user: multi,
        resource,
        action: 'read',
        assignments: [
          {
            task: 'incident_verification',
            resourceType: 'Incident',
            resourceId: 'res-1',
            status: 'active',
            organizationId: 'unit-a',
          },
        ],
      }).allowed,
    ).toBe(true);
    expect(
      evaluatePolicy({
        user: multi,
        resource: { ...resource, organizationId: 'unit-b' },
        action: 'read',
        assignments: [
          {
            task: 'incident_verification',
            resourceType: 'Incident',
            resourceId: 'res-1',
            status: 'active',
            organizationId: 'unit-a',
          },
        ],
      }).allowed,
    ).toBe(false);
    expect(
      evaluatePolicy({
        user: multi,
        resource,
        action: 'assign',
        assignments: [],
      }).allowed,
    ).toBe(false);
  });

  it('keeps command-scope assignment management assignment-free for commander roles', () => {
    const resource = {
      resourceType: 'Assignment',
      resourceId: 'res-1',
      organizationId: 'unit-a',
    };
    for (const roles of [['commander'], ['superior_commander']] as const) {
      const user: IdentityUser = {
        id: `u-${roles[0]}`,
        email: `${roles[0]}@civicos.local`,
        name: roles[0],
        roles: [...roles],
        organizationUnitId: 'unit-a',
      };
      expect(
        evaluatePolicy({ user, resource, action: 'assign', assignments: [] })
          .allowed,
      ).toBe(true);
    }
  });
});

const postgresEnabled = process.env.RUN_DB_TESTS === '1';
const stamp = randomUUID().slice(0, 8);

describe.skipIf(!postgresEnabled)('slice A role login and mapping seam', () => {
  beforeAll(async () => {
    await ensureDevelopmentUsers();
  });

  it('maps captren to superior_officer in the superior unit', async () => {
    const user = await authenticateLocal(
      'captren@civicos.local',
      'civicos-dev',
    );
    expect(user).not.toBeNull();
    expect(user?.roles).toEqual(['superior_officer']);
    expect(user?.organizationUnitId).toBe('unit-cap-tren');
  });

  it('logs in the superior commander and system operator fixtures', async () => {
    const superior = await authenticateLocal(
      'captren-chihuy@civicos.local',
      'civicos-dev',
    );
    expect(superior?.roles).toContain('superior_commander');
    const operator = await authenticateLocal(
      'system-operator@civicos.local',
      'civicos-dev',
    );
    expect(operator?.roles).toContain('system_operator');
  });

  it('rejects inactive users at login', async () => {
    const email = `inactive-${stamp}@civicos.local`;
    const role = await prisma.role.findUniqueOrThrow({
      where: { name: 'field_officer' },
    });
    const created = await prisma.user.create({
      data: {
        email,
        name: 'inactive',
        passwordHash: 'hash',
        active: false,
        organizationUnitId: 'unit-nghia-tru',
        roles: { create: { roleId: role.id } },
      },
    });
    try {
      await expect(authenticateLocal(email, 'civicos-dev')).resolves.toBeNull();
    } finally {
      await prisma.user.deleteMany({ where: { id: created.id } });
    }
  });

  it('projects session roles and organization unit from the server store', async () => {
    const user = await authenticateLocal(
      'captren@civicos.local',
      'civicos-dev',
    );
    expect(user).not.toBeNull();
    const session = await createSession(user!.id);
    mockSessionCookie(session.token);
    const current = await getCurrentUser();
    expect(current?.roles).toEqual(['superior_officer']);
    expect(current?.organizationUnitId).toBe('unit-cap-tren');
    await prisma.session.deleteMany({ where: { userId: user!.id } });
  });

  it('does not honor a client-supplied role elevation', async () => {
    const user = await authenticateLocal(
      'hientruong@civicos.local',
      'civicos-dev',
    );
    expect(user?.roles).not.toContain('commander');
    expect(user?.roles).not.toContain('system_operator');
  });
});

describe.skipIf(!postgresEnabled)('slice A assignment policy seam', () => {
  const orgA = `slice-a-org-a-${stamp}`;
  const orgB = `slice-a-org-b-${stamp}`;
  const resourceId = `slice-a-record-${stamp}`;
  const commanderId = `slice-a-commander-${stamp}`;
  const superiorId = `slice-a-superior-${stamp}`;
  const memberId = `slice-a-member-${stamp}`;
  const crossId = `slice-a-cross-${stamp}`;
  const inactiveId = `slice-a-inactive-${stamp}`;
  const outsiderId = `slice-a-outsider-${stamp}`;
  let assignmentId = '';

  function ref(
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

  beforeAll(async () => {
    await prisma.organizationUnit.createMany({
      data: [
        { id: orgA, name: 'slice A unit A', level: 'commune' },
        { id: orgB, name: 'slice A unit B', level: 'commune' },
      ],
    });
    for (const name of [
      'commander',
      'superior_commander',
      'field_officer',
    ] as const) {
      await prisma.role.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    }
    const seeds: Array<[string, string, string]> = [
      [commanderId, 'commander', orgA],
      [superiorId, 'superior_commander', orgA],
      [memberId, 'field_officer', orgA],
      [crossId, 'field_officer', orgB],
      [inactiveId, 'field_officer', orgA],
      [outsiderId, 'field_officer', orgA],
    ];
    for (const [id, roleName, org] of seeds) {
      const created = await prisma.user.create({
        data: {
          id,
          email: `${id}@civicos.local`,
          name: id,
          passwordHash: `slice-a-${stamp}`,
          organizationUnitId: org,
          active: id !== inactiveId,
        },
      });
      const role = await prisma.role.findUniqueOrThrow({
        where: { name: roleName },
      });
      await prisma.userRole.create({
        data: { userId: created.id, roleId: role.id },
      });
    }
  });

  afterAll(async () => {
    const events = await prisma.eventRecord.findMany({
      where: { aggregateType: 'Assignment' },
      select: { eventId: true, aggregateId: true },
    });
    const scoped = events.filter(
      (event) =>
        event.aggregateId.startsWith('slice-a') ||
        [assignmentId].includes(event.aggregateId),
    );
    void scoped;
    await prisma.assignment.deleteMany({
      where: { resourceId: { startsWith: 'slice-a-record' } },
    });
    await prisma.assignment.deleteMany({ where: { id: assignmentId } });
    await prisma.session.deleteMany({
      where: {
        userId: {
          in: [
            commanderId,
            superiorId,
            memberId,
            crossId,
            inactiveId,
            outsiderId,
          ],
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [
            commanderId,
            superiorId,
            memberId,
            crossId,
            inactiveId,
            outsiderId,
          ],
        },
      },
    });
    await prisma.organizationUnit.deleteMany({
      where: { id: { in: [orgA, orgB] } },
    });
  });

  it('lets commanders manage assignments without their own assignment task', async () => {
    const commander = ref(commanderId, ['commander'], orgA);
    const superior = ref(superiorId, ['superior_commander'], orgA);
    const granted = await createAssignments(
      {
        resourceType: 'T02Record',
        resourceId,
        task: 'incident_verification',
        assigneeUserIds: [memberId],
        organizationId: orgA,
      },
      commander,
    );
    assignmentId = granted[0].id;
    const second = await createAssignments(
      {
        resourceType: 'T02Record',
        resourceId: `${resourceId}-superior`,
        task: 'incident_verification',
        assigneeUserIds: [memberId],
        organizationId: orgA,
      },
      superior,
    );
    expect(second).toHaveLength(1);
    await prisma.assignment.deleteMany({
      where: { resourceId: `${resourceId}-superior` },
    });
    const revoked = await revokeAssignment(
      assignmentId,
      superior,
      'slice A handover',
    );
    expect(revoked.status).toBe('revoked');
  });

  it('rejects incompatible tasks without creating a record or event', async () => {
    const commander = ref(commanderId, ['commander'], orgA);
    const beforeRecords = await prisma.assignment.count({
      where: { resourceId: `${resourceId}-incompatible` },
    });
    const beforeEvents = await prisma.eventRecord.count({
      where: { aggregateType: 'Assignment' },
    });
    await expect(
      createAssignments(
        {
          resourceType: 'T02Record',
          resourceId: `${resourceId}-incompatible`,
          task: 'unknown_task_xyz',
          assigneeUserIds: [memberId],
          organizationId: orgA,
        },
        commander,
      ),
    ).rejects.toThrow('INCOMPATIBLE_TASK');
    expect(
      await prisma.assignment.count({
        where: { resourceId: `${resourceId}-incompatible` },
      }),
    ).toBe(beforeRecords);
    expect(
      await prisma.eventRecord.count({
        where: { aggregateType: 'Assignment' },
      }),
    ).toBe(beforeEvents);
  });

  it('rejects cross-unit assignees, inactive users and revoked assignments', async () => {
    const commander = ref(commanderId, ['commander'], orgA);
    await expect(
      createAssignments(
        {
          resourceType: 'T02Record',
          resourceId: `${resourceId}-cross`,
          task: 'incident_verification',
          assigneeUserIds: [crossId],
          organizationId: orgA,
        },
        commander,
      ),
    ).rejects.toThrow('ASSIGNEE_ORGANIZATION_MISMATCH');
    await expect(
      createAssignments(
        {
          resourceType: 'T02Record',
          resourceId: `${resourceId}-inactive`,
          task: 'incident_verification',
          assigneeUserIds: [inactiveId],
          organizationId: orgA,
        },
        commander,
      ),
    ).rejects.toThrow('ASSIGNEE_NOT_FOUND');
    const listed = await listAssignments({
      actor: ref(memberId, ['field_officer'], orgA),
      resourceType: 'T02Record',
      resourceId,
    });
    expect(listed.find(({ id }) => id === assignmentId)).toBeUndefined();
  });

  it('restricts management to commanders and scopes listing by unit', async () => {
    const outsider = ref(outsiderId, ['field_officer'], orgA);
    await expect(
      createAssignments(
        {
          resourceType: 'T02Record',
          resourceId: `${resourceId}-denied`,
          task: 'incident_verification',
          assigneeUserIds: [memberId],
          organizationId: orgA,
        },
        outsider,
      ),
    ).rejects.toThrow('FORBIDDEN');
    await expect(
      revokeAssignment(assignmentId, outsider, 'no power'),
    ).rejects.toThrow('FORBIDDEN');
    const commanderView = await listAssignments({
      actor: ref(commanderId, ['commander'], orgA),
      resourceType: 'T02Record',
      resourceId,
      includeRevoked: true,
    });
    expect(commanderView.map(({ id }) => id)).toContain(assignmentId);
    const unrelated = await listAssignments({
      actor: ref(outsiderId, ['field_officer'], orgA),
      resourceType: 'T02Record',
      resourceId,
      includeRevoked: true,
    });
    expect(unrelated).toEqual([]);
  });
});

describe('slice A identity role migration artifacts', () => {
  it('ships an additive reversible migration for the role catalog', () => {
    const dir = join(
      process.cwd(),
      'prisma',
      'migrations',
      '20260922_identity_role_catalog',
    );
    const up = join(dir, 'migration.sql');
    expect(existsSync(up)).toBe(true);
    const sql = readFileSync(up, 'utf-8');
    for (const role of EXPECTED_CATALOG) {
      expect(sql).toContain(role);
    }
    expect(sql).toContain('captren@civicos.local');
    expect(sql).toContain('superior_officer');
    expect(sql).not.toMatch(/DELETE\s+FROM\s+"User"/i);
    expect(sql).not.toMatch(/DELETE\s+FROM\s+"Assignment"/i);
    expect(sql).not.toMatch(/DELETE\s+FROM\s+"EventRecord"/i);
    expect(sql).not.toMatch(/DELETE\s+FROM\s+"AuditEvent"/i);
    expect(sql).not.toMatch(/DROP\s+TABLE/i);
    const down = join(dir, 'down.sql');
    expect(existsSync(down)).toBe(true);
    expect(readFileSync(down, 'utf-8')).toContain('superior_officer');
  });
});
