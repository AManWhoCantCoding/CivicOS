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

export async function canAccess(
  user: IdentityUser,
  resource: ResourceRef,
  action: AuthorizationAction,
  client: PrismaClient | Prisma.TransactionClient = prisma,
): Promise<boolean> {
  if (isCommander(user)) return true;
  if (action === 'approve' || action === 'assign') return false;

  const assignment = await client.assignment.findFirst({
    where: {
      resourceType: resource.resourceType,
      resourceId: resource.resourceId,
      assigneeUserId: user.id,
      status: 'active',
    },
  });
  if (!assignment) return false;
  if (action === 'read_sensitive') return true;
  return action === 'read' || action === 'mutate';
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
