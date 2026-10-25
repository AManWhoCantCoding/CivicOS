# Case biên: civicos-e1-clone-mvp

> Nguồn: spec + phân tích behavior hiện hữu. Mỗi case cần được test-skeleton của ticket phủ.

## PS-E1-005 — Tố giác

### EC-01: Gọi lại cùng idempotencyKey

- Điều kiện: POST /api/intake-reports 2 lần cùng `idempotencyKey`.
- Hành vi mong đợi: lần 2 trả kết quả lần đầu (201 + cùng id), không tạo bản ghi thứ 2.
- Tính năng liên quan: F-tố giác (DR-03).

### EC-02: Thiếu sourceChannel

- Điều kiện: POST /api/intake-reports thiếu/không hợp lệ `sourceChannel`.
- Hành vi mong đợi: 400, không ghi gì (kể cả event/audit).
- Tính năng liên quan: F-tố giác (DR-10). [GAP] cần đủ direct/phone/app/district_transfer.

### EC-03: Version lệch khi chuyển trạng thái

- Điều kiện: 2 cán bộ cùng gọi command verify/process với version cũ.
- Hành vi mong đợi: 1 thành công, còn lại 409; client refresh rồi thử lại.
- Tính năng liên quan: F-tố giác (DR-02).

### EC-04: Convert hai lần cùng IntakeReport

- Điều kiện: POST /api/incidents 2 lần với cùng `intakeReportId`.
- Hành vi mong đợi: lần 2 lỗi 409 (incidentId unique 1-1).
- Tính năng liên quan: F-tố giác (DR-11).

### EC-05: Role thường truy vấn danh tính

- Điều kiện: cán bộ thường GET detail intake-report có danh tính.
- Hành vi mong đợi: response chỉ có mã masked; DB không lộ; truy cập của Trưởng CA (dữ liệu thật) được ghi AuditEvent.
- Tính năng liên quan: F-tố giác (DR-12).

### EC-06: Transfer vượt thẩm quyền

- Điều kiện: tin vượt thẩm quyền xã → command transfer.
- Hành vi mong đợi: transferToId = OrganizationUnit cấp huyện hợp lệ; transfer tới đơn vị không tồn tại/inactive → 400.
- Tính năng liên quan: F-tố giác (DR-10).

## PS-E1-004 — Cư dân đặc biệt

### EC-10: Ghi hoạt động khi không có Assignment

- Điều kiện: cán bộ chưa được phân công (hoặc Assignment revoked) ghi Activity.
- Hành vi mong đợi: từ chối (403), không ghi event.
- Tính năng liên quan: F-cư dân (DR-05).

### EC-11: Hoạt động trùng idempotencyKey (offline mobile/web retry)

- Điều kiện: ghi cùng Activity 2 lần (mạng chập chờn).
- Hành vi mong đợi: ghi 1 lần; `nextCheckAt` chỉ cập nhật 1 lần.
- Tính năng liên quan: F-cư dân (DR-03, DR-21).

### EC-12: Tạo báo cáo trùng kỳ

- Điều kiện: tạo MonthlyReport cùng [organizationId, period] lần 2.
- Hành vi mong đợi: 409; một báo cáo/kỳ/đơn vị.
- Tính năng liên quan: F-cư dân (DR-23).

### EC-13: Gửi báo cáo chưa approve

- Điều kiện: POST send khi status=draft.
- Hành vi mong đợi: 400; send chỉ hợp lệ sau approve; sau approve payload/hash không đổi dù gửi nhiều lần.
- Tính năng liên quan: F-cư dân (DR-23).

### EC-14: Subject bị đổi trạng thái khi có record mở

- Điều kiện: Subject chuyển inactive nhưng còn SubjectManagementRecord status=open.
- Hành vi mong đợi: từ chối hoặc cảnh báo tùy quy tắc chốt khi grilling (ghi rõ vào domain-rules nếu thêm quy tắc).
- Tính năng liên quan: F-cư dân.

## PS-E1-007 — Cơ sở kinh doanh

### EC-20: Lịch kiểm tra trùng ngày cùng cơ sở

- Điều kiện: tạo Inspection cùng [establishmentId, scheduledAt].
- Hành vi mong đợi: 409 (unique).
- Tính năng liên quan: F-cơ-sở (DR-30).

### EC-21: Checklist version đổi giữa chừng

- Điều kiện: ChecklistTemplate version mới active sau khi Inspection đã tạo với version cũ.
- Hành vi mong đợi: đánh giá tiếp tục theo version đã chốt (templateVersion), không nhảy version.
- Tính năng liên quan: F-cơ-sở (DR-31).

### EC-22: Finding không có Evidence/GPS

- Điều kiện: hoàn tất biên bản kiểm tra thiếu ảnh/GPS.
- Hành vi mong đợi: từ chối hoàn tất (theo DR-33); chỉ cho phép lưu nháp.
- Tính năng liên quan: F-cơ-sở (DR-33).

### EC-23: Recommendation quá 7 ngày chưa xử lý

- Điều kiện: EnforcementRecommendation pending quá hạn 7 ngày.
- Hành vi mong đợi: worker phát SLA overdue event + notification; không tự động approve/reject (DR-04, DR-32).
- Tính năng liên quan: F-cơ-sở.

## Chung (hạ tầng/dữ liệu)

### EC-30: Worker chết giữa chừng

- Điều kiện: outbox có message pending nhưng worker down.
- Hành vi mong đợi: message giữ trạng thái pending + attempts tăng khi claim lại; không mất event; deadLetterAt sau quá số lần thử. Health `/api/health/worker` báo unhealthy.
- Tính năng liên quan: nền tảng.

### EC-31: DB mất kết nối giữa mutation

- Điều kiện: ghi DomainEvent thành công nhưng AuditEvent thất bại (ngược lại cũng vậy).
- Hành vi mong đợi: transaction rollback cả hai — không có trạng thái "một nửa" (DR-01).
- Tính năng liên quan: nền tảng.

### EC-32: Input tọa độ ngoài vùng hoạt động

- Điều kiện: GPSEvidence/tọa độ lệch xa vùng CADN (lỗi GPS).
- Hành vi mong đợi: chấp nhận lưu (không chặn), hiển thị cảnh báo ở UI; không tự sửa tọa độ.
- Tính năng liên quan: evidence, map.

### EC-33: Tên file/văn bản lạ (unicode, ký tự đặc biệt)

- Điều kiện: Evidence fileName có dấu tiếng Việt/ký tự đặc biệt, dung lượng lớn.
- Hành vi mong đợi: lưu qua storageKey an toàn; originalHash để trùng lặp; mime type kiểm tra whitelist.
- Tính năng liên quan: evidence.
