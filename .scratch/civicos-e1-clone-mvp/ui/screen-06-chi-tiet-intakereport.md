# Màn hình: Chi tiết IntakeReport

## Mục đích
Phân loại, xác minh và xử lý một `IntakeReport`, cập nhật Evidence, tạo Incident khi cán bộ xác nhận hoặc chuyển đơn vị khi vượt thẩm quyền.

## Link Stitch
Chưa tạo — Stitch MCP không khả dụng.

## Component chính
- Masked reporter identity và reveal action theo role.
- Classification, verification notes, Evidence.
- CTA create Incident, reject, process, close, transfer.
- Audit history và notification result.

## Các trạng thái đã thiết kế
- [x] Loading
- [x] Empty — chưa có Evidence/history
- [x] Error/retry
- [x] Success/mặc định
- [x] Permission denied/masked data
- [x] SLA warning/overdue
- [x] Approval pending/approved/rejected/transferred

## Ghi chú lệch so với brief (nếu có)
Chưa thể kiểm chứng bằng Stitch; Incident không được tạo tự động khi nhập, đúng `spec.md` mục 4.2.
