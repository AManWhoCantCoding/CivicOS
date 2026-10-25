import { prisma } from '@/lib/prisma';
import { randomUUID } from 'node:crypto';
import type { IdentityUser } from '@/modules/identity';
import { appendEvent } from '@/modules/eventing';

import { assertLandActor, auditLandEvent } from './access';
import {
  fromGeometryJson,
  toGeometryParam,
  validateParcelPolygon,
  type PolygonGeometry,
} from './parcel-geometry';
import { findParcelsByOrganization, insertParcel } from './parcel-repository';
import type { ParcelRow } from './parcel-repository';
import { decodeCursor, encodeCursor, isDecimalString } from './schemas';
import type { LandListQuery, ParcelInput } from './schemas';

// Locked Parcel response shape with internal geometry.
export type ParcelResponse = {
  id: string;
  parcelCode: string;
  mapSheetNumber: string;
  parcelNumber: string;
  areaSqm: string;
  landUseType: string;
  address: string;
  communeCode: string;
  organizationId: string;
  geometry: PolygonGeometry;
  nationalRecordRef: string | null;
  status: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

// Normalize database numeric output to DecimalString.
export function toDecimalString(value: unknown): string {
  const text =
    typeof value === 'string'
      ? value
      : String((value as { toString(): string }).toString());
  const numeric = Number(text);
  if (!Number.isFinite(numeric)) throw new Error('INVALID_REQUEST');
  return numeric.toFixed(2);
}

// Map a stored row to the locked Parcel response.
export function toParcelResponse(row: ParcelRow): ParcelResponse {
  return {
    id: row.id,
    parcelCode: row.parcelCode,
    mapSheetNumber: row.mapSheetNumber,
    parcelNumber: row.parcelNumber,
    areaSqm: toDecimalString(row.areaSqm),
    landUseType: row.landUseType,
    address: row.address,
    communeCode: row.communeCode,
    organizationId: row.organizationId,
    geometry: fromGeometryJson(row.geometryGeoJson),
    nationalRecordRef: row.nationalRecordRef,
    status: row.status,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// Create a parcel with validated Polygon at version 1.
// Domain insert and audit share one transaction: audit failure rolls back (DR-19).
export async function createParcel(
  input: ParcelInput,
  actor: IdentityUser,
): Promise<ParcelResponse> {
  assertLandActor(actor);
  if (!isDecimalString(input.areaSqm) || Number(input.areaSqm) <= 0)
    throw new Error('INVALID_REQUEST');
  validateParcelPolygon(input.geometry);
  const row = await prisma.$transaction(async (tx) => {
    const created = await insertParcel(
      {
        parcelCode: input.parcelCode,
        mapSheetNumber: input.mapSheetNumber,
        parcelNumber: input.parcelNumber,
        areaSqm: input.areaSqm,
        landUseType: input.landUseType,
        address: input.address,
        communeCode: input.communeCode,
        organizationId: actor.organizationUnitId,
      },
      toGeometryParam(input.geometry),
      tx,
    );
    await appendEvent(tx, {
      eventId: randomUUID(),
      eventType: 'LandParcelCreated',
      eventVersion: 1,
      aggregateType: 'LandParcel',
      aggregateId: created.id,
      aggregateVersion: 1,
      occurredAt: created.createdAt,
      actor: {
        id: actor.id,
        name: actor.name,
        role: actor.roles[0],
        organizationId: actor.organizationUnitId,
      },
      payload: {
        parcelCode: created.parcelCode,
        organizationId: created.organizationId,
        status: created.status,
        version: created.version,
      },
      metadata: {},
    });
    await auditLandEvent(
      actor,
      {
        resourceType: 'LandParcel',
        resourceId: created.id,
        operation: 'land.parcel.created',
        metadata: { parcelCode: created.parcelCode },
      },
      tx,
    );
    return created;
  });
  return toParcelResponse(row);
}

// List parcels scoped to the actor organization.
export async function listParcels(
  query: LandListQuery,
  actor: IdentityUser,
): Promise<{ items: ParcelResponse[]; nextCursor: string | null }> {
  assertLandActor(actor);
  const { rows, nextCursor } = await prisma.$transaction(async (tx) => {
    const found = await findParcelsByOrganization(
      actor.organizationUnitId,
      {
        ...(query.status ? { status: query.status } : {}),
        ...(query.communeCode ? { communeCode: query.communeCode } : {}),
        ...(query.parcelCode ? { parcelCode: query.parcelCode } : {}),
      },
      {
        limit: query.limit,
        ...(query.cursor ? { cursorId: decodeCursor(query.cursor) } : {}),
      },
      tx,
    );
    await auditLandEvent(
      actor,
      {
        resourceType: 'LandParcel',
        resourceId: '*',
        operation: 'land.parcel.listed',
        metadata: { count: found.rows.length },
      },
      tx,
    );
    return found;
  });
  const items = rows.map((row) => toParcelResponse(row));
  return { items, nextCursor: nextCursor ? encodeCursor(nextCursor) : null };
}
