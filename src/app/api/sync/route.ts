import { NextResponse } from 'next/server';

import { assertAccess, getCurrentUser } from '@/modules/identity';
import { acceptOfflineCommand, listOfflineCommands } from '@/modules/platform';

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
    return NextResponse.json({ command }, { status: 202 });
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
