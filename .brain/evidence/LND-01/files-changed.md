# Files changed — LND-01

- **Lane:** full (ticket); verification gate thực thi theo ticket-scope đã được người dùng chốt.
- **Agent code:** Developer; **evidence/review:** Mentor.
- **Kết quả:** targeted format, Prisma validate, migration/schema/DB tests và scope check đều PASS; không có file ngoài scope LND-01 trong diff code.
- **Commit hash:** pending final commit.

## Code trong phạm vi ticket

- `prisma/schema.prisma` — 8 model land, PostGIS geometry, relations và `Restrict`.
- `prisma/migrations/20260930000000_lnd01_land_foundation/migration.sql` — PostGIS, 8 bảng, FK/CHECK/index/GiST, 3 role upsert.
- `prisma/migrations/20260930000000_lnd01_land_foundation/down.sql` — rollback 8 bảng land.
- `docker-compose.yml` — PostGIS image.
- `scripts/demo/seed-land.ts` — role/seed demo idempotent, không PII thật.
- `tests/land/lnd01-land-foundation.test.ts` — static + DB migration/constraint/seed/rollback tests.
- `tests/integration/schema-and-migration.test.ts` — migration chain và 8 model assertions.

## Evidence điều phối

- `.brain/evidence/LND-01/plan.md`
- `.brain/evidence/LND-01/changes.md`
- `.brain/evidence/LND-01/tests.md`
- `.brain/evidence/LND-01/digest.md`
- `.brain/evidence/LND-01/review.md`
