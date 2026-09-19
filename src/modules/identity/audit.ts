import { randomUUID } from 'node:crypto';

import type { Prisma, PrismaClient } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { appendEvent } from '@/modules/eventing';

import type { IdentityUser } from './contracts';

type AuditClient = PrismaClient | Prisma.TransactionClient;

async function writeAudit(
  client: AuditClient,
  input: {
    actor: IdentityUser | null;
    resourceType: string;
    resourceId: string;
    operation: string;
    reason?: string;
    correlationId?: string;
    metadata?: Record<string, unknown>;
  },
) {
  const audit = await client.auditEvent.create({
    data: {
      actorId: input.actor?.id,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      operation: input.operation,
      reason: input.reason,
      correlationId: input.correlationId,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });

  await appendEvent(client, {
    eventId: randomUUID(),
    eventType: 'AuditEventRecorded',
    eventVersion: 1,
    aggregateType: 'AuditEvent',
    aggregateId: audit.id,
    aggregateVersion: 1,
    occurredAt: audit.occurredAt,
    actor: {
      id: input.actor?.id,
      name: input.actor?.name,
      role: input.actor?.roles[0],
      organizationId: input.actor?.organizationUnitId,
    },
    correlationId: input.correlationId,
    payload: {
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      operation: input.operation,
    },
    metadata: input.metadata ?? {},
  });

  return audit;
}

export async function recordAudit(
  input: {
    actor: IdentityUser | null;
    resourceType: string;
    resourceId: string;
    operation: string;
    reason?: string;
    correlationId?: string;
    metadata?: Record<string, unknown>;
  },
  client: AuditClient = prisma,
) {
  if (client === prisma) {
    return prisma.$transaction((tx) => writeAudit(tx, input));
  }
  return writeAudit(client, input);
}
