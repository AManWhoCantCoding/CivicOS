// Deterministic intake/incident demo fixtures for demo-seed-restart (T-003).
// Pure manifest helpers at top: no Prisma/domain import so unit tests load
// this module without a database. The orchestration below dynamic-imports
// Prisma/domain only after the demo target guard + clock preflight have run.
import type { IdentityUser } from '@/modules/identity';

import { applyDemoTargetToEnv, type DemoEnv } from './demo-db';
import { preflightDemoFoundation } from './clock';
import {
  DEMO_INTAKE_INCIDENT_MANIFEST,
  assertIntakeIncidentsKeysUnique,
  intakeCommandKey,
  type DemoIntakeIncidentManifest,
} from './manifest';
import type { prisma as prismaSingleton } from '@/lib/prisma';

type DemoPrisma = typeof prismaSingleton;

export type IntakeScenarioName =
  'received' | 'rejected' | 'processed' | 'closed';

export const DEMO_INTAKE_SCENARIOS: readonly {
  name: IntakeScenarioName;
  wantStatus: 'RECEIVED' | 'REJECTED' | 'PROCESSED' | 'CLOSED';
  linked: boolean;
}[] = [
  { name: 'received', wantStatus: 'RECEIVED', linked: false },
  { name: 'rejected', wantStatus: 'REJECTED', linked: false },
  { name: 'processed', wantStatus: 'PROCESSED', linked: true },
  { name: 'closed', wantStatus: 'CLOSED', linked: false },
] as const;

export function intakeScenarioKey(
  scenario: IntakeScenarioName,
  manifest: DemoIntakeIncidentManifest = DEMO_INTAKE_INCIDENT_MANIFEST,
): string {
  return manifest[`${scenario}Key`];
}

// Deterministic receivedAt offsets from the adapter clock (DEMO_NOW).
const RECEIVED_OFFSET_MS: Record<IntakeScenarioName, number> = {
  received: 2 * 60 * 60 * 1000,
  rejected: 30 * 60 * 60 * 1000,
  processed: 72 * 60 * 60 * 1000,
  closed: 120 * 60 * 60 * 1000,
};

export function intakeScenarioReceivedAt(
  scenario: IntakeScenarioName,
  now: Date,
): string {
  return new Date(now.getTime() - RECEIVED_OFFSET_MS[scenario]).toISOString();
}

export function intakeScenarioContent(scenario: IntakeScenarioName): string {
  switch (scenario) {
    case 'received':
      return '[DEMO-RESTART] Tin bao mat trat tu khu cho dem, dang cho xac minh.';
    case 'rejected':
      return '[DEMO-RESTART] Tin bao trung lap thieu co so, de nghi bac bo.';
    case 'processed':
      return '[DEMO-RESTART] Tin bao du co so, chuyen xu ly chuyen sau.';
    case 'closed':
      return '[DEMO-RESTART] Tin bao da xu ly xong, dong ho so.';
  }
}

// Synthetic sensitive actor data; always flows through the existing
// encryption/masking seam, never stored or asserted in plaintext views.
export const DEMO_INTAKE_SENSITIVE: Record<
  IntakeScenarioName,
  { sourceName?: string; sourceContact?: string; sensitiveRef?: string }
> = {
  received: {
    sourceName: '[DEMO-RESTART] Nguoi bao tin 01',
    sourceContact: '[DEMO-RESTART] 0900000001',
    sensitiveRef: '[DEMO-RESTART] sensitive intake-received-01',
  },
  rejected: {},
  processed: {
    sourceName: '[DEMO-RESTART] Nguoi bao tin 03',
    sourceContact: '[DEMO-RESTART] 0900000003',
    sensitiveRef: '[DEMO-RESTART] sensitive intake-processed-01',
  },
  closed: {},
};

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

export type IntakeIncidentsSeedResult = {
  reportIds: Record<IntakeScenarioName, string>;
  incidentIds: string[];
  statuses: Record<IntakeScenarioName, string>;
  drained: number;
};

