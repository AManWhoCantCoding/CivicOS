# Mô hình dữ liệu: `land-parcel-map`

- **Ngày lập:** 2026-10-02
- **Workflow:** B9 — Data Model
- **Trạng thái:** `APPROVED FOR P1 LOGICAL CONTRACT` — user duyệt các quyết định P1 trong approval record ngày 2026-10-02; không có physical schema/index/migration change được ủy quyền
- **B8:** user đã chốt các quyết định interaction/state P1 ngày 2026-10-02; Stitch P1 screen generation được ghi nhận riêng, không sửa P0 screen set
- **P0:** web/mobile read-only, một parcel focus/selection
- **Kết luận ngắn:** **không tạo bảng, cột, index hoặc migration mới cho P0**; map dùng logical read projection trên `LandParcel` hiện có.

## BLOCKED-CONTRACT

Không tìm thấy `docs/research/land-module/law-summary.md` hoặc thư mục `docs/research/` trong repository, dù các design cũ có tham chiếu tài liệu này. Vì vậy tài liệu này không tự quyết định legal retention, effective-date, certified-boundary, provenance pháp lý hoặc regulatory obligation mới.

Các quyết định dưới đây chỉ dựa trên:

1. SOW/design đã user chốt ở B6.
2. Stitch visual prototype set đã user chốt ở B8.
3. Prisma schema, migration SQL và source code hiện tại đã khảo sát trong B9.

Nếu law research bổ sung yêu cầu khác, phải mở revision trước implementation; không dùng mô hình này để suy ra tính pháp lý của polygon.

## 1. Nguồn quyết định

| Quyết định                                                                | Nguồn                                                                                                                             |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL + PostGIS là storage hiện tại                                  | `prisma/schema.prisma:5-8`; `docker-compose.yml:1-11`                                                                             |
| `LandParcel` đã có Polygon 4326, `updatedAt`, `version`, scope và indexes | `prisma/schema.prisma:548-572`; migration `20260930000000_lnd01_land_foundation/migration.sql:19-36,193-203,307-319`              |
| Geometry phải đọc/ghi qua raw SQL vì Prisma dùng `Unsupported`            | `prisma/schema.prisma:558`; `src/modules/land/parcel-repository.ts:40-55,84-105`; ADR-0001                                        |
| Land authorization                                                        | `src/modules/land/access.ts:15-40,148-256`                                                                                        |
| B7 projection allowlist/no-store/no offline polygon                       | `docs/land-parcel-map/api-contract.md:3-9,31-52,124-134`; `non-functional.md:3-10,27-32`                                   |
| P0 không tạo data model riêng, B9 khảo sát read path/index/audit          | `docs/land-parcel-map/overview.md:92-96`; `.scratch/land-parcel-map/sow.md:100-105`                                        |
| UI screen set đã chốt                                                     | `.scratch/land-parcel-map/ui/prototype.md`; `.scratch/land-parcel-map/ui/report.md`; Stitch project `projects/625896077994744427` |
| P1 approval và query-plan probe                                           | `.scratch/land-parcel-map/p1-approval-record.md`; `.scratch/land-parcel-map/phase-05-p1-gate-readiness.md`                        |
| Approved map extent                                                       | `src/modules/platform/map/index.ts:5-10` — `CADN_BOUNDS = [105.93, 20.91, 106.03, 20.99]`                                         |

## 2. Current database survey

### 2.1 `LandParcel` — source of truth

`LandParcel` là aggregate/resource hiện có, không tạo bản sao cho map.

