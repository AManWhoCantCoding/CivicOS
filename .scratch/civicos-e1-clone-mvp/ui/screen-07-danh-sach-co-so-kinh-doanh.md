# Màn hình: Danh sách cơ sở kinh doanh

## Mục đích
Tra cứu `RegulatedBusiness`, theo dõi loại hình, risk, trạng thái, lịch kiểm tra, lần gần nhất và vi phạm.

## Link Stitch
Chưa tạo — Stitch MCP không khả dụng.

## Component chính
- Filter business type, risk và status.
- Bảng/list có lịch kiểm tra, overdue state, lần kiểm tra gần nhất và violations.
- Thống kê tỷ lệ đạt/nhắc nhở/vi phạm theo loại hình.

## Các trạng thái đã thiết kế
- [x] Loading
- [x] Empty
- [x] Error/retry
- [x] Success/mặc định
- [x] Permission denied/masked data
- [x] SLA warning/overdue

## Ghi chú lệch so với brief (nếu có)
Chưa thể kiểm chứng bằng Stitch; lịch mặc định 6 tháng/lần theo `spec.md` mục 4.3.
