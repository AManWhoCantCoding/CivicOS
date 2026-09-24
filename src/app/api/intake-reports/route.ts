import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/modules/identity';
import {
  listIntakeReports,
  parseIntakeReport,
  registerIntakeReport,
} from '@/modules/incidents';

function intakeErrorStatus(message: string): number {
  if (message === 'FORBIDDEN') return 403;
  if (
    message.startsWith('INVALID_') ||
    message.endsWith('_REQUIRED') ||
    message === 'GEOPOINT_INCOMPLETE' ||
    message === 'CONTENT_REQUIRED'
  ) {
    return 400;
  }
  return 500;
}

export async function POST(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
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
    const status = intakeErrorStatus(message);
    return NextResponse.json(
      { error: status === 500 ? 'INTAKE_FAILED' : message },
      { status },
    );
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  try {
    const url = new URL(request.url);
    const reports = await listIntakeReports(user, {
      status: url.searchParams.get('status') ?? undefined,
      sourceChannel: url.searchParams.get('sourceChannel') ?? undefined,
      sla: url.searchParams.get('sla') ?? undefined,
    });
    return NextResponse.json({ reports });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'INTAKE_FAILED';
    const status = intakeErrorStatus(message);
    return NextResponse.json(
      { error: status === 500 ? 'INTAKE_FAILED' : message },
      { status },
    );
  }
}
