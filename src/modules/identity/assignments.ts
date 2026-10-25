import { randomUUID } from 'node:crypto';

import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { appendEvent, getAggregateVersion } from '@/modules/eventing';

import { recordAudit } from './audit';
import type { AssignmentInput, IdentityUser, RoleName } from './contracts';
import { isTaskCompatibleWithRoles } from './contracts';
import { requireRole } from './authorization';

function actorSnapshot(actor: IdentityUser) {
  return {
    id: actor.id,
    name: actor.name,
    role: actor.roles[0],
    organizationId: actor.organizationUnitId,
  };
}

function isLandReviewAssignment(input: AssignmentInput): boolean {
  return (
    input.task === 'land_review' &&
    input.resourceType === 'LandChangeApplication'
  );
}

export async function grantAssignments(
  tx: Prisma.TransactionClient,
  input: AssignmentInput,
  actor: IdentityUser,
  allowedRoles: string[] = ['commander', 'superior_commander'],
) {
  const effectiveRoles = isLandReviewAssignment(input)
    ? [...new Set([...allowedRoles, 'commune_leader'])]
    : allowedRoles;
  requireRole(actor, ...effectiveRoles);
  if (!input.assigneeUserIds.length) throw new Error('ASSIGNEE_REQUIRED');
  if (!input.task.trim()) throw new Error('TASK_REQUIRED');
  if (!actor.organizationUnitId?.trim()) throw new Error('FORBIDDEN');
  if (input.organizationId !== undefined && !input.organizationId.trim()) {
    throw new Error('ORGANIZATION_SCOPE_FORBIDDEN');
  }
  if (
    input.organizationId &&
    actor.organizationUnitId &&
    input.organizationId !== actor.organizationUnitId
  ) {
    throw new Error('ORGANIZATION_SCOPE_FORBIDDEN');
  }

  const assignments = [];
  for (const assigneeUserId of input.assigneeUserIds) {
    const assignee = await tx.user.findUnique({
      where: { id: assigneeUserId },
      select: {
        active: true,
        organizationUnitId: true,
        roles: { select: { role: { select: { name: true } } } },
      },
    });
    if (!assignee?.active) throw new Error('ASSIGNEE_NOT_FOUND');
    const assigneeRoles = (assignee.roles ?? []).map(
      ({ role }) => role.name as RoleName,
    );
    if (!isTaskCompatibleWithRoles(input.task, assigneeRoles)) {
      throw new Error('INCOMPATIBLE_TASK');
    }
    const organizationId = input.organizationId ?? actor.organizationUnitId;
    if (organizationId && assignee.organizationUnitId !== organizationId) {
      throw new Error('ASSIGNEE_ORGANIZATION_MISMATCH');
    }
    const assignment = await tx.assignment.create({
      data: {
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        task: input.task,
        assigneeUserId,
        grantedById: actor.id,
        organizationId,
      },
    });
    assignments.push(assignment);

    await appendEvent(tx, {
      eventId: randomUUID(),
      eventType: 'AssignmentGranted',
      eventVersion: 1,
      aggregateType: 'Assignment',
      aggregateId: assignment.id,
      aggregateVersion: 1,
      occurredAt: assignment.grantedAt,
      actor: actorSnapshot(actor),
      payload: {
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        assigneeUserId,
        task: input.task,
      },
      metadata: {},
    });
  }

  await recordAudit(
    {
      actor,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      operation: 'assignment.granted',
      reason: input.task,
      metadata: { assignmentIds: assignments.map(({ id }) => id) },
    },
    tx,
  );

  return assignments;
}

