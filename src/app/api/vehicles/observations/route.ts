import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/modules/identity';
import { listObservations, recordVehicleObservation } from '@/modules/vehicles';

export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    return NextResponse.json({ observations: await listObservations(user) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'OBSERVATION_FAILED';
    return NextResponse.json(
      { error: message },
      { status: message === 'FORBIDDEN' ? 403 : 500 },
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    return NextResponse.json(
      { result: await recordVehicleObservation(await request.json(), user) },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'OBSERVATION_FAILED';
    return NextResponse.json(
      { error: message },
      { status: message === 'FORBIDDEN' ? 403 : 400 },
    );
  }
}
