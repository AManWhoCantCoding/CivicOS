import { randomUUID } from 'node:crypto';

import { beforeEach, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import {
  appendEvent,
  getEventProjection,
  getOutboxHealth,
  processOneOutboxMessage,
  processOutboxUntilIdle,
  readAggregateEvents,
  readGlobalEvents,
  rebuildEventProjection,
  registerEventConsumer,
} from '@/modules/eventing';

const postgresEnabled = process.env.RUN_DB_TESTS === '1';
const maxAttempts = Number(process.env.EVENT_MAX_ATTEMPTS ?? 5);

describe.skipIf(!postgresEnabled)('event durability PostgreSQL seam', () => {
  beforeEach(async () => {
    await prisma.projectionRecord.deleteMany();
    await prisma.projectionCheckpoint.deleteMany();
    await prisma.outboxMessage.deleteMany();
    await prisma.eventRecord.deleteMany();
  });

  it('persists every envelope field with actor snapshot and causation metadata', async () => {
    const aggregateId = randomUUID();
    const eventId = randomUUID();
    const occurredAt = new Date('2026-03-01T10:00:00.000Z');
    await prisma.$transaction((tx) =>
      appendEvent(tx, {
        eventId,
        eventType: 'Ticket01EnvelopePersisted',
        eventVersion: 1,
        aggregateType: 'Ticket01Envelope',
        aggregateId,
        aggregateVersion: 1,
        occurredAt,
        actor: {
          id: 'actor-1',
          name: 'Commander An',
          role: 'commander',
          organizationId: 'unit-1',
        },
        correlationId: 'correlation-1',
        causationId: 'command-1',
        payload: { value: 'envelope' },
        metadata: { source: 'ticket-01' },
      }),
    );

    const [stored] = await readAggregateEvents(
      prisma,
      'Ticket01Envelope',
      aggregateId,
    );
    expect(stored.eventId).toBe(eventId);
    expect(stored.eventType).toBe('Ticket01EnvelopePersisted');
    expect(stored.eventVersion).toBe(1);
    expect(stored.aggregateType).toBe('Ticket01Envelope');
    expect(stored.aggregateId).toBe(aggregateId);
    expect(stored.aggregateVersion).toBe(1);
    expect(stored.occurredAt.toISOString()).toBe('2026-03-01T10:00:00.000Z');
    expect(stored.actor).toEqual({
      id: 'actor-1',
      name: 'Commander An',
      role: 'commander',
      organizationId: 'unit-1',
    });
    expect(stored.correlationId).toBe('correlation-1');
    expect(stored.causationId).toBe('command-1');
    expect(stored.payload).toEqual({ value: 'envelope' });
    expect(stored.metadata).toEqual({ source: 'ticket-01' });

    const global = await readGlobalEvents(prisma, {
      eventType: 'Ticket01EnvelopePersisted',
    });
    expect(global.map((event) => event.eventId)).toContain(eventId);
    const outbox = await prisma.outboxMessage.findUnique({
      where: { eventId },
    });
    expect(outbox?.status).toBe('pending');
  });

  it('treats a repeated event id as idempotent when the event matches', async () => {
    const aggregateId = randomUUID();
    const eventId = randomUUID();
    const input = {
      eventId,
      eventType: 'Ticket01EnvelopePersisted',
      eventVersion: 1,
      aggregateType: 'Ticket01Envelope',
      aggregateId,
      aggregateVersion: 1,
      occurredAt: new Date('2026-03-01T10:00:00.000Z'),
      actor: { id: 'actor-1' },
      payload: { value: 'envelope' },
      metadata: {},
    };
    await prisma.$transaction((tx) => appendEvent(tx, input));
    const repeated = await prisma.$transaction((tx) => appendEvent(tx, input));

    expect(repeated.eventId).toBe(eventId);
    expect(await prisma.eventRecord.count({ where: { eventId } })).toBe(1);
    expect(await prisma.outboxMessage.count({ where: { eventId } })).toBe(1);
  });

  it('rejects a duplicate event id with conflicting content', async () => {
    const aggregateId = randomUUID();
    const eventId = randomUUID();
    await prisma.$transaction((tx) =>
      appendEvent(tx, {
        eventId,
        eventType: 'Ticket01EnvelopePersisted',
        eventVersion: 1,
        aggregateType: 'Ticket01Envelope',
        aggregateId,
        aggregateVersion: 1,
        occurredAt: new Date(),
        actor: { id: 'actor-1' },
        payload: {},
        metadata: {},
      }),
    );

    await expect(
      prisma.$transaction((tx) =>
        appendEvent(tx, {
          eventId,
          eventType: 'Ticket01ConflictingType',
          eventVersion: 1,
          aggregateType: 'Ticket01Envelope',
          aggregateId,
          aggregateVersion: 1,
          occurredAt: new Date(),
          actor: { id: 'actor-1' },
          payload: {},
          metadata: {},
        }),
      ),
    ).rejects.toThrow(`DUPLICATE_EVENT_ID:${eventId}`);
    expect(await prisma.eventRecord.count({ where: { eventId } })).toBe(1);
  });

  it('rejects a reused aggregate version for a different event id', async () => {
    const aggregateId = randomUUID();
    await prisma.$transaction((tx) =>
      appendEvent(tx, {
        eventId: randomUUID(),
        eventType: 'Ticket01EnvelopePersisted',
        eventVersion: 1,
        aggregateType: 'Ticket01Envelope',
        aggregateId,
        aggregateVersion: 1,
        occurredAt: new Date(),
        actor: { id: 'actor-1' },
        payload: { value: 'first' },
        metadata: {},
      }),
    );

    await expect(
      prisma.$transaction((tx) =>
        appendEvent(tx, {
          eventId: randomUUID(),
          eventType: 'Ticket01EnvelopePersisted',
          eventVersion: 1,
          aggregateType: 'Ticket01Envelope',
          aggregateId,
          aggregateVersion: 1,
          occurredAt: new Date(),
          actor: { id: 'actor-1' },
          payload: { value: 'second' },
          metadata: {},
        }),
      ),
    ).rejects.toThrow('AGGREGATE_VERSION_CONFLICT');
    const history = await readAggregateEvents(
      prisma,
      'Ticket01Envelope',
      aggregateId,
    );
    expect(history).toHaveLength(1);
    expect(history[0].payload).toEqual({ value: 'first' });
  });

  it('rolls back both the event and outbox rows when the transaction fails after append', async () => {
    const aggregateId = randomUUID();
    const eventId = randomUUID();
    await expect(
      prisma.$transaction(async (tx) => {
        await appendEvent(tx, {
          eventId,
          eventType: 'Ticket01RollbackProbe',
          eventVersion: 1,
          aggregateType: 'Ticket01Rollback',
          aggregateId,
          aggregateVersion: 1,
          occurredAt: new Date(),
          actor: { id: 'actor-1' },
          payload: { value: 'rolled-back' },
          metadata: {},
        });
        throw new Error('FORCED_ROLLBACK_PROBE');
      }),
    ).rejects.toThrow('FORCED_ROLLBACK_PROBE');
    expect(await prisma.eventRecord.count({ where: { eventId } })).toBe(0);
    expect(await prisma.outboxMessage.count({ where: { eventId } })).toBe(0);
  });

  it('allows exactly one concurrent append for the same aggregate version', async () => {
    const aggregateId = randomUUID();
    const firstEventId = randomUUID();
    const secondEventId = randomUUID();
    const inputFor = (eventId: string, value: string) => ({
      eventId,
      eventType: 'Ticket01ConcurrentProbe',
      eventVersion: 1,
      aggregateType: 'Ticket01Concurrent',
      aggregateId,
      aggregateVersion: 1,
      occurredAt: new Date(),
      actor: { id: 'actor-1' },
      payload: { value },
      metadata: {},
    });
    const outcomes = await Promise.allSettled([
      prisma.$transaction((tx) => appendEvent(tx, inputFor(firstEventId, 'first'))),
      prisma.$transaction((tx) =>
        appendEvent(tx, inputFor(secondEventId, 'second')),
      ),
    ]);
    const fulfilled = outcomes.filter(
      (outcome) => outcome.status === 'fulfilled',
    );
    const rejected = outcomes.filter(
      (outcome) => outcome.status === 'rejected',
    );
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    const reason =
      rejected[0].status === 'rejected'
        ? String(
            (rejected[0].reason as Error)?.message ?? rejected[0].reason,
          )
        : '';
    expect(reason).toMatch(/AGGREGATE_VERSION_CONFLICT|P2002|Unique constraint/i);
    expect(await prisma.eventRecord.count({ where: { aggregateId } })).toBe(1);
    expect(
      await prisma.outboxMessage.count({
        where: { eventId: { in: [firstEventId, secondEventId] } },
      }),
    ).toBe(1);
    const history = await readAggregateEvents(
      prisma,
      'Ticket01Concurrent',
      aggregateId,
    );
    expect(history).toHaveLength(1);
    expect(history[0].aggregateVersion).toBe(1);
    const winnerId = history[0].eventId;
    expect([firstEventId, secondEventId]).toContain(winnerId);
    const loserId = winnerId === firstEventId ? secondEventId : firstEventId;
    expect(await prisma.eventRecord.count({ where: { eventId: loserId } })).toBe(
      0,
    );
    expect(
      await prisma.outboxMessage.count({ where: { eventId: loserId } }),
    ).toBe(0);
  });

  it('claims each outbox row once and dispatches each consumer exactly once', async () => {
    const eventType = 'Ticket01ClaimTest';
    const consumerName = 'ticket-01-claim-consumer';
    const aggregateId = randomUUID();
    const eventId = randomUUID();
    let deliveries = 0;
    const unregister = registerEventConsumer(
      eventType,
      async () => {
        deliveries += 1;
      },
      consumerName,
    );
    try {
      await prisma.$transaction((tx) =>
        appendEvent(tx, {
          eventId,
          eventType,
          eventVersion: 1,
          aggregateType: 'Ticket01Claim',
          aggregateId,
          aggregateVersion: 1,
          occurredAt: new Date(),
          actor: {},
          payload: {},
          metadata: {},
        }),
      );

      const outcomes = await Promise.all([
        processOneOutboxMessage(),
        processOneOutboxMessage(),
        processOneOutboxMessage(),
        processOneOutboxMessage(),
      ]);

      expect(outcomes.filter(Boolean)).toHaveLength(1);
      expect(deliveries).toBe(1);
      expect(await processOutboxUntilIdle()).toBe(0);
      expect(deliveries).toBe(1);
      const checkpoint = await prisma.projectionCheckpoint.findUnique({
        where: { name: `${eventType}:${consumerName}` },
      });
      expect(checkpoint?.processedEventIds).toEqual([eventId]);
      expect(
        await prisma.outboxMessage.count({
          where: { eventId, status: 'processed' },
        }),
      ).toBe(1);
    } finally {
      unregister();
    }
  });

  it('retries with backoff and parks poison messages in dead letter', async () => {
    const eventType = 'Ticket01RetryTest';
    const eventId = randomUUID();
    let attempts = 0;
    const unregister = registerEventConsumer(
      eventType,
      async () => {
        attempts += 1;
        throw new Error('Ticket01 consumer boom');
      },
      'ticket-01-retry-consumer',
    );
    try {
      await prisma.$transaction((tx) =>
        appendEvent(tx, {
          eventId,
          eventType,
          eventVersion: 1,
          aggregateType: 'Ticket01Retry',
          aggregateId: randomUUID(),
          aggregateVersion: 1,
          occurredAt: new Date(),
          actor: {},
          payload: {},
          metadata: {},
        }),
      );

      const observedAttempts: number[] = [];
      for (let cycle = 0; cycle < maxAttempts; cycle += 1) {
        expect(await processOutboxUntilIdle()).toBeGreaterThan(0);
        const message = await prisma.outboxMessage.findUniqueOrThrow({
          where: { eventId },
        });
        observedAttempts.push(message.attempts);
        if (message.status === 'dead_letter') break;
        expect(message.status).toBe('pending');
        expect(message.availableAt.getTime()).toBeGreaterThan(Date.now());
        expect(message.lastError).toContain('Ticket01 consumer boom');
        await prisma.outboxMessage.update({
          where: { eventId },
          data: { availableAt: new Date(Date.now() - 1000) },
        });
      }

      const terminal = await prisma.outboxMessage.findUniqueOrThrow({
        where: { eventId },
      });
      expect(terminal.status).toBe('dead_letter');
      expect(terminal.attempts).toBe(maxAttempts);
      expect(observedAttempts).toEqual(
        Array.from({ length: maxAttempts }, (_, index) => index + 1),
      );
      expect(terminal.deadLetterAt).not.toBeNull();
      expect(terminal.lastError).toContain('Ticket01 consumer boom');
      const frozen = attempts;
      expect(await processOutboxUntilIdle()).toBe(0);
      expect(attempts).toBe(frozen);
    } finally {
      unregister();
    }
  });

  it('rebuilds projections from the event stream without changing original events', async () => {
    const aggregateType = 'Ticket01Replay';
    const aggregateId = randomUUID();
    const before = await prisma.eventRecord.count();
    await prisma.$transaction(async (tx) => {
      await appendEvent(tx, {
        eventId: randomUUID(),
        eventType: 'Ticket01Replayed',
        eventVersion: 1,
        aggregateType,
        aggregateId,
        aggregateVersion: 1,
        occurredAt: new Date('2026-03-01T10:00:00.000Z'),
        actor: { id: 'actor-1' },
        payload: { value: 'first' },
        metadata: {},
      });
      await appendEvent(tx, {
        eventId: randomUUID(),
        eventType: 'Ticket01Replayed',
        eventVersion: 1,
        aggregateType,
        aggregateId,
        aggregateVersion: 2,
        occurredAt: new Date('2026-03-01T10:01:00.000Z'),
        actor: { id: 'actor-1' },
        payload: { value: 'second' },
        metadata: {},
      });
    });
    expect(await processOutboxUntilIdle()).toBeGreaterThan(0);

    const direct = await getEventProjection(aggregateType, aggregateId);
    expect(direct?.aggregateVersion).toBe(2);
    const originalEvents = await readAggregateEvents(
      prisma,
      aggregateType,
      aggregateId,
    );
    expect(originalEvents.map((event) => event.aggregateVersion)).toEqual([
      1, 2,
    ]);

    await prisma.projectionRecord.deleteMany({
      where: { aggregateType, aggregateId },
    });
    expect(await getEventProjection(aggregateType, aggregateId)).toBeNull();

    expect(await rebuildEventProjection(prisma)).toBeGreaterThan(0);
    const rebuilt = await getEventProjection(aggregateType, aggregateId);
    expect(rebuilt?.state).toEqual(direct?.state);
    expect(rebuilt?.aggregateVersion).toBe(2);
    expect(rebuilt?.eventType).toBe('Ticket01Replayed');
    const untouched = await readAggregateEvents(
      prisma,
      aggregateType,
      aggregateId,
    );
    expect(untouched.map((event) => event.eventId)).toEqual(
      originalEvents.map((event) => event.eventId),
    );
    expect(untouched.map((event) => event.payload)).toEqual(
      originalEvents.map((event) => event.payload),
    );
    expect(await prisma.eventRecord.count()).toBe(before + 2);
  });

  it('reports projection lag sufficient to detect a stale projection', async () => {
    const eventId = randomUUID();
    await prisma.$transaction((tx) =>
      appendEvent(tx, {
        eventId,
        eventType: 'Ticket01LagProbe',
        eventVersion: 1,
        aggregateType: 'Ticket01Lag',
        aggregateId: randomUUID(),
        aggregateVersion: 1,
        occurredAt: new Date(),
        actor: {},
        payload: {},
        metadata: {},
      }),
    );
    await prisma.projectionCheckpoint.upsert({
      where: { name: 'ticket-01-lag-probe' },
      update: { lastRecordedAt: new Date(Date.now() - 30_000) },
      create: {
        name: 'ticket-01-lag-probe',
        lastRecordedAt: new Date(Date.now() - 30_000),
        processedEventIds: [],
      },
    });

    const health = await getOutboxHealth();
    expect(health.projectionStatus).toBe('tracked');
    expect(health.projectionLagMs).not.toBeNull();
    expect(health.projectionLagMs ?? 0).toBeGreaterThan(10_000);
    expect(health.pendingCount).toBeGreaterThan(0);
    expect(health.oldestPendingAgeMs).toBeGreaterThanOrEqual(0);
  });

  it('reports idle and unknown projection status without events or checkpoints', async () => {
    expect(await getOutboxHealth()).toMatchObject({
      projectionStatus: 'idle',
      projectionLagMs: 0,
    });

    await prisma.$transaction((tx) =>
      appendEvent(tx, {
        eventId: randomUUID(),
        eventType: 'Ticket01LagProbe',
        eventVersion: 1,
        aggregateType: 'Ticket01Lag',
        aggregateId: randomUUID(),
        aggregateVersion: 1,
        occurredAt: new Date(),
        actor: {},
        payload: {},
        metadata: {},
      }),
    );
    expect(await prisma.projectionCheckpoint.count()).toBe(0);
    expect(await getOutboxHealth()).toMatchObject({
      projectionStatus: 'unknown',
      projectionLagMs: null,
    });
  });
});
