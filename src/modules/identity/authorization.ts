import { prisma } from '@/lib/prisma';
import type { Prisma, PrismaClient } from '@prisma/client';

import type {
  AuthorizationAction,
  Capability,
  IdentityUser,
  PolicyAssignment,
  ResourceRef,
  RoleName,
} from './contracts';
import {
  ROLE_BASE_CAPABILITIES,
  TASK_ALLOWED_ROLES,
  TASK_CAPABILITIES,
  isTaskCompatibleWithRoles,
} from './contracts';

export type PolicyEvaluation = {
  allowed: boolean;
  reason:
    | 'ALLOWED'
    | 'ROLE_CAPABILITY_DENIED'
    | 'ASSIGNMENT_REQUIRED'
    | 'TASK_CAPABILITY_DENIED'
    | 'ORGANIZATION_SCOPE_DENIED';
};

export type EvaluatePolicyInput = {
  user: IdentityUser;
  resource: ResourceRef;
  action: AuthorizationAction;
  assignments: readonly PolicyAssignment[];
};

const COMMAND_ROLES: readonly RoleName[] = ['commander', 'superior_commander'];

function unionBaseCapabilities(roles: readonly RoleName[]): Set<Capability> {
  const merged = new Set<Capability>();
  for (const role of roles) {
    for (const capability of ROLE_BASE_CAPABILITIES[role] ?? []) {
      merged.add(capability);
    }
  }
  return merged;
}

function holdsCommandRole(roles: readonly RoleName[]): boolean {
  return roles.some((role) =>
    (COMMAND_ROLES as readonly string[]).includes(role),
  );
}

function sameOrganizationUnit(
  userOrganizationId: string | undefined,
  resourceOrganizationId: string | undefined,
): boolean {
  return (
    !userOrganizationId ||
    !resourceOrganizationId ||
    userOrganizationId === resourceOrganizationId
  );
}

function findMatchingAssignment(
  assignments: readonly PolicyAssignment[],
  user: IdentityUser,
  resource: ResourceRef,
  action: AuthorizationAction,
): PolicyAssignment | undefined {
  return assignments.find(
    (candidate) =>
      candidate.status === 'active' &&
      candidate.resourceType === resource.resourceType &&
      candidate.resourceId === resource.resourceId &&
      (TASK_CAPABILITIES[candidate.task] ?? []).includes(
        action as Capability,
      ) &&
      (TASK_ALLOWED_ROLES[candidate.task] ?? []).some((role) =>
        (user.roles as readonly string[]).includes(role),
      ) &&
      isTaskCompatibleWithRoles(candidate.task, user.roles),
  );
}

function assignmentScopedToUserAndResource(
  matched: PolicyAssignment,
  user: IdentityUser,
  resource: ResourceRef,
): boolean {
  if (
    matched.organizationId &&
    user.organizationUnitId &&
    matched.organizationId !== user.organizationUnitId
  ) {
    return false;
  }
  if (
    matched.organizationId &&
    resource.organizationId &&
    matched.organizationId !== resource.organizationId
  ) {
    return false;
  }
  return true;
}

/** Merge multi-role base capabilities, then apply one explicit rule per action with same-unit scope. */
export function evaluatePolicy(input: EvaluatePolicyInput): PolicyEvaluation {
  const base = unionBaseCapabilities(input.user.roles);
  if (!base.has(input.action as Capability)) {
    return { allowed: false, reason: 'ROLE_CAPABILITY_DENIED' };
  }
  if (input.action === 'assign' || input.action === 'approve') {
    if (!holdsCommandRole(input.user.roles)) {
      return { allowed: false, reason: 'ROLE_CAPABILITY_DENIED' };
    }
    if (
      !sameOrganizationUnit(
        input.user.organizationUnitId,
        input.resource.organizationId,
      )
    ) {
      return { allowed: false, reason: 'ORGANIZATION_SCOPE_DENIED' };
    }
    return { allowed: true, reason: 'ALLOWED' };
  }
  if (input.action === 'read' && holdsCommandRole(input.user.roles)) {
    if (
      !sameOrganizationUnit(
        input.user.organizationUnitId,
        input.resource.organizationId,
      )
    ) {
      return { allowed: false, reason: 'ORGANIZATION_SCOPE_DENIED' };
    }
    return { allowed: true, reason: 'ALLOWED' };
  }
  const matched = findMatchingAssignment(
    input.assignments,
    input.user,
    input.resource,
    input.action,
  );
  if (!matched) {
    const hasCandidate = input.assignments.some(
      (candidate) =>
        candidate.status === 'active' &&
        candidate.resourceType === input.resource.resourceType &&
        candidate.resourceId === input.resource.resourceId,
    );
    return {
      allowed: false,
      reason: hasCandidate ? 'TASK_CAPABILITY_DENIED' : 'ASSIGNMENT_REQUIRED',
    };
  }
  if (
    !sameOrganizationUnit(
      input.user.organizationUnitId,
      input.resource.organizationId,
    ) ||
    !assignmentScopedToUserAndResource(matched, input.user, input.resource)
  ) {
    return { allowed: false, reason: 'ORGANIZATION_SCOPE_DENIED' };
  }
  return { allowed: true, reason: 'ALLOWED' };
}

