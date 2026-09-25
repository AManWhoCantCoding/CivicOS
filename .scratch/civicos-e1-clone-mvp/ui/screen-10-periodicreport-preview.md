# Màn hình: PeriodicReport preview

## Mục đích
Xem snapshot báo cáo tháng E1-004, kiểm tra dữ liệu thiếu, phê duyệt và gửi tới `OrganizationUnit` cấp trên.

## Link Stitch
Chưa tạo — Stitch MCP không khả dụng.

## Component chính
- Snapshot preview, số liệu nguồn và danh sách đối tượng.
- Validation dữ liệu thiếu trước submit.
- Approval state, send target và immutable snapshot notice.

## Các trạng thái đã thiết kế
- [x] Loading
- [x] Empty — chưa đủ dữ liệu nguồn
- [x] Error/retry
- [x] Success/mặc định
- [x] Permission denied/masked data
- [x] Unsaved changes/submit confirmation
- [x] Approval pending/approved/rejected/transferred

## Ghi chú lệch so với brief (nếu có)
Chưa thể kiểm chứng bằng Stitch; snapshot bất biến khi phê duyệt/gửi theo `spec.md` mục 3.2 và 4.1.
