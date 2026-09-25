import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/modules/identity';
import {
  countRelatedInfo,
  parseRelatedInfoQuery,
} from '@/modules/mobile-readonly';
import { mobileErrorResponse } from '@/modules/mobile-readonly/http';

export async function GET(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    return NextResponse.json(
      await countRelatedInfo(
        user,
        parseRelatedInfoQuery(new URL(request.url).searchParams),
      ),
    );
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
