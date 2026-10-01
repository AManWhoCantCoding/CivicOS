# Plan Check B9 — Ticket LND-02 (land-module): Party/parcel service và API

## Diễn đạt lại ticket (tối đa 5 dòng)

- Mục tiêu: dựng service + API nội bộ tạo/list `LandParty` và `LandParcel` cho `land_officer`/`commune_leader` cùng `OrganizationUnit`, đúng API contract đã khóa.
- File được phép sửa: `src/modules/land/**`, `src/app/api/land/parties/**`, `src/app/api/land/parcels/route.ts`, `tests/land/**`; cấm chạm `.env`, `.brain/**` (ngoài plan này), `docs/design/**`, `prisma/migrations/**`.
- AC chính: AC-01 POST parties → `201`, `status=active`, chỉ trả `identityNumberMasked`; AC-02 POST parcels Polygon hợp lệ → `201`, `version=1`, `nationalRecordRef=null`; AC-03 actor ngoài scope → `403 LAND_FORBIDDEN`, không lộ dữ liệu.
- Rubric: response khớp `api-contract.md`; không trả ciphertext/storage internals; geometry SQL phải parameterized.
- Trạng thái: CHƯA viết code, CHƯA sửa test sản phẩm; artifact duy nhất của lần giao này là plan.md.

## 1. File dự định sửa/tạo

| # | File | Tạo mới / Sửa | Nội dung dự kiến |
|---|---|---|---|
| 1 | `src/modules/land/schemas.ts` | Tạo mới | Parse/validate input POST parties/parcels và query list (status/partyType/communeCode/parcelCode/limit/cursor); `DecimalString` tối đa 2 thập phân; type-guard GeoJSON `Polygon`. |
| 2 | `src/modules/land/errors.ts` | Tạo mới | `toLandApiError`: map `Error.message` nội bộ → `{ code: LAND_*, error: <tiếng Việt>, status }` theo bảng mã lỗi `api-contract.md`. |
| 3 | `src/modules/land/party-repository.ts` | Tạo mới | CRUD `LandParty` qua Prisma client hiện có; gọi `encryptSensitive`/`blindIndex` khi ghi, `decryptSensitive` khi đọc nội bộ; không bao giờ select plaintext (DB chỉ có ciphertext). |
| 4 | `src/modules/land/party-service.ts` | Tạo mới | `createParty`/`listParties`: kiểm tra role+scope, gọi repository, map response `Party`; `displayName` chỉ giải mã khi `assertCanViewPartySensitive` cho phép (fail-closed `403 LAND_FORBIDDEN` nếu thiếu `read_sensitive`), `identityNumber` luôn chỉ trả masked, không trả ciphertext/index. |
| 5 | `src/modules/land/parcel-geometry.ts` | Tạo mới | Validate GeoJSON `Polygon` (đúng type, vòng khép, đủ điểm, không nhận `Point`); build tham số geometry cho SQL (`ST_SetSRID(ST_GeomFromGeoJSON($n),4326)` + `ST_IsValid`), parse `ST_AsGeoJSON` khi đọc. |
| 6 | `src/modules/land/parcel-repository.ts` | Tạo mới | Ghi/đọc `LandParcel` bằng `$executeRaw`/`$queryRaw` **parameterized** (không nối chuỗi SQL từ input); cột `geometry` kiểu `Unsupported("geometry(Polygon,4326)")` theo schema LND-01. |
| 7 | `src/modules/land/parcel-service.ts` | Tạo mới | `createParcel`/`listParcels`: kiểm tra role+scope, validate `areaSqm > 0` + geometry, gọi repository, map response `Parcel` (`status`, `version=1`, `nationalRecordRef=null` khi tạo). |
| 8 | `src/modules/land/access.ts` | Tạo mới | Guard dùng chung LND-02: `requireLandActor` — session bắt buộc, role thuộc `{land_officer, commune_leader}`, `organizationId` lấy từ session làm scope; `assertCanViewPartySensitive(user, organizationId)` — kiểm tra capability `read_sensitive` qua seam `canViewSensitive` hiện có (chỉ import, không sửa `src/modules/identity/*`); thiếu capability → ném `LAND_FORBIDDEN` (fail-closed, không trả `displayName`). Cấp capability cho role land thuộc LND-04. |
| 9 | `src/modules/land/index.ts` | Tạo mới | Public surface hẹp: chỉ re-export service + error mapper; che repository/geometry internals (dependency/refactor bắt buộc, xem mục 4). |
| 10 | `src/app/api/land/parties/route.ts` | Tạo mới | `GET` list cursor + `POST` create; shape `{ items, nextCursor }` / `{ party }`, status `200`/`201`; catch → `toLandApiError`. |
| 11 | `src/app/api/land/parcels/route.ts` | Tạo mới | `GET` list cursor + `POST` create; shape `{ items, nextCursor }` / `{ parcel }`, status `200`/`201`; catch → `toLandApiError`. |
| 12 | `tests/land/lnd02-party-parcel.test.ts` | Tạo mới | Test theo test-skeleton ticket (contract + privacy + scope + geometry invalid) cộng case thiếu `read_sensitive` → `403` và body không có `displayName`; phần cần DB đánh dấu DB-gated (`RUN_DB_TESTS`), phần pure (mask/validate/error-map) chạy không DB. CHƯA viết trong lần giao này. |

