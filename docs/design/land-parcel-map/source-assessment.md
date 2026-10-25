# Khảo sát nguồn hiện tại — `land-parcel-map` (B9)

- **Ngày khảo sát:** 2026-10-02
- **Workflow:** B9 — Data Model
- **Phạm vi:** database, migration, storage/access path và map consumers hiện tại
- **Phương pháp:** đọc Prisma schema, migration SQL, land repository/service/access, map web/mobile và test contract hiện hữu

## BLOCKED-CONTRACT

Repository hiện không có `docs/research/land-module/law-summary.md` hoặc thư mục `docs/research/`. Các design cũ tham chiếu tài liệu này nhưng tài liệu không tồn tại trong working tree. B9 không tự suy ra thêm legal rule, retention rule, effective-date rule hoặc certified-boundary behavior từ thiếu sót này.

Feature đã được user chốt là internal/simulated, read-only và không phải ranh giới pháp lý; khảo sát kỹ thuật và mô hình P0 dưới đây chỉ dùng quyết định đó cùng implementation hiện tại. User đã duyệt mô hình kỹ thuật và chấp nhận blocker này tạm thời; không có legal rule mới được suy ra.

## 1. Database engine và migration

### Đã có

- Prisma datasource dùng PostgreSQL và `DATABASE_URL` (`prisma/schema.prisma:5-8`).
- `prisma/migrations/migration_lock.toml` khóa provider `postgresql`.
- Docker dùng `postgis/postgis:16-3.4` (`docker-compose.yml:1-11`); TileServer GL chạy riêng ở port `8080`.
- Migration chain hiện tại kết thúc ở `20260930000000_lnd01_land_foundation` (`tests/integration/schema-and-migration.test.ts:33-50`).
- LND-01 additive, bật PostGIS và tạo 8 bảng land; không tạo bảng map projection riêng (`prisma/migrations/20260930000000_lnd01_land_foundation/migration.sql:1-119`).

### `LandParcel` physical schema hiện tại

| Thành phần                         | Hiện trạng                                                                    | Nguồn                                                |
| ---------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------- |
| PK                                 | `id TEXT`                                                                     | `prisma/schema.prisma:548-549`                       |
| Business identity                  | `parcelCode UNIQUE`, `mapSheetNumber`, `parcelNumber`                         | `prisma/schema.prisma:550-552`, migration `:307-310` |
| Scope                              | `organizationId`, `communeCode`                                               | `prisma/schema.prisma:556-557`, migration `:316-318` |
| Geometry                           | `geometry(Polygon,4326) NOT NULL`                                             | schema `:558`, migration `:29`, `:200-202`           |
| State/concurrency                  | `status`, `version`, `createdAt`, `updatedAt`                                 | schema `:560-563`, migration `:193-203`              |
| Business fields không dùng cho map | `areaSqm`, `landUseType`, `address`, `nationalRecordRef`                      | schema `:553-559`                                    |
| Index                              | PK, unique code/composite identity, org/status, commune/status, GiST geometry | migration `:307-329`                                 |

### Ràng buộc hiện tại

- `geometry` phải `ST_IsValid` và SRID `4326`.
- `status` chỉ `proposed`, `active`, `retired`.
- `areaSqm > 0`; map không được tính lại diện tích từ polygon.
- Quan hệ `LandRight`, `LandEncumbrance`, `LandApplicationParcel` dùng `ON DELETE RESTRICT`; map không tạo delete/mutation path.
- Schema Prisma khai báo geometry là `Unsupported`; đọc/ghi hiện đi qua parameterized raw SQL.

## 2. Source/data-access path hiện tại

### Land storage và detail

