// Deterministic identity/resident demo fixtures for demo-seed-restart (T-002).
// Pure manifest helpers at top: no Prisma/domain import so unit tests load
// this module without a database. The orchestration below dynamic-imports
// Prisma/domain only after the demo target guard + clock preflight have run.
import type { IdentityUser, RoleName } from '@/modules/identity';
import { RESIDENT_SUBJECT_TYPES } from '@/modules/residents/contracts';
import type { ResidentSubjectType } from '@/modules/residents/contracts';

import { applyDemoTargetToEnv, type DemoEnv } from './demo-db';
import { preflightDemoFoundation } from './clock';
import type { prisma as prismaSingleton } from '@/lib/prisma';

type DemoPrisma = typeof prismaSingleton;

export const NEGATIVE_PERSONA_EMAIL = 'khongduocphancong@civicos.local';

export const DEMO_RESIDENT_PERSONAS = {
  landOfficer: {
    email: 'datdai-demo@civicos.local',
    name: '[DEMO-RESTART] Can bo dat dai',
    role: 'land_officer',
  },
  communeLeader: {
    email: 'lanhdao-xa-demo@civicos.local',
    name: '[DEMO-RESTART] Lanh dao xa',
    role: 'commune_leader',
  },
} as const satisfies Record<
  string,
  { email: string; name: string; role: RoleName }
>;

export type DemoResidentSubjectFixture = {
  key: string;
  displayName: string;
  subjectType: ResidentSubjectType;
  purpose: ResidentSubjectType;
  sensitiveProfile: string;
  activityKey: string;
  activityContent: string;
};

export const DEMO_RESIDENT_SUBJECTS: readonly DemoResidentSubjectFixture[] = [
  {
    key: 'demo-seed-restart-resident-temporary-01',
    displayName: '[DEMO-RESTART] Tam tru Nguyen Van An 01',
    subjectType: 'temporary_resident',
    purpose: 'temporary_resident',
    sensitiveProfile: '[DEMO-RESTART] sensitive tam-tru-01',
    activityKey: 'demo-seed-restart-resident-activity-temporary-01',
    activityContent: '[DEMO-RESTART] Tham ho tam tru dinh ky.',
  },
  {
    key: 'demo-seed-restart-resident-foreign-01',
    displayName: '[DEMO-RESTART] Nuoc ngoai Smith Demo 01',
    subjectType: 'foreign_resident',
    purpose: 'foreign_resident',
    sensitiveProfile: '[DEMO-RESTART] sensitive foreign-01',
    activityKey: 'demo-seed-restart-resident-activity-foreign-01',
    activityContent: '[DEMO-RESTART] Kiem tra luu tru nguoi nuoc ngoai.',
  },
  {
    key: 'demo-seed-restart-resident-reintegration-01',
    displayName: '[DEMO-RESTART] Tai hoa nhap Tran Van Binh 01',
    subjectType: 'reintegration',
    purpose: 'reintegration',
    sensitiveProfile: '[DEMO-RESTART] sensitive reintegration-01',
    activityKey: 'demo-seed-restart-resident-activity-reintegration-01',
    activityContent: '[DEMO-RESTART] Tham ho tai hoa nhap cong dong.',
  },
] as const;

export function residentReportIdempotencyKey(period: string): string {
  return `demo-seed-restart-resident-report-${period}`;
}

// Three consecutive calendar months ending at the adapter clock month, so
// draft/approved/sent report fixtures stay deterministic per DEMO_NOW.
export function residentReportPeriods(
  now: Date,
): readonly [string, string, string] {
  const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periods = [2, 1, 0].map((offset) => {
    const month = new Date(
      Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - offset, 1),
    );
    return `${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, '0')}`;
  });
  return [periods[0] as string, periods[1] as string, periods[2] as string];
}

export function identityResidentsStableKeys(now: Date): readonly string[] {
  return [
    DEMO_RESIDENT_PERSONAS.landOfficer.email,
    DEMO_RESIDENT_PERSONAS.communeLeader.email,
    NEGATIVE_PERSONA_EMAIL,
    ...DEMO_RESIDENT_SUBJECTS.flatMap((subject) => [
      subject.key,
      subject.activityKey,
    ]),
    ...residentReportPeriods(now).map((period) =>
      residentReportIdempotencyKey(period),
    ),
  ];
}

export function assertIdentityResidentsKeysUnique(now: Date): void {
  const keys = identityResidentsStableKeys(now);
  if (new Set(keys).size !== keys.length) {
    throw new Error('DEMO_RESIDENT_DUPLICATE_KEY');
  }
}

