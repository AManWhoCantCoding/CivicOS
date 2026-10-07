// Deterministic inspection demo fixtures for demo-seed-restart (T-004).
// Pure manifest helpers at top: no Prisma/domain import so unit tests load
// this module without a database. The orchestration below dynamic-imports
// Prisma/domain only after the demo target guard + clock preflight have run.
import type { IdentityUser } from '@/modules/identity';
import type { ChecklistResponse } from '@/modules/inspections';

import { applyDemoTargetToEnv, type DemoEnv } from './demo-db';
import { preflightDemoFoundation } from './clock';
import {
  DEMO_FOUNDATION_MANIFEST,
  DEMO_INSPECTION_MANIFEST,
  assertInspectionsKeysUnique,
  type DemoInspectionManifest,
} from './manifest';
import type { prisma as prismaSingleton } from '@/lib/prisma';

type DemoPrisma = typeof prismaSingleton;

export type InspectionScenarioName = 'scheduled' | 'in_progress' | 'completed';

export const DEMO_INSPECTION_SCENARIOS: readonly {
  name: InspectionScenarioName;
  wantStatus: 'scheduled' | 'in_progress' | 'completed';
}[] = [
  { name: 'scheduled', wantStatus: 'scheduled' },
  { name: 'in_progress', wantStatus: 'in_progress' },
  { name: 'completed', wantStatus: 'completed' },
] as const;

const SCENARIO_KEY_MAP: Record<
  InspectionScenarioName,
  keyof DemoInspectionManifest
> = {
  scheduled: 'scheduledKey',
  in_progress: 'inProgressKey',
  completed: 'completedKey',
};

export function inspectionScenarioKey(
  scenario: InspectionScenarioName,
  manifest: DemoInspectionManifest = DEMO_INSPECTION_MANIFEST,
): string {
  return manifest[SCENARIO_KEY_MAP[scenario]];
}

const SCENARIO_LABEL: Record<InspectionScenarioName, string> = {
  scheduled: 'lich dinh ky',
  in_progress: 'dang kiem tra',
  completed: 'da hoan tat',
};

export function inspectionScenarioEstablishmentName(
  scenario: InspectionScenarioName,
): string {
  return `[DEMO-RESTART] Co so karaoke ${SCENARIO_LABEL[scenario]} 01`;
}

export function inspectionScenarioEstablishmentAddress(
  scenario: InspectionScenarioName,
): string {
  return `[DEMO-RESTART] Dia chi kiem tra ${SCENARIO_LABEL[scenario]} 01`;
}

export function inspectionScenarioEstablishmentType(
  scenario: InspectionScenarioName,
): string {
  return `Karaoke ${inspectionScenarioKey(scenario)}`;
}

// Deterministic scheduledAt offsets from the adapter clock (DEMO_NOW).
const SCHEDULE_OFFSET_MS: Record<InspectionScenarioName, number> = {
  scheduled: 30 * 24 * 60 * 60 * 1000,
  in_progress: -2 * 24 * 60 * 60 * 1000,
  completed: -60 * 24 * 60 * 60 * 1000,
};

export function inspectionScenarioScheduledAt(
  scenario: InspectionScenarioName,
  now: Date,
): string {
  return new Date(now.getTime() + SCHEDULE_OFFSET_MS[scenario]).toISOString();
}

export function inspectionScenarioResponses(): ChecklistResponse[] {
  return [
    { key: 'license', value: '[DEMO-RESTART] Giay phep hop le' },
    { key: 'security', value: '[DEMO-RESTART] Dieu kien an ninh dat' },
    { key: 'safety', value: '[DEMO-RESTART] Dieu kien an toan dat' },
  ];
}

export function inspectionEvidenceFileName(
  scenario: InspectionScenarioName,
): string {
  return `demo-restart-inspection-${scenario}-01.jpg`;
}

export function inspectionEvidenceBytes(
  scenario: InspectionScenarioName,
): Uint8Array {
  return new TextEncoder().encode(
    `[DEMO-RESTART] inspection evidence ${scenario} 01`,
  );
}

export function inspectionEvidenceCapturedAt(
  scenario: InspectionScenarioName,
  now: Date,
): string {
  const scheduledAt = new Date(
    inspectionScenarioScheduledAt(scenario, now),
  ).getTime();
  return new Date(scheduledAt + 60 * 60 * 1000).toISOString();
}

