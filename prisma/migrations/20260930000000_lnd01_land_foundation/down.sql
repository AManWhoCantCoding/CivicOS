-- Reverses 20260930000000_lnd01_land_foundation without touching User, Assignment, EventRecord or AuditEvent history.
DELETE FROM "Role"
WHERE "name" IN ('land_officer', 'commune_leader', 'citizen')
AND NOT EXISTS (
  SELECT 1 FROM "UserRole"
  WHERE "UserRole"."roleId" = "Role"."id"
);

DROP TABLE IF EXISTS "LandNationalSync";
DROP TABLE IF EXISTS "LandApplicationParcel";
DROP TABLE IF EXISTS "LandApplicationParty";
DROP TABLE IF EXISTS "LandEncumbrance";
DROP TABLE IF EXISTS "LandRight";
DROP TABLE IF EXISTS "LandChangeApplication";
DROP TABLE IF EXISTS "LandParcel";
DROP TABLE IF EXISTS "LandParty";
