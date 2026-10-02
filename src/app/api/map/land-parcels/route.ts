import { NextResponse } from 'next/server';

import { auditLandEvent, requireLandActor } from '@/modules/land/access';
import { toLandApiError } from '@/modules/land/errors';
import { getLandParcelMapDiscovery } from '@/modules/land/parcel-map-discovery';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

// Map service errors to the stable contract without leaking shape detail.
// Stored projection content that cannot be served safely is a layer failure
// (503 MAP_LAYER_FAILED) per the locked map API contract, not a land domain
// rejection. Every discovery response is no-store, including errors.
function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof Error && error.message === 'MAP_PROVIDER_UNAVAILABLE') {
    return NextResponse.json(
      {
        code: 'MAP_PROVIDER_UNAVAILABLE',
        error: 'Bản đồ nền hiện không khả dụng.',
      },
      { status: 503, headers: { ...NO_STORE_HEADERS } },
    );
  }
  const apiError = toLandApiError(error);
  const mapped =
    apiError.code === 'LAND_GEOMETRY_INVALID'
      ? toLandApiError(new Error('MAP_LAYER_FAILED'))
      : apiError;
  return NextResponse.json(
    { code: mapped.code, error: mapped.error },
    { status: mapped.status, headers: { ...NO_STORE_HEADERS } },
  );
}

// GET /api/map/land-parcels: P1 web-only scoped discovery (T-008). Same land
// policy boundary as the P0 single-parcel route; the P0 `/{parcelId}`
// semantics are untouched. Bounded `items` plus `nextCursor` under the P0
// map allowlist; empty unbounded queries fail closed and successful reads
// record a minimal discovery audit with no raw shape or sensitive detail.
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireLandActor();
    const params = new URL(request.url).searchParams;
    const raw: Record<string, string> = {};
    params.forEach((value, key) => {
      if (!(key in raw)) raw[key] = value;
    });
    const discovery = await getLandParcelMapDiscovery(actor, raw);
    await auditLandEvent(actor, {
      resourceType: 'LandParcel',
      resourceId: actor.organizationUnitId,
      operation: 'land.parcel.map.discovery',
      metadata: {
        outcome: 'allowed',
        returnedCount: discovery.items.length,
        hasNextPage: discovery.nextCursor !== null,
      },
    });
    return NextResponse.json(discovery, {
      headers: { ...NO_STORE_HEADERS },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
