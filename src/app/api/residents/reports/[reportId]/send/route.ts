import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/modules/identity';
import { sendReport, toApiError } from '@/modules/residents';

export async function POST(
  request: Request,
  context: { params: Promise<{ reportId: string }> },
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  try {
    const { reportId } = await context.params;
    const body = (await request.json()) as {
      targetOrganizationId?: string;
    };
    if (!body.targetOrganizationId) {
      return NextResponse.json(
        { error: 'TARGET_ORGANIZATION_REQUIRED' },
        { status: 400 },
      );
    }
    return NextResponse.json({
      report: await sendReport(reportId, body.targetOrganizationId, user),
    });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.status },
    );
  }
}
