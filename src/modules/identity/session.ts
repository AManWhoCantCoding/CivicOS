import { createHash, randomBytes } from 'node:crypto';

import { cookies } from 'next/headers';

import { prisma } from '@/lib/prisma';

import type { IdentityUser, RoleName } from './contracts';

export const sessionCookieName = 'civicos_session';
const sessionDays = 8;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

async function userFromId(id: string): Promise<IdentityUser | null> {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { roles: { include: { role: true } } },
  });
  if (!user?.active) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? user.email,
    roles: user.roles.map(({ role }) => role.name as RoleName),
    organizationUnitId: user.organizationUnitId ?? undefined,
  };
}

export async function createSession(userId: string): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  });
  return { token, expiresAt };
}

export async function getCurrentUser(): Promise<IdentityUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!session || session.expiresAt <= new Date()) return null;
  return userFromId(session.userId);
}

export async function deleteCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  cookieStore.delete(sessionCookieName);
}
