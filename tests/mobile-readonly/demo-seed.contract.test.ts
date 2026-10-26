import { describe, expect, it, vi } from 'vitest';

import type { IdentityUser } from '@/modules/identity';

import { NEGATIVE_PERSONA_EMAIL } from '../../scripts/demo/seed-identity-residents';
import { seedDemo } from '../../scripts/demo/seed';
import { MOBILE_READ_TASK } from '../../scripts/demo/seed-mobile-readonly';

// NOTE: this file must not statically import anything that transitively pulls
// in @/lib/prisma (notably ./helpers -> ./fixtures). The Prisma client binds
// DATABASE_URL at import time, while seedDemo switches the env target to
// civicos only when it runs. An early static import would pin the client
// to the outer DATABASE_URL (civicos). Runtime modules stay dynamic and run
// only after seedDemo() has bound the demo target, and the PII assertion below
// is intentionally inlined instead of importing ./helpers.
const SENSITIVE_KEYS = [
  'phoneNumber',
  'sourceContact',
  'sensitiveProfile',
  'ownerName',
  'description',
  'freeText',
] as const;

function expectNoSensitiveLeak(value: unknown): void {
  const text = JSON.stringify(value);
  for (const key of SENSITIVE_KEYS) expect(text).not.toContain(`"${key}"`);
  expect(text).not.toContain('"body"');
}

const postgresEnabled = process.env.RUN_DB_TESTS === '1';

type SeedResult = Awaited<ReturnType<typeof seedDemo>>;

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

function seededIds(seeded: SeedResult) {
  return [
    seeded.mobileReadonlyResourceIds.recordId,
    seeded.mobileReadonlyResourceIds.establishmentId,
    seeded.mobileReadonlyResourceIds.incidentId,
    seeded.mobileReadonlyResourceIds.findingId,
  ] as const;
}

