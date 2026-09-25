# Màn hình: Enforcement recommendation/approval

## Mục đích
Trình `EnforcementRecommendation` từ finding để Trưởng CA phê duyệt, trả lại hoặc chuyển CA huyện.

## Link Stitch
Chưa tạo — Stitch MCP không khả dụng.

## Component chính
- Finding và Evidence liên quan.
- Recommendation status, lý do và hạn xử lý 7 ngày.
- Approval actions: approve, return, transfer; target `OrganizationUnit`.

## Các trạng thái đã thiết kế
- [x] Loading
- [x] Empty — chưa có recommendation
- [x] Error/retry
- [x] Success/mặc định
- [x] Permission denied/masked data
- [x] SLA warning/overdue
- [x] Approval pending/approved/rejected/transferred

## Ghi chú lệch so với brief (nếu có)
Chưa thể kiểm chứng bằng Stitch; không kết luận pháp lý tự động, đúng `spec.md` mục 4.3 và 6.
