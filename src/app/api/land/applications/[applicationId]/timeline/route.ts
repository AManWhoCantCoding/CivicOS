import { NextResponse } from 'next/server';

import { listApplicationTimeline, toLandApiError } from '@/modules/land';
import { requireLandActor } from '@/modules/land/access';

// Map service errors to LAND_* bodies without leaking internals.
function toErrorResponse(error: unknown): NextResponse {
  const apiError = toLandApiError(error);
  return NextResponse.json(
    { code: apiError.code, error: apiError.error },
    { status: apiError.status },
  );
}

// GET /api/land/applications/{applicationId}/timeline: safe event timeline.
// Scoped officer with assignment or same-OU leader via the service seam;
// unauthorized bodies carry only code/error, never events or detail.
export async function GET(
  _request: Request,
  context: { params: Promise<{ applicationId: string }> },
): Promise<NextResponse> {
  try {
    const actor = await requireLandActor();
    const { applicationId } = await context.params;
    return NextResponse.json(
      await listApplicationTimeline(applicationId, actor),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
