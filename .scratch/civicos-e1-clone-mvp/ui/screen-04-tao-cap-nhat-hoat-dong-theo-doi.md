# Màn hình: Tạo/cập nhật hoạt động theo dõi

## Mục đích
Cán bộ ghi nhận lần gặp hàng tháng, biến động, đánh giá, thời gian, vị trí và Evidence cho hồ sơ được phân công.

## Link Stitch
Chưa tạo — Stitch MCP không khả dụng.

## Component chính
- Form nội dung, tình hình, đánh giá, ngày/giờ.
- Auto location/GPS khi được cấp quyền.
- Upload ảnh/tài liệu với Evidence metadata.
- Chọn `Assignment`/`SubjectManagementRecord`; Save draft/submit và confirmation.

## Các trạng thái đã thiết kế
- [x] Loading
- [x] Empty — chưa có Evidence hoặc Assignment để chọn
- [x] Error/retry
- [x] Success/mặc định
- [x] Permission denied/masked data
- [x] Offline basemap / online-required write
- [x] Unsaved changes/submit confirmation

## Ghi chú lệch so với brief (nếu có)
Chưa thể kiểm chứng bằng Stitch; thao tác ghi chỉ ở web, đúng `spec.md` mục 4.1.
