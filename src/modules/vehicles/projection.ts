import { prisma } from '@/lib/prisma';
import { canAccess, recordAudit, requireRole } from '@/modules/identity';

import type { VehicleActor } from './contracts';

export async function listRegistry(actor: VehicleActor) {
  requireRole(actor, 'commander', 'office_officer');
  const registry = await prisma.suspiciousVehicleEntry.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });
  await recordAudit({
    actor,
    resourceType: 'SuspiciousVehicleRegistry',
    resourceId: '*',
    operation: 'vehicle_registry.listed',
    metadata: { count: registry.length },
  });
  return registry;
}

export async function listObservations(actor: VehicleActor) {
  const assignedResourceIds = actor.roles.includes('commander')
    ? undefined
    : (
        await prisma.assignment.findMany({
          where: {
            resourceType: 'VehicleObservation',
            assigneeUserId: actor.id,
            status: 'active',
          },
          select: { resourceId: true },
        })
      ).map(({ resourceId }) => resourceId);
  const observations = await prisma.vehicleObservation.findMany({
    where: assignedResourceIds
      ? { id: { in: assignedResourceIds } }
      : undefined,
    orderBy: { observedAt: 'desc' },
    take: 100,
  });
  await recordAudit({
    actor,
    resourceType: 'VehicleObservation',
    resourceId: '*',
    operation: 'vehicle_observation.listed',
    metadata: { count: observations.length },
  });
  return observations;
}

export async function getObservation(
  observationId: string,
  actor: VehicleActor,
) {
  const observation = await prisma.vehicleObservation.findUnique({
    where: { id: observationId },
  });
  if (!observation) throw new Error('OBSERVATION_NOT_FOUND');
  if (!actor.roles.includes('commander')) {
    const allowed = await canAccess(
      actor,
      { resourceType: 'VehicleObservation', resourceId: observationId },
      'read',
    );
    if (!allowed && observation.observedById !== actor.id)
      throw new Error('FORBIDDEN');
  }
  await recordAudit({
    actor,
    resourceType: 'VehicleObservation',
    resourceId: observationId,
    operation: 'vehicle_observation.read',
  });
  const [verifications] = await Promise.all([
    prisma.vehicleVerification.findMany({
      where: { observationId },
      orderBy: { verifiedAt: 'asc' },
    }),
  ]);
  return { observation, verifications };
}
