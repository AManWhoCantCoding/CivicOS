-- PS-E1-009 slices 4-7: explicit owner lookup on VehicleVerification.
-- Additive only; nullable because the existing workflow permits verification
-- without a lookup. Safe to re-apply; alters no existing data.

ALTER TABLE "VehicleVerification" ADD COLUMN IF NOT EXISTS "ownerLookup" TEXT;
