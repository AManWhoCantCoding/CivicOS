import { prisma } from '@/lib/prisma';
import type { IdentityUser } from '@/modules/identity';

import {
  auditLandEvent,
  requireParcelDetailAccess,
  assertLandActor,
  type LandDbClient,
} from './access';
import { findParcelById } from './parcel-repository';
import { toParcelResponse, type ParcelResponse } from './parcel-service';
import {
  toEncumbranceSummary,
  toRightSummary,
  type LandEncumbranceSummary,
  type LandRightSummary,
} from './projection-mappers';

// Locked parcel detail projection: { parcel, rights, encumbrances }.
// api-contract GET /api/land/parcels/{parcelId} lines 197-253; full history
// for rights/encumbrances, no pagination, GET writes an internal read audit
// but never mutates domain rows (DR-22). No party decrypt, no ciphertext.
export type ParcelDetailResponse = {
  parcel: ParcelResponse;
  rights: LandRightSummary[];
  encumbrances: LandEncumbranceSummary[];
};

// Read one parcel with its right/encumbrance history in scope.
// Fail-closed: unknown parcel -> PARCEL_NOT_FOUND; out-of-scope ->
// FORBIDDEN without data; officer without related assignment ->
// ASSIGNMENT_REQUIRED. Audit uses the existing land boundary (DR-19).
export async function getParcelDetail(
  parcelId: string,
  actor: IdentityUser,
  client: LandDbClient = prisma,
): Promise<ParcelDetailResponse> {
  if (!parcelId?.trim()) throw new Error('INVALID_REQUEST');
  assertLandActor(actor);
  const row = await findParcelById(parcelId, client);
  if (!row) throw new Error('PARCEL_NOT_FOUND');
  await requireParcelDetailAccess(
    actor,
    { id: row.id, organizationId: row.organizationId },
    client,
  );

  const result = await prisma.$transaction(async (tx) => {
    const rightRows = await tx.landRight.findMany({
      where: { parcelId: row.id },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    const encumbranceRows = await tx.landEncumbrance.findMany({
      where: { parcelId: row.id },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    await auditLandEvent(
      actor,
      {
        resourceType: 'LandParcel',
        resourceId: row.id,
        operation: 'land.parcel.viewed',
        metadata: {
          rights: rightRows.length,
          encumbrances: encumbranceRows.length,
        },
      },
      tx,
    );
    return { rightRows, encumbranceRows };
  });

  return {
    parcel: toParcelResponse(row),
    rights: result.rightRows.map((item) =>
      toRightSummary({
        id: item.id,
        parcelId: item.parcelId,
        partyId: item.partyId,
        rightType: item.rightType,
        sharePercent: item.sharePercent,
        status: item.status,
        validFrom: item.validFrom,
        validTo: item.validTo,
        sourceApplicationId: item.sourceApplicationId,
      }),
    ),
    encumbrances: result.encumbranceRows.map((item) =>
      toEncumbranceSummary({
        id: item.id,
        parcelId: item.parcelId,
        securedPartyId: item.securedPartyId,
        encumbranceType: item.encumbranceType,
        status: item.status,
        externalReference: item.externalReference,
        registeredAt: item.registeredAt,
        releasedAt: item.releasedAt,
        sourceApplicationId: item.sourceApplicationId,
      }),
    ),
  };
}
