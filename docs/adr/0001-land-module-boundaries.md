# Ranh giới kiến trúc land-module

**Status:** accepted — người dùng chốt trong B6 ngày 2026-09-30.

`LandChangeApplication` là aggregate điều phối vòng đời hồ sơ; `LandRight`, `LandParcel` và `LandEncumbrance` chỉ được mutate khi hồ sơ chuyển sang `completed`, cùng transaction với `EventRecord` và `AuditEvent`. Kết nối Cơ sở dữ liệu quốc gia về đất đai đi qua adapter mock riêng để không biến demo thành nguồn dữ liệu pháp lý thật. Geometry của `LandParcel` dùng PostGIS và được truy cập qua SQL parameterized seam vì Prisma hiện dùng `Unsupported` cho kiểu geometry. Quyết định này giữ integration boundary thay thế được, bảo toàn lịch sử và tránh public hóa polygon/PII.
