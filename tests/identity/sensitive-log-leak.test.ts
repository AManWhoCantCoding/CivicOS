import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/prisma';
import {
  authenticateLocal,
  blindIndex,
  createIdentityUser,
  decryptSensitive,
  encryptSensitive,
} from '@/modules/identity';
import type { IdentityUser } from '@/modules/identity';
import { registerIntakeReport } from '@/modules/incidents';

const stamp = randomUUID().slice(0, 8);
const postgresEnabled = process.env.RUN_DB_TESTS === '1';

function captureConsole() {
  return {
    log: vi.spyOn(console, 'log').mockImplementation(() => {}),
    info: vi.spyOn(console, 'info').mockImplementation(() => {}),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    error: vi.spyOn(console, 'error').mockImplementation(() => {}),
  };
}

function serializeCalls(spies: ReturnType<typeof captureConsole>): string[] {
  return Object.values(spies).flatMap((spy) =>
    spy.mock.calls.map((args) =>
      args
        .map((arg) => {
          if (typeof arg === 'string') return arg;
          try {
            return JSON.stringify(arg) ?? String(arg);
          } catch {
            return String(arg);
          }
        })
        .join(' '),
    ),
  );
}

function expectNoPlaintext(chunks: string[], marker: string) {
  for (const chunk of chunks) {
    expect(chunk).not.toContain(marker);
  }
  expect(chunks.join('\n')).not.toContain(marker);
}

describe('identity sensitive log-leak boundary', () => {
  it('never emits sensitive plaintext to console output while ciphertext stays recoverable', () => {
    const marker = `T02-LOGLEAK-${stamp}-SENSITIVE-079000000001`;
    const spies = captureConsole();
    try {
      const encrypted = encryptSensitive(marker);
      expect(encrypted).not.toContain(marker);
      expect(decryptSensitive(encrypted)).toBe(marker);
      const index = blindIndex(marker);
      expect(index).toBe(blindIndex(marker));
      expect(index).not.toContain(marker);
      const chunks = serializeCalls(spies);
      expectNoPlaintext(chunks, marker);
    } finally {
      vi.restoreAllMocks();
    }
  });
});

