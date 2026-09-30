# Hợp đồng tích hợp: civicos-e1-clone-mvp

> Nguồn: spec mục 2.5–2.6, docker-compose.yml, khảo sát repo. MVP dùng adapter/mock cho mọi hệ thống ngoài — không có tích hợp thật trong tranche này.

## Bản đồ & tile (OSS tự host)

- **Cách gọi:** MapLibre GL JS (web) / MapLibre React Native (mobile) đọc style + tile từ tile server tự host (OSM extract → OpenMapTiles → TileServer GL hoặc PMiles); cấu hình qua `/api/map/config`.
- **Provider abstraction:** mọi truy cập map provider đi qua adapter (`src/modules/` phần map) để sau này thay VietGeoX/VBDLIS mà không sửa UI/đơn nghiệp vụ.
- **Lỗi xử lý:** tile server chết → basemap cache/offline hiển thị tiếp; thao tác ghi vẫn yêu cầu online (backend chặt).
- **Retry/Timeout:** tile client tự retry mặc định của MapLibre; backend không phụ thuộc tile server để ghi dữ liệu.
- **Fallback:** attribution OSM bắt buộc hiển thị; tuân thủ license nguồn tile/data.
- **Secret cần cấu hình:** KHÔNG có (OSS tự host, MVP không cần map credential/token).

## Notification (SMS / FCM / push)

- **Cách gọi:** qua adapter trong `src/modules/platform/notifications/` — môi trường không có hệ thống thật → **adapter mock** (ghi log/DB Notification, không gọi mạng).
- **Request (contract nội bộ):** event DomainEvent → worker tạo Notification theo quyền nhận (VD: báo CA huyện khi người nước ngoài lưu trú).
- **Lỗi xử lý:** mock không lỗi; khi thay adapter thật — retry theo outbox (attempts, deadLetter).
- **Fallback:** notification thất bại không rollback nghiệp vụ (nghiệp vụ đã commit; notification retry qua outbox).
- **Secret cần cấu hình:** (khi thay thật) tên biến môi trường SMS/FCM — KHÔNG ghi giá trị vào docs.

## Camera/AI (LPR, cảnh báo)

- **Cách gọi:** ngoài tranche — chỉ nền `SuspiciousVehicleEntry`/`VehicleObservation` sẵn có; dữ liệu tự động sẽ vào qua API riêng khi triển khai E1-009.
- **Fallback:** không áp dụng trong tranche này.

## PostgreSQL

- **Cách gọi:** Prisma client, `DATABASE_URL` từ `.env` (không hard-code).
- **Lỗi xử lý:** connection lỗi → command thất bại nguyên vẹn (transaction rollback — DR-01); integration test yêu cầu Docker PostgreSQL + `RUN_DB_TESTS=1`.
- **Secret cần cấu hình:** `DATABASE_URL` (đã có trong `.env`, không commit giá trị thật).

## Google Stitch (mockup UI)

- **Cách gọi:** MCP `stitch` (remote) — chỉ dùng ở bước B7 tạo mockup, không phải runtime của sản phẩm.
- **Lưu ý:** phiên thiết kế textual baseline trước đó chưa chạy được Stitch; khi MCP khả dụng, Reviewer có thể yêu cầu đối chiếu visual trước khi chấm rubric UI (spec mục 7).

## Số hóa / ký số

- **Cách gọi:** ngoài phạm vi — chỉ adapter mock; mọi GCN/chữ ký sinh ra ghi rõ "không có giá trị pháp lý" (nếu demo có).
- **Secret cần cấu hình:** chưa có.
