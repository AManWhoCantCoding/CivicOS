import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/modules/identity';
import { getDispatch } from '@/modules/mobile-readonly';
import { mobileErrorResponse } from '@/modules/mobile-readonly/http';

export async function GET(
  _request: Request,
  context: { params: Promise<{ dispatchId: string }> },
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    return NextResponse.json(
      await getDispatch(user, (await context.params).dispatchId),
    );
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
