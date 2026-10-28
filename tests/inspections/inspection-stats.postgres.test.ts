import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('@/modules/identity', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/identity')>()),
  getCurrentUser: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { getCurrentUser, type IdentityUser } from '@/modules/identity';
import { GET as getInspectionStatsRoute } from '@/app/api/inspections/stats/route';
import { inspectionStats } from '@/modules/inspections';

const postgresEnabled = process.env.RUN_DB_TESTS === '1';
const databaseTestTimeoutMs = 15_000;
const stamp = randomUUID().slice(0, 8);
const orgId = `inspection-stats-org-${stamp}`;
const otherOrgId = `inspection-stats-other-${stamp}`;
const karaokeType = `karaoke-${stamp}`;
const barType = `bar-${stamp}`;
const establishmentIds = [
  `inspection-stats-karaoke-1-${stamp}`,
  `inspection-stats-karaoke-2-${stamp}`,
  `inspection-stats-bar-${stamp}`,
  `inspection-stats-other-${stamp}`,
];
const inspectionIds = [
  `inspection-stats-pass-${stamp}`,
  `inspection-stats-reminder-${stamp}`,
  `inspection-stats-needs-action-${stamp}`,
  `inspection-stats-outside-period-${stamp}`,
  `inspection-stats-other-org-${stamp}`,
];
const recommendationIds = [
  `inspection-stats-pending-${stamp}`,
  `inspection-stats-approved-${stamp}`,
  `inspection-stats-rejected-${stamp}`,
  `inspection-stats-transferred-${stamp}`,
];
const auditIds: string[] = [];

const commander: IdentityUser = {
  id: `inspection-stats-commander-${stamp}`,
  email: `inspection-stats-commander-${stamp}@civicos.local`,
  name: 'Inspection stats commander',
  roles: ['commander'],
  organizationUnitId: orgId,
};

const otherOrgCommander: IdentityUser = {
  id: `inspection-stats-other-commander-${stamp}`,
  email: `inspection-stats-other-commander-${stamp}@civicos.local`,
  name: 'Other organization commander',
  roles: ['commander'],
  organizationUnitId: otherOrgId,
};

describe.skipIf(!postgresEnabled)(
  'Inspection stats PostgreSQL contract',
  () => {
    beforeAll(async () => {
      await prisma.checklistTemplate.createMany({
        data: [karaokeType, barType].map((type) => ({
          id: `inspection-stats-template-${type}`,
          establishmentType: type,
          title: `Inspection stats ${type}`,
          items: [],
        })),
      });
      await prisma.establishment.createMany({
        data: [
          {
            id: establishmentIds[0],
            name: 'Stats karaoke one',
            ownerName: 'Owner one',
            address: 'Address one',
            type: karaokeType,
            organizationId: orgId,
          },
          {
            id: establishmentIds[1],
            name: 'Stats karaoke two',
            ownerName: 'Owner two',
            address: 'Address two',
            type: karaokeType,
            organizationId: orgId,
          },
          {
            id: establishmentIds[2],
            name: 'Stats bar',
            ownerName: 'Bar owner',
            address: 'Bar address',
            type: barType,
            organizationId: orgId,
          },
          {
            id: establishmentIds[3],
            name: 'Stats other organization',
            ownerName: 'Other owner',
            address: 'Other address',
            type: karaokeType,
            organizationId: otherOrgId,
          },
        ],
      });
      await prisma.inspection.createMany({
        data: [
          {
            id: inspectionIds[0],
            establishmentId: establishmentIds[0],
            templateId: `inspection-stats-template-${karaokeType}`,
            templateVersion: 1,
            scheduledAt: new Date('2026-09-05T08:00:00.000Z'),
            status: 'completed',
            result: 'pass',
          },
          {
            id: inspectionIds[1],
            establishmentId: establishmentIds[1],
            templateId: `inspection-stats-template-${karaokeType}`,
            templateVersion: 1,
            scheduledAt: new Date('2026-09-10T08:00:00.000Z'),
            status: 'completed',
            result: 'reminder',
          },
          {
            id: inspectionIds[2],
            establishmentId: establishmentIds[2],
            templateId: `inspection-stats-template-${barType}`,
            templateVersion: 1,
            scheduledAt: new Date('2026-09-15T08:00:00.000Z'),
            status: 'completed',
            result: 'needs_action',
          },
          {
            id: inspectionIds[3],
            establishmentId: establishmentIds[0],
            templateId: `inspection-stats-template-${karaokeType}`,
            templateVersion: 1,
            scheduledAt: new Date('2026-12-15T08:00:00.000Z'),
            status: 'completed',
            result: 'pass',
          },
          {
            id: inspectionIds[4],
            establishmentId: establishmentIds[3],
            templateId: `inspection-stats-template-${karaokeType}`,
            templateVersion: 1,
            scheduledAt: new Date('2026-09-20T08:00:00.000Z'),
            status: 'completed',
            result: 'pass',
          },
        ],
      });
      await prisma.enforcementRecommendation.createMany({
        data: ['pending_approval', 'approved', 'rejected', 'transferred'].map(
          (status, index) => ({
            id: recommendationIds[index],
            inspectionId: inspectionIds[index < 2 ? index : 2],
            findingIds: [],
            action: `Stats action ${status}`,
            reason: `Stats reason ${status}`,
            status,
            submittedById: commander.id,
          }),
        ),
      });
    });

    afterAll(async () => {
      const audits = await prisma.auditEvent.findMany({
        where: { id: { in: auditIds } },
        select: { id: true },
      });
      const events = await prisma.eventRecord.findMany({
        where: {
          aggregateType: 'AuditEvent',
          aggregateId: { in: audits.map(({ id }) => id) },
        },
        select: { eventId: true },
      });
      await prisma.outboxMessage.deleteMany({
        where: { eventId: { in: events.map(({ eventId }) => eventId) } },
      });
      await prisma.eventRecord.deleteMany({
        where: { eventId: { in: events.map(({ eventId }) => eventId) } },
      });
      await prisma.auditEvent.deleteMany({ where: { id: { in: auditIds } } });
      await prisma.enforcementRecommendation.deleteMany({
        where: { id: { in: recommendationIds } },
      });
      await prisma.inspection.deleteMany({
        where: { id: { in: inspectionIds } },
      });
      await prisma.establishment.deleteMany({
        where: { id: { in: establishmentIds } },
      });
      await prisma.checklistTemplate.deleteMany({
        where: {
          id: {
            in: [
              `inspection-stats-template-${karaokeType}`,
              `inspection-stats-template-${barType}`,
            ],
          },
        },
      });
    });

    it(
      'returns scoped totals, recommendation statuses, type rates, period filters, and generatedAt',
      async () => {
        const from = '2026-09-01T00:00:00.000Z';
        const to = '2026-09-30T23:59:59.999Z';
        const before = Date.now();
        vi.mocked(getCurrentUser).mockResolvedValue(commander);
        const url = new URL('http://localhost/api/inspections/stats');
        url.searchParams.set('from', from);
        url.searchParams.set('to', to);
        const response = await getInspectionStatsRoute(
          new Request(url),
        );
        expect(response.status).toBe(200);
        const { stats } = await response.json();
        const audit = await prisma.auditEvent.findFirst({
          where: {
            actorId: commander.id,
            resourceType: 'InspectionStats',
            resourceId: '*',
            operation: 'inspection.stats.read',
          },
        });
        expect(audit).toMatchObject({
          actorId: commander.id,
          resourceType: 'InspectionStats',
          resourceId: '*',
          operation: 'inspection.stats.read',
          metadata: {},
        });
        if (audit) auditIds.push(audit.id);
        const after = Date.now();

        expect(stats).toMatchObject({
          from,
          to,
          totalEstablishments: 3,
          totalInspections: 3,
          results: { pass: 1, reminder: 1, needs_action: 1 },
          recommendations: {
            pending_approval: 1,
            approved: 1,
            rejected: 1,
            transferred: 1,
          },
          ratesByType: {
            [karaokeType]: {
              total: 2,
              passRate: 0.5,
              reminderRate: 0.5,
              needsActionRate: 0,
            },
            [barType]: {
              total: 1,
              passRate: 0,
              reminderRate: 0,
              needsActionRate: 1,
            },
          },
        });
        expect(Date.parse(stats.generatedAt)).toBeGreaterThanOrEqual(before);
        expect(Date.parse(stats.generatedAt)).toBeLessThanOrEqual(after);

        const karaokeStats = await inspectionStats(commander, {
          from,
          to,
          establishmentType: karaokeType,
        });
        expect(karaokeStats).toMatchObject({
          establishmentType: karaokeType,
          totalEstablishments: 2,
          totalInspections: 2,
          results: { pass: 1, reminder: 1, needs_action: 0 },
          recommendations: {
            pending_approval: 1,
            approved: 1,
            rejected: 0,
            transferred: 0,
          },
        });
        expect(Object.keys(karaokeStats.ratesByType ?? {})).toEqual([
          karaokeType,
        ]);
        const audits = await prisma.auditEvent.findMany({
          where: {
            actorId: commander.id,
            resourceType: 'InspectionStats',
            operation: 'inspection.stats.read',
          },
          select: { id: true },
        });
        auditIds.push(...audits.map(({ id }) => id));
      },
      databaseTestTimeoutMs,
    );

    it(
      'excludes establishments from another exact OrganizationUnit scope',
      async () => {
        const stats = await inspectionStats(otherOrgCommander, {
          from: '2026-09-01T00:00:00.000Z',
          to: '2026-09-30T23:59:59.999Z',
        });

        expect(stats).toMatchObject({
          totalEstablishments: 1,
          totalInspections: 1,
          results: { pass: 1, reminder: 0, needs_action: 0 },
          recommendations: {
            pending_approval: 0,
            approved: 0,
            rejected: 0,
            transferred: 0,
          },
        });
        const audit = await prisma.auditEvent.findFirst({
          where: {
            actorId: otherOrgCommander.id,
            resourceType: 'InspectionStats',
            resourceId: '*',
            operation: 'inspection.stats.read',
          },
          select: { id: true, metadata: true },
        });
        expect(audit).toMatchObject({ metadata: {} });
        if (audit) auditIds.push(audit.id);
      },
      databaseTestTimeoutMs,
    );
  },
);
