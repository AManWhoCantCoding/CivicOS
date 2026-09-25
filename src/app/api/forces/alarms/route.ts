import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/modules/identity';
import { listAlarms } from '@/modules/mobile-readonly';
import { mobileErrorResponse } from '@/modules/mobile-readonly/http';

export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    return NextResponse.json(await listAlarms(user));
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
