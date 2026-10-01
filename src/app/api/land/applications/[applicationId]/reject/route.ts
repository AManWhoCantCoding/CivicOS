import { NextResponse } from 'next/server';

import { rejectApplication, toLandApiError } from '@/modules/land';
import { requireLandActor } from '@/modules/land/access';
import { parseRejectBody, parseReviewVersion } from '@/modules/land/schemas';

// Map service errors to LAND_* bodies without leaking internals.
function toErrorResponse(error: unknown): NextResponse {
  const apiError = toLandApiError(error);
  return NextResponse.json(
    { code: apiError.code, error: apiError.error },
    { status: apiError.status },
  );
}

// POST /api/land/applications/{applicationId}/reject: submitted/in_review/
// pending_approval -> rejected. Requires If-Match-Version integer header and
// { reason: string } with trimmed non-empty text; blank reason is 400 with no
// state change. commune_leader same OU only; rejected never mutates land.
export async function POST(
  request: Request,
  context: { params: Promise<{ applicationId: string }> },
): Promise<NextResponse> {
  try {
    const actor = await requireLandActor();
    const { applicationId } = await context.params;
    const expectedVersion = parseReviewVersion(
      request.headers.get('If-Match-Version'),
    );
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      throw new Error('INVALID_REQUEST');
    }
    const body = parseRejectBody(rawBody);
    return NextResponse.json(
      await rejectApplication(applicationId, actor, expectedVersion, body),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
