// Deterministic mobile read-only demo fixtures for demo-seed-restart (T-006).
// Pure manifest helpers at top: no Prisma/domain import so unit tests load
// this module without a database. The orchestration below dynamic-imports
// Prisma/domain only after the demo target guard + clock preflight have run.
import type { IdentityUser } from '@/modules/identity';

import { applyDemoTargetToEnv, type DemoEnv } from './demo-db';
import { preflightDemoFoundation } from './clock';
import type { prisma as prismaSingleton } from '@/lib/prisma';
import type { VehiclesSeedResult } from './seed-vehicles';

type DemoPrisma = typeof prismaSingleton;

export const MOBILE_READ_TASK = 'mobile_read';

export type MobileReadonlySeedDeps = {
  identityResidents: { recordIds: string[] };
  intakeIncidents: { incidentIds: string[] };
  inspections: {
    establishmentIds: Record<string, string>;
    inspectionIds: Record<string, string>;
  };
  vehicles: Pick<VehiclesSeedResult, 'observationIds'>;
};

export type MobileReadonlyTargets = {
  recordId: string;
  establishmentId: string;
  incidentId: string;
  completedInspectionId: string;
  vehicleObservationIds: string[];
};

// Reuse T-002/T-003/T-004 result IDs: first resident record, completed
// establishment/inspection, and the T-003 linked incident. T-003 guarantees a
// linked incident, so a missing one is a contract violation, never a silent
// substitution. T-005 observation IDs seed DS-09 mobile_read prerequisites for
// the production vehicle read boundary (owned by T-010); this adapter only
// grants assignments and never extends related-info or forces production
// support. Pure so unit tests cover it without a DB.
export function resolveMobileReadonlyTargets(
  deps: MobileReadonlySeedDeps,
): MobileReadonlyTargets {
  const recordId = deps.identityResidents.recordIds[0];
  if (!recordId) throw new Error('DEMO_MOBILE_RECORD_MISSING');
  const establishmentId = deps.inspections.establishmentIds.completed;
  if (!establishmentId) throw new Error('DEMO_MOBILE_ESTABLISHMENT_MISSING');
  const completedInspectionId = deps.inspections.inspectionIds.completed;
  if (!completedInspectionId) throw new Error('DEMO_MOBILE_INSPECTION_MISSING');
  const incidentId = deps.intakeIncidents.incidentIds[0];
  if (!incidentId) throw new Error('DEMO_MOBILE_INCIDENT_MISSING');
  const vehicleObservationIds = Object.values(deps.vehicles.observationIds);
  if (
    !vehicleObservationIds.length ||
    vehicleObservationIds.some((id) => !id)
  ) {
    throw new Error('DEMO_MOBILE_VEHICLE_OBSERVATION_MISSING');
  }
  return {
    recordId,
    establishmentId,
    incidentId,
    completedInspectionId,
    vehicleObservationIds,
  };
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

export type MobileReadonlySeedResult = {
  assignmentIds: string[];
  resourceIds: {
    recordId: string;
    establishmentId: string;
    incidentId: string;
    findingId: string;
    vehicleObservationIds: string[];
  };
  drained: number;
};

// Repeat-safe orchestration: every assignment is preflighted by its stable
// (resourceType, resourceId, field actor) tuple, grants go through the
// existing identity assignment command with the commander as grantor, and
// derived rows (events/audit/outbox) are only produced as command side
// effects, then drained. Never touches the negative persona, never writes
// derived tables directly, and never creates Dispatch/Task/Camera rows.
export async function seedMobileReadonly(
  deps: MobileReadonlySeedDeps,
  options: {
    env?: DemoEnv;
  } = {},
): Promise<MobileReadonlySeedResult> {
  const env = options.env ?? process.env;
  const { target } = preflightDemoFoundation(env);
  applyDemoTargetToEnv(target);
  const targets = resolveMobileReadonlyTargets(deps);

  const { prisma } = await import('@/lib/prisma');
  const { processOutboxUntilIdle } = await import('@/modules/eventing');
  const identityProvider = await import('@/modules/identity/local-provider');
  const { createAssignments } = await import('@/modules/identity');

  await identityProvider.ensureDevelopmentUsers();
  const [commander, field]: SeedActor[] = await Promise.all([
    loadActor(prisma, 'truong@civicos.local'),
    loadActor(prisma, 'hientruong@civicos.local'),
  ]);
  if (!commander || !field) throw new Error('DEMO_ACTOR_MISSING');

  // Resolve the completed inspection finding via read-only query; T-004 owns
  // findings so a missing row is a contract violation, never a silent skip.
  const finding = await prisma.inspectionFinding.findFirst({
    where: { inspectionId: targets.completedInspectionId },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (!finding) throw new Error('DEMO_MOBILE_FINDING_MISSING');

  const refs = [
    { resourceType: 'SubjectManagementRecord', resourceId: targets.recordId },
    { resourceType: 'Establishment', resourceId: targets.establishmentId },
    { resourceType: 'Incident', resourceId: targets.incidentId },
    { resourceType: 'InspectionFinding', resourceId: finding.id },
    // DS-09 prerequisites for the T-010 vehicle read boundary: canonical
    // VehicleObservation rows only, no related-info or forces production
    // support here.
    ...targets.vehicleObservationIds.map((resourceId) => ({
      resourceType: 'VehicleObservation',
      resourceId,
    })),
  ] as const;

  const assignmentIds: string[] = [];
  for (const ref of refs) {
    const existing = await prisma.assignment.findFirst({
      where: {
        resourceType: ref.resourceType,
        resourceId: ref.resourceId,
        task: MOBILE_READ_TASK,
        assigneeUserId: field.id,
        status: 'active',
        ...(field.organizationUnitId
          ? { organizationId: field.organizationUnitId }
          : {}),
      },
      select: { id: true },
    });
    if (existing) {
      assignmentIds.push(existing.id);
      continue;
    }
    const [created] = await createAssignments(
      {
        resourceType: ref.resourceType,
        resourceId: ref.resourceId,
        task: MOBILE_READ_TASK,
        assigneeUserIds: [field.id],
      },
      commander as IdentityUser,
    );
    if (!created) throw new Error('DEMO_MOBILE_ASSIGNMENT_FAILED');
    assignmentIds.push(created.id);
  }

  const drained = await processOutboxUntilIdle();
  const result = {
    assignmentIds,
    resourceIds: {
      recordId: targets.recordId,
      establishmentId: targets.establishmentId,
      incidentId: targets.incidentId,
      findingId: finding.id,
      vehicleObservationIds: targets.vehicleObservationIds,
    },
    drained,
  };
  console.log(
    `seeded mobile_read assignments=${assignmentIds.length} ` +
      `record=${result.resourceIds.recordId} establishment=${result.resourceIds.establishmentId} ` +
      `incident=${result.resourceIds.incidentId} finding=${result.resourceIds.findingId} ` +
      `vehicles=${result.resourceIds.vehicleObservationIds.join(',')} drained=${drained}`,
  );
  return result;
}
