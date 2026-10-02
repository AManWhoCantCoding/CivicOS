import { NextResponse } from 'next/server';

import { auditLandEvent, requireLandActor } from '@/modules/land/access';
import { toLandApiError } from '@/modules/land/errors';
import { getLandParcelMapProjection } from '@/modules/land/parcel-map-projection';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

// Map service errors to the stable LAND_* contract without leaking
// geometry or resource detail. Every map polygon response is no-store,
// including error responses.
function toErrorResponse(error: unknown): NextResponse {
  const apiError = toLandApiError(error);
  return NextResponse.json(
    { code: apiError.code, error: apiError.error },
    { status: apiError.status, headers: { ...NO_STORE_HEADERS } },
  );
}

// GET /api/map/land-parcels/{parcelId}: scoped single-parcel map read
// projection (T-002). Land policy only: requireLandActor plus the T-001
// projection service (requireParcelDetailAccess before geometry is
// serialized). Never the public lookup or the legacy generic map
// capability. Successful reads record a minimal map-view audit.
export async function GET(
  _request: Request,
  context: { params: Promise<{ parcelId: string }> },
): Promise<NextResponse> {
  try {
    const actor = await requireLandActor();
    const { parcelId } = await context.params;
    const projection = await getLandParcelMapProjection(parcelId, actor);
    await auditLandEvent(actor, {
      resourceType: 'LandParcel',
      resourceId: projection.parcel.id,
      operation: 'land.parcel.map.viewed',
      metadata: { outcome: 'allowed' },
    });
    return NextResponse.json(projection, {
      headers: { ...NO_STORE_HEADERS },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
