import { prisma } from '@/lib/prisma';
import {
  hasActiveAssignmentForRead,
  type IdentityUser,
} from '@/modules/identity';
import { resolveMapPermission } from '@/modules/platform/map';

import type { MapLayerItem, MapLayersEnvelope } from './contracts';

const LAYER_CATALOG: readonly MapLayerItem[] = [
  {
    id: 'related-info',
    label: 'Thông tin liên quan',
    visibleByDefault: true,
    entityTypes: ['RESIDENT', 'BUSINESS', 'HOTSPOT', 'VIOLATION'],
  },
  {
    id: 'incidents',
    label: 'Vụ việc',
    visibleByDefault: true,
    entityTypes: ['HOTSPOT'],
  },
];

async function hasLayerAssignment(
  user: IdentityUser,
  entityTypes: MapLayerItem['entityTypes'],
): Promise<boolean> {
  const organizationId = user.organizationUnitId;
  if (!organizationId) return false;
  for (const entityType of entityTypes) {
    const resourceType =
      entityType === 'RESIDENT'
        ? 'SubjectManagementRecord'
        : entityType === 'BUSINESS'
          ? 'Establishment'
          : entityType === 'HOTSPOT'
            ? 'Incident'
            : 'InspectionFinding';
    const ids =
      resourceType === 'Establishment'
        ? await prisma.establishment.findMany({
            where: { organizationId },
            select: { id: true },
            take: 100,
          })
        : resourceType === 'SubjectManagementRecord'
          ? await prisma.subjectManagementRecord.findMany({
              where: { assignedOrganizationId: organizationId },
              select: { id: true },
              take: 100,
            })
          : resourceType === 'Incident'
            ? await prisma.eventRecord.findMany({
                where: { aggregateType: 'Incident', organizationId },
                select: { aggregateId: true },
                distinct: ['aggregateId'],
                take: 100,
              })
            : await (async () => {
                const establishments = await prisma.establishment.findMany({
                  where: { organizationId },
                  select: { id: true },
                  take: 100,
                });
                const inspections = await prisma.inspection.findMany({
                  where: {
                    establishmentId: {
                      in: establishments.map(({ id }) => id),
                    },
                  },
                  select: { id: true },
                  take: 100,
                });
                return prisma.inspectionFinding.findMany({
                  where: {
                    inspectionId: { in: inspections.map(({ id }) => id) },
                  },
                  select: { id: true },
                  take: 100,
                });
              })();
    for (const row of ids) {
      const resourceId = 'id' in row ? row.id : row.aggregateId;
      if (
        await hasActiveAssignmentForRead(user, {
          resourceType,
          resourceId,
          organizationId,
        })
      )
        return true;
    }
  }
  return false;
}

/** Resolve mobile layers from session role, OU, and active Assignment only. */
export async function resolveMobileLayers(
  user: IdentityUser,
): Promise<MapLayersEnvelope> {
  if (resolveMapPermission(user) !== 'ok') throw new Error('FORBIDDEN');
  const layers: MapLayerItem[] = [];
  for (const layer of LAYER_CATALOG) {
    if (await hasLayerAssignment(user, layer.entityTypes)) layers.push(layer);
  }
  if (!layers.length) throw new Error('FORBIDDEN');
  return { layers };
}
