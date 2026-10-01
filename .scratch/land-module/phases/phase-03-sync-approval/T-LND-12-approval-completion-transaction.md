# LND-12 — Approval/completion transaction

- **Ticket ID:** LND-12
- **Status:** needs-triage
- **V6 effective status:** blocked
- **V3 status:** needs-triage
- **Blocked by:** LND-11
- **Loại:** feature
- **Lane:** full
- **Gate hướng:** có
- **File được phép sửa:** `src/modules/land/**`, `src/app/api/land/applications/[applicationId]/approve/**`, `src/app/api/land/applications/[applicationId]/reject/**`, `tests/land/**`
- **File cấm sửa:** `.env`, `.brain/**`, `docs/design/**`, `prisma/schema.prisma`
- **Demo path:** Leader approve hoàn tất hoặc reject có reason; tất cả mutation/event/audit atomic.
- **Evidence/commit:** chưa có; blocked bởi LND-11.

## Mô tả

Implement leader approve/reject và completed land mutation cho bốn change type trong một transaction cùng Approval/EventRecord/AuditEvent.

## Các bước thực hiện

- [ ] Implement leader scope/role check.
- [ ] Implement approval/rejection validation.
- [ ] Apply completed effects cho transfer/info/mortgage/split-merge.
- [ ] Append Approval/EventRecord/AuditEvent trong một transaction.
- [ ] Test commit/rollback/terminal behavior.

## Acceptance Criteria

- [ ] Given pending_approval + leader cùng OU, When approve current version, Then application completed và land effects commit cùng event/audit.
- [ ] Given reject reason rỗng, When reject, Then `400 LAND_INVALID_REQUEST`, state/mutations unchanged.
- [ ] Given non-leader/other OU/terminal application, When approve/reject, Then correct 403/409 và không tạo Approval mới.

## Test-skeleton

- AC-01: pending approval transfer → rights ended/new shares total 100, parcel state, approval/event/audit committed.
- AC-02: reason whitespace → 400, app remains pending_approval, no domain rows changed.
- AC-03: injected event/audit failure → transaction rollback app/land/approval rows.

## Rubric bắt buộc

- [ ] Completed mutation đúng ADR-0001, không hard-delete và rollback atomic.

## Traceability

- Design: approve/reject endpoints in `api-contract.md`, DR-18–DR-19, ADR-0001.
- Dependency: LND-11 must pass first.

## V6 reconciliation

- Effective status `blocked`; no implementation or evidence is attributed to LND-12.
