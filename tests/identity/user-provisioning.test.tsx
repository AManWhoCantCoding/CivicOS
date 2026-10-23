import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from '@/app/api/identity/users/route';
import { CreateUserForm } from '@/components/identity/CreateUserForm';
import { cookies } from 'next/headers';
import {
  authenticateLocal,
  createIdentityUser,
  sessionCookieName,
} from '@/modules/identity';
import { USER_PROVISIONING_ROLES } from '@/modules/identity/contracts';
import type { IdentityUser } from '@/modules/identity/contracts';

type TestUserRecord = {
  id: string;
  email: string;
  name: string;
  active: boolean;
  organizationUnitId: string | null;
  passwordHash?: string | null;
  roles: { role: { name: string } }[];
};

const testEnvironment = vi.hoisted(() => {
  let actorRecord: TestUserRecord | null = null;
  let sessionRecord: { userId: string; expiresAt: Date } | null = null;
  let createdUser: TestUserRecord | null = null;
  const transaction = {
    organizationUnit: { findFirst: vi.fn() },
    role: { upsert: vi.fn() },
    user: { create: vi.fn() },
    auditEvent: { create: vi.fn() },
    eventRecord: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    outboxMessage: { create: vi.fn() },
    assignment: { create: vi.fn() },
  };
  const prisma = {
    $transaction: vi.fn(
      async (action: (tx: typeof transaction) => Promise<unknown>) =>
        action(transaction),
    ),
    session: { findUnique: vi.fn(async () => sessionRecord) },
    user: {
      findUnique: vi.fn(
        async ({ where }: { where: { id?: string; email?: string } }) => {
          if (where.id) return actorRecord;
          if (where.email) return createdUser;
          return null;
        },
      ),
    },
  };

  return {
    prisma,
    transaction,
    refresh: vi.fn(),
    setActorRecord(record: TestUserRecord | null) {
      actorRecord = record;
    },
    setSessionRecord(record: { userId: string; expiresAt: Date } | null) {
      sessionRecord = record;
    },
    setCreatedUser(user: TestUserRecord | null) {
      createdUser = user;
    },
  };
});

vi.mock('@/lib/prisma', () => ({ prisma: testEnvironment.prisma }));
vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: testEnvironment.refresh }),
}));

const commander: IdentityUser = {
  id: 'commander-1',
  email: 'commander@example.test',
  name: 'Commander',
  roles: ['commander'],
  organizationUnitId: 'unit-1',
};

const input = {
  email: 'land.officer@example.test',
  name: 'Land Officer',
  role: 'land_officer' as const,
  password: 'secure-pass-1',
};

function setSession(actor: IdentityUser | null, token = 'valid-session') {
  testEnvironment.setSessionRecord(
    actor
      ? { userId: actor.id, expiresAt: new Date('2099-01-01T00:00:00.000Z') }
      : null,
  );
  testEnvironment.setActorRecord(
    actor
      ? {
          id: actor.id,
          email: actor.email,
          name: actor.name,
          active: true,
          organizationUnitId: actor.organizationUnitId ?? null,
          roles: actor.roles.map((name) => ({ role: { name } })),
        }
      : null,
  );
  vi.mocked(cookies).mockResolvedValue({
    get: (name: string) =>
      token && name === sessionCookieName ? { value: token } : undefined,
    delete: () => {},
  } as never);
}

function post(body: Record<string, unknown>) {
  return POST(
    new Request('http://localhost/api/identity/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.test',
        name: 'Test User',
        password: 'secure-pass-1',
        ...body,
      }),
    }),
  );
}

