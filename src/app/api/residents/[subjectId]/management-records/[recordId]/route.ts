import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/modules/identity';
import {
  assignRecord,
  getRecord,
  raiseRisk,
  toApiError,
  transferRecord,
  updateRecord,
} from '@/modules/residents';

export async function GET(
  _request: Request,
  context: { params: Promise<{ subjectId: string; recordId: string }> },
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  try {
    const { recordId } = await context.params;
    return NextResponse.json({ record: await getRecord(recordId, user) });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.status },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ subjectId: string; recordId: string }> },
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  try {
    const { recordId } = await context.params;
    const body = (await request.json()) as {
      status?: string;
      riskLevel?: string;
      nextCheckAt?: string;
      baseVersion?: number;
    };
    if (typeof body.baseVersion !== 'number') {
      return NextResponse.json(
        { error: 'BASE_VERSION_REQUIRED' },
        { status: 400 },
      );
    }
    return NextResponse.json({
      record: await updateRecord(
        recordId,
        {
          status: body.status,
          riskLevel: body.riskLevel,
          nextCheckAt: body.nextCheckAt,
          baseVersion: body.baseVersion,
        },
        user,
      ),
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
  context: { params: Promise<{ subjectId: string; recordId: string }> },
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  try {
    const { recordId } = await context.params;
    const body = (await request.json()) as {
      command?: string;
      assigneeUserIds?: string[];
      riskLevel?: string;
      reason?: string;
      targetOrganizationId?: string;
    };
    if (body.command === 'assign') {
      return NextResponse.json({
        result: await assignRecord(
          recordId,
          { assigneeUserIds: body.assigneeUserIds ?? [] },
          user,
        ),
      });
    }
    if (body.command === 'risk') {
      if (typeof body.riskLevel !== 'string') {
        return NextResponse.json(
          { error: 'RISK_LEVEL_REQUIRED' },
          { status: 400 },
        );
      }
      return NextResponse.json({
        record: await raiseRisk(recordId, body.riskLevel, user, body.reason),
      });
    }
    if (body.command === 'transfer') {
      if (typeof body.targetOrganizationId !== 'string') {
        return NextResponse.json(
          { error: 'TARGET_ORGANIZATION_REQUIRED' },
          { status: 400 },
        );
      }
      return NextResponse.json({
        record: await transferRecord(recordId, body.targetOrganizationId, user),
      });
    }
    return NextResponse.json({ error: 'UNKNOWN_COMMAND' }, { status: 400 });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.status },
    );
  }
}
