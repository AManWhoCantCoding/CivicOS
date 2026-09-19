import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/modules/identity';
import {
  escalateVehicleObservation,
  getObservation,
  confirmVehicleMatch,
  verifyVehicleObservation,
} from '@/modules/vehicles';

export async function GET(
  _request: Request,
  context: { params: Promise<{ observationId: string }> },
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    return NextResponse.json(
      await getObservation((await context.params).observationId, user),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'OBSERVATION_FAILED';
    return NextResponse.json(
      { error: message },
      {
        status:
          message === 'FORBIDDEN'
            ? 403
            : message.includes('NOT_FOUND')
              ? 404
              : 400,
      },
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ observationId: string }> },
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const observationId = (await context.params).observationId;
  const body = (await request.json()) as Record<string, unknown>;
  try {
    if (body.command === 'verify')
      return NextResponse.json({
        result: await verifyVehicleObservation(
          {
            observationId,
            result: String(body.result ?? ''),
            notes: String(body.notes ?? ''),
            latitude:
              typeof body.latitude === 'number' ? body.latitude : undefined,
            longitude:
              typeof body.longitude === 'number' ? body.longitude : undefined,
            evidenceIds: Array.isArray(body.evidenceIds)
              ? body.evidenceIds.map(String)
              : [],
          },
          user,
        ),
      });
    if (body.command === 'confirm_match')
      return NextResponse.json({
        observation: await confirmVehicleMatch(observationId, user),
      });
    if (body.command === 'escalate')
      return NextResponse.json({
        observation: await escalateVehicleObservation(
          observationId,
          user,
          String(body.organizationId ?? ''),
        ),
      });
    return NextResponse.json({ error: 'UNKNOWN_COMMAND' }, { status: 400 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'OBSERVATION_COMMAND_FAILED';
    return NextResponse.json(
      { error: message },
      { status: message === 'FORBIDDEN' ? 403 : 400 },
    );
  }
}
