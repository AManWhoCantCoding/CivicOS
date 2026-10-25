import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/modules/identity';
import {
  listIncidents,
  parseIncident,
  registerIncident,
} from '@/modules/incidents';

function incidentErrorStatus(message: string): number {
  if (message === 'FORBIDDEN') return 403;
  if (
    message.startsWith('INVALID_') ||
    message.endsWith('_REQUIRED') ||
    message === 'GEOPOINT_INCOMPLETE' ||
    message === 'DESCRIPTION_REQUIRED'
  ) {
    return 400;
  }
  return 500;
}

export async function GET(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    const url = new URL(request.url);
    return NextResponse.json({
      incidents: await listIncidents(user, {
        status: url.searchParams.get('status') ?? undefined,
        category: url.searchParams.get('category') ?? undefined,
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'INCIDENT_FAILED';
    return NextResponse.json(
      { error: message },
      { status: incidentErrorStatus(message) },
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    const result = await registerIncident(
      parseIncident(await request.json()),
      user,
    );
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'INCIDENT_FAILED';
    return NextResponse.json(
      { error: message },
      { status: incidentErrorStatus(message) },
    );
  }
}
