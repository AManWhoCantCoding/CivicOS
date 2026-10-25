import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';

import { afterAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import {
  createInAppNotification,
  createSla,
  dueAt,
  isOverdue,
  listNotifications,
  markNotificationRead,
  markOverdue,
} from '@/modules/platform';
import {
  appendEvent,
  getOutboxHealth,
  processOneOutboxMessage,
  registerEventConsumer,
} from '@/modules/eventing';

const postgresEnabled = process.env.RUN_DB_TESTS === '1';
const slaIds: string[] = [];

type CheckpointSnapshot = Awaited<
  ReturnType<typeof prisma.projectionCheckpoint.findMany>
>;
const same = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);

async function restoreCheckpoints(
  baseline: CheckpointSnapshot,
  ownedEventIds: string[],
): Promise<void> {
  const allowed = new Set(ownedEventIds);
  const current = await prisma.projectionCheckpoint.findMany({
    orderBy: { name: 'asc' },
  });
  const currentNames = new Set(current.map(({ name }) => name));
  if (baseline.some(({ name }) => !currentNames.has(name)))
    throw new Error('SLA_CHECKPOINT_BASELINE_MISSING');
  for (const row of current) {
    const prior = baseline.find(({ name }) => name === row.name);
    const priorIds = Array.isArray(prior?.processedEventIds)
      ? prior.processedEventIds.filter(
          (id): id is string => typeof id === 'string',
        )
      : [];
    const currentIds = Array.isArray(row.processedEventIds)
      ? row.processedEventIds.filter(
          (id): id is string => typeof id === 'string',
        )
      : [];
    if (!prior) {
      if (!currentIds.length || currentIds.some((id) => !allowed.has(id)))
        throw new Error(`SLA_CHECKPOINT_UNOWNED:${row.name}`);
      continue;
    }
    if (
      currentIds.length < priorIds.length ||
      priorIds.some((id, index) => currentIds[index] !== id) ||
      currentIds.slice(priorIds.length).some((id) => !allowed.has(id))
    )
      throw new Error(`SLA_CHECKPOINT_DRIFT:${row.name}`);
    const appendedIds = currentIds.slice(priorIds.length);
    if (!appendedIds.length) {
      if (!same(row, prior))
        throw new Error(`SLA_CHECKPOINT_DRIFT:${row.name}`);
    } else {
      const appendedEvents = await prisma.eventRecord.findMany({
        where: { eventId: { in: appendedIds } },
        select: { eventId: true, recordedAt: true },
      });
      if (appendedEvents.length !== appendedIds.length)
        throw new Error(`SLA_CHECKPOINT_EVENT_MISSING:${row.name}`);
      const latestRecordedAt =
        [
          ...appendedEvents.map(({ recordedAt }) => recordedAt),
          ...(prior.lastRecordedAt ? [prior.lastRecordedAt] : []),
        ].sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
      if (
        row.lastRecordedAt?.getTime() !== latestRecordedAt?.getTime() ||
        row.updatedAt < prior.updatedAt
      )
        throw new Error(`SLA_CHECKPOINT_TIMESTAMP_DRIFT:${row.name}`);
    }
  }
  await prisma.$transaction(async (tx) => {
    for (const row of current) {
      const prior = baseline.find(({ name }) => name === row.name);
      if (!prior)
        await tx.projectionCheckpoint.delete({ where: { name: row.name } });
      else if (!same(row, prior))
        await tx.projectionCheckpoint.update({
          where: { name: row.name },
          data: {
            updatedAt: prior.updatedAt,
            lastRecordedAt: prior.lastRecordedAt,
            processedEventIds: prior.processedEventIds as Prisma.InputJsonValue,
          },
        });
    }
  });
  if (
    !same(
      await prisma.projectionCheckpoint.findMany({ orderBy: { name: 'asc' } }),
      baseline,
    )
  )
    throw new Error('SLA_CHECKPOINT_RESTORE_MISMATCH');
}

