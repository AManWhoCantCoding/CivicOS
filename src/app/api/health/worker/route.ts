import { NextResponse } from 'next/server';

import { getOutboxHealth } from '@/modules/eventing';
import { getCurrentUser, requireRole } from '@/modules/identity';

export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    requireRole(
      user,
      'commander',
      'superior_commander',
      'system_operator',
      'supervisor',
    );
    return NextResponse.json(await getOutboxHealth());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'HEALTH_FAILED';
    return NextResponse.json(
      { error: message },
      { status: message === 'FORBIDDEN' ? 403 : 500 },
    );
  }
}
