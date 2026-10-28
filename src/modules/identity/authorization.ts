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

type ResidentActivityAssignment = PolicyAssignment & {
  id: string;
  assigneeUserId: string;
};

type EvaluateResidentActivityPolicyInput = {
  user: IdentityUser;
  resource: ResourceRef;
  assignmentId?: string;
  assignment?: ResidentActivityAssignment | null;
};

const COMMAND_ROLES: readonly RoleName[] = ['commander', 'superior_commander'];
const RESIDENT_ACTIVITY_ROLES: readonly RoleName[] = [
  'commander',
  'duty_officer',
  'field_officer',
  'office_officer',
  'village_officer',
];
const RESIDENT_RECORD_RESOURCE_TYPE = 'SubjectManagementRecord';
const RESIDENT_FOLLOWUP_TASK = 'resident_followup';

const LAND_RESOURCE_TYPES: readonly string[] = ['LandChangeApplication'];
const LAND_COMMAND_ROLES: readonly RoleName[] = ['commune_leader'];

const LAND_PARTY_RESOURCE_TYPE = 'LandParty';
const LAND_PARTY_SENSITIVE_ROLES: readonly RoleName[] = [
  'land_officer',
  'commune_leader',
];

function isLandResource(resourceType: string): boolean {
  return (LAND_RESOURCE_TYPES as readonly string[]).includes(resourceType);
}

function holdsLandCommandRole(roles: readonly RoleName[]): boolean {
  return roles.some((role) =>
    (LAND_COMMAND_ROLES as readonly string[]).includes(role),
  );
}

