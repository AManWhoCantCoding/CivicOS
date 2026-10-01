import { NextResponse } from 'next/server';

import { lookupPublicLand, toLandApiError } from '@/modules/land';
import { parsePublicLandLookupQuery } from '@/modules/land/schemas';

function toErrorResponse(error: unknown): NextResponse {
  const apiError = toLandApiError(error);
  return NextResponse.json(
    { code: apiError.code, error: apiError.error },
    { status: apiError.status },
  );
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const firstForwarded = forwarded?.split(',')[0]?.trim();
  return (
    firstForwarded || request.headers.get('x-real-ip')?.trim() || 'unknown'
  );
}

// GET /api/public/land/lookup: anonymous, projection-only land lookup.
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const query = parsePublicLandLookupQuery(new URL(request.url).searchParams);
    return NextResponse.json(await lookupPublicLand(query, clientIp(request)));
  } catch (error) {
    return toErrorResponse(error);
  }
}
