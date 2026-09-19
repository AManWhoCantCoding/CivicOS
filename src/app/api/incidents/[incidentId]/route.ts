import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/modules/identity';
import { getIncident } from '@/modules/incidents';

export async function GET(
  _request: Request,
  context: { params: Promise<{ incidentId: string }> },
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    const { incidentId } = await context.params;
    return NextResponse.json({ incident: await getIncident(incidentId, user) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'INCIDENT_FAILED';
    return NextResponse.json(
      { error: message },
      { status: message === 'FORBIDDEN' ? 403 : 404 },
    );
  }
}
