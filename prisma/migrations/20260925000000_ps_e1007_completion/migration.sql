-- PS-E1-007 additive fields for establishment scope/risk and finding classification.
ALTER TABLE "Establishment" ADD COLUMN IF NOT EXISTS "risk" TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE "Establishment" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "Establishment" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "InspectionFinding" ADD COLUMN IF NOT EXISTS "severity" TEXT;
ALTER TABLE "InspectionFinding" ADD COLUMN IF NOT EXISTS "category" TEXT;

CREATE INDEX IF NOT EXISTS "Establishment_organizationId_status_idx"
  ON "Establishment"("organizationId", "status");

ALTER TABLE "Establishment"
  DROP CONSTRAINT IF EXISTS "Establishment_risk_allowed";
ALTER TABLE "Establishment"
  ADD CONSTRAINT "Establishment_risk_allowed"
  CHECK ("risk" IN ('low', 'medium', 'high'));
ALTER TABLE "Establishment"
  DROP CONSTRAINT IF EXISTS "Establishment_status_allowed";
ALTER TABLE "Establishment"
  ADD CONSTRAINT "Establishment_status_allowed"
  CHECK ("status" IN ('active', 'archived'));
ALTER TABLE "EnforcementRecommendation"
  DROP CONSTRAINT IF EXISTS "EnforcementRecommendation_status_allowed";
ALTER TABLE "EnforcementRecommendation"
  ADD CONSTRAINT "EnforcementRecommendation_status_allowed"
  CHECK ("status" IN ('pending_approval', 'approved', 'rejected', 'transferred'));
