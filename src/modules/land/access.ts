import type { Prisma, PrismaClient } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import {
  canViewSensitive,
  getCurrentUser,
  recordAudit,
} from '@/modules/identity';
import { evaluatePolicy } from '@/modules/identity/authorization';
import type { IdentityUser, PolicyAssignment } from '@/modules/identity';

// Land actor with mandatory organization scope.
export type LandActor = IdentityUser & { organizationUnitId: string };

const LAND_ROLES: readonly string[] = ['land_officer', 'commune_leader'];

function hasLandRole(roles: readonly string[]): boolean {
  return roles.some((role) => LAND_ROLES.includes(role));
}

// Throw the scope denial without leaking resource detail.
export function denyScope(): never {
  throw new Error('FORBIDDEN');
}

// Enforce land role and exact organization scope, fail-closed.
export function assertLandActor(
  actor: IdentityUser | null | undefined,
): asserts actor is LandActor {
  if (!actor) throw new Error('UNAUTHENTICATED');
  if (!hasLandRole(actor.roles)) denyScope();
  if (!actor.organizationUnitId?.trim()) denyScope();
}

// Resolve the session actor behind land routes.
export async function requireLandActor(): Promise<LandActor> {
  const actor = await getCurrentUser();
  assertLandActor(actor);
  return actor;
}

// Gate displayName reveal on role, exact unit and read_sensitive.
export async function assertCanViewPartySensitive(
  user: IdentityUser,
  organizationId: string,
): Promise<void> {
  if (!hasLandRole(user.roles)) denyScope();
  if (!user.organizationUnitId || user.organizationUnitId !== organizationId)
    denyScope();
  try {
    const allowed = await canViewSensitive(user, {
      resourceType: 'LandParty',
      resourceId: '*',
      organizationId,
    });
    if (!allowed) denyScope();
  } catch {
    denyScope();
  }
}

// Land review boundary for officer commands (review/sync/retry, DR-10).
// Enforces land_officer at execution time; grant compatibility alone never
// authorizes. Uses the shared evaluatePolicy seam and maps the denial to
// ASSIGNMENT_REQUIRED when only the assignment is missing.
export async function requireLandReviewAccess(
  user: IdentityUser,
  resource: {
    resourceType: string;
    resourceId: string;
    organizationId?: string;
  },
  client: LandDbClient = prisma,
): Promise<void> {
  if (!(user.roles as readonly string[]).includes('land_officer')) {
    throw new Error('FORBIDDEN');
  }
  if (!user.organizationUnitId?.trim()) {
    throw new Error('FORBIDDEN');
  }
  let organizationId = resource.organizationId;
  if (!organizationId && resource.resourceType === 'LandChangeApplication') {
    const application = await client.landChangeApplication.findUnique({
      where: { id: resource.resourceId },
      select: { organizationId: true },
    });
    organizationId = application?.organizationId;
  }
  if (!organizationId) {
    throw new Error('FORBIDDEN');
  }
  if (organizationId !== user.organizationUnitId) {
    throw new Error('FORBIDDEN');
  }
  const rows = await client.assignment.findMany({
    where: {
      resourceType: resource.resourceType,
      resourceId: resource.resourceId,
      assigneeUserId: user.id,
      status: 'active',
      organizationId,
    },
    select: {
      task: true,
      resourceType: true,
      resourceId: true,
      status: true,
      organizationId: true,
    },
  });
  const assignments: PolicyAssignment[] = rows.map((row) => ({
    task: row.task,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    status: row.status as PolicyAssignment['status'],
    organizationId: row.organizationId ?? undefined,
  }));
  const decision = evaluatePolicy({
    user,
    resource: { ...resource, organizationId },
    action: 'mutate',
    assignments,
  });
  if (decision.allowed) {
    return;
  }
  if (decision.reason === 'ASSIGNMENT_REQUIRED') {
    throw new Error('ASSIGNMENT_REQUIRED');
  }
  throw new Error('FORBIDDEN');
}

// Land database client sharing one transaction for domain + audit writes.
export type LandDbClient = PrismaClient | Prisma.TransactionClient;

