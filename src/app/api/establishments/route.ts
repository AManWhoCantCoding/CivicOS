import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/modules/identity';
import {
  listEstablishments,
  registerEstablishment,
} from '@/modules/inspections';

export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  return NextResponse.json({ establishments: await listEstablishments(user) });
}

export async function POST(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    return NextResponse.json(
      {
        establishment: await registerEstablishment(await request.json(), user),
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'ESTABLISHMENT_FAILED';
    return NextResponse.json(
      { error: message },
      { status: message === 'FORBIDDEN' ? 403 : 400 },
    );
  }
}