export type InspectionFindingFixture = {
  checklistKey: string;
  description: string;
  result: string;
};

export function inspectionScenarioFindings(
  scenario: 'in_progress' | 'completed',
): readonly InspectionFindingFixture[] {
  if (scenario === 'in_progress') {
    return [
      {
        checklistKey: 'safety',
        description: '[DEMO-RESTART] Phat hien can bo sung bang chung an toan.',
        result: 'needs_action',
      },
    ] as const;
  }
  return [
    {
      checklistKey: 'security',
      description: '[DEMO-RESTART] Thieu so theo doi khach luu tru.',
      result: 'needs_action',
    },
    {
      checklistKey: 'safety',
      description: '[DEMO-RESTART] Da ghi nhan bang chung an toan.',
      result: 'reminder',
    },
  ] as const;
}

export const DEMO_INSPECTION_RECOMMENDATIONS: Record<
  'in_progress' | 'completed',
  { action: string; reason: string }
> = {
  in_progress: {
    action: '[DEMO-RESTART] Nhac nho bo sung ho so an toan',
    reason: '[DEMO-RESTART] Can bo sung truoc khi dong dot kiem tra.',
  },
  completed: {
    action: '[DEMO-RESTART] Yeu cau khac phuc so theo doi',
    reason: '[DEMO-RESTART] Thieu so theo doi khach luu tru.',
  },
};

export const DEMO_INSPECTION_REJECTION_REASON =
  '[DEMO-RESTART] Chua du can cu de phe duyet.';

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

export type InspectionsSeedResult = {
  establishmentIds: Record<InspectionScenarioName, string>;
  inspectionIds: Record<InspectionScenarioName, string>;
  statuses: Record<InspectionScenarioName, string>;
  recommendationIds: Record<'in_progress' | 'completed', string>;
  recommendationStatuses: Record<'in_progress' | 'completed', string>;
  recurrenceIds: string[];
  drained: number;
};

