import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';

export type OfflineCommandInput = {
  clientCommandId: string;
  actorId: string;
  commandType: string;
  resourceType: string;
  resourceId?: string;
  occurredAt: Date;
  payload: Record<string, unknown>;
  payloadVersion?: number;
  baseVersion?: number;
};

export type OfflineCommandStatus =
  'pending' | 'syncing' | 'synced' | 'failed' | 'rejected';

export function assertOfflineCommandFresh(
  expectedVersion: number | undefined,
  currentVersion: number | undefined,
): void {
  if (
    expectedVersion !== undefined &&
    currentVersion !== undefined &&
    expectedVersion !== currentVersion
  ) {
    throw new Error('STALE_OFFLINE_COMMAND');
  }
}

async function getResourceVersion(
  resourceType: string,
  resourceId: string,
): Promise<number | null | undefined> {
  switch (resourceType) {
    case 'Incident':
      return (
        (
          await prisma.incident.findUnique({
            where: { id: resourceId },
            select: { version: true },
          })
        )?.version ?? null
      );
    case 'Inspection':
      return (
        (
          await prisma.inspection.findUnique({
            where: { id: resourceId },
            select: { version: true },
          })
        )?.version ?? null
      );
    case 'VehicleObservation':
      return (
        (
          await prisma.vehicleObservation.findUnique({
            where: { id: resourceId },
            select: { version: true },
          })
        )?.version ?? null
      );
    default:
      return undefined;
  }
}

async function assertCurrentResourceVersion(input: OfflineCommandInput) {
  if (input.baseVersion === undefined) return;
  if (!input.resourceId) throw new Error('RESOURCE_ID_REQUIRED');

  const currentVersion = await getResourceVersion(
    input.resourceType,
    input.resourceId,
  );
  if (currentVersion === undefined)
    throw new Error('UNSUPPORTED_RESOURCE_VERSION');
  if (currentVersion === null) throw new Error('RESOURCE_NOT_FOUND');
  assertOfflineCommandFresh(input.baseVersion, currentVersion);
}

export async function acceptOfflineCommand(input: OfflineCommandInput) {
  if (!input.clientCommandId.trim())
    throw new Error('CLIENT_COMMAND_ID_REQUIRED');
  if (Number.isNaN(input.occurredAt.getTime()))
    throw new Error('INVALID_OCCURRED_AT');
  if (input.payloadVersion !== undefined && input.payloadVersion < 1) {
    throw new Error('INVALID_PAYLOAD_VERSION');
  }
  const existing = await prisma.offlineCommand.findUnique({
    where: { clientCommandId: input.clientCommandId },
  });
  if (existing) {
    const sameCommand =
      existing.actorId === input.actorId &&
      existing.commandType === input.commandType &&
      existing.resourceType === input.resourceType &&
      existing.resourceId === input.resourceId;
    if (!sameCommand) throw new Error('CLIENT_COMMAND_ID_CONFLICT');
    return existing;
  }
  await assertCurrentResourceVersion(input);

  try {
    return await prisma.offlineCommand.create({
      data: {
        clientCommandId: input.clientCommandId,
        actorId: input.actorId,
        commandType: input.commandType,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        occurredAt: input.occurredAt,
        payload: input.payload as Prisma.InputJsonValue,
        payloadVersion: input.payloadVersion ?? 1,
        baseVersion: input.baseVersion,
      },
    });
  } catch (error) {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== 'P2002'
    ) {
      throw error;
    }

    const concurrent = await prisma.offlineCommand.findUniqueOrThrow({
      where: { clientCommandId: input.clientCommandId },
    });
    const sameCommand =
      concurrent.actorId === input.actorId &&
      concurrent.commandType === input.commandType &&
      concurrent.resourceType === input.resourceType &&
      concurrent.resourceId === input.resourceId;
    if (!sameCommand) throw new Error('CLIENT_COMMAND_ID_CONFLICT');
    return concurrent;
  }
}

export async function markOfflineCommandSyncing(clientCommandId: string) {
  const result = await prisma.offlineCommand.updateMany({
    where: { clientCommandId, status: { in: ['pending', 'failed'] } },
    data: {
      status: 'syncing',
      attemptCount: { increment: 1 },
      lastAttemptAt: new Date(),
    },
  });
  if (!result.count) throw new Error('OFFLINE_COMMAND_NOT_PENDING');
  return prisma.offlineCommand.findUniqueOrThrow({
    where: { clientCommandId },
  });
}

export async function completeOfflineCommand(
  clientCommandId: string,
  response: Record<string, unknown>,
) {
  const result = await prisma.offlineCommand.updateMany({
    where: { clientCommandId, status: 'syncing' },
    data: {
      status: 'synced',
      response: response as Prisma.InputJsonValue,
      error: null,
    },
  });
  if (!result.count) throw new Error('OFFLINE_COMMAND_NOT_SYNCING');
  return prisma.offlineCommand.findUniqueOrThrow({
    where: { clientCommandId },
  });
}

export async function failOfflineCommand(
  clientCommandId: string,
  error: string,
) {
  const result = await prisma.offlineCommand.updateMany({
    where: { clientCommandId, status: 'syncing' },
    data: { status: 'failed', error },
  });
  if (!result.count) throw new Error('OFFLINE_COMMAND_NOT_SYNCING');
  return prisma.offlineCommand.findUniqueOrThrow({
    where: { clientCommandId },
  });
}

export async function rejectOfflineCommand(
  clientCommandId: string,
  error: string,
) {
  const result = await prisma.offlineCommand.updateMany({
    where: {
      clientCommandId,
      status: { in: ['pending', 'syncing'] },
    },
    data: { status: 'rejected', error },
  });
  if (!result.count) throw new Error('OFFLINE_COMMAND_NOT_PENDING');
  return prisma.offlineCommand.findUniqueOrThrow({
    where: { clientCommandId },
  });
}

export function listOfflineCommands(actorId: string) {
  return prisma.offlineCommand.findMany({
    where: { actorId },
    orderBy: { receivedAt: 'desc' },
    take: 100,
  });
}
