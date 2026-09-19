import { NextResponse } from 'next/server';

import { assertAccess, getCurrentUser } from '@/modules/identity';
import {
  acceptOfflineCommand,
  completeOfflineCommand,
  failOfflineCommand,
  listOfflineCommands,
  markOfflineCommandSyncing,
  rejectOfflineCommand,
} from '@/modules/platform';
import { recordVehicleObservation } from '@/modules/vehicles';

function payloadValue(payload: Record<string, unknown>, key: string): unknown {
  return payload[key];
}

function stringPayload(payload: Record<string, unknown>, key: string): string {
  const value = payloadValue(payload, key);
  return typeof value === 'string' ? value : '';
}

function numberPayload(payload: Record<string, unknown>, key: string): number {
  const value = payloadValue(payload, key);
  return typeof value === 'number' ? value : Number.NaN;
}

async function dispatchOfflineCommand(
  command: Awaited<ReturnType<typeof acceptOfflineCommand>>,
  actor: Awaited<ReturnType<typeof getCurrentUser>>,
) {
  if (!actor) throw new Error('UNAUTHENTICATED');
  if (command.commandType !== 'vehicle.record_observation') {
    throw new Error('UNSUPPORTED_OFFLINE_COMMAND');
  }
  const payload =
    command.payload && typeof command.payload === 'object'
      ? (command.payload as Record<string, unknown>)
      : {};
  const result = await recordVehicleObservation(
    {
      plate: stringPayload(payload, 'plate'),
      observedAt: stringPayload(payload, 'observedAt'),
      latitude: numberPayload(payload, 'latitude'),
      longitude: numberPayload(payload, 'longitude'),
      description: stringPayload(payload, 'description'),
      evidenceIds: Array.isArray(payload.evidenceIds)
        ? payload.evidenceIds.filter(
            (value): value is string => typeof value === 'string',
          )
        : undefined,
      clientCommandId: command.clientCommandId,
      baseVersion: command.baseVersion ?? undefined,
    },
    actor,
  );
  return {
    observationId: result.observation.id,
    status: result.observation.status,
    matchId: result.match?.id ?? null,
  };
}

export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  return NextResponse.json({ commands: await listOfflineCommands(user.id) });
}

export async function POST(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const body = (await request.json()) as {
    clientCommandId?: string;
    commandType?: string;
    resourceType?: string;
    resourceId?: string;
    occurredAt?: string;
    payload?: Record<string, unknown>;
    payloadVersion?: number;
    baseVersion?: number;
  };
  if (
    !body.clientCommandId ||
    !body.commandType ||
    !body.resourceType ||
    !body.occurredAt
  ) {
    return NextResponse.json(
      { error: 'INVALID_OFFLINE_COMMAND' },
      { status: 400 },
    );
  }
  try {
    if (body.resourceId) {
      await assertAccess(
        user,
        { resourceType: body.resourceType, resourceId: body.resourceId },
        'mutate',
      );
    }
    const command = await acceptOfflineCommand({
      clientCommandId: body.clientCommandId,
      actorId: user.id,
      commandType: body.commandType,
      resourceType: body.resourceType,
      resourceId: body.resourceId,
      occurredAt: new Date(body.occurredAt),
      payload: body.payload ?? {},
      payloadVersion: body.payloadVersion,
      baseVersion: body.baseVersion,
    });
    if (command.status === 'synced' || command.status === 'rejected') {
      return NextResponse.json(
        { command },
        { status: command.status === 'synced' ? 200 : 409 },
      );
    }

    await markOfflineCommandSyncing(command.clientCommandId);
    try {
      const result = await dispatchOfflineCommand(command, user);
      const synced = await completeOfflineCommand(command.clientCommandId, {
        result,
      });
      return NextResponse.json({ command: synced }, { status: 200 });
    } catch (error) {
      const commandError =
        error instanceof Error ? error.message : 'SYNC_FAILED';
      if (
        commandError === 'UNSUPPORTED_OFFLINE_COMMAND' ||
        commandError === 'STALE_OFFLINE_COMMAND' ||
        commandError === 'FORBIDDEN' ||
        commandError.endsWith('_NOT_FOUND') ||
        commandError.startsWith('INVALID_') ||
        commandError.endsWith('_REQUIRED')
      ) {
        const rejected = await rejectOfflineCommand(
          command.clientCommandId,
          commandError,
        );
        return NextResponse.json({ command: rejected }, { status: 409 });
      }
      const failed = await failOfflineCommand(
        command.clientCommandId,
        commandError,
      );
      return NextResponse.json({ command: failed }, { status: 503 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SYNC_FAILED';
    return NextResponse.json(
      { error: message },
      {
        status: message.includes('NOT_FOUND')
          ? 404
          : message.includes('CONFLICT') || message.includes('STALE')
            ? 409
            : 400,
      },
    );
  }
}
