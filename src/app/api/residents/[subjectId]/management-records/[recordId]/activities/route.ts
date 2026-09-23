import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/modules/identity';
import { getRecord, recordActivity, toApiError } from '@/modules/residents';

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ subjectId: string; recordId: string }>;
  },
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  try {
    const { recordId } = await context.params;
    const record = await getRecord(recordId, user);
    return NextResponse.json({ activities: record.activities });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.status },
    );
  }
}

export async function POST(
  request: Request,
  context: {
    params: Promise<{ subjectId: string; recordId: string }>;
  },
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  try {
    const { recordId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const activity = await recordActivity(
      {
        recordId,
        activityType:
          typeof body.activityType === 'string' ? body.activityType : 'checkup',
        occurredAt:
          typeof body.occurredAt === 'string'
            ? body.occurredAt
            : new Date().toISOString(),
        content: typeof body.content === 'string' ? body.content : '',
        evaluation:
          typeof body.evaluation === 'string' ? body.evaluation : undefined,
        latitude: typeof body.latitude === 'number' ? body.latitude : undefined,
        longitude:
          typeof body.longitude === 'number' ? body.longitude : undefined,
        evidenceIds: Array.isArray(body.evidenceIds)
          ? (body.evidenceIds as string[])
          : undefined,
        assignmentId:
          typeof body.assignmentId === 'string' ? body.assignmentId : undefined,
        idempotencyKey:
          typeof body.idempotencyKey === 'string'
            ? body.idempotencyKey
            : undefined,
      },
      user,
    );
    return NextResponse.json({ activity }, { status: 201 });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.status },
    );
  }
}
