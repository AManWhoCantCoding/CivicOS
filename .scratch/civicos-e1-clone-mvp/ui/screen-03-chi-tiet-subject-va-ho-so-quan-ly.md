# Màn hình: Chi tiết Subject và hồ sơ quản lý

## Mục đích
Hiển thị hồ sơ `Subject`, assignment, lịch sử hoạt động và Evidence; identity chỉ lộ theo quyền.

## Link Stitch
Chưa tạo — Stitch MCP không khả dụng.

## Component chính
- Identity masked/permission-aware fields.
- Assignment summary, activity timeline và Evidence preview.
- CTA tạo hoạt động theo dõi và tạo báo cáo tháng.

## Các trạng thái đã thiết kế
- [x] Loading
- [x] Empty — chưa có activity/Evidence
- [x] Error/retry
- [x] Success/mặc định
- [x] Permission denied/masked data

## Ghi chú lệch so với brief (nếu có)
Chưa thể kiểm chứng bằng Stitch; không hiển thị dữ liệu PII thật theo `spec.md`.
