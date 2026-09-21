import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/modules/identity';
import {
  listEstablishments,
  registerEstablishment,
} from '@/modules/inspections';
import {
  parseEstablishmentInput,
  toApiError,
} from '@/modules/inspections/schemas';

export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    return NextResponse.json({
      establishments: await listEstablishments(user),
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
