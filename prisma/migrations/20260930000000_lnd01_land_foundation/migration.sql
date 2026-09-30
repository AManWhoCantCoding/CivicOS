-- LND-01 land foundation: additive PostGIS + eight land tables + role catalog.
-- Safe to re-apply; creates no enum, alters no existing table or data.

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS "LandParty" (
  "id" TEXT NOT NULL,
  "referenceCode" TEXT NOT NULL,
  "partyType" TEXT NOT NULL,
  "displayNameCiphertext" TEXT NOT NULL,
  "identityNumberCiphertext" TEXT,
  "identityNumberIndex" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LandParty_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LandParcel" (
  "id" TEXT NOT NULL,
  "parcelCode" TEXT NOT NULL,
  "mapSheetNumber" TEXT NOT NULL,
  "parcelNumber" TEXT NOT NULL,
  "areaSqm" DECIMAL(14,2) NOT NULL,
  "landUseType" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "communeCode" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "geometry" geometry(Polygon,4326) NOT NULL,
  "nationalRecordRef" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LandParcel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LandChangeApplication" (
  "id" TEXT NOT NULL,
  "applicationCode" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "changeType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'submitted',
  "changePayload" JSONB NOT NULL,
  "createdById" TEXT NOT NULL,
  "idempotencyKey" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LandChangeApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LandRight" (
  "id" TEXT NOT NULL,
  "parcelId" TEXT NOT NULL,
  "partyId" TEXT NOT NULL,
  "rightType" TEXT NOT NULL DEFAULT 'land_use_right',
  "sharePercent" DECIMAL(5,2) NOT NULL DEFAULT 100,
  "status" TEXT NOT NULL DEFAULT 'active',
  "validFrom" TIMESTAMP(3) NOT NULL,
  "validTo" TIMESTAMP(3),
  "sourceApplicationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LandRight_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LandEncumbrance" (
  "id" TEXT NOT NULL,
  "parcelId" TEXT NOT NULL,
  "securedPartyId" TEXT,
  "encumbranceType" TEXT NOT NULL DEFAULT 'mortgage',
  "status" TEXT NOT NULL DEFAULT 'active',
  "externalReference" TEXT,
  "registeredAt" TIMESTAMP(3) NOT NULL,
  "releasedAt" TIMESTAMP(3),
  "sourceApplicationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LandEncumbrance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LandApplicationParty" (
  "applicationId" TEXT NOT NULL,
  "partyId" TEXT NOT NULL,
  "partyRole" TEXT NOT NULL,
  "sharePercent" DECIMAL(5,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LandApplicationParty_pkey" PRIMARY KEY ("applicationId", "partyId", "partyRole")
);

CREATE TABLE IF NOT EXISTS "LandApplicationParcel" (
  "applicationId" TEXT NOT NULL,
  "parcelId" TEXT NOT NULL,
  "parcelRole" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LandApplicationParcel_pkey" PRIMARY KEY ("applicationId", "parcelId", "parcelRole")
);

CREATE TABLE IF NOT EXISTS "LandNationalSync" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "operation" TEXT NOT NULL DEFAULT 'register_change',
  "requestKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "remoteReference" TEXT,
  "requestPayload" JSONB NOT NULL,
  "responsePayload" JSONB,
  "failureCode" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LandNationalSync_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LandRight_parcelId_fkey') THEN
    ALTER TABLE "LandRight" ADD CONSTRAINT "LandRight_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "LandParcel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LandRight_partyId_fkey') THEN
    ALTER TABLE "LandRight" ADD CONSTRAINT "LandRight_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "LandParty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LandEncumbrance_parcelId_fkey') THEN
    ALTER TABLE "LandEncumbrance" ADD CONSTRAINT "LandEncumbrance_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "LandParcel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LandEncumbrance_securedPartyId_fkey') THEN
    ALTER TABLE "LandEncumbrance" ADD CONSTRAINT "LandEncumbrance_securedPartyId_fkey" FOREIGN KEY ("securedPartyId") REFERENCES "LandParty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LandApplicationParty_applicationId_fkey') THEN
    ALTER TABLE "LandApplicationParty" ADD CONSTRAINT "LandApplicationParty_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "LandChangeApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LandApplicationParty_partyId_fkey') THEN
    ALTER TABLE "LandApplicationParty" ADD CONSTRAINT "LandApplicationParty_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "LandParty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LandApplicationParcel_applicationId_fkey') THEN
    ALTER TABLE "LandApplicationParcel" ADD CONSTRAINT "LandApplicationParcel_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "LandChangeApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LandApplicationParcel_parcelId_fkey') THEN
    ALTER TABLE "LandApplicationParcel" ADD CONSTRAINT "LandApplicationParcel_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "LandParcel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LandNationalSync_applicationId_fkey') THEN
    ALTER TABLE "LandNationalSync" ADD CONSTRAINT "LandNationalSync_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "LandChangeApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LandParty_partyType_allowed') THEN
    ALTER TABLE "LandParty" ADD CONSTRAINT "LandParty_partyType_allowed" CHECK ("partyType" IN ('individual', 'organization'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LandParty_status_allowed') THEN
    ALTER TABLE "LandParty" ADD CONSTRAINT "LandParty_status_allowed" CHECK ("status" IN ('active', 'archived'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LandParcel_areaSqm_positive') THEN
    ALTER TABLE "LandParcel" ADD CONSTRAINT "LandParcel_areaSqm_positive" CHECK ("areaSqm" > 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LandParcel_status_allowed') THEN
    ALTER TABLE "LandParcel" ADD CONSTRAINT "LandParcel_status_allowed" CHECK ("status" IN ('proposed', 'active', 'retired'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LandParcel_geometry_valid') THEN
    ALTER TABLE "LandParcel" ADD CONSTRAINT "LandParcel_geometry_valid" CHECK (ST_IsValid("geometry") AND ST_SRID("geometry") = 4326);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LandRight_rightType_allowed') THEN
    ALTER TABLE "LandRight" ADD CONSTRAINT "LandRight_rightType_allowed" CHECK ("rightType" IN ('land_use_right'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LandRight_sharePercent_range') THEN
    ALTER TABLE "LandRight" ADD CONSTRAINT "LandRight_sharePercent_range" CHECK ("sharePercent" > 0 AND "sharePercent" <= 100);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LandRight_status_allowed') THEN
    ALTER TABLE "LandRight" ADD CONSTRAINT "LandRight_status_allowed" CHECK ("status" IN ('active', 'ended'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LandRight_validTo_after_validFrom') THEN
    ALTER TABLE "LandRight" ADD CONSTRAINT "LandRight_validTo_after_validFrom" CHECK ("validTo" IS NULL OR "validTo" > "validFrom");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LandEncumbrance_type_allowed') THEN
    ALTER TABLE "LandEncumbrance" ADD CONSTRAINT "LandEncumbrance_type_allowed" CHECK ("encumbranceType" IN ('mortgage'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LandEncumbrance_status_allowed') THEN
    ALTER TABLE "LandEncumbrance" ADD CONSTRAINT "LandEncumbrance_status_allowed" CHECK ("status" IN ('active', 'released'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LandEncumbrance_releasedAt_consistent') THEN
    ALTER TABLE "LandEncumbrance" ADD CONSTRAINT "LandEncumbrance_releasedAt_consistent" CHECK (("status" = 'active' AND "releasedAt" IS NULL) OR ("status" = 'released' AND "releasedAt" IS NOT NULL));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LandChangeApplication_changeType_allowed') THEN
    ALTER TABLE "LandChangeApplication" ADD CONSTRAINT "LandChangeApplication_changeType_allowed" CHECK ("changeType" IN ('transfer', 'information_update', 'mortgage', 'parcel_split_merge'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LandChangeApplication_status_allowed') THEN
    ALTER TABLE "LandChangeApplication" ADD CONSTRAINT "LandChangeApplication_status_allowed" CHECK ("status" IN ('submitted', 'in_review', 'sync_pending', 'sync_succeeded', 'sync_failed', 'pending_approval', 'rejected', 'completed'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LandChangeApplication_completedAt_consistent') THEN
    ALTER TABLE "LandChangeApplication" ADD CONSTRAINT "LandChangeApplication_completedAt_consistent" CHECK (("status" = 'completed' AND "completedAt" IS NOT NULL) OR ("status" <> 'completed' AND "completedAt" IS NULL));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LandApplicationParty_partyRole_allowed') THEN
    ALTER TABLE "LandApplicationParty" ADD CONSTRAINT "LandApplicationParty_partyRole_allowed" CHECK ("partyRole" IN ('applicant', 'current_holder', 'proposed_holder', 'secured_party', 'representative'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LandApplicationParty_sharePercent_range') THEN
    ALTER TABLE "LandApplicationParty" ADD CONSTRAINT "LandApplicationParty_sharePercent_range" CHECK ("sharePercent" IS NULL OR ("sharePercent" > 0 AND "sharePercent" <= 100));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LandApplicationParcel_parcelRole_allowed') THEN
    ALTER TABLE "LandApplicationParcel" ADD CONSTRAINT "LandApplicationParcel_parcelRole_allowed" CHECK ("parcelRole" IN ('subject', 'source', 'result'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LandNationalSync_operation_allowed') THEN
    ALTER TABLE "LandNationalSync" ADD CONSTRAINT "LandNationalSync_operation_allowed" CHECK ("operation" IN ('register_change'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LandNationalSync_status_allowed') THEN
    ALTER TABLE "LandNationalSync" ADD CONSTRAINT "LandNationalSync_status_allowed" CHECK ("status" IN ('pending', 'succeeded', 'failed'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LandNationalSync_attempts_non_negative') THEN
    ALTER TABLE "LandNationalSync" ADD CONSTRAINT "LandNationalSync_attempts_non_negative" CHECK ("attempts" >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LandNationalSync_completedAt_consistent') THEN
    ALTER TABLE "LandNationalSync" ADD CONSTRAINT "LandNationalSync_completedAt_consistent" CHECK (("status" = 'pending' AND "completedAt" IS NULL) OR ("status" IN ('succeeded', 'failed') AND "completedAt" IS NOT NULL));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "LandParty_referenceCode_key" ON "LandParty"("referenceCode");
CREATE UNIQUE INDEX IF NOT EXISTS "LandParty_identityNumberIndex_key" ON "LandParty"("identityNumberIndex");
CREATE UNIQUE INDEX IF NOT EXISTS "LandParcel_parcelCode_key" ON "LandParcel"("parcelCode");
CREATE UNIQUE INDEX IF NOT EXISTS "LandParcel_organizationId_mapSheetNumber_parcelNumber_key" ON "LandParcel"("organizationId", "mapSheetNumber", "parcelNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "LandChangeApplication_applicationCode_key" ON "LandChangeApplication"("applicationCode");
CREATE UNIQUE INDEX IF NOT EXISTS "LandChangeApplication_idempotencyKey_key" ON "LandChangeApplication"("idempotencyKey");
CREATE UNIQUE INDEX IF NOT EXISTS "LandNationalSync_requestKey_key" ON "LandNationalSync"("requestKey");
CREATE UNIQUE INDEX IF NOT EXISTS "LandNationalSync_applicationId_operation_key" ON "LandNationalSync"("applicationId", "operation");
CREATE INDEX IF NOT EXISTS "LandParty_partyType_status_idx" ON "LandParty"("partyType", "status");
CREATE INDEX IF NOT EXISTS "LandParcel_mapSheetNumber_parcelNumber_organizationId_idx" ON "LandParcel"("mapSheetNumber", "parcelNumber", "organizationId");
CREATE INDEX IF NOT EXISTS "LandParcel_organizationId_status_idx" ON "LandParcel"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "LandParcel_communeCode_status_idx" ON "LandParcel"("communeCode", "status");
CREATE INDEX IF NOT EXISTS "LandParcel_geometry_gist_idx" ON "LandParcel" USING GIST ("geometry");
CREATE INDEX IF NOT EXISTS "LandRight_parcelId_status_idx" ON "LandRight"("parcelId", "status");
CREATE INDEX IF NOT EXISTS "LandRight_partyId_status_idx" ON "LandRight"("partyId", "status");
CREATE INDEX IF NOT EXISTS "LandEncumbrance_parcelId_status_idx" ON "LandEncumbrance"("parcelId", "status");
CREATE INDEX IF NOT EXISTS "LandChangeApplication_organizationId_status_updatedAt_idx" ON "LandChangeApplication"("organizationId", "status", "updatedAt");
CREATE INDEX IF NOT EXISTS "LandChangeApplication_changeType_status_idx" ON "LandChangeApplication"("changeType", "status");
CREATE INDEX IF NOT EXISTS "LandChangeApplication_createdById_createdAt_idx" ON "LandChangeApplication"("createdById", "createdAt");
CREATE INDEX IF NOT EXISTS "LandApplicationParty_partyId_partyRole_idx" ON "LandApplicationParty"("partyId", "partyRole");
CREATE INDEX IF NOT EXISTS "LandApplicationParcel_parcelId_parcelRole_idx" ON "LandApplicationParcel"("parcelId", "parcelRole");
CREATE INDEX IF NOT EXISTS "LandNationalSync_applicationId_status_idx" ON "LandNationalSync"("applicationId", "status");
CREATE INDEX IF NOT EXISTS "LandNationalSync_status_updatedAt_idx" ON "LandNationalSync"("status", "updatedAt");

-- Upserts the three land roles without deleting existing Role or UserRole rows.
INSERT INTO "Role" ("id", "name", "description") VALUES (gen_random_uuid()::text, 'land_officer', 'Approved role: land_officer') ON CONFLICT ("name") DO UPDATE SET "description" = EXCLUDED."description";
INSERT INTO "Role" ("id", "name", "description") VALUES (gen_random_uuid()::text, 'commune_leader', 'Approved role: commune_leader') ON CONFLICT ("name") DO UPDATE SET "description" = EXCLUDED."description";
INSERT INTO "Role" ("id", "name", "description") VALUES (gen_random_uuid()::text, 'citizen', 'Approved role: citizen') ON CONFLICT ("name") DO UPDATE SET "description" = EXCLUDED."description";
