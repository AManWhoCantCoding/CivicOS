import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/modules/identity';
import {
  getEstablishment,
  parseEstablishmentPatch,
  toApiError,
  updateEstablishment,
} from '@/modules/inspections';

export async function GET(
  _request: Request,
  context: { params: Promise<{ establishmentId: string }> },
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    const { establishmentId } = await context.params;
    return NextResponse.json({
      establishment: await getEstablishment(establishmentId, user),
    });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.status },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ establishmentId: string }> },
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    const { establishmentId } = await context.params;
    return NextResponse.json({
      establishment: await updateEstablishment(
        {
          ...parseEstablishmentPatch(await request.json()),
          establishmentId,
        },
        user,
      ),
    });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.status },
    );
  }
}
