import { beforeAll, describe, expect, it } from 'vitest';

// Database-backed coverage for T-002. No static Prisma/domain imports here:
// the demo target guard must bind DATABASE_URL to civicos_demo before the
// Prisma singleton is created, so everything below is dynamic-imported after
// the seed preflight. Stable-key isolation keeps this repeat-safe on the
// shared demo database; no cleanup deletes demo fixtures.
import {
  seedIdentityResidents,
  type IdentityResidentsSeedResult,
} from '../../scripts/demo/seed-identity-residents';
import {
  DEMO_RESIDENT_PERSONAS,
  DEMO_RESIDENT_SUBJECTS,
  NEGATIVE_PERSONA_EMAIL,
  residentReportPeriods,
} from '../../scripts/demo/seed-identity-residents';

const postgresEnabled = process.env.RUN_DB_TESTS === '1';
const DEMO_URL =
  process.env.DEMO_DATABASE_URL ??
  'postgresql://civicos:civicos@localhost:5432/civicos_demo?schema=public';
const CIVICOS_URL =
  'postgresql://civicos:civicos@localhost:5432/civicos?schema=public';
const DEMO_NOW_ISO = '2026-09-28T08:00:00.000Z';
const PERIODS = residentReportPeriods(new Date(DEMO_NOW_ISO));

function seedEnv() {
  return {
    DATABASE_URL: CIVICOS_URL,
    DEMO_DATABASE_URL: DEMO_URL,
    DEMO_NOW: DEMO_NOW_ISO,
  };
}

type Shared = {
  first: IdentityResidentsSeedResult;
  second: IdentityResidentsSeedResult;
  prisma: import('@prisma/client').PrismaClient;
  identity: typeof import('@/modules/identity/local-provider');
  residents: typeof import('@/modules/residents');
};

