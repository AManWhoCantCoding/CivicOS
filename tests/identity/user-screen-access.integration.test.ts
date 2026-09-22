import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { POST as usersPOST } from '@/app/api/identity/users/route';
import { prisma } from '@/lib/prisma';
import {
  authenticateLocal,
  createIdentityUser,
  createSession,
  ensureDevelopmentUsers,
  listIdentityUsers,
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

describe.skipIf(!postgresEnabled)('user screen access seam', () => {
  const sessionUserIds: string[] = [];

  beforeAll(async () => {
    await ensureDevelopmentUsers();
  });

  afterAll(async () => {
    await prisma.session.deleteMany({
      where: { userId: { in: sessionUserIds } },
    });
  });

  it('denies user listing to non-commander roles', async () => {
    const member = await authenticateLocal(
      'hientruong@civicos.local',
      'civicos-dev',
    );
    expect(member).not.toBeNull();
    await expect(listIdentityUsers(member!)).rejects.toThrow('FORBIDDEN');
  });

  it('denies self role elevation through user creation', async () => {
    const member = await authenticateLocal(
      'hientruong@civicos.local',
      'civicos-dev',
    );
    expect(member).not.toBeNull();
    await expect(
      createIdentityUser(
        {
          email: 'self-elevated@civicos.local',
          name: 'Self Elevated',
          role: 'commander',
          password: 'civicos-dev-123',
        },
        member!,
      ),
    ).rejects.toThrow('FORBIDDEN');
    await expect(
      prisma.user.findUnique({
        where: { email: 'self-elevated@civicos.local' },
      }),
    ).resolves.toBeNull();
  });

  it('denies user creation at the route for non-commander sessions', async () => {
    const member = await authenticateLocal(
      'hientruong@civicos.local',
      'civicos-dev',
    );
    const session = await createSession(member!.id);
    sessionUserIds.push(member!.id);
    mockSessionCookie(session.token);
    const response = await usersPOST(
      new Request('http://localhost/api/identity/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'route-elevated@civicos.local',
          name: 'Route Elevated',
          role: 'commander',
          password: 'civicos-dev-123',
        }),
      }),
    );
    expect(response.status).toBe(403);
    await expect(
      prisma.user.findUnique({
        where: { email: 'route-elevated@civicos.local' },
      }),
    ).resolves.toBeNull();
  });
});
