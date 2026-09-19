import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/modules/identity';
import { getEstablishment, updateEstablishment } from '@/modules/inspections';

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
    const message =
      error instanceof Error ? error.message : 'ESTABLISHMENT_FAILED';
    return NextResponse.json(
      { error: message },
      {
        status:
          message === 'FORBIDDEN'
            ? 403
            : message.includes('NOT_FOUND')
              ? 404
              : 400,
      },
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
        { ...(await request.json()), establishmentId },
        user,
      ),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'ESTABLISHMENT_FAILED';
    return NextResponse.json(
      { error: message },
      {
        status:
          message === 'FORBIDDEN'
            ? 403
            : message.includes('NOT_FOUND')
              ? 404
              : 400,
      },
    );
  }
}