// Parcel detail read boundary (LND-03, api-contract GET parcels/{parcelId}).
// Auth: land_officer with related Assignment or commune_leader same OU.
// - Leader same OU reads without assignment (evaluatePolicy leader-read
//   pattern for land resources, DR-09).
// - Officer same OU needs a related active land_review Assignment:
//   direct on LandParcel, or indirect on a LandChangeApplication linked to
//   the parcel via LandApplicationParcel (integration-contracts land uses
//   LandChangeApplication + land_review; data-model LandApplicationParcel
//   is the locked parcel-application relation; overview flow step 7).
// - Cross-OU is FORBIDDEN without data leak (EC-09); officer same OU
//   without a qualifying assignment is ASSIGNMENT_REQUIRED (DR-10).
// Shared evaluatePolicy seam decides read; no new role/task/resourceType.
export async function requireParcelDetailAccess(
  user: IdentityUser | null | undefined,
  parcel: { id: string; organizationId: string },
  client: LandDbClient = prisma,
): Promise<void> {
  if (!user) throw new Error('UNAUTHENTICATED');
  if (!hasLandRole(user.roles)) throw new Error('FORBIDDEN');
  if (!user.organizationUnitId?.trim()) throw new Error('FORBIDDEN');
  if (
    !parcel.organizationId ||
    parcel.organizationId !== user.organizationUnitId
  ) {
    throw new Error('FORBIDDEN');
  }
  if ((user.roles as readonly string[]).includes('commune_leader')) return;
  if (!(user.roles as readonly string[]).includes('land_officer')) {
    throw new Error('FORBIDDEN');
  }

  const parcelResource = {
    resourceType: 'LandParcel',
    resourceId: parcel.id,
    organizationId: parcel.organizationId,
  };
  const directRows = await client.assignment.findMany({
    where: {
      resourceType: 'LandParcel',
      resourceId: parcel.id,
      assigneeUserId: user.id,
      status: 'active',
      organizationId: parcel.organizationId,
    },
    select: {
      task: true,
      resourceType: true,
      resourceId: true,
      status: true,
      organizationId: true,
    },
  });
  const directAssignments: PolicyAssignment[] = directRows.map((row) => ({
    task: row.task,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    status: row.status as PolicyAssignment['status'],
    organizationId: row.organizationId ?? undefined,
  }));
  const directDecision = evaluatePolicy({
    user,
    resource: parcelResource,
    action: 'read',
    assignments: directAssignments,
  });
  if (directDecision.allowed) return;
  if (directDecision.reason === 'ORGANIZATION_SCOPE_DENIED') {
    throw new Error('FORBIDDEN');
  }

  const appRows = await client.assignment.findMany({
    where: {
      resourceType: 'LandChangeApplication',
      assigneeUserId: user.id,
      status: 'active',
      organizationId: parcel.organizationId,
    },
    select: {
      task: true,
      resourceType: true,
      resourceId: true,
      status: true,
      organizationId: true,
    },
  });
  if (!appRows.length) throw new Error('ASSIGNMENT_REQUIRED');
  const candidateIds = appRows.map((row) => row.resourceId);
  const links = await client.landApplicationParcel.findMany({
    where: { parcelId: parcel.id, applicationId: { in: candidateIds } },
    select: { applicationId: true },
  });
  const linkedIds = new Set(links.map((link) => link.applicationId));
  if (!linkedIds.size) throw new Error('ASSIGNMENT_REQUIRED');

  let sawScopeDenied = false;
  for (const applicationId of linkedIds) {
    const scoped: PolicyAssignment[] = appRows
      .filter((row) => row.resourceId === applicationId)
      .map((row) => ({
        task: row.task,
        resourceType: row.resourceType,
        resourceId: row.resourceId,
        status: row.status as PolicyAssignment['status'],
        organizationId: row.organizationId ?? undefined,
      }));
    const decision = evaluatePolicy({
      user,
      resource: {
        resourceType: 'LandChangeApplication',
        resourceId: applicationId,
        organizationId: parcel.organizationId,
      },
      action: 'read',
      assignments: scoped,
    });
    if (decision.allowed) return;
    if (decision.reason === 'ORGANIZATION_SCOPE_DENIED') sawScopeDenied = true;
  }
  if (sawScopeDenied) throw new Error('FORBIDDEN');
  throw new Error('ASSIGNMENT_REQUIRED');
}

// Application detail read boundary (LND-06, api-contract GET
// applications/{applicationId}).
// Auth: land_officer with an active Assignment on the application or
// commune_leader in the same OrganizationUnit (DR-09, DR-10).
// - Leader same OU reads without assignment (leader-read pattern for land
//   resources via evaluatePolicy).
// - Officer same OU needs an active Assignment on the application id; the
//   shared evaluatePolicy seam decides read (task land_review carries read).
// - Cross-OU is FORBIDDEN without data leak (EC-09); officer same OU
//   without a qualifying assignment is ASSIGNMENT_REQUIRED (DR-10).
export async function requireApplicationDetailAccess(
  user: IdentityUser | null | undefined,
  application: { id: string; organizationId: string },
  client: LandDbClient = prisma,
): Promise<void> {
  if (!user) throw new Error('UNAUTHENTICATED');
  if (!hasLandRole(user.roles)) throw new Error('FORBIDDEN');
  if (!user.organizationUnitId?.trim()) throw new Error('FORBIDDEN');
  if (
    !application.organizationId ||
    application.organizationId !== user.organizationUnitId
  ) {
    throw new Error('FORBIDDEN');
  }
  if ((user.roles as readonly string[]).includes('commune_leader')) return;
  if (!(user.roles as readonly string[]).includes('land_officer')) {
    throw new Error('FORBIDDEN');
  }
  const rows = await client.assignment.findMany({
    where: {
      resourceType: 'LandChangeApplication',
      resourceId: application.id,
      assigneeUserId: user.id,
      status: 'active',
      organizationId: application.organizationId,
    },
    select: {
      task: true,
      resourceType: true,
      resourceId: true,
      status: true,
      organizationId: true,
    },
  });
  const assignments: PolicyAssignment[] = rows.map((row) => ({
    task: row.task,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    status: row.status as PolicyAssignment['status'],
    organizationId: row.organizationId ?? undefined,
  }));
  const decision = evaluatePolicy({
    user,
    resource: {
      resourceType: 'LandChangeApplication',
      resourceId: application.id,
      organizationId: application.organizationId,
    },
    action: 'read',
    assignments,
  });
  if (decision.allowed) return;
  if (decision.reason === 'ORGANIZATION_SCOPE_DENIED')
    throw new Error('FORBIDDEN');
  throw new Error('ASSIGNMENT_REQUIRED');
}

// Failures propagate so the domain mutation rolls back (DR-19).
export async function auditLandEvent(
  actor: LandActor,
  input: {
    resourceType: string;
    resourceId: string;
    operation: string;
    metadata?: Record<string, unknown>;
  },
  client: LandDbClient = prisma,
): Promise<void> {
  await recordAudit(
    {
      actor,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      operation: input.operation,
      ...(input.metadata ? { metadata: input.metadata } : {}),
    },
    client,
  );
}
