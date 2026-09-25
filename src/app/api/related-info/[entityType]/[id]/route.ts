import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/modules/identity';
import { getRelatedInfoDetail } from '@/modules/mobile-readonly';
import { mobileErrorResponse } from '@/modules/mobile-readonly/http';

export async function GET(
  _request: Request,
  context: { params: Promise<{ entityType: string; id: string }> },
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    const { entityType, id } = await context.params;
    return NextResponse.json(
      await getRelatedInfoDetail(user, entityType.toUpperCase() as never, id),
    );
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
