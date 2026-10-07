// Deterministic vehicle demo fixtures for demo-seed-restart (T-005).
// Pure manifest helpers at top: no Prisma/domain import so unit tests load
// this module without a database. The orchestration below dynamic-imports
// Prisma/domain only after the demo target guard + clock preflight have run.
import { createHash } from 'node:crypto';

import type { VehicleObservation } from '@prisma/client';

import type { IdentityUser } from '@/modules/identity';

import { applyDemoTargetToEnv, type DemoEnv } from './demo-db';
import { preflightDemoFoundation } from './clock';
import {
  DEMO_VEHICLE_MANIFEST,
  assertVehiclesKeysUnique,
  type DemoVehicleManifest,
} from './manifest';
import type { prisma as prismaSingleton } from '@/lib/prisma';

type DemoPrisma = typeof prismaSingleton;

export type VehicleScenarioName = 'recorded' | 'match_suggested' | 'escalated';

export const DEMO_VEHICLE_SCENARIOS: readonly {
  name: VehicleScenarioName;
  wantStatus: 'recorded' | 'match_suggested' | 'escalated';
  matched: boolean;
}[] = [
  { name: 'recorded', wantStatus: 'recorded', matched: false },
  { name: 'match_suggested', wantStatus: 'match_suggested', matched: true },
  { name: 'escalated', wantStatus: 'escalated', matched: true },
] as const;

const SCENARIO_OBSERVATION_KEY: Record<
  VehicleScenarioName,
  keyof DemoVehicleManifest
> = {
  recorded: 'recordedObservationKey',
  match_suggested: 'matchObservationKey',
  escalated: 'escalatedObservationKey',
};

const SCENARIO_REGISTRY_KEY: Record<
  VehicleScenarioName,
  keyof DemoVehicleManifest
> = {
  recorded: 'recordedRegistryKey',
  match_suggested: 'matchRegistryKey',
  escalated: 'escalatedRegistryKey',
};

const SCENARIO_PLATE: Record<VehicleScenarioName, keyof DemoVehicleManifest> = {
  recorded: 'recordedPlate',
  match_suggested: 'matchPlate',
  escalated: 'escalatedPlate',
};

export function vehicleScenarioKey(
  scenario: VehicleScenarioName,
  manifest: DemoVehicleManifest = DEMO_VEHICLE_MANIFEST,
): string {
  return manifest[SCENARIO_OBSERVATION_KEY[scenario]];
}

export function vehicleScenarioRegistryKey(
  scenario: VehicleScenarioName,
  manifest: DemoVehicleManifest = DEMO_VEHICLE_MANIFEST,
): string {
  return manifest[SCENARIO_REGISTRY_KEY[scenario]];
}

export function vehicleScenarioPlate(
  scenario: VehicleScenarioName,
  manifest: DemoVehicleManifest = DEMO_VEHICLE_MANIFEST,
): string {
  return manifest[SCENARIO_PLATE[scenario]];
}

// Deterministic observedAt offsets from the adapter clock (DEMO_NOW). Every
// matched scenario observes inside the DEMO_NOW-valid registry window below.
const OBSERVED_OFFSET_MS: Record<VehicleScenarioName, number> = {
  recorded: 5 * 60 * 60 * 1000,
  match_suggested: 3 * 60 * 60 * 1000,
  escalated: 8 * 60 * 60 * 1000,
};

export function vehicleScenarioObservedAt(
  scenario: VehicleScenarioName,
  now: Date,
): string {
  return new Date(now.getTime() - OBSERVED_OFFSET_MS[scenario]).toISOString();
}

const SCENARIO_DESCRIPTION: Record<VehicleScenarioName, string> = {
  recorded: '[DEMO-RESTART] Quan sat phuong tien la 01, chua co registry.',
  match_suggested:
    '[DEMO-RESTART] Quan sat phuong tien trung registry 01, cho xac nhan.',
  escalated:
    '[DEMO-RESTART] Quan sat phuong tien trung registry 02, leo thang xu ly.',
};

export function vehicleScenarioDescription(
  scenario: VehicleScenarioName,
): string {
  return SCENARIO_DESCRIPTION[scenario];
}

const SCENARIO_REASON: Record<VehicleScenarioName, string> = {
  recorded: '[DEMO-RESTART] Phuong tien can chu y 00.',
  match_suggested: '[DEMO-RESTART] Phuong tien can chu y 01.',
  escalated: '[DEMO-RESTART] Phuong tien can chu y 02.',
};

export function vehicleScenarioReason(scenario: VehicleScenarioName): string {
  return SCENARIO_REASON[scenario];
}

export const DEMO_VEHICLE_REGISTRY_SOURCE = '[DEMO-RESTART] demo';

// Registry windows derive from the adapter clock so matched observations
// always fall inside a DEMO_NOW-valid active window on first creation.
// Reruns reuse the existing row by plate and never rewrite the window.
export function vehicleRegistryValidFrom(now: Date): string {
  return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
}

export function vehicleRegistryValidUntil(now: Date): string {
  return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
}

