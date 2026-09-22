import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { GET as healthWorkerGET } from '@/app/api/health/worker/route';
import {
  GET as usersGET,
  POST as usersPOST,
} from '@/app/api/identity/users/route';
import { prisma } from '@/lib/prisma';
import {
  authenticateLocal,
  createSession,
  ensureDevelopmentUsers,
  sessionCookieName,
} from '@/modules/identity';
import { cookies } from 'next/headers';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));

const postgresEnabled = process.env.RUN_DB_TESTS === '1';

function mockSessionCookie(token?: string) {
  vi.mocked(cookies).mockResolvedValue({
    get: (name: string) =>
      token && name === sessionCookieName ? { value: token } : undefined,
    delete: () => {},
  } as never);
}

async function loginAs(email: string): Promise<string> {
  const user = await authenticateLocal(email, 'civicos-dev');
  expect(user).not.toBeNull();
  const session = await createSession(user!.id);
  return session.token;
}

describe.skipIf(!postgresEnabled)('health worker access seam', () => {
  const sessionUserIds: string[] = [];

  beforeAll(async () => {
    await ensureDevelopmentUsers();
  });

  afterAll(async () => {
    await prisma.session.deleteMany({
      where: { userId: { in: sessionUserIds } },
    });
  });

  it('lets system_operator read health/worker without business rows', async () => {
    const token = await loginAs('system-operator@civicos.local');
    const user = await authenticateLocal(
      'system-operator@civicos.local',
      'civicos-dev',
    );
    sessionUserIds.push(user!.id);
    mockSessionCookie(token);
    const response = await healthWorkerGET();
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toHaveProperty('pendingCount');
    expect(body).not.toHaveProperty('users');
    expect(body).not.toHaveProperty('incidents');
  });

  it('keeps commander health/worker access', async () => {
    const token = await loginAs('truong@civicos.local');
    const user = await authenticateLocal('truong@civicos.local', 'civicos-dev');
    sessionUserIds.push(user!.id);
    mockSessionCookie(token);
    const response = await healthWorkerGET();
    expect(response.status).toBe(200);
  });

  it('still denies business roles on health/worker', async () => {
    const token = await loginAs('hientruong@civicos.local');
    const user = await authenticateLocal(
      'hientruong@civicos.local',
      'civicos-dev',
    );
    sessionUserIds.push(user!.id);
    mockSessionCookie(token);
    const response = await healthWorkerGET();
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: 'FORBIDDEN' });
  });

  it('rejects unauthenticated health/worker reads', async () => {
    mockSessionCookie(undefined);
    const response = await healthWorkerGET();
    expect(response.status).toBe(401);
  });

  it('still blocks system_operator from user management business data', async () => {
    const token = await loginAs('system-operator@civicos.local');
    mockSessionCookie(token);
    const listed = await usersGET();
    expect(listed.status).toBe(403);
    const created = await usersPOST(
      new Request('http://localhost/api/identity/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'operator-elevated@civicos.local',
          name: 'Operator Elevated',
          role: 'commander',
          password: 'civicos-dev-123',
        }),
      }),
    );
    expect(created.status).toBe(403);
    await expect(
      prisma.user.findUnique({
        where: { email: 'operator-elevated@civicos.local' },
      }),
    ).resolves.toBeNull();
  });
});
