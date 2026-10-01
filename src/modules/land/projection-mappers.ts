// Locked LandRight/LandEncumbrance summary mappers for parcel detail.
// Field/nullable/status contract: api-contract.md LandRightSummary and
// LandEncumbranceSummary (lines 48-53) sourced from data-model.md:84-118.
// No party decrypt, no ciphertext, no mutation fields (DR-03, DR-22).
import { toDecimalString } from './parcel-service';

export type LandRightSummary = {
  id: string;
  parcelId: string;
  partyId: string;
  rightType: string;
  sharePercent: string;
  status: string;
  validFrom: string;
  validTo: string | null;
  sourceApplicationId: string | null;
};

export type LandEncumbranceSummary = {
  id: string;
  parcelId: string;
  securedPartyId: string | null;
  encumbranceType: string;
  status: string;
  externalReference: string | null;
  registeredAt: string;
  releasedAt: string | null;
  sourceApplicationId: string;
};

type RightRowInput = {
  id: string;
  parcelId: string;
  partyId: string;
  rightType: string;
  sharePercent: unknown;
  status: string;
  validFrom: Date;
  validTo: Date | null;
  sourceApplicationId: string | null;
};

type EncumbranceRowInput = {
  id: string;
  parcelId: string;
  securedPartyId: string | null;
  encumbranceType: string;
  status: string;
  externalReference: string | null;
  registeredAt: Date;
  releasedAt: Date | null;
  sourceApplicationId: string;
};

// Map a stored LandRight row to the locked summary projection.
export function toRightSummary(row: RightRowInput): LandRightSummary {
  return {
    id: row.id,
    parcelId: row.parcelId,
    partyId: row.partyId,
    rightType: row.rightType,
    sharePercent: toDecimalString(row.sharePercent),
    status: row.status,
    validFrom: row.validFrom.toISOString(),
    validTo: row.validTo ? row.validTo.toISOString() : null,
    sourceApplicationId: row.sourceApplicationId,
  };
}

// Map a stored LandEncumbrance row to the locked summary projection.
export function toEncumbranceSummary(
  row: EncumbranceRowInput,
): LandEncumbranceSummary {
  return {
    id: row.id,
    parcelId: row.parcelId,
    securedPartyId: row.securedPartyId,
    encumbranceType: row.encumbranceType,
    status: row.status,
    externalReference: row.externalReference,
    registeredAt: row.registeredAt.toISOString(),
    releasedAt: row.releasedAt ? row.releasedAt.toISOString() : null,
    sourceApplicationId: row.sourceApplicationId,
  };
}
