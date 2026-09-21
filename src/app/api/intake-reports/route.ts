import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/modules/identity';
import { parseIntakeReport, registerIntakeReport } from '@/modules/incidents';

export async function POST(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    const result = await registerIntakeReport(
      {
        ...parseIntakeReport(await request.json()),
        idempotencyKey: request.headers.get('Idempotency-Key') ?? undefined,
      },
      user,
    );
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'INTAKE_FAILED';
    const status =
      message === 'FORBIDDEN'
        ? 403
        : message.startsWith('INVALID_') ||
            message.endsWith('_REQUIRED') ||
            message === 'GEOPOINT_INCOMPLETE'
          ? 400
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