// Repeat-safe orchestration: every aggregate is preflighted by its stable
// idempotency key, every state move goes through existing intake/incident
// commands, and derived rows (events/audit/SLA/outbox) are only produced as
// command side effects, then drained. No direct derived-table writes.
export async function seedIntakeIncidents(
  options: {
    now?: Date;
    env?: DemoEnv;
  } = {},
): Promise<IntakeIncidentsSeedResult> {
  const env = options.env ?? process.env;
  const { target, now } = preflightDemoFoundation(env);
  applyDemoTargetToEnv(target);
  const at = options.now ?? now;
  assertIntakeIncidentsKeysUnique();

  const { prisma } = await import('@/lib/prisma');
  const { processOutboxUntilIdle } = await import('@/modules/eventing');
  const identityProvider = await import('@/modules/identity/local-provider');
  const incidentCommands = await import('@/modules/incidents/commands');

  await identityProvider.ensureDevelopmentUsers();
  const [commander, duty, field]: SeedActor[] = await Promise.all([
    loadActor(prisma, 'truong@civicos.local'),
    loadActor(prisma, 'trucban@civicos.local'),
    loadActor(prisma, 'hientruong@civicos.local'),
  ]);
  if (!commander || !duty || !field) throw new Error('DEMO_ACTOR_MISSING');

  async function ensureRegistered(scenario: IntakeScenarioName) {
    const key = intakeScenarioKey(scenario);
    const sensitive = DEMO_INTAKE_SENSITIVE[scenario];
    const { reportId } = await incidentCommands.registerIntakeReport(
      {
        sourceChannel: 'direct',
        receivedAt: intakeScenarioReceivedAt(scenario, at),
        content: intakeScenarioContent(scenario),
        ...sensitive,
        idempotencyKey: key,
      },
      duty as IdentityUser,
    );
    return reportId;
  }

  async function readReport(reportId: string) {
    return prisma.intakeReport.findUniqueOrThrow({ where: { id: reportId } });
  }

  // RECEIVED: register only, stays pending.
  const receivedId = await ensureRegistered('received');

  // REJECTED: RECEIVED -> REJECTED through the existing reject command.
  const rejectedId = await ensureRegistered('rejected');
  if ((await readReport(rejectedId)).status === 'RECEIVED') {
    await incidentCommands.rejectIntakeReport(
      rejectedId,
      duty as IdentityUser,
      {
        reason: '[DEMO-RESTART] Tin bao trung lap, khong du co so xu ly.',
      },
    );
  }

  // PROCESSED + linked incident: verify -> confirm -> convert, then drive the
  // incident to closed through assignment, classification, verification and
  // resolve/close approvals.
  const processedId = await ensureRegistered('processed');
  const processedKey = intakeScenarioKey('processed');
  if ((await readReport(processedId)).status === 'RECEIVED') {
    await incidentCommands.verifyIntakeReport(
      processedId,
      duty as IdentityUser,
      {
        classification: 'sufficient',
        verificationNote: '[DEMO-RESTART] Da xac minh du co so.',
      },
    );
  }
  if ((await readReport(processedId)).status === 'VERIFIED') {
    await incidentCommands.confirmIntakeReport(
      processedId,
      duty as IdentityUser,
      {
        idempotencyKey: intakeCommandKey(processedKey, 'confirm'),
      },
    );
  }
  let processed = await readReport(processedId);
  if (!processed.incidentId) {
    const converted = await incidentCommands.convertIntakeToIncident(
      processedId,
      duty as IdentityUser,
      { idempotencyKey: intakeCommandKey(processedKey, 'convert') },
    );
    if (!converted.incidentId) throw new Error('DEMO_INTAKE_CONVERT_FAILED');
  }
  processed = await readReport(processedId);
  const incidentId = processed.incidentId as string;

  const missingAssignees: string[] = [];
  for (const assignee of [duty, field]) {
    const assignment = await prisma.assignment.findFirst({
      where: {
        resourceType: 'Incident',
        resourceId: incidentId,
        assigneeUserId: assignee.id,
        status: 'active',
      },
      select: { id: true },
    });
    if (!assignment) missingAssignees.push(assignee.id);
  }
  if (missingAssignees.length) {
    await incidentCommands.assignIncident(
      incidentId,
      commander as IdentityUser,
      missingAssignees,
    );
  }

  let incident = await prisma.incident.findUniqueOrThrow({
    where: { id: incidentId },
  });
  if (incident.status === 'received') {
    await incidentCommands.classifyIncident(
      incidentId,
      duty as IdentityUser,
      'an_ninh_trat_tu',
      'trung_binh',
    );
    incident = await prisma.incident.findUniqueOrThrow({
      where: { id: incidentId },
    });
  }
  if (incident.status === 'classified') {
    await incidentCommands.startVerification(
      incidentId,
      field as IdentityUser,
      '[DEMO-RESTART] San sang xac minh hien truong.',
    );
    incident = await prisma.incident.findUniqueOrThrow({
      where: { id: incidentId },
    });
  }
  if (incident.status === 'verifying') {
    let pending = await prisma.approval.findFirst({
      where: {
        resourceType: 'Incident',
        resourceId: incidentId,
        action: 'resolve',
        status: 'pending',
      },
    });
    if (!pending) {
      pending = (
        await incidentCommands.resolveIncident(
          incidentId,
          field as IdentityUser,
          '[DEMO-RESTART] Da hoan tat xac minh.',
        )
      ).approval;
    }
    if (
      (await prisma.approval.findUniqueOrThrow({ where: { id: pending.id } }))
        .status === 'pending'
    ) {
      await incidentCommands.approveIncident(
        incidentId,
        pending.id,
        commander as IdentityUser,
      );
    }
    incident = await prisma.incident.findUniqueOrThrow({
      where: { id: incidentId },
    });
  }
  if (incident.status === 'resolved') {
    let pending = await prisma.approval.findFirst({
      where: {
        resourceType: 'Incident',
        resourceId: incidentId,
        action: 'close',
        status: 'pending',
      },
    });
    if (!pending) {
      pending = (
        await incidentCommands.closeIncident(incidentId, field as IdentityUser)
      ).approval;
    }
    if (
      (await prisma.approval.findUniqueOrThrow({ where: { id: pending.id } }))
        .status === 'pending'
    ) {
      await incidentCommands.approveIncident(
        incidentId,
        pending.id,
        commander as IdentityUser,
      );
    }
  }

  // CLOSED: RECEIVED -> VERIFIED -> PROCESSED -> CLOSED through commands.
  const closedId = await ensureRegistered('closed');
  if ((await readReport(closedId)).status === 'RECEIVED') {
    await incidentCommands.verifyIntakeReport(closedId, duty as IdentityUser, {
      classification: 'sufficient',
      verificationNote: '[DEMO-RESTART] Da xac minh xong.',
    });
  }
  if ((await readReport(closedId)).status === 'VERIFIED') {
    await incidentCommands.processIntakeReport(closedId, duty as IdentityUser, {
      processedNote: '[DEMO-RESTART] Da xu ly xong.',
    });
  }
  if ((await readReport(closedId)).status === 'PROCESSED') {
    await incidentCommands.closeIntakeReport(closedId, duty as IdentityUser, {
      resultNote: '[DEMO-RESTART] Dong ho so sau xu ly.',
    });
  }

  const drained = await processOutboxUntilIdle();
  const [received, rejected, linked, closed] = await Promise.all([
    readReport(receivedId),
    readReport(rejectedId),
    readReport(processedId),
    readReport(closedId),
  ]);
  const result = {
    reportIds: {
      received: receivedId,
      rejected: rejectedId,
      processed: processedId,
      closed: closedId,
    },
    incidentIds: linked.incidentId ? [linked.incidentId] : [],
    statuses: {
      received: received.status,
      rejected: rejected.status,
      processed: linked.status,
      closed: closed.status,
    },
    drained,
  };
  console.log(
    `seeded intakes received=${result.statuses.received} rejected=${result.statuses.rejected} ` +
      `processed=${result.statuses.processed} closed=${result.statuses.closed} drained=${drained}`,
  );
  return result;
}
