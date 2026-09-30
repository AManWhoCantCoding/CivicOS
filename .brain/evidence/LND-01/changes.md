# Changes — LND-01: Migration tám bảng land + PostGIS + role seed

Ticket LND-01 dựng nền DB land: schema 8 bảng đúng data-model, image Postgres
PostGIS, một migration additive (FK RESTRICT, CHECK, unique/index/GiST, upsert
3 role), seed demo không PII idempotent, test migration/schema/seed.
File phép sửa: prisma/schema.prisma, prisma/migrations/**,
docker-compose.yml, scripts/demo/**, tests/**.

## File đã sửa/tạo

- `prisma/schema.prisma`: thêm 8 model land đúng data-model §§3.1–3.8,
  geometry `Unsupported("geometry(Polygon,4326)")`, enum bằng String,
  FK `onDelete: Restrict`, unique/index theo §6.
- `prisma/migrations/20260930000000_lnd01_land_foundation/migration.sql`:
  tạo mới additive — `CREATE EXTENSION postgis`, 8 `CREATE TABLE` theo §8.3,
  9 FK RESTRICT, CHECK enum/share/area/geometry, unique/index, GiST,
  upsert 3 role; không chạm migration cũ.
- `prisma/migrations/20260930000000_lnd01_land_foundation/down.sql`:
  tạo mới — gỡ role land khi chưa dùng, drop 8 bảng land ngược thứ tự.
- `docker-compose.yml`: đổi image postgres sang `postgis/postgis:16-3.4`.
- `scripts/demo/seed-land.ts`: tạo mới — `LAND_ROLES`,
  `upsertLandRoles`, `seedLandDemo` (party/parcel/right DEMO, geometry
  qua SQL parameterized, idempotent), CLI guard target demo.
- `tests/land/lnd01-land-foundation.test.ts`: tạo mới — test tĩnh AC-01/
  AC-02/AC-03 + rollback, test DB-gated PostGIS/RESTRICT/CHECK/seed lặp.
- `tests/integration/schema-and-migration.test.ts`: thêm migration mới
  vào chain và 8 model land vào danh sách schema.

## Vòng khôi phục (revert) — file sửa trong lần thực thi này

- `prisma/schema.prisma`: khôi phục 8 model land (đúng data-model §§3.1–3.8),
  geometry `Unsupported("geometry(Polygon,4326)")`, 10 FK `onDelete: Restrict`,
  unique/index theo §6; không chạm model hiện có.
- `docker-compose.yml`: khôi phục image `postgis/postgis:16-3.4` (1 dòng).
- `tests/integration/schema-and-migration.test.ts`: thêm migration
  `20260930000000_lnd01_land_foundation` vào chain + 8 model land vào schema list.
- Không sửa: `prisma/migrations/20260930000000_lnd01_land_foundation/*`,
  `scripts/demo/seed-land.ts`, `tests/land/lnd01-land-foundation.test.ts`
  (đã đúng trên đĩa, giữ nguyên).
- `.brain/evidence/LND-01/plan.md`: cập nhật tên file thực tế, không sửa AC/design.
- Sửa lỗi chạm file: chuẩn hóa CRLF→LF cho 3 file tracked đã sửa
  (xác nhận diff chỉ còn 1 dòng compose + 142 dòng schema + 9 dòng test).

## Điểm không có trong thiết kế

không có

## Vòng sửa lỗi 1 — P1012 securedPartyId (2026-09-30)

- `prisma/schema.prisma`: chuyển relation `securedParty LandParty?` từ `LandApplicationParcel` (sai, không có scalar `securedPartyId`) về `LandEncumbrance` đúng `data-model.md §3.4` (scalar `securedPartyId String?` đã có, FK RESTRICT nullable); xóa dòng sai ở `LandApplicationParcel` đúng §3.7; bổ sung back-relation arrays tối thiểu để `prisma validate` đạt (`LandParty.rights/encumbrances/applicationParties`, `LandParcel.rights/encumbrances/applicationParcels`, `LandChangeApplication.applicationParties/applicationParcels/nationalSyncs`); không chạm migration (SQL đã đúng), `docker-compose.yml`, `scripts/demo/**`, `tests/**`.
- Điểm không có trong thiết kế (vòng này): không có.