// NGOÀI BASELINE — PO-APPROVED D-52 (docs/reset/decision-log.md).
describe('identity user provisioning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testEnvironment.setActorRecord(null);
    testEnvironment.setSessionRecord(null);
    testEnvironment.setCreatedUser(null);
    vi.mocked(cookies).mockResolvedValue({ get: () => undefined } as never);
    testEnvironment.transaction.organizationUnit.findFirst.mockResolvedValue({
      id: 'unit-1',
    });
    testEnvironment.transaction.role.upsert.mockImplementation(
      async ({ where }) => ({ id: 'identity-role', name: where.name }),
    );
    testEnvironment.transaction.user.create.mockImplementation(
      async ({ data }) => {
        const roleName =
          testEnvironment.transaction.role.upsert.mock.calls.at(-1)?.[0].where
            .name;
        const user: TestUserRecord = {
          id: 'created-1',
          email: data.email,
          name: data.name,
          passwordHash: data.passwordHash,
          organizationUnitId: data.organizationUnitId ?? null,
          active: true,
          roles: [{ role: { name: roleName } }],
        };
        testEnvironment.setCreatedUser(user);
        return user;
      },
    );
    testEnvironment.transaction.auditEvent.create.mockResolvedValue({
      id: 'audit-1',
      occurredAt: new Date('2026-10-19T00:00:00.000Z'),
    });
    testEnvironment.transaction.eventRecord.findUnique.mockResolvedValue(null);
    testEnvironment.transaction.eventRecord.findFirst.mockResolvedValue(null);
    testEnvironment.transaction.eventRecord.create.mockResolvedValue(undefined);
    testEnvironment.transaction.outboxMessage.create.mockResolvedValue({
      id: 'outbox-1',
      attempts: 0,
      status: 'pending',
    });
  });

  it('creates land_officer for the current commander in that active unit only', async () => {
    setSession(commander);

    const response = await post({
      ...input,
      organizationUnitId: 'forged-unit',
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      user: { roles: ['land_officer'], organizationUnitId: 'unit-1' },
    });
    expect(
      testEnvironment.transaction.organizationUnit.findFirst,
    ).toHaveBeenCalledWith({
      where: { id: 'unit-1', active: true },
      select: { id: true },
    });
    expect(testEnvironment.transaction.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationUnitId: 'unit-1' }),
      }),
    );
    const storedUser = testEnvironment.transaction.user.create.mock
      .calls[0]?.[0].data as { passwordHash: string };
    expect(storedUser.passwordHash).not.toBe(input.password);
    expect(storedUser.passwordHash).toMatch(/^[a-f0-9]{32}\.[a-f0-9]{128}$/);
    await expect(
      authenticateLocal(input.email, input.password),
    ).resolves.toMatchObject({
      id: 'created-1',
      roles: ['land_officer'],
      organizationUnitId: 'unit-1',
    });
    expect(testEnvironment.transaction.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: commander.id,
        resourceType: 'User',
        resourceId: 'created-1',
        operation: 'user.created',
        metadata: { role: 'land_officer' },
      }),
    });
    expect(testEnvironment.prisma.$transaction).toHaveBeenCalledOnce();
    expect(
      testEnvironment.transaction.assignment.create,
    ).not.toHaveBeenCalled();
  });

  it('rejects invalid sessions before creating a user', async () => {
    setSession(null, 'invalid-session');

    const response = await post(input);

    expect(response.status).toBe(401);
    expect(testEnvironment.prisma.session.findUnique).toHaveBeenCalledOnce();
    expect(testEnvironment.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('denies a non-commander through the existing service authorization', async () => {
    setSession({ ...commander, roles: ['field_officer'] });

    const response = await post(input);

    expect(response.status).toBe(403);
    expect(testEnvironment.prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each([
    ['missing', undefined],
    ['blank', '   '],
    ['unknown', 'missing-unit'],
    ['inactive', 'inactive-unit'],
  ])(
    'rejects a %s actor unit before any writes',
    async (_, organizationUnitId) => {
      setSession({ ...commander, organizationUnitId });
      testEnvironment.transaction.organizationUnit.findFirst.mockResolvedValue(
        null,
      );

      const response = await post({
        ...input,
        organizationUnitId: 'forged-unit',
      });

      expect(response.status).toBe(400);
      expect(testEnvironment.prisma.$transaction).toHaveBeenCalledOnce();
      expect(testEnvironment.transaction.role.upsert).not.toHaveBeenCalled();
      expect(testEnvironment.transaction.user.create).not.toHaveBeenCalled();
      expect(
        testEnvironment.transaction.auditEvent.create,
      ).not.toHaveBeenCalled();
      expect(
        testEnvironment.transaction.eventRecord.create,
      ).not.toHaveBeenCalled();
      expect(
        testEnvironment.transaction.assignment.create,
      ).not.toHaveBeenCalled();
    },
  );

  it('accepts exactly the shared provisioning roles', async () => {
    expect(USER_PROVISIONING_ROLES).toEqual([
      'commander',
      'duty_officer',
      'field_officer',
      'office_officer',
      'village_officer',
      'superior_officer',
      'superior_commander',
      'system_operator',
      'land_officer',
    ]);

    for (const role of USER_PROVISIONING_ROLES) {
      setSession(commander);
      const response = await post({ ...input, role });

      expect(response.status, role).toBe(201);
    }
  });

  it('rejects roles outside the provisioning allowlist', async () => {
    setSession(commander);

    for (const role of ['citizen', 'supervisor', 'commune_leader', 'root']) {
      const response = await post({ ...input, role });

      expect(response.status, role).toBe(400);
    }

    expect(testEnvironment.transaction.user.create).not.toHaveBeenCalled();
  });

  it('does not require an organization unit for existing roles', async () => {
    setSession({ ...commander, organizationUnitId: undefined });

    const response = await post({ ...input, role: 'field_officer' });

    expect(response.status).toBe(201);
    expect(
      testEnvironment.transaction.organizationUnit.findFirst,
    ).not.toHaveBeenCalled();
    expect(testEnvironment.transaction.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationUnitId: undefined }),
      }),
    );
  });

  it('keeps service password validation', async () => {
    await expect(
      createIdentityUser({ ...input, password: 'short' }, commander),
    ).rejects.toThrow('INVALID_USER');

    expect(testEnvironment.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('offers the shared provisioning roles without a client-selectable organization unit', () => {
    const markup = renderToStaticMarkup(createElement(CreateUserForm));
    const renderedRoles = [
      ...markup.matchAll(/<option\b[^>]*>([^<]+)<\/option>/g),
    ].map(([, role]) => role);

    expect(renderedRoles).toEqual(USER_PROVISIONING_ROLES);
    expect(markup).not.toContain('organizationUnitId');
  });
});