export const DEMO_VEHICLE_LOCATION = {
  latitude: 20.98,
  longitude: 106.05,
} as const;

export function vehicleEvidenceFileName(): string {
  return 'demo-restart-vehicle-escalated-01.jpg';
}

export function vehicleEvidenceBytes(): Uint8Array {
  return new TextEncoder().encode(
    '[DEMO-RESTART] vehicle evidence escalated 01',
  );
}

export function vehicleEvidenceHash(): string {
  return createHash('sha256').update(vehicleEvidenceBytes()).digest('hex');
}

export function vehicleEvidenceCapturedAt(now: Date): string {
  return new Date(
    new Date(vehicleScenarioObservedAt('escalated', now)).getTime() +
      60 * 60 * 1000,
  ).toISOString();
}

export const DEMO_VEHICLE_VERIFICATION = {
  result: '[DEMO-RESTART] Chu phuong tien demo 01.',
  notes: '[DEMO-RESTART] Doi chieu so dang ky, khong ket luan vi pham.',
  ownerLookup: '[DEMO-RESTART] Tra cuu dang ky demo 01.',
} as const;

// Escalation target is only used when it already exists, is active, and is
// a valid ancestor scope of the seeding actor. Anything else is a contract
// violation, never a silent skip of the escalated scenario.
export const DEMO_VEHICLE_ESCALATION_TARGET = 'unit-cap-tren';

export async function resolveVehicleEscalationTarget(
  prisma: DemoPrisma,
  actor: Pick<IdentityUser, 'organizationUnitId'>,
): Promise<string | null> {
  if (!actor.organizationUnitId) return null;
  const target = await prisma.organizationUnit.findUnique({
    where: { id: DEMO_VEHICLE_ESCALATION_TARGET },
  });
  if (!target || !target.active) return null;
  const visited = new Set<string>();
  let currentId: string | null | undefined = actor.organizationUnitId;
  while (currentId) {
    if (visited.has(currentId)) return null;
    visited.add(currentId);
    if (currentId === target.id) return target.id;
    const current: { parentId: string | null } | null =
      await prisma.organizationUnit.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });
    currentId = current?.parentId ?? null;
  }
  return null;
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

export type VehiclesSeedResult = {
  registryIds: Record<'match_suggested' | 'escalated', string>;
  observationIds: Record<VehicleScenarioName, string>;
  statuses: Record<VehicleScenarioName, string>;
  evidenceIds: string[];
  verificationIds: string[];
  drained: number;
};

