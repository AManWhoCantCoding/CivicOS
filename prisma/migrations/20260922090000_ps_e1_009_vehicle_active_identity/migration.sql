-- Active identity is an effective-dated interval. Two active intervals may coexist
-- only when they do not overlap; historical and future windows remain valid.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE OR REPLACE FUNCTION "civicos_vehicle_effective_window"(
  timestamp,
  timestamp
) RETURNS tsrange
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN $2 IS NULL THEN tsrange($1, 'infinity'::timestamp, '[)')
    ELSE tsrange($1, $2, '[)')
  END
$$;

ALTER TABLE "SuspiciousVehicleEntry"
  ADD CONSTRAINT "SuspiciousVehicleEntry_active_plate_window_excl"
  EXCLUDE USING gist (
    "plate" WITH =,
    "civicos_vehicle_effective_window"("validFrom", "validUntil") WITH &&
  ) WHERE ("status" = 'active');

DROP INDEX IF EXISTS "SuspiciousVehicleEntry_plate_active_unique";