describe.skipIf(!postgresEnabled)('mobile readonly demo seed contract', () => {
  it('grants exactly one active mobile_read assignment per resource across reruns', async () => {
    const first = await seedDemo();
    const second = await seedDemo();
    expect(second.mobileReadonlyAssignmentIds).toEqual(
      first.mobileReadonlyAssignmentIds,
    );
    expect(first.mobileReadonlyAssignmentIds).toHaveLength(7);
    expect(second.mobileReadonlyResourceIds.vehicleObservationIds).toEqual(
      first.mobileReadonlyResourceIds.vehicleObservationIds,
    );
    expect(first.mobileReadonlyResourceIds.vehicleObservationIds).toHaveLength(
      3,
    );
    const prisma = await demoPrisma();
    const pairs = [
      ['SubjectManagementRecord', first.mobileReadonlyResourceIds.recordId],
      ['Establishment', first.mobileReadonlyResourceIds.establishmentId],
      ['Incident', first.mobileReadonlyResourceIds.incidentId],
      ['InspectionFinding', first.mobileReadonlyResourceIds.findingId],
    ] as const;
    for (const [resourceType, resourceId] of pairs) {
      await expect(
        prisma.assignment.count({
          where: {
            resourceType,
            resourceId,
            task: MOBILE_READ_TASK,
            status: 'active',
          },
        }),
      ).resolves.toBe(1);
    }
    for (const resourceId of first.mobileReadonlyResourceIds
      .vehicleObservationIds) {
      await expect(
        prisma.assignment.count({
          where: {
            resourceType: 'VehicleObservation',
            resourceId,
            task: MOBILE_READ_TASK,
            status: 'active',
          },
        }),
      ).resolves.toBe(1);
    }
    const negative = await prisma.user.findUniqueOrThrow({
      where: { email: NEGATIVE_PERSONA_EMAIL },
      select: { id: true },
    });
    await expect(
      prisma.assignment.count({
        where: {
          assigneeUserId: negative.id,
          task: MOBILE_READ_TASK,
          status: 'active',
        },
      }),
    ).resolves.toBe(0);
    const { getOutboxHealth } = await import('@/modules/eventing');
    const health = await getOutboxHealth();
    expect(health.pendingCount).toBe(0);
    expect(health.processingCount).toBe(0);
    expect(health.deadLetterCount).toBe(0);
  }, 240_000);

  it('exposes one item per entity type to the assigned field actor', async () => {
    const seeded = await seedDemo();
    const field = await loadActor('hientruong@civicos.local');
    const { countRelatedInfo, getRelatedInfoDetail, searchRelatedInfo } =
      await import('@/modules/mobile-readonly/related-info');
    const prisma = await demoPrisma();
    const record = await prisma.subjectManagementRecord.findUniqueOrThrow({
      where: { id: seeded.mobileReadonlyResourceIds.recordId },
      select: { subjectId: true },
    });
    const expected = [
      ['RESIDENT', record.subjectId],
      ['BUSINESS', seeded.mobileReadonlyResourceIds.establishmentId],
      ['HOTSPOT', seeded.mobileReadonlyResourceIds.incidentId],
      ['VIOLATION', seeded.mobileReadonlyResourceIds.findingId],
    ] as const;
    for (const [entityType, id] of expected) {
      const result = await searchRelatedInfo(field, {
        entityType,
        page: 1,
        pageSize: 20,
      });
      expect(result.data.map((item) => item.id)).toContain(id);
      await expect(
        getRelatedInfoDetail(field, entityType, id),
      ).resolves.toMatchObject({ entityType });
      expectNoSensitiveLeak(result);
    }
    const counts = await countRelatedInfo(field, {});
    for (const entityType of [
      'RESIDENT',
      'BUSINESS',
      'HOTSPOT',
      'VIOLATION',
    ] as const) {
      expect(counts[entityType]).toBeGreaterThan(0);
    }
  }, 180_000);

  it('keeps the negative persona empty and forbidden without leaking resources', async () => {
    const seeded = await seedDemo();
    const negative = await loadActor(NEGATIVE_PERSONA_EMAIL);
    const { getRelatedInfoDetail, searchRelatedInfo } =
      await import('@/modules/mobile-readonly/related-info');
    const { getDispatch, getTask, listAlarms, listDispatches, listTasks } =
      await import('@/modules/mobile-readonly/forces');
    for (const entityType of [
      'RESIDENT',
      'BUSINESS',
      'HOTSPOT',
      'VIOLATION',
    ] as const) {
      await expect(
        searchRelatedInfo(negative, { entityType, page: 1, pageSize: 20 }),
      ).resolves.toMatchObject({ data: [], total: 0 });
    }
    const prisma = await demoPrisma();
    const record = await prisma.subjectManagementRecord.findUniqueOrThrow({
      where: { id: seeded.mobileReadonlyResourceIds.recordId },
      select: { subjectId: true },
    });
    const details = [
      ['RESIDENT', record.subjectId],
      ['BUSINESS', seeded.mobileReadonlyResourceIds.establishmentId],
      ['HOTSPOT', seeded.mobileReadonlyResourceIds.incidentId],
      ['VIOLATION', seeded.mobileReadonlyResourceIds.findingId],
    ] as const;
    for (const [entityType, id] of details) {
      await expect(
        getRelatedInfoDetail(negative, entityType, id),
      ).rejects.toThrow('FORBIDDEN');
    }
    await expect(listDispatches(negative, {})).resolves.toMatchObject({
      data: [],
      total: 0,
    });
    await expect(listTasks(negative, {})).resolves.toMatchObject({
      data: [],
      total: 0,
    });
    await expect(
      getDispatch(
        negative,
        `dispatch:${seeded.mobileReadonlyAssignmentIds[0]}`,
      ),
    ).rejects.toThrow('FORBIDDEN');
    await expect(
      getTask(negative, `task:${seeded.mobileReadonlyAssignmentIds[0]}`),
    ).rejects.toThrow('FORBIDDEN');
    const alarms = await listAlarms(negative);
    expect(alarms.alarms.map((alarm) => alarm.resourceId)).not.toEqual(
      expect.arrayContaining([...seededIds(seeded)]),
    );
    expect(JSON.stringify(alarms)).not.toContain('"body"');
    expectNoSensitiveLeak(alarms);
  }, 180_000);

  it('links forces dispatch/task views to seeded resources without leaking bodies', async () => {
    const seeded = await seedDemo();
    const field = await loadActor('hientruong@civicos.local');
    const { getDispatch, getTask, listAlarms, listDispatches, listTasks } =
      await import('@/modules/mobile-readonly/forces');
    const [dispatches, tasks] = await Promise.all([
      listDispatches(field, {}),
      listTasks(field, {}),
    ]);
    expect(dispatches.data.length).toBeGreaterThan(0);
    expect(tasks.data.length).toBeGreaterThan(0);
    for (const resourceId of seededIds(seeded)) {
      const dispatch = dispatches.data.find(
        (item) => item.resourceId === resourceId,
      );
      expect(dispatch?.relatedInfo?.id).toBe(resourceId);
      expect(dispatch?.assignmentSummary).toEqual(expect.any(Object));
      const task = tasks.data.find((item) => item.resourceId === resourceId);
      expect(task?.relatedInfo?.id).toBe(resourceId);
      expect(task?.dispatchId).toBe(
        `dispatch:${task?.assignmentSummary?.assignmentId}`,
      );
    }
    expect(JSON.stringify({ dispatches, tasks })).not.toContain('"body"');
    expectNoSensitiveLeak({ dispatches, tasks });
    const dispatch = await getDispatch(
      field,
      `dispatch:${seeded.mobileReadonlyAssignmentIds[0]}`,
    );
    expect(dispatch.relatedInfo).toEqual({
      entityType: 'RESIDENT',
      id: seeded.mobileReadonlyResourceIds.recordId,
    });
    const task = await getTask(
      field,
      `task:${seeded.mobileReadonlyAssignmentIds[0]}`,
    );
    expect(task.relatedInfo).toEqual({
      entityType: 'RESIDENT',
      id: seeded.mobileReadonlyResourceIds.recordId,
    });
    const alarms = await listAlarms(field);
    expect(JSON.stringify(alarms)).not.toContain('"body"');
    expectNoSensitiveLeak(alarms);
    for (const alarm of alarms.alarms) {
      expect(alarm.resourceId).toEqual(expect.any(String));
      expect(alarm.assignmentSummary).toEqual(expect.any(Object));
    }
    // DS-09 seed prerequisites for the T-010 vehicle read boundary (production
    // read support is owned by T-010 and is not asserted here): every unread
    // vehicle notification for the field actor targets a seeded observation
    // that carries exactly one active same-OU mobile_read assignment, with no
    // duplicates. The only non-T-005 row allowed is the legacy core seed
    // observation, which stays outside T-006 scope.
    const prisma = await demoPrisma();
    const vehicleObservationIds =
      seeded.mobileReadonlyResourceIds.vehicleObservationIds;
    expect(vehicleObservationIds).toHaveLength(3);

    async function expectSingleVehiclePrerequisite(resourceId: string) {
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
    }

    const vehicleNotifications = await prisma.notification.findMany({
      where: {
        userId: field.id,
        resourceType: 'VehicleObservation',
        readAt: null,
      },
      select: { resourceId: true },
    });
    expect(vehicleNotifications.length).toBeGreaterThan(0);
    for (const notification of vehicleNotifications) {
      expect([...vehicleObservationIds, seeded.observationId]).toContain(
        notification.resourceId,
      );
      if (
        notification.resourceId &&
        (vehicleObservationIds as readonly string[]).includes(
          notification.resourceId,
        )
      ) {
        await expectSingleVehiclePrerequisite(notification.resourceId);
      }
    }
    for (const resourceId of vehicleObservationIds) {
      await expectSingleVehiclePrerequisite(resourceId);
    }
  }, 180_000);

  it('resolves canonical VehicleObservation through alarm/dispatch/task and six-field mobile detail', async () => {
    const seeded = await seedDemo();
    const field = await loadActor('hientruong@civicos.local');
    const prisma = await demoPrisma();

    // VehicleObservation must never become a related-info entity type.
    const { MOBILE_READ_ENTITY_TYPES } =
      await import('@/modules/mobile-readonly/contracts');
    expect([...MOBILE_READ_ENTITY_TYPES]).toEqual([
      'RESIDENT',
      'BUSINESS',
      'HOTSPOT',
      'VIOLATION',
    ]);
    expect(MOBILE_READ_ENTITY_TYPES).not.toContain('VehicleObservation');

    const vehicleObservationIds =
      seeded.mobileReadonlyResourceIds.vehicleObservationIds;
    expect(vehicleObservationIds).toHaveLength(3);

    const { getMobileObservation } =
      await import('@/modules/vehicles/projection');
    const { getDispatch, getTask, listAlarms, listDispatches, listTasks } =
      await import('@/modules/mobile-readonly/forces');

    // Alarm rows carry explicit canonical resource identity, coordinates,
    // a safe mobile_read summary and no body/sensitive payload.
    const { alarms } = await listAlarms(field);
    const vehicleAlarms = alarms.filter(
      (alarm) => alarm.resourceType === 'VehicleObservation',
    );
    expect(vehicleAlarms.length).toBeGreaterThan(0);
    for (const alarm of vehicleAlarms) {
      expect(vehicleObservationIds).toContain(alarm.resourceId);
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
    expect(JSON.stringify(vehicleAlarms)).not.toContain('"body"');
    expectNoSensitiveLeak({ vehicleAlarms });

    // Dispatch/task rows resolve the same canonical resource without new
    // aggregates, related-info substitution, or body leakage.
    const [dispatches, tasks] = await Promise.all([
      listDispatches(field, {}),
      listTasks(field, {}),
    ]);
    const vehicleDispatches = dispatches.data.filter(
      (item) => item.resourceType === 'VehicleObservation',
    );
    const vehicleTasks = tasks.data.filter(
      (item) => item.resourceType === 'VehicleObservation',
    );
    expect(vehicleDispatches.length).toBeGreaterThan(0);
    expect(vehicleTasks.length).toBeGreaterThan(0);
    expect(
      vehicleDispatches.map((item) => item.assignmentSummary?.task),
    ).toContain('mobile_read');
    for (const item of [...vehicleDispatches, ...vehicleTasks]) {
      expect(vehicleObservationIds).toContain(item.resourceId);
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
    expect(JSON.stringify({ vehicleDispatches, vehicleTasks })).not.toContain(
      '"body"',
    );
    expectNoSensitiveLeak({ vehicleDispatches, vehicleTasks });
    const target = vehicleDispatches.find(
      (item) => item.assignmentSummary?.task === 'mobile_read',
    );
    if (!target) throw new Error('T012_MOBILE_VEHICLE_DISPATCH_MISSING');
    const dispatch = await getDispatch(field, target.id);
    expect(dispatch).toEqual(
      expect.objectContaining({
        resourceType: 'VehicleObservation',
        resourceId: target.resourceId,
        assignmentSummary: expect.any(Object),
      }),
    );
    expect(dispatch).not.toHaveProperty('relatedInfo');
    const task = await getTask(field, target.id.replace('dispatch:', 'task:'));
    expect(task).toEqual(
      expect.objectContaining({
        resourceType: 'VehicleObservation',
        resourceId: target.resourceId,
        assignmentSummary: expect.any(Object),
      }),
    );
    expect(task).not.toHaveProperty('relatedInfo');

    // Mobile detail returns exactly the six-field T-010 projection.
    const observationId = vehicleObservationIds[0] as string;
    const source = await prisma.vehicleObservation.findUniqueOrThrow({
      where: { id: observationId },
    });
    const mobile = await getMobileObservation(observationId, field);
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
    expect(JSON.stringify(mobile)).not.toContain('"body"');
    expectNoSensitiveLeak(mobile);

    // Same projection through the locked ?view=mobile route surface.
    const identity = await import('@/modules/identity');
    async function withUser<T>(
      user: typeof field | null,
      fn: () => Promise<T>,
    ): Promise<T> {
      const spy = vi
        .spyOn(identity, 'getCurrentUser')
        .mockResolvedValue(user as never);
      try {
        return await fn();
      } finally {
        spy.mockRestore();
      }
    }
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
    await expect(response.json()).resolves.toEqual(mobile);

    // Negative actor keeps the existing empty/forbidden boundary with no
    // vehicle mobile_read assignment and no sensitive leakage.
    const negative = await loadActor(NEGATIVE_PERSONA_EMAIL);
    await expect(
      prisma.assignment.count({
        where: {
          resourceType: 'VehicleObservation',
          assigneeUserId: negative.id,
          task: MOBILE_READ_TASK,
          status: 'active',
        },
      }),
    ).resolves.toBe(0);
    const { alarms: negativeAlarms } = await listAlarms(negative);
    expect(negativeAlarms.map((alarm) => alarm.resourceId)).not.toEqual(
      expect.arrayContaining([...vehicleObservationIds]),
    );
    expect(JSON.stringify(negativeAlarms)).not.toContain('"body"');
    expectNoSensitiveLeak(negativeAlarms);
    await expect(getMobileObservation(observationId, negative)).rejects.toThrow(
      'FORBIDDEN',
    );
    const negativeRoute = await withUser(negative, () =>
      route.GET(
        new Request(
          `http://localhost/api/vehicles/observations/${observationId}?view=mobile`,
        ),
        { params: Promise.resolve({ observationId }) },
      ),
    );
    expect(negativeRoute.status).toBe(403);

    // Cross-OU actor with no same-OU assignment receives the same forbidden
    // boundary without learning resource existence through mobile detail.
    const crossOuActor = { ...field, organizationUnitId: 'cross-ou-demo' };
    await expect(
      getMobileObservation(observationId, crossOuActor),
    ).rejects.toThrow('FORBIDDEN');
    const { alarms: crossAlarms } = await listAlarms(crossOuActor);
    expect(crossAlarms.map((alarm) => alarm.resourceId)).not.toEqual(
      expect.arrayContaining([...vehicleObservationIds]),
    );
  }, 180_000);

  it('preserves stable vehicle observation/assignment IDs with no duplicate derived notifications on repeat seed', async () => {
    const first = await seedDemo();
    const prisma = await demoPrisma();
    const fieldRow = await prisma.user.findUniqueOrThrow({
      where: { email: 'hientruong@civicos.local' },
      select: { id: true },
    });
    const vehicleNotificationsBefore = await prisma.notification.findMany({
      where: {
        userId: fieldRow.id,
        resourceType: 'VehicleObservation',
      },
      select: { id: true, resourceId: true },
      orderBy: { id: 'asc' },
    });

    const second = await seedDemo();

    expect(second.vehicleObservationIds).toEqual(first.vehicleObservationIds);
    expect(second.vehicleRegistryIds).toEqual(first.vehicleRegistryIds);
    expect(second.observationId).toBe(first.observationId);
    expect(second.mobileReadonlyAssignmentIds).toEqual(
      first.mobileReadonlyAssignmentIds,
    );
    expect(second.mobileReadonlyResourceIds.vehicleObservationIds).toEqual(
      first.mobileReadonlyResourceIds.vehicleObservationIds,
    );

    // Exactly one active mobile_read assignment per seeded vehicle.
    await expect(
      prisma.assignment.count({
        where: {
          resourceType: 'VehicleObservation',
          resourceId: {
            in: [...first.mobileReadonlyResourceIds.vehicleObservationIds],
          },
          task: MOBILE_READ_TASK,
          status: 'active',
        },
      }),
    ).resolves.toBe(3);

    // No duplicate derived vehicle notifications across the repeat run.
    const vehicleNotificationsAfter = await prisma.notification.findMany({
      where: {
        userId: fieldRow.id,
        resourceType: 'VehicleObservation',
      },
      select: { id: true, resourceId: true },
      orderBy: { id: 'asc' },
    });
    expect(vehicleNotificationsAfter).toEqual(vehicleNotificationsBefore);
    expect(vehicleNotificationsAfter.length).toBeGreaterThan(0);

    const { getOutboxHealth } = await import('@/modules/eventing');
    const health = await getOutboxHealth();
    expect(health.pendingCount).toBe(0);
    expect(health.processingCount).toBe(0);
    expect(health.deadLetterCount).toBe(0);
  }, 240_000);
});
