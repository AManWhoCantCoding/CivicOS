import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/modules/identity';
import {
  escalateVehicleObservation,
  getObservation,
  confirmVehicleMatch,
  verifyVehicleObservation,
  confirmVehicleParkingWatch,
} from '@/modules/vehicles';
import { getMobileObservation } from '@/modules/vehicles/projection';

export async function GET(
  request: Request,
  context: { params: Promise<{ observationId: string }> },
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    const observationId = (await context.params).observationId;
    if (new URL(request.url).searchParams.get('view') === 'mobile') {
      return NextResponse.json(await getMobileObservation(observationId, user));
    }
    return NextResponse.json(await getObservation(observationId, user));
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
            ownerLookup:
              typeof body.ownerLookup === 'string'
                ? body.ownerLookup
                : body.ownerLookup == null
                  ? undefined
                  : String(body.ownerLookup),
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
    if (body.command === 'confirm_parking_watch') {
      if (body.acknowledged !== true)
        return NextResponse.json(
          { error: 'PARKING_WATCH_ACK_REQUIRED' },
          { status: 400 },
        );
      return NextResponse.json({
        parkingWatch: await confirmVehicleParkingWatch(observationId, user),
      });
    }
    if (body.command === 'confirm_match')
      return NextResponse.json({
        observation: await confirmVehicleMatch(observationId, user, {
          baseVersion:
            typeof body.baseVersion === 'number' &&
            Number.isInteger(body.baseVersion)
              ? body.baseVersion
              : undefined,
        }),
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
