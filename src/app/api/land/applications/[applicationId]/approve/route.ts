import { NextResponse } from 'next/server';

import { approveApplication, toLandApiError } from '@/modules/land';
import { requireLandActor } from '@/modules/land/access';
import { parseApproveBody, parseReviewVersion } from '@/modules/land/schemas';
import { readLandJsonBody } from '@/app/api/land/json-body';

// Map service errors to LAND_* bodies without leaking internals.
function toErrorResponse(error: unknown): NextResponse {
  const apiError = toLandApiError(error);
  return NextResponse.json(
    { code: apiError.code, error: apiError.error },
    { status: apiError.status },
  );
}

// POST /api/land/applications/{applicationId}/approve: pending_approval ->
// completed with land effects. Requires If-Match-Version integer header and
// { reason?: string | null } body; commune_leader same OU only via the
// service seam. Terminal or wrong-status rows are 409 with no new Approval.
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
    const body = parseApproveBody(rawBody);
    return NextResponse.json(
      await approveApplication(applicationId, actor, expectedVersion, body),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
