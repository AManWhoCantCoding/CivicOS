import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Database-backed coverage for T-004. No static Prisma/domain imports here:
// the demo target guard must bind DATABASE_URL to civicos before the
// Prisma singleton is created, so everything below is dynamic-imported after
// the seed preflight. Stable-key isolation keeps this repeat-safe on the
// shared demo database; no cleanup deletes demo fixtures.
import {
  inspectionScenarioEstablishmentName,
  seedInspections,
  type InspectionsSeedResult,
} from '../../scripts/demo/seed-inspections';

// DB-CONSOLIDATION SLICE (Task 3): the DB-backed demo inspections seed suite
// is explicitly disabled — its seed helpers target the production/demo
// `civicos` database, which the approved Vitest DB runner
// (127.0.0.1:5432/civicos_e2e) must never touch. Skipped until a dedicated
// E2E-safe demo fixture/reset seam exists (later consolidation task).

const DEMO_URL =
  process.env.DEMO_DATABASE_URL ??
  'postgresql://civicos:civicos@localhost:5432/civicos?schema=public';
const CIVICOS_URL =
  'postgresql://civicos:civicos@localhost:5432/civicos?schema=public';
const DEMO_NOW_ISO = '2026-09-28T08:00:00.000Z';

function seedEnv() {
  return {
    DATABASE_URL: CIVICOS_URL,
    DEMO_DATABASE_URL: DEMO_URL,
    DEMO_NOW: DEMO_NOW_ISO,
  };
}

type Shared = {
  first: InspectionsSeedResult;
  second: InspectionsSeedResult;
  prisma: import('@prisma/client').PrismaClient;
  inspections: typeof import('@/modules/inspections');
  identity: typeof import('@/modules/identity/local-provider');
};

async function loadActor(
  prisma: Shared['prisma'],
  email: string,
): Promise<import('@/modules/identity').IdentityUser> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email },
    include: { roles: { include: { role: true } } },
  });
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? user.email,
    roles: user.roles.map(
      ({ role }) => role.name as import('@/modules/identity').RoleName,
    ),
    organizationUnitId: user.organizationUnitId ?? undefined,
  };
}