// Repeat-safe orchestration: every establishment is preflighted by its
// stable synthetic name/address, every state move goes through existing
// inspection commands, evidence flows through the evidence service with
// LocalEvidenceStorage, and derived rows (events/audit/SLA/outbox) are only
// produced as command side effects, then drained. No direct derived-table
// writes and no direct status updates.
export async function seedInspections(
  options: {
    now?: Date;
    env?: DemoEnv;
  } = {},
): Promise<InspectionsSeedResult> {
  const env = options.env ?? process.env;
  const { target, now } = preflightDemoFoundation(env);
  applyDemoTargetToEnv(target);
  const at = options.now ?? now;
  assertInspectionsKeysUnique();

  const { prisma } = await import('@/lib/prisma');
  const { processOutboxUntilIdle } = await import('@/modules/eventing');
  const identityProvider = await import('@/modules/identity/local-provider');
  const inspectionCommands = await import('@/modules/inspections/commands');
  const { createEvidence, LocalEvidenceStorage } =
    await import('@/modules/platform');

  await identityProvider.ensureDevelopmentUsers();
  const [commander, field]: SeedActor[] = await Promise.all([
    loadActor(prisma, 'truong@civicos.local'),
    loadActor(prisma, 'hientruong@civicos.local'),
  ]);
  if (!commander || !field) throw new Error('DEMO_ACTOR_MISSING');
  const storage = new LocalEvidenceStorage();

  async function ensureEstablishment(scenario: InspectionScenarioName) {
    const name = inspectionScenarioEstablishmentName(scenario);
    const address = inspectionScenarioEstablishmentAddress(scenario);
    const known = await prisma.establishment.findFirst({
      where: { name, address, active: true },
    });
    if (known) return known;
    try {
      return await inspectionCommands.registerEstablishment(
        {
          name,
          ownerName: '[DEMO-RESTART] Chu co so 01',
          address,
          type: inspectionScenarioEstablishmentType(scenario),
        },
        commander as IdentityUser,
      );
    } catch (error) {
      if (!(
        error instanceof Error && error.message === 'DUPLICATE_ESTABLISHMENT'
      ))
        throw error;
      return prisma.establishment.findFirstOrThrow({
        where: { name, address, active: true },
      });
    }
  }

  // One original inspection per establishment: the earliest row is always the
  // scenario aggregate, so recurrence children (later scheduledAt) and
  // DEMO_NOW drift can never fork a duplicate scenario row.
  async function ensureOriginalInspection(
    establishmentId: string,
    scenario: InspectionScenarioName,
  ) {
    const known = await prisma.inspection.findFirst({
      where: { establishmentId },
      orderBy: { scheduledAt: 'asc' },
    });
    if (known) return known;
    try {
      return await inspectionCommands.scheduleInspection(
        {
          establishmentId,
          assignedUserId: field.id,
          scheduledAt: inspectionScenarioScheduledAt(scenario, at),
        },
        commander as IdentityUser,
      );
    } catch (error) {
      if (!(error instanceof Error && error.message === 'DUPLICATE_SCHEDULE'))
        throw error;
      return prisma.inspection.findFirstOrThrow({
        where: { establishmentId },
        orderBy: { scheduledAt: 'asc' },
      });
    }
  }

  async function readInspection(inspectionId: string) {
    return prisma.inspection.findUniqueOrThrow({ where: { id: inspectionId } });
  }

  async function ensureStarted(inspectionId: string) {
    if ((await readInspection(inspectionId)).status === 'scheduled') {
      await inspectionCommands.startInspection(
        inspectionId,
        field as IdentityUser,
      );
    }
  }

  // Re-saving identical responses would append a new event/version on every
  // rerun, so skip the command when the stored checklist already matches.
  async function ensureChecklistSaved(inspectionId: string) {
    const current = await readInspection(inspectionId);
    const want = inspectionScenarioResponses();
    if (
      JSON.stringify(current.checklistResponses ?? []) !== JSON.stringify(want)
    ) {
      await inspectionCommands.saveChecklistResponses(
        { inspectionId, responses: want },
        field as IdentityUser,
      );
    }
  }

  // Evidence deduplicates on (resourceType, resourceId, bytes hash), so a
  // rerun with identical synthetic bytes returns the existing row.
  async function ensureEvidence(
    inspectionId: string,
    scenario: 'in_progress' | 'completed',
  ) {
    return createEvidence(storage, {
      resourceType: 'Inspection',
      resourceId: inspectionId,
      fileName: inspectionEvidenceFileName(scenario),
      mimeType: 'image/jpeg',
      bytes: inspectionEvidenceBytes(scenario),
      capturedAt: new Date(inspectionEvidenceCapturedAt(scenario, at)),
      actorId: field.id,
      metadata: {
        demoNamespace: DEMO_FOUNDATION_MANIFEST.evidenceNamespace,
        scenario: inspectionScenarioKey(scenario),
      },
    });
  }

  async function ensureFinding(
    inspectionId: string,
    entry: InspectionFindingFixture,
    evidenceId: string,
  ) {
    const known = await prisma.inspectionFinding.findFirst({
      where: {
        inspectionId,
        checklistKey: entry.checklistKey,
        description: entry.description,
      },
    });
    if (known) return known;
    return inspectionCommands.recordFinding(
      {
        inspectionId,
        checklistKey: entry.checklistKey,
        description: entry.description,
        result: entry.result,
        evidenceIds: [evidenceId],
      },
      field as IdentityUser,
    );
  }

  async function ensureRecommendation(
    inspectionId: string,
    scenario: 'in_progress' | 'completed',
    findingIds: string[],
  ) {
    const { action, reason } = DEMO_INSPECTION_RECOMMENDATIONS[scenario];
    const known = await prisma.enforcementRecommendation.findFirst({
      where: { inspectionId, action },
    });
    if (known) return known;
    return inspectionCommands.submitRecommendation(
      { inspectionId, findingIds, action, reason },
      field as IdentityUser,
    );
  }

  async function readRecommendation(recommendationId: string) {
    return prisma.enforcementRecommendation.findUniqueOrThrow({
      where: { id: recommendationId },
    });
  }

  const scheduledEstablishment = await ensureEstablishment('scheduled');
  const inProgressEstablishment = await ensureEstablishment('in_progress');
  const completedEstablishment = await ensureEstablishment('completed');

  // SCHEDULED: register + schedule only, stays scheduled.
  const scheduled = await ensureOriginalInspection(
    scheduledEstablishment.id,
    'scheduled',
  );

  // IN_PROGRESS: start, checklist, evidence + finding, then a field-submitted
  // recommendation rejected by the commander stays in_progress.
  const inProgress = await ensureOriginalInspection(
    inProgressEstablishment.id,
    'in_progress',
  );
  await ensureStarted(inProgress.id);
  await ensureChecklistSaved(inProgress.id);
  const inProgressEvidence = await ensureEvidence(inProgress.id, 'in_progress');
  const [inProgressFindingEntry] = inspectionScenarioFindings('in_progress');
  const inProgressFinding = await ensureFinding(
    inProgress.id,
    inProgressFindingEntry as InspectionFindingFixture,
    inProgressEvidence.id,
  );
  let inProgressRecommendation = await ensureRecommendation(
    inProgress.id,
    'in_progress',
    [inProgressFinding.id],
  );
  if (
    (await readRecommendation(inProgressRecommendation.id)).status ===
    'pending_approval'
  ) {
    inProgressRecommendation = await inspectionCommands.rejectRecommendation(
      inProgress.id,
      inProgressRecommendation.id,
      commander as IdentityUser,
      DEMO_INSPECTION_REJECTION_REASON,
    );
  }

  // COMPLETED: needs_action findings with evidence, a field-submitted
  // recommendation approved by the commander, then completion through
  // completeInspection so recurrence stays owned by the command.
  const completed = await ensureOriginalInspection(
    completedEstablishment.id,
    'completed',
  );
  await ensureStarted(completed.id);
  await ensureChecklistSaved(completed.id);
  const completedEvidence = await ensureEvidence(completed.id, 'completed');
  for (const entry of inspectionScenarioFindings('completed')) {
    await ensureFinding(completed.id, entry, completedEvidence.id);
  }
  const needsActionFinding = await prisma.inspectionFinding.findFirstOrThrow({
    where: { inspectionId: completed.id, result: 'needs_action' },
  });
  let completedRecommendation = await ensureRecommendation(
    completed.id,
    'completed',
    [needsActionFinding.id],
  );
  if (
    (await readRecommendation(completedRecommendation.id)).status ===
    'pending_approval'
  ) {
    completedRecommendation = await inspectionCommands.approveRecommendation(
      completed.id,
      completedRecommendation.id,
      commander as IdentityUser,
    );
  }
  if ((await readInspection(completed.id)).status !== 'completed') {
    await inspectionCommands.completeInspection(
      { inspectionId: completed.id, result: 'needs_action' },
      field as IdentityUser,
    );
  }

  const recurrence = await prisma.inspection.findFirst({
    where: {
      establishmentId: completedEstablishment.id,
      status: 'scheduled',
      id: { not: completed.id },
    },
    orderBy: { scheduledAt: 'asc' },
  });

  const drained = await processOutboxUntilIdle();
  const [scheduledRow, inProgressRow, completedRow] = await Promise.all([
    readInspection(scheduled.id),
    readInspection(inProgress.id),
    readInspection(completed.id),
  ]);
  const result = {
    establishmentIds: {
      scheduled: scheduledEstablishment.id,
      in_progress: inProgressEstablishment.id,
      completed: completedEstablishment.id,
    },
    inspectionIds: {
      scheduled: scheduled.id,
      in_progress: inProgress.id,
      completed: completed.id,
    },
    statuses: {
      scheduled: scheduledRow.status,
      in_progress: inProgressRow.status,
      completed: completedRow.status,
    },
    recommendationIds: {
      in_progress: inProgressRecommendation.id,
      completed: completedRecommendation.id,
    },
    recommendationStatuses: {
      in_progress: (await readRecommendation(inProgressRecommendation.id))
        .status,
      completed: (await readRecommendation(completedRecommendation.id)).status,
    },
    recurrenceIds: recurrence ? [recurrence.id] : [],
    drained,
  };
  console.log(
    `seeded inspections scheduled=${result.statuses.scheduled} in_progress=${result.statuses.in_progress} ` +
      `completed=${result.statuses.completed} recs=${result.recommendationStatuses.in_progress}/${result.recommendationStatuses.completed} drained=${drained}`,
  );
  return result;
}
