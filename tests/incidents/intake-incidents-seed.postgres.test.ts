import { describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import type { IdentityUser } from '@/modules/identity';
import {
  MASKED_IDENTITY,
  getIncident,
  getIntakeReport,
} from '@/modules/incidents';
import { getOutboxHealth, processOutboxUntilIdle } from '@/modules/eventing';
import { seedIntakeIncidents } from '../../scripts/demo/seed-intake-incidents';

const postgresEnabled = process.env.RUN_DB_TESTS === '1';
const DEMO_NOW = '2026-09-28T08:00:00.000Z';

const savedDemoNow = process.env.DEMO_NOW;

async function loadActor(email: string): Promise<IdentityUser> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email },
    include: { roles: { include: { role: true } } },
  });
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? user.email,
    roles: user.roles.map(
      ({ role }) => role.name as IdentityUser['roles'][number],
    ),
    organizationUnitId: user.organizationUnitId ?? undefined,
  };
}

async function scopedCounts(reportIds: string[], incidentIds: string[]) {
  const reportOr = reportIds.map((resourceId) => ({ resourceId }));
  const incidentOr = incidentIds.map((resourceId) => ({ resourceId }));
  const aggregateOr = [
    ...reportIds.map((aggregateId) => ({
      aggregateType: 'IntakeReport',
      aggregateId,
    })),
    ...incidentIds.map((aggregateId) => ({
      aggregateType: 'Incident',
      aggregateId,
    })),
  ];
  const [events, audits, slas, notifications, assignments, approvals] =
    await Promise.all([
      prisma.eventRecord.count({ where: { OR: aggregateOr } }),
      prisma.auditEvent.count({
        where: {
          OR: [
            ...reportOr.map((entry) => ({
              resourceType: 'IntakeReport',
              ...entry,
            })),
            ...incidentOr.map((entry) => ({
              resourceType: 'Incident',
              ...entry,
            })),
          ],
        },
      }),
      prisma.slaInstance.count({
        where: {
          OR: [
            ...reportOr.map((entry) => ({
              resourceType: 'IntakeReport',
              ...entry,
            })),
            ...incidentOr.map((entry) => ({
              resourceType: 'Incident',
              ...entry,
            })),
          ],
        },
      }),
      prisma.notification.count({
        where: {
          OR: [
            ...reportOr.map((entry) => ({
              resourceType: 'IntakeReport',
              ...entry,
            })),
            ...incidentOr.map((entry) => ({
              resourceType: 'Incident',
              ...entry,
            })),
          ],
        },
      }),
      prisma.assignment.count({
        where: {
          resourceType: 'Incident',
          resourceId: { in: incidentIds },
          status: 'active',
        },
      }),
      prisma.approval.count({
        where: {
          OR: [
            ...reportOr.map((entry) => ({
              resourceType: 'IntakeReport',
              ...entry,
            })),
            ...incidentOr.map((entry) => ({
              resourceType: 'Incident',
              ...entry,
            })),
          ],
        },
      }),
    ]);
  return { events, audits, slas, notifications, assignments, approvals };
}

