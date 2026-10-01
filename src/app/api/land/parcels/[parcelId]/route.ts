import { NextResponse } from 'next/server';

import { getParcelDetail, toLandApiError } from '@/modules/land';
import { requireLandActor } from '@/modules/land/access';

// Map service errors to LAND_* bodies without leaking internals.
function toErrorResponse(error: unknown): NextResponse {
  const apiError = toLandApiError(error);
  return NextResponse.json(
    { code: apiError.code, error: apiError.error },
    { status: apiError.status },
  );
}

// GET /api/land/parcels/{parcelId}: internal parcel detail with full
// rights/encumbrances history. No query/body, no mutation (DR-22).
export async function GET(
  _request: Request,
  context: { params: Promise<{ parcelId: string }> },
): Promise<NextResponse> {
  try {
    const actor = await requireLandActor();
    const { parcelId } = await context.params;
    return NextResponse.json(await getParcelDetail(parcelId, actor));
  } catch (error) {
    return toErrorResponse(error);
  }
}