export async function carryActiveAssignments(
  tx: Prisma.TransactionClient,
  input: {
    sourceResourceType: string;
    sourceResourceId: string;
    targetResourceType: string;
    targetResourceId: string;
  },
  actor: IdentityUser,
) {
  const sourceAssignments = await tx.assignment.findMany({
    where: {
      resourceType: input.sourceResourceType,
      resourceId: input.sourceResourceId,
      status: 'active',
    },
  });
  const assignments = [];
  for (const source of sourceAssignments) {
    const assignment = await tx.assignment.create({
      data: {
        resourceType: input.targetResourceType,
        resourceId: input.targetResourceId,
        task: source.task,
        assigneeUserId: source.assigneeUserId,
        grantedById: source.grantedById,
        organizationId: source.organizationId,
      },
    });
    assignments.push(assignment);
    await appendEvent(tx, {
      eventId: randomUUID(),
      eventType: 'AssignmentGranted',
      eventVersion: 1,
      aggregateType: 'Assignment',
      aggregateId: assignment.id,
      aggregateVersion: 1,
      occurredAt: assignment.grantedAt,
      actor: actorSnapshot(actor),
      payload: {
        resourceType: input.targetResourceType,
        resourceId: input.targetResourceId,
        assigneeUserId: assignment.assigneeUserId,
        task: assignment.task,
        carriedFromAssignmentId: source.id,
      },
      metadata: {},
    });
  }
  if (assignments.length) {
    await recordAudit(
      {
        actor,
        resourceType: input.targetResourceType,
        resourceId: input.targetResourceId,
        operation: 'assignment.carried',
        metadata: {
          sourceResourceId: input.sourceResourceId,
          assignmentIds: assignments.map(({ id }) => id),
        },
      },
      tx,
    );
  }
  return assignments;
}

export async function createAssignments(
  input: AssignmentInput,
  actor: IdentityUser,
) {
  return prisma.$transaction((tx) => grantAssignments(tx, input, actor));
}

export async function revokeAssignment(
  assignmentId: string,
  actor: IdentityUser,
  reason: string,
) {
  requireRole(actor, 'commander', 'superior_commander', 'commune_leader');
  if (!reason.trim()) throw new Error('REVOKE_REASON_REQUIRED');
  if (!actor.organizationUnitId?.trim()) throw new Error('FORBIDDEN');

  return prisma.$transaction(async (tx) => {
    const existing = await tx.assignment.findUnique({
      where: { id: assignmentId },
    });
    if (!existing) throw new Error('ASSIGNMENT_NOT_FOUND');
    const isLandReview =
      existing.resourceType === 'LandChangeApplication' &&
      existing.task === 'land_review';
    if (!isLandReview) {
      requireRole(actor, 'commander', 'superior_commander');
    }
    if (
      !existing.organizationId?.trim() ||
      existing.organizationId !== actor.organizationUnitId
    ) {
      throw new Error('FORBIDDEN');
    }
    if (existing.status === 'revoked') return existing;

    const assignment = await tx.assignment.update({
      where: { id: assignmentId, status: 'active' },
      data: {
        status: 'revoked',
        revokedAt: new Date(),
        revokedById: actor.id,
        revokeReason: reason.trim(),
      },
    });
    const aggregateVersion =
      (await getAggregateVersion(tx, 'Assignment', assignment.id)) + 1;
    await appendEvent(tx, {
      eventId: randomUUID(),
      eventType: 'AssignmentRevoked',
      eventVersion: 1,
      aggregateType: 'Assignment',
      aggregateId: assignment.id,
      aggregateVersion,
      occurredAt: assignment.revokedAt ?? new Date(),
      actor: actorSnapshot(actor),
      payload: { reason: reason.trim() },
      metadata: {},
    });
    await recordAudit(
      {
        actor,
        resourceType: assignment.resourceType,
        resourceId: assignment.resourceId,
        operation: 'assignment.revoked',
        reason: reason.trim(),
        metadata: { assignmentId: assignment.id },
      },
      tx,
    );
    return assignment;
  });
}

export async function listAssignments(input: {
  actor: IdentityUser;
  resourceType?: string;
  resourceId?: string;
  includeRevoked?: boolean;
}) {
  const { actor, resourceType, resourceId, includeRevoked = false } = input;
  if (!actor.organizationUnitId?.trim()) throw new Error('FORBIDDEN');
  const managesAssignments =
    actor.roles.includes('commander' as never) ||
    actor.roles.includes('superior_commander' as never);
  const assignments = await prisma.assignment.findMany({
    where: {
      ...(resourceType ? { resourceType } : {}),
      ...(resourceId ? { resourceId } : {}),
      ...(managesAssignments
        ? actor.organizationUnitId
          ? { organizationId: actor.organizationUnitId }
          : {}
        : {
            assigneeUserId: actor.id,
            ...(actor.organizationUnitId
              ? { organizationId: actor.organizationUnitId }
              : {}),
          }),
      ...(includeRevoked ? {} : { status: 'active' }),
    },
    orderBy: { grantedAt: 'desc' },
  });
  await recordAudit({
    actor,
    resourceType: resourceType ?? 'Assignment',
    resourceId: resourceId ?? '*',
    operation: 'assignment.listed',
    metadata: { count: assignments.length, includeRevoked },
  });
  return assignments;
}
