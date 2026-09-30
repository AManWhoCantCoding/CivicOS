# Quy tắc nghiệp vụ: civicos-e1-clone-mvp

> Nguồn: `spec.md` mục 2/4, `CONTEXT.md`, khảo sát code. Chia theo story + quy tắc nền tảng.

## Nền tảng (áp dụng mọi module)

### DR-01: Mọi thay đổi nghiệp vụ phát sự kiện + audit
- Mô tả: mỗi mutation nghiệp vụ ghi `DomainEvent` (bất biến) + `AuditEvent` trong cùng transaction DB.
- Hành vi khi vi phạm: lệnh bị từ chối/revert; không có "ghi một nửa".
- Nguồn: nghiệp vụ (spec mục 2.4), truy vết tuân thủ.
- Nơi enforce: `src/modules/eventing/` (event store + outbox), command handlers.

### DR-02: Optimistic concurrency
- Mô tả: aggregate có cột `version`; mọi mutation kèm version, lệch → từ chối (409).
- Nguồn: kỹ thuật cần (tránh ghi đè mất mát).
- Nơi enforce: service layer + DB (unique [aggregateType, aggregateId, aggregateVersion] ở EventRecord).

### DR-03: Idempotency cho lệnh client
- Mô tả: mọi lệnh ghi từ client phải mang key unique (idempotencyKey / clientCommandId); gọi lại trả kết quả lần đầu, không nhân bản.
- Nguồn: kỹ thuật + nghiệp vụ (offline mobile, retry).
- Nơi enforce: DB unique constraint + `IntakeCommand` log.

### DR-04: Không tự phát hành quyết định pháp lý
- Mô tả: hệ thống chỉ đề xuất (`EnforcementRecommendation`); quyết định xử phạt/kết luận pháp lý luôn qua `Approval` của Trưởng CA hoặc chuyển cấp trên. Không tự động.
- Nguồn: nghiệp vụ (spec mục 2.4, 6).
- Nơi enforce: service layer — không có code path tự động approve.

### DR-05: Actor phải có Assignment khi ghi hoạt động theo dõi
- Mô tả: `SubjectManagementActivity` phải gắn `assignmentId` hợp lệ (cán bộ được Trưởng CA phân công cho resource đó).
- Hành vi khi vi phạm: từ chối ghi hoạt động.
- Nguồn: nghiệp vụ (spec 4.1 AC: "mọi hoạt động theo dõi có Actor, thời gian, Assignment").
- Nơi enforce: service layer (tra Assignment status=active).

## PS-E1-005 — Tố giác

### DR-10: Trạng thái IntakeReport theo semantics source
- Mô tả: RECEIVED → VERIFIED → PROCESSED → CLOSED | REJECTED. Không nhảy cóc trạng thái; mỗi chuyển trạng thái qua command riêng + ghi event.
- Nguồn: nghiệp vụ (spec 4.2 bước 5 — "giữ semantics source").
- Nơi enforce: `incidents/contracts.ts` (state machine).

### DR-11: Không tự tạo Incident khi nhập tin
- Mô tả: `IntakeReport` mới KHÔNG tạo `Incident`. Incident chỉ được tạo khi cán bộ xác nhận/convert (POST /api/incidents với intakeReportId) — giữ semantics source `detected → open` + notification "incident created".
- Hành vi khi vi phạm: hiện baseline vẫn tạo ngay → **ticket bắt buộc sửa** (GAP số 2 trong data-model).
- Nguồn: nghiệp vụ (spec 2.4, 4.2 bước 6).
- Nơi enforce: `registerIntakeReport` (sửa) + `incidents` route.

### DR-12: Bảo vệ danh tính người tố giác
- Mô tả: danh tính lưu vùng bảo vệ (`sensitiveRef` + `sensitiveRefIndex`); list/detail mặc định chỉ trả mã masked; chỉ role Trưởng CA xem dữ liệu thật; mọi truy cập dữ liệu thật ghi AuditEvent.
- Hành vi khi vi phạm: response không bao giờ chứa nội dung nhạy cảm cho role thường.
- Nguồn: nghiệp vụ (spec 2.6, 4.2 AC) — an toàn người tố giác là nhóm dễ tổn thương (Requirement.md ma trận actor).
- Nơi enforce: service masking + role check + audit.

