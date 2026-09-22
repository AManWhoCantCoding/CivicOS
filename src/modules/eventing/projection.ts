import type { Prisma, PrismaClient } from '@prisma/client';

import { prisma } from '@/lib/prisma';

import { readGlobalEvents, registerEventConsumer } from './event-store';
import type { DomainEvent } from './contracts';
import { upsertReadModel } from './read-model';

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
  return upsertReadModel(client, eventHistoryProjectionName, event, {
    ...currentState,
    ...(payload as Record<string, unknown>),
    lastEventType: event.eventType,
    lastEventVersion: event.aggregateVersion,
    ...(event.actor.id ? { lastActorId: event.actor.id } : {}),
    lastRecordedAt: event.recordedAt.toISOString(),
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
  let count = 0;
  let cursor: { afterRecordedAt: Date; afterEventId: string } | undefined;
  do {
    const events = await readGlobalEvents(client, {
      take: 1000,
      ...cursor,
    });
    for (const event of events) await applyEventProjection(event, client);
    count += events.length;
    const last = events.at(-1);
    cursor = last
      ? { afterRecordedAt: last.recordedAt, afterEventId: last.eventId }
      : undefined;
    if (!events.length) break;
  } while (cursor);
  return count;
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

export function registerEventHistoryProjection(): void {
  if (projectionRegistration.civicosEventHistoryProjection) return;
  registerEventConsumer(
    '*',
    (event) => applyEventProjection(event).then(() => undefined),
    'event-history-projection',
  );
  projectionRegistration.civicosEventHistoryProjection = true;
}

registerEventHistoryProjection();
