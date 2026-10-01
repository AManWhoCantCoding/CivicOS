# LND-14 — Public lookup projection/rate limit

- **Ticket ID:** LND-14
- **Status:** needs-triage
- **V6 effective status:** pending/frontier
- **V3 status:** needs-triage
- **Blocked by:** LND-06, LND-08, LND-11, LND-12
- **Loại:** feature
- **Lane:** full
- **Gate hướng:** có
- **File được phép sửa:** `src/modules/land/**`, `src/app/api/public/land/lookup/**`, `tests/land/**`, `tests/integration/**`
- **File cấm sửa:** `.env`, `.brain/**`, `docs/design/**`, `docs/research/**`
- **Demo path:** Anonymous user lookup bằng một application/parcel code nhận projection tối thiểu.
- **Evidence/commit:** chưa có; Phase 03 completed with `PHASE-PASS`.

## Mô tả

Tạo public lookup read projection, mutual-exclusive query validation, rate limit và redacted error/response boundary.

## Các bước thực hiện

- [ ] Tạo read query projection không join field nhạy cảm.
- [ ] Validate mutual-exclusive query params.
- [ ] Thêm rate limit `60 requests/minute/IP`.
- [ ] Map not-found/invalid/rate-limit message tiếng Việt.
- [ ] Viết redaction/rate-limit contract tests.

## Acceptance Criteria

- [ ] Given đúng một code tồn tại, When GET public lookup, Then HTTP `200`, đúng 8 field và `simulated=true`.
- [ ] Given không có hoặc có cả hai code, When lookup, Then `400 LAND_LOOKUP_QUERY_INVALID` và không query detail.
- [ ] Given unknown code/IP vượt quota, When lookup, Then `404 LAND_LOOKUP_NOT_FOUND` hoặc `429 LAND_RATE_LIMITED`, không lộ nội bộ.

## Test-skeleton

- AC-01: `applicationCode=APP-001` → 8 fields, simulated true, no party/address/polygon.
- AC-02: both query params → 400; DB query spy không gọi detail.
- AC-03: missing code/unknown code/61st request → expected 400/404/429 and safe error body.

## Rubric bắt buộc

- [ ] Projection bám API contract/DR-20; rate limit không tạo auth/session requirement.

## Traceability

- Design: `api-contract.md#get-apipubliclandlookup`, DR-20, `non-functional.md#giới-hạn`.
- Dependencies: LND-11/LND-12 must complete.

## V6 reconciliation

- Effective status `pending/frontier`; eligible after contract preflight, with no implementation/evidence/commit yet.
