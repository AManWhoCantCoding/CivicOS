# LND-04 — Land role/capability/Assignment policy

- **Ticket ID:** LND-04
- **Status:** done
- **V6 effective status:** done
- **V3 status:** needs-triage
- **Blocked by:** LND-01
- **Loại:** feature
- **Lane:** full
- **Gate hướng:** có
- **File được phép sửa:** `src/modules/identity/contracts.ts`, `src/modules/identity/authorization.ts`, `src/modules/identity/assignments.ts`, `src/app/api/identity/assignments/route.ts`, `tests/identity/**`, `tests/land/**`
- **File cấm sửa:** `.env`, `.brain/**`, `prisma/migrations/**`, `docs/design/**`
- **Demo path:** `commune_leader` cấp/revoke `land_review`; officer chỉ truy cập hồ sơ được phân công cùng đơn vị.
- **Shared commit:** `e81c252`
- **Evidence:** `.brain/evidence/LND-07/review.md`, `.brain/evidence/LND-08/review.md`, `.brain/evidence/phase-02/gate.md`.

## Mô tả

Mở rộng role/capability/policy và Assignment `land_review` cho land, giữ nguyên authorization seam và OrganizationUnit boundary.

## Các bước thực hiện

- [x] Thêm role/capability/task land vào identity catalog.
- [x] Mở policy create/revoke Assignment cho `commune_leader` cùng OU.
- [x] Thêm `land_review` compatibility và scope checks.
- [x] Ghi audit/event Assignment theo seam hiện có.
- [x] Viết authorization matrix tests.

## Acceptance Criteria

- [x] Given leader cùng OU, When POST Assignment `land_review`, Then Assignment active được tạo cho officer cùng OU.
- [x] Given officer không có Assignment active, When review/sync/retry resource, Then `403 LAND_ASSIGNMENT_REQUIRED` và không có row mới.
- [x] Given leader khác OU hoặc officer tự tạo Assignment, When mutation, Then `403 LAND_FORBIDDEN` và không có row mới.

## Test-skeleton

- AC-01: leader OU-A + officer OU-A + application OU-A → Assignment active.
- AC-02: officer không có Assignment → command denied, application version không đổi.
- AC-03: leader OU-B target OU-A → HTTP 403, Assignment count không tăng.

## Rubric bắt buộc

- [x] Giữ identity route hiện có; chỉ mở rộng policy cần cho land, không bypass `evaluatePolicy`.

## Traceability

- Design: `integration-contracts.md#identity-assignment-và-authorization`; DR-09–DR-11.
- Implementation/test: shared commit `e81c252`.
- Regression evidence: LND-07/LND-08 targeted sets include LND-04 assignment coverage; Phase 02 full gate PASS.

## V6 reconciliation

- Effective `done` được reconcile theo shared commit và targeted Assignment regression evidence được người dùng cho phép dùng ở option 2.
- Không có evidence directory riêng LND-04; traceability giữ nguyên references hiện có, không tạo evidence giả.
