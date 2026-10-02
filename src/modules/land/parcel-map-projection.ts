import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import type { IdentityUser } from '@/modules/identity';

import {
  assertLandActor,
  requireParcelDetailAccess,
  type LandDbClient,
} from './access';
import { fromGeometryJson, type PolygonGeometry } from './parcel-geometry';

// P0 single-parcel map read seam (T-001).
// Design: docs/design/land-parcel-map (overview, data-model, domain-rules,
// api-contract) and ADR-0002. Logical projection over LandParcel: no new
// table, column, index, migration, cache or materialized view. The query
// selects the map allowlist plus the ACL-only organizationId with
// ST_AsGeoJSON; it never fetches the full parcel detail for late filtering.

// Stored row for the map projection. organizationId is ACL-only and is never
// serialized into the response.
export type MapParcelRow = {
  id: string;
  parcelCode: string;
  mapSheetNumber: string;
  parcelNumber: string;
  status: string;
  geometryGeoJson: string;
  updatedAt: Date;
  organizationId: string;
};

// Allowlist columns plus ACL-only organizationId with PostGIS GeoJSON output.
const MAP_PARCEL_COLUMNS = Prisma.sql`"id" AS "id", "parcelCode" AS "parcelCode", "mapSheetNumber" AS "mapSheetNumber", "parcelNumber" AS "parcelNumber", "status" AS "status", ST_AsGeoJSON("geometry") AS "geometryGeoJson", "updatedAt" AS "updatedAt", "organizationId" AS "organizationId"`;

// Read one scoped map row by parcel id. Parameterized; no full-detail fetch.
export async function findMapParcelRow(
  parcelId: string,
  client: LandDbClient = prisma,
): Promise<MapParcelRow | null> {
  if (!parcelId?.trim()) return null;
  const rows = await client.$queryRaw<MapParcelRow[]>`
    SELECT ${MAP_PARCEL_COLUMNS} FROM "LandParcel" WHERE "id" = ${parcelId} LIMIT 1`;
  return rows[0] ?? null;
}

// Minimal parcel shape rendered on the map.
export type MapParcelProjection = {
  id: string;
  parcelCode: string;
  mapSheetNumber: string;
  parcelNumber: string;
  status: string;
  geometry: PolygonGeometry;
  updatedAt: string;
};

// Fixed P0 envelope: parcel allowlist plus simulated/projection constants.
export type LandParcelMapResponse = {
  parcel: MapParcelProjection;
  simulated: true;
  projection: 'land-parcel-map';
};

// Map a scoped row to the fixed projection. Reuses the shared Polygon
// validator, keeping every ring and failing closed on invalid geometry.
export function toLandParcelMapResponse(
  row: MapParcelRow,
): LandParcelMapResponse {
  return {
    parcel: {
      id: row.id,
      parcelCode: row.parcelCode,
      mapSheetNumber: row.mapSheetNumber,
      parcelNumber: row.parcelNumber,
      status: row.status,
      geometry: fromGeometryJson(row.geometryGeoJson),
      updatedAt: row.updatedAt.toISOString(),
    },
    simulated: true,
    projection: 'land-parcel-map',
  };
}

// Read the P0 projection for one parcel: fail fast on the actor, load the
// allowlist row, enforce the existing parcel access policy, then serialize
// geometry only after the policy allows.
export async function getLandParcelMapProjection(
  parcelId: string,
  actor: IdentityUser,
  client: LandDbClient = prisma,
): Promise<LandParcelMapResponse> {
  if (!parcelId?.trim()) throw new Error('INVALID_REQUEST');
  assertLandActor(actor);
  const row = await findMapParcelRow(parcelId, client);
  if (!row) throw new Error('PARCEL_NOT_FOUND');
  await requireParcelDetailAccess(
    actor,
    { id: row.id, organizationId: row.organizationId },
    client,
  );
  return toLandParcelMapResponse(row);
}