describe.skipIf(!postgresEnabled)(
  'intake/incidents demo seed PostgreSQL seam',
  () => {
    it('covers four statuses with a processed intake linked to an incident', async () => {
      process.env.DEMO_NOW = DEMO_NOW;
      try {
        const first = await seedIntakeIncidents();
        const reportIds = Object.values(first.reportIds);
        const before = await scopedCounts(reportIds, first.incidentIds);
        const second = await seedIntakeIncidents();
        expect(second.reportIds).toEqual(first.reportIds);
        expect(second.incidentIds).toEqual(first.incidentIds);
        expect(second.statuses).toEqual(first.statuses);
        await expect(
          scopedCounts(reportIds, second.incidentIds),
        ).resolves.toEqual(before);

        expect(first.statuses).toMatchObject({
          received: 'RECEIVED',
          rejected: 'REJECTED',
          processed: 'PROCESSED',
          closed: 'CLOSED',
        });
        expect(first.incidentIds).toHaveLength(1);

        const [received, rejected, processed, closed] = await Promise.all([
          prisma.intakeReport.findUniqueOrThrow({
            where: { id: first.reportIds.received },
          }),
          prisma.intakeReport.findUniqueOrThrow({
            where: { id: first.reportIds.rejected },
          }),
          prisma.intakeReport.findUniqueOrThrow({
            where: { id: first.reportIds.processed },
          }),
          prisma.intakeReport.findUniqueOrThrow({
            where: { id: first.reportIds.closed },
          }),
        ]);
        expect(received.incidentId).toBeNull();
        expect(rejected.incidentId).toBeNull();
        expect(closed.incidentId).toBeNull();
        expect(processed.incidentId).toBe(first.incidentIds[0]);

        const incident = await prisma.incident.findUniqueOrThrow({
          where: { id: first.incidentIds[0] as string },
        });
        expect(incident.intakeReportId).toBe(first.reportIds.processed);
        expect(incident.status).toBe('closed');

        await expect(
          prisma.intakeCommand.count({
            where: { reportId: first.reportIds.processed },
          }),
        ).resolves.toBe(2);
      } finally {
        process.env.DEMO_NOW = savedDemoNow;
      }
    }, 120_000);

    it('keeps sensitive data masked and enforces permission boundaries', async () => {
      process.env.DEMO_NOW = DEMO_NOW;
      try {
        const seeded = await seedIntakeIncidents();
        const [commander, duty, negative, crossUnit] = await Promise.all([
          loadActor('truong@civicos.local'),
          loadActor('trucban@civicos.local'),
          loadActor('khongduocphancong@civicos.local'),
          loadActor('captren@civicos.local'),
        ]);

        const asCommander = await getIntakeReport(
          seeded.reportIds.received,
          commander,
        );
        expect(asCommander.report.revealed).toBe(false);
        expect(asCommander.report.sourceName).toBe(MASKED_IDENTITY);
        expect(asCommander.report.sourceContact).toBe(MASKED_IDENTITY);
        expect(asCommander.report.sensitiveRef).toBe(MASKED_IDENTITY);

        const asDuty = await getIntakeReport(seeded.reportIds.processed, duty);
        expect(asDuty.report.revealed).toBe(false);
        expect(asDuty.report.sourceName).toBe(MASKED_IDENTITY);
        expect(asDuty.report.sourceContact).toBe(MASKED_IDENTITY);
        expect(asDuty.report.sensitiveRef).toBe(MASKED_IDENTITY);

        const asNegative = await getIntakeReport(
          seeded.reportIds.received,
          negative,
        );
        expect(asNegative.report.revealed).toBe(false);
        expect(asNegative.report.sourceName).toBe(MASKED_IDENTITY);
        expect(asNegative.report.sourceContact).toBe(MASKED_IDENTITY);
        expect(asNegative.report.sensitiveRef).toBe(MASKED_IDENTITY);

        await expect(
          getIntakeReport(seeded.reportIds.received, crossUnit),
        ).rejects.toThrow('FORBIDDEN');
        await expect(
          getIncident(seeded.incidentIds[0] as string, negative),
        ).rejects.toThrow('FORBIDDEN');

        const detail = await getIncident(
          seeded.incidentIds[0] as string,
          commander,
        );
        expect(detail.informant).toBeNull();
      } finally {
        process.env.DEMO_NOW = savedDemoNow;
      }
    }, 120_000);

    it('leaves no pending/dead-letter/orphan side effects after drain', async () => {
      process.env.DEMO_NOW = DEMO_NOW;
      try {
        const seeded = await seedIntakeIncidents();
        const reportIds = Object.values(seeded.reportIds);
        expect(await processOutboxUntilIdle()).toBe(0);

        const events = await prisma.eventRecord.findMany({
          where: {
            OR: [
              ...reportIds.map((aggregateId) => ({
                aggregateType: 'IntakeReport',
                aggregateId,
              })),
              ...seeded.incidentIds.map((aggregateId) => ({
                aggregateType: 'Incident',
                aggregateId,
              })),
            ],
          },
          select: { eventId: true },
        });
        expect(events.length).toBeGreaterThan(0);
        const outbox = await prisma.outboxMessage.findMany({
          where: { eventId: { in: events.map(({ eventId }) => eventId) } },
        });
        expect(outbox.length).toBe(events.length);
        for (const message of outbox) {
          expect(message.status).toBe('processed');
        }

        await expect(
          prisma.approval.count({
            where: {
              resourceType: 'Incident',
              resourceId: { in: seeded.incidentIds },
              status: 'pending',
            },
          }),
        ).resolves.toBe(0);

        const health = await getOutboxHealth();
        expect(health.pendingCount).toBe(0);
        expect(health.processingCount).toBe(0);
        expect(health.deadLetterCount).toBe(0);
      } finally {
        process.env.DEMO_NOW = savedDemoNow;
      }
    }, 120_000);
  },
);
