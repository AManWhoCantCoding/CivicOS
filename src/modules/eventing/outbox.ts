import { randomUUID } from 'node:crypto';

import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';

import { getEventConsumers } from './event-store';
import type { DomainEvent } from './contracts';

const maxAttempts = Number(process.env.EVENT_MAX_ATTEMPTS ?? 5);
const processingLeaseMs = 5 * 60 * 1000;

function backoff(attempts: number): Date {
  return new Date(Date.now() + Math.min(60_000, 250 * 2 ** attempts));
}

function toDomainEvent(record: {
  eventRecord: {
    eventId: string;
    eventType: string;
    eventVersion: number;
    aggregateType: string;
    aggregateId: string;
    aggregateVersion: number;
    occurredAt: Date;
    recordedAt: Date;
    actorId: string | null;
    actorName: string | null;
    actorRole: string | null;
    organizationId: string | null;
    correlationId: string | null;
    causationId: string | null;
    payload: unknown;
    metadata: unknown;
  };
}): DomainEvent {
  const event = record.eventRecord;
  return {
    eventId: event.eventId,
    eventType: event.eventType,
    eventVersion: event.eventVersion,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    aggregateVersion: event.aggregateVersion,
    occurredAt: event.occurredAt,
    recordedAt: event.recordedAt,
    actor: {
      id: event.actorId ?? undefined,
      name: event.actorName ?? undefined,
      role: event.actorRole ?? undefined,
      organizationId: event.organizationId ?? undefined,
    },
    correlationId: event.correlationId ?? undefined,
    causationId: event.causationId ?? undefined,
    payload: (event.payload ?? {}) as Record<string, unknown>,
    metadata: (event.metadata ?? {}) as Record<string, unknown>,
  };
}

async function releaseStaleClaims(): Promise<void> {
  await prisma.outboxMessage.updateMany({
    where: {
      status: 'processing',
      claimedAt: { lt: new Date(Date.now() - processingLeaseMs) },
    },
    data: {
      status: 'pending',
      claimedAt: null,
      lastError: 'PROCESSING_LEASE_EXPIRED',
    },
  });
}

async function dispatchConsumer(
  event: DomainEvent,
  registration: {
    name: string;
    handler: (event: DomainEvent) => Promise<void>;
  },
): Promise<void> {
  const checkpointName = `${event.eventType}:${registration.name}`;
  const checkpoint = await prisma.projectionCheckpoint.findUnique({
    where: { name: checkpointName },
  });
  const processed = Array.isArray(checkpoint?.processedEventIds)
    ? checkpoint.processedEventIds.filter(
        (value): value is string => typeof value === 'string',
      )
    : [];
  if (processed.includes(event.eventId)) return;

  await registration.handler(event);
  const processedEventIds = [...processed, event.eventId].slice(-1000);
  await prisma.projectionCheckpoint.upsert({
    where: { name: checkpointName },
    update: {
      lastRecordedAt: event.recordedAt,
      processedEventIds: processedEventIds as Prisma.InputJsonValue,
    },
    create: {
      name: checkpointName,
      lastRecordedAt: event.recordedAt,
      processedEventIds: processedEventIds as Prisma.InputJsonValue,
    },
  });
}

export async function processOneOutboxMessage(): Promise<boolean> {
  await releaseStaleClaims();
  const message = await prisma.outboxMessage.findFirst({
    where: {
      status: 'pending',
      availableAt: { lte: new Date() },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (!message) return false;

  const claimToken = randomUUID();
  const claimed = await prisma.outboxMessage.updateMany({
    where: { id: message.id, status: 'pending' },
    data: { status: 'processing', claimedAt: new Date(), claimToken },
  });

  if (claimed.count !== 1) return false;

  try {
    const eventRecord = await prisma.eventRecord.findUniqueOrThrow({
      where: { eventId: message.eventId },
    });
    const event = toDomainEvent({ eventRecord });
    for (const consumer of getEventConsumers(event.eventType)) {
      await dispatchConsumer(event, consumer);
    }
    await prisma.outboxMessage.updateMany({
      where: { id: message.id, status: 'processing', claimToken },
      data: {
        status: 'processed',
        processedAt: new Date(),
        claimedAt: null,
        claimToken: null,
      },
    });
  } catch (error) {
    const attempts = message.attempts + 1;
    const terminal = attempts >= maxAttempts;
    await prisma.outboxMessage.updateMany({
      where: { id: message.id, status: 'processing', claimToken },
      data: {
        status: terminal ? 'dead_letter' : 'pending',
        attempts,
        availableAt: terminal ? new Date() : backoff(attempts),
        claimedAt: null,
        claimToken: null,
        lastError: error instanceof Error ? error.message : String(error),
        deadLetterAt: terminal ? new Date() : null,
      },
    });
  }

  return true;
}

export async function getOutboxHealth() {
  const now = new Date();
  const [
    pendingCount,
    processingCount,
    deadLetterCount,
    oldestPending,
    latestEvent,
    checkpoints,
  ] = await Promise.all([
    prisma.outboxMessage.count({
      where: { status: 'pending', availableAt: { lte: now } },
    }),
    prisma.outboxMessage.count({ where: { status: 'processing' } }),
    prisma.outboxMessage.count({ where: { status: 'dead_letter' } }),
    prisma.outboxMessage.findFirst({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    }),
    prisma.eventRecord.findFirst({
      orderBy: { recordedAt: 'desc' },
      select: { recordedAt: true },
    }),
    prisma.projectionCheckpoint.findMany({
      where: { lastRecordedAt: { not: null } },
      select: { lastRecordedAt: true },
    }),
  ]);

  const earliestCheckpoint = checkpoints.reduce<Date | undefined>(
    (earliest, checkpoint) => {
      if (!checkpoint.lastRecordedAt) return earliest;
      return !earliest || checkpoint.lastRecordedAt < earliest
        ? checkpoint.lastRecordedAt
        : earliest;
    },
    undefined,
  );
  return {
    pendingCount,
    processingCount,
    deadLetterCount,
    oldestPendingAgeMs: oldestPending
      ? Math.max(0, now.getTime() - oldestPending.createdAt.getTime())
      : 0,
    projectionLagMs:
      latestEvent && earliestCheckpoint
        ? Math.max(
            0,
            latestEvent.recordedAt.getTime() - earliestCheckpoint.getTime(),
          )
        : 0,
  };
}

export async function processOutboxUntilIdle(): Promise<number> {
  let processed = 0;
  while (await processOneOutboxMessage()) processed += 1;
  return processed;
}

export async function closeOutboxClient(): Promise<void> {
  await prisma.$disconnect();
}
