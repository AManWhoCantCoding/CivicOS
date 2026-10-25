import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/modules/identity';
import { getVehicleStatistics } from '@/modules/vehicles';

export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    return NextResponse.json(await getVehicleStatistics(user));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'STATISTICS_FAILED';
    return NextResponse.json(
      { error: message },
      {
        status:
          message === 'FORBIDDEN' || message === 'ORGANIZATION_SCOPE_FORBIDDEN'
            ? 403
            : 400,
      },
    );
  }
}
