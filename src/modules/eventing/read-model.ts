import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';

import { prisma } from '@/lib/prisma';

import type { DomainEvent } from './contracts';

type ReadModelClient = PrismaClient | Prisma.TransactionClient;

export async function upsertReadModel(
  client: ReadModelClient,
  projectionName: string,
  event: DomainEvent,
  state: Record<string, unknown>,
) {
  const key = {
    projectionName_aggregateType_aggregateId: {
      projectionName,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
    },
  };
  const existing = await client.projectionRecord.findUnique({ where: key });
  if (existing && existing.aggregateVersion >= event.aggregateVersion) {
    return existing;
  }
  const updated = await client.projectionRecord.updateMany({
    where: {
      projectionName,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      aggregateVersion: { lt: event.aggregateVersion },
    },
    data: {
      aggregateVersion: event.aggregateVersion,
      eventType: event.eventType,
      state: state as Prisma.InputJsonValue,
    },
  });
  if (updated.count) {
    return client.projectionRecord.findUnique({ where: key });
  }

  try {
    return await client.projectionRecord.create({
      data: {
        projectionName,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        aggregateVersion: event.aggregateVersion,
        eventType: event.eventType,
        state: state as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return upsertReadModel(client, projectionName, event, state);
    }
    throw error;
  }
}

export function readModels(
  projectionName: string,
  aggregateType: string,
  options: {
    aggregateIds?: string[];
    take?: number;
  } = {},
  client: PrismaClient = prisma,
) {
  return client.projectionRecord.findMany({
    where: {
      projectionName,
      aggregateType,
      ...(options.aggregateIds
        ? { aggregateId: { in: options.aggregateIds } }
        : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: options.take ?? 100,
  });
}