| Field               | DB type/null/default               | PK/unique/index/constraint                           | Vai trò trong map projection                                       |
| ------------------- | ---------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------ |
| `id`                | `String NOT NULL`                  | PK                                                   | Resource key và path `parcelId`; **được trả**                      |
| `parcelCode`        | `String NOT NULL`                  | UNIQUE                                               | Identity nghiệp vụ; **được trả**                                   |
| `mapSheetNumber`    | `String NOT NULL`                  | Composite identity/index                             | Tờ bản đồ; **được trả**                                            |
| `parcelNumber`      | `String NOT NULL`                  | Composite identity/index                             | Số thửa; **được trả**                                              |
| `status`            | `String NOT NULL DEFAULT 'active'` | CHECK `proposed/active/retired`; org/status index    | State read-only; **được trả**                                      |
| `geometry`          | `geometry(Polygon,4326) NOT NULL`  | `ST_IsValid`, `ST_SRID=4326`, GiST                   | GeoJSON Polygon; **được trả** sau ACL và validation                |
| `updatedAt`         | `DateTime NOT NULL @updatedAt`     | Không có index riêng                                 | Freshness; **được trả**                                            |
| `version`           | `Int NOT NULL DEFAULT 1`           | Không có index riêng                                 | Phát hiện thay đổi nội bộ; **không trả P0**                        |
| `organizationId`    | `String NOT NULL`                  | org/status index; logical ref tới `OrganizationUnit` | ACL filter; **không trả**                                          |
| `communeCode`       | `String NOT NULL`                  | commune/status index                                 | Chỉ dùng P1/filter sau khi scope policy xác nhận; **không trả P0** |
| `areaSqm`           | `Decimal(14,2) NOT NULL`           | `> 0`                                                | Không dùng; không suy ra từ geometry                               |
| `landUseType`       | `String NOT NULL`                  | Không dùng cho map                                   | Không trả                                                          |
| `address`           | `String NOT NULL`                  | Không dùng cho map                                   | Không trả                                                          |
| `nationalRecordRef` | `String NULL`                      | Không dùng cho map                                   | Không trả; không coi là provenance pháp lý                         |
| `createdAt`         | `DateTime NOT NULL`                | —                                                    | Không cần cho P0 response                                          |

### 2.2 Bảng và seam liên quan được tái sử dụng

| Existing structure                                | Cách dùng                                                                | Có thay đổi physical schema không? |
| ------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------- |
| `User` / `Role` / `UserRole`                      | Session actor và role `land_officer`/`commune_leader`                    | Không                              |
| `OrganizationUnit`                                | Scope logic qua `User.organizationUnitId`/`LandParcel.organizationId`    | Không                              |
| `Assignment`                                      | Officer direct assignment hoặc application assignment                    | Không                              |
| `LandChangeApplication` + `LandApplicationParcel` | Resolve assignment gián tiếp tới parcel                                  | Không                              |
| `AuditEvent`                                      | Audit map read/selection tối thiểu                                       | Không                              |
| `ProjectionRecord`                                | Không dùng cho P0 vì map generic hiện chỉ source `Incident`/`Inspection` | Không                              |
| `OfflineCommand` / native basemap pack            | Không chứa land polygon; không mở rộng cho map cache                     | Không                              |
| `LandRight`, `LandEncumbrance`, `Evidence`        | Không join/không trả trong map projection                                | Không                              |

## 3. Logical map projection

Đây là DTO/read projection, **không phải table hoặc materialized view**.

### 3.1 P0 response

| Response field   | Source                              | Type                | Null  | Transformation                                  |
| ---------------- | ----------------------------------- | ------------------- | ----- | ----------------------------------------------- |
| `id`             | `LandParcel.id`                     | `string`            | Không | Giữ nguyên                                      |
| `parcelCode`     | `LandParcel.parcelCode`             | `string`            | Không | Giữ nguyên                                      |
| `mapSheetNumber` | `LandParcel.mapSheetNumber`         | `string`            | Không | Giữ nguyên                                      |
| `parcelNumber`   | `LandParcel.parcelNumber`           | `string`            | Không | Giữ nguyên                                      |
| `status`         | `LandParcel.status`                 | `string`            | Không | Giữ nguyên; read-only                           |
| `geometry`       | `ST_AsGeoJSON(LandParcel.geometry)` | GeoJSON `Polygon`   | Không | Parse/validate, giữ WGS84/SRID 4326 và mọi ring |
| `updatedAt`      | `LandParcel.updatedAt`              | ISO datetime        | Không | `toISOString()`; dùng freshness                 |
| `simulated`      | Response constant                   | `true`              | Không | Không persist; bắt buộc cho UI                  |
| `projection`     | Response constant                   | `"land-parcel-map"` | Không | Không persist                                   |

