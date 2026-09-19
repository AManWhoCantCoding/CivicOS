import type { PrismaClient } from '@prisma/client';

import { readAggregateEvents } from './event-store';
import { readGlobalEvents } from './event-store';

export async function replayAggregate(
  client: PrismaClient,
  aggregateType: string,
  aggregateId: string,
  apply: (
    event: Awaited<ReturnType<typeof readAggregateEvents>>[number],
  ) => Promise<void>,
): Promise<number> {
  const events = await readAggregateEvents(client, aggregateType, aggregateId);
  for (const event of events) await apply(event);
  return events.length;
}

export async function replayEvents(
  client: PrismaClient,
  apply: (
    event: Awaited<ReturnType<typeof readAggregateEvents>>[number],
  ) => Promise<void>,
  options: Parameters<typeof readGlobalEvents>[1] = {},
): Promise<number> {
  const pageSize = options.take ?? 1000;
  let afterRecordedAt = options.afterRecordedAt;
  let afterEventId = options.afterEventId;
  let count = 0;

  while (true) {
    const events = await readGlobalEvents(client, {
      ...options,
      take: pageSize,
      afterRecordedAt,
      afterEventId,
    });
    for (const event of events) await apply(event);
    count += events.length;
    if (events.length < pageSize) return count;

    const last = events.at(-1);
    if (!last) return count;
    afterRecordedAt = last.recordedAt;
    afterEventId = last.eventId;
  }
}
