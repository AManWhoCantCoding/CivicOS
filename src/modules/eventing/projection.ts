import type { Prisma, PrismaClient } from '@prisma/client';

import { prisma } from '@/lib/prisma';

import { readGlobalEvents, registerEventConsumer } from './event-store';
import type { DomainEvent } from './contracts';

export const eventHistoryProjectionName = 'event-history';

type ProjectionClient = PrismaClient | Prisma.TransactionClient;

export async function applyEventProjection(
  event: DomainEvent,
  client: ProjectionClient = prisma,
) {
  const existing = await client.projectionRecord.findUnique({
    where: {
      projectionName_aggregateType_aggregateId: {
        projectionName: eventHistoryProjectionName,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
      },
    },
  });
  if (existing && existing.aggregateVersion >= event.aggregateVersion) {
    return existing;
  }
  const currentState =
    existing?.state &&
    typeof existing.state === 'object' &&
    !Array.isArray(existing.state)
      ? (existing.state as Record<string, unknown>)
      : {};
  const payload =
    event.payload &&
    typeof event.payload === 'object' &&
    !Array.isArray(event.payload)
      ? event.payload
      : { value: event.payload };
  return client.projectionRecord.upsert({
    where: {
      projectionName_aggregateType_aggregateId: {
        projectionName: eventHistoryProjectionName,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
      },
    },
    update: {
      aggregateVersion: event.aggregateVersion,
      eventType: event.eventType,
      state: {
        ...currentState,
        ...(payload as Record<string, unknown>),
        lastEventType: event.eventType,
        lastEventVersion: event.aggregateVersion,
        ...(event.actor.id ? { lastActorId: event.actor.id } : {}),
        lastRecordedAt: event.recordedAt.toISOString(),
      } as Prisma.InputJsonValue,
    },
    create: {
      projectionName: eventHistoryProjectionName,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      aggregateVersion: event.aggregateVersion,
      eventType: event.eventType,
      state: {
        ...(payload as Record<string, unknown>),
        lastEventType: event.eventType,
        lastEventVersion: event.aggregateVersion,
        ...(event.actor.id ? { lastActorId: event.actor.id } : {}),
        lastRecordedAt: event.recordedAt.toISOString(),
      } as Prisma.InputJsonValue,
    },
  });
}

export async function rebuildEventProjection(
  client: PrismaClient = prisma,
): Promise<number> {
  await client.projectionRecord.deleteMany({
    where: { projectionName: eventHistoryProjectionName },
  });
  await client.projectionCheckpoint.deleteMany({
    where: { name: { contains: 'event-history-projection' } },
  });
  const events = await readGlobalEvents(client, { take: 100_000 });
  for (const event of events) await applyEventProjection(event, client);
  return events.length;
}

export function getEventProjection(aggregateType: string, aggregateId: string) {
  return prisma.projectionRecord.findUnique({
    where: {
      projectionName_aggregateType_aggregateId: {
        projectionName: eventHistoryProjectionName,
        aggregateType,
        aggregateId,
      },
    },
  });
}

const projectionRegistration = globalThis as typeof globalThis & {
  civicosEventHistoryProjection?: boolean;
};

if (!projectionRegistration.civicosEventHistoryProjection) {
  registerEventConsumer(
    '*',
    (event) => applyEventProjection(event).then(() => undefined),
    'event-history-projection',
  );
  projectionRegistration.civicosEventHistoryProjection = true;
}