describe.skipIf(!postgresEnabled)('demo identity/residents seed', () => {
  let shared!: Shared;

  beforeAll(async () => {
    const first = await seedIdentityResidents({ env: seedEnv() });
    const second = await seedIdentityResidents({ env: seedEnv() });
    const { prisma } = await import('@/lib/prisma');
    const identity = await import('@/modules/identity/local-provider');
    const residents = await import('@/modules/residents');
    shared = { first, second, prisma, identity, residents };
  }, 120_000);

  it('is repeat-safe across two runs', () => {
    expect(shared.second.subjectIds).toEqual(shared.first.subjectIds);
    expect(shared.second.recordIds).toEqual(shared.first.recordIds);
    expect(shared.second.activityIds).toEqual(shared.first.activityIds);
    expect(shared.second.reportIds).toEqual(shared.first.reportIds);
    expect(shared.second.reportStatuses).toEqual(['sent', 'approved', 'draft']);
  });

  it('provisions land personas with OU/role and no sessions', async () => {
    const { prisma, identity } = shared;
    for (const fixture of Object.values(DEMO_RESIDENT_PERSONAS)) {
      const stored = await prisma.user.findUniqueOrThrow({
        where: { email: fixture.email },
        include: { roles: { include: { role: true } } },
      });
      expect(stored.active).toBe(true);
      expect(stored.organizationUnitId).toBe('unit-nghia-tru');
      expect(stored.roles.map(({ role }) => role.name)).toEqual([fixture.role]);
      const login = await identity.authenticateLocal(
        fixture.email,
        'civicos-dev',
      );
      expect(login?.roles).toContain(fixture.role);
      expect(await prisma.session.count({ where: { userId: stored.id } })).toBe(
        0,
      );
    }
    const negative = await prisma.user.findUniqueOrThrow({
      where: { email: NEGATIVE_PERSONA_EMAIL },
    });
    expect(
      await prisma.assignment.count({
        where: {
          resourceType: 'SubjectManagementRecord',
          resourceId: { in: shared.first.recordIds },
          assigneeUserId: negative.id,
          status: 'active',
        },
      }),
    ).toBe(0);
  });

  it('seeds three subject types with encrypted sensitive values', async () => {
    const { prisma, first } = shared;
    const subjects = await prisma.subject.findMany({
      where: { id: { in: first.subjectIds } },
    });
    expect(subjects.map((entry) => entry.subjectType).sort()).toEqual(
      DEMO_RESIDENT_SUBJECTS.map((entry) => entry.subjectType).sort(),
    );
    for (const fixture of DEMO_RESIDENT_SUBJECTS) {
      const stored = subjects.find(
        (entry) =>
          entry.id ===
          first.subjectIds[DEMO_RESIDENT_SUBJECTS.indexOf(fixture)],
      );
      expect(stored?.sensitiveProfile).toBeTruthy();
      expect(stored?.sensitiveProfile).not.toContain(fixture.sensitiveProfile);
    }
  });

  it('creates records, SLA, activities, assignments without duplicates', async () => {
    const { prisma, identity, first } = shared;
    const records = await prisma.subjectManagementRecord.findMany({
      where: { id: { in: first.recordIds } },
    });
    expect(records.map((entry) => entry.purpose).sort()).toEqual(
      ['foreign_resident', 'reintegration', 'temporary_resident'].sort(),
    );
    const expectedSla: Record<string, string[]> = {
      temporary_resident: ['resident_registration_24h'],
      foreign_resident: [
        'resident_registration_24h',
        'foreign_same_day_report',
      ],
      reintegration: ['resident_registration_24h', 'resident_monthly_checkup'],
    };
    for (const record of records) {
      const sla = await prisma.slaInstance.findMany({
        where: {
          resourceType: 'SubjectManagementRecord',
          resourceId: record.id,
        },
      });
      for (const kind of expectedSla[record.purpose] ?? []) {
        expect(sla.map((entry) => entry.kind)).toContain(kind);
      }
    }
    for (const fixture of DEMO_RESIDENT_SUBJECTS) {
      expect(
        await prisma.subjectManagementActivity.count({
          where: { idempotencyKey: fixture.activityKey },
        }),
      ).toBe(1);
    }
    const commander = await identity.authenticateLocal(
      'truong@civicos.local',
      'civicos-dev',
    );
    const field = await identity.authenticateLocal(
      'hientruong@civicos.local',
      'civicos-dev',
    );
    if (!commander || !field) throw new Error('DEMO_ACTOR_MISSING');
    for (const recordId of first.recordIds) {
      for (const actor of [commander, field]) {
        expect(
          await prisma.assignment.count({
            where: {
              resourceType: 'SubjectManagementRecord',
              resourceId: recordId,
              task: 'resident_followup',
              assigneeUserId: actor.id,
              status: 'active',
            },
          }),
        ).toBe(1);
      }
    }
  });

  it('exposes list/detail with SLA state and masking; denies negative', async () => {
    const { prisma, identity, residents, first } = shared;
    const field = await identity.authenticateLocal(
      'hientruong@civicos.local',
      'civicos-dev',
    );
    const commander = await identity.authenticateLocal(
      'truong@civicos.local',
      'civicos-dev',
    );
    const negative = await identity.authenticateLocal(
      NEGATIVE_PERSONA_EMAIL,
      'civicos-dev',
    );
    if (!field || !commander || !negative) {
      throw new Error('DEMO_ACTOR_MISSING');
    }
    const subjects = await prisma.subject.findMany({
      where: { id: { in: first.subjectIds } },
    });
    const fullNames = new Map(
      subjects.map((entry) => [entry.id, entry.displayName]),
    );
    const visible = await residents.listSubjects(field, {});
    for (const subjectId of first.subjectIds) {
      expect(visible.map((entry) => entry.id)).toContain(subjectId);
    }
    const seeded = visible.filter((entry) =>
      first.subjectIds.includes(entry.id),
    );
    for (const entry of seeded) {
      expect(entry.displayName).not.toBe(fullNames.get(entry.id));
      expect(entry.records.length).toBeGreaterThan(0);
      for (const record of entry.records) {
        expect(['overdue', 'due_soon', 'on_time', 'unknown']).toContain(
          record.sla,
        );
      }
    }
    expect(
      seeded.flatMap((entry) => entry.records.map((record) => record.sla)),
    ).toContain('overdue');
    const detail = await residents.getSubjectDetail(
      first.subjectIds[0] as string,
      commander,
    );
    expect(detail.masked).toBe(false);
    expect(detail.sensitiveProfile).toBe(
      DEMO_RESIDENT_SUBJECTS[0]?.sensitiveProfile,
    );
    await expect(
      residents.getSubjectDetail(first.subjectIds[0] as string, negative),
    ).rejects.toThrow('FORBIDDEN');
  });

  it('holds draft/approved/sent reports with snapshot side effects', async () => {
    const { prisma, first } = shared;
    // Command ownership is by (organizationId, period): the seed reuses
    // whatever row the command returns and drives it to the wanted state.
    const [sentPeriod, approvedPeriod, draftPeriod] = PERIODS;
    const sent = await prisma.residentMonthlyReport.findUniqueOrThrow({
      where: {
        organizationId_period: {
          organizationId: 'unit-nghia-tru',
          period: sentPeriod as string,
        },
      },
    });
    const approved = await prisma.residentMonthlyReport.findUniqueOrThrow({
      where: {
        organizationId_period: {
          organizationId: 'unit-nghia-tru',
          period: approvedPeriod as string,
        },
      },
    });
    const draft = await prisma.residentMonthlyReport.findUniqueOrThrow({
      where: {
        organizationId_period: {
          organizationId: 'unit-nghia-tru',
          period: draftPeriod as string,
        },
      },
    });
    expect([sent.id, approved.id, draft.id].sort()).toEqual(
      [...first.reportIds].sort(),
    );
    expect(sent.status).toBe('sent');
    expect(approved.status).toBe('approved');
    expect(draft.status).toBe('draft');
    expect(sent.snapshotPayload).toBeTruthy();
    expect(sent.snapshotHash).toBeTruthy();
    expect(sent.sendTargetId).toBe('unit-cap-tren');
    expect(approved.snapshotPayload).toBeTruthy();
    expect(draft.snapshotPayload).toBeNull();
  });
});
