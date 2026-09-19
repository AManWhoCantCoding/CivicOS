import { randomUUID } from 'node:crypto';

import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { appendEvent, getAggregateVersion } from '@/modules/eventing';

export type SlaRule = {
  kind: string;
  durationMs: number;
};

type SlaRecord = {
  id: string;
  resourceType: string;
  resourceId: string;
  kind: string;
  dueAt: Date;
  status: string;
  overdueAt: Date | null;
  completedAt: Date | null;
  assigneeUserId: string | null;
  overdueEventId: string | null;
  createdAt: Date;
};

export function dueAt(startedAt: Date, rule: SlaRule): Date {
  if (!Number.isFinite(rule.durationMs) || rule.durationMs < 0) {
    throw new Error('INVALID_SLA_DURATION');
  }
  return new Date(startedAt.getTime() + rule.durationMs);
}

export function isOverdue(now: Date, due: Date): boolean {
  return now.getTime() >= due.getTime();
}

export async function createSla(
  input: {
    resourceType: string;
    resourceId: string;
    rule: SlaRule;
    startedAt?: Date;
    assigneeUserId?: string;
  },
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<SlaRecord> {
  if (client === prisma)
    return prisma.$transaction((tx) => createSla(input, tx));
  const startedAt = input.startedAt ?? new Date();
  const existing = await client.slaInstance.findUnique({
    where: {
      resourceType_resourceId_kind: {
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        kind: input.rule.kind,
      },
    },
  });
  if (existing) return existing;
  const sla = await client.slaInstance.create({
    data: {
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      kind: input.rule.kind,
      dueAt: dueAt(startedAt, input.rule),
      assigneeUserId: input.assigneeUserId,
    },
  });
  await appendEvent(client, {
    eventId: randomUUID(),
    eventType: 'SlaStarted',
    eventVersion: 1,
    aggregateType: 'SlaInstance',
    aggregateId: sla.id,
    aggregateVersion: 1,
    occurredAt: sla.createdAt,
    actor: {},
    payload: {
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      kind: input.rule.kind,
      dueAt: sla.dueAt.toISOString(),
    },
    metadata: {},
  });
  return sla;
}

export async function markOverdue(now = new Date()): Promise<number> {
  const candidates = await prisma.slaInstance.findMany({
    where: { status: 'active', dueAt: { lte: now } },
  });
  let marked = 0;
  for (const candidate of candidates) {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.slaInstance.updateMany({
        where: { id: candidate.id, status: 'active' },
        data: { status: 'overdue', overdueAt: now },
      });
      if (!updated.count) return;
      const aggregateVersion =
        (await getAggregateVersion(tx, 'SlaInstance', candidate.id)) + 1;
      const event = await appendEvent(tx, {
        eventId: randomUUID(),
        eventType: 'SlaOverdue',
        eventVersion: 1,
        aggregateType: 'SlaInstance',
        aggregateId: candidate.id,
        aggregateVersion,
        occurredAt: now,
        actor: {},
        payload: {
          resourceType: candidate.resourceType,
          resourceId: candidate.resourceId,
          kind: candidate.kind,
          userId: candidate.assigneeUserId,
        },
        metadata: {},
      });
      await tx.slaInstance.update({
        where: { id: candidate.id },
        data: { overdueEventId: event.eventId },
      });
      marked += 1;
    });
  }
  return marked;
}
