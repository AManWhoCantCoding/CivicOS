# Plan Check — LND-01: Migration tám bảng land + PostGIS + role seed

> Ticket: `D:/Project/CivicOS/.scratch/land-module/phases/phase-01-foundation-access.md` (dòng 31-55).
> Thiết kế khóa: `docs/design/land-module/` (`data-model.md`, `integration-contracts.md`, `overview.md`, `api-contract.md`, `domain-rules.md`, `non-functional.md`, `edge-cases.md`, `glossary.md`) + `docs/adr/0001-land-module-boundaries.md`.
> Phạm vi: migration/seed/test đã có trên đĩa (untracked, chờ commit);
> vòng này khôi phục schema/compose/integration-test bị revert — chỉ plan.

## 1. File dự định sửa/tạo (chỉ trong phạm vi ticket cho phép)

File được phép theo ticket: `prisma/schema.prisma`, `prisma/migrations/**`, `docker-compose.yml`, `scripts/demo/**`, `tests/**`.
File cấm: `.env`, `.brain/**`, `docs/design/**`, `docs/research/**` (không đụng).

| # | File | Sửa hay tạo | Nội dung dự kiến |
|---|---|---|---|
| 1 | `prisma/schema.prisma` | Sửa (additive, chỉ thêm) | Thêm 8 models mới đúng `data-model.md` §§3.1–3.8; geometry dùng `Unsupported("geometry(Polygon,4326)")`; enum dùng `String` + CHECK (không Prisma enum); `String @id @default(cuid())` + `createdAt`/`updatedAt` + `version` nơi design yêu cầu |
| 2 | `prisma/migrations/20260930000000_lnd01_land_foundation/migration.sql` (+`down.sql`) | Tạo mới duy nhất | `CREATE EXTENSION IF NOT EXISTS postgis` trước; `CREATE TABLE` 8 bảng theo thứ tự `data-model.md` §8.3; sau đó FK `RESTRICT`, CHECK, unique/index, GiST index; upsert 3 role; TUYỆT ĐỐI không sửa migration đã chạy trong `prisma/migrations/` |
| 3 | `docker-compose.yml` | Sửa tối thiểu | Đổi PostgreSQL image sang image PostgreSQL 16 có PostGIS (hiện trạng `postgres:16-alpine` tại `docker-compose.yml:1-12` theo `data-model.md` §1); không đổi gì khác (không thêm service, volume, secret, không ghi `DATABASE_URL`) |
| 4 | `scripts/demo/seed-land.ts` | Tạo | Upsert 3 role land + seed dữ liệu demo KHÔNG PII thật, không backfill từ bảng ANTT, không chuyển `Subject` sang `LandParty` (theo `data-model.md` §§8.4–8.5); idempotent — chạy 2 lần không duplicate |
| 5 | `tests/land/lnd01-land-foundation.test.ts` + cập nhật chain trong `tests/integration/schema-and-migration.test.ts` | Tạo/sửa | Test AC-01 (8 bảng + PostGIS + GiST tồn tại), AC-02 (RESTRICT + CHECK), AC-03 (seed 2 lần không duplicate, không PII thật), test rollback/constraint có bằng chứng theo Rubric |

Không sửa/tạo bất kỳ file nào khác, đặc biệt: không `src/**` (service/API/adapter để dành LND-02–LND-04), không `.env`, không `.brain/**` (ngoài chính file plan này), không `docs/design/**`, không `docs/research/**`.

## 2. Hàm/interface/module sẽ đổi

