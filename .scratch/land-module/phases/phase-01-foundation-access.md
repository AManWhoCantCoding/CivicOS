# Phase 01 — Foundation & access

## Phạm vi phase

Tạo nền database/PostGIS, party/parcel nội bộ, seed giả lập và authorization/Assignment land. Phase này hoàn thiện F-01 và phần nền F-06; không tạo application workflow, sync, approval hoặc public lookup.

## Tính năng thuộc phase

- F-01 — quản lý party, parcel, geometry, rights/encumbrances read projection.
- F-06 — role/capability land, OrganizationUnit scope, Assignment `land_review` và audit nền.

## Ticket list dự kiến

| ID | Ticket | Demo path sau ticket | Tham chiếu design | Phụ thuộc |
|---|---|---|---|---|
| LND-01 | Migration tám bảng land + PostGIS + role seed | Database test có PostGIS, constraints/indexes và role land. | `data-model.md#8-migration`; `integration-contracts.md#postgresql--postgis`; ADR-0001 | Không |
| LND-02 | Party/parcel service và API | `land_officer` tạo party/parcel hợp lệ; identity được mã hóa; geometry invalid bị từ chối. | `api-contract.md#post-apilandparties`; `api-contract.md#post-apilandparcels`; DR-02–DR-05 | LND-01 |
| LND-03 | Parcel detail rights/encumbrances projection | Internal actor mở parcel detail và đọc `rights`/`encumbrances`, không có direct mutation. | `api-contract.md#get-apilandparcelsparcelid`; DR-14, DR-22 | LND-01, LND-02 |
| LND-04 | Land role/capability/Assignment policy | Leader cấp `land_review`; officer khác đơn vị hoặc không có Assignment bị từ chối. | `integration-contracts.md#identity-assignment-và-authorization`; DR-09–DR-11 | LND-01 |
| LND-05 | Web screen-04 parcel/party workspace | Người dùng nội bộ xem list/detail geometry/rights/encumbrances theo scope. | `.scratch/land-module/ui/screen-04.md`; `design-tokens.md` | LND-02, LND-03, LND-04 |

## Thứ tự thực hiện

1. LND-01.
2. LND-02 và LND-04 có thể triển khai song song sau migration.
3. LND-03 sau LND-02.
4. LND-05 sau LND-02, LND-03 và LND-04.

## Ticket contracts

### LND-01 — Migration tám bảng land + PostGIS + role seed

- **Status:** done
- **Blocked by:** không
- **Loại:** feature
- **Lane:** full
- **Gate hướng:** có
- **File được phép sửa:** `prisma/schema.prisma`, `prisma/migrations/**`, `docker-compose.yml`, `scripts/demo/**`, `tests/**`
- **File cấm sửa:** `.env`, `.brain/**`, `docs/design/**`, `docs/research/**`
- **Demo path:** Database test có PostGIS, tám bảng land, role land và seed tối thiểu.
- **Các bước thực hiện:**
  1. [x] Bổ sung schema tám bảng đúng `data-model.md`.
  2. [x] Cập nhật PostgreSQL image/extension PostGIS.
  3. [x] Tạo migration additive với FK/CHECK/unique/index/GiST.
  4. [x] Upsert ba role land và seed dữ liệu demo không PII.
  5. [x] Chạy migration/schema tests.
- **Acceptance Criteria:**
  - [x] Given PostgreSQL có PostGIS, When chạy migration, Then tám bảng land và geometry `Polygon,4326` tồn tại.
  - [x] Given migration đã chạy, When kiểm tra schema, Then FK nghiệp vụ là `RESTRICT`, unique/index/CHECK theo `data-model.md`.
  - [x] Given database chưa có role land, When chạy seed, Then có `land_officer`, `commune_leader`, `citizen` và không xóa role hiện có.
- **Test-skeleton:**
  - AC-01: database test + migration → tám bảng, PostGIS và GiST index tồn tại.
  - AC-02: insert parent delete có child → bị `RESTRICT`; share/area invalid → bị CHECK.
  - AC-03: seed chạy hai lần → role không duplicate, dữ liệu không có PII thật.
- **Rubric bắt buộc:** Schema/migration chỉ tham chiếu `data-model.md`; không sửa migration đã chạy; test rollback/constraint có bằng chứng.

### LND-02 — Party/parcel service và API

