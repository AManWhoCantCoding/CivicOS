# Màn hình: Danh sách Cư dân đặc biệt

## Mục đích
Tra cứu và ưu tiên xử lý `SubjectManagementRecord` theo loại cư dân, trạng thái, cán bộ phụ trách và `nextCheck`.

## Link Stitch
Chưa tạo — Stitch MCP không khả dụng.

## Component chính
- Search, filter loại cư dân, trạng thái và cán bộ phụ trách.
- Bảng/list có identity đã mask, assignment, `nextCheck`, overdue indicator.
- Calendar/schedule và CTA mở chi tiết hoặc tạo hoạt động theo dõi.

## Các trạng thái đã thiết kế
- [x] Loading
- [x] Empty
- [x] Error/retry
- [x] Success/mặc định
- [x] Permission denied/masked data
- [x] SLA warning/overdue

## Ghi chú lệch so với brief (nếu có)
Chưa thể kiểm chứng bằng Stitch; giữ đúng loại record và masking theo `spec.md` mục 4.1, 2.6.