Không sửa: `prisma/schema.prisma`, `prisma/migrations/**`, `src/modules/identity/**`, `src/app/api/land/parcels/[parcelId]/**` (LND-03), application/sync/approval/public-lookup/Evidence/UI (phase sau).

## 2. Hàm/interface sẽ đổi (toàn bộ là tạo mới, không sửa hàm hiện có)

- `schemas.ts`: `parsePartyInput(value: unknown)`, `parseParcelInput(value: unknown)`, `parseLandListQuery(value: unknown)` (1 dòng mô tả mỗi hàm khi viết code).
- `errors.ts`: `toLandApiError(error: unknown): { status: number; code: string; error: string }`.
- `party-repository.ts`: `insertParty(row)`, `findPartiesByOrganization(...)`, `findPartyById(...)` (làm việc trên ciphertext + blind index).
- `party-service.ts`: `createParty(input, actor)`, `listParties(query, actor)`; helper `maskIdentityNumber(value: string | null): string | null` (giữ 4 ký tự cuối, còn lại `*`); helper `resolveDisplayName(row, actor)` (chỉ `decryptSensitive` khi `assertCanViewPartySensitive` pass, ngược lại ném `LAND_FORBIDDEN` — không tự bịa shape masked/omitted vì contract không định nghĩa).
- `parcel-geometry.ts`: `validateParcelPolygon(geometry: unknown): asserts`, `toGeometryParam(geometry)` (trả chuỗi GeoJSON + SRID cho placeholder `$n`), `fromGeometryJson(stAsGeoJson: string)`.
- `parcel-repository.ts`: `insertParcel(row, geometryParam)`, `findParcelsByOrganization(...)` (đọc kèm `ST_AsGeoJSON(geometry)`).
- `parcel-service.ts`: `createParcel(input, actor)`, `listParcels(query, actor)`; tái sử dụng `Decimal`/`areaSqm` CHECK của DB (`areaSqm > 0`, precision `DECIMAL(14,2)`).
- `access.ts`: `requireLandActor(): Promise<IdentityUser & { organizationUnitId: string }>`; helper `denyScope()` ném `LAND_FORBIDDEN`; helper `assertCanViewPartySensitive(user, organizationId): Promise<void>` (gọi `canViewSensitive(user, { resourceType: 'LandParty', resourceId: '*', organizationId })`, chỉ import từ `@/modules/identity`, không sửa identity; fail-closed theo bài học `Lesson-learned.md:3` — đủ role + đúng OU + đủ capability mới mở `displayName`).
- Route: `GET(request)`, `POST(request)` ở cả hai route parties/parcels (mỏng: gọi guard → parse → service → `NextResponse.json`).
- Kiểu dùng chung: `LandActor` (IdentityUser + organizationId bắt buộc), `PartyResponse`/`ParcelResponse` khớp bảng `Party`/`Parcel` trong `api-contract.md` (không thêm trường).

