# LND-19 — Land regression/security hardening

- **Ticket ID:** LND-19
- **Status:** done
- **V6 effective status:** done
- **V3 status:** needs-triage
- **Blocked by:** none; LND-01 đến LND-18 đã hoàn tất
- **Loại:** feature
- **Lane:** full
- **Gate hướng:** có
- **File được phép sửa:** `tests/land/**`, `tests/integration/**`, `tests/land-ui/**`, `tests/mobile/**`
- **File cấm sửa:** `.env`, `.brain/**`, `docs/design/**`, `prisma/migrations/**` trừ khi có BLOCKED-CONTRACT
- **Demo path:** Toàn bộ land demo pass regression matrix; không có PII/public redaction/concurrency/audit gap.
- **Evidence/commit:** implementation commit `1cde325`; test `tests/land/lnd06-application.test.ts:696-742`.

## Mô tả

Chạy cross-feature regression/security matrix cho F-01–F-07, transaction/event/audit, public/mobile redaction, concurrency và no-hard-delete.

## Các bước thực hiện

- [x] Chạy matrix API/state/idempotency/concurrency.
- [x] Chạy authorization/Assignment/OrganizationUnit matrix.
- [x] Chạy event/audit/transaction rollback assertions.
- [x] Chạy web/mobile/public redaction/state assertions.
- [x] Ghi kết quả test và mở blocker nếu contract thiếu.

## Acceptance Criteria

- [x] Given full phase implementation, When chạy SOW AC matrix, Then F-01–F-07 assertions pass không skip/pending liên quan.
- [x] Given public/mobile read paths, When kiểm tra JSON/UI tree, Then không có PII, polygon, sync payload, approval hoặc Evidence metadata.
- [x] Given stale version, duplicate key, invalid transition hoặc transaction side-effect failure, When chạy regression, Then expected conflict/rollback và event/audit integrity pass.

## Test-skeleton

- AC-01: execute SOW mục 4 by F-01..F-07 → all expected status/code/state assertions pass.
- AC-02: public/mobile snapshots/contract bodies containing forbidden fields → assertion false for every forbidden field.
- AC-03: concurrency/idempotency/rollback fixtures → no duplicate rows, no half-committed domain/event/audit state.

## Rubric bắt buộc

- [x] Không tự sửa design/code ngoài contract; mọi thiếu contract phải báo `BLOCKED-CONTRACT` cho Mentor/Research.

## Traceability

- Design: `edge-cases.md#ec-01-body-json-vượt-giới-hạn`, EC-06, EC-08, EC-20–EC-24, `non-functional.md`.
- Dependencies: Phase 01–04 and LND-17.

## V6 reconciliation

- Effective status `done`; hardening test-only tại `tests/land/lnd06-application.test.ts:696-742` xác nhận tám concurrent same-key retries trả cùng application, chỉ một row/event/audit.
- Ticket verification: LND-06 database slice `31 passed`; `tests/integration/parallel-wave.integration.test.ts` `30 passed`; land/integration/land-ui matrix `25 files passed`, `321 passed`, `5 skipped` (chỉ các disposable replay tests không được bật bởi replay opt-in).
- Deterministic checks: `npm run typecheck`, ESLint file-scope và Prettier file-scope đều exit `0`. Các Prisma unique/check/FK errors xuất hiện trong negative/concurrency assertions nhưng toàn bộ command exit `0`.
