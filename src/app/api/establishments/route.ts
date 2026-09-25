import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/modules/identity';
import {
  listEstablishments,
  parseEstablishmentInput,
  registerEstablishment,
  toApiError,
} from '@/modules/inspections';

export async function GET(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    return NextResponse.json({
      establishments: await listEstablishments(user, {
        type: new URL(request.url).searchParams.get('type') ?? undefined,
        risk: new URL(request.url).searchParams.get('risk') ?? undefined,
        status: new URL(request.url).searchParams.get('status') ?? undefined,
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

export async function POST(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    return NextResponse.json(
      {
        establishment: await registerEstablishment(
          parseEstablishmentInput(await request.json()),
          user,
        ),
      },
      { status: 201 },
    );
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.status },
    );
  }
}
