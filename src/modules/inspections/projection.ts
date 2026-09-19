import { prisma } from '@/lib/prisma';
import { canAccess, recordAudit, requireRole } from '@/modules/identity';

import type { InspectionActor } from './contracts';

export async function listEstablishments(actor: InspectionActor) {
  requireRole(actor, 'commander', 'office_officer');
  const establishments = await prisma.establishment.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
    take: 100,
  });
  await recordAudit({
    actor,
    resourceType: 'Establishment',
    resourceId: '*',
    operation: 'establishment.listed',
    metadata: { count: establishments.length },
  });
  return establishments;
}

export async function getEstablishment(
  establishmentId: string,
  actor: InspectionActor,
) {
  requireRole(actor, 'commander', 'office_officer');
  const establishment = await prisma.establishment.findUnique({
    where: { id: establishmentId },
  });
  if (!establishment) throw new Error('ESTABLISHMENT_NOT_FOUND');
  await recordAudit({
    actor,
    resourceType: 'Establishment',
    resourceId: establishmentId,
    operation: 'establishment.read',
  });
  return establishment;
}

export async function listInspections(actor: InspectionActor) {
  const assignedResourceIds = actor.roles.includes('commander')
    ? undefined
    : (
        await prisma.assignment.findMany({
          where: {
            resourceType: 'Inspection',
            assigneeUserId: actor.id,
            status: 'active',
            ...(actor.organizationUnitId
              ? { organizationId: actor.organizationUnitId }
              : {}),
          },
          select: { resourceId: true },
        })
      ).map(({ resourceId }) => resourceId);

  const inspections = await prisma.inspection.findMany({
    where: assignedResourceIds
      ? { id: { in: assignedResourceIds } }
      : undefined,
    orderBy: { scheduledAt: 'asc' },
    take: 100,
  });
  await recordAudit({
    actor,
    resourceType: 'Inspection',
    resourceId: '*',
    operation: 'inspection.listed',
    metadata: { count: inspections.length },
  });
  return inspections;
}

export async function getInspection(
  inspectionId: string,
  actor: InspectionActor,
) {
  const inspection = await prisma.inspection.findUnique({
    where: { id: inspectionId },
  });
  if (!inspection) throw new Error('INSPECTION_NOT_FOUND');
  if (!actor.roles.includes('commander')) {
    const allowed = await canAccess(
      actor,
      { resourceType: 'Inspection', resourceId: inspectionId },
      'read',
    );
    if (!allowed) throw new Error('FORBIDDEN');
  }
  await recordAudit({
    actor,
    resourceType: 'Inspection',
    resourceId: inspectionId,
    operation: 'inspection.read',
  });
  const [findings, recommendations] = await Promise.all([
    prisma.inspectionFinding.findMany({
      where: { inspectionId },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.enforcementRecommendation.findMany({
      where: { inspectionId },
      orderBy: { createdAt: 'asc' },
    }),
  ]);
  return { inspection, findings, recommendations };
}
