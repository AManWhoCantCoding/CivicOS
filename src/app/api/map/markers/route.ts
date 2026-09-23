import { NextResponse } from 'next/server';

import { hasBusinessCapability } from '@/components/navigation/feature-registry';
import { getCurrentUser, recordAudit } from '@/modules/identity';
import { ROLE_BASE_CAPABILITIES } from '@/modules/identity/contracts';
import { prisma } from '@/lib/prisma';
import {
  MAP_ERRORS,
  MAP_PROJECTION_SOURCE_AGGREGATES,
  maskMapMarker,
  projectToMapMarkers,
} from '@/modules/platform/map';

// Marker bản đồ chiếu từ projection rows, lọc theo OrganizationUnit.
export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  if (!hasBusinessCapability(user.roles)) {
    return NextResponse.json(
      { error: MAP_ERRORS.permissionDenied },
      { status: 403 },
    );
  }
  const rows = await prisma.projectionRecord.findMany({
    where: {
      aggregateType: { in: [...MAP_PROJECTION_SOURCE_AGGREGATES] },
      ...(user.organizationUnitId
        ? {
            state: {
              path: ['organizationId'],
              equals: user.organizationUnitId,
            },
          }
        : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  });
  const capabilities = user.roles.flatMap(
    (role) => ROLE_BASE_CAPABILITIES[role] ?? [],
  );
  const canReadSensitive = capabilities.includes('read_sensitive');
  const markers = projectToMapMarkers(
    rows.map((row) => ({
      aggregateType: row.aggregateType,
      aggregateId: row.aggregateId,
      state: row.state,
    })),
  ).map((marker) => {
    const next = maskMapMarker(marker, canReadSensitive);
    return { ...next, hasArea: Boolean(marker.geometry) };
  });
  await recordAudit({
    actor: user,
    resourceType: 'MapWorkspace',
    resourceId: '*',
    operation: 'map.markers.listed',
    metadata: { count: markers.length },
  });
  return NextResponse.json({
    markers,
    organizationUnitId: user.organizationUnitId ?? null,
    official: false,
  });
}
