-- PS-E1-005 intake report lifecycle: canonical sourceChannel, intake status,
-- classification/verification/result notes, transfer target, versioning and
-- organization scope. Additive only; legacy channel values keep reading through
-- the domain boundary mapping (in_person -> direct, telephone -> phone).

ALTER TABLE "IntakeReport" ADD COLUMN IF NOT EXISTS "sourceChannel" TEXT;
ALTER TABLE "IntakeReport" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'RECEIVED';
ALTER TABLE "IntakeReport" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "IntakeReport" ADD COLUMN IF NOT EXISTS "classification" TEXT;
ALTER TABLE "IntakeReport" ADD COLUMN IF NOT EXISTS "verificationNote" TEXT;
ALTER TABLE "IntakeReport" ADD COLUMN IF NOT EXISTS "verificationResult" TEXT;
ALTER TABLE "IntakeReport" ADD COLUMN IF NOT EXISTS "processedNote" TEXT;
ALTER TABLE "IntakeReport" ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP(3);
ALTER TABLE "IntakeReport" ADD COLUMN IF NOT EXISTS "confirmedById" TEXT;
ALTER TABLE "IntakeReport" ADD COLUMN IF NOT EXISTS "transferToId" TEXT;
ALTER TABLE "IntakeReport" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "IntakeReport" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill canonical sourceChannel from legacy channel values.
UPDATE "IntakeReport" SET "sourceChannel" = 'direct'
WHERE "sourceChannel" IS NULL AND "channel" IN ('in_person', 'direct');
UPDATE "IntakeReport" SET "sourceChannel" = 'phone'
WHERE "sourceChannel" IS NULL AND "channel" IN ('telephone', 'phone');
-- Unknown legacy values remain nullable and are rejected on new writes.

-- Incident rows always come from an explicit convert; keep the link optional.
ALTER TABLE "Incident" ALTER COLUMN "intakeReportId" DROP NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'IntakeReport_status_allowed') THEN
    ALTER TABLE "IntakeReport" ADD CONSTRAINT "IntakeReport_status_allowed" CHECK ("status" IN ('RECEIVED', 'VERIFIED', 'PROCESSED', 'CLOSED', 'REJECTED'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'IntakeReport_sourceChannel_allowed') THEN
    ALTER TABLE "IntakeReport" ADD CONSTRAINT "IntakeReport_sourceChannel_allowed" CHECK ("sourceChannel" IN ('direct', 'phone', 'app', 'district_transfer'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "IntakeReport_status_receivedAt_idx" ON "IntakeReport"("status", "receivedAt");
CREATE INDEX IF NOT EXISTS "IntakeReport_organizationId_status_idx" ON "IntakeReport"("organizationId", "status");

CREATE TABLE IF NOT EXISTS "IntakeCommand" (
  "id" TEXT NOT NULL,
  "reportId" TEXT NOT NULL,
  "command" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "response" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IntakeCommand_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "IntakeCommand_reportId_command_idempotencyKey_key"
  ON "IntakeCommand"("reportId", "command", "idempotencyKey");
CREATE INDEX IF NOT EXISTS "IntakeCommand_reportId_command_idx"
  ON "IntakeCommand"("reportId", "command");
