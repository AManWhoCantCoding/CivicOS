# Phase 03 — Mock sync & approval

## Phạm vi phase

Tích hợp `NationalLandAdapter` mock đồng bộ, success/failure/retry idempotent, leader approval/rejection và transaction hoàn tất quyền/thửa/ràng buộc. Hoàn thiện screen-03 web với role-gated actions. Phase này hoàn thiện F-03 và F-04.

## Tính năng thuộc phase

- F-03 — mock Cơ sở dữ liệu quốc gia, `LandNationalSync`, retry.
- F-04 — leader approve/reject và completed mutation.
- Phần UI screen-03 của F-02/F-06.

## Ticket list dự kiến

| ID | Ticket | Demo path sau ticket | Tham chiếu design | Phụ thuộc |
|---|---|---|---|---|
| LND-10 | NationalLandAdapter mock | Application `in_review` gọi fixture success/failure; không gọi network thật. | `integration-contracts.md#mock-adapter-cơ-sở-dữ-liệu-quốc-gia-về-đất-đai`; ADR-0001 | Phase 02 |
| LND-11 | Sync/retry command và persistence | Success tới `pending_approval`; failure tới `sync_failed`; retry cùng request key không duplicate. | `api-contract.md#post-apilandapplicationsapplicationidsync`; `api-contract.md#post-apilandapplicationsapplicationidsyncretry`; DR-16–DR-17 | LND-10 |
| LND-12 | Approval/completion transaction | Leader approve/reject đúng scope; completed cập nhật right/parcel/encumbrance cùng event/audit. | `api-contract.md#post-apilandapplicationsapplicationidapprove`; `api-contract.md#post-apilandapplicationsapplicationidreject`; DR-18–DR-19; ADR-0001 | LND-11 |
| LND-13 | Web screen-03 processing actions | Officer thấy sync/retry theo Assignment; leader thấy approve/reject; terminal state chỉ đọc. | `.scratch/land-module/ui/screen-03.md`; `design-tokens.md` | LND-11, LND-12 |

## Thứ tự thực hiện

1. LND-10.
2. LND-11.
3. LND-12.
4. LND-13.

## Ticket contracts

### LND-10 — NationalLandAdapter mock

- **Status:** needs-triage
- **Blocked by:** LND-06, LND-08
- **Loại:** feature
- **Lane:** full
- **Gate hướng:** có
- **File được phép sửa:** `src/modules/land/**`, `tests/land/**`
- **File cấm sửa:** `.env`, `.brain/**`, `docs/design/**`, `docs/research/**`
- **Demo path:** Adapter local trả fixture success/failure cho application review, không gọi network.
- **Các bước thực hiện:**
  1. Tạo `NationalLandAdapter` interface và mock implementation.
  2. Chuẩn hóa request/response success/failure.
  3. Chọn fixture từ test/server configuration, không nhận client outcome.
  4. Map exception thành failure fixture và viết adapter tests.
- **Acceptance Criteria:**
  - [ ] Given request hợp lệ, When adapter fixture success, Then response có `succeeded`, remote reference và `simulated=true`.
  - [ ] Given fixture failure, When adapter được gọi, Then response có `failed`/failureCode và không có network call.
- **Test-skeleton:**
  - AC-01: mock request + success fixture → `status=succeeded`, `remoteReference` non-null.
  - AC-02: failure fixture/adapter exception → `status=failed`, failureCode non-null, network spy count 0.
- **Rubric bắt buộc:** Adapter boundary đúng ADR-0001; không tạo secret/endpoint quốc gia thật.

### LND-11 — Sync/retry command và persistence

- **Status:** needs-triage
- **Blocked by:** LND-10
- **Loại:** feature
- **Lane:** full
- **Gate hướng:** có
- **File được phép sửa:** `src/modules/land/**`, `src/app/api/land/applications/[applicationId]/sync/**`, `tests/land/**`
- **File cấm sửa:** `.env`, `.brain/**`, `docs/design/**`, `prisma/schema.prisma`
- **Demo path:** Officer sync application và retry failure bằng cùng request key.
- **Các bước thực hiện:**
  1. Tạo `LandNationalSync` persistence/service.
  2. Implement sync transition và request key generation.
  3. Implement retry chỉ từ `sync_failed`.
  4. Ghi event/audit và map HTTP/error messages.
  5. Viết success/failure/retry/concurrency tests.
- **Acceptance Criteria:**
  - [ ] Given in_review + success fixture, When POST sync, Then application `pending_approval`, sync `succeeded`, no right mutation.
  - [ ] Given failure fixture, When POST sync, Then HTTP `502 LAND_SYNC_FAILED`, application `sync_failed`, no Approval.
  - [ ] Given sync_failed, When retry with same request key, Then attempts tăng và sync operation không duplicate.
- **Test-skeleton:**
  - AC-01: app in_review + current version + success → sync row success, status pending_approval, LandRight unchanged.
  - AC-02: failure → 502/body code, approval count 0, app status sync_failed.
  - AC-03: retry same app/key twice → one operation row, attempts monotonic, expected final state.
