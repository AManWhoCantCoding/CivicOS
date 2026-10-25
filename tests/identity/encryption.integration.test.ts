import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/prisma';
import {
  blindIndex,
  decryptSensitive,
  encryptSensitive,
} from '@/modules/identity';
import type { IdentityUser } from '@/modules/identity';
import { registerIntakeReport } from '@/modules/incidents';

describe('identity encryption boundary', () => {
  it('does not persist plaintext and can recover the protected value', () => {
    const encrypted = encryptSensitive('sensitive-value');
    expect(encrypted).not.toContain('sensitive-value');
    expect(decryptSensitive(encrypted)).toBe('sensitive-value');
    expect(blindIndex('same-value')).toBe(blindIndex('same-value'));
  });

  it('uses a fresh ciphertext per encryption while the blind index stays stable', () => {
    expect(encryptSensitive('repeat-value')).not.toBe(
      encryptSensitive('repeat-value'),
    );
    expect(blindIndex('repeat-value')).toBe(blindIndex('repeat-value'));
    expect(blindIndex('repeat-value')).not.toContain('repeat-value');
  });

  it('rejects malformed ciphertext instead of returning plaintext', () => {
    expect(() => decryptSensitive('not-a-ciphertext')).toThrow(
      'INVALID_CIPHERTEXT',
    );
  });

  it('requires a configured secret before encrypting in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SESSION_SECRET', '');
    try {
      expect(() => encryptSensitive('production-guard')).toThrow(
        'SESSION_SECRET_REQUIRED',
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

const postgresEnabled = process.env.RUN_DB_TESTS === '1';
const stamp = randomUUID().slice(0, 8);
const sensitiveMarker = `T02-SECRET-${stamp}-079000000001`;
const encryptionActor: IdentityUser = {
  id: `t02-encryption-actor-${stamp}`,
  email: `t02-encryption-actor-${stamp}@civicos.local`,
  name: 'T02 encryption actor',
  roles: ['commander'],
  organizationUnitId: `t02-encryption-org-${stamp}`,
};

describe.skipIf(!postgresEnabled)(
  'identity encryption persistence PostgreSQL seam',
  () => {
    let reportId = '';

    afterAll(async () => {
      if (!reportId) return;
      const slas = await prisma.slaInstance.findMany({
        where: { resourceType: 'IntakeReport', resourceId: reportId },
        select: { id: true },
      });
      const slaIds = slas.map(({ id }) => id);
      const events = await prisma.eventRecord.findMany({
        where: {
          OR: [
            { aggregateType: 'IntakeReport', aggregateId: reportId },
            ...(slaIds.length
              ? [{ aggregateType: 'SlaInstance', aggregateId: { in: slaIds } }]
              : []),
          ],
        },
        select: { eventId: true },
      });
      const eventIds = events.map(({ eventId }) => eventId);
      await prisma.notification.deleteMany({
        where: {
          OR: [
            { resourceType: 'IntakeReport', resourceId: reportId },
            ...(eventIds.length ? [{ sourceEventId: { in: eventIds } }] : []),
          ],
        },
      });
      if (slaIds.length) {
        await prisma.slaInstance.deleteMany({ where: { id: { in: slaIds } } });
      }
      if (eventIds.length) {
        await prisma.outboxMessage.deleteMany({
          where: { eventId: { in: eventIds } },
        });
      }
      const audits = await prisma.auditEvent.findMany({
        where: { resourceType: 'IntakeReport', resourceId: reportId },
        select: { id: true },
      });
      const auditIds = audits.map(({ id }) => id);
      await prisma.projectionRecord.deleteMany({
        where: {
          OR: [
            { aggregateType: 'IntakeReport', aggregateId: reportId },
            ...(slaIds.length
              ? [{ aggregateType: 'SlaInstance', aggregateId: { in: slaIds } }]
              : []),
            ...(auditIds.length
              ? [{ aggregateType: 'AuditEvent', aggregateId: { in: auditIds } }]
              : []),
          ],
        },
      });
      if (auditIds.length) {
        const auditEvents = await prisma.eventRecord.findMany({
          where: { aggregateType: 'AuditEvent', aggregateId: { in: auditIds } },
          select: { eventId: true },
        });
        const auditEventIds = auditEvents.map(({ eventId }) => eventId);
        if (auditEventIds.length) {
          await prisma.outboxMessage.deleteMany({
            where: { eventId: { in: auditEventIds } },
          });
          await prisma.eventRecord.deleteMany({
            where: { eventId: { in: auditEventIds } },
          });
        }
        await prisma.auditEvent.deleteMany({ where: { id: { in: auditIds } } });
      }
      if (eventIds.length) {
        await prisma.eventRecord.deleteMany({
          where: { eventId: { in: eventIds } },
        });
      }
      await prisma.intakeReport.deleteMany({ where: { id: reportId } });
    });

    it('stores only ciphertext and blind index for sensitive intake fields', async () => {
      const registered = await registerIntakeReport(
        {
          sourceChannel: 'direct',
          receivedAt: new Date().toISOString(),
          content: 'T02 encryption persistence probe',
          sensitiveRef: sensitiveMarker,
          idempotencyKey: `t02-encryption:${stamp}`,
        },
        encryptionActor,
      );
      reportId = registered.reportId;

      const stored = await prisma.intakeReport.findUniqueOrThrow({
        where: { id: reportId },
      });
      expect(stored.sensitiveRef).not.toBeNull();
      expect(stored.sensitiveRef).not.toContain(sensitiveMarker);
      expect(decryptSensitive(stored.sensitiveRef as string)).toBe(
        sensitiveMarker,
      );
      expect(stored.sensitiveRefIndex).toBe(blindIndex(sensitiveMarker));
      expect(stored.sensitiveRefIndex).not.toContain(sensitiveMarker);
      expect(JSON.stringify(stored)).not.toContain(sensitiveMarker);
    });
  },
);
