# Màn hình: CivicOS workspace/map

## Mục đích
Shell chung để cán bộ chọn `OrganizationUnit`, xem map nghiệp vụ và chuyển tới các luồng E1-004, E1-005, E1-007. Map dùng MapLibre và giữ attribution OSM.

## Link Stitch
Chưa tạo — Stitch MCP không khả dụng.

## Component chính
- Navigation shell, `OrganizationUnit` context và realtime update indicator.
- MapLibre map, layer toggle, legend, point marker và polygon.
- Search/filter bar, offline basemap banner và OSM attribution.

## Các trạng thái đã thiết kế
- [x] Loading — skeleton shell/map controls.
- [x] Empty — map không có đối tượng trong viewport.
- [x] Error — map/layer lỗi, có retry.
- [x] Success/mặc định — marker, polygon và realtime indicator.
- [x] Permission denied/masked data — lớp hoặc trường bị ẩn theo role.
- [x] Offline basemap / online-required write — cho xem cache, chặn ghi.

## Ghi chú lệch so với brief (nếu có)
Chưa thể kiểm chứng bằng Stitch; không thêm nghiệp vụ ngoài brief/spec.