- **Status:** needs-triage
- **Blocked by:** LND-01
- **Loại:** feature
- **Lane:** full
- **Gate hướng:** có
- **File được phép sửa:** `src/modules/land/**`, `src/app/api/land/parties/**`, `src/app/api/land/parcels/route.ts`, `tests/land/**`
- **File cấm sửa:** `.env`, `.brain/**`, `docs/design/**`, `prisma/migrations/**`
- **Demo path:** `land_officer` tạo/list party và parcel hợp lệ qua API contract.
- **Các bước thực hiện:**
  1. Tạo party repository/service dùng encryption và blind index hiện có.
  2. Tạo parcel repository/service dùng geometry SQL seam.
  3. Tạo route GET/POST parties và GET/POST parcels.
  4. Map lỗi sang `LAND_*` message tiếng Việt.
  5. Viết API/service tests.
- **Acceptance Criteria:**
  - [ ] Given party hợp lệ, When POST parties, Then `201`, status `active`, response chỉ có `identityNumberMasked`.
  - [ ] Given parcel Polygon valid, When POST parcels, Then `201`, version `1`, `nationalRecordRef=null`.
  - [ ] Given actor ngoài scope, When GET/POST resource, Then `403 LAND_FORBIDDEN` và không lộ dữ liệu.
- **Test-skeleton:**
  - AC-01: displayName/identityNumber plaintext input → DB ciphertext + response masked.
  - AC-02: GeoJSON Polygon SRID 4326 + area `125.50` → row/response hợp lệ.
  - AC-03: user khác OrganizationUnit → HTTP 403, response không có resource.
- **Rubric bắt buộc:** Response khớp `api-contract.md`; không trả ciphertext/storage internals; parameterized geometry SQL.

### LND-03 — Parcel detail rights/encumbrances projection

- **Status:** needs-triage
- **Blocked by:** LND-01, LND-02
- **Loại:** feature
- **Lane:** full
- **Gate hướng:** có
- **File được phép sửa:** `src/modules/land/**`, `src/app/api/land/parcels/[parcelId]/**`, `tests/land/**`
- **File cấm sửa:** `.env`, `.brain/**`, `docs/design/**`, `prisma/schema.prisma`
- **Demo path:** Internal actor mở parcel detail và đọc rights/encumbrances summary, không có mutation trực tiếp.
- **Các bước thực hiện:**
  1. Tạo query projection cho parcel detail.
  2. Join right/encumbrance theo nullable/active history contract.
  3. Áp dụng OrganizationUnit/Assignment policy.
  4. Tạo route GET parcel detail và audit read.
  5. Viết projection/privacy tests.
- **Acceptance Criteria:**
  - [ ] Given parcel có right active và encumbrance released, When GET detail đúng scope, Then response có hai summary đúng kiểu/nullable.
  - [ ] Given actor ngoài scope, When GET detail, Then `403 LAND_FORBIDDEN` và không trả geometry/rights/encumbrances.
  - [ ] Given response detail, When kiểm tra JSON, Then không có direct mutation command hoặc plaintext identity.
- **Test-skeleton:**
  - AC-01: parcel + right + released encumbrance → `rights.length=1`, `encumbrances[0].status=released`.
  - AC-02: other OU → HTTP 403, body không chứa `parcel`.
  - AC-03: detail response → có `geometry`, không có ciphertext/direct mutation field.
- **Rubric bắt buộc:** Projection chỉ dùng fields đã lock trong `api-contract.md`; không thêm endpoint/bảng.

### LND-04 — Land role/capability/Assignment policy

- **Status:** needs-triage
- **Blocked by:** LND-01
- **Loại:** feature
- **Lane:** full
- **Gate hướng:** có
- **File được phép sửa:** `src/modules/identity/contracts.ts`, `src/modules/identity/authorization.ts`, `src/modules/identity/assignments.ts`, `src/app/api/identity/assignments/route.ts`, `tests/identity/**`, `tests/land/**`
- **File cấm sửa:** `.env`, `.brain/**`, `prisma/migrations/**`, `docs/design/**`
- **Demo path:** `commune_leader` cấp/revoke `land_review`; officer chỉ truy cập hồ sơ được phân công cùng đơn vị.
- **Các bước thực hiện:**
  1. Thêm role/capability/task land vào identity catalog.
  2. Mở policy create/revoke Assignment cho `commune_leader` cùng OU.
  3. Thêm `land_review` compatibility và scope checks.
  4. Ghi audit/event Assignment theo seam hiện có.
  5. Viết authorization matrix tests.
