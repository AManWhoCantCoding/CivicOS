import { randomUUID } from 'node:crypto';

import type { Prisma, PrismaClient } from '@prisma/client';

import type {
  AppendEventInput,
  DomainEvent,
  EventConsumer,
  RegisteredEventConsumer,
} from './contracts';

type EventingClient = PrismaClient | Prisma.TransactionClient;

const consumers = new Map<string, RegisteredEventConsumer[]>();

export function registerEventConsumer(
  eventType: string,
  consumer: EventConsumer,
  name?: string,
): () => void {
  const entries = consumers.get(eventType) ?? [];
  const consumerName =
    (name ?? consumer.name) || `${eventType}:consumer-${entries.length + 1}`;
  if (entries.some((entry) => entry.name === consumerName)) {
    throw new Error(`DUPLICATE_EVENT_CONSUMER:${consumerName}`);
  }
  const registration = { name: consumerName, handler: consumer };
  entries.push(registration);
  consumers.set(eventType, entries);

  return () => {
    const current = consumers.get(eventType) ?? [];
    consumers.set(
      eventType,
      current.filter((registered) => registered !== registration),
    );
  };
}

export function getEventConsumers(
  eventType: string,
): RegisteredEventConsumer[] {
  return [...(consumers.get(eventType) ?? []), ...(consumers.get('*') ?? [])];
}

type EventRecordShape = {
  eventId: string;
  eventType: string;
  eventVersion: number;
  aggregateType: string;
  aggregateId: string;
  aggregateVersion: number;
  occurredAt: Date;
  recordedAt: Date;
  actorId: string | null;
  actorRole: string | null;
  actorName: string | null;
  organizationId: string | null;
  correlationId: string | null;
  causationId: string | null;
  payload: unknown;
  metadata: unknown;
};

function toDomainEvent(record: EventRecordShape): DomainEvent {
  return {
    eventId: record.eventId,
    eventType: record.eventType,
    eventVersion: record.eventVersion,
    aggregateType: record.aggregateType,
    aggregateId: record.aggregateId,
    aggregateVersion: record.aggregateVersion,
    occurredAt: record.occurredAt,
    recordedAt: record.recordedAt,
    actor: {
      id: record.actorId ?? undefined,
      name: record.actorName ?? undefined,
      role: record.actorRole ?? undefined,
      organizationId: record.organizationId ?? undefined,
    },
    correlationId: record.correlationId ?? undefined,
    causationId: record.causationId ?? undefined,
    payload: (record.payload ?? {}) as Record<string, unknown>,
    metadata: (record.metadata ?? {}) as Record<string, unknown>,
  };
}

export async function getAggregateVersion(
  client: EventingClient,
  aggregateType: string,
  aggregateId: string,
): Promise<number> {
  const latest = await client.eventRecord.findFirst({
    where: { aggregateType, aggregateId },
    orderBy: { aggregateVersion: 'desc' },
    select: { aggregateVersion: true },
  });
  return latest?.aggregateVersion ?? 0;
}

export async function appendEvent(
  client: EventingClient,
  input: AppendEventInput,
): Promise<DomainEvent> {
  const eventId = input.eventId || randomUUID();
  const recordedAt = input.recordedAt ?? new Date();

  const existing = await client.eventRecord.findUnique({ where: { eventId } });
  if (existing) {
    const sameEvent =
      existing.eventType === input.eventType &&
      existing.aggregateType === input.aggregateType &&
      existing.aggregateId === input.aggregateId &&
      existing.aggregateVersion === input.aggregateVersion;
    if (!sameEvent) throw new Error(`DUPLICATE_EVENT_ID:${eventId}`);
    return toDomainEvent(existing);
  }

  const expectedVersion =
    (await getAggregateVersion(
      client,
      input.aggregateType,
      input.aggregateId,
    )) + 1;
  if (input.aggregateVersion !== expectedVersion) {
    throw new Error(
      `AGGREGATE_VERSION_CONFLICT:expected=${expectedVersion}:received=${input.aggregateVersion}`,
    );
  }

  const event = {
    ...input,
    eventId,
    recordedAt,
    actorId: input.actor.id,
    actorRole: input.actor.role,
    actorName: input.actor.name,
    organizationId: input.actor.organizationId,
    payload: input.payload as Prisma.InputJsonValue,
    metadata: input.metadata as Prisma.InputJsonValue,
  };

  await client.eventRecord.create({
    data: {
      eventId: event.eventId,
      eventType: event.eventType,
      eventVersion: event.eventVersion,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      aggregateVersion: event.aggregateVersion,
      occurredAt: event.occurredAt,
      recordedAt: event.recordedAt,
      actorId: event.actorId,
      actorRole: event.actorRole,
      actorName: event.actorName,
      organizationId: event.organizationId,
      correlationId: event.correlationId,
      causationId: event.causationId,
      payload: event.payload,
      metadata: event.metadata,
    },
  });

  await client.outboxMessage.create({
    data: {
      eventId: event.eventId,
    },
  });

  return {
    eventId: event.eventId,
    eventType: event.eventType,
    eventVersion: event.eventVersion,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    aggregateVersion: event.aggregateVersion,
    occurredAt: event.occurredAt,
    recordedAt: event.recordedAt,
    actor: input.actor,
    correlationId: event.correlationId,
    causationId: event.causationId,
    payload: input.payload,
    metadata: input.metadata,
  };
}

export async function readAggregateEvents(
  client: EventingClient,
  aggregateType: string,
  aggregateId: string,
): Promise<DomainEvent[]> {
  const records = await client.eventRecord.findMany({
    where: { aggregateType, aggregateId },
    orderBy: { aggregateVersion: 'asc' },
  });

  return records.map(toDomainEvent);
}

export async function readGlobalEvents(
  client: PrismaClient,
  options: {
    aggregateType?: string;
    eventType?: string;
    afterRecordedAt?: Date;
    take?: number;
  } = {},
): Promise<DomainEvent[]> {
  const records = await client.eventRecord.findMany({
    where: {
      ...(options.aggregateType
        ? { aggregateType: options.aggregateType }
        : {}),
      ...(options.eventType ? { eventType: options.eventType } : {}),
      ...(options.afterRecordedAt
        ? { recordedAt: { gt: options.afterRecordedAt } }
        : {}),
    },
    orderBy: [{ recordedAt: 'asc' }, { id: 'asc' }],
    take: options.take ?? 1000,
  });

  return records.map(toDomainEvent);
}
