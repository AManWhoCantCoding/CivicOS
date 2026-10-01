# LND-11 — Sync/retry command và persistence

- **Ticket ID:** LND-11
- **Status:** needs-triage
- **V6 effective status:** pending/frontier
- **V3 status:** needs-triage
- **Blocked by:** LND-10
- **Loại:** feature
- **Lane:** full
- **Gate hướng:** có
- **File được phép sửa:** `src/modules/land/**`, `src/app/api/land/applications/[applicationId]/sync/**`, `tests/land/**`
- **File cấm sửa:** `.env`, `.brain/**`, `docs/design/**`, `prisma/schema.prisma`
- **Demo path:** Officer sync application và retry failure bằng cùng request key.
- **Evidence/commit:** chưa có; chưa dispatch.

## Mô tả

Persist `LandNationalSync`, implement sync/retry state transitions, stable request key, event/audit và error mapping.

## Các bước thực hiện

- [ ] Tạo `LandNationalSync` persistence/service.
- [ ] Implement sync transition và request key generation.
- [ ] Implement retry chỉ từ `sync_failed`.
- [ ] Ghi event/audit và map HTTP/error messages.
- [ ] Viết success/failure/retry/concurrency tests.

## Acceptance Criteria

- [ ] Given in_review + success fixture, When POST sync, Then application `pending_approval`, sync `succeeded`, no right mutation.
- [ ] Given failure fixture, When POST sync, Then HTTP `502 LAND_SYNC_FAILED`, application `sync_failed`, no Approval.
- [ ] Given sync_failed, When retry with same request key, Then attempts tăng và sync operation không duplicate.

## Test-skeleton

- AC-01: app in_review + current version + success → sync row success, status pending_approval, LandRight unchanged.
- AC-02: failure → 502/body code, approval count 0, app status sync_failed.
- AC-03: retry same app/key twice → one operation row, attempts monotonic, expected final state.

## Rubric bắt buộc

- [ ] State machine/unique request key khớp `data-model.md`; sync success không mutate land aggregate.

## Traceability

- Design: `api-contract.md#post-apilandapplicationsapplicationidsync`, `api-contract.md#post-apilandapplicationsapplicationidsyncretry`, DR-16–DR-17.
- Dependency evidence: LND-10 `REVIEW-PASS`.

## V6 reconciliation

- Đây là current frontier sau khi LND-10 được reconcile `done`.
- Không có source/evidence/commit được gán cho ticket này.
