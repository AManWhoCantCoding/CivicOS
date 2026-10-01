import { NextResponse } from 'next/server';

import { getApplicationDetail, toLandApiError } from '@/modules/land';
import { requireLandActor } from '@/modules/land/access';

// Map service errors to LAND_* bodies without leaking internals.
function toErrorResponse(error: unknown): NextResponse {
  const apiError = toLandApiError(error);
  return NextResponse.json(
    { code: apiError.code, error: apiError.error },
    { status: apiError.status },
  );
}

// GET /api/land/applications/{applicationId}: scoped application detail.
// Unauthorized responses carry only code/error, never changePayload.
export async function GET(
  _request: Request,
  context: { params: Promise<{ applicationId: string }> },
): Promise<NextResponse> {
  try {
    const actor = await requireLandActor();
    const { applicationId } = await context.params;
    return NextResponse.json(await getApplicationDetail(applicationId, actor));
  } catch (error) {
    return toErrorResponse(error);
  }
}
