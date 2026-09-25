import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/modules/identity';
import { inspectionStats, toApiError } from '@/modules/inspections';

export async function GET(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const params = new URL(request.url).searchParams;
  try {
    return NextResponse.json({
      stats: await inspectionStats(user, {
        from: params.get('from') ?? undefined,
        to: params.get('to') ?? undefined,
        establishmentType: params.get('establishmentType') ?? undefined,
      }),
    });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.status },
    );
  }
}
