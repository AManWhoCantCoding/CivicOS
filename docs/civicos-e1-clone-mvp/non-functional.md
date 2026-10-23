# Yêu cầu phi chức năng: civicos-e1-clone-mvp

> Nguồn: `Requirement.md` (NFR PS-E1), `spec.md` mục 2.5–2.6, khảo sát hạ tầng repo.

## Hiệu năng

- Map tile: dùng tile subset quanh CADN (tự host) — giảm dung lượng, hỗ trợ offline basemap; thao tác ghi dữ liệu yêu cầu online trong MVP.
- Truy vấn list (intake-reports, residents, inspections): có index sẵn theo [status, receivedAt] / [subjectType, status] / [type, active] — pagination bắt buộc cho list, không fetch toàn bộ.
- Projection realtime: worker xử lý outbox liên tục; thời gian trễ chấp nhận của projection ≤ vài giây (đối chiếu `src/modules/eventing/` khi đo).
- Mobile read-only: `/api/sync` trả delta theo mốc thời gian, không full-sync mỗi lần.

## Bảo mật

- **AuthN/AuthZ:** local auth adapter (giữ contract role/permission); `Assignment` cấp quyền tối thiểu theo nhiệm vụ; phân biệt cấp vai trò web: Nhập liệu → Phê duyệt nội bộ → Tiếp nhận cấp trên (Requirement.md ma trận actor).
- **Masking dữ liệu nhạy cảm:** danh tính tố giác + hồ sơ cư dân đặc biệt là nhóm dễ tổn thương — kiểm soát truy cập thiết kế ở tầng phân quyền RBAC, không chỉ tầng UI (Requirement.md ghi chú rủi ro). Chỉ Trưởng CA xem dữ liệu thật; mọi truy cập thật ghi AuditEvent.
- **Không dùng dữ liệu thật:** không dùng credential, token, PII thật từ source; seed/demo chỉ synthetic.
- **Session:** tokenHash unique + expiresAt; session hết hạn → 401.
- **Audit:** mọi đọc/thay đổi dữ liệu nhạy cảm ghi `AuditEvent` (resourceType/resourceId/operation/actorId).

## Khả dụng & phục hồi

- Worker là process riêng (`src/worker.ts`) — outbox/projection/SLA/notification; health check `/api/health/worker` bắt buộc healthy.
- DB PostgreSQL 16 qua Docker (docker-compose); integration test cần PostgreSQL + worker healthy; test DB bật bằng `RUN_DB_TESTS=1`.
- Backup: theo cơ chế Docker volume hiện hành của dự án (chưa có quy định riêng — nếu cần SLA backup cụ thể, bổ sung khi grilling B6).
- Retention: chưa có quy định pháp lý riêng cho dữ liệu ANTT demo — dùng dữ liệu synthetic nên rủi ro thấp; xem lại khi có dữ liệu thật.

## Logging & audit trail

- `AuditEvent`: ai (actorId), làm gì (operation), trên gì (resourceType+resourceId), khi nào (occurredAt), correlationId để truy vết chuỗi.
- `EventRecord`: lịch sử nghiệp vụ bất biến (payload + metadata + actor fields) — nguồn sự thật cho projection/notification/realtime.
- Log ứng dụng: không ghi PII nhạy cảm vào log (mask trước khi log).

## Giới hạn

- Rate limit: chưa cấu hình (môi trường demo nội bộ); nếu mở public citizen app sau — bắt buộc bổ sung trước khi chạy thật.
- Dependency mới: mọi package phải khai báo package/version/license/reason/command và được phê duyệt trước khi cài (spec mục 9).