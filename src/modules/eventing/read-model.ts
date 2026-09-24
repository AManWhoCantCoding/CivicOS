import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';

import { prisma } from '@/lib/prisma';

import type { DomainEvent } from './contracts';
import { e2eTrace } from './e2e-trace';

type ReadModelClient = PrismaClient | Prisma.TransactionClient;
export type ReadModelState = Record<string, unknown>;

function objectState(value: unknown): ReadModelState | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as ReadModelState)
    : undefined;
}

export function eventPayload(event: DomainEvent): ReadModelState {
  return objectState(event.payload) ?? {};
}

export function eventState(event: DomainEvent): ReadModelState | undefined {
  return objectState(eventPayload(event).state);
}

export async function upsertReadModel(
  client: ReadModelClient,
  projectionName: string,
  event: DomainEvent,
  state: Record<string, unknown>,
) {
  const organizationId =
    typeof state.organizationId === 'string' ? state.organizationId : undefined;
  const projectionStatus =
    typeof state.status === 'string' ? state.status : undefined;
  const key = {
    projectionName_aggregateType_aggregateId: {
      projectionName,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
    },
  };
  const existing = await client.projectionRecord.findUnique({ where: key });
  if (existing && existing.aggregateVersion >= event.aggregateVersion) {
    e2eTrace({
      kind: 'projection',
      operation: 'upsert',
      result: 'stale',
      projectionName,
      eventType: event.eventType,
      eventId: event.eventId,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      aggregateVersion: event.aggregateVersion,
      organizationId,
      projectionStatus,
    });
    return existing;
  }
  const updated = await client.projectionRecord.updateMany({
    where: {
      projectionName,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      aggregateVersion: { lt: event.aggregateVersion },
    },
    data: {
      aggregateVersion: event.aggregateVersion,
      eventType: event.eventType,
      state: state as Prisma.InputJsonValue,
    },
  });
  if (updated.count) {
    const result = await client.projectionRecord.findUnique({ where: key });
    e2eTrace({
      kind: 'projection',
      operation: 'upsert',
      result: 'updated',
      projectionName,
      eventType: event.eventType,
      eventId: event.eventId,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      aggregateVersion: event.aggregateVersion,
      organizationId,
      projectionStatus,
    });
    return result;
  }

  try {
    const result = await client.projectionRecord.create({
      data: {
        projectionName,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        aggregateVersion: event.aggregateVersion,
        eventType: event.eventType,
        state: state as Prisma.InputJsonValue,
      },
    });
    e2eTrace({
      kind: 'projection',
      operation: 'upsert',
      result: 'created',
      projectionName,
      eventType: event.eventType,
      eventId: event.eventId,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      aggregateVersion: event.aggregateVersion,
      organizationId,
      projectionStatus,
    });
    return result;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return upsertReadModel(client, projectionName, event, state);
    }
    throw error;
  }
}

export async function reduceReadModel(
  client: ReadModelClient,
  projectionName: string,
  event: DomainEvent,
  reduce: (
    previous: ReadModelState | undefined,
    event: DomainEvent,
  ) => ReadModelState,
) {
  const existing = await client.projectionRecord.findUnique({
    where: {
      projectionName_aggregateType_aggregateId: {
        projectionName,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
      },
    },
  });
  if (existing && existing.aggregateVersion >= event.aggregateVersion) {
    e2eTrace({
      kind: 'projection',
      operation: 'reduce',
      result: 'stale',
      projectionName,
      eventType: event.eventType,
      eventId: event.eventId,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      aggregateVersion: event.aggregateVersion,
    });
    return existing;
  }
  const previous = objectState(existing?.state);
  const reduced = reduce(previous, event);
  const organizationId =
    (typeof reduced.organizationId === 'string'
      ? reduced.organizationId
      : undefined) ??
    (typeof previous?.organizationId === 'string'
      ? previous.organizationId
      : undefined) ??
    event.actor.organizationId;
  const result = await upsertReadModel(
    client,
    projectionName,
    event,
    organizationId ? { ...reduced, organizationId } : reduced,
  );
  e2eTrace({
    kind: 'projection',
    operation: 'reduce',
    result: 'success',
    projectionName,
    eventType: event.eventType,
    eventId: event.eventId,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    aggregateVersion: event.aggregateVersion,
    organizationId,
    projectionStatus:
      typeof reduced.status === 'string' ? reduced.status : undefined,
  });
  return result;
}

export async function readModels(
  projectionName: string,
  aggregateType: string,
  options: {
    aggregateIds?: string[];
    organizationId?: string;
    take?: number;
  } = {},
  client: PrismaClient = prisma,
) {
  const result = await client.projectionRecord.findMany({
    where: {
      projectionName,
      aggregateType,
      ...(options.aggregateIds
        ? { aggregateId: { in: options.aggregateIds } }
        : {}),
      ...(options.organizationId
        ? {
            state: { path: ['organizationId'], equals: options.organizationId },
          }
        : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: options.take ?? 100,
  });
  e2eTrace({
    kind: 'read-model-query',
    operation: 'list',
    status: 'completed',
    projectionName,
    aggregateType,
    organizationId: options.organizationId,
    requestedAggregateCount: options.aggregateIds?.length ?? null,
    resultCount: result.length,
    requestedAggregatePresent: options.aggregateIds
      ? result.some((entry) =>
          options.aggregateIds?.includes(entry.aggregateId),
        )
      : null,
  });
  return result;
}
