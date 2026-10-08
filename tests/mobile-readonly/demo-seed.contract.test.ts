import { describe, expect, it } from 'vitest';

import type { IdentityUser } from '@/modules/identity';

import { NEGATIVE_PERSONA_EMAIL } from '../../scripts/demo/seed-identity-residents';
import { seedDemo } from '../../scripts/demo/seed';
import { MOBILE_READ_TASK } from '../../scripts/demo/seed-mobile-readonly';

// NOTE: this file must not statically import anything that transitively pulls
// in @/lib/prisma (notably ./helpers -> ./fixtures). The Prisma client binds
// DATABASE_URL at import time, while seedDemo switches the env target to
// civicos_demo only when it runs. An early static import would pin the client
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
});