Tái sử dụng, không viết lại: `getCurrentUser` (`src/modules/identity/session.ts:43`), `encryptSensitive`/`decryptSensitive`/`blindIndex` (`src/modules/identity/encryption.ts:18-50`), `prisma` (`@/lib/prisma`), shape lỗi `{ code, error }` theo `src/app/api/establishments/route.ts:12-29` và `api-contract.md#quy-ước-chung`.

## 3. Luồng xử lý

1. Route nhận request → `getCurrentUser()`; thiếu session → `401 LAND_UNAUTHENTICATED` (không chạm service).
2. `requireLandActor`: role phải là `land_officer` hoặc `commune_leader` (so sánh tên role dạng string, không sửa `contracts.ts`); `organizationUnitId` từ session là scope; sai role/scope → `403 LAND_FORBIDDEN`, không tiết lộ resource (AC-03).
3. Parse input bằng `schemas.ts`: thiếu/sai field → `400 LAND_INVALID_REQUEST`; `referenceCode`/`parcelCode` để DB unique xử lý duplicate ở bước 5.
4. Party: service mã hóa `displayName`/`identityNumber` bằng `encryptSensitive`, tính `identityNumberIndex = blindIndex(identityNumber)` (null thì bỏ qua); Parcel: validate GeoJSON `Polygon` + `areaSqm` (`DecimalString`, `> 0`) → sai hình học/SRID → `400 LAND_GEOMETRY_INVALID`, không tạo row.
5. Repository ghi trong transaction Prisma: vi phạm unique (`referenceCode`/`parcelCode`/`identityNumberIndex`/cặp `(organizationId,mapSheetNumber,parcelNumber)`) → `409 LAND_DUPLICATE_CODE`, rollback, không tạo row thứ hai; geometry ghi qua SQL parameterized (`ST_SetSRID(ST_GeomFromGeoJSON($n),4326)`), DB CHECK `ST_IsValid` + `ST_SRID=4326` là lưới cuối.
6. Map response: Party → `{ id, referenceCode, partyType, displayName, identityNumberMasked, status=active, createdAt, updatedAt }`; trước khi giải mã `displayName` phải pass `assertCanViewPartySensitive` (capability `read_sensitive` theo `api-contract.md:121` + ghi chú `Party.displayName` tại `api-contract.md:22`); thiếu capability → `403 LAND_FORBIDDEN`, không trả `displayName`/plaintext/masked thay thế. Parcel → full `Parcel` (`status`, `version=1`, `nationalRecordRef=null`, `geometry` GeoJSON, `organizationId` từ session); tuyệt đối không trả `*Ciphertext`, `*Index`, `storageKey` hay internals.
7. List `GET`: filter trong `organizationId` của actor + query tùy chọn, cursor pagination (`limit` default 50/max 100, `nextCursor` nullable); actor ngoài scope ở bước 2 đã bị chặn nên list không bao giờ lộ resource ngoài đơn vị.
8. Mọi lỗi service ném `Error` mã nội bộ → route catch → `toLandApiError` → body `{ code, error }` tiếng Việt đúng bảng mã lỗi; `GET` không mutation; audit create/read nhạy cảm qua `recordAudit` hiện có (dependency, xem mục 4).

## 4. Bảng map từng thay đổi ↔ dòng AC cụ thể

