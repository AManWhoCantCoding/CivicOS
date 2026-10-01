# LND-19 — Land regression/security hardening

- **Ticket ID:** LND-19
- **Status:** needs-triage
- **V6 effective status:** blocked
- **V3 status:** needs-triage
- **Blocked by:** LND-01 đến LND-18 theo phase hoàn tất
- **Loại:** feature
- **Lane:** full
- **Gate hướng:** có
- **File được phép sửa:** `tests/land/**`, `tests/integration/**`, `tests/land-ui/**`, `tests/mobile/**`
- **File cấm sửa:** `.env`, `.brain/**`, `docs/design/**`, `prisma/migrations/**` trừ khi có BLOCKED-CONTRACT
- **Demo path:** Toàn bộ land demo pass regression matrix; không có PII/public redaction/concurrency/audit gap.
- **Evidence/commit:** chưa có.

## Mô tả

Chạy cross-feature regression/security matrix cho F-01–F-07, transaction/event/audit, public/mobile redaction, concurrency và no-hard-delete.

## Các bước thực hiện

- [ ] Chạy matrix API/state/idempotency/concurrency.
- [ ] Chạy authorization/Assignment/OrganizationUnit matrix.
- [ ] Chạy event/audit/transaction rollback assertions.
- [ ] Chạy web/mobile/public redaction/state assertions.
- [ ] Ghi kết quả test và mở blocker nếu contract thiếu.

## Acceptance Criteria

- [ ] Given full phase implementation, When chạy SOW AC matrix, Then F-01–F-07 assertions pass không skip/pending liên quan.
- [ ] Given public/mobile read paths, When kiểm tra JSON/UI tree, Then không có PII, polygon, sync payload, approval hoặc Evidence metadata.
- [ ] Given stale version, duplicate key, invalid transition hoặc transaction side-effect failure, When chạy regression, Then expected conflict/rollback và event/audit integrity pass.

## Test-skeleton

- AC-01: execute SOW mục 4 by F-01..F-07 → all expected status/code/state assertions pass.
- AC-02: public/mobile snapshots/contract bodies containing forbidden fields → assertion false for every forbidden field.
- AC-03: concurrency/idempotency/rollback fixtures → no duplicate rows, no half-committed domain/event/audit state.

## Rubric bắt buộc

- [ ] Không tự sửa design/code ngoài contract; mọi thiếu contract phải báo `BLOCKED-CONTRACT` cho Mentor/Research.

## Traceability

- Design: `edge-cases.md#ec-01-body-json-vượt-giới-hạn`, EC-06, EC-08, EC-20–EC-24, `non-functional.md`.
- Dependencies: Phase 01–04 and LND-17.

## V6 reconciliation

- Effective status `blocked`; no implementation/evidence/commit exists.
