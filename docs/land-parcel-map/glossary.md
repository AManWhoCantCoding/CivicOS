# Thuật ngữ domain: `land-parcel-map`

| Thuật ngữ                 | Định nghĩa trong feature                                                                                          | Không đồng nghĩa với                                  |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **LandParcel**            | Thửa đất nội bộ trong land module, có geometry và trạng thái nghiệp vụ.                                           | Bản đồ công khai hoặc ranh giới pháp lý đã chứng nhận |
| **Parcel map projection** | Response read-only tối thiểu dùng để render/focus/selection trên map.                                             | Parcel detail đầy đủ hoặc nguồn dữ liệu địa chính     |
| **Scoped parcel**         | Parcel mà actor được phép đọc sau OrganizationUnit/Assignment/policy check.                                       | Tất cả parcel trong database                          |
| **Focus parcel**          | Parcel được chọn để map mở ở vị trí/zoom phù hợp trong P0.                                                        | Quyền truy cập hoặc trạng thái nghiệp vụ mới          |
| **Selection**             | Thao tác actor chọn polygon để mở parcel detail sau server check.                                                 | Command chỉnh sửa geometry                            |
| **Internal**              | Surface dành cho actor land trong scope, không phải public.                                                       | Citizen/public lookup                                 |
| **Simulated**             | Nhãn dữ liệu demo không có giá trị pháp lý.                                                                       | `official`, `certified`, hồ sơ nhà nước thật          |
| **Freshness**             | Tình trạng map projection còn phù hợp với `updatedAt` của source.                                                 | Bản sao luôn current                                  |
| **Stale**                 | Response hoặc context có thể cũ so với source/provider; cần reload hoặc cảnh báo.                                 | Một trạng thái của `LandParcel`                       |
| **Online-only polygon**   | Polygon chỉ tải khi có kết nối; không lưu vào offline cache P0.                                                   | Basemap offline cache                                 |
| **Map provider**          | Tile/style service dùng để dựng nền bản đồ.                                                                       | Nguồn geometry thửa đất                               |
| **Spatial filter**        | Bounded query theo viewport/bbox ở P1 trong scope.                                                                | Quyền được xem toàn database                          |
| **Map read audit**        | Audit việc đọc/selection map với metadata tối thiểu.                                                              | Domain event thay đổi parcel                          |
| **P1 discovery**          | Web-only read flow để tìm nhiều `LandParcel` bằng scalar exact filters hoặc bounded bbox.                         | Mobile focused map hoặc public lookup                 |
| **Normalized filter**     | Giá trị filter đã trim/normalize trước khi exact-match và bind cursor.                                            | Prefix search hoặc wildcard search                    |
| **Bounded bbox**          | Bbox WGS84/SRID 4326 nằm trong `CADN_BOUNDS`, không antimeridian, được query bằng `&&` và `ST_Intersects`.        | Query toàn cầu hoặc map provider bounds tùy ý         |
| **Safe overflow state**   | State yêu cầu narrow query khi item/geometry/serialized payload không thể phục vụ an toàn; không silent truncate. | Thành công với page thiếu dữ liệu                     |

## Quy tắc dùng từ

- Dùng `thửa đất`, `parcel`, `polygon nội bộ`, `dữ liệu mô phỏng`.
- Không dùng `ranh giới pháp lý`, `bản đồ địa chính chính thức`, `official`, `certified` cho projection demo.
- `MapParcel`/`LandParcel` chỉ là identifiers kỹ thuật; UI tiếng Việt phải giải thích `internal/simulated`.
