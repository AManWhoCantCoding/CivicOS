import { NextResponse } from 'next/server';

import { retryApplicationSync, toLandApiError } from '@/modules/land';
import { requireLandActor } from '@/modules/land/access';
import { parseReviewBody, parseReviewVersion } from '@/modules/land/schemas';
import { readLandJsonBody } from '@/app/api/land/json-body';

// Map service errors to LAND_* bodies without leaking internals.
function toErrorResponse(error: unknown): NextResponse {
  const apiError = toLandApiError(error);
  return NextResponse.json(
    { code: apiError.code, error: apiError.error },
    { status: apiError.status },
  );
}

// POST /api/land/applications/{applicationId}/sync/retry: sync_failed -> pending_approval/sync_failed.
// Requires If-Match-Version integer header and exactly {} body; assigned
// land_officer only via the service seam. Same stable requestKey; attempts
// increments without duplicating the operation row. Fixture outcome comes
// from server/test configuration; the client never sends it.
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
      rawBody = await readLandJsonBody(request);
    } catch {
      throw new Error('INVALID_REQUEST');
    }
    parseReviewBody(rawBody);
    const result = await retryApplicationSync(
      applicationId,
      actor,
      expectedVersion,
      rawBody,
    );
    if (result.sync.status === 'failed') {
      const apiError = toLandApiError(new Error('SYNC_FAILED'));
      return NextResponse.json(
        {
          code: apiError.code,
          error: apiError.error,
          application: result.application,
          sync: result.sync,
        },
        { status: apiError.status },
      );
    }
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
