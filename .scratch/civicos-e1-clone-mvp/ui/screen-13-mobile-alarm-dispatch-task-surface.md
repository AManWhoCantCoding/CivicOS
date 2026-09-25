# Màn hình: Alarm/dispatch/task surface

## Mục đích
Giữ các surface mobile cần cho ngữ cảnh Incident/field; không mở rộng thành flow ghi mới cho E1-004/E1-007.

## Link Stitch
Chưa tạo — Stitch MCP không khả dụng.

## Component chính
- Alarm, dispatch và task surface theo navigation source.
- Context map/field và trạng thái task.
- Read-only detail/masking theo quyền; link về RelatedInfo khi phù hợp.

## Các trạng thái đã thiết kế
- [x] Loading
- [x] Empty
- [x] Error/retry
- [x] Success/mặc định
- [x] Permission denied/masked data
- [x] Offline basemap / online-required write

## Ghi chú lệch so với brief (nếu có)
Chưa thể kiểm chứng bằng Stitch; không thêm write flow E1-004/E1-007 theo brief và `spec.md`.
