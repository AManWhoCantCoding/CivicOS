import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Database-backed coverage for T-005. No static Prisma/domain imports here:
// the demo target guard must bind DATABASE_URL to civicos before the
// Prisma singleton is created, so everything below is dynamic-imported after
// the seed preflight. Stable-key isolation keeps this repeat-safe on the
// shared demo database; no cleanup deletes demo fixtures.
import {
  DEMO_VEHICLE_ESCALATION_TARGET,
  seedVehicles,
  vehicleEvidenceHash,
  vehicleScenarioKey,
  type VehiclesSeedResult,
} from '../../scripts/demo/seed-vehicles';

// DB-CONSOLIDATION SLICE (Task 3): the DB-backed demo vehicles seed suite is
// explicitly disabled — its seed helpers target the production/demo `civicos`
// database (DATABASE_URL/DEMO_DATABASE_URL for the `civicos` demo target),
// which the approved Vitest DB runner (127.0.0.1:5432/civicos_e2e) must never
// touch. Skipped until a dedicated E2E-safe demo fixture/reset seam exists
// (later consolidation task).
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
  first: VehiclesSeedResult;
  second: VehiclesSeedResult;
  prisma: import('@prisma/client').PrismaClient;
};

async function scopedCounts(
  prisma: Shared['prisma'],
  result: VehiclesSeedResult,
) {
  const observationIds = Object.values(result.observationIds);
  const registryIds = Object.values(result.registryIds);
  const [
    registries,
    observations,
    observationsByKey,
    evidence,
    verifications,
    notifications,
    slas,
    events,
    audits,
    assignments,
  ] = await Promise.all([
    prisma.suspiciousVehicleEntry.count({
      where: { id: { in: registryIds } },
    }),
    prisma.vehicleObservation.count({
      where: { id: { in: observationIds } },
    }),
    Promise.all(
      (['recorded', 'match_suggested', 'escalated'] as const).map((scenario) =>
        prisma.vehicleObservation.count({
          where: { clientCommandId: vehicleScenarioKey(scenario) },
        }),
      ),
    ),
    prisma.evidence.count({
      where: {
        resourceType: 'VehicleObservation',
        resourceId: { in: observationIds },
      },
    }),
    prisma.vehicleVerification.count({
      where: { observationId: { in: observationIds } },
    }),
    prisma.notification.count({
      where: {
        resourceType: 'VehicleObservation',
        resourceId: { in: observationIds },
      },
    }),
    prisma.slaInstance.count({
      where: {
        resourceType: 'VehicleObservation',
        resourceId: { in: observationIds },
      },
    }),
    prisma.eventRecord.count({
      where: {
        OR: [
          {
            aggregateType: 'VehicleObservation',
            aggregateId: { in: observationIds },
          },
          {
            aggregateType: 'SuspiciousVehicleRegistry',
            aggregateId: { in: registryIds },
          },
        ],
      },
    }),
    prisma.auditEvent.count({
      where: {
        OR: [
          {
            resourceType: 'VehicleObservation',
            resourceId: { in: observationIds },
          },
          {
            resourceType: 'SuspiciousVehicleRegistry',
            resourceId: { in: registryIds },
          },
        ],
      },
    }),
    prisma.assignment.count({
      where: {
        resourceType: 'VehicleObservation',
        resourceId: { in: observationIds },
        status: 'active',
      },
    }),
  ]);
  return {
    registries,
    observations,
    observationsByKey,
    evidence,
    verifications,
    notifications,
    slas,
    events,
    audits,
    assignments,
  };
}