describe.skipIf(!postgresEnabled)(
  'identity sensitive log-leak PostgreSQL seam',
  () => {
    const orgId = `t02-logleak-org-${stamp}`;
    const commanderId = `t02-logleak-commander-${stamp}`;
    const memberEmail = `t02-logleak-member-${stamp}@civicos.local`;
    const passwordMarker = `T02-LOGLEAK-PW-${stamp}-079000000001!xQ`;
    const intakeMarker = `T02-LOGLEAK-${stamp}-SENSITIVE-079000000002`;
    const commander: IdentityUser = {
      id: commanderId,
      email: `${commanderId}@civicos.local`,
      name: commanderId,
      roles: ['commander'],
      organizationUnitId: orgId,
    };
    let reportId = '';
    let incidentId = '';

    afterAll(async () => {
      if (reportId) {
        const events = await prisma.eventRecord.findMany({
          where: {
            OR: [
              { aggregateType: 'IntakeReport', aggregateId: reportId },
              { aggregateType: 'Incident', aggregateId: incidentId },
            ],
          },
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
        await prisma.slaInstance.deleteMany({
          where: { resourceType: 'Incident', resourceId: incidentId },
        });
        await prisma.approval.deleteMany({
          where: { resourceType: 'Incident', resourceId: incidentId },
        });
        await prisma.projectionRecord.deleteMany({
          where: { aggregateType: 'Incident', aggregateId: incidentId },
        });
        await prisma.incident.deleteMany({ where: { id: incidentId } });
        await prisma.intakeReport.deleteMany({ where: { id: reportId } });
        const audits = await prisma.auditEvent.findMany({
          where: {
            OR: [
              { resourceType: 'IntakeReport', resourceId: reportId },
              { resourceType: 'Incident', resourceId: incidentId },
            ],
          },
          select: { id: true },
        });
        const auditIds = audits.map(({ id }) => id);
        if (auditIds.length) {
          const auditEvents = await prisma.eventRecord.findMany({
            where: {
              aggregateType: 'AuditEvent',
              aggregateId: { in: auditIds },
            },
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
          await prisma.auditEvent.deleteMany({
            where: { id: { in: auditIds } },
          });
        }
      }
      const member = await prisma.user.findUnique({
        where: { email: memberEmail },
        select: { id: true },
      });
      const userIds = [commanderId];
      if (member) userIds.push(member.id);
      await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
      const memberAudits = await prisma.auditEvent.findMany({
        where: { resourceId: { in: userIds } },
        select: { id: true },
      });
      const memberAuditIds = memberAudits.map(({ id }) => id);
      if (memberAuditIds.length) {
        const memberEvents = await prisma.eventRecord.findMany({
          where: {
            aggregateType: 'AuditEvent',
            aggregateId: { in: memberAuditIds },
          },
          select: { eventId: true },
        });
        const memberEventIds = memberEvents.map(({ eventId }) => eventId);
        if (memberEventIds.length) {
          await prisma.outboxMessage.deleteMany({
            where: { eventId: { in: memberEventIds } },
          });
          await prisma.eventRecord.deleteMany({
            where: { eventId: { in: memberEventIds } },
          });
        }
        await prisma.auditEvent.deleteMany({
          where: { id: { in: memberAuditIds } },
        });
      }
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      await prisma.user.deleteMany({ where: { email: memberEmail } });
      await prisma.organizationUnit.deleteMany({ where: { id: orgId } });
    });

    it('creates a user without logging the plaintext password and keeps only a hash', async () => {
      await prisma.organizationUnit.create({
        data: { id: orgId, name: 'T02 log-leak unit', level: 'commune' },
      });
      await prisma.role.upsert({
        where: { name: 'commander' },
        update: {},
        create: { name: 'commander' },
      });
      await prisma.role.upsert({
        where: { name: 'field_officer' },
        update: {},
        create: { name: 'field_officer' },
      });
      await prisma.user.create({
        data: {
          id: commanderId,
          email: commander.email,
          name: commanderId,
          passwordHash: `t02-logleak-seed-${stamp}`,
          organizationUnitId: orgId,
        },
      });
      const commanderRole = await prisma.role.findUniqueOrThrow({
        where: { name: 'commander' },
      });
      await prisma.userRole.create({
        data: { userId: commanderId, roleId: commanderRole.id },
      });

      const spies = captureConsole();
      try {
        const created = await createIdentityUser(
          {
            email: memberEmail,
            name: 'T02 log-leak member',
            role: 'field_officer',
            password: passwordMarker,
          },
          commander,
        );
        expect(created.email).toBe(memberEmail);
        const chunks = serializeCalls(spies);
        expectNoPlaintext(chunks, passwordMarker);
      } finally {
        vi.restoreAllMocks();
      }

      const stored = await prisma.user.findUniqueOrThrow({
        where: { email: memberEmail },
      });
      expect(stored.passwordHash).not.toBeNull();
      expect(stored.passwordHash as string).not.toContain(passwordMarker);
      expect(stored.passwordHash).not.toBe(passwordMarker);
      expect(JSON.stringify(stored)).not.toContain(passwordMarker);
      await expect(
        authenticateLocal(memberEmail, passwordMarker),
      ).resolves.toMatchObject({ email: memberEmail });
    });

    it('persists encrypted intake fields without logging the sensitive plaintext', async () => {
      const spies = captureConsole();
      try {
        const registered = await registerIntakeReport(
          {
            sourceChannel: 'direct',
            receivedAt: new Date().toISOString(),
            content: 'T02 log-leak persistence probe',
            sensitiveRef: intakeMarker,
            idempotencyKey: `t02-logleak:${stamp}`,
          },
          commander,
        );
        reportId = registered.reportId;
        incidentId = registered.incidentId ?? '';
        const chunks = serializeCalls(spies);
        expectNoPlaintext(chunks, intakeMarker);
      } finally {
        vi.restoreAllMocks();
      }

      const stored = await prisma.intakeReport.findUniqueOrThrow({
        where: { id: reportId },
      });
      expect(stored.sensitiveRef).not.toBeNull();
      expect(stored.sensitiveRef as string).not.toContain(intakeMarker);
      expect(decryptSensitive(stored.sensitiveRef as string)).toBe(
        intakeMarker,
      );
      expect(stored.sensitiveRefIndex).toBe(blindIndex(intakeMarker));
      expect(stored.sensitiveRefIndex as string).not.toContain(intakeMarker);
      expect(JSON.stringify(stored)).not.toContain(intakeMarker);
    });
  },
);
