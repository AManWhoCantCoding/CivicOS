import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/modules/identity';
import {
  createManagementRecord,
  listManagementRecords,
  toApiError,
} from '@/modules/residents';

export async function GET(
  _request: Request,
  context: { params: Promise<{ subjectId: string }> },
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  try {
    const { subjectId } = await context.params;
    return NextResponse.json({
      records: await listManagementRecords(subjectId, user),
    });
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
  context: { params: Promise<{ subjectId: string }> },
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  try {
    const { subjectId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const record = await createManagementRecord(
      {
        subjectId,
        purpose: body.purpose as never,
        riskLevel:
          typeof body.riskLevel === 'string' ? body.riskLevel : undefined,
        sourceOrganizationId:
          typeof body.sourceOrganizationId === 'string'
            ? body.sourceOrganizationId
            : undefined,
        assignedOrganizationId:
          typeof body.assignedOrganizationId === 'string'
            ? body.assignedOrganizationId
            : undefined,
      },
      user,
    );
    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.status },
    );
  }
}