Response không chứa `organizationId`, `communeCode`, `areaSqm`, `landUseType`, `address`, `nationalRecordRef`, `version`, party/identity, rights, encumbrances, Evidence, application payload, sync, approval hoặc audit metadata.

### 3.2 Internal query shape

Read seam nội bộ có thể cần đọc thêm `organizationId` để gọi policy, nhưng field này phải bị loại trước khi serialize response:

```text
MapParcelRow = {
  id,
  parcelCode,
  mapSheetNumber,
  parcelNumber,
  status,
  geometryGeoJson,
  updatedAt,
  organizationId // ACL-only, never response
}
```

`findParcelById` hiện tại trả `ParcelRow` đầy đủ (`src/modules/land/parcel-repository.ts:10-26,40-55`). Không gọi `getParcelDetail` rồi lọc muộn; cần read seam/map mapper riêng để giảm risk over-fetch và giữ boundary.

## 4. Geometry model và constraints

1. Physical type giữ nguyên `geometry(Polygon,4326)`.
2. Database giữ CHECK `ST_IsValid(geometry)` và `ST_SRID(geometry)=4326`.
3. API/parser giữ `Polygon` và ring đóng; geometry invalid/CRS sai phải fail-closed (`src/modules/land/parcel-geometry.ts:15-58`).
4. Serializer map phải giữ exterior ring và interior holes/multiple rings. Không dùng `src/modules/platform/map/toMapAreaGeoJson` cho LandParcel vì adapter hiện tại chuyển `GeoArea.points` thành một ring (`src/modules/platform/map/index.ts:191-223`).
5. Không tự đóng ring, sửa self-intersection, đổi CRS hoặc suy ra Polygon từ Point.
6. Không tính `areaSqm` từ geometry và không gọi geometry là legal boundary.

## 5. Authorization, audit và privacy

### Authorization read path

1. Resolve session actor.
2. Require role `land_officer` hoặc `commune_leader` và `organizationUnitId`.
3. Load parcel identity + `organizationId`.
4. Reuse `requireParcelDetailAccess`:
   - cross-OrganizationUnit → `FORBIDDEN`;
   - leader cùng unit → cho phép theo hiện hành;
   - officer → direct active Assignment hoặc linked active `LandChangeApplication` Assignment;
   - thiếu Assignment → `ASSIGNMENT_REQUIRED`.
5. Chỉ sau khi policy cho phép mới serialize geometry.

Map route không được suy ra quyền từ `map-workspace`/business capability cũ và không dùng public lookup.

### Audit

- Tái sử dụng `AuditEvent`/`recordAudit`, không tạo bảng mới.
- Map read/selection có thể dùng operation names riêng như `land.parcel.map.viewed` và `land.parcel.map.selected`.
- Metadata tối thiểu: `resourceType`, `resourceId`, outcome/policy result, organization scope cần thiết, timestamp/correlation hiện có.
- Không ghi raw polygon, address, party plaintext, identity hoặc token.
- Audit failure behavior phải tuân policy hiện hành; B9 không tự đổi transaction semantics.

### Privacy/cache

- API response Polygon `no-store`.
- Không thêm cache table, materialized view, offline pack land layer hoặc `OfflineCommand` payload cho polygon.
- Basemap cache hiện hữu được giữ tách biệt; `simulated` là response/UI metadata.

## 6. Index và query strategy

### P0

- `GET .../{parcelId}` dùng PK `LandParcel.id`; index đã đủ.
- ACL query dùng `Assignment` existing indexes và `LandApplicationParcel` PK/index hiện có.
- Không thêm index/migration P0.

### P1