describe('continuous SLA clock', () => {
  it('continues through weekends and holidays', () => {
    const started = new Date('2026-09-18T23:00:00.000Z');
    const due = dueAt(started, {
      kind: 'two-hours',
      durationMs: 2 * 60 * 60 * 1000,
    });
    expect(due.toISOString()).toBe('2026-09-19T01:00:00.000Z');
    expect(isOverdue(new Date('2026-09-19T01:00:00.000Z'), due)).toBe(true);
  });

  it('rejects invalid thresholds', () => {
    expect(() =>
      dueAt(new Date(), { kind: 'invalid', durationMs: -1 }),
    ).toThrow('INVALID_SLA_DURATION');
  });

  it('runs the continuous clock on the National Day holiday without skipping', () => {
    const started = new Date('2026-09-02T00:00:00.000Z');
    const due = dueAt(started, {
      kind: 'two-hours',
      durationMs: 2 * 60 * 60 * 1000,
    });
    expect(due.toISOString()).toBe('2026-09-02T02:00:00.000Z');
    expect(isOverdue(new Date('2026-09-02T01:59:59.999Z'), due)).toBe(false);
    expect(isOverdue(new Date('2026-09-02T02:00:00.000Z'), due)).toBe(true);
  });

  it('runs the continuous clock across a full weekend without pausing', () => {
    const started = new Date('2026-09-18T23:00:00.000Z');
    const due = dueAt(started, {
      kind: 'two-days',
      durationMs: 48 * 60 * 60 * 1000,
    });
    expect(due.toISOString()).toBe('2026-09-20T23:00:00.000Z');
    expect(isOverdue(new Date('2026-09-20T22:59:59.999Z'), due)).toBe(false);
    expect(isOverdue(new Date('2026-09-20T23:00:00.000Z'), due)).toBe(true);
  });

  it.skipIf(!postgresEnabled)(
    'persists one overdue transition and emits notification only after outbox processing',
    async () => {
      const resourceId = randomUUID();
      const userId = `sla-test-user-${randomUUID()}`;
      const checkpointBaseline = await prisma.projectionCheckpoint.findMany({
        orderBy: { name: 'asc' },
      });
      const sla = await createSla({
        resourceType: 'SlaTest',
        resourceId,
        rule: { kind: 'holiday-inclusive', durationMs: 1 },
        startedAt: new Date('2026-09-19T00:00:00.000Z'),
        assigneeUserId: userId,
      });
      slaIds.push(sla.id);

      expect(await prisma.notification.count({ where: { userId } })).toBe(0);
      expect(await markOverdue(new Date('2026-09-19T00:00:00.001Z'))).toBe(1);
      expect(await markOverdue(new Date('2026-09-19T00:00:01.000Z'))).toBe(0);
      const persisted = await prisma.slaInstance.findUniqueOrThrow({
        where: { id: sla.id },
      });
      expect(persisted.status).toBe('overdue');
      expect(persisted.overdueEventId).toBeTruthy();
      expect(await prisma.notification.count({ where: { userId } })).toBe(0);

      try {
        expect(
          await processOneOutboxMessage({
            eventId: persisted.overdueEventId ?? '',
          }),
        ).toBe(true);
        const notifications = await listNotifications(userId);
        expect(notifications).toHaveLength(1);
        expect(
          await createInAppNotification({
            userId,
            type: notifications[0].type,
            title: notifications[0].title,
            body: notifications[0].body,
            sourceEventId: persisted.overdueEventId ?? undefined,
          }),
        ).toMatchObject({ id: notifications[0].id });
        expect(
          await markNotificationRead(userId, notifications[0].id),
        ).toMatchObject({
          count: 1,
        });
        expect(
          await processOneOutboxMessage({
            eventId: persisted.overdueEventId ?? '',
          }),
        ).toBe(false);
        expect(await prisma.notification.count({ where: { userId } })).toBe(1);
      } finally {
        try {
          await restoreCheckpoints(
            checkpointBaseline,
            persisted.overdueEventId ? [persisted.overdueEventId] : [],
          );
        } finally {
          const eventId = persisted.overdueEventId;
          if (eventId) {
            await prisma.notification.deleteMany({
              where: { OR: [{ userId }, { sourceEventId: eventId }] },
            });
            await prisma.outboxMessage.deleteMany({ where: { eventId } });
            await prisma.projectionRecord.deleteMany({
              where: { aggregateType: 'SlaInstance', aggregateId: sla.id },
            });
            await prisma.eventRecord.deleteMany({ where: { eventId } });
          }
          await prisma.slaInstance.deleteMany({ where: { id: sla.id } });
        }
      }
    },
  );

  it.skipIf(!postgresEnabled)(
    'retries a failed outbox consumer exactly once and exposes lag/error health',
    async () => {
      const nonce = randomUUID();
      const eventType = `SlaTestProbe-${nonce}`;
      const eventId = randomUUID();
      const unrelatedEventId = randomUUID();
      const aggregateId = randomUUID();
      const unrelatedAggregateId = randomUUID();
      const checkpointName = `${eventType}:probe-${nonce}`;
      const checkpointBaseline = await prisma.projectionCheckpoint.findMany({
        orderBy: { name: 'asc' },
      });
      let failures = 0;
      let successes = 0;
      const unregister = registerEventConsumer(
        eventType,
        async () => {
          if (failures === 0) {
            failures += 1;
            throw new Error('PROBE_CONSUMER_FAILURE');
          }
          successes += 1;
        },
        `probe-${nonce}`,
      );
      try {
        await appendEvent(prisma, {
          eventId,
          eventType,
          eventVersion: 1,
          aggregateType: 'SlaTestProbe',
          aggregateId,
          aggregateVersion: 1,
          occurredAt: new Date(),
          actor: {},
          payload: { nonce },
          metadata: {},
        });
        await appendEvent(prisma, {
          eventId: unrelatedEventId,
          eventType: `${eventType}-unrelated`,
          eventVersion: 1,
          aggregateType: 'SlaTestProbe',
          aggregateId: unrelatedAggregateId,
          aggregateVersion: 1,
          occurredAt: new Date(),
          actor: {},
          payload: { nonce },
          metadata: {},
        });
        const staleClaimedAt = new Date(Date.now() - 6 * 60 * 1000);
        await prisma.outboxMessage.update({
          where: { eventId: unrelatedEventId },
          data: { status: 'processing', claimedAt: staleClaimedAt },
        });
        expect(await processOneOutboxMessage({ eventId: '' })).toBe(false);
        const stillStale = await prisma.outboxMessage.findUniqueOrThrow({
          where: { eventId: unrelatedEventId },
        });
        expect(stillStale.status).toBe('processing');
        expect(stillStale.claimedAt).toEqual(staleClaimedAt);
        expect(await processOneOutboxMessage({ eventId })).toBe(true);
        expect(
          await prisma.outboxMessage.findUniqueOrThrow({
            where: { eventId: unrelatedEventId },
          }),
        ).toMatchObject({ status: 'processing', claimedAt: staleClaimedAt });
        const failed = await prisma.outboxMessage.findUniqueOrThrow({
          where: { eventId },
        });
        expect(failed.status).toBe('pending');
        expect(failed.attempts).toBe(1);
        expect(failed.lastError).toBe('PROBE_CONSUMER_FAILURE');
        expect(successes).toBe(0);

        await prisma.outboxMessage.update({
          where: { eventId },
          data: { availableAt: new Date() },
        });
        expect(await processOneOutboxMessage({ eventId })).toBe(true);
        const retried = await prisma.outboxMessage.findUniqueOrThrow({
          where: { eventId },
        });
        expect(retried.status).toBe('processed');
        expect(retried.processedAt).toBeInstanceOf(Date);
        expect(successes).toBe(1);

        expect(await processOneOutboxMessage({ eventId })).toBe(false);
        expect(successes).toBe(1);
        const checkpoint = await prisma.projectionCheckpoint.findUniqueOrThrow({
          where: { name: checkpointName },
        });
        expect(checkpoint.processedEventIds).toContain(eventId);

        const health = await getOutboxHealth();
        expect(health.projectionStatus).toBe('tracked');
        expect(health.projectionLagMs).not.toBeNull();
        expect(typeof health.pendingCount).toBe('number');
        expect(typeof health.deadLetterCount).toBe('number');
        expect(typeof health.oldestPendingAgeMs).toBe('number');
      } finally {
        unregister();
        try {
          await restoreCheckpoints(checkpointBaseline, [eventId]);
        } finally {
          await prisma.projectionRecord.deleteMany({
            where: {
              aggregateType: 'SlaTestProbe',
              aggregateId: { in: [aggregateId, unrelatedAggregateId] },
            },
          });
          await prisma.outboxMessage.deleteMany({
            where: { eventId: { in: [eventId, unrelatedEventId] } },
          });
          await prisma.eventRecord.deleteMany({
            where: { eventId: { in: [eventId, unrelatedEventId] } },
          });
        }
      }
    },
  );

  afterAll(async () => {
    if (!postgresEnabled || !slaIds.length) return;
    const events = await prisma.eventRecord.findMany({
      where: { aggregateType: 'SlaInstance', aggregateId: { in: slaIds } },
      select: { eventId: true, aggregateType: true, aggregateId: true },
    });
    await prisma.notification.deleteMany({
      where: { sourceEventId: { in: events.map(({ eventId }) => eventId) } },
    });
    await prisma.outboxMessage.deleteMany({
      where: { eventId: { in: events.map(({ eventId }) => eventId) } },
    });
    await prisma.eventRecord.deleteMany({
      where: { aggregateType: 'SlaInstance', aggregateId: { in: slaIds } },
    });
    await prisma.projectionRecord.deleteMany({
      where: {
        OR: events.map(({ aggregateType, aggregateId }) => ({
          aggregateType,
          aggregateId,
        })),
      },
    });
    await prisma.slaInstance.deleteMany({ where: { id: { in: slaIds } } });
  });
});
