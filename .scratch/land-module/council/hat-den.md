# Mũ Đen — rủi ro và điều kiện thất bại

## Rủi ro chính

- Lưu plaintext tên/số định danh trong DB, event, audit hoặc public response.
- Duplicate application/sync khi retry; cùng idempotency key nhưng payload khác bị nhận.
- Tổng `sharePercent` sau transfer không bằng `100.00`.
- Dùng Point/JSON thay cho PostGIS Polygon, hoặc thiếu extension trước migration.
- Officer khác `OrganizationUnit`, thiếu Assignment `land_review`, hoặc citizen gọi mutation.
- Sync failure vẫn tạo Approval hoặc mutate `LandRight`/`LandParcel`/`LandEncumbrance`.
- Hard-delete làm mất lịch sử application, quyền, Evidence hoặc event/audit.

## Guardrail bắt buộc

- FK nghiệp vụ `RESTRICT`, CHECK/index/unique ở database, transaction cho domain + event + audit.
- Public projection allowlist đúng tám trường; mobile read-only không có write control.
- Mock adapter không nhận outcome từ client và không có endpoint quốc gia thật.
