import { NextResponse } from 'next/server';

import { listParties, toLandApiError } from '@/modules/land';
import { requireLandActor } from '@/modules/land/access';
import { parseLandListQuery } from '@/modules/land/schemas';

// Map service errors to LAND_* bodies without leaking internals.
function toErrorResponse(error: unknown): NextResponse {
  const apiError = toLandApiError(error);
  return NextResponse.json(
    { code: apiError.code, error: apiError.error },
    { status: apiError.status },
  );
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireLandActor();
    const query = parseLandListQuery(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return NextResponse.json(await listParties(query, actor));
  } catch (error) {
    return toErrorResponse(error);
  }
}
