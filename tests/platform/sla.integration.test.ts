import { randomUUID } from 'node:crypto';

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
  processOutboxUntilIdle,
  registerEventConsumer,
} from '@/modules/eventing';

const postgresEnabled = process.env.RUN_DB_TESTS === '1';
const slaIds: string[] = [];

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

      await processOutboxUntilIdle();
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
      await processOutboxUntilIdle();
      expect(await prisma.notification.count({ where: { userId } })).toBe(1);
    },
  );

  it.skipIf(!postgresEnabled)(
    'retries a failed outbox consumer exactly once and exposes lag/error health',
    async () => {
      const nonce = randomUUID();
      const eventType = `SlaTestProbe-${nonce}`;
      const eventId = randomUUID();
      const aggregateId = randomUUID();
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
        expect(await processOneOutboxMessage()).toBe(true);
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
        expect(await processOneOutboxMessage()).toBe(true);
        const retried = await prisma.outboxMessage.findUniqueOrThrow({
          where: { eventId },
        });
        expect(retried.status).toBe('processed');
        expect(retried.processedAt).toBeInstanceOf(Date);
        expect(successes).toBe(1);

        await processOutboxUntilIdle();
        expect(successes).toBe(1);
        const checkpoint = await prisma.projectionCheckpoint.findUniqueOrThrow({
          where: { name: `${eventType}:probe-${nonce}` },
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
        await prisma.projectionCheckpoint.deleteMany({
          where: { name: `${eventType}:probe-${nonce}` },
        });
        await prisma.outboxMessage.deleteMany({ where: { eventId } });
        await prisma.eventRecord.deleteMany({
          where: { aggregateId },
        });
      }
    },
  );

  afterAll(async () => {
    if (!postgresEnabled || !slaIds.length) return;
    const events = await prisma.eventRecord.findMany({
      where: { aggregateType: 'SlaInstance', aggregateId: { in: slaIds } },
      select: { eventId: true },
    });
    await prisma.notification.deleteMany({
      where: { sourceEventId: { in: events.map(({ eventId }) => eventId) } },
    });
    await prisma.outboxMessage.deleteMany({
      where: { eventId: { in: events.map(({ eventId }) => eventId) } },
    });
    await prisma.eventRecord.deleteMany({
      where: { aggregateId: { in: slaIds } },
    });
    await prisma.slaInstance.deleteMany({ where: { id: { in: slaIds } } });
  });
});
