# Quy tắc nghiệp vụ B6 — CivicOS E1 Business Parity

## 1. Quy tắc nền tảng

### DR-P-01 — Server authority

RBAC, OrganizationUnit, Assignment, masking, sensitive reveal, version,
approval và public projection luôn được server quyết định. Mobile navigation hoặc
local capability chỉ là presentation hint.

### DR-P-02 — Event và Audit nguyên tử

Mọi mutation business thành công ghi DomainEvent + AuditEvent trong cùng
transaction/command boundary. Một phần thất bại thì không có business state thành
công. Sensitive read/reveal ghi AuditEvent theo policy.

### DR-P-03 — Version và idempotency

Aggregate mutation dùng `baseVersion`; lệch version trả conflict và không ghi đè.
Command retry dùng `clientCommandId`/`idempotencyKey`; retry không tạo duplicate
aggregate, event, Evidence hoặc notification.

### DR-P-04 — Assignment là điều kiện tác nghiệp

Actor chỉ được ghi follow-up/field work trên resource khi Assignment active, đúng
task, đúng OU và chưa revoked. Có thể xem projection rộng hơn chỉ khi role policy
cho phép; xem không đồng nghĩa được mutate.

### DR-P-05 — Mobile parity không mở capability ngoài matrix

Mọi mobile action phải map tới F-02/F-03/F-04 hoặc shared safety row. Không dùng
mobile parity để tạo generic workflow, citizen app, continuous GPS hoặc EP-E3
module mới.

## 2. PS-E1-004 — Cư dân đặc biệt

### DR-P-20 — Đăng ký và phân công trong SLA

Subject/SubjectManagementRecord theo purpose (`temporary_resident`,
`foreign_resident`, `reintegration`) phải được tạo và phân công theo deadline
24 giờ/source process. Mobile create/assign online-only.

### DR-P-21 — Checkup tái hòa nhập hàng tháng

Record `reintegration` cần ít nhất một `checkup` hợp lệ mỗi tháng. Activity có
actor, occurredAt, content, evaluation (nếu có), Assignment; checkup cập nhật
`nextCheckAt` và SLA. Offline activity sau sync vẫn dùng thời điểm/actor server
để đánh giá deadline, không tự hợp thức hóa quá hạn.

### DR-P-22 — Evidence/GPS cho activity

Nếu business command yêu cầu location/Evidence, phải có cặp tọa độ hợp lệ và
Evidence provenance. GPS được capture theo action, không continuous tracking. Từ
chối permission tạo state rõ, không tự chèn tọa độ giả.

### DR-P-23 — Biến động và risk

Update change/risk online-only ở B6. High-risk phải tạo event, Audit, SLA/
notification escalation theo policy. Mobile không được cache hoặc reveal raw
sensitive profile cho role không có quyền.

### DR-P-24 — Foreign resident same-day notification

Foreign resident registration tạo notification tới OrganizationUnit cấp nhận hợp
lệ trong cùng ngày nghiệp vụ. Notification failure không rollback aggregate nhưng
phải retry qua outbox và hiển thị delivery state.

### DR-P-25 — Monthly report snapshot

Report có state `draft → approved → sent`. Approve đóng băng snapshot/hash; send
chỉ dùng snapshot đã approve. Approve/send online-only; không sửa source hoặc
snapshot qua mobile local queue.

## 3. PS-E1-005 — Tố giác và Incident

### DR-P-30 — Canonical source channel

`sourceChannel` chỉ nhận `direct`, `phone`, `app`, `district_transfer` (legacy
alias nếu API còn hỗ trợ phải normalize về canonical). Thiếu/invalid channel hoặc
content rỗng bị từ chối trước khi ghi event.

### DR-P-31 — Intake không tự tạo Incident

IntakeReport mới dừng ở `RECEIVED`. Chỉ command convert khi đủ điều kiện mới tạo
Incident 1:1 và phát notification. Mobile intake không được shortcut conversion.

### DR-P-32 — Protected identity

List/detail mobile mặc định masked. Sensitive reveal chỉ actor/policy được phép,
trên request online, và tạo AuditEvent; không đưa plaintext vào notification,
deep link, local cache, offline queue, application log hoặc error message.

### DR-P-33 — SLA 24h/48h/20 ngày

Ghi nhận trong 24 giờ, xác minh ban đầu trong 48 giờ, thông báo kết quả trong 20
ngày. Overdue/escalation là state/SLA event, không chỉ là màu ở UI. Notification
delivery không thay thế authorization hoặc completion state.

### DR-P-34 — Transition và transfer

Verify/classify/process/close/reject/transfer phải đi qua transition hợp lệ,
version và Audit. Transfer/close/reject online-only; transfer target phải là
OrganizationUnit hợp lệ/còn hoạt động.

### DR-P-35 — Mobile field verification

Field note, Evidence/GPS và yêu cầu hỗ trợ chỉ được ghi cho Incident/Assignment
được phép. B6 không queue E1-005 mutation offline; offline chỉ cho phép draft local
không có trạng thái đã gửi.

## 4. PS-E1-007 — Cơ sở KDCĐK

### DR-P-40 — Cadence và lịch

Establishment có inspection định kỳ cadence tối đa 6 tháng để đạt ít nhất hai
lần/năm; ad-hoc schedule cần lý do/authority. Lịch sử không hard-delete.

### DR-P-41 — Checklist version pinning

Inspection giữ template/version tại thời điểm schedule/create. Checklist mobile
không nhảy sang template mới giữa chừng; validation fail giữ draft.

### DR-P-42 — Offline field draft

`start`, `save_checklist` và `finding` có thể queue theo allowlist. Queue phải giữ
baseVersion, templateVersion, Assignment và trạng thái sync. Finding offline chưa
có server Evidence không được coi là biên bản hoàn tất.

### DR-P-43 — Evidence + GPS prerequisite

Complete inspection cần required checklist, finding state hợp lệ và Evidence/GPS
đạt policy. Evidence immutable có hash/provenance/resource binding; GPS không nhập
tay nếu business yêu cầu capture tự động. Complete online-only ở B6.

### DR-P-44 — Recommendation và legal boundary

Finding có thể sinh EnforcementRecommendation. Recommendation đi
`pending_approval → approved|returned|transferred`; SLA xử lý 7 ngày. Chỉ
Commander có quyền approval; không tự phát hành sanction/legal decision.

## 5. Shared mobile rules

### DR-P-50 — Queue security

Local queue mã hóa theo platform policy; không chứa auth token, sensitive reveal,
approval, transfer/close IntakeReport. Logout, session expiry, device change và
remote wipe policy phải xóa/disable queue chưa sync theo security contract.

### DR-P-51 — Conflict fail-closed

409/stale/revoked Assignment/rejected command không được local merge âm thầm.
Client hiển thị conflict, giữ draft được phép và yêu cầu tải state mới.

### DR-P-52 — Notification/deep link

Notification chỉ chứa mã/summary tối thiểu; mở deep link phải re-authorize. Link
stale/forbidden không tiết lộ resource existence vượt response policy.

### DR-P-53 — Land boundary

Land mobile chỉ dùng focused parcel projection và contract Land; public response
không có PII/polygon/evidence/sync payload, luôn `simulated=true`. Không áp dụng
business parity source E1/EP-E3 cho Land.

### DR-P-54 — Vehicle absence

Không có Vehicle capability, route, command, event, sync type, seed hoặc fallback.
Structural removal verification là gate độc lập.
