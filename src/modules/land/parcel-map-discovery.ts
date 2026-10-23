import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import type { IdentityUser } from '@/modules/identity';
import { CADN_BOUNDS } from '@/modules/platform/map';

import {
  assertLandActor,
  requireParcelDetailAccess,
  type LandDbClient,
} from './access';
import {
  toLandParcelMapResponse,
  type MapParcelProjection,
  type MapParcelRow,
} from './parcel-map-projection';
import { decodeCursor, encodeCursor } from './schemas';

// P1 web-only scoped parcel discovery (T-008).
// Design: docs/land-parcel-map (api-contract P1, data-model 6/P1,
// domain-rules DR-LPM-12, edge-cases EC-LPM-13/14/19-25). Logical read
// projection over LandParcel: no new table, column, index, migration, cache
// or materialized view. Reuses the existing scalar/GiST indexes, the opaque
// land cursor, the P0 map allowlist mapper and the parcel access policy.
// Mobile keeps the P0 focused-single-parcel flow and never calls this seam.

export const DISCOVERY_LIMIT_DEFAULT = 50;
export const DISCOVERY_LIMIT_MAX = 100;

const DISCOVERY_STATUSES: readonly string[] = ['proposed', 'active', 'retired'];

export type DiscoveryBbox = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
};

export type DiscoveryQuery = {
  parcelCode?: string;
  mapSheetNumber?: string;
  parcelNumber?: string;
  communeCode?: string;
  status?: string;
  bbox?: DiscoveryBbox;
  limit: number;
  cursorId?: string;
};

export type DiscoveryResponse = {
  items: MapParcelProjection[];
  nextCursor: string | null;
  simulated: true;
  projection: 'land-parcel-map';
};

// Stored row for discovery. organizationId/communeCode are ACL-only and are
// never serialized into the response.
export type MapDiscoveryRow = MapParcelRow & {
  communeCode: string;
};

const DISCOVERY_COLUMNS = Prisma.sql`"id" AS "id", "parcelCode" AS "parcelCode", "mapSheetNumber" AS "mapSheetNumber", "parcelNumber" AS "parcelNumber", "communeCode" AS "communeCode", "status" AS "status", ST_AsGeoJSON("geometry") AS "geometryGeoJson", "updatedAt" AS "updatedAt", "organizationId" AS "organizationId"`;

// Trim/normalize one exact-match identifier filter. Blank values fail closed
// so an empty filter can never widen into an unbounded query.
function optionalFilter(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string' || !value.trim())
    throw new Error('INVALID_REQUEST');
  return value.trim();
}

function parseLimit(value: unknown): number {
  if (value === undefined || value === null) return DISCOVERY_LIMIT_DEFAULT;
  if (typeof value !== 'string' || !value.trim())
    throw new Error('INVALID_REQUEST');
  const limit = Number(value.trim());
  if (!Number.isInteger(limit) || limit < 1 || limit > DISCOVERY_LIMIT_MAX)
    throw new Error('INVALID_REQUEST');
  return limit;
}

// Parse `minLng,minLat,maxLng,maxLat` in WGS84/SRID 4326. The box must satisfy
// min < max on both axes, must not wrap the antimeridian and must stay inside
// the approved CADN extent; anything else fails closed.
function parseBbox(value: unknown): DiscoveryBbox {
  if (typeof value !== 'string') throw new Error('INVALID_REQUEST');
  const parts = value.split(',').map((part) => part.trim());
  if (parts.length !== 4 || parts.some((part) => !part))
    throw new Error('INVALID_REQUEST');
  const numbers = parts.map(Number);
  if (numbers.some((part) => !Number.isFinite(part)))
    throw new Error('INVALID_REQUEST');
  const [minLng, minLat, maxLng, maxLat] = numbers as [
    number,
    number,
    number,
    number,
  ];
  if (!(minLng < maxLng) || !(minLat < maxLat))
    throw new Error('INVALID_REQUEST');
  const [boundMinLng, boundMinLat, boundMaxLng, boundMaxLat] = CADN_BOUNDS;
  if (
    minLng < boundMinLng ||
    minLat < boundMinLat ||
    maxLng > boundMaxLng ||
    maxLat > boundMaxLat
  )
    throw new Error('INVALID_REQUEST');
  return { minLng, minLat, maxLng, maxLat };
}

// Parse the P1 discovery query: exact normalized identifiers combined with
// AND, P1 status subset only, default/max limit, opaque cursor and an optional
// bounded bbox. A query with no scalar filter and no bbox is rejected so the
// route can never dump a whole organization unit.
export function parseDiscoveryQuery(value: unknown): DiscoveryQuery {
  if (typeof value !== 'object' || value === null)
    throw new Error('INVALID_REQUEST');
  const input = value as Record<string, unknown>;
  const parcelCode = optionalFilter(input.parcelCode);
  const mapSheetNumber = optionalFilter(input.mapSheetNumber);
  const parcelNumber = optionalFilter(input.parcelNumber);
  const communeCode = optionalFilter(input.communeCode);
  const status = optionalFilter(input.status);
  if (status !== undefined && !DISCOVERY_STATUSES.includes(status))
    throw new Error('INVALID_REQUEST');
  const bbox = input.bbox === undefined ? undefined : parseBbox(input.bbox);
  const limit = parseLimit(input.limit);
  const cursor = optionalFilter(input.cursor);
  const cursorId = cursor === undefined ? undefined : decodeCursor(cursor);
  if (
    !parcelCode &&
    !mapSheetNumber &&
    !parcelNumber &&
    !communeCode &&
    !status &&
    !bbox
  )
    throw new Error('INVALID_REQUEST');
  return {
    ...(parcelCode ? { parcelCode } : {}),
    ...(mapSheetNumber ? { mapSheetNumber } : {}),
    ...(parcelNumber ? { parcelNumber } : {}),
    ...(communeCode ? { communeCode } : {}),
    ...(status ? { status } : {}),
    ...(bbox ? { bbox } : {}),
    limit,
    ...(cursorId ? { cursorId } : {}),
  };
}