// DB-CONSOLIDATION SLICE (Task 3): DB-backed suite skipped explicitly (see
// note below). Do not re-enable via RUN_DB_TESTS.
describe.skip('demo vehicles seed', () => {
  let shared!: Shared;
  let rerunSnapshot!: Awaited<ReturnType<typeof scopedCounts>>;

  beforeAll(async () => {
    const first = await seedVehicles({ env: seedEnv() });
    const { prisma } = await import('@/lib/prisma');
    rerunSnapshot = await scopedCounts(prisma, first);
    const second = await seedVehicles({ env: seedEnv() });
    shared = { first, second, prisma };
  }, 180_000);

  afterAll(async () => {
    // Read-path audits emit outbox work; drain it so the shared demo
    // database keeps a clean worker-health signal for other suites.
    const { processOutboxUntilIdle } = await import('@/modules/eventing');
    await processOutboxUntilIdle();
  });

  it('is repeat-safe with recorded, match_suggested and escalated states', async () => {
    const { prisma, first, second } = shared;
    expect(second.registryIds).toEqual(first.registryIds);
    expect(second.observationIds).toEqual(first.observationIds);
    expect(second.statuses).toEqual(first.statuses);
    expect(second.evidenceIds).toEqual(first.evidenceIds);
    expect(second.verificationIds).toEqual(first.verificationIds);
    expect(second.drained).toBe(0);
    expect(first.statuses).toEqual({
      recorded: 'recorded',
      match_suggested: 'match_suggested',
      escalated: 'escalated',
    });
    expect(first.evidenceIds).toHaveLength(1);
    expect(first.verificationIds).toHaveLength(1);
    // No duplicate registry, observation, evidence, notification or SLA rows.
    await expect(scopedCounts(prisma, second)).resolves.toEqual(rerunSnapshot);
  }, 120_000);

  it('derives matches from DEMO_NOW-valid registry windows only', async () => {
    const { prisma, first } = shared;
    const recorded = await prisma.vehicleObservation.findUniqueOrThrow({
      where: { id: first.observationIds.recorded },
    });
    expect(recorded.status).toBe('recorded');
    expect(recorded.matchedRegistryId).toBeNull();

    const matchSuggested = await prisma.vehicleObservation.findUniqueOrThrow({
      where: { id: first.observationIds.match_suggested },
    });
    expect(matchSuggested.status).toBe('match_suggested');
    expect(matchSuggested.matchedRegistryId).toBe(
      first.registryIds.match_suggested,
    );

    const escalated = await prisma.vehicleObservation.findUniqueOrThrow({
      where: { id: first.observationIds.escalated },
    });
    expect(escalated.status).toBe('escalated');
    expect(escalated.matchedRegistryId).toBe(first.registryIds.escalated);
    expect(escalated.escalatedAt).not.toBeNull();
    expect(escalated.matchConfirmedAt).not.toBeNull();

    for (const [scenario, registryId] of [
      ['match_suggested', first.registryIds.match_suggested],
      ['escalated', first.registryIds.escalated],
    ] as const) {
      const registry = await prisma.suspiciousVehicleEntry.findUniqueOrThrow({
        where: { id: registryId },
      });
      const observation = await prisma.vehicleObservation.findUniqueOrThrow({
        where: { id: first.observationIds[scenario] },
      });
      expect(registry.status).toBe('active');
      expect(registry.reason).toContain('[DEMO-RESTART]');
      expect(registry.validFrom.getTime()).toBeLessThanOrEqual(
        observation.observedAt.getTime(),
      );
      expect(
        registry.validUntil === null ||
          registry.validUntil.getTime() > observation.observedAt.getTime(),
      ).toBe(true);
      // One active registry per plate: the repeat preflight key.
      expect(
        await prisma.suspiciousVehicleEntry.count({
          where: { plate: registry.plate, status: 'active' },
        }),
      ).toBe(1);
    }
  }, 120_000);

  it('runs confirm -> evidence -> verify -> escalate through command side effects', async () => {
    const { prisma, first } = shared;
    const observationId = first.observationIds.escalated;

    const events = await prisma.eventRecord.findMany({
      where: {
        aggregateType: 'VehicleObservation',
        aggregateId: observationId,
      },
      orderBy: { aggregateVersion: 'asc' },
    });
    expect(events.map(({ eventType }) => eventType)).toEqual([
      'VehicleObservationRecorded',
      'SuspiciousVehicleMatched',
      'SuspiciousVehicleMatchConfirmed',
      'VehicleObservationEvidenceAttached',
      'VehicleVerificationRecorded',
      'VehicleEscalated',
    ]);
    const escalatedEvent = events.find(
      ({ eventType }) => eventType === 'VehicleEscalated',
    );
    expect(
      (escalatedEvent?.payload as { organizationId?: string })?.organizationId,
    ).toBe(DEMO_VEHICLE_ESCALATION_TARGET);

    const evidence = await prisma.evidence.findUniqueOrThrow({
      where: { id: first.evidenceIds[0] as string },
    });
    expect(evidence).toMatchObject({
      resourceType: 'VehicleObservation',
      resourceId: observationId,
      mimeType: 'image/jpeg',
      fileName: 'demo-restart-vehicle-escalated-01.jpg',
      originalHash: vehicleEvidenceHash(),
    });
    const observation = await prisma.vehicleObservation.findUniqueOrThrow({
      where: { id: observationId },
    });
    expect(observation.evidenceIds).toEqual([evidence.id]);

    const verification = await prisma.vehicleVerification.findUniqueOrThrow({
      where: { id: first.verificationIds[0] as string },
    });
    expect(verification.observationId).toBe(observationId);
    expect(verification.evidenceIds).toEqual([evidence.id]);
    expect(verification.ownerLookup).toContain('[DEMO-RESTART]');

    for (const operation of [
      'vehicle_observation.created',
      'evidence.uploaded',
      'vehicle_verification.recorded',
      'vehicle_observation.escalated',
    ]) {
      expect(
        await prisma.auditEvent.count({
          where: {
            resourceType: 'VehicleObservation',
            resourceId: observationId,
            operation,
          },
        }),
      ).toBe(1);
    }
  }, 120_000);

  it('links notifications and SLA rows to the observation and assigned user', async () => {
    const { prisma, first } = shared;
    const field = await prisma.user.findUniqueOrThrow({
      where: { email: 'hientruong@civicos.local' },
      select: { id: true },
    });

    const recordedNotifs = await prisma.notification.findMany({
      where: {
        resourceType: 'VehicleObservation',
        resourceId: first.observationIds.recorded,
      },
    });
    expect(recordedNotifs).toHaveLength(0);

    const matchNotifs = await prisma.notification.findMany({
      where: {
        resourceType: 'VehicleObservation',
        resourceId: first.observationIds.match_suggested,
      },
    });
    expect(matchNotifs).toHaveLength(1);
    expect(matchNotifs[0]).toMatchObject({
      userId: field.id,
      type: 'vehicle_match_suggested',
    });

    const escalatedNotifs = await prisma.notification.findMany({
      where: {
        resourceType: 'VehicleObservation',
        resourceId: first.observationIds.escalated,
      },
    });
    expect(escalatedNotifs.map(({ type }) => type).sort()).toEqual([
      'vehicle_escalated',
      'vehicle_match_suggested',
    ]);
    for (const notification of escalatedNotifs) {
      expect(notification.userId).toBe(field.id);
    }

    for (const scenario of [
      'recorded',
      'match_suggested',
      'escalated',
    ] as const) {
      const observationId = first.observationIds[scenario];
      const sla = await prisma.slaInstance.findFirstOrThrow({
        where: {
          resourceType: 'VehicleObservation',
          resourceId: observationId,
          kind: 'vehicle_escalation_2h',
        },
      });
      expect(sla.assigneeUserId).toBe(field.id);
      const observation = await prisma.vehicleObservation.findUniqueOrThrow({
        where: { id: observationId },
      });
      expect(sla.dueAt.getTime()).toBe(
        observation.observedAt.getTime() + 2 * 60 * 60 * 1000,
      );
      if (scenario === 'escalated') {
        expect(sla.status).toBe('completed');
        expect(sla.completedAt).not.toBeNull();
      } else {
        expect(sla.status).toBe('active');
      }
    }

    for (const scenario of [
      'recorded',
      'match_suggested',
      'escalated',
    ] as const) {
      const observationId = first.observationIds[scenario];
      for (const task of ['vehicle_report', 'vehicle_verification']) {
        expect(
          await prisma.assignment.count({
            where: {
              resourceType: 'VehicleObservation',
              resourceId: observationId,
              task,
              assigneeUserId: field.id,
              status: 'active',
            },
          }),
        ).toBe(1);
      }
    }
  }, 120_000);

  it('leaves no pending side effects after the worker drain', async () => {
    const { prisma, first } = shared;
    const { processOutboxUntilIdle } = await import('@/modules/eventing');
    expect(await processOutboxUntilIdle()).toBe(0);

    const observationIds = Object.values(first.observationIds);
    const events = await prisma.eventRecord.findMany({
      where: {
        OR: [
          {
            aggregateType: 'VehicleObservation',
            aggregateId: { in: observationIds },
          },
          {
            aggregateType: 'SuspiciousVehicleRegistry',
            aggregateId: { in: Object.values(first.registryIds) },
          },
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
  }, 120_000);
});