- Filter `parcelCode` dùng unique index; map sheet/parcel/unit dùng composite unique/index; `communeCode/status` dùng index hiện có.
- Bbox/spatial query dùng `LandParcel_geometry_gist_idx` cùng organization/status predicate.
- Query P1 dùng normalized exact scalar filters kết hợp `AND`; query rỗng bị từ chối; bbox phải nằm trong `CADN_BOUNDS`, không antimeridian, dùng `geometry && envelope` và `ST_Intersects`.
- Cursor giữ contract `base64url("land:" + id)`, `ORDER BY id ASC`, `id > cursorId`, fetch `limit + 1`; default `50`, max `100`; filter/bbox đổi thì reset và server kiểm tra cursor theo scope query hiện tại.
- Bounded item cap của P1 là `limit` default/max `50/100`. Không silent truncate geometry hoặc serialized response; safe overflow/geometry boundary trả narrow-query/overflow state.
- Techlead read-only probe trên local PostGIS đã chạy scalar và bounded bbox shape với index hiện hữu; dataset chỉ có một row nên plan `Seq Scan` và execution thấp không chứng minh selectivity/production scale.
- **No migration/index change authorized.** Không tạo migration hoặc index mới từ probe này; nếu evidence dataset thực tế sau này yêu cầu thay đổi, phải mở decision B9 riêng và user approval trước.

### 6.1 P1 logical query shape

P1 chỉ mở read projection trên `LandParcel`, không tạo table/view/materialized view/cache. Query shape chuẩn hóa là:

```text
SELECT map allowlist + organizationId ACL-only + ST_AsGeoJSON(geometry)
FROM LandParcel
WHERE organizationId = actor.organizationUnitId
  AND supplied scalar filters (exact, normalized, AND)
  AND optional bounded bbox predicates when bbox is supplied:
      geometry && ST_MakeEnvelope(minLng, minLat, maxLng, maxLat, 4326)
      AND ST_Intersects(geometry, ST_MakeEnvelope(minLng, minLat, maxLng, maxLat, 4326))
ORDER BY id ASC
LIMIT limit + 1
```

`organizationId` chỉ phục vụ scope/policy và bị loại trước response. Mỗi row phải qua land policy re-check trước khi serialize geometry. Query không gọi public lookup và không gọi parcel detail rồi lọc muộn.

### 6.2 P1 bounded data và probe limitation

- Dữ liệu probe hiện tại: một `LandParcel`, một organization/status.
- Scalar `parcelCode`, composite map-sheet/parcel/organization và organization/status/commune chạy an toàn trên local PostGIS; bbox dùng `geometry && envelope` + `ST_Intersects` và trả row bounded.
- Các plan đều có thể chạy với index hiện hữu nhưng chọn `Seq Scan` do dataset trivial; không được diễn giải là index không cần cho production hoặc là proof về paging/payload.
- Probe chỉ dùng `SELECT` và `EXPLAIN (ANALYZE, BUFFERS)`, không seed/mutate. Evidence summary và limitation nằm tại `.scratch/land-parcel-map/phase-05-p1-gate-readiness.md`.
- B9 chốt logical model và implementation bounds; không chốt thêm byte/vertex threshold mới ngoài item `limit` `50/100`. Nếu runtime geometry/serialization safety boundary bị vượt, phải fail-closed và yêu cầu narrow query, không cắt ngầm.

## 7. Relations, lifecycle và temporal behavior

### Relations

- `LandParcel` giữ FK `RESTRICT` từ rights, encumbrances và application links; map không thay đổi relation.
- `organizationId`, `createdById`, `sourceApplicationId` hiện có một phần là logical references; không mở rộng FK chỉ để phục vụ map.

### Lifecycle

- `proposed`, `active`, `retired` vẫn là state hiện có.
- Map đọc status; không transition status, không edit geometry, không delete/archive từ map.
- `retired` không bị xóa do map; UI phải hiển thị status read-only và nhãn simulated.

### Freshness/concurrency

- `updatedAt` là nguồn freshness của projection.
- `version` là concurrency/version nội bộ, không trả P0 và không được biến thành claim `current legal`.
- Chưa thêm `effective_from/effective_to` hoặc history table vì chưa có contract cần thiết và law-summary đang thiếu.

