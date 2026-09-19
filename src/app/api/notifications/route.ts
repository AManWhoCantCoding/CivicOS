import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/modules/identity';
import { listNotifications, markNotificationRead } from '@/modules/platform';

export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  return NextResponse.json({ notifications: await listNotifications(user.id) });
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const body = (await request.json()) as { notificationId?: string };
  if (!body.notificationId)
    return NextResponse.json(
      { error: 'INVALID_NOTIFICATION' },
      { status: 400 },
    );
  const result = await markNotificationRead(user.id, body.notificationId);
  if (!result.count)
    return NextResponse.json(
      { error: 'NOTIFICATION_NOT_FOUND' },
      { status: 404 },
    );
  return NextResponse.json({ ok: true });
}
