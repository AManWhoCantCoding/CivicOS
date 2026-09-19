import { prisma } from '@/lib/prisma';

import { recordAudit } from '@/modules/identity';
import type { IdentityUser } from '@/modules/identity';

export async function listIncidents(
  actor: IdentityUser,
  input?: { status?: string; category?: string },
) {
  const assignedResourceIds = actor.roles.includes('commander')
    ? undefined
    : (
        await prisma.assignment.findMany({
          where: {
            resourceType: 'Incident',
            assigneeUserId: actor.id,
            status: 'active',
          },
          select: { resourceId: true },
        })
      ).map(({ resourceId }) => resourceId);

  const incidents = await prisma.incident.findMany({
    where: {
      ...(assignedResourceIds ? { id: { in: assignedResourceIds } } : {}),
      ...(input?.status ? { status: input.status } : {}),
      ...(input?.category ? { category: input.category } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });
  await recordAudit({
    actor,
    resourceType: 'Incident',
    resourceId: '*',
    operation: 'incident.listed',
    metadata: { count: incidents.length },
  });
  return incidents;
}
