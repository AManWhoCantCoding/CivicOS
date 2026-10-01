import { NextResponse } from 'next/server';

import { createParcel, listParcels, toLandApiError } from '@/modules/land';
import { requireLandActor } from '@/modules/land/access';
import { parseLandListQuery, parseParcelInput } from '@/modules/land/schemas';

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
    return NextResponse.json(await listParcels(query, actor));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireLandActor();
    const input = parseParcelInput(await request.json());
    return NextResponse.json(
      { parcel: await createParcel(input, actor) },
      { status: 201 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
