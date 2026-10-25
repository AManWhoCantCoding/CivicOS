# Case biên B6 — CivicOS E1 Business Parity

Mỗi case dưới đây là contract behavior, không phải quyết định schema. Test ticket
ở B10 phải chọn case phù hợp với feature và ghi HTTP/domain error thực tế.

## 1. Shared auth, Assignment và state

### EC-B6-01: Session hết hạn khi đang submit

- **Given:** Mobile có form hợp lệ nhưng session hết hạn trước request.
- **When:** Gửi command.
- **Then:** Trả `401`, không ghi domain/event/audit; xóa session theo auth
  contract và giữ draft được phép, không retry vô hạn.
- **Feature:** F-01, F-02, F-03, F-04.

### EC-B6-02: Assignment bị revoke trước khi sync

- **Given:** Item đã queue khi Assignment còn active.
- **When:** Server nhận item sau khi Assignment bị revoke.
- **Then:** Trả `403`/`rejected`, không mutate; item không tự retry, UI yêu cầu
  refresh scope.
- **Feature:** F-01, F-02, F-04.

### EC-B6-03: Version cũ sau thao tác trên web

- **Given:** Mobile giữ `baseVersion=n`, web đã commit `n+1`.
- **When:** Mobile gửi command.
- **Then:** Trả `409 conflict`, không overwrite; client tải state mới và chỉ giữ
  draft local nếu command policy cho phép.
- **Feature:** F-02, F-03, F-04.

### EC-B6-04: Retry cùng clientCommandId

- **Given:** Network timeout sau khi server đã commit command.
- **When:** Client gửi lại cùng `clientCommandId`/idempotency key.
- **Then:** Trả kết quả lần đầu; không nhân đôi activity, finding, event,
  Evidence, SLA hoặc notification.
- **Feature:** F-02, F-04, F-05.

### EC-B6-05: Deep link stale hoặc forbidden

- **Given:** Notification mở resource đã xóa khỏi scope hoặc bị forbidden.
- **When:** App resolve deep link.
- **Then:** Re-authorize server; hiển thị not-found/forbidden theo policy, không
  suy ra resource existence và không fallback sang Vehicle/RelatedInfo.
- **Feature:** F-01, F-05.

### EC-B6-06: Logout có pending queue

- **Given:** Thiết bị có item chưa sync và user logout/đổi account.
- **When:** Auth context thay đổi.
- **Then:** Queue bị xóa hoặc vô hiệu theo security policy; user mới không đọc,
  submit hoặc replay item của user cũ.
- **Feature:** F-01, F-05.

## 2. PS-E1-004 — Cư dân đặc biệt

### EC-B6-07: Activity offline thiếu policy storage an toàn

- **Given:** User tạo checkup offline nhưng encrypted local storage không sẵn sàng.
- **When:** Chọn lưu.
- **Then:** Không queue command; hiển thị save-blocked và hướng dẫn online, không
  lưu plaintext tạm trong log/cache.
- **Feature:** F-02.

### EC-B6-08: Activity thiếu content hoặc GPS không đầy đủ

- **Given:** Content rỗng, hoặc request có latitude nhưng thiếu longitude/accuracy
  theo policy.
- **When:** Submit/sync.
- **Then:** `422` validation, không ghi activity/event; draft còn nguyên để sửa.
- **Feature:** F-02.

### EC-B6-09: Retry checkup cùng tháng

- **Given:** Checkup đã commit nhưng response bị mất.
- **When:** Client retry cùng idempotency key.
- **Then:** Trả activity cũ; cadence/`nextCheckAt`/SLA chỉ tính một lần.
- **Feature:** F-02.

### EC-B6-10: High-risk update bị gọi offline

- **Given:** Field user offline cố raise risk/escalation.
- **When:** Client tạo command.
- **Then:** Action bị chặn, không queue; user được hướng dẫn online. Không tạo
  SLA/notification giả.
- **Feature:** F-02, F-05.

### EC-B6-11: Foreign-resident notification thất bại

- **Given:** Registration transaction đã commit đúng SLA nhưng notification
  adapter lỗi.
- **When:** Worker xử lý outbox.
- **Then:** Hồ sơ không rollback; delivery state là retryable/dead-letter theo
  policy, audit/outbox vẫn truy vết được.
- **Feature:** F-02, F-05.

### EC-B6-12: Approve report với snapshot đã thay đổi

- **Given:** Hai commander mở cùng monthly report.
- **When:** Người thứ hai approve bằng version cũ hoặc send draft.
- **Then:** `409` hoặc invalid transition; snapshot/hash không bị ghi đè, send bị
  từ chối nếu chưa approved.
- **Feature:** F-02.

## 3. PS-E1-005 — Tố giác và Incident

### EC-B6-13: Source channel thiếu hoặc không hợp lệ

- **Given:** Intake có content nhưng thiếu `sourceChannel` hoặc dùng value ngoài
  `direct|phone|app|district_transfer`.
- **When:** POST intake.
- **Then:** `400/422`, không tạo IntakeReport, Event hoặc Audit mutation.
- **Feature:** F-03.

### EC-B6-14: `app` channel bị hiểu nhầm là public app

- **Given:** Client không authenticate gọi public endpoint với channel `app`.
- **When:** Gửi intake.
- **Then:** Không có public route/credential path trong tranche; request bị từ
  chối. Internal actor có capability mới được nhập channel `app`.