| File / thay đổi | Map tới AC / Rubric / DR | AC nào không map trực tiếp → lý do dependency/refactor bắt buộc |
|---|---|---|
| `schemas.ts` (parse party/parcel/list) | AC-01 (party hợp lệ → 201), AC-02 (parcel valid → 201), Rubric “response khớp api-contract” (request/response shape `POST /api/land/parties`, `POST /api/land/parcels`, `GET` list) | — |
| `party-repository.ts` + `encryptSensitive`/`blindIndex` | AC-01 + test-skeleton “plaintext input → DB ciphertext + response masked”; DR-02 (LandParty riêng), DR-03 (ciphertext/blind-index/mask) | — |
| `party-service.ts` + `maskIdentityNumber` | AC-01 (`status=active`, chỉ có `identityNumberMasked`); DR-05 (`409 LAND_DUPLICATE_CODE`) | — |
| `parcel-geometry.ts` + `parcel-repository.ts` (parameterized SQL) | AC-02 (Polygon valid → `201`, `version=1`, `nationalRecordRef=null`); Rubric “parameterized geometry SQL”; DR-04 (`LAND_GEOMETRY_INVALID`); EC-02 | — |
| `parcel-service.ts` | AC-02; DR-05 (duplicate `parcelCode`) | — |
| `access.ts` (role `{land_officer, commune_leader}` + OU scope) | AC-03 (`403 LAND_FORBIDDEN`, không lộ dữ liệu); DR-09 (scope + role cán bộ) | Không map full DR-10/DR-11 (Assignment `land_review` do leader cấp): cố ý HOÃN sang LND-04 theo phase (`phase-01-foundation-access.md:19,24-27`); LND-02 chỉ chặn theo role+OU, không tự tạo policy Assignment để không vượt scope ticket. |
| `access.ts::assertCanViewPartySensitive` + `party-service.ts::resolveDisplayName` (gate `read_sensitive` cho `displayName`) | Rubric “response khớp api-contract” (Auth `GET /api/land/parties` tại `api-contract.md:121`: capability `read_sensitive` nếu response cần `displayName`; ghi chú `Party.displayName` tại `api-contract.md:22`); DR-03 (chỉ trả mask identity, giải mã có kiểm soát); AC-01 (response parties đúng shape), AC-03 (thiếu capability → `403`, không lộ `displayName`) | Việc CẤP `read_sensitive` cho role land là dependency bắt buộc thuộc LND-04 (`contracts.ts`/`authorization.ts` + `non-functional.md#security`: `land_officer`/`commune_leader` có `read_sensitive`); LND-02 chỉ TIÊU THỤ seam `canViewSensitive` hiện có ở chế độ read-only, fail-closed khi capability chưa được cấp (role lạ → `ROLE_CAPABILITY_DENIED` → `403`), không tự cấp capability và không sửa `src/modules/identity/*`. |
| `parties/route.ts` + `parcels/route.ts` (`GET`/`POST`) | AC-01 (201 parties), AC-02 (201 parcels), AC-03 (GET/POST ngoài scope → 403); Rubric response khớp contract (status code + shape) | — |
| `errors.ts` (`LAND_*` tiếng Việt) | AC-03 (`403 LAND_FORBIDDEN`); Rubric “map lỗi sang LAND_* message tiếng Việt” (ticket bước 4); bảng mã lỗi `api-contract.md:433-457` | Không map 1 AC đơn lẻ mà map Rubric + toàn bộ AC (mọi nhánh lỗi) — đây là dependency bắt buộc theo ticket bước 4, không phải đoán thêm. |
| `index.ts` (public surface hẹp) | Rubric “không trả ciphertext/storage internals” (che internals ở boundary export) | Không map AC trực tiếp → refactor bắt buộc: ngăn route/test import nhầm repository/geometry internals; pattern theo `src/modules/identity/index.ts`. |
| Audit qua `recordAudit` hiện có (ghi khi POST parties/parcels + GET sensitive) | Không map AC trực tiếp → dependency bắt buộc theo `non-functional.md#logging` (“ghi AuditEvent cho create/read sensitive”) và DR-19/DR-03 (metadata không chứa plaintext); tái sử dụng seam `src/modules/identity/audit.ts`, không tạo worker/event mới; nếu Mentor yêu cầu tối thiểu hơn thì cắt ở implement mà không ảnh hưởng AC. |
| `tests/land/lnd02-party-parcel.test.ts` | AC-01 (ciphertext + masked), AC-02 (SRID 4326 + area `125.50`), AC-03 (khác OU → 403, body không có resource) + gate `read_sensitive` (thiếu capability → 403, body không có `displayName`) | — (CHƯA viết trong lần giao B9 này). |

