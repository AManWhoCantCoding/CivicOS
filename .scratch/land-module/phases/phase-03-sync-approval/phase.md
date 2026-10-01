# Phase 03 — Mock sync & approval

- **Workflow version:** V6
- **Effective status:** pending-gate
- **V3 source:** `phase-03-sync-approval.md` (migrated; ticket contracts split below)
- **Current frontier:** none; LND-10–LND-13 accepted
- **Gate:** pending; ticket-level verification exists for LND-10–LND-13.

## Phạm vi phase

Tích hợp `NationalLandAdapter` mock đồng bộ, success/failure/retry idempotent, leader approval/rejection và transaction hoàn tất quyền/thửa/ràng buộc. Hoàn thiện screen-03 web với role-gated actions. Phase này hoàn thiện F-03 và F-04.

## Tính năng thuộc phase

- F-03 — mock Cơ sở dữ liệu quốc gia, `LandNationalSync`, retry.
- F-04 — leader approve/reject và completed mutation.
- Phần UI screen-03 của F-02/F-06.

## SOW và phụ thuộc phase

- SOW mapping: F-03, F-04 và screen-03 trong `.scratch/land-module/sow.md` mục 3–5.
- Phụ thuộc trước: Phase 02 có application aggregate và review transition.
- Mở khóa cho: Phase 04 public lookup đọc trạng thái application; Phase 05 Evidence gắn application đã tồn tại.
- Mock fixture là test/server configuration; client không được gửi outcome mô phỏng.

## Phase DoD

- Sync success chuyển application tới `pending_approval` mà chưa mutate land aggregate.
- Sync failure trả `502 LAND_SYNC_FAILED`, lưu failure và không tạo Approval.
- Retry cùng request key tăng attempts, không tạo operation duplicate.
- Leader cùng OrganizationUnit approve/reject đúng role; completed mutation/event/audit atomic.
- Screen-03 action đúng role/state, terminal state read-only và conflict/offline không giả success.

## Ticket index

| ID | File V6 | Effective status | V3 status | Blocked by |
|---|---|---|---|---|
| LND-10 | `T-LND-10-national-land-adapter-mock.md` | done | needs-triage | LND-06, LND-08 |
| LND-11 | `T-LND-11-sync-retry-command-persistence.md` | done | needs-triage | LND-10 |
| LND-12 | `T-LND-12-approval-completion-transaction.md` | done | needs-triage | LND-11 |
| LND-13 | `T-LND-13-web-application-processing-actions.md` | done | needs-triage | LND-11, LND-12 |

## V6 reconciliation

- LND-10 được chấp nhận `done` theo `.brain/evidence/LND-10/review.md`, tests/digest và shared commit `e81c252`.
- LND-11 được accept sau `58e887e`; quyết định synchronous mock được ghi trong workflow-status.
- LND-12 được accept sau `862de7a`; LND-13 được accept sau `8ec844a`.
- Phase 03 đủ điều kiện chạy phase gate; chưa dispatch Phase 04 trước khi gate hoàn tất.
