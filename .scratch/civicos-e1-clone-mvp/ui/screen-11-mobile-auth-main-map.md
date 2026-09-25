# Màn hình: Mobile auth/main/map

## Mục đích
Giữ navigation source cho mobile, gồm đăng nhập, main tabs, map và trạng thái định vị; chỉ phục vụ tra cứu trong MVP.

## Link Stitch
Chưa tạo — Stitch MCP không khả dụng.

## Component chính
- Login/auth state, main tabs và map MapLibre.
- Location permission/status, layer toggle, marker và polygon.
- Offline basemap indicator; không có write CTA E1-004/E1-007.

## Các trạng thái đã thiết kế
- [x] Loading
- [x] Empty — map không có dữ liệu
- [x] Error/retry
- [x] Success/mặc định
- [x] Permission denied/masked data
- [x] Offline basemap / online-required write

## Ghi chú lệch so với brief (nếu có)
Chưa thể kiểm chứng bằng Stitch; mobile không có write flow mới theo `spec.md` mục 2.2.