const resourceAggregateTypes: Record<string, string> = {
  IntakeReport: 'IntakeReport',
  Incident: 'Incident',
  Establishment: 'Establishment',
  Inspection: 'Inspection',
  SuspiciousVehicleRegistry: 'SuspiciousVehicleRegistry',
  VehicleObservation: 'VehicleObservation',
};

async function resourceOrganizationId(
  client: PrismaClient | Prisma.TransactionClient,
  resource: ResourceRef,
): Promise<string | undefined> {
  if (resource.organizationId) return resource.organizationId;
  const aggregateType = resourceAggregateTypes[resource.resourceType];
  if (!aggregateType) return undefined;
  const event = await client.eventRecord.findFirst({
    where: {
      aggregateType,
      aggregateId: resource.resourceId,
    },
    orderBy: { aggregateVersion: 'asc' },
    select: { organizationId: true },
  });
  return event?.organizationId ?? undefined;
}

export async function canAccess(
  user: IdentityUser,
  resource: ResourceRef,
  action: AuthorizationAction,
  client: PrismaClient | Prisma.TransactionClient = prisma,
): Promise<boolean> {
  const organizationId = await resourceOrganizationId(client, resource);
  const effectiveResource: ResourceRef = {
    ...resource,
    organizationId: organizationId ?? resource.organizationId,
  };
  const rows = await client.assignment.findMany({
    where: {
      resourceType: resource.resourceType,
      resourceId: resource.resourceId,
      assigneeUserId: user.id,
      status: 'active',
      ...(effectiveResource.organizationId || user.organizationUnitId
        ? {
            organizationId:
              effectiveResource.organizationId ?? user.organizationUnitId,
          }
        : {}),
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
  return evaluatePolicy({
    user,
    resource: effectiveResource,
    action,
    assignments,
  }).allowed;
}

export async function assertAccess(
  user: IdentityUser,
  resource: ResourceRef,
  action: AuthorizationAction,
  client: PrismaClient | Prisma.TransactionClient = prisma,
): Promise<void> {
  if (!(await canAccess(user, resource, action, client))) {
    throw new Error('FORBIDDEN');
  }
}

/** Read boundary over the shared policy seam. */
export async function canRead(
  user: IdentityUser,
  resource: ResourceRef,
  client?: PrismaClient | Prisma.TransactionClient,
): Promise<boolean> {
  return canAccess(user, resource, 'read', client);
}

/** Mutation boundary over the shared policy seam. */
export async function canMutate(
  user: IdentityUser,
  resource: ResourceRef,
  client?: PrismaClient | Prisma.TransactionClient,
): Promise<boolean> {
  return canAccess(user, resource, 'mutate', client);
}

/** Assignment-management boundary over the shared policy seam. */
export async function canAssign(
  user: IdentityUser,
  resource: ResourceRef,
  client?: PrismaClient | Prisma.TransactionClient,
): Promise<boolean> {
  return canAccess(user, resource, 'assign', client);
}

/** Approval boundary over the shared policy seam. */
export async function canApprove(
  user: IdentityUser,
  resource: ResourceRef,
  client?: PrismaClient | Prisma.TransactionClient,
): Promise<boolean> {
  return canAccess(user, resource, 'approve', client);
}

/** Sensitive-read boundary over the shared policy seam. */
export async function canViewSensitive(
  user: IdentityUser,
  resource: ResourceRef,
  client?: PrismaClient | Prisma.TransactionClient,
): Promise<boolean> {
  return canAccess(user, resource, 'read_sensitive', client);
}

export function requireRole(user: IdentityUser, ...roles: string[]): void {
  if (!roles.some((role) => user.roles.includes(role as never))) {
    throw new Error('FORBIDDEN');
  }
}
