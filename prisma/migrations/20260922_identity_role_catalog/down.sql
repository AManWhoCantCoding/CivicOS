-- Reverses 20260922_identity_role_catalog without touching User, Assignment, DomainEvent or AuditEvent history.
INSERT INTO "UserRole" ("userId", "roleId")
SELECT u."id", r."id" FROM "User" u JOIN "Role" r ON r."name" = 'field_officer'
WHERE u."email" = 'captren@civicos.local'
ON CONFLICT DO NOTHING;

DELETE FROM "UserRole"
USING "User" u, "Role" r
WHERE "UserRole"."userId" = u."id"
AND "UserRole"."roleId" = r."id"
AND u."email" = 'captren@civicos.local'
AND r."name" = 'superior_officer'
AND EXISTS (
  SELECT 1 FROM "UserRole" "kept"
  JOIN "Role" "keptRole" ON "keptRole"."id" = "kept"."roleId"
  WHERE "kept"."userId" = u."id" AND "keptRole"."name" = 'field_officer'
);
