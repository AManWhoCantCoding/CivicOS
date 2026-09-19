import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/modules/identity';
import { listIncidents } from '@/modules/incidents';

export async function GET(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const url = new URL(request.url);
  return NextResponse.json({
    incidents: await listIncidents(user, {
      status: url.searchParams.get('status') ?? undefined,
      category: url.searchParams.get('category') ?? undefined,
    }),
  });
}
