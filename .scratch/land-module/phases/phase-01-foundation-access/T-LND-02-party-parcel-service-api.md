# LND-02 — Party/parcel service và API

- **Ticket ID:** LND-02
- **Status:** done
- **V6 effective status:** done
- **V3 status:** needs-triage
- **Blocked by:** LND-01
- **Loại:** feature
- **Lane:** full
- **Gate hướng:** có
- **File được phép sửa:** `src/modules/land/**`, `src/app/api/land/parties/**`, `src/app/api/land/parcels/route.ts`, `tests/land/**`
- **File cấm sửa:** `.env`, `.brain/**`, `docs/design/**`, `prisma/migrations/**`
- **Demo path:** `land_officer` tạo/list party và parcel hợp lệ qua API contract.
- **Shared commit:** `e81c252` (`feat(land): add parcel and application workflows`)
- **Evidence:** `.brain/evidence/LND-02/{changes,tests,review,digest}.md`

## Mô tả

Tạo party/parcel service và API nội bộ theo scope OrganizationUnit, mã hóa party, geometry SQL parameterized và response contract.

## Các bước thực hiện

- [x] Tạo party repository/service dùng encryption và blind index hiện có.
- [x] Tạo parcel repository/service dùng geometry SQL seam.
- [x] Tạo route GET/POST parties và GET/POST parcels.
- [x] Map lỗi sang `LAND_*` message tiếng Việt.
- [x] Viết API/service tests.

## Acceptance Criteria

- [x] Given party hợp lệ, When POST parties, Then `201`, status `active`, response chỉ có `identityNumberMasked`.
- [x] Given parcel Polygon valid, When POST parcels, Then `201`, version `1`, `nationalRecordRef=null`.
- [x] Given actor ngoài scope, When GET/POST resource, Then `403 LAND_FORBIDDEN` và không lộ dữ liệu.

## Test-skeleton

- AC-01: displayName/identityNumber plaintext input → DB ciphertext + response masked.
- AC-02: GeoJSON Polygon SRID 4326 + area `125.50` → row/response hợp lệ.
- AC-03: user khác OrganizationUnit → HTTP 403, body không có resource.

## Rubric bắt buộc

- [x] Response khớp `api-contract.md`; không trả ciphertext/storage internals; parameterized geometry SQL.

## Traceability

- Design: `api-contract.md#post-apilandparties`, `api-contract.md#post-apilandparcels`, DR-02–DR-05.
- Review: `.brain/evidence/LND-02/review.md` — `REVIEW-PASS`.
- Verification: `.brain/evidence/LND-02/digest.md` — DB-gated 29/29, scoped typecheck/lint/Prettier PASS.

## V6 reconciliation

- Effective `done` dùng review/evidence của ticket và shared commit `e81c252` theo quyết định option 2.
- `files-changed.md` riêng không tồn tại; `changes.md` và shared commit là traceability record được giữ nguyên.
