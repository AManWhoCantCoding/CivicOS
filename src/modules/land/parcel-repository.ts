import { randomBytes } from 'node:crypto';

import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';

import type { LandDbClient } from './access';

// Stored LandParcel row with geometry as GeoJSON text.
export type ParcelRow = {
  id: string;
  parcelCode: string;
  mapSheetNumber: string;
  parcelNumber: string;
  areaSqm: unknown;
  landUseType: string;
  address: string;
  communeCode: string;
  organizationId: string;
  geometryGeoJson: string;
  nationalRecordRef: string | null;
  status: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

// Insert input for scalar parcel columns.
export type InsertParcelInput = {
  parcelCode: string;
  mapSheetNumber: string;
  parcelNumber: string;
  areaSqm: string;
  landUseType: string;
  address: string;
  communeCode: string;
  organizationId: string;
};

const PARCEL_COLUMNS = Prisma.sql`"id" AS "id", "parcelCode" AS "parcelCode", "mapSheetNumber" AS "mapSheetNumber", "parcelNumber" AS "parcelNumber", "areaSqm" AS "areaSqm", "landUseType" AS "landUseType", "address" AS "address", "communeCode" AS "communeCode", "organizationId" AS "organizationId", ST_AsGeoJSON("geometry") AS "geometryGeoJson", "nationalRecordRef" AS "nationalRecordRef", "status" AS "status", "version" AS "version", "createdAt" AS "createdAt", "updatedAt" AS "updatedAt"`;

// Create a Cuid contract id without new deps.
function createParcelId(): string {
  return `c${randomBytes(12).toString('hex')}`;
}

// Read one parcel row by id with geometry as GeoJSON.
export async function findParcelById(
  id: string,
  client: LandDbClient = prisma,
): Promise<ParcelRow | null> {
  const rows = await client.$queryRaw<ParcelRow[]>`
    SELECT ${PARCEL_COLUMNS} FROM "LandParcel" WHERE "id" = ${id} LIMIT 1`;
  return rows[0] ?? null;
}

// List parcel rows in an organization with cursor pagination.
export async function findParcelsByOrganization(
  organizationId: string,
  filters: { status?: string; communeCode?: string; parcelCode?: string } = {},
  paging: { limit: number; cursorId?: string } = { limit: 50 },
  client: LandDbClient = prisma,
): Promise<{ rows: ParcelRow[]; nextCursor: string | null }> {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`"organizationId" = ${organizationId}`,
  ];
  if (filters.status) conditions.push(Prisma.sql`"status" = ${filters.status}`);
  if (filters.communeCode)
    conditions.push(Prisma.sql`"communeCode" = ${filters.communeCode}`);
  if (filters.parcelCode)
    conditions.push(Prisma.sql`"parcelCode" = ${filters.parcelCode}`);
  if (paging.cursorId) conditions.push(Prisma.sql`"id" > ${paging.cursorId}`);
  const rows = await client.$queryRaw<ParcelRow[]>`
    SELECT ${PARCEL_COLUMNS} FROM "LandParcel"
    WHERE ${Prisma.join(conditions, ' AND ')}
    ORDER BY "id" ASC LIMIT ${paging.limit + 1}`;
  const page = rows.slice(0, paging.limit);
  return {
    rows: page,
    nextCursor: rows.length > paging.limit ? page[page.length - 1].id : null,
  };
}

// Insert a parcel row through parameterized PostGIS SQL.
export async function insertParcel(
  input: InsertParcelInput,
  geometryJson: string,
  client: LandDbClient = prisma,
): Promise<ParcelRow> {
  try {
    const id = createParcelId();
    const created = await client.$queryRaw<Array<{ id: string }>>`
      INSERT INTO "LandParcel"
        ("id", "parcelCode", "mapSheetNumber", "parcelNumber", "areaSqm",
         "landUseType", "address", "communeCode", "organizationId",
         "geometry", "status", "version", "createdAt", "updatedAt")
      VALUES (${id}, ${input.parcelCode}, ${input.mapSheetNumber},
        ${input.parcelNumber}, ${input.areaSqm}::numeric,
        ${input.landUseType}, ${input.address}, ${input.communeCode},
        ${input.organizationId},
        ST_SetSRID(ST_GeomFromGeoJSON(${geometryJson}), 4326),
        'active', 1, NOW(), NOW())
      RETURNING "id" AS "id"`;
    const row = await findParcelById(created[0]?.id ?? '', client);
    if (!row) throw new Error('INVALID_REQUEST');
    return row;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') throw new Error('DUPLICATE_CODE');
      if (error.code === 'P2010') {
        const detail = String(
          (error.meta as { message?: unknown } | undefined)?.message ?? '',
        );
        if (
          detail.includes('duplicate key') ||
          detail.includes('already exists') ||
          detail.includes('23505')
        )
          throw new Error('DUPLICATE_CODE');
        if (detail.includes('check constraint') || detail.includes('23514'))
          throw new Error('GEOMETRY_INVALID');
      }
    }
    throw error;
  }
}
