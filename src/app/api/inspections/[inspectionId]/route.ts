import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/modules/identity';
import { getInspection, toApiError } from '@/modules/inspections';
import { POST as canonicalPost } from './commands/route';

export async function GET(
  _request: Request,
  context: { params: Promise<{ inspectionId: string }> },
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    return NextResponse.json(
      await getInspection((await context.params).inspectionId, user),
    );
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.status },
    );
  }
}

export const POST = canonicalPost;
