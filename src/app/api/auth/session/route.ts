import { NextResponse } from 'next/server';

import {
  authenticateLocal,
  createSession,
  deleteCurrentSession,
  ensureDevelopmentUsers,
  getCurrentUser,
  sessionCookieName,
} from '@/modules/identity';

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ user: await getCurrentUser() });
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as { email?: string; password?: string };
  await ensureDevelopmentUsers();
  const user = await authenticateLocal(body.email ?? '', body.password ?? '');
  if (!user)
    return NextResponse.json({ error: 'INVALID_CREDENTIALS' }, { status: 401 });

  const session = await createSession(user.id);
  const response = NextResponse.json({ user });
  response.cookies.set(sessionCookieName, session.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: session.expiresAt,
    path: '/',
  });
  return response;
}

export async function DELETE(): Promise<NextResponse> {
  await deleteCurrentSession();
  return NextResponse.json({ ok: true });
}