- `src/modules/land/parcel-repository.ts:40-55` dùng `ST_AsGeoJSON("geometry")` và trả `ParcelRow` có toàn bộ field nội bộ.
- `findParcelById` query theo PK `LandParcel.id`; `findParcelsByOrganization` filter `organizationId`, `status`, `communeCode`, `parcelCode`, cursor theo `id` (`parcel-repository.ts:47-81`).
- `src/modules/land/parcel-service.ts:15-64` chuyển row thành `ParcelResponse` đầy đủ, gồm address, landUseType, organizationId, nationalRecordRef, version và geometry.
- `src/modules/land/parcel-detail-service.ts:33-101` kiểm tra quyền rồi đọc rights/encumbrances và ghi audit; đây là detail projection, không phù hợp để trả trực tiếp cho map.

### Access policy

- `src/modules/land/access.ts:15-40` chỉ công nhận `land_officer` và `commune_leader`, actor phải có `organizationUnitId`.
- `requireParcelDetailAccess` (`access.ts:148-256`) fail-closed theo OrganizationUnit; leader cùng đơn vị đọc không cần Assignment; officer cần Assignment trực tiếp trên `LandParcel` hoặc Assignment `LandChangeApplication` có link `LandApplicationParcel`.
- `auditLandEvent` dùng `recordAudit` hiện có (`access.ts:326-346`); `AuditEvent` đã có index theo resource và actor (`prisma/schema.prisma:145-158`).

### Public boundary

- `src/modules/land/public-lookup-repository.ts:18-26` chọn projection không có geometry, party, sync, approval hoặc Evidence.
- `lookupPublicLand` trả `simulated: true` (`public-lookup-service.ts:34-77`). Map parcel không được mở rộng public lookup.

### Map web hiện tại

- `src/modules/platform/map/index.ts:47-60` chỉ khai báo source aggregate `Incident` và `Inspection`.
- `/api/map/markers` đọc `ProjectionRecord`, filter theo `organizationId`, giới hạn 200, mask title theo capability và audit `MapWorkspace` (`src/app/api/map/markers/route.ts:14-66`).
- `MapWorkspace` gọi `/api/map/config` và `/api/map/markers`, tự refresh 30 giây, render marker/area và cho phép bật/tắt `Vụ việc`, `Kiểm tra`, `Vùng polygon` (`src/components/map/MapWorkspace.tsx:77-168`, `:171-252`, `:315-340`).
- Generic map adapter `GeoArea` chỉ mang một danh sách `points`; `toMapAreaGeoJson` tạo một ring duy nhất (`src/modules/platform/map/index.ts:191-223`). Không dùng adapter này để flatten LandParcel Polygon có holes/multiple rings.
- `/map` hiện được gate bởi `map-workspace`/business capability (`src/app/map/layout.tsx:6-26`, `src/app/map/page.tsx:6-29`), không phải land access policy.

### Map mobile hiện tại

- `mobile/src/features/map/MapScreen.tsx:89-156` tải layers, provider và `RelatedInfo` items; `:181-256` render các `RelatedInfoItem` GeoJSON.
- `OfflineManager` chỉ quản lý basemap pack metadata/style (`MapScreen.tsx:91-114`, `:277-299`); hiện không có LandParcel polygon cache riêng.
- Mobile API map (`mobile/src/api/map.ts:1-32`) không có land parcel projection route.
- `LandScreen` hiện gọi summary `/api/land/parcels` (`mobile/src/api/land.ts:191-204`); `canReadInternalLand` giới hạn `land_officer`/`commune_leader` và scope đơn vị (`mobile/src/features/land/LandScreen.tsx:117-124`).

## 3. Current gap map

