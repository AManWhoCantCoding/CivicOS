# Mũ Vàng — giá trị và cơ hội

## Giá trị demo

- Luồng từ tiếp nhận đến hoàn tất cho thấy CivicOS có thể điều phối hồ sơ, assignment, approval, event/audit và Evidence trong một aggregate.
- Public lookup tối thiểu tạo điểm kiểm chứng cho công dân mà không mở rộng phạm vi PII.
- Adapter mock tạo integration seam để thay thế bằng kết nối thật trong tương lai mà không biến demo thành tích hợp pháp lý.
- PostGIS Polygon, history không hard-delete và projection read-only làm rõ các boundary kỹ thuật quan trọng.

## Ưu tiên

- P0: F-01 đến F-06 để có workflow dùng được end-to-end.
- P1: F-07 Evidence immutable sau khi workflow và policy đã ổn định.
- Giữ mobile read-only vì đây là surface an toàn, dễ kiểm chứng và không tạo thêm mutation boundary.
