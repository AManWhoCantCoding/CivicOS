import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { IdentityUser } from '@/modules/identity';

import { NEGATIVE_PERSONA_EMAIL } from '../../scripts/demo/seed-identity-residents';
import { MOBILE_READ_TASK } from '../../scripts/demo/seed-mobile-readonly';
import { seedDemo } from '../../scripts/demo/seed';

// DB-backed T-010 boundary coverage. No static Prisma/domain imports here:
// seedDemo binds DATABASE_URL to civicos when it runs, so every module
// below is dynamic-imported after the seed preflight. Stable-key isolation
// keeps this repeat-safe on the shared demo database; only t010-prefixed
// fixture rows are created, and they are removed in afterAll.
// DB-CONSOLIDATION (safety follow-up): demo seed suite disabled — its seed
// helpers intentionally target the demo `civicos` database; keep it skipped
// until an E2E-safe fixture seam exists. Do not re-enable via RUN_DB_TESTS.
const stamp = randomUUID().slice(0, 8);

type SeedResult = Awaited<ReturnType<typeof seedDemo>>;
let seeded!: SeedResult;

async function demoPrisma() {
  const { prisma } = await import('@/lib/prisma');
  return prisma;
}

async function loadActor(email: string): Promise<IdentityUser> {
  const prisma = await demoPrisma();
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

function vehicleActor(actor: IdentityUser): IdentityUser {
  return actor;
}

const REDACTED_FRAGMENTS = [
  '"body"',
  '"description"',
  '"observedById"',
  '"clientCommandId"',
  '"version"',
  '"evidenceIds"',
  '"matchedRegistryId"',
  '"ownerLookup"',
  '"verification',
  '"permissions"',
  '"canConfirm"',
  '"canVerify"',
  '"canEscalate"',
  '"notes"',
] as const;

function expectRedacted(value: unknown): void {
  const text = JSON.stringify(value);
  for (const fragment of REDACTED_FRAGMENTS) {
    expect(text).not.toContain(fragment);
  }
}

async function withUser<T>(
  user: IdentityUser | null,
  fn: () => Promise<T>,
): Promise<T> {
  const identity = await import('@/modules/identity');
  const spy = vi
    .spyOn(identity, 'getCurrentUser')
    .mockResolvedValue(user as IdentityUser | null as never);
  try {
    return await fn();
  } finally {
    spy.mockRestore();
  }
}

const ouB = `t010-ou-b-${stamp}`;
const crossUser: IdentityUser = {
  id: `t010-cross-${stamp}`,
  email: `t010-cross-${stamp}@example.test`,
  name: 'T010 cross unit',
  roles: ['field_officer'],
  organizationUnitId: ouB,
};
const verifyOnlyUser: IdentityUser = {
  id: `t010-verify-only-${stamp}`,
  email: `t010-verify-only-${stamp}@example.test`,
  name: 'T010 verify only',
  roles: ['field_officer'],
  organizationUnitId: undefined,
};
const MISSING_OBSERVATION_ID = `t010-missing-${stamp}`;

describe.skip('T-010 vehicle mobile read boundary', () => {
  beforeAll(async () => {
    seeded = await seedDemo();
    const prisma = await demoPrisma();
    const field = await loadActor('hientruong@civicos.local');
    if (!field.organizationUnitId) throw new Error('T010_FIELD_OU_MISSING');
    verifyOnlyUser.organizationUnitId = field.organizationUnitId;
    await prisma.organizationUnit.create({
      data: { id: ouB, name: `T010 B ${stamp}`, level: 'commune' },
    });
    await prisma.user.createMany({
      data: [crossUser, verifyOnlyUser].map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        organizationUnitId: user.organizationUnitId,
        active: true,
      })),
    });
    // Same-OU actor holding only the web workflow tasks: must never satisfy
    // the mobile boundary, which requires task=mobile_read.
    await prisma.assignment.createMany({
      data: [
        {
          id: `t010-verify-${stamp}`,
          resourceType: 'VehicleObservation',
          resourceId: seeded.mobileReadonlyResourceIds.vehicleObservationIds[0],
          task: 'vehicle_verification',
          assigneeUserId: verifyOnlyUser.id,
          grantedById: field.id,
          organizationId: field.organizationUnitId,
        },
        {
          id: `t010-report-${stamp}`,
          resourceType: 'VehicleObservation',
          resourceId: seeded.mobileReadonlyResourceIds.vehicleObservationIds[0],
          task: 'vehicle_report',
          assigneeUserId: verifyOnlyUser.id,
          grantedById: field.id,
          organizationId: field.organizationUnitId,
        },
      ],
    });
  }, 300_000);

  afterAll(async () => {
    const prisma = await demoPrisma();
    await prisma.assignment.deleteMany({
      where: { id: { in: [`t010-verify-${stamp}`, `t010-report-${stamp}`] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [crossUser.id, verifyOnlyUser.id] } },
    });
    await prisma.organizationUnit.deleteMany({ where: { id: ouB } });
    // Read-path audits emit outbox work; drain it so the shared demo
    // database keeps a clean worker-health signal for other suites.
    const { processOutboxUntilIdle } = await import('@/modules/eventing');
    await processOutboxUntilIdle();
  });

  it('keeps one active same-OU mobile_read assignment per T-005 observation', async () => {
    const prisma = await demoPrisma();
    const field = await loadActor('hientruong@civicos.local');
    const { hasActiveAssignmentForRead } = await import('@/modules/identity');
    const vehicleObservationIds =
      seeded.mobileReadonlyResourceIds.vehicleObservationIds;
    expect(vehicleObservationIds).toHaveLength(3);
    for (const resourceId of vehicleObservationIds) {
      await expect(
        prisma.assignment.count({
          where: {
            resourceType: 'VehicleObservation',
            resourceId,
            task: MOBILE_READ_TASK,
            assigneeUserId: field.id,
            status: 'active',
            ...(field.organizationUnitId
              ? { organizationId: field.organizationUnitId }
              : {}),
          },
        }),
      ).resolves.toBe(1);
      await expect(
        hasActiveAssignmentForRead(vehicleActor(field), {
          resourceType: 'VehicleObservation',
          resourceId,
        }),
      ).resolves.toBe(true);
    }
    const negative = await loadActor(NEGATIVE_PERSONA_EMAIL);
    await expect(
      prisma.assignment.count({
        where: {
          assigneeUserId: negative.id,
          task: MOBILE_READ_TASK,
          status: 'active',
        },
      }),
    ).resolves.toBe(0);
  }, 120_000);

  it('exposes vehicle alarms with explicit resource type and no body', async () => {
    const field = await loadActor('hientruong@civicos.local');
    const { listAlarms } = await import('@/modules/mobile-readonly/forces');
    const { alarms } = await listAlarms(vehicleActor(field));
    const vehicleAlarms = alarms.filter(
      (alarm) => alarm.resourceType === 'VehicleObservation',
    );
    expect(vehicleAlarms.length).toBeGreaterThan(0);
    for (const alarm of vehicleAlarms) {
      expect(seeded.mobileReadonlyResourceIds.vehicleObservationIds).toContain(
        alarm.resourceId,
      );
      expect(alarm).toEqual(
        expect.objectContaining({
          resourceType: 'VehicleObservation',
          resourceId: expect.any(String),
          status: 'unread',
          createdAt: expect.any(String),
          coordinates: { lat: expect.any(Number), lng: expect.any(Number) },
          assignmentSummary: expect.objectContaining({
            task: 'mobile_read',
            status: 'active',
          }),
        }),
      );
      expect(alarm).not.toHaveProperty('relatedInfo');
    }
    expectRedacted(alarms);
    const negative = await loadActor(NEGATIVE_PERSONA_EMAIL);
    const { alarms: negativeAlarms } = await listAlarms(vehicleActor(negative));
    expect(negativeAlarms.map((alarm) => alarm.resourceId)).not.toEqual(
      expect.arrayContaining([
        ...seeded.mobileReadonlyResourceIds.vehicleObservationIds,
      ]),
    );
    expectRedacted(negativeAlarms);
  }, 120_000);

  it('links vehicle dispatch/task rows without new aggregates', async () => {
    const field = await loadActor('hientruong@civicos.local');
    const {
      getDispatch,
      getTask,
      listDispatches,
      listTasks,
      listTasksByDispatchId,
    } = await import('@/modules/mobile-readonly/forces');
    const [dispatches, tasks] = await Promise.all([
      listDispatches(vehicleActor(field), {}),
      listTasks(vehicleActor(field), {}),
    ]);
    const vehicleDispatches = dispatches.data.filter(
      (item) => item.resourceType === 'VehicleObservation',
    );
    const vehicleTasks = tasks.data.filter(
      (item) => item.resourceType === 'VehicleObservation',
    );
    expect(vehicleDispatches.length).toBeGreaterThan(0);
    expect(vehicleTasks.length).toBeGreaterThan(0);
    // The actor also holds the T-005 web workflow assignments on the same
    // observations; forces rows keep existing per-assignment semantics, so
    // both mobile_read and web task rows appear with valid summaries.
    expect(
      vehicleDispatches.map((item) => item.assignmentSummary?.task),
    ).toContain('mobile_read');
    for (const item of [...vehicleDispatches, ...vehicleTasks]) {
      expect(seeded.mobileReadonlyResourceIds.vehicleObservationIds).toContain(
        item.resourceId,
      );
      expect(item).toEqual(
        expect.objectContaining({
          resourceType: 'VehicleObservation',
          resourceId: expect.any(String),
          coordinates: { lat: expect.any(Number), lng: expect.any(Number) },
          assignmentSummary: expect.objectContaining({ status: 'active' }),
        }),
      );
      expect(item).not.toHaveProperty('relatedInfo');
    }
    expectRedacted({ dispatches, tasks });
    const target = vehicleDispatches.find(
      (item) => item.assignmentSummary?.task === 'mobile_read',
    );
    if (!target) throw new Error('T010_MOBILE_VEHICLE_DISPATCH_MISSING');
    const dispatchId = target.id;
    const taskId = dispatchId.replace('dispatch:', 'task:');
    const [dispatch, task, byDispatch] = await Promise.all([
      getDispatch(vehicleActor(field), dispatchId),
      getTask(vehicleActor(field), taskId),
      listTasksByDispatchId(vehicleActor(field), dispatchId),
    ]);
    for (const item of [dispatch, task]) {
      expect(item).toEqual(
        expect.objectContaining({
          resourceType: 'VehicleObservation',
          resourceId: target.resourceId,
          coordinates: { lat: expect.any(Number), lng: expect.any(Number) },
          assignmentSummary: expect.any(Object),
        }),
      );
      expect(item).not.toHaveProperty('relatedInfo');
    }
    expect(byDispatch.data.map((item) => item.id)).toContain(taskId);
    expectRedacted([dispatch, task, byDispatch]);
    // A same-OU actor holding only the T-005 web workflow tasks (no
    // mobile_read) sees nothing and is forbidden at detail time.
    await expect(
      listDispatches(vehicleActor(verifyOnlyUser), {}),
    ).resolves.toMatchObject({ data: [], total: 0 });
    await expect(
      listTasks(vehicleActor(verifyOnlyUser), {}),
    ).resolves.toMatchObject({ data: [], total: 0 });
    const negative = await loadActor(NEGATIVE_PERSONA_EMAIL);
    await expect(
      getDispatch(vehicleActor(negative), dispatchId),
    ).rejects.toThrow('FORBIDDEN');
    await expect(getTask(vehicleActor(negative), taskId)).rejects.toThrow(
      'FORBIDDEN',
    );
  }, 120_000);

  it('keeps reads read-only with no Dispatch/Task/Camera aggregates', async () => {
    const prisma = await demoPrisma();
    expect(
      (prisma as unknown as Record<string, unknown>).dispatch,
    ).toBeUndefined();
    expect((prisma as unknown as Record<string, unknown>).task).toBeUndefined();
    expect(
      (prisma as unknown as Record<string, unknown>).camera,
    ).toBeUndefined();
    const field = await loadActor('hientruong@civicos.local');
    const observationId =
      seeded.mobileReadonlyResourceIds.vehicleObservationIds[0];
    const vehicleAssignment = await prisma.assignment.findFirstOrThrow({
      where: {
        resourceType: 'VehicleObservation',
        resourceId: observationId,
        task: MOBILE_READ_TASK,
        assigneeUserId: field.id,
        status: 'active',
      },
      select: { id: true },
    });
    async function snapshot() {
      const [
        assignments,
        notifications,
        observations,
        verifications,
        evidence,
        sla,
      ] = await Promise.all([
        prisma.assignment.count(),
        prisma.notification.count(),
        prisma.vehicleObservation.count(),
        prisma.vehicleVerification.count(),
        prisma.evidence.count(),
        prisma.slaInstance.count(),
      ]);
      return {
        assignments,
        notifications,
        observations,
        verifications,
        evidence,
        sla,
      };
    }
    const before = await snapshot();
    const auditCutoff = new Date();
    const {
      getDispatch,
      getTask,
      listAlarms,
      listDispatches,
      listTasks,
      listTasksByDispatchId,
    } = await import('@/modules/mobile-readonly/forces');
    const { getMobileObservation } =
      await import('@/modules/vehicles/projection');
    await listAlarms(vehicleActor(field));
    await listDispatches(vehicleActor(field), {});
    await listTasks(vehicleActor(field), {});
    await getDispatch(vehicleActor(field), `dispatch:${vehicleAssignment.id}`);
    await getTask(vehicleActor(field), `task:${vehicleAssignment.id}`);
    await listTasksByDispatchId(
      vehicleActor(field),
      `dispatch:${vehicleAssignment.id}`,
    );
    await getMobileObservation(observationId, vehicleActor(field));
    // Read-path audits reuse the existing audit seam; drain their outbox
    // side effects, then every domain aggregate count must be unchanged.
    // The only ProjectionRecord growth allowed is the audit-event projection
    // that web reads produce through the same seam.
    const { getOutboxHealth, processOutboxUntilIdle } =
      await import('@/modules/eventing');
    await processOutboxUntilIdle();
    await expect(snapshot()).resolves.toEqual(before);
    const touched = await prisma.projectionRecord.findMany({
      where: { updatedAt: { gte: auditCutoff } },
      select: { aggregateType: true },
    });
    expect(touched.length).toBeGreaterThan(0);
    for (const row of touched) expect(row.aggregateType).toBe('AuditEvent');
    const health = await getOutboxHealth();
    expect(health.pendingCount).toBe(0);
    expect(health.processingCount).toBe(0);
    expect(health.deadLetterCount).toBe(0);
  }, 180_000);

  it('returns the exact six-field mobile projection with the full plate', async () => {
    const prisma = await demoPrisma();
    const field = await loadActor('hientruong@civicos.local');
    const observationId =
      seeded.mobileReadonlyResourceIds.vehicleObservationIds[0];
    const source = await prisma.vehicleObservation.findUniqueOrThrow({
      where: { id: observationId },
    });
    const { getMobileObservation } =
      await import('@/modules/vehicles/projection');
    const mobile = await getMobileObservation(
      observationId,
      vehicleActor(field),
    );
    expect(mobile).toEqual({
      id: observationId,
      plate: source.plate,
      status: source.status,
      observedAt: source.observedAt.toISOString(),
      latitude: source.latitude.toString(),
      longitude: source.longitude.toString(),
    });
    expect(Object.keys(mobile).sort()).toEqual(
      ['id', 'latitude', 'longitude', 'observedAt', 'plate', 'status'].sort(),
    );
    expectRedacted(mobile);
    const route =
      await import('@/app/api/vehicles/observations/[observationId]/route');
    const response = await withUser(field, () =>
      route.GET(
        new Request(
          `http://localhost/api/vehicles/observations/${observationId}?view=mobile`,
        ),
        { params: Promise.resolve({ observationId }) },
      ),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(mobile);
    expectRedacted(body);
  }, 120_000);

  it('preserves the raw web response without view=mobile', async () => {
    const field = await loadActor('hientruong@civicos.local');
    const observationId =
      seeded.mobileReadonlyResourceIds.vehicleObservationIds[0];
    const route =
      await import('@/app/api/vehicles/observations/[observationId]/route');
    const response = await withUser(field, () =>
      route.GET(
        new Request(
          `http://localhost/api/vehicles/observations/${observationId}`,
        ),
        {
          params: Promise.resolve({ observationId }),
        },
      ),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(
      ['observation', 'permissions', 'verifications'].sort(),
    );
    const raw = body.observation as Record<string, unknown>;
    expect(raw.id).toBe(observationId);
    expect(typeof raw.observedById).toBe('string');
    for (const key of [
      'description',
      'clientCommandId',
      'version',
      'evidenceIds',
      'matchedRegistryId',
    ]) {
      expect(raw).toHaveProperty(key);
    }
  }, 120_000);

  it('never substitutes vehicle_report/vehicle_verification for mobile_read', async () => {
    const { hasActiveAssignmentForRead } = await import('@/modules/identity');
    const observationId =
      seeded.mobileReadonlyResourceIds.vehicleObservationIds[0];
    await expect(
      hasActiveAssignmentForRead(vehicleActor(verifyOnlyUser), {
        resourceType: 'VehicleObservation',
        resourceId: observationId,
      }),
    ).resolves.toBe(false);
    const route =
      await import('@/app/api/vehicles/observations/[observationId]/route');
    const response = await withUser(verifyOnlyUser, () =>
      route.GET(
        new Request(
          `http://localhost/api/vehicles/observations/${observationId}?view=mobile`,
        ),
        { params: Promise.resolve({ observationId }) },
      ),
    );
    expect(response.status).toBe(403);
  }, 120_000);

  it('holds the unassigned, cross-OU, missing, and unauthenticated boundary', async () => {
    const field = await loadActor('hientruong@civicos.local');
    const negative = await loadActor(NEGATIVE_PERSONA_EMAIL);
    const observationId =
      seeded.mobileReadonlyResourceIds.vehicleObservationIds[0];
    const route =
      await import('@/app/api/vehicles/observations/[observationId]/route');
    const mobileUrl = (id: string) =>
      `http://localhost/api/vehicles/observations/${id}?view=mobile`;
    const [unassignedResponse, crossResponse, missingResponse] =
      await Promise.all([
        withUser(negative, () =>
          route.GET(new Request(mobileUrl(observationId)), {
            params: Promise.resolve({ observationId }),
          }),
        ),
        withUser(crossUser, () =>
          route.GET(new Request(mobileUrl(observationId)), {
            params: Promise.resolve({ observationId }),
          }),
        ),
        withUser(field, () =>
          route.GET(new Request(mobileUrl(MISSING_OBSERVATION_ID)), {
            params: Promise.resolve({ observationId: MISSING_OBSERVATION_ID }),
          }),
        ),
      ]);
    expect(unassignedResponse.status).toBe(403);
    expect(crossResponse.status).toBe(403);
    expect(missingResponse.status).toBe(404);
    const webMissingResponse = await withUser(field, () =>
      route.GET(
        new Request(
          `http://localhost/api/vehicles/observations/${MISSING_OBSERVATION_ID}`,
        ),
        { params: Promise.resolve({ observationId: MISSING_OBSERVATION_ID }) },
      ),
    );
    expect(webMissingResponse.status).toBe(404);
    const unauthenticatedVehicle = await withUser(null, () =>
      route.GET(new Request(mobileUrl(observationId)), {
        params: Promise.resolve({ observationId }),
      }),
    );
    expect(unauthenticatedVehicle.status).toBe(401);
    const alarmsRoute = await import('@/app/api/forces/alarms/route');
    const unauthenticatedAlarms = await withUser(null, () => alarmsRoute.GET());
    expect(unauthenticatedAlarms.status).toBe(401);
  }, 120_000);
});