- **Feature:** F-03, F-06.

### EC-B6-15: Protected identity xuất hiện trong mobile list

- **Given:** Intake có identity/contact thật.
- **When:** Mobile list/detail/notification/offline snapshot được tạo.
- **Then:** Chỉ projection masked/allowlist; plaintext không xuất hiện trong JSON,
  log, deep link hoặc queue.
- **Feature:** F-01, F-03, F-05.

### EC-B6-16: Sensitive reveal khi offline

- **Given:** User đã mở masked record rồi mất mạng và yêu cầu reveal.
- **When:** App xử lý action.
- **Then:** Từ chối; không dùng cache cũ và không queue reveal. Khi online phải
  re-authorize và ghi AuditEvent.
- **Feature:** F-03, F-05.

### EC-B6-17: Verify/process thiếu điều kiện

- **Given:** Intake chưa có note/classification cần thiết hoặc đã ở terminal state.
- **When:** Mobile gọi verify/process/close.
- **Then:** `400/409`, state không đổi, không tạo Incident/notification sai.
- **Feature:** F-03.

### EC-B6-18: Convert IntakeReport hai lần

- **Given:** Hai client convert cùng một IntakeReport.
- **When:** Cả hai gửi version hiện hành.
- **Then:** Một command thành công; command còn lại `409`; quan hệ 1:1 và event
  không nhân đôi.
- **Feature:** F-03.

### EC-B6-19: Transfer tới OrganizationUnit không hợp lệ

- **Given:** Target OU inactive, ngoài policy hoặc actor không có quyền.
- **When:** Gọi transfer.
- **Then:** `403/422`, Intake/Incident giữ state cũ, không gửi notification chuyển
  cấp.
- **Feature:** F-03.

### EC-B6-20: Field update offline

- **Given:** Field officer offline muốn gửi note/Evidence cho Incident.
- **When:** Chọn submit.
- **Then:** B6 chỉ cho draft local không có trạng thái đã gửi; protected payload
  không được lưu plaintext. Khi online user submit lại theo command E1-005 online.
- **Feature:** F-03, F-05.

## 4. PS-E1-007 — Cơ sở và kiểm tra

### EC-B6-21: Inspection bị hủy trước khi sync start

- **Given:** `inspection.start` đã queue, lịch bị hủy/reassigned.
- **When:** Sync.
- **Then:** `rejected`, không tạo active inspection state; UI hiển thị lý do và
  không retry tự động.
- **Feature:** F-04, F-05.

### EC-B6-22: Checklist template đổi giữa chừng

- **Given:** Server có template mới sau khi inspection được tạo.
- **When:** Mobile sync `save_checklist` theo template cũ.
- **Then:** Nếu inspection đã pin version, chấp nhận version cũ; nếu version
  không khớp aggregate, `409` và không overwrite draft.
- **Feature:** F-04.

### EC-B6-23: Finding offline chưa có Evidence server

- **Given:** Finding đã queue nhưng media vẫn local/pending upload.
- **When:** User mở complete.
- **Then:** Complete bị chặn online; finding giữ `pending_evidence`/rejected theo
  policy, không tạo biên bản hoàn tất.
- **Feature:** F-04, F-05.

### EC-B6-24: GPS/camera permission bị từ chối

- **Given:** User từ chối permission trong inspection.
- **When:** Capture Evidence hoặc complete.
- **Then:** UI nêu prerequisite bị thiếu; không chèn tọa độ giả, không complete
  nếu policy yêu cầu GPS.
- **Feature:** F-04.

### EC-B6-25: Evidence upload retry cùng hash

- **Given:** Upload timeout sau khi bytes đã lưu.
- **When:** Client retry cùng resource/hash.
- **Then:** Trả Evidence hiện có hoặc kết quả idempotent; không tạo file/row trùng,
  không lộ storage path.
- **Feature:** F-04, F-05.

### EC-B6-26: Recommendation approval offline

- **Given:** Commander offline mở recommendation pending approval.
- **When:** Chọn approve/return/transfer.
- **Then:** Không queue và không hiển thị success; action chỉ được thực hiện khi
  online, đủ role/OU/version và có Audit.
- **Feature:** F-04.

## 5. Land, provider và structural boundary

### EC-B6-27: E1 payload đi vào public Land lookup

- **Given:** Client gửi E1 resource ID hoặc evidence vào public Land lookup.
- **When:** Lookup.
- **Then:** Response vẫn chỉ theo Land allowlist, không PII/polygon/Evidence/
  timeline; không biến Land thành E1 projection.
- **Feature:** F-06.

### EC-B6-28: Map/provider unavailable

- **Given:** Tile/provider lỗi trong khi mở focused map hoặc field form.
- **When:** Surface render.
- **Then:** Hiển thị provider-error/geometry-unavailable; không làm mất form/draft
  và không biến vị trí thiếu thành GPS hợp lệ.
- **Feature:** F-01, F-04, F-06.

### EC-B6-29: Vehicle reference quay lại qua deep link/seed

- **Given:** Build/demo/test/notification chứa Vehicle identifier.
- **When:** Zero-reference gate chạy.
- **Then:** Gate fail-closed và báo `PS-E1-009_REFERENCE_FOUND`; không thêm fallback
  hoặc alias để làm pass.
- **Feature:** F-07, structural-removal handoff.