## 8. Gap map và phân loại thay đổi

| Hạng mục                        | Phân loại                   | Hành động                                                                                                                             |
| ------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| LandParcel storage              | Reuse existing structure    | Không migration                                                                                                                       |
| Polygon PostGIS/GiST            | Reuse existing structure    | Không copy geometry                                                                                                                   |
| Land ACL                        | Reuse existing structure    | Tạo map read seam gọi policy hiện hành                                                                                                |
| Allowlist projection            | New application structure   | DTO/repository/service, không persistence                                                                                             |
| Web `/map?parcelId=...`         | Extend existing application | Route/UI change; không đổi DB                                                                                                         |
| Mobile `LandScreen → MapScreen` | Extend existing application | API/navigation/render change; không đổi DB                                                                                            |
| Map audit                       | Reuse `AuditEvent`          | Operation/metadata contract + tests                                                                                                   |
| Offline                         | Explicitly not persisted    | Không dùng land polygon cache                                                                                                         |
| P1 spatial discovery            | Extend existing application | Logical bounded read projection, existing scalar/GiST indexes, `limit/cursor/bbox` contract; **no migration/index change authorized** |
| Legal/retention/provenance      | Blocked contract            | Chờ law-summary/evidence; không tự thiết kế                                                                                           |

## 9. Migration strategy

### P0 migration

**Không có migration P0.** Không thêm table, column, index, FK, enum, materialized view hoặc cache record.

### Application changes required after B9 approval

1. Tạo land map read repository/query chỉ chọn allowlist + `organizationId` ACL-only và `ST_AsGeoJSON`.
2. Tạo projection service gọi access policy, validate Polygon và map error codes.
3. Tạo `/api/map/land-parcels/{parcelId}` với `Cache-Control: no-store`.
4. Nối web P1 discovery và web/mobile P0 map theo screen set/contract B8; mobile không có P1 discovery; giữ generic Incident/Inspection map contract không đổi.
5. Ghi audit read/selection theo existing `AuditEvent`.
6. Thêm contract/regression tests cho authorization, geometry holes, allowlist, no-store, stale/offline/no-cache.
7. P1 discovery chỉ thêm application read seam/route trên `LandParcel`: scalar exact filters, bounded CADN bbox, existing cursor/limit và safe overflow state; không thêm physical data structure.

### Backward compatibility

- `/api/land/parcels`, `/api/land/parcels/{parcelId}`, public lookup và `/api/map/markers` giữ nguyên response/permission semantics.
- `ProjectionRecord` không nhận LandParcel ở P0.
- `LandParcel` existing rows đọc được ngay; không backfill/copy geometry.
- P1 probe hiện tại không đủ chứng minh migration/index cần thiết; **no migration/index change authorized**. Nếu evidence production-like sau này chứng minh cần, tạo migration additive riêng và cập nhật migration chain/tests sau một decision B9 mới.

## 10. Acceptance gate cho data model

User đã xác nhận:

1. Không có physical schema change cho P0.
2. `LandParcel` là source of truth; map projection chỉ là DTO.
3. ACL dùng `requireParcelDetailAccess` semantics và không mở rộng role map cũ.
4. Geometry serializer riêng giữ mọi ring; không flatten qua generic GeoArea.
5. Không lưu/caching land polygon offline.
6. `BLOCKED-CONTRACT` về law-summary được chấp nhận tạm thời; không suy ra legal/retention rule mới.
7. P1 web-only discovery dùng filters exact normalized + `AND`, không query rỗng, bbox CADN bounded với `&&` + `ST_Intersects`, cursor/limit `land:` + `id` / `50/100`, và không silent truncate.
8. Probe read-only một-row được ghi nhận là non-representative; không có migration/index change được ủy quyền.

Sau user approval, chạy:

```text
node scripts/check-scope.mjs lock land-parcel-map --stage=full --user-approved
```

`LOCK.json` là approval/revision metadata; không dùng Markdown content hash làm B11 gate.

`NEXT-SKILL: gov-to-phases`