- Không tạo/sửa module `src/**` nào (không `src/modules/land/`, không `src/app/api/land`, không `NationalLandAdapter`, không identity/authorization).
- Không tạo interface/route/error-code mới.
- Thay đổi giới hạn ở:
  - **Prisma models (8, trong `prisma/schema.prisma`):** `LandParty`, `LandParcel`, `LandChangeApplication`, `LandRight`, `LandEncumbrance`, `LandApplicationParty`, `LandApplicationParcel`, `LandNationalSync` — đúng cột/kiểu/ràng buộc `data-model.md` §§3.1–3.8.
  - **Migration SQL:** `CREATE EXTENSION`, `CREATE TABLE` ×8, `ADD CONSTRAINT` (FK `RESTRICT` + CHECK), `CREATE [UNIQUE] INDEX` (gồm GiST cho `geometry` + partial unique cho `identityNumberIndex`/`idempotencyKey`), upsert role. Thao tác geometry chỉ qua SQL parameterized, không nối chuỗi SQL từ input (theo `data-model.md` §8.6).
  - **Compose:** service PostgreSQL hiện có — chỉ đổi image sang PostGIS.
  - **Seed (`scripts/demo/seed-land.ts`):** `LAND_ROLES` + `upsertLandRoles` + `seedLandDemo` (không export contract dùng chung).
  - **Test (`tests/land/lnd01-land-foundation.test.ts`, assertion local):** assertion tồn tại bảng/extension/index; assertion `RESTRICT` khi xóa parent còn child; assertion CHECK (`areaSqm > 0`, `sharePercent`, `ST_IsValid`/`ST_SRID=4326`, CHECK enum/status…); assertion seed idempotent + không PII thật.

## 3. Luồng xử lý

1. Cập nhật `docker-compose.yml`: PostgreSQL image có PostGIS (theo `data-model.md` §1 + `integration-contracts.md` §PostgreSQL + PostGIS; `non-functional.md`: thiếu extension là lỗi triển khai chặn feature, không fallback sang Point/JSON).
2. Bổ sung 8 models vào `prisma/schema.prisma` đúng `data-model.md` §§3.1–3.8 (kiểu `Unsupported("geometry(Polygon,4326)")`, `String` + CHECK, `cuid()`, timestamp, `version`).
3. Tạo MỘT migration additive mới: `CREATE EXTENSION IF NOT EXISTS postgis` → tạo bảng theo thứ tự `LandParty`, `LandParcel`, `LandChangeApplication`, `LandRight`, `LandEncumbrance`, `LandApplicationParty`, `LandApplicationParcel`, `LandNationalSync` → thêm FK `RESTRICT`/CHECK/index/GiST → upsert 3 role. Không sửa migration cũ, không backfill.
4. `prisma generate` (field `Unsupported` đúng PostGIS); thao tác geometry về sau qua adapter SQL parameterized (ghi nhận để LND-02 dùng, LND-01 chưa viết adapter).
5. Seed demo (`scripts/demo/**`): upsert `land_officer`, `commune_leader`, `citizen`, giữ nguyên role/UserRole hiện có; tạo dữ liệu demo tối thiểu không PII thật.
6. Viết test (`tests/**`) theo test-skeleton ticket: AC-01 kiểm tra 8 bảng/PostGIS/GiST; AC-02 kiểm tra RESTRICT + CHECK; AC-03 chạy seed 2 lần kiểm tra không duplicate + không PII thật; kèm bằng chứng rollback/constraint theo Rubric.

## 4. Map thay đổi ↔ AC-01/AC-02/AC-03 và Rubric

