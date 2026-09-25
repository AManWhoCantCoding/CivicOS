# Màn hình: Inspection workspace

## Mục đích
Thực hiện một `Inspection` theo checklist đúng loại hình, ghi kết quả, finding, GPS, ảnh và Evidence.

## Link Stitch
Chưa tạo — Stitch MCP không khả dụng.

## Component chính
- Checklist version rõ ràng, section progress.
- Finding severity/category, ảnh/GPS Evidence.
- Result summary: đạt, nhắc nhở hoặc không đạt.
- Save/submit và trạng thái online-required write.

## Các trạng thái đã thiết kế
- [x] Loading
- [x] Empty — chưa có checklist/Evidence
- [x] Error/retry
- [x] Success/mặc định
- [x] Permission denied/masked data
- [x] Offline basemap / online-required write
- [x] Unsaved changes/submit confirmation

## Ghi chú lệch so với brief (nếu có)
Chưa thể kiểm chứng bằng Stitch; không tự động phát hành quyết định pháp lý theo `spec.md`.
