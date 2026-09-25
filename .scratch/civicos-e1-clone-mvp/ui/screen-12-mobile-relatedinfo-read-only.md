# Màn hình: RelatedInfo read-only

## Mục đích
Tra cứu Resident, Business, Hotspot và Violation từ map/list/detail sheet trên mobile theo quyền.

## Link Stitch
Chưa tạo — Stitch MCP không khả dụng.

## Component chính
- Search debounce, layer tabs và filter sheet.
- Map/list bottom sheet, detail sheet.
- Read-only masking theo quyền; polygon Hotspot và point markers.
- Không có CTA tạo/cập nhật E1-004/E1-007.

## Các trạng thái đã thiết kế
- [x] Loading
- [x] Empty
- [x] Error/retry
- [x] Success/mặc định
- [x] Permission denied/masked data
- [x] Offline basemap / online-required write

## Ghi chú lệch so với brief (nếu có)
Chưa thể kiểm chứng bằng Stitch; phạm vi bám `spec.md` mục 2.2 và 5.
