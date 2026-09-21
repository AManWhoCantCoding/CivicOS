-- PS-E1-007 inspection contract: additive hardening for Establishment, ChecklistTemplate/Item, Inspection, ChecklistResponse, InspectionFinding and EnforcementRecommendation. Safe to re-apply; alters no existing data.
-- Inspection keeps its own templateId plus templateVersion snapshot so later ChecklistTemplate versions never rewrite history.
-- Inspection.result and InspectionFinding.result stay operational (pass/reminder/needs_action) and never become an automatic legal conclusion; EnforcementRecommendation still requires commander Approval.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Inspection_result_allowed') THEN
    ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_result_allowed" CHECK ("result" IS NULL OR "result" IN ('pass', 'reminder', 'needs_action'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Inspection_status_allowed') THEN
    ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_status_allowed" CHECK ("status" IN ('scheduled', 'in_progress', 'completed'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Inspection_templateVersion_positive') THEN
    ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_templateVersion_positive" CHECK ("templateVersion" >= 1);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InspectionFinding_result_allowed') THEN
    ALTER TABLE "InspectionFinding" ADD CONSTRAINT "InspectionFinding_result_allowed" CHECK ("result" IN ('pass', 'reminder', 'needs_action'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EnforcementRecommendation_status_allowed') THEN
    ALTER TABLE "EnforcementRecommendation" ADD CONSTRAINT "EnforcementRecommendation_status_allowed" CHECK ("status" IN ('pending_approval', 'approved', 'rejected'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Inspection_templateId_templateVersion_idx" ON "Inspection"("templateId", "templateVersion");
CREATE INDEX IF NOT EXISTS "ChecklistTemplate_establishmentType_version_active_idx" ON "ChecklistTemplate"("establishmentType", "version");
CREATE INDEX IF NOT EXISTS "InspectionFinding_inspectionId_checklistKey_idx" ON "InspectionFinding"("inspectionId", "checklistKey");
CREATE INDEX IF NOT EXISTS "EnforcementRecommendation_inspectionId_status_idx" ON "EnforcementRecommendation"("inspectionId", "status");