function holdsLandPartySensitiveRole(roles: readonly RoleName[]): boolean {
  return roles.some((role) =>
    (LAND_PARTY_SENSITIVE_ROLES as readonly string[]).includes(role),
  );
}

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
    !!userOrganizationId?.trim() &&
    !!resourceOrganizationId?.trim() &&
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
    if (holdsCommandRole(input.user.roles)) {
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
    if (
      holdsLandCommandRole(input.user.roles) &&
      isLandResource(input.resource.resourceType)
    ) {
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
    return { allowed: false, reason: 'ROLE_CAPABILITY_DENIED' };
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
  if (
    input.action === 'read' &&
    holdsLandCommandRole(input.user.roles) &&
    isLandResource(input.resource.resourceType)
  ) {
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
  if (
    input.action === 'read_sensitive' &&
    input.resource.resourceType === LAND_PARTY_RESOURCE_TYPE &&
    holdsLandPartySensitiveRole(input.user.roles)
  ) {
    if (
      !input.user.organizationUnitId ||
      !input.resource.organizationId ||
      input.user.organizationUnitId !== input.resource.organizationId
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

export function evaluateResidentActivityPolicy(
  input: EvaluateResidentActivityPolicyInput,
): PolicyEvaluation {
  if (!hasResidentActivityRole(input.user)) {
    return { allowed: false, reason: 'ROLE_CAPABILITY_DENIED' };
  }
  const assignment = input.assignment;
  if (
    !input.assignmentId ||
    !assignment ||
    assignment.id !== input.assignmentId
  ) {
    return { allowed: false, reason: 'ASSIGNMENT_REQUIRED' };
  }
  if (
    assignment.status !== 'active' ||
    assignment.task !== RESIDENT_FOLLOWUP_TASK ||
    assignment.assigneeUserId !== input.user.id ||
    input.resource.resourceType !== RESIDENT_RECORD_RESOURCE_TYPE ||
    !input.resource.resourceId ||
    assignment.resourceType !== RESIDENT_RECORD_RESOURCE_TYPE ||
    assignment.resourceId !== input.resource.resourceId
  ) {
    return { allowed: false, reason: 'TASK_CAPABILITY_DENIED' };
  }
  const actorOrganizationId = input.user.organizationUnitId;
  const recordOrganizationId = input.resource.organizationId;
  const assignmentOrganizationId = assignment.organizationId;
  if (
    !actorOrganizationId?.trim() ||
    !recordOrganizationId?.trim() ||
    !assignmentOrganizationId?.trim() ||
    actorOrganizationId !== recordOrganizationId ||
    recordOrganizationId !== assignmentOrganizationId
  ) {
    return { allowed: false, reason: 'ORGANIZATION_SCOPE_DENIED' };
  }
  return { allowed: true, reason: 'ALLOWED' };
}

function hasResidentActivityRole(user: IdentityUser): boolean {
  return RESIDENT_ACTIVITY_ROLES.some((role) => user.roles.includes(role));
}

export function assertResidentActivityRole(user: IdentityUser): void {
  if (!hasResidentActivityRole(user)) throw new Error('FORBIDDEN');
}

export async function assertResidentActivityAccess(
  user: IdentityUser,
  resource: ResourceRef,
  assignmentId: string | undefined,
  client: PrismaClient | Prisma.TransactionClient = prisma,
): Promise<void> {
  if (
    !user.organizationUnitId?.trim() ||
    !resource.organizationId?.trim() ||
    user.organizationUnitId !== resource.organizationId
  ) {
    throw new Error('FORBIDDEN');
  }
  const select = {
    id: true,
    assigneeUserId: true,
    task: true,
    resourceType: true,
    resourceId: true,
    status: true,
    organizationId: true,
  } as const;
  const row =
    assignmentId === undefined
      ? await client.assignment.findFirst({
          where: {
            resourceType: resource.resourceType,
            resourceId: resource.resourceId,
            task: RESIDENT_FOLLOWUP_TASK,
            assigneeUserId: user.id,
            status: 'active',
            ...(resource.organizationId
              ? { organizationId: resource.organizationId }
              : {}),
          },
          select,
        })
      : assignmentId.trim()
        ? await client.assignment.findUnique({
            where: { id: assignmentId },
            select,
          })
        : null;
  const assignment: ResidentActivityAssignment | undefined = row
    ? {
        id: row.id,
        assigneeUserId: row.assigneeUserId,
        task: row.task,
        resourceType: row.resourceType,
        resourceId: row.resourceId,
        status: row.status as PolicyAssignment['status'],
        organizationId: row.organizationId ?? undefined,
      }
    : undefined;
  if (
    !evaluateResidentActivityPolicy({
      user,
      resource,
      assignmentId: row?.id,
      assignment,
    }).allowed
  ) {
    throw new Error('FORBIDDEN');
  }
}

const resourceAggregateTypes: Record<string, string> = {
  IntakeReport: 'IntakeReport',
  Incident: 'Incident',
  Establishment: 'Establishment',
  Inspection: 'Inspection',
  SuspiciousVehicleRegistry: 'SuspiciousVehicleRegistry',
  VehicleObservation: 'VehicleObservation',
  Subject: 'Subject',
  SubjectManagementRecord: 'SubjectManagementRecord',
  InspectionFinding: 'InspectionFinding',
  ProjectionRecord: 'ProjectionRecord',
  Notification: 'Notification',
};

async function resourceOrganizationId(
  client: PrismaClient | Prisma.TransactionClient,
  resource: ResourceRef,
): Promise<string | undefined> {
  if (resource.organizationId) return resource.organizationId;
  if (resource.resourceType === 'LandChangeApplication') {
    const application = await client.landChangeApplication.findUnique({
      where: { id: resource.resourceId },
      select: { organizationId: true },
    });
    return application?.organizationId ?? undefined;
  }
  if (resource.resourceType === 'LandParcel') {
    const parcel = await client.landParcel.findUnique({
      where: { id: resource.resourceId },
      select: { organizationId: true },
    });
    return parcel?.organizationId ?? undefined;
  }
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

async function mobileResourceOrganizationId(
  client: PrismaClient | Prisma.TransactionClient,
  resource: ResourceRef,
): Promise<string | undefined> {
  if (resource.resourceType === 'Establishment') {
    return (
      (
        await client.establishment.findUnique({
          where: { id: resource.resourceId },
          select: { organizationId: true },
        })
      )?.organizationId ?? undefined
    );
  }
  if (resource.resourceType === 'SubjectManagementRecord') {
    return (
      (
        await client.subjectManagementRecord.findUnique({
          where: { id: resource.resourceId },
          select: { assignedOrganizationId: true },
        })
      )?.assignedOrganizationId ?? undefined
    );
  }
  if (resource.resourceType === 'Inspection') {
    const inspection = await client.inspection.findUnique({
      where: { id: resource.resourceId },
      select: { establishmentId: true },
    });
    if (!inspection) return undefined;
    return (
      (
        await client.establishment.findUnique({
          where: { id: inspection.establishmentId },
          select: { organizationId: true },
        })
      )?.organizationId ?? undefined
    );
  }
  if (resource.resourceType === 'InspectionFinding') {
    const finding = await client.inspectionFinding.findUnique({
      where: { id: resource.resourceId },
      select: { inspectionId: true },
    });
    if (!finding) return undefined;
    const inspection = await client.inspection.findUnique({
      where: { id: finding.inspectionId },
      select: { establishmentId: true },
    });
    if (!inspection) return undefined;
    return (
      (
        await client.establishment.findUnique({
          where: { id: inspection.establishmentId },
          select: { organizationId: true },
        })
      )?.organizationId ?? undefined
    );
  }
  if (resource.resourceType === 'Incident') {
    return (
      (
        await client.eventRecord.findFirst({
          where: {
            aggregateType: 'Incident',
            aggregateId: resource.resourceId,
          },
          orderBy: { aggregateVersion: 'asc' },
          select: { organizationId: true },
        })
      )?.organizationId ?? undefined
    );
  }
  if (resource.resourceType === 'VehicleObservation') {
    const observation = await client.vehicleObservation.findUnique({
      where: { id: resource.resourceId },
      select: { observedById: true },
    });
    if (!observation) return undefined;
    return (
      (
        await client.user.findUnique({
          where: { id: observation.observedById },
          select: { organizationUnitId: true },
        })
      )?.organizationUnitId ?? undefined
    );
  }
  return undefined;
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

/** Mobile read boundary requiring an active, compatible Assignment for every role. */
export async function hasActiveAssignmentForRead(
  user: IdentityUser,
  resource: ResourceRef,
  client: PrismaClient | Prisma.TransactionClient = prisma,
): Promise<boolean> {
  if (!user.organizationUnitId?.trim()) return false;
  const organizationId = await mobileResourceOrganizationId(client, resource);
  if (!organizationId?.trim()) return false;
  if (organizationId !== user.organizationUnitId) return false;
  const assignments = await client.assignment.findMany({
    where: {
      assigneeUserId: user.id,
      resourceType: resource.resourceType,
      resourceId: resource.resourceId,
      organizationId,
      status: 'active',
    },
    select: { task: true },
  });
  return assignments.some(
    ({ task }) =>
      (resource.resourceType === 'VehicleObservation'
        ? task === 'mobile_read'
        : TASK_CAPABILITIES[task]?.includes('read') === true) &&
      isTaskCompatibleWithRoles(task, user.roles),
  );
}

/** Throwing form of the mobile read boundary. */
export async function requireMobileReadAccess(
  user: IdentityUser,
  resource: ResourceRef,
  client: PrismaClient | Prisma.TransactionClient = prisma,
): Promise<void> {
  if (!(await hasActiveAssignmentForRead(user, resource, client))) {
    throw new Error('FORBIDDEN');
  }
}

export function requireRole(user: IdentityUser, ...roles: string[]): void {
  if (!roles.some((role) => user.roles.includes(role as never))) {
    throw new Error('FORBIDDEN');
  }
}