function discoveryEnvelope(bbox: DiscoveryBbox): Prisma.Sql {
  return Prisma.sql`ST_MakeEnvelope(${bbox.minLng}, ${bbox.minLat}, ${bbox.maxLng}, ${bbox.maxLat}, 4326)`;
}

// Shared predicate builder: organization scope, exact scalar filters (AND)
// and the bounded spatial predicate (`&&` plus ST_Intersects). Everything is
// parameterized; no value is ever interpolated into SQL text.
function discoveryConditions(
  organizationId: string,
  query: DiscoveryQuery,
): Prisma.Sql[] {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`"organizationId" = ${organizationId}`,
  ];
  if (query.parcelCode)
    conditions.push(Prisma.sql`"parcelCode" = ${query.parcelCode}`);
  if (query.mapSheetNumber)
    conditions.push(Prisma.sql`"mapSheetNumber" = ${query.mapSheetNumber}`);
  if (query.parcelNumber)
    conditions.push(Prisma.sql`"parcelNumber" = ${query.parcelNumber}`);
  if (query.communeCode)
    conditions.push(Prisma.sql`"communeCode" = ${query.communeCode}`);
  if (query.status) conditions.push(Prisma.sql`"status" = ${query.status}`);
  if (query.bbox) {
    const envelope = discoveryEnvelope(query.bbox);
    conditions.push(Prisma.sql`"geometry" && ${envelope}`);
    conditions.push(Prisma.sql`ST_Intersects("geometry", ${envelope})`);
  }
  return conditions;
}

// Read one bounded page: ORDER BY id ASC with id > cursorId, fetching
// limit + 1 rows so the caller can mint nextCursor without guessing.
export async function findMapDiscoveryRows(
  organizationId: string,
  query: DiscoveryQuery,
  client: LandDbClient = prisma,
): Promise<MapDiscoveryRow[]> {
  const conditions = discoveryConditions(organizationId, query);
  if (query.cursorId) conditions.push(Prisma.sql`"id" > ${query.cursorId}`);
  return client.$queryRaw<MapDiscoveryRow[]>`
    SELECT ${DISCOVERY_COLUMNS} FROM "LandParcel"
    WHERE ${Prisma.join(conditions, ' AND ')}
    ORDER BY "id" ASC LIMIT ${query.limit + 1}`;
}

// Bind the opaque cursor to the current normalized query: the cursor row must
// still exist in the actor scope and still satisfy every supplied filter and
// the bbox. Anything else fails closed so a stale page is never served.
async function assertCursorBound(
  cursorId: string,
  organizationId: string,
  query: DiscoveryQuery,
  client: LandDbClient,
): Promise<void> {
  const rows = await client.$queryRaw<MapDiscoveryRow[]>`
    SELECT ${DISCOVERY_COLUMNS} FROM "LandParcel" WHERE "id" = ${cursorId} LIMIT 1`;
  const row = rows[0];
  if (!row || row.organizationId !== organizationId)
    throw new Error('INVALID_REQUEST');
  if (query.parcelCode && row.parcelCode !== query.parcelCode)
    throw new Error('INVALID_REQUEST');
  if (query.mapSheetNumber && row.mapSheetNumber !== query.mapSheetNumber)
    throw new Error('INVALID_REQUEST');
  if (query.parcelNumber && row.parcelNumber !== query.parcelNumber)
    throw new Error('INVALID_REQUEST');
  if (query.communeCode && row.communeCode !== query.communeCode)
    throw new Error('INVALID_REQUEST');
  if (query.status && row.status !== query.status)
    throw new Error('INVALID_REQUEST');
  if (query.bbox) {
    const envelope = discoveryEnvelope(query.bbox);
    const hits = await client.$queryRaw<{ hit: number }[]>`
      SELECT 1 AS "hit" FROM "LandParcel"
      WHERE "id" = ${cursorId}
        AND "geometry" && ${envelope}
        AND ST_Intersects("geometry", ${envelope})
      LIMIT 1`;
    if (!hits.length) throw new Error('INVALID_REQUEST');
  }
}

// Run the P1 discovery: fail fast on the actor, bind the cursor to the
// normalized query, read one bounded page, re-check the parcel access policy
// for every returned row, then serialize the P0 allowlist only. Geometry that
// cannot be served safely throws and the route maps it to MAP_LAYER_FAILED;
// the page is never silently truncated because nextCursor always signals more.
export async function getLandParcelMapDiscovery(
  actor: IdentityUser | null | undefined,
  rawQuery: unknown,
  client: LandDbClient = prisma,
): Promise<DiscoveryResponse> {
  assertLandActor(actor);
  const query = parseDiscoveryQuery(rawQuery);
  if (query.cursorId)
    await assertCursorBound(
      query.cursorId,
      actor.organizationUnitId,
      query,
      client,
    );
  const rows = await findMapDiscoveryRows(
    actor.organizationUnitId,
    query,
    client,
  );
  const page = rows.slice(0, query.limit);
  for (const row of page) {
    await requireParcelDetailAccess(
      actor,
      { id: row.id, organizationId: row.organizationId },
      client,
    );
  }
  const items = page.map((row) => toLandParcelMapResponse(row).parcel);
  return {
    items,
    nextCursor:
      rows.length > query.limit && page.length > 0
        ? encodeCursor(page[page.length - 1].id)
        : null,
    simulated: true,
    projection: 'land-parcel-map',
  };
}
