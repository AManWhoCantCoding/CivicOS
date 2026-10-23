import { createHash, randomBytes } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  sessionDeleteMany: vi.fn(),
}));

vi.mock('next/headers', () => ({ cookies: mocks.cookies }));
vi.mock('@/lib/prisma', () => ({
  prisma: { session: { deleteMany: mocks.sessionDeleteMany } },
}));

import {
  deleteCurrentSession,
  sessionCookieName,
} from '@/modules/identity/session';

describe('NGOÀI BASELINE — CIVICOS PILOT 01 — REVIEW SESSION LOGOUT FAILURE (PO-approved chat request) session cleanup', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes only by the hash of the cookie token and clears the cookie', async () => {
    const token = randomBytes(32).toString('hex');
    const expectedHash = createHash('sha256').update(token).digest('hex');
    const cookieStore = {
      get: vi.fn().mockReturnValue({ value: token }),
      delete: vi.fn(),
    };
    mocks.cookies.mockResolvedValue(cookieStore);

    await deleteCurrentSession();

    expect(cookieStore.get).toHaveBeenCalledWith(sessionCookieName);
    expect(mocks.sessionDeleteMany).toHaveBeenCalledOnce();
    expect(mocks.sessionDeleteMany).toHaveBeenCalledWith({
      where: { tokenHash: expectedHash },
    });
    expect(cookieStore.delete).toHaveBeenCalledWith(sessionCookieName);
  });

  it('clears the cookie without a database delete when no token is present', async () => {
    const cookieStore = {
      get: vi.fn().mockReturnValue(undefined),
      delete: vi.fn(),
    };
    mocks.cookies.mockResolvedValue(cookieStore);

    await deleteCurrentSession();

    expect(cookieStore.get).toHaveBeenCalledWith(sessionCookieName);
    expect(mocks.sessionDeleteMany).not.toHaveBeenCalled();
    expect(cookieStore.delete).toHaveBeenCalledWith(sessionCookieName);
  });
});