- **Rubric bắt buộc:** State machine/unique request key khớp `data-model.md`; sync success không mutate land aggregate.

### LND-12 — Approval/completion transaction

- **Status:** needs-triage
- **Blocked by:** LND-11
- **Loại:** feature
- **Lane:** full
- **Gate hướng:** có
- **File được phép sửa:** `src/modules/land/**`, `src/app/api/land/applications/[applicationId]/approve/**`, `src/app/api/land/applications/[applicationId]/reject/**`, `tests/land/**`
- **File cấm sửa:** `.env`, `.brain/**`, `docs/design/**`, `prisma/schema.prisma`
- **Demo path:** Leader approve hoàn tất hoặc reject có reason; tất cả mutation/event/audit atomic.
- **Các bước thực hiện:**
  1. Implement leader scope/role check.
  2. Implement approval/rejection validation.
  3. Apply completed effects cho transfer/info/mortgage/split-merge.
  4. Append Approval/EventRecord/AuditEvent trong một transaction.
  5. Test commit/rollback/terminal behavior.
- **Acceptance Criteria:**
  - [ ] Given pending_approval + leader cùng OU, When approve current version, Then application completed và land effects commit cùng event/audit.
  - [ ] Given reject reason rỗng, When reject, Then `400 LAND_INVALID_REQUEST`, state/mutations unchanged.
  - [ ] Given non-leader/other OU/terminal application, When approve/reject, Then correct 403/409 và không tạo Approval mới.
- **Test-skeleton:**
  - AC-01: pending approval transfer → rights ended/new shares total 100, parcel state, approval/event/audit committed.
  - AC-02: reason whitespace → 400, app remains pending_approval, no domain rows changed.
  - AC-03: injected event/audit failure → transaction rollback app/land/approval rows.
- **Rubric bắt buộc:** Completed mutation đúng ADR-0001, không hard-delete và rollback atomic.

### LND-13 — Web screen-03 processing actions

- **Status:** needs-triage
- **Blocked by:** LND-11, LND-12
- **Loại:** feature
- **Lane:** full
- **Gate hướng:** có
- **File được phép sửa:** `src/app/land/applications/[applicationId]/**`, `src/components/land/**`, `tests/land-ui/**`
- **File cấm sửa:** `.env`, `.brain/**`, `docs/design/**`, `.scratch/land-module/ui/**`
- **Demo path:** Officer xử lý sync/retry; leader approve/reject; terminal detail chỉ read-only.
- **Các bước thực hiện:**
  1. Dựng header/status/timeline/detail projection.
  2. Kết nối sync/retry action với version header.
  3. Kết nối approve/reject dialog theo role.
  4. Implement stale/offline/forbidden/terminal states.
  5. Viết role-gated UI tests.
- **Acceptance Criteria:**
  - [ ] Given officer có Assignment, When application in_review/sync_failed, Then sync/retry action hiển thị đúng state.
  - [ ] Given leader pending_approval, When detail load, Then approve/reject visible; officer không thấy hai action.
  - [ ] Given completed/rejected/offline/stale, When detail/action state xảy ra, Then mutation control bị khóa và message/retry đúng.
- **Test-skeleton:**
  - AC-01: officer + assigned + sync_failed → retry visible; API success → status pending_approval.
  - AC-02: leader + pending_approval → approve/reject visible; officer fixture → selectors absent.
  - AC-03: terminal or 409/offline → controls disabled/hidden, state message and retry behavior match screen-03.
- **Rubric bắt buộc:** Bám screen-03 handoff; UI không tự quyết định quyền, chỉ phản ánh API/policy.

## Tiêu chí hoàn thành

- Given application `in_review` và fixture success, When gọi sync, Then `LandNationalSync.status=succeeded`, application `pending_approval`, `remoteReference` khác null và quyền chưa mutate.
- Given fixture failure, When gọi sync, Then HTTP `502 LAND_SYNC_FAILED`, application `sync_failed`, có `failureCode`, không có Approval.
- Given `sync_failed`, When retry với cùng request key, Then `attempts` tăng, không có sync operation thứ hai và success chuyển `pending_approval`.
- Given `pending_approval` và leader cùng OrganizationUnit, When approve với version hiện tại, Then application `completed`, `completedAt` khác null, Approval approved và land mutation/event/audit cùng transaction.
- Given non-leader hoặc leader khác đơn vị, When approve/reject, Then HTTP `403 LAND_FORBIDDEN` và không có Approval mới.
- Given screen-03 ở sync failure, stale version, forbidden hoặc offline, When state xảy ra, Then action/retry/message đúng role và không giả lập mutation thành công.

## Phụ thuộc giữa phase

- Phụ thuộc trước: Phase 02 có application aggregate và review transition.
- Mở khóa cho: Phase 04 public lookup đọc trạng thái application; Phase 05 Evidence gắn application đã tồn tại.
- Mock fixture là test/server configuration; client không được gửi outcome mô phỏng.
