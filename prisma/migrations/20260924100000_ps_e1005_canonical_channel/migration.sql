-- PS-E1-005 redo: canonical write model persists only sourceChannel.
-- New writes store channel as NULL; legacy channel values remain readable
-- through the domain boundary mapping (in_person -> direct, telephone -> phone).
-- Only the two contract legacy aliases are mapped below; unknown legacy
-- values remain readable through the legacy channel column.

ALTER TABLE "IntakeReport" ALTER COLUMN "channel" DROP NOT NULL;

-- Guard backfill for rows predating the canonical migration.
UPDATE "IntakeReport" SET "sourceChannel" = 'direct'
WHERE "sourceChannel" IS NULL AND "channel" IN ('in_person', 'direct');
UPDATE "IntakeReport" SET "sourceChannel" = 'phone'
WHERE "sourceChannel" IS NULL AND "channel" IN ('telephone', 'phone');