// Repeat-safe orchestration: registries preflight by stable plate, every
// observation records through recordVehicleObservation with a stable
// clientCommandId, every transition goes through the existing vehicle
// commands in match-confirm-before-verify/escalate order, evidence flows
// through createVehicleObservationEvidence with LocalEvidenceStorage and a
// hash guard (the command would otherwise bump version and append an event
// on rerun), and derived rows (events/audit/SLA/notification/outbox) are
// only produced as command side effects, then drained. No direct
// derived-table writes and no direct status updates.
export async function seedVehicles(
  options: {
    now?: Date;
    env?: DemoEnv;
  } = {},
): Promise<VehiclesSeedResult> {
  const env = options.env ?? process.env;
  const { target, now } = preflightDemoFoundation(env);
  applyDemoTargetToEnv(target);
  const at = options.now ?? now;
  assertVehiclesKeysUnique();

  const { prisma } = await import('@/lib/prisma');
  const { processOutboxUntilIdle } = await import('@/modules/eventing');
  const identityProvider = await import('@/modules/identity/local-provider');
  const vehicleCommands = await import('@/modules/vehicles/commands');
  const { LocalEvidenceStorage } = await import('@/modules/platform');

  await identityProvider.ensureDevelopmentUsers();
  const [commander, field]: SeedActor[] = await Promise.all([
    loadActor(prisma, 'truong@civicos.local'),
    loadActor(prisma, 'hientruong@civicos.local'),
  ]);
  if (!commander || !field) throw new Error('DEMO_ACTOR_MISSING');

  async function ensureRegistry(scenario: 'match_suggested' | 'escalated') {
    const plate = vehicleScenarioPlate(scenario);
    const known = await prisma.suspiciousVehicleEntry.findFirst({
      where: { plate, status: 'active' },
      orderBy: { validFrom: 'asc' },
    });
    if (known) return known;
    try {
      return await vehicleCommands.createRegistryEntry(
        {
          plate,
          source: DEMO_VEHICLE_REGISTRY_SOURCE,
          reason: vehicleScenarioReason(scenario),
          validFrom: vehicleRegistryValidFrom(at),
          validUntil: vehicleRegistryValidUntil(at),
        },
        commander as IdentityUser,
      );
    } catch (error) {
      if (!(
        error instanceof Error && error.message === 'DUPLICATE_ACTIVE_REGISTRY'
      ))
        throw error;
      return prisma.suspiciousVehicleEntry.findFirstOrThrow({
        where: { plate, status: 'active' },
        orderBy: { validFrom: 'asc' },
      });
    }
  }

  async function ensureObservation(scenario: VehicleScenarioName) {
    const { observation } = await vehicleCommands.recordVehicleObservation(
      {
        plate: vehicleScenarioPlate(scenario),
        observedAt: vehicleScenarioObservedAt(scenario, at),
        latitude: DEMO_VEHICLE_LOCATION.latitude,
        longitude: DEMO_VEHICLE_LOCATION.longitude,
        description: vehicleScenarioDescription(scenario),
        clientCommandId: vehicleScenarioKey(scenario),
      },
      field as IdentityUser,
    );
    return observation;
  }

  async function readObservation(observationId: string) {
    return prisma.vehicleObservation.findUniqueOrThrow({
      where: { id: observationId },
    });
  }

  // Drives the escalated scenario through confirm -> evidence -> verify ->
  // escalate using only existing commands. Every step is status-guarded so a
  // rerun (or a resumed partial run) never duplicates transitions.
  async function ensureEscalatedFlow(observationId: string) {
    let current: VehicleObservation = await readObservation(observationId);
    if (current.status === 'match_suggested') {
      current = await vehicleCommands.confirmVehicleMatch(
        observationId,
        field as IdentityUser,
      );
    }
    let evidence = await prisma.evidence.findFirst({
      where: {
        resourceType: 'VehicleObservation',
        resourceId: observationId,
        originalHash: vehicleEvidenceHash(),
      },
    });
    if (!evidence) {
      const storage = new LocalEvidenceStorage();
      evidence = await vehicleCommands.createVehicleObservationEvidence(
        storage,
        {
          resourceType: 'VehicleObservation',
          resourceId: observationId,
          fileName: vehicleEvidenceFileName(),
          mimeType: 'image/jpeg',
          bytes: vehicleEvidenceBytes(),
          capturedAt: new Date(vehicleEvidenceCapturedAt(at)),
          actorId: field.id,
        },
        field as IdentityUser,
      );
    }
    current = await readObservation(observationId);
    let verificationId: string | null = null;
    if (current.status === 'match_confirmed') {
      const verified = await vehicleCommands.verifyVehicleObservation(
        {
          observationId,
          result: DEMO_VEHICLE_VERIFICATION.result,
          notes: DEMO_VEHICLE_VERIFICATION.notes,
          ownerLookup: DEMO_VEHICLE_VERIFICATION.ownerLookup,
          evidenceIds: [evidence.id],
        },
        field as IdentityUser,
      );
      current = verified.observation;
      verificationId = verified.verification.id;
    } else {
      const verification = await prisma.vehicleVerification.findFirst({
        where: { observationId },
        orderBy: { verifiedAt: 'asc' },
      });
      verificationId = verification?.id ?? null;
    }
    current = await readObservation(observationId);
    if (current.status === 'verified') {
      const targetId = await resolveVehicleEscalationTarget(prisma, field);
      if (!targetId) throw new Error('DEMO_ESCALATION_TARGET_MISSING');
      current = await vehicleCommands.escalateVehicleObservation(
        observationId,
        field as IdentityUser,
        targetId,
      );
    }
    if (!verificationId) throw new Error('DEMO_VEHICLE_VERIFICATION_MISSING');
    return {
      observation: current,
      evidenceId: evidence.id,
      verificationId,
    };
  }

  const matchRegistry = await ensureRegistry('match_suggested');
  const escalatedRegistry = await ensureRegistry('escalated');

  // RECORDED: unknown plate, no registry match, stays recorded.
  const recorded = await ensureObservation('recorded');

  // MATCH_SUGGESTED: DEMO_NOW-valid active registry derives the match,
  // no confirmation, stays match_suggested.
  const matchSuggested = await ensureObservation('match_suggested');

  // ESCALATED: confirm -> evidence -> verify -> escalate through commands.
  const escalatedBase = await ensureObservation('escalated');
  const escalatedFlow = await ensureEscalatedFlow(escalatedBase.id);

  const drained = await processOutboxUntilIdle();
  const [recordedRow, matchRow, escalatedRow] = await Promise.all([
    readObservation(recorded.id),
    readObservation(matchSuggested.id),
    readObservation(escalatedFlow.observation.id),
  ]);
  const result = {
    registryIds: {
      match_suggested: matchRegistry.id,
      escalated: escalatedRegistry.id,
    },
    observationIds: {
      recorded: recorded.id,
      match_suggested: matchSuggested.id,
      escalated: escalatedFlow.observation.id,
    },
    statuses: {
      recorded: recordedRow.status,
      match_suggested: matchRow.status,
      escalated: escalatedRow.status,
    },
    evidenceIds: [escalatedFlow.evidenceId],
    verificationIds: [escalatedFlow.verificationId],
    drained,
  };
  console.log(
    `seeded vehicles recorded=${result.statuses.recorded} match_suggested=${result.statuses.match_suggested} ` +
      `escalated=${result.statuses.escalated} drained=${drained}`,
  );
  return result;
}