- **Acceptance Criteria:**
  - [ ] Given leader cùng OU, When POST Assignment `land_review`, Then Assignment active được tạo cho officer cùng OU.
  - [ ] Given officer không có Assignment active, When review/sync/retry resource, Then `403 LAND_ASSIGNMENT_REQUIRED`.
  - [ ] Given leader khác OU hoặc officer tự tạo Assignment, When mutation, Then `403 LAND_FORBIDDEN` và không có row mới.
- **Test-skeleton:**
  - AC-01: leader OU-A + officer OU-A + application OU-A → Assignment active.
  - AC-02: officer không có Assignment → command denied, application version không đổi.
  - AC-03: leader OU-B target OU-A → HTTP 403, Assignment count không tăng.
- **Rubric bắt buộc:** Giữ identity route hiện có; chỉ mở rộng policy cần cho land, không bypass `evaluatePolicy`.

### LND-05 — Web screen-04 parcel/party workspace

- **Status:** needs-triage
- **Blocked by:** LND-02, LND-03, LND-04
- **Loại:** feature
- **Lane:** full
- **Gate hướng:** có
- **File được phép sửa:** `src/app/land/parcels/**`, `src/components/land/**`, `src/components/navigation/feature-registry.ts`, `tests/land-ui/**`
- **File cấm sửa:** `.env`, `.brain/**`, `.scratch/land-module/ui/**`
- **Demo path:** Internal user vào `/land/parcels`, mở detail, xem geometry/rights/encumbrances theo scope.
- **Các bước thực hiện:**
  1. Đăng ký route/feature land theo ModuleShell.
  2. Dựng parcel/party list, filter và cursor state.
  3. Dựng detail geometry/rights/encumbrances/Evidence placeholder.
  4. Áp dụng masked/forbidden/offline states theo screen-04.
  5. Viết UI contract tests.
- **Acceptance Criteria:**
  - [ ] Given internal actor có scope, When mở parcel detail, Then geometry/rights/encumbrances hiển thị và identity chỉ masked.
  - [ ] Given actor forbidden/offline/empty, When load screen, Then state tương ứng hiển thị và không lộ dữ liệu.
  - [ ] Given screen-04, When người dùng thao tác rights/encumbrances, Then không có direct mutation control.
- **Test-skeleton:**
  - AC-01: mock parcel detail + right/encumbrance → sections render đúng, không có ciphertext.
  - AC-02: API 403/empty/offline → denied/empty/offline state + retry theo brief.
  - AC-03: query UI controls → không tìm thấy button mutate right/encumbrance.
- **Rubric bắt buộc:** Bám `.scratch/land-module/ui/screen-04.md` và `design-tokens.md`; không tự thêm UI flow.

## Tiêu chí hoàn thành

- Given PostgreSQL có PostGIS, When chạy migration additive, Then tám bảng land, PostGIS geometry, FK `RESTRICT`, CHECK, unique/index và GiST index tồn tại.
- Given party hợp lệ, When gọi `POST /api/land/parties`, Then HTTP `201`, response không chứa ciphertext/identity number plaintext và database không lưu plaintext.
- Given Polygon invalid hoặc SRID sai, When gọi `POST /api/land/parcels`, Then HTTP `400 LAND_GEOMETRY_INVALID` và không có row mới.
- Given leader cùng OrganizationUnit, When tạo Assignment task `land_review`, Then officer cùng đơn vị có policy resource access; officer không có Assignment nhận `403 LAND_ASSIGNMENT_REQUIRED`.
- Given parcel có right active và encumbrance released, When gọi parcel detail nội bộ, Then response có đúng hai summary projection và không có direct mutation control.
- Given screen-04 ở loading/error/empty/forbidden/offline, When state tương ứng xảy ra, Then UI dùng handoff screen-04 và không lộ resource ngoài scope.

## Phụ thuộc giữa phase

- Phụ thuộc trước: `docs/design/land-module/LOCK.json` stage `full`; PostgreSQL image phải cung cấp PostGIS.
- Mở khóa cho: Phase 02 dùng `LandParty`, `LandParcel`, identity scope và `land_review` Assignment.
- UI constraint: handoff `screen-04.md` là nguồn duy nhất; Stitch chưa có rendered URL theo `ui/report.md:12-18`.
