import type { Prisma, PrismaClient } from '@prisma/client';

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
  return client.projectionRecord.upsert({
    where: key,
    update: {
      aggregateVersion: event.aggregateVersion,
      eventType: event.eventType,
      state: state as Prisma.InputJsonValue,
    },
    create: {
      projectionName,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      aggregateVersion: event.aggregateVersion,
      eventType: event.eventType,
      state: state as Prisma.InputJsonValue,
    },
  });
}

export function readModels(
  projectionName: string,
  aggregateType: string,
  client: PrismaClient = prisma,
) {
  return client.projectionRecord.findMany({
    where: { projectionName, aggregateType },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });
}
