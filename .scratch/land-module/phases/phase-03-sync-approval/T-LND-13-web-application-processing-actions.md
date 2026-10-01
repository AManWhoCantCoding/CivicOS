# LND-13 — Web screen-03 processing actions

- **Ticket ID:** LND-13
- **Status:** needs-triage
- **V6 effective status:** done
- **V3 status:** needs-triage
- **Blocked by:** LND-11, LND-12
- **Loại:** feature
- **Lane:** full
- **Gate hướng:** có
- **File được phép sửa:** `src/app/land/applications/[applicationId]/**`, `src/components/land/**`, `tests/land-ui/**`
- **File cấm sửa:** `.env`, `.brain/**`, `docs/design/**`, `.scratch/land-module/ui/**`
- **Demo path:** Officer xử lý sync/retry; leader approve/reject; terminal detail chỉ read-only.
- **Evidence/commit:** `8ec844a` (`feat: add land application processing screen`); UI and land-ui regression verification passed.

## Mô tả

Hoàn thiện screen-03 application detail, timeline và role/state-gated sync/retry/approve/reject actions.

## Các bước thực hiện

- [x] Dựng header/status/timeline/detail projection.
- [x] Kết nối sync/retry action với version header.
- [x] Kết nối approve/reject dialog theo role.
- [x] Implement stale/offline/forbidden/terminal states.
- [x] Viết role-gated UI tests.

## Acceptance Criteria

- [x] Given officer có Assignment, When application in_review/sync_failed, Then sync/retry action hiển thị đúng state.
- [x] Given leader pending_approval, When detail load, Then approve/reject visible; officer không thấy hai action.
- [x] Given completed/rejected/offline/stale, When detail/action state xảy ra, Then mutation control bị khóa và message/retry đúng.

## Test-skeleton

- AC-01: officer + assigned + sync_failed → retry visible; API success → status pending_approval.
- AC-02: leader + pending_approval → approve/reject visible; officer fixture → selectors absent.
- AC-03: terminal or 409/offline → controls disabled/hidden, state message and retry behavior match screen-03.

## Rubric bắt buộc

- [x] Bám screen-03 handoff; UI không tự quyết định quyền, chỉ phản ánh API/policy.

## Traceability

- Design: `.scratch/land-module/ui/screen-03.md`, `design-tokens.md`.
- Dependencies: LND-11 and LND-12.

## V6 reconciliation

- LND-11 and LND-12 were complete; this ticket was accepted after `8ec844a`.
- Successful processing mutations refresh the full detail/timeline projection instead of only local status/version fields.