describe.skip('demo inspections seed', () => {
  let shared!: Shared;

  beforeAll(async () => {
    const first = await seedInspections({ env: seedEnv() });
    const second = await seedInspections({ env: seedEnv() });
    const { prisma } = await import('@/lib/prisma');
    const inspections = await import('@/modules/inspections');
    const identity = await import('@/modules/identity/local-provider');
    shared = { first, second, prisma, inspections, identity };
  }, 180_000);

  afterAll(async () => {
    // Read-path audits (list/get) emit outbox work; drain it so the shared
    // demo database keeps a clean worker-health signal for other suites.
    const { processOutboxUntilIdle } = await import('@/modules/eventing');
    await processOutboxUntilIdle();
  });

  it('is repeat-safe with scheduled, in-progress and completed states', async () => {
    const { prisma, first, second } = shared;
    expect(second.inspectionIds).toEqual(first.inspectionIds);
    expect(second.establishmentIds).toEqual(first.establishmentIds);
    expect(second.statuses).toEqual(first.statuses);
    expect(second.recommendationIds).toEqual(first.recommendationIds);
    expect(second.recommendationStatuses).toEqual(first.recommendationStatuses);
    expect(second.recurrenceIds).toEqual(first.recurrenceIds);
    expect(second.drained).toBe(0);
    expect(first.statuses).toEqual({
      scheduled: 'scheduled',
      in_progress: 'in_progress',
      completed: 'completed',
    });

    for (const scenario of ['scheduled', 'in_progress', 'completed'] as const) {
      expect(
        await prisma.establishment.count({
          where: { name: inspectionScenarioEstablishmentName(scenario) },
        }),
      ).toBe(1);
    }
    // The completed establishment owns exactly the scenario aggregate plus
    // the single recurrence child owned by completeInspection.
    const counts = await Promise.all([
      prisma.inspection.count({
        where: { establishmentId: first.establishmentIds.scheduled },
      }),
      prisma.inspection.count({
        where: { establishmentId: first.establishmentIds.in_progress },
      }),
      prisma.inspection.count({
        where: { establishmentId: first.establishmentIds.completed },
      }),
    ]);
    expect(counts).toEqual([1, 1, 2]);
    expect(first.recurrenceIds).toHaveLength(1);
    const recurrence = await prisma.inspection.findUniqueOrThrow({
      where: { id: first.recurrenceIds[0] as string },
    });
    expect(recurrence).toMatchObject({
      establishmentId: first.establishmentIds.completed,
      status: 'scheduled',
    });
    expect(recurrence.scheduledAt.getTime()).toBeGreaterThan(
      (
        await prisma.inspection.findUniqueOrThrow({
          where: { id: first.inspectionIds.completed },
        })
      ).scheduledAt.getTime(),
    );
  }, 120_000);

  it('covers list/stats state and recommendation states without duplicates', async () => {
    const { prisma, inspections, first } = shared;
    const commander = await loadActor(prisma, 'truong@civicos.local');
    await inspections.rebuildInspectionProjection(prisma, [
      ...Object.values(first.inspectionIds),
      ...first.recurrenceIds,
    ]);

    const view = await inspections.listInspections(commander);
    for (const [scenario, id] of Object.entries(first.inspectionIds)) {
      expect(view.find((entry) => entry.id === id)).toMatchObject({
        status: first.statuses[scenario as keyof typeof first.statuses],
      });
    }

    const stats = await inspections.inspectionStats(commander);
    expect(stats.totalEstablishments).toBeGreaterThanOrEqual(3);
    expect(stats.totalInspections).toBeGreaterThanOrEqual(4);
    expect(stats.results.needs_action).toBeGreaterThanOrEqual(1);
    expect(stats.recommendations.approved).toBeGreaterThanOrEqual(1);
    expect(stats.recommendations.rejected).toBeGreaterThanOrEqual(1);

    expect(first.recommendationStatuses).toEqual({
      in_progress: 'rejected',
      completed: 'approved',
    });
    expect(
      await prisma.inspectionFinding.count({
        where: { inspectionId: first.inspectionIds.in_progress },
      }),
    ).toBe(1);
    expect(
      await prisma.inspectionFinding.count({
        where: { inspectionId: first.inspectionIds.completed },
      }),
    ).toBe(2);
    expect(
      await prisma.enforcementRecommendation.count({
        where: { inspectionId: first.inspectionIds.in_progress },
      }),
    ).toBe(1);
    expect(
      await prisma.enforcementRecommendation.count({
        where: { inspectionId: first.inspectionIds.completed },
      }),
    ).toBe(1);
  }, 120_000);

  it('holds checklist, evidence and completion invariants', async () => {
    const { prisma, inspections, first } = shared;
    const commander = await loadActor(prisma, 'truong@civicos.local');

    const completed = await prisma.inspection.findUniqueOrThrow({
      where: { id: first.inspectionIds.completed },
    });
    const responses = completed.checklistResponses as Array<{
      key: string;
      value: string;
    }>;
    expect(responses.map((entry) => entry.key).sort()).toEqual([
      'license',
      'safety',
      'security',
    ]);
    expect(completed).toMatchObject({
      status: 'completed',
      result: 'needs_action',
    });

    const findings = await prisma.inspectionFinding.findMany({
      where: { inspectionId: completed.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(findings.map((entry) => entry.checklistKey).sort()).toEqual([
      'safety',
      'security',
    ]);
    for (const finding of findings) {
      const evidenceIds = finding.evidenceIds as unknown as string[];
      expect(evidenceIds.length).toBeGreaterThan(0);
      for (const evidenceId of evidenceIds) {
        const evidence = await prisma.evidence.findUniqueOrThrow({
          where: { id: evidenceId },
        });
        expect(evidence.resourceType).toBe('Inspection');
        expect(evidence.resourceId).toBe(completed.id);
      }
    }
    const evidenceRows = await prisma.evidence.findMany({
      where: { resourceId: completed.id },
    });
    expect(evidenceRows).toHaveLength(1);
    expect(
      (evidenceRows[0]?.metadata as Record<string, unknown> | null)
        ?.demoNamespace,
    ).toBe('civicos-demo');

    const detail = await inspections.getInspection(completed.id, commander);
    expect(detail.recommendations.map((entry) => entry.status)).toEqual([
      'approved',
    ]);

    const inProgressDetail = await inspections.getInspection(
      first.inspectionIds.in_progress,
      commander,
    );
    expect(
      inProgressDetail.recommendations.map((entry) => entry.status),
    ).toEqual(['rejected']);
    expect(inProgressDetail.findings).toHaveLength(1);
    expect(
      inProgressDetail.findings[0]?.evidenceIds as unknown as string[],
    ).toHaveLength(1);
  }, 120_000);

  it('rejects same-submitter approval through separation of duties', async () => {
    const { prisma, inspections } = shared;
    const stamp = randomUUID().slice(0, 8);
    const userId = `inspection-seed-sod-${stamp}`;
    const establishmentType = `Karaoke sod-${stamp}`;
    const establishmentName = `[DEMO-RESTART] Co so sod ${stamp} 01`;
    const establishmentAddress = `[DEMO-RESTART] Dia chi sod ${stamp} 01`;
    await prisma.user.create({
      data: {
        id: userId,
        email: `${userId}@civicos.local`,
        name: 'Separation of duties synthetic officer',
        passwordHash: `sod-hash-${stamp}`,
        organizationUnitId: 'unit-nghia-tru',
      },
    });
    for (const roleName of ['commander', 'field_officer'] as const) {
      const role = await prisma.role.upsert({
        where: { name: roleName },
        update: {},
        create: { name: roleName },
      });
      await prisma.userRole.create({
        data: { userId, roleId: role.id },
      });
    }
    const submitter = await loadActor(prisma, `${userId}@civicos.local`);
    const commander = await loadActor(prisma, 'truong@civicos.local');

    let establishmentId = '';
    try {
      const establishment = await inspections.registerEstablishment(
        {
          name: establishmentName,
          ownerName: '[DEMO-RESTART] Chu co so',
          address: establishmentAddress,
          type: establishmentType,
        },
        submitter,
      );
      establishmentId = establishment.id;
      const inspection = await inspections.scheduleInspection(
        {
          establishmentId,
          assignedUserId: userId,
          scheduledAt: '2026-10-01T08:00:00.000Z',
        },
        submitter,
      );
      await inspections.startInspection(inspection.id, submitter);
      await inspections.saveChecklistResponses(
        {
          inspectionId: inspection.id,
          responses: [
            { key: 'license', value: '[DEMO-RESTART] Hop le' },
            { key: 'security', value: '[DEMO-RESTART] Dat' },
          ],
        },
        submitter,
      );
      const finding = await inspections.recordFinding(
        {
          inspectionId: inspection.id,
          checklistKey: 'security',
          description: '[DEMO-RESTART] Phat hien phan tach nhiem vu.',
          result: 'reminder',
        },
        submitter,
      );
      const recommendation = await inspections.submitRecommendation(
        {
          inspectionId: inspection.id,
          findingIds: [finding.id],
          action: '[DEMO-RESTART] Kien nghi phan tach',
          reason: '[DEMO-RESTART] Kiem tra quy tac phan tach nhiem vu.',
        },
        submitter,
      );
      await expect(
        inspections.approveRecommendation(
          inspection.id,
          recommendation.id,
          submitter,
        ),
      ).rejects.toThrow('SELF_APPROVAL_FORBIDDEN');
      const decided = await inspections.approveRecommendation(
        inspection.id,
        recommendation.id,
        commander,
      );
      expect(decided).toMatchObject({ status: 'approved' });
    } finally {
      await cleanupIsolatedFixture(prisma, establishmentId, userId, [
        establishmentType,
      ]);
    }
  }, 120_000);
});

async function cleanupIsolatedFixture(
  prisma: Shared['prisma'],
  establishmentId: string,
  userId: string,
  templateTypes: string[],
): Promise<void> {
  if (!establishmentId) {
    await prisma.userRole.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    return;
  }
  const inspections = await prisma.inspection.findMany({
    where: { establishmentId },
    select: { id: true },
  });
  const inspectionIds = inspections.map(({ id }) => id);
  const recommendations = inspectionIds.length
    ? await prisma.enforcementRecommendation.findMany({
        where: { inspectionId: { in: inspectionIds } },
        select: { id: true },
      })
    : [];
  const recommendationIds = recommendations.map(({ id }) => id);
  const [audits, assignments, slas] = await Promise.all([
    prisma.auditEvent.findMany({
      where: {
        OR: [
          { resourceType: 'Establishment', resourceId: establishmentId },
          { resourceType: 'Inspection', resourceId: { in: inspectionIds } },
        ],
      },
      select: { id: true },
    }),
    inspectionIds.length
      ? prisma.assignment.findMany({
          where: {
            resourceType: 'Inspection',
            resourceId: { in: inspectionIds },
          },
          select: { id: true },
        })
      : [],
    inspectionIds.length || recommendationIds.length
      ? prisma.slaInstance.findMany({
          where: {
            OR: [
              { resourceType: 'Inspection', resourceId: { in: inspectionIds } },
              {
                resourceType: 'EnforcementRecommendation',
                resourceId: { in: recommendationIds },
              },
            ],
          },
          select: { id: true },
        })
      : [],
  ]);
  const auditIds = audits.map(({ id }) => id);
  const assignmentIds = assignments.map(({ id }) => id);
  const slaIds = slas.map(({ id }) => id);
  const eventRecords = await prisma.eventRecord.findMany({
    where: {
      OR: [
        { aggregateType: 'Establishment', aggregateId: establishmentId },
        { aggregateType: 'Inspection', aggregateId: { in: inspectionIds } },
        ...(assignmentIds.length
          ? [
              {
                aggregateType: 'Assignment',
                aggregateId: { in: assignmentIds },
              },
            ]
          : []),
        ...(slaIds.length
          ? [{ aggregateType: 'SlaInstance', aggregateId: { in: slaIds } }]
          : []),
        ...(auditIds.length
          ? [{ aggregateType: 'AuditEvent', aggregateId: { in: auditIds } }]
          : []),
      ],
    },
    select: { eventId: true },
  });
  const eventIds = eventRecords.map(({ eventId }) => eventId);
  if (eventIds.length) {
    await prisma.outboxMessage.deleteMany({
      where: { eventId: { in: eventIds } },
    });
    await prisma.eventRecord.deleteMany({
      where: { eventId: { in: eventIds } },
    });
  }
  await prisma.projectionRecord.deleteMany({
    where: {
      OR: [
        { aggregateType: 'Establishment', aggregateId: establishmentId },
        { aggregateType: 'Inspection', aggregateId: { in: inspectionIds } },
      ],
    },
  });
  if (inspectionIds.length) {
    await prisma.inspectionFinding.deleteMany({
      where: { inspectionId: { in: inspectionIds } },
    });
    await prisma.enforcementRecommendation.deleteMany({
      where: { inspectionId: { in: inspectionIds } },
    });
  }
  if (recommendationIds.length) {
    await prisma.approval.deleteMany({
      where: { resourceId: { in: recommendationIds } },
    });
  }
  if (slaIds.length) {
    await prisma.slaInstance.deleteMany({ where: { id: { in: slaIds } } });
  }
  if (auditIds.length) {
    await prisma.auditEvent.deleteMany({ where: { id: { in: auditIds } } });
  }
  if (assignmentIds.length) {
    await prisma.assignment.deleteMany({
      where: { id: { in: assignmentIds } },
    });
  }
  if (inspectionIds.length) {
    await prisma.inspection.deleteMany({
      where: { id: { in: inspectionIds } },
    });
  }
  if (templateTypes.length) {
    await prisma.checklistTemplate.deleteMany({
      where: { establishmentType: { in: templateTypes } },
    });
  }
  await prisma.establishment.deleteMany({ where: { id: establishmentId } });
  await prisma.userRole.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
}
