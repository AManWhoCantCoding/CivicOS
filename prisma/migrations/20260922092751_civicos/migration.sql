-- DropIndex
DROP INDEX IF EXISTS "ChecklistTemplate_establishmentType_version_active_idx";

-- DropIndex
DROP INDEX IF EXISTS "Inspection_templateId_templateVersion_idx";

-- DropIndex
DROP INDEX IF EXISTS "InspectionFinding_inspectionId_checklistKey_idx";

-- DropIndex
DROP INDEX IF EXISTS "SuspiciousVehicleEntry_status_validUntil_idx";

-- DropIndex
DROP INDEX IF EXISTS "VehicleObservation_escalatedAt_idx";

-- DropIndex
DROP INDEX IF EXISTS "VehicleObservation_matchedRegistryId_idx";
