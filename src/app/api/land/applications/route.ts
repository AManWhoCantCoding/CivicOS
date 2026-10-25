import { NextResponse } from 'next/server';

import {
  createApplication,
  listApplications,
  toLandApiError,
} from '@/modules/land';
import { requireLandActor } from '@/modules/land/access';
import {
  parseApplicationInput,
  parseApplicationListQuery,
} from '@/modules/land/schemas';
import { readLandJsonBody } from '../json-body';

// Map service errors to LAND_* bodies without leaking internals.
function toErrorResponse(error: unknown): NextResponse {
  const apiError = toLandApiError(error);
  return NextResponse.json(
    { code: apiError.code, error: apiError.error },
    { status: apiError.status },
  );
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireLandActor();
    const query = parseApplicationListQuery(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return NextResponse.json(await listApplications(query, actor));
  } catch (error) {
    return toErrorResponse(error);
  }
}

// POST /api/land/applications: create at submitted/version 1.
// Idempotency-Key is required; safe replay returns the stored application.
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireLandActor();
    const idempotencyKey = request.headers.get('idempotency-key') ?? '';
    const input = parseApplicationInput(await readLandJsonBody(request));
    const { application, replayed } = await createApplication(
      input,
      actor,
      idempotencyKey,
    );
    return NextResponse.json({ application }, { status: replayed ? 200 : 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
