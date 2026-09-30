# Mũ Trắng — dữ kiện land-module

## Dữ kiện đã khóa

- Phạm vi là demo kỹ thuật một xã, persistence nội bộ chạy thật trên PostgreSQL; chỉ adapter tới Cơ sở dữ liệu quốc gia về đất đai là mock.
- Bốn `changeType`: `transfer`, `information_update`, `mortgage`, `parcel_split_merge`.
- Aggregate workflow là `LandChangeApplication`; các bảng land mới gồm party, parcel, right, encumbrance, application links và national sync.
- Luồng chính: `submitted → in_review → sync_pending → sync_succeeded → pending_approval → completed`; có `rejected` và `sync_failed`.
- Tái sử dụng `User`, `Role`, `UserRole`, `OrganizationUnit`, `Assignment`, `Approval`, `EventRecord`, `OutboxMessage`, `AuditEvent`, `Evidence`.
- Parcel lưu Polygon PostGIS SRID 4326; party có dữ liệu nhận diện mã hóa; public lookup chỉ nhận một `applicationCode` hoặc `parcelCode`.

## Những điều không được suy ra

- Không có kết nối quốc gia thật, quyết định hành chính thật, dữ liệu PII thật hoặc public polygon.
- `LandNationalSync.remoteReference` chỉ là giá trị mô phỏng.
- `completed` mới được mutate quyền/thửa/ràng buộc; event và audit phải cùng transaction.

## Câu hỏi còn lại

- Chi tiết visual do B7 quyết định từ handoff UI; không tự suy ra component mới ngoài screen brief.
- Legal-rule versioning và liên thông thuế/công chứng/ngân hàng nằm ngoài scope.
