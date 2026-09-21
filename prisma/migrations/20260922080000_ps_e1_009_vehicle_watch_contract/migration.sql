-- PS-E1-009 vehicle watch contract: additive hardening for SuspiciousVehicleEntry, VehicleObservation and VehicleVerification. Safe to re-apply; alters no existing data.
-- SuspiciousVehicleRegistry owns entries with source, reason, active validity window and status; VehicleObservation owns one real-world sighting.
-- A registry match is only a suggestion (match_suggested) and requires explicit User confirmation before verification or escalation; a match never becomes a legal or operational conclusion by itself.
-- Plates are stored normalized (upper-case, no spaces/dots/dashes); Evidence stays referenced by resourceType/resourceId via evidenceIds and Assignment scopes VehicleObservation access; escalation is projected from VehicleEscalated events.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SuspiciousVehicleEntry_status_allowed') THEN
    ALTER TABLE "SuspiciousVehicleEntry" ADD CONSTRAINT "SuspiciousVehicleEntry_status_allowed" CHECK ("status" IN ('active', 'expired', 'revoked'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SuspiciousVehicleEntry_validity_window') THEN
    ALTER TABLE "SuspiciousVehicleEntry" ADD CONSTRAINT "SuspiciousVehicleEntry_validity_window" CHECK ("validUntil" IS NULL OR "validUntil" > "validFrom");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VehicleObservation_status_allowed') THEN
    ALTER TABLE "VehicleObservation" ADD CONSTRAINT "VehicleObservation_status_allowed" CHECK ("status" IN ('recorded', 'match_suggested', 'match_confirmed', 'verified', 'escalated'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VehicleVerification_result_nonempty') THEN
    ALTER TABLE "VehicleVerification" ADD CONSTRAINT "VehicleVerification_result_nonempty" CHECK (char_length("result") > 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "VehicleObservation_matchedRegistryId_idx" ON "VehicleObservation"("matchedRegistryId");
CREATE INDEX IF NOT EXISTS "VehicleObservation_escalatedAt_idx" ON "VehicleObservation"("escalatedAt");
CREATE INDEX IF NOT EXISTS "SuspiciousVehicleEntry_status_validUntil_idx" ON "SuspiciousVehicleEntry"("status", "validUntil");