## Đối chiếu Rubric (ticket LND-02)

- “Response khớp `api-contract.md`”: `Party` đủ 8 field (`id, referenceCode, partyType, displayName, identityNumberMasked, status, createdAt, updatedAt`); `displayName` chỉ xuất hiện khi actor pass gate `read_sensitive` (`api-contract.md:22,121`), ngược lại fail-closed `403 LAND_FORBIDDEN` thay vì bịa shape thiếu field; `Parcel` đủ field (`...geometry, nationalRecordRef, status, version...`); list `{ items, nextCursor }` với `limit` default 50/max 100; lỗi `{ code, error }` tiếng Việt.
- “Không trả ciphertext/storage internals”: response mapper loại bỏ `displayNameCiphertext`, `identityNumberCiphertext`, `identityNumberIndex`; không có `storageKey` (LND-02 không đụng Evidence); audit metadata không ghi plaintext (DR-03/DR-19).
- “Parameterized geometry SQL”: mọi giá trị geometry đi qua placeholder `$n` (`ST_GeomFromGeoJSON`), không nối chuỗi SQL từ input (`data-model.md#8-migration` mục 6); validation service + CHECK DB là hai lớp phòng thủ.

## Boundary / ADR / API contract / PII / Geometry seam

- **Boundary (phase + ticket)**: LND-02 chỉ làm F-01 tạo/list party+parcel; KHÔNG làm parcel detail rights/encumbrances (LND-03), KHÔNG mở rộng identity policy/Assignment (LND-04), KHÔNG làm application/sync/approve/reject/public-lookup/Evidence/UI. Route parcels chỉ `route.ts` (list+create), không tạo `[parcelId]`. Không chạm `prisma/*`, `src/modules/identity/*`.
- **ADR-0001 (`docs/adr/0001-land-module-boundaries.md`)**: (a) `LandChangeApplication` là aggregate điều phối — LND-02 không tạo/mutate application nên không phát sinh event workflow; (b) geometry qua SQL parameterized seam vì Prisma `Unsupported("geometry(Polygon,4326)")` — đúng `parcel-repository.ts`; (c) adapter quốc gia mock tách riêng — LND-02 không đụng `LandNationalSync`; (d) không public hóa polygon/PII — LND-02 chỉ trả geometry cho internal role cùng OU.
- **API contract**: `GET/POST /api/land/parties` + `GET/POST /api/land/parcels` (bảng endpoint `api-contract.md:89-94`); auth `land_officer`/`commune_leader`, riêng `GET /api/land/parties` yêu cầu thêm capability `read_sensitive` khi response cần `displayName` (`api-contract.md:121`); mã lỗi dùng `LAND_UNAUTHENTICATED/ LAND_FORBIDDEN/ LAND_INVALID_REQUEST/ LAND_GEOMETRY_INVALID/ LAND_DUPLICATE_CODE`; `Idempotency-Key` KHÔNG bắt buộc ở hai endpoint này (chỉ bắt buộc cho create application).
- **PII seam**: `encryptSensitive`/`blindIndex` khi ghi, `decryptSensitive` + mask khi đọc (`src/modules/identity/encryption.ts:18-50`); giải mã `displayName` bị gate bởi `assertCanViewPartySensitive` (`canViewSensitive` read-only, fail-closed theo `Lesson-learned.md:3`); `identityNumberIndex` UNIQUE partial chống trùng không lộ plaintext; `identityNumberMasked` null khi không có identity number, ngược lại giữ 4 ký tự cuối; seed/demo không PII thật (kế thừa LND-01).
- **Geometry seam**: PostGIS `geometry(Polygon,4326)` + GiST + CHECK `ST_IsValid`/`ST_SRID=4326` đã có từ migration LND-01 (`prisma/schema.prisma:548-572`); LND-02 chỉ đọc/ghi qua seam parameterized, từ chối `Point`/SRID sai/vòng không khép/self-intersection (DR-04, EC-02).

## Điểm không có trong thiết kế

không có.
