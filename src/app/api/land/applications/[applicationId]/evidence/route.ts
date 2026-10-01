import { NextResponse } from 'next/server';

import {
  MAX_EVIDENCE_SIZE_BYTES,
  listEvidence,
  toLandApiError,
  uploadEvidence,
} from '@/modules/land';
import { requireLandActor } from '@/modules/land/access';

function toErrorResponse(error: unknown): NextResponse {
  const apiError = toLandApiError(error);
  return NextResponse.json(
    { code: apiError.code, error: apiError.error },
    { status: apiError.status },
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ applicationId: string }> },
): Promise<NextResponse> {
  try {
    const actor = await requireLandActor();
    const { applicationId } = await context.params;
    const form = await request.formData();
    const file = form.get('file');
    const description = form.get('description');
    if (!(file instanceof File)) throw new Error('INVALID_REQUEST');
    if (file.size > MAX_EVIDENCE_SIZE_BYTES)
      throw new Error('EVIDENCE_TOO_LARGE');
    if (description !== null && typeof description !== 'string') {
      throw new Error('INVALID_REQUEST');
    }
    const evidence = await uploadEvidence(
      {
        resourceType: 'LandChangeApplication',
        resourceId: applicationId,
        fileName: file.name,
        mimeType: file.type,
        bytes: new Uint8Array(await file.arrayBuffer()),
        description,
      },
      actor,
    );
    return NextResponse.json({ evidence }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ applicationId: string }> },
): Promise<NextResponse> {
  try {
    const actor = await requireLandActor();
    const { applicationId } = await context.params;
    return NextResponse.json({
      evidence: await listEvidence(
        'LandChangeApplication',
        applicationId,
        actor,
      ),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
