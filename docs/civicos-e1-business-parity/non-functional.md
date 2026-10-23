# Yêu cầu phi chức năng B6 — CivicOS E1 Business Parity

**Trạng thái:** B6 design draft — các ngưỡng dưới đây là acceptance target cho
tranche demo/internal, không phải cam kết SLA production.  
**Nguồn nền:** `docs/civicos-e1-clone-mvp/non-functional.md`,
`Requirement.md`, `CONTEXT.md`, `mobile-capability-matrix.md`.

## 1. Hiệu năng và khả năng mở rộng

- List của `IntakeReport`, `SubjectManagementRecord`, `Establishment` và
  `Inspection` bắt buộc phân trang; không tải toàn bộ dataset cho một màn hình.
  Bộ lọc phải được thực hiện ở server và giữ đúng scope OU/Assignment.
- Mục tiêu đo trên dataset demo: list p95 ≤ 500 ms; command không upload file
  p95 ≤ 1.000 ms; thời gian upload Evidence và xử lý provider được đo riêng.
  Các con số là target kiểm thử, không được biến thành timeout làm sai SLA nghiệp
  vụ.
- Projection từ Event/Outbox tới read surface có độ trễ mục tiêu không quá vài
  giây trong môi trường worker khỏe mạnh; UI phải hiển thị `stale` thay vì giả
  vờ dữ liệu realtime.
- `/api/sync` nhận delta/command batch có giới hạn, không full-sync mỗi lần.
  Một item lỗi không được làm mất các item hợp lệ khác; thứ tự aggregate được
  bảo toàn khi cần.
- Evidence upload không chặn render phần form không phụ thuộc Evidence; trạng
  thái `pending_evidence` phải rõ và không cho complete trước prerequisite.

## 2. Bảo mật, riêng tư và tối thiểu hóa dữ liệu

- AuthN/AuthZ, OrganizationUnit, Assignment, masking và sensitive reveal được
  enforce ở server; client capability chỉ là hint để trình bày.
- Protected identity của IntakeReport và dữ liệu Subject nhạy cảm mặc định
  masked trong list, notification, deep link, local cache, offline queue, log và
  error response. Sensitive reveal chỉ online, đúng policy và có AuditEvent.
- Local offline queue phải dùng cơ chế mã hóa được platform hỗ trợ, không lưu raw
  auth token. Payload chỉ giữ opaque resource ID, command tối thiểu và trường
  activity/checklist được policy cho phép. Nếu không khởi tạo được storage an
  toàn, command không được queue.
- Logout, session expiry, đổi user trên thiết bị hoặc remote wipe phải vô hiệu
  hoặc xóa item chưa sync; không được để user sau đọc draft của user trước.
- Dữ liệu demo phải synthetic; không dùng PII, credential, token hoặc secret từ
  hai repo nguồn.
- Evidence response không trả `storageKey` hoặc đường dẫn storage nội bộ. Public
  Land vẫn theo allowlist Land, không nhận E1 projection.

## 3. Nhất quán, toàn vẹn và khôi phục

- Mỗi mutation thành công ghi domain state, DomainEvent và AuditEvent trong cùng
  command/transaction boundary. Lỗi một side effect bắt buộc rollback business
  mutation hoặc đưa side effect vào outbox theo contract; không có trạng thái nửa
  chừng.
- Optimistic concurrency dùng `baseVersion`; conflict, revoked Assignment,
  invalid transition và rejected sync đều fail-closed, không merge âm thầm.
- `clientCommandId`/`idempotencyKey` phải chịu được retry mạng, app restart và
  worker retry mà không nhân đôi event, Evidence, SLA hoặc notification.
- Outbox/worker phải có retry có giới hạn, dead-letter/health signal và không retry
  vô hạn một command nghiệp vụ đã bị từ chối.
- Backup/rollback production không được giả định trong B6; M2 Vehicle purge và
  migration baseline là workstream structural riêng, phải có runbook ở B9/B10.

## 4. Offline và khả dụng trên mobile

- Mobile có thể đọc cache an toàn với nhãn `stale`; cache không được mở rộng
  scope sau khi Assignment bị revoke.
- Chỉ allowlist sau được queue: `resident.record_activity`,
  `inspection.start`, `inspection.save_checklist`, `inspection.finding`. E1-005
  mutation, sensitive reveal, risk escalation, create record, complete,
  transfer/close/reject và approval luôn online-only ở tranche này.
- Mỗi item phải có trạng thái quan sát được: `pending`, `syncing`, `synced`,
  `failed`, `rejected`, `conflict`. Retry không được tạo duplicate; item bị
  `rejected` không tự retry vô hạn.
- App có thể tạo draft local cho E1-005 khi offline nhưng draft không được mang
  protected identity plaintext, không hiển thị trạng thái “đã tiếp nhận” và
  không được gửi ngầm khi mạng trở lại.
- Mất quyền location/camera/storage/network phải có state và hướng xử lý rõ;
  không chèn GPS giả hoặc đánh dấu complete thay người dùng.

## 5. Location và Evidence

- GPS chỉ được capture theo activity/verification/inspection action đã yêu cầu;
  không bật continuous tracking của PS-E3-003.
- Location record phải có actor, thời điểm, accuracy/provenance theo capability
  hiện hành; tọa độ không hợp lệ hoặc permission bị từ chối không được coi là
  Evidence hợp lệ.
- Evidence có MIME/size policy, hash, immutable/provenance và resource binding;
  duplicate retry theo hash/resource phải idempotent. Các giới hạn cụ thể dùng
  policy shared hiện hành và được B9/implementation xác nhận, không tự nhân bản
  Land constants.

## 6. Accessibility và trải nghiệm trạng thái

- Web, mobile, public Land và Demo dùng state vocabulary nhất quán nhưng semantics
  theo domain: loading, empty, forbidden, masked, offline, stale, conflict,
  rejected, provider-error và success.
- Action bị cấm không chỉ ẩn bằng UI; response server và copy phải phân biệt
  forbidden/conflict/validation mà không làm lộ resource nhạy cảm.
- Keyboard/focus web, touch target mobile, contrast, screen-reader label và thông
  báo lỗi phải được kiểm tra trong B7; không dùng màu duy nhất để truyền trạng
  thái.
- UI không được hiển thị raw payload, stack trace, storage path hoặc token; demo
  phải gắn nhãn simulated ở boundary Land theo contract riêng.

## 7. Observability và audit

- Log kỹ thuật dùng correlation ID, clientCommandId và resource type/id đã mask;
  không ghi protected identity, payload Evidence hoặc auth token.
- Metrics tối thiểu: command latency, sync queue depth, sync success/reject/
  conflict, Evidence upload failure, worker health, SLA overdue và notification
  delivery state.
- Audit tối thiểu cho sensitive read/reveal, create, update, verify, convert,
  transfer, close/reject, activity, checklist/finding/complete, Evidence,
  approval, report send, Assignment và sync/retry.
- `/api/health/worker` phải healthy trước khi coi projection/SLA/notification
  integration pass.

## 8. Kiểm thử và bằng chứng nghiệm thu

- Unit/domain tests phủ transition, Assignment, masking, version và idempotency.
- Integration tests phủ DB transaction, Event/Audit/Outbox, `/api/sync`, Evidence,
  notification và worker.
- Mobile tests phủ capability navigation, session expiry, masked response, offline
  queue, retry, conflict, revoked Assignment, GPS/camera denied và logout cleanup.
- Contract tests chứng minh `app` là source channel nội bộ hợp lệ nhưng không có
  public citizen intake route; Land projection không nhận E1 payload; Vehicle
  zero-reference gate chạy độc lập.