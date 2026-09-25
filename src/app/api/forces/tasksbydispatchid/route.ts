import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/modules/identity';
import { listTasksByDispatchId } from '@/modules/mobile-readonly';
import { mobileErrorResponse } from '@/modules/mobile-readonly/http';

export async function GET(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const dispatchId = new URL(request.url).searchParams.get('dispatchId');
  if (!dispatchId)
    return NextResponse.json({ error: 'INVALID_DISPATCH_ID' }, { status: 400 });
  try {
    return NextResponse.json(await listTasksByDispatchId(user, dispatchId));
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
