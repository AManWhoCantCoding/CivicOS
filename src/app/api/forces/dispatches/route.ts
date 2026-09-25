import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/modules/identity';
import { listDispatches } from '@/modules/mobile-readonly';
import { mobileErrorResponse } from '@/modules/mobile-readonly/http';

export async function GET(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const params = new URL(request.url).searchParams;
  try {
    return NextResponse.json(
      await listDispatches(user, {
        page: Number(params.get('page') ?? 1),
        pageSize: Number(params.get('pageSize') ?? 20),
        q: params.get('q') ?? undefined,
        status: params.get('status') ?? undefined,
        incidentId: params.get('incidentId') ?? undefined,
      }),
    );
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
