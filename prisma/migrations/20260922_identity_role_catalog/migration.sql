-- Additive, reversible data migration for the approved identity role catalog.
-- Upserts the eight runtime roles without deleting User, Assignment, DomainEvent or AuditEvent history.
INSERT INTO "Role" ("id", "name", "description") VALUES (gen_random_uuid()::text, 'commander', 'Approved role: commander') ON CONFLICT ("name") DO UPDATE SET "description" = EXCLUDED."description";
INSERT INTO "Role" ("id", "name", "description") VALUES (gen_random_uuid()::text, 'duty_officer', 'Approved role: duty_officer') ON CONFLICT ("name") DO UPDATE SET "description" = EXCLUDED."description";
INSERT INTO "Role" ("id", "name", "description") VALUES (gen_random_uuid()::text, 'field_officer', 'Approved role: field_officer') ON CONFLICT ("name") DO UPDATE SET "description" = EXCLUDED."description";
INSERT INTO "Role" ("id", "name", "description") VALUES (gen_random_uuid()::text, 'office_officer', 'Approved role: office_officer') ON CONFLICT ("name") DO UPDATE SET "description" = EXCLUDED."description";
INSERT INTO "Role" ("id", "name", "description") VALUES (gen_random_uuid()::text, 'village_officer', 'Approved role: village_officer') ON CONFLICT ("name") DO UPDATE SET "description" = EXCLUDED."description";
INSERT INTO "Role" ("id", "name", "description") VALUES (gen_random_uuid()::text, 'superior_officer', 'Approved role: superior_officer') ON CONFLICT ("name") DO UPDATE SET "description" = EXCLUDED."description";
INSERT INTO "Role" ("id", "name", "description") VALUES (gen_random_uuid()::text, 'superior_commander', 'Approved role: superior_commander') ON CONFLICT ("name") DO UPDATE SET "description" = EXCLUDED."description";
INSERT INTO "Role" ("id", "name", "description") VALUES (gen_random_uuid()::text, 'system_operator', 'Approved role: system_operator for health/worker/observability only') ON CONFLICT ("name") DO UPDATE SET "description" = EXCLUDED."description";

-- Maps the legacy superior account to superior_officer, preserving the User row.
INSERT INTO "UserRole" ("userId", "roleId")
SELECT u."id", r."id" FROM "User" u JOIN "Role" r ON r."name" = 'superior_officer'
WHERE u."email" = 'captren@civicos.local'
ON CONFLICT DO NOTHING;

-- Drops only the stale field_officer link for captren once the superior link exists.
DELETE FROM "UserRole"
USING "User" u, "Role" r
WHERE "UserRole"."userId" = u."id"
AND "UserRole"."roleId" = r."id"
AND u."email" = 'captren@civicos.local'
AND r."name" = 'field_officer'
AND EXISTS (
  SELECT 1 FROM "UserRole" "kept"
  JOIN "Role" "keptRole" ON "keptRole"."id" = "kept"."roleId"
  WHERE "kept"."userId" = u."id" AND "keptRole"."name" = 'superior_officer'
);
