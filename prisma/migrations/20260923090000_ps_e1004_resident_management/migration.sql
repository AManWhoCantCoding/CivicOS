-- PS-E1-004 resident management: additive tables for Subject, SubjectManagementRecord, SubjectManagementActivity and ResidentMonthlyReport. Safe to re-apply; creates no enums and alters no existing data.

CREATE TABLE IF NOT EXISTS "Subject" (
  "id" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "subjectType" TEXT NOT NULL,
  "sensitiveProfile" TEXT,
  "sensitiveIndex" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "latitude" DECIMAL(65,30),
  "longitude" DECIMAL(65,30),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SubjectManagementRecord" (
  "id" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "riskLevel" TEXT NOT NULL DEFAULT 'normal',
  "status" TEXT NOT NULL DEFAULT 'open',
  "assignedOrganizationId" TEXT,
  "sourceOrganizationId" TEXT,
  "nextCheckAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SubjectManagementRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SubjectManagementActivity" (
  "id" TEXT NOT NULL,
  "recordId" TEXT NOT NULL,
  "activityType" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "content" TEXT NOT NULL,
  "evaluation" TEXT,
  "latitude" DECIMAL(65,30),
  "longitude" DECIMAL(65,30),
  "actorId" TEXT,
  "assignmentId" TEXT,
  "evidenceIds" JSONB NOT NULL DEFAULT '[]',
  "idempotencyKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubjectManagementActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ResidentMonthlyReport" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "sourceRecordIds" JSONB NOT NULL DEFAULT '[]',
  "aggregateCounts" JSONB NOT NULL DEFAULT '{}',
  "snapshotPayload" JSONB,
  "snapshotHash" TEXT,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "sendTargetId" TEXT,
  "idempotencyKey" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ResidentMonthlyReport_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SubjectManagementRecord_subjectId_fkey') THEN
    ALTER TABLE "SubjectManagementRecord" ADD CONSTRAINT "SubjectManagementRecord_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SubjectManagementActivity_recordId_fkey') THEN
    ALTER TABLE "SubjectManagementActivity" ADD CONSTRAINT "SubjectManagementActivity_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "SubjectManagementRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Subject_subjectType_allowed') THEN
    ALTER TABLE "Subject" ADD CONSTRAINT "Subject_subjectType_allowed" CHECK ("subjectType" IN ('temporary_resident', 'foreign_resident', 'reintegration'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SubjectManagementRecord_purpose_allowed') THEN
    ALTER TABLE "SubjectManagementRecord" ADD CONSTRAINT "SubjectManagementRecord_purpose_allowed" CHECK ("purpose" IN ('temporary_resident', 'foreign_resident', 'reintegration'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "SubjectManagementActivity_idempotencyKey_key" ON "SubjectManagementActivity"("idempotencyKey");
CREATE UNIQUE INDEX IF NOT EXISTS "ResidentMonthlyReport_idempotencyKey_key" ON "ResidentMonthlyReport"("idempotencyKey");
CREATE UNIQUE INDEX IF NOT EXISTS "ResidentMonthlyReport_organizationId_period_key" ON "ResidentMonthlyReport"("organizationId", "period");
CREATE INDEX IF NOT EXISTS "Subject_subjectType_status_idx" ON "Subject"("subjectType", "status");
CREATE INDEX IF NOT EXISTS "SubjectManagementRecord_subjectId_status_idx" ON "SubjectManagementRecord"("subjectId", "status");
CREATE INDEX IF NOT EXISTS "SubjectManagementRecord_assignedOrganizationId_status_idx" ON "SubjectManagementRecord"("assignedOrganizationId", "status");
CREATE INDEX IF NOT EXISTS "SubjectManagementActivity_recordId_occurredAt_idx" ON "SubjectManagementActivity"("recordId", "occurredAt");
CREATE INDEX IF NOT EXISTS "ResidentMonthlyReport_organizationId_status_idx" ON "ResidentMonthlyReport"("organizationId", "status");
