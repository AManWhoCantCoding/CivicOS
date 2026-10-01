# LND-06 — Application aggregate create/list/detail

- **Ticket ID:** LND-06
- **Status:** done
- **V6 effective status:** done
- **V3 status:** needs-triage
- **Blocked by:** LND-01, LND-02, LND-04
- **Loại:** feature
- **Lane:** full
- **Gate hướng:** có
- **File được phép sửa:** `src/modules/land/**`, `src/app/api/land/applications/route.ts`, `src/app/api/land/applications/[applicationId]/route.ts`, `tests/land/**`
- **File cấm sửa:** `.env`, `.brain/**`, `docs/design/**`, `prisma/migrations/**`
- **Demo path:** Officer tạo/list/detail application `submitted` với links party/parcel.
- **Shared commit:** `e81c252`
- **Evidence:** `.brain/evidence/phase-02/gate.md`, `.brain/evidence/LND-07/tests.md`, `.brain/evidence/LND-08/tests.md`.

## Mô tả

Tạo aggregate/service và API create/list/detail application, giữ session-owned actor/organization, links party/parcel, idempotency boundary, event/audit transaction.

## Các bước thực hiện

- [x] Tạo application command/query service và response mapper.
- [x] Validate session/OrganizationUnit và required links.
- [x] Tạo GET list với filter/cursor và GET detail.
- [x] Tạo POST application với `Idempotency-Key` boundary.
- [x] Ghi event/audit trong transaction và viết tests.

## Acceptance Criteria

- [x] Given application payload hợp lệ, When POST create, Then HTTP `201`, status `submitted`, version `1` và links đúng.
- [x] Given query filter/cursor hợp lệ, When GET list, Then response có `items`/`nextCursor` đúng contract.
- [x] Given application ngoài scope, When GET detail, Then `403 LAND_FORBIDDEN` hoặc `LAND_ASSIGNMENT_REQUIRED` không lộ detail.

## Test-skeleton

- AC-01: transfer payload + links + idempotency header → application `submitted`, event/audit tồn tại.
- AC-02: status/changeType/limit/cursor query → items đúng filter, nextCursor nullable.
- AC-03: other OU application → HTTP 403, no `changePayload` in response.

## Rubric bắt buộc

- [x] Fields/envelopes khớp `api-contract.md`; createdBy/organization lấy session, không nhận tùy ý từ client.

## Traceability

- Design: `api-contract.md#post-apilandapplications`, `api-contract.md#get-apilandapplicationsapplicationid`, DR-06–DR-08.
- Phase gate: `.brain/evidence/phase-02/gate.md` — Phase 02 full gate PASS.
- Regression: LND-07/LND-08 evidence report LND-06 suites 30 passed.

## V6 reconciliation

- Effective `done` được chấp nhận từ Phase 02 gate, focused LND-06 regression evidence và shared commit `e81c252`.