| Thay đổi | Map tới | Giải thích |
|---|---|---|
| `docker-compose.yml` đổi image PostGIS + migration `CREATE EXTENSION IF NOT EXISTS postgis` + cột `LandParcel.geometry geometry(Polygon,4326)` + GiST index | AC-01 | Tạo đúng tiền đề "PostgreSQL có PostGIS" và đối tượng kiểm tra "tám bảng + geometry `Polygon,4326` tồn tại" (`data-model.md` §§3.2, 8.2; test-skeleton AC-01) |
| 8 `CREATE TABLE` trong migration mới | AC-01 | Tám bảng tồn tại sau migration (`data-model.md` §8.3; seam kiểm thử Migration tại §9) |
| FK `ON DELETE RESTRICT` toàn bộ parent nghiệp vụ (Right→Parcel/Party, Encumbrance→Parcel/Party, Link→Application/Parcel/Party, Sync→Application) | AC-02 | Đúng "FK nghiệp vụ là `RESTRICT`" (`data-model.md` §§3.3–3.8, §4; test-skeleton AC-02: delete parent còn child bị chặn) |
| CHECK + unique/index đúng `data-model.md` (CHECK `partyType`/`status`/`rightType`/`sharePercent`/`areaSqm > 0`/`landUseType`/`changeType`/`status` 8-state/`parcelRole`/`partyRole`/`operation`/`attempts >= 0`/`ST_IsValid`+`ST_SRID=4326`/…; UNIQUE `referenceCode`/`parcelCode`/`applicationCode`/`requestKey`/composite link/sync; partial unique `identityNumberIndex`/`idempotencyKey`; index tra cứu `(organizationId,status)`, `(parcelId,status)`, lookup…; GiST cho geometry) | AC-02 | Đúng "unique/index/CHECK theo `data-model.md`" (chi tiết §§3.1–3.8 + §6 lookup index; test-skeleton AC-02: share/area invalid bị CHECK) |
| Upsert 3 role `land_officer`, `commune_leader`, `citizen` trong migration/seed, không xóa role/UserRole hiện có | AC-03 (vế 1) | Đúng "có 3 role và không xóa role hiện có" (`data-model.md` §§2-bảng `Role`/`UserRole`, 8.4) |
| Seed demo idempotent (chạy 2 lần không duplicate) + dữ liệu không PII thật, không backfill, không `Subject`→`LandParty` | AC-03 (vế 2) | Đúng "seed 2 lần không duplicate, không PII thật" (test-skeleton AC-03; `data-model.md` §§7–8.5; `law-summary.md:53-65,148-161` dẫn qua design) |
| Schema/migration chỉ tham chiếu `data-model.md`; không sửa migration đã chạy (Rubric 1+2) | Rubric | Ép bởi cách làm §§1–3 plan này: nguồn duy nhất là `data-model.md` §§3–8, một migration additive mới |
| Test rollback/constraint có bằng chứng (Rubric 3) | Rubric | Test AC-02 (RESTRICT/CHECK rollback, không row thứ hai) + AC-03 (seed lặp) trong `tests/**` |
| (Không có mục "không map được") | — | Mọi thay đổi trên đều map trực tiếp tới AC/Rubric; không có dependency kỹ thuật/refactor ngoài ticket — cố ý KHÔNG đưa service/API/adapter/policy (để dành LND-02–LND-04) nên không phát sinh mục thừa cần biện minh |

## 5. Route/bảng/cột/extension/seed được thiết kế khóa cho phép dùng (không tự thêm)

- **Route:** KHÔNG có — LND-01 là foundation DB, không tạo route nào trong `api-contract.md` (toàn bộ bảng endpoint F-01–F-06 để dành LND-02 trở đi). Không tự đặt route/method.
- **Extension:** duy nhất `postgis` qua `CREATE EXTENSION IF NOT EXISTS postgis` (`data-model.md` §8.2; `integration-contracts.md` §PostgreSQL + PostGIS). Không thêm extension khác.
- **Bảng (8, đúng tên và thứ tự `data-model.md` §8.3):** `LandParty` (§3.1), `LandParcel` (§3.2), `LandChangeApplication` (§3.5), `LandRight` (§3.3), `LandEncumbrance` (§3.4), `LandApplicationParty` (§3.6), `LandApplicationParcel` (§3.7), `LandNationalSync` (§3.8). Bảng tái sử dụng (`User`, `Role`, `UserRole`, `OrganizationUnit`, `Assignment`, `Approval`, `EventRecord`, `OutboxMessage`, `AuditEvent`, `Evidence` — `data-model.md` §2) chỉ được tham chiếu/upsert role, không tạo lại, không thêm cột.
- **Cột/ràng buộc:** chỉ đúng §§3.1–3.8 + §6 (index lookup `applicationCode` UNIQUE, `parcelCode` UNIQUE, `(organizationId,status,updatedAt)`, `(parcelId,parcelRole)`): FK `RESTRICT`; CHECK enum/status/share/area/geometry (`ST_IsValid`, `ST_SRID=4326`); UNIQUE đã liệt kê ở mục 4; GiST cho `geometry`. Không thêm bảng/cột/trạng thái/mã lỗi/mã `changeType`/`partyRole`/`parcelRole`/`operation` mới. `organizationId`/`createdById`/`sourceApplicationId` là logical reference, không FK cứng (theo §4).
- **Seed:** upsert đúng 3 role `land_officer`, `commune_leader`, `citizen` vào `Role` (`data-model.md` §§1, 8.4); demo data không PII thật, không backfill, không `Subject`→`LandParty` (§8.5 + §7). Không seed user/party/parcel thật, không seed approval/sync/event.
- **Điểm không có trong thiết kế:** không có (không tự thêm gì ngoài danh sách trên).