### DR-13: SLA tố giác
- Mô tả: ghi nhận tin 24h; xác minh ban đầu 48h; thông báo kết quả cho người tố giác 20 ngày (qua notification adapter).
- Nguồn: nghiệp vụ (spec 4.2 AC).
- Nơi enforce: `SlaInstance` (kind theo từng mốc) + worker SLA (`src/modules/platform/sla/`).

## PS-E1-004 — Cư dân đặc biệt

### DR-20: Đăng ký trong 24 giờ
- Mô tả: cư dân đặc biệt nhận từ CA huyện/cơ sở lưu trú phải có Subject + SubjectManagementRecord trong 24 giờ.
- Nguồn: nghiệp vụ (spec 4.1 AC).
- Nơi enforce: SlaInstance kind "registration".

### DR-21: Tái hòa nhập gặp ít nhất 1 lần/tháng
- Mô tả: record purpose=tái hòa nhập phải có Activity trong tháng; `nextCheckAt` cập nhật sau mỗi lần ghi; quá hạn → cảnh báo (DomainEvent + notification).
- Nguồn: nghiệp vụ (spec 4.1 AC).
- Nơi enforce: worker SLA + check nextCheckAt.

### DR-22: Người nước ngoài lưu trú báo ngay trong ngày
- Mô tả: Subject người nước ngoài lưu trú → notification tới CA huyện ngay ngày đến (theo quyền nhận).
- Nguồn: nghiệp vụ (spec 4.1 AC).
- Nơi enforce: service + notification adapter.

### DR-23: Báo cáo tháng bất biến sau phê duyệt
- Mô tả: `ResidentMonthlyReport` khi approve → đóng băng `snapshotPayload` + `snapshotHash`; mọi lần gửi sau dùng snapshot, không tính toán lại. Unique [organizationId, period] — một báo cáo/kỳ/đơn vị.
- Nguồn: nghiệp vụ (spec 4.1 bước 6 + mục 3.2 ReportSnapshot).
- Nơi enforce: DB unique + service (approve ghi snapshot, send chỉ đọc snapshot).

## PS-E1-007 — Cơ sở kinh doanh có điều kiện

### DR-30: Lịch kiểm tra định kỳ 6 tháng
- Mô tả: mỗi Establishment có lịch Inspection định kỳ cadence 6 tháng (đảm bảo ≥2 lần/năm); kiểm tra đột xuất được tạo khi có dấu hiệu.
- Nguồn: nghiệp vụ (spec 4.3 AC).
- Nơi enforce: `Inspection.cadenceMonths` + worker lập lịch.

### DR-31: Checklist theo version chốt lúc tạo
- Mô tả: tạo Inspection phải chốt `templateId` + `templateVersion` tại thời điểm tạo; đánh giá dựa đúng version đó, không tự nhảy sang bản active mới.
- Nguồn: nghiệp vụ (checklist chuẩn theo loại hình).
- Nơi enforce: `Inspection.templateVersion` + unique [establishmentType, version].

### DR-32: Vi phạm xử lý trong 7 ngày
- Mô tả: mọi `InspectionFinding` sinh `EnforcementRecommendation` phải đạt trạng thái xử lý (approved/returned/transferred) trong 7 ngày; không tự động kết luận.
- Nguồn: nghiệp vụ (spec 4.3 AC).
- Nơi enforce: SlaInstance kind "violation-handling".

### DR-33: Biên bản gắn Evidence + GPS
- Mô tả: biên bản kiểm tra phải có ảnh + GPS làm Evidence (bất biến, có originalHash).
- Nguồn: nghiệp vụ (spec 4.3 AC).
- Nơi enforce: `Evidence` unique [resourceType, resourceId, originalHash] + validation trước khi hoàn tất Inspection.

## Mobile (read-only)

### DR-40: Mobile không ghi dữ liệu E1-004/E1-007
- Mô tả: mobile chỉ gọi các GET (related-info, forces read-only, sync); không có write flow mới trong MVP.
- Nguồn: nghiệp vụ (spec 2.7, 6).
- Nơi enforce: không định nghĩa POST/PATCH trong mobile routes; backend từ chối mọi mutation từ client mobile-readonly.