| Nhu cầu B7/SOW                    | Hiện trạng                                                                             | Phân loại B9                                                                                   | Kết luận persistence                     |
| --------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------- |
| P0 đọc một parcel theo `parcelId` | Có `LandParcel.id` và PK query                                                         | Reuse existing structure                                                                       | Không tạo table/column                   |
| Geometry Polygon 4326             | Có PostGIS column, CHECK và GiST                                                       | Reuse existing structure; extend read serializer                                               | Không tạo geometry copy                  |
| Scope theo land policy            | Có `User`, roles, `Assignment`, `LandApplicationParcel` và `requireParcelDetailAccess` | Reuse existing structure; new map read seam                                                    | Không tạo ACL table                      |
| Allowlist map response            | Detail response hiện quá rộng                                                          | New application projection                                                                     | Không lưu projection                     |
| Web map layer                     | Map chỉ biết Incident/Inspection và generic ProjectionRecord                           | Extend map consumer/API                                                                        | Không mở rộng `ProjectionRecord` cho P0  |
| Mobile focused map                | Map chỉ biết RelatedInfo và basemap cache                                              | Extend mobile integration/API                                                                  | Không lưu land polygon offline           |
| Freshness                         | `LandParcel.updatedAt` và `version` đã có                                              | Reuse existing fields                                                                          | Không thêm temporal table                |
| Map read/selection audit          | `AuditEvent`/`recordAudit` đã có                                                       | Reuse existing audit storage                                                                   | Không tạo audit table                    |
| P1 bbox/filter                    | Có GiST và scalar indexes; read-only probe scalar/bbox đã chạy trên một row demo       | Reuse existing query/index shape; default/max `50/100`; migration/index phải có decision riêng | **No migration/index change authorized** |

## 4. Data-model implications

1. P0 dùng `LandParcel` làm source of truth; không tạo `LandParcelMapProjection`, cache table, materialized view hoặc duplicate geometry.
2. Map route phải có repository/read seam riêng, chọn allowlist ngay trong SQL hoặc mapper chuyên dụng; không gọi `getParcelDetail` rồi lọc muộn.
3. `organizationId` chỉ phục vụ access check, không trả về map response; `simulated` và `projection` là response metadata, không phải cột database.
4. Vì generic `GeoArea` hiện không giữ holes/multiple rings, LandParcel cần GeoJSON Polygon serializer riêng giữ nguyên mọi ring.
5. `updatedAt` là freshness marker; `version` dùng để phát hiện thay đổi. Không gán thêm `effective_from/effective_to` khi chưa có contract pháp lý.
6. Audit metadata chỉ ghi resource/action/outcome/scope tối thiểu; không lưu raw polygon, PII hoặc token.
7. P1 web-only discovery dùng exact normalized scalar filters kết hợp AND hoặc bbox CADN bounded; không empty unbounded query.
8. P1 cursor/limit reuse `land:` + `id`, `ORDER BY id ASC`, `id > cursorId`, fetch `limit+1`, default `50`, max `100`; filter/bbox đổi thì reset/bind và mismatch fail-closed.
9. P1 spatial predicate dùng `geometry && envelope` + `ST_Intersects`; response giữ allowlist/no-store và không offline LandParcel polygon cache.

## 4.1 P1 query-plan evidence và limitation

Techlead đã chạy read-only local PostGIS probe sau khi xác nhận migration state up to date. Probe chỉ dùng `SELECT` và `EXPLAIN (ANALYZE, BUFFERS)`, không seed/mutate:

- Dataset có đúng một `LandParcel`, thuộc một organization/status.
- Scalar `parcelCode`, composite map-sheet/parcel/organization và organization/status/commune chạy an toàn trên query shape hiện hữu; bbox dùng `geometry && envelope` + `ST_Intersects` và trả đúng row bounded.
- Các plan chọn `Seq Scan` với execution dưới khoảng `0.1ms` cho scalar và khoảng `0.125ms` cho bbox vì dataset trivial.
- Đây là evidence query shape chạy được với schema/index hiện hữu, không phải evidence selectivity, paging, payload cap, overlap/multiple geometry hoặc production-scale index decision.
- **No migration/index change authorized.** Không thêm index/migration từ probe; nếu dataset production-like sau này chứng minh cần, mở B9 revision và approval riêng.

## 5. Survey conclusion

Current database đã đủ persistence cho P0 và logical bounded read contract P1. Thay đổi cần thiết chủ yếu là application read seam, API contract enforcement và web P1 rendering; mobile giữ P0. Probe một-row là non-representative, nhưng không có migration/index change được ủy quyền; implementation phải giữ bounds/cursor/default-max và fail-closed overflow contract.
