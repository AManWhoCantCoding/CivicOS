import { prisma } from '@/lib/prisma';
import type { Prisma, PrismaClient } from '@prisma/client';

import type {
  AuthorizationAction,
  IdentityUser,
  ResourceRef,
} from './contracts';

function isCommander(user: IdentityUser): boolean {
  return user.roles.includes('commander');
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

const taskCapabilities: Record<string, AuthorizationAction[]> = {
  incident_verification: ['read', 'mutate', 'read_sensitive'],
  inspection_fieldwork: ['read', 'mutate', 'read_sensitive'],
  vehicle_verification: ['read', 'mutate', 'read_sensitive'],
};

function assignmentAllowsAction(
  task: string,
  action: AuthorizationAction,
): boolean {
  if (action === 'read') return true;
  return taskCapabilities[task]?.includes(action) ?? false;
}

export async function canAccess(
  user: IdentityUser,
  resource: ResourceRef,
  action: AuthorizationAction,
  client: PrismaClient | Prisma.TransactionClient = prisma,
): Promise<boolean> {
  const organizationId = await resourceOrganizationId(client, resource);
  if (organizationId && user.organizationUnitId !== organizationId) {
    return false;
  }
  if (isCommander(user)) return true;
  if (action === 'approve' || action === 'assign') return false;

  const assignment = await client.assignment.findFirst({
    where: {
      resourceType: resource.resourceType,
      resourceId: resource.resourceId,
      assigneeUserId: user.id,
      status: 'active',
      ...(resource.organizationId || user.organizationUnitId
        ? { organizationId: resource.organizationId ?? user.organizationUnitId }
        : {}),
    },
    select: { task: true },
  });
  if (!assignment) return false;
  return assignmentAllowsAction(assignment.task, action);
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

export function requireRole(user: IdentityUser, ...roles: string[]): void {
  if (!roles.some((role) => user.roles.includes(role as never))) {
    throw new Error('FORBIDDEN');
  }
}
