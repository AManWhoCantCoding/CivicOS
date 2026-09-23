import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/modules/identity';
import { approveReport, toApiError } from '@/modules/residents';

export async function POST(
  _request: Request,
  context: { params: Promise<{ reportId: string }> },
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  try {
    const { reportId } = await context.params;
    return NextResponse.json({
      report: await approveReport(reportId, user),
    });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.status },
    );
  }
}
