import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/modules/identity';
import { getTask } from '@/modules/mobile-readonly';
import { mobileErrorResponse } from '@/modules/mobile-readonly/http';

export async function GET(
  _request: Request,
  context: { params: Promise<{ taskId: string }> },
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    return NextResponse.json(
      await getTask(user, (await context.params).taskId),
    );
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
