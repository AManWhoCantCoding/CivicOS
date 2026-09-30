# Mũ Xanh Dương — tổng hợp và trình tự

## Quyết định điều phối

1. Khóa data model và integration boundary trước khi tạo ticket.
2. Chia triển khai thành năm phase: foundation/access → intake/review → sync/approval → public/read-only → Evidence/hardening.
3. LND-01 chỉ làm schema, PostGIS, migration, role seed và test; chưa làm service/API/adapter.
4. Mọi ticket phải chỉ rõ file được phép sửa, dependency, AC, test-skeleton và rubric.
5. Verify từng ticket trước khi chuyển phase; không mở rộng route/bảng/cột ngoài design lock.

## Kết quả tổng hợp

- Chọn F-01–F-06 là P0, F-07 là P1.
- Giữ public lookup tối thiểu, không public polygon/PII.
- Giữ mock quốc gia duy nhất; `completed` là boundary mutation.
- UI web có role/state surfaces; mobile chỉ read-only.
