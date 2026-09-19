import { randomUUID } from 'node:crypto';

import { beforeEach, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import {
  appendEvent,
  processOutboxUntilIdle,
  readAggregateEvents,
} from '@/modules/eventing';

const postgresEnabled = process.env.RUN_DB_TESTS === '1';

describe.skipIf(!postgresEnabled)('event kernel PostgreSQL seam', () => {
  beforeEach(async () => {
    await prisma.projectionRecord.deleteMany();
    await prisma.projectionCheckpoint.deleteMany();
    await prisma.outboxMessage.deleteMany();
    await prisma.eventRecord.deleteMany();
  });

  it('commits an event and outbox row atomically', async () => {
    const aggregateId = randomUUID();
    await prisma.$transaction((tx) =>
      appendEvent(tx, {
        eventId: randomUUID(),
        eventType: 'PostgresTestRecorded',
        eventVersion: 1,
        aggregateType: 'PostgresTest',
        aggregateId,
        aggregateVersion: 1,
        occurredAt: new Date(),
        actor: { id: 'test-user' },
        payload: { value: 'durable' },
        metadata: {},
      }),
    );

    expect(await prisma.eventRecord.count()).toBe(1);
    expect(await prisma.outboxMessage.count()).toBe(1);
    expect(
      (await readAggregateEvents(prisma, 'PostgresTest', aggregateId))[0]
        .payload,
    ).toEqual({
      value: 'durable',
    });
  });

  it('rejects a skipped aggregate version and does not overwrite history', async () => {
    const aggregateId = randomUUID();
    await prisma.$transaction((tx) =>
      appendEvent(tx, {
        eventId: randomUUID(),
        eventType: 'PostgresTestRecorded',
        eventVersion: 1,
        aggregateType: 'PostgresTest',
        aggregateId,
        aggregateVersion: 1,
        occurredAt: new Date(),
        actor: {},
        payload: {},
        metadata: {},
      }),
    );
    await expect(
      prisma.$transaction((tx) =>
        appendEvent(tx, {
          eventId: randomUUID(),
          eventType: 'PostgresTestRecorded',
          eventVersion: 1,
          aggregateType: 'PostgresTest',
          aggregateId,
          aggregateVersion: 3,
          occurredAt: new Date(),
          actor: {},
          payload: {},
          metadata: {},
        }),
      ),
    ).rejects.toThrow('AGGREGATE_VERSION_CONFLICT');
    expect(await prisma.eventRecord.count({ where: { aggregateId } })).toBe(1);
  });

  it('dispatches the outbox and records consumer progress', async () => {
    await prisma.$transaction((tx) =>
      appendEvent(tx, {
        eventId: randomUUID(),
        eventType: 'PostgresProjectionTest',
        eventVersion: 1,
        aggregateType: 'PostgresTest',
        aggregateId: randomUUID(),
        aggregateVersion: 1,
        occurredAt: new Date(),
        actor: {},
        payload: { status: 'ready' },
        metadata: {},
      }),
    );
    expect(await processOutboxUntilIdle()).toBeGreaterThan(0);
    expect(await prisma.projectionRecord.count()).toBe(1);
    expect(
      await prisma.outboxMessage.count({ where: { status: 'processed' } }),
    ).toBe(1);
  });
});
