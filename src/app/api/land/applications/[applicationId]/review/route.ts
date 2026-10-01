import { NextResponse } from 'next/server';

import { reviewApplication, toLandApiError } from '@/modules/land';
import { requireLandActor } from '@/modules/land/access';
import { parseReviewBody, parseReviewVersion } from '@/modules/land/schemas';

// Map service errors to LAND_* bodies without leaking internals.
function toErrorResponse(error: unknown): NextResponse {
  const apiError = toLandApiError(error);
  return NextResponse.json(
    { code: apiError.code, error: apiError.error },
    { status: apiError.status },
  );
}

// POST /api/land/applications/{applicationId}/review: submitted -> in_review.
// Requires If-Match-Version integer header and exactly {} body; assigned
// land_officer only via the service seam.
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
    parseReviewBody(rawBody);
    return NextResponse.json(
      await reviewApplication(applicationId, actor, expectedVersion, rawBody),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
