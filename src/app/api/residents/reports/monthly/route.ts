import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/modules/identity';
import {
  generateMonthlyReport,
  listReportPreviews,
  toApiError,
} from '@/modules/residents';

export async function GET(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  try {
    const url = new URL(request.url);
    const organizationId =
      url.searchParams.get('organizationId') ?? user.organizationUnitId ?? '';
    if (!organizationId) {
      return NextResponse.json(
        { error: 'ORGANIZATION_REQUIRED' },
        { status: 400 },
      );
    }
    return NextResponse.json({
      reports: await listReportPreviews(organizationId, user),
    });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.status },
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  try {
    const body = (await request.json()) as {
      organizationId?: string;
      period?: string;
      idempotencyKey?: string;
    };
    if (!body.organizationId || !body.period) {
      return NextResponse.json(
        { error: 'ORGANIZATION_AND_PERIOD_REQUIRED' },
        { status: 400 },
      );
    }
    const report = await generateMonthlyReport(
      {
        organizationId: body.organizationId,
        period: body.period,
        idempotencyKey: body.idempotencyKey,
      },
      user,
    );
    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.status },
    );
  }
}
