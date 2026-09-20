import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import {
  blindIndex,
  decryptSensitive,
  encryptSensitive,
  recordAudit,
} from '@/modules/identity';
import type { IdentityUser } from '@/modules/identity';

describe('identity audit and sensitive data boundary', () => {
  it('keeps encrypted identifiers independent from persistent plaintext', () => {
    const encrypted = encryptSensitive('CCCD-123');
    expect(encrypted).not.toContain('CCCD-123');
    expect(decryptSensitive(encrypted)).toBe('CCCD-123');
    expect(blindIndex('CCCD-123')).toHaveLength(64);
  });
});

const postgresEnabled = process.env.RUN_DB_TESTS === '1';
const stamp = randomUUID().slice(0, 8);
const auditResourceId = `t02-audit-${stamp}`;
const auditActor: IdentityUser = {
  id: `t02-audit-actor-${stamp}`,
  email: `t02-audit-actor-${stamp}@civicos.local`,
  name: 'T02 audit actor',
  roles: ['commander'],
  organizationUnitId: `t02-audit-org-${stamp}`,
};

describe.skipIf(!postgresEnabled)(
  'identity audit event matrix PostgreSQL seam',
  () => {
    afterAll(async () => {
      const rows = await prisma.auditEvent.findMany({
        where: {
          OR: [{ resourceId: auditResourceId }, { actorId: auditActor.id }],
        },
        select: { id: true },
      });
      const ids = rows.map(({ id }) => id);
      if (ids.length) {
        const events = await prisma.eventRecord.findMany({
          where: { aggregateType: 'AuditEvent', aggregateId: { in: ids } },
          select: { eventId: true },
        });
        const eventIds = events.map(({ eventId }) => eventId);
        if (eventIds.length) {
          await prisma.outboxMessage.deleteMany({
            where: { eventId: { in: eventIds } },
          });
          await prisma.eventRecord.deleteMany({
            where: { eventId: { in: eventIds } },
          });
        }
        await prisma.auditEvent.deleteMany({ where: { id: { in: ids } } });
      }
    });

    it('records a sensitive read with actor, resource, time, operation and correlation', async () => {
      const correlationId = randomUUID();
      const before = new Date();
      const audit = await recordAudit({
        actor: auditActor,
        resourceType: 'T02Record',
        resourceId: auditResourceId,
        operation: 'incident.read',
        reason: 'T02 verification check',
        correlationId,
      });

      expect(audit.actorId).toBe(auditActor.id);
      expect(audit.resourceType).toBe('T02Record');
      expect(audit.resourceId).toBe(auditResourceId);
      expect(audit.operation).toBe('incident.read');
      expect(audit.reason).toBe('T02 verification check');
      expect(audit.correlationId).toBe(correlationId);
      expect(audit.occurredAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(audit.occurredAt.getTime()).toBeLessThanOrEqual(Date.now());

      const linked = await prisma.eventRecord.findFirst({
        where: { aggregateType: 'AuditEvent', aggregateId: audit.id },
      });
      expect(linked?.eventType).toBe('AuditEventRecorded');
      expect(linked?.correlationId).toBe(correlationId);
    });

    it('records sensitive download and mutation operations with reason and correlation', async () => {
      const downloadCorrelation = randomUUID();
      const mutationCorrelation = randomUUID();
      await recordAudit({
        actor: auditActor,
        resourceType: 'T02Record',
        resourceId: auditResourceId,
        operation: 'evidence.downloaded',
        reason: 'T02 evidence review',
        correlationId: downloadCorrelation,
      });
      await recordAudit({
        actor: auditActor,
        resourceType: 'T02Record',
        resourceId: auditResourceId,
        operation: 'incident.mutated',
        reason: 'T02 status correction',
        correlationId: mutationCorrelation,
      });

      const download = await prisma.auditEvent.findFirstOrThrow({
        where: {
          resourceId: auditResourceId,
          operation: 'evidence.downloaded',
        },
      });
      expect(download.actorId).toBe(auditActor.id);
      expect(download.reason).toBe('T02 evidence review');
      expect(download.correlationId).toBe(downloadCorrelation);
      expect(download.occurredAt).toBeInstanceOf(Date);

      const mutation = await prisma.auditEvent.findFirstOrThrow({
        where: { resourceId: auditResourceId, operation: 'incident.mutated' },
      });
      expect(mutation.actorId).toBe(auditActor.id);
      expect(mutation.resourceType).toBe('T02Record');
      expect(mutation.reason).toBe('T02 status correction');
      expect(mutation.correlationId).toBe(mutationCorrelation);
      expect(mutation.occurredAt).toBeInstanceOf(Date);
    });
  },
);