type SeedActor = Pick<
  IdentityUser,
  'id' | 'email' | 'name' | 'roles' | 'organizationUnitId'
>;

async function loadActor(
  prisma: DemoPrisma,
  email: string,
): Promise<SeedActor> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email },
    include: { roles: { include: { role: true } } },
  });
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? user.email,
    roles: user.roles.map(
      ({ role }) => role.name as SeedActor['roles'][number],
    ),
    organizationUnitId: user.organizationUnitId ?? undefined,
  };
}

export type IdentityResidentsSeedResult = {
  personas: { landOfficerId: string; communeLeaderId: string };
  subjectIds: string[];
  recordIds: string[];
  activityIds: string[];
  reportIds: string[];
  reportStatuses: string[];
  drained: number;
};

// Repeat-safe orchestration: every aggregate is preflighted by its stable
// business key, mutations go through existing identity/resident commands, and
// derived rows (events/audit/SLA/outbox) are only produced as command
// side effects, then drained. Never creates sessions or touches capabilities.
export async function seedIdentityResidents(
  options: {
    now?: Date;
    env?: DemoEnv;
  } = {},
): Promise<IdentityResidentsSeedResult> {
  const env = options.env ?? process.env;
  const { target, now } = preflightDemoFoundation(env);
  applyDemoTargetToEnv(target);
  const at = options.now ?? now;
  assertIdentityResidentsKeysUnique(at);

  const { prisma } = await import('@/lib/prisma');
  const { processOutboxUntilIdle } = await import('@/modules/eventing');
  const identityProvider = await import('@/modules/identity/local-provider');
  const residents = await import('@/modules/residents/commands');

  await identityProvider.ensureDevelopmentUsers();
  const [commander, duty, field]: SeedActor[] = await Promise.all([
    loadActor(prisma, 'truong@civicos.local'),
    loadActor(prisma, 'trucban@civicos.local'),
    loadActor(prisma, 'hientruong@civicos.local'),
  ]);
  if (!commander || !duty || !field) throw new Error('DEMO_ACTOR_MISSING');
  if (!commander.organizationUnitId) {
    throw new Error('DEMO_RESIDENT_ORG_MISSING');
  }
  const organizationId: string = commander.organizationUnitId;
  const upperUnit = await prisma.organizationUnit.findUnique({
    where: { id: 'unit-cap-tren' },
  });
  if (!upperUnit) throw new Error('DEMO_RESIDENT_UPPER_ORG_MISSING');
  const upperUnitId = upperUnit.id;

  async function ensurePersona(fixture: {
    email: string;
    name: string;
    role: RoleName;
  }): Promise<SeedActor> {
    const existing = await prisma.user.findUnique({
      where: { email: fixture.email },
      include: { roles: { include: { role: true } } },
    });
    if (existing) {
      const roles = existing.roles.map(
        ({ role }) => role.name as SeedActor['roles'][number],
      );
      if (!roles.includes(fixture.role as SeedActor['roles'][number])) {
        throw new Error(`DEMO_PERSONA_ROLE_MISMATCH: ${fixture.email}`);
      }
      return {
        id: existing.id,
        email: existing.email,
        name: existing.name ?? existing.email,
        roles,
        organizationUnitId: existing.organizationUnitId ?? undefined,
      };
    }
    // Existing development password seam; same credential as other dev users.
    const created = await identityProvider.createIdentityUser(
      {
        email: fixture.email,
        name: fixture.name,
        role: fixture.role,
        password: 'civicos-dev',
      },
      commander as IdentityUser,
    );
    return {
      id: created.id,
      email: created.email,
      name: created.name ?? created.email,
      roles: created.roles as SeedActor['roles'],
      organizationUnitId: created.organizationUnitId ?? undefined,
    };
  }

  const [landOfficer, communeLeader] = [
    await ensurePersona(DEMO_RESIDENT_PERSONAS.landOfficer),
    await ensurePersona(DEMO_RESIDENT_PERSONAS.communeLeader),
  ];
  if (landOfficer.organizationUnitId !== organizationId) {
    throw new Error('DEMO_PERSONA_ORG_MISMATCH: land_officer');
  }
  if (communeLeader.organizationUnitId !== organizationId) {
    throw new Error('DEMO_PERSONA_ORG_MISMATCH: commune_leader');
  }

  const subjectIds: string[] = [];
  const recordIds: string[] = [];
  const activityIds: string[] = [];
  for (const fixture of DEMO_RESIDENT_SUBJECTS) {
    if (!RESIDENT_SUBJECT_TYPES.includes(fixture.subjectType)) {
      throw new Error(`INVALID_SUBJECT_TYPE: ${fixture.key}`);
    }
    const known = await prisma.subject.findFirst({
      where: {
        displayName: fixture.displayName,
        subjectType: fixture.subjectType,
      },
      select: { id: true },
    });
    const subjectId =
      known?.id ??
      (
        await residents.registerSubject(
          {
            displayName: fixture.displayName,
            subjectType: fixture.subjectType,
            sensitiveProfile: fixture.sensitiveProfile,
          },
          duty as IdentityUser,
        )
      ).id;
    subjectIds.push(subjectId);

    const knownRecord = await prisma.subjectManagementRecord.findFirst({
      where: { subjectId, purpose: fixture.purpose },
      select: { id: true },
    });
    const recordId =
      knownRecord?.id ??
      (
        await residents.createManagementRecord(
          { subjectId, purpose: fixture.purpose },
          duty as IdentityUser,
        )
      ).id;
    recordIds.push(recordId);

    const missingAssignees: string[] = [];
    for (const assignee of [field, commander]) {
      const assignment = await prisma.assignment.findFirst({
        where: {
          resourceType: 'SubjectManagementRecord',
          resourceId: recordId,
          task: 'resident_followup',
          assigneeUserId: assignee.id,
          status: 'active',
        },
        select: { id: true },
      });
      if (!assignment) missingAssignees.push(assignee.id);
    }
    if (missingAssignees.length) {
      await residents.assignRecord(
        recordId,
        { assigneeUserIds: missingAssignees },
        commander as IdentityUser,
      );
    }

    const activity = await residents.recordActivity(
      {
        recordId,
        activityType: 'checkup',
        occurredAt: at.toISOString(),
        content: fixture.activityContent,
        idempotencyKey: fixture.activityKey,
      },
      field as IdentityUser,
    );
    activityIds.push(activity.id);
  }

  // SLA coverage: keep the reintegration record visibly overdue through the
  // existing update command (no direct derived/SLA writes).
  const reintegrationRecord = await prisma.subjectManagementRecord.findFirst({
    where: { subjectId: subjectIds[2] as string, purpose: 'reintegration' },
  });
  if (!reintegrationRecord) throw new Error('DEMO_RESIDENT_RECORD_MISSING');
  const overdueAt = new Date(at.getTime() - 24 * 60 * 60 * 1000);
  if (reintegrationRecord.nextCheckAt?.getTime() !== overdueAt.getTime()) {
    await residents.updateRecord(
      reintegrationRecord.id,
      {
        nextCheckAt: overdueAt.toISOString(),
        baseVersion: reintegrationRecord.version,
      },
      commander as IdentityUser,
    );
  }

  const [sentPeriod, approvedPeriod, draftPeriod] = residentReportPeriods(at);
  async function ensureReportState(
    period: string,
    want: 'draft' | 'approved' | 'sent',
  ) {
    let report = await residents.generateMonthlyReport(
      {
        organizationId,
        period,
        idempotencyKey: residentReportIdempotencyKey(period),
      },
      commander as IdentityUser,
    );
    if (want !== 'draft' && report.status === 'draft') {
      report = await residents.approveReport(
        report.id,
        commander as IdentityUser,
      );
    }
    if (want === 'sent' && report.status === 'approved') {
      report = await residents.sendReport(
        report.id,
        upperUnitId,
        commander as IdentityUser,
      );
    }
    return report;
  }
  const sent = await ensureReportState(sentPeriod as string, 'sent');
  const approved = await ensureReportState(
    approvedPeriod as string,
    'approved',
  );
  const draft = await ensureReportState(draftPeriod as string, 'draft');
  if (sent.status !== 'sent') throw new Error('DEMO_RESIDENT_REPORT_NOT_SENT');
  if (approved.status !== 'approved') {
    throw new Error('DEMO_RESIDENT_REPORT_NOT_APPROVED');
  }
  if (draft.status !== 'draft')
    throw new Error('DEMO_RESIDENT_REPORT_NOT_DRAFT');

  const drained = await processOutboxUntilIdle();
  const result = {
    personas: {
      landOfficerId: landOfficer.id,
      communeLeaderId: communeLeader.id,
    },
    subjectIds,
    recordIds,
    activityIds,
    reportIds: [sent.id, approved.id, draft.id],
    reportStatuses: [sent.status, approved.status, draft.status],
    drained,
  };
  console.log(
    `seeded residents subjects=${subjectIds.length} records=${recordIds.length} ` +
      `reports=${result.reportStatuses.join('/')} drained=${drained}`,
  );
  return result;
}
