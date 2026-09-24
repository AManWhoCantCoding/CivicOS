import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/modules/identity';
import { getIntakeReport } from '@/modules/incidents';

export async function GET(
  _request: Request,
  context: { params: Promise<{ reportId: string }> },
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  try {
    const { reportId } = await context.params;
    return NextResponse.json(await getIntakeReport(reportId, user));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'INTAKE_FAILED';
    const status =
      message === 'FORBIDDEN'
        ? 403
        : message === 'INTAKE_NOT_FOUND'
          ? 404
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
