# Màn hình: Hàng đợi IntakeReport

## Mục đích
Tiếp nhận và ưu tiên hồ sơ tố giác theo SLA, source channel, severity và status; chỉ dành cho cán bộ trực ban trên web.

## Link Stitch
Chưa tạo — Stitch MCP không khả dụng.

## Component chính
- SLA timer, `sourceChannel`, severity và status chip.
- Search/filter theo SLA, channel, status, severity.
- Reporter identity ở dạng masked; mở chi tiết theo role.

## Các trạng thái đã thiết kế
- [x] Loading
- [x] Empty
- [x] Error/retry
- [x] Success/mặc định
- [x] Permission denied/masked data
- [x] SLA warning/overdue

## Ghi chú lệch so với brief (nếu có)
Chưa thể kiểm chứng bằng Stitch; không thêm public citizen app theo `spec.md` mục 2.2 và 6.
