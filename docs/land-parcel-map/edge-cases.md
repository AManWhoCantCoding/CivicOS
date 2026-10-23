# Case biên: `land-parcel-map`

| ID        | Điều kiện                                                    | Hành vi bắt buộc                                                                       | Không được làm                                             |
| --------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| EC-LPM-01 | Chưa đăng nhập                                               | Trả `401 LAND_UNAUTHENTICATED`; UI forbidden/auth state                                | Không trả existence/geometry                               |
| EC-LPM-02 | Citizen hoặc role map cũ gọi route                           | Trả `403 LAND_FORBIDDEN`                                                               | Không dùng capability map chung để bypass                  |
| EC-LPM-03 | Officer cùng đơn vị nhưng thiếu Assignment                   | Trả `403 LAND_ASSIGNMENT_REQUIRED`                                                     | Không trả polygon để “preview”                             |
| EC-LPM-04 | Cross-OrganizationUnit                                       | Trả forbidden generic                                                                  | Không tiết lộ parcel tồn tại                               |
| EC-LPM-05 | `parcelId` không tồn tại                                     | Trả `404 LAND_PARCEL_NOT_FOUND`                                                        | Không phân biệt unknown với cross-scope qua message        |
| EC-LPM-06 | Geometry invalid/CRS sai/ring hở                             | Trả projection failure an toàn hoặc state `geometry-unavailable`                       | Không tự đóng/sửa polygon                                  |
| EC-LPM-07 | Polygon có holes hoặc nhiều ring                             | Giữ đúng GeoJSON hợp lệ, render không suy diễn                                         | Không flatten thành ring đơn                               |
| EC-LPM-08 | Geometry thay đổi sau khi map load                           | Hiển thị stale và yêu cầu reload projection                                            | Không coi response cũ là current                           |
| EC-LPM-09 | TileServer/provider unavailable                              | Hiển thị provider error/retry                                                          | Không báo đã xem map thành công                            |
| EC-LPM-10 | Thiết bị mobile offline                                      | Không gọi/không render land polygon cache; hiển thị offline state                      | Không lấy polygon từ offline pack                          |
| EC-LPM-11 | Actor đổi parcel focus nhanh                                 | Bỏ qua response cũ, render request mới nhất                                            | Không để polygon parcel A nằm dưới context parcel B        |
| EC-LPM-12 | User sửa query `parcelId`/deep-link                          | Server kiểm tra lại scope; deny nếu sai                                                | Không tin client context                                   |
| EC-LPM-13 | Nhiều polygon gần/chồng nhau ở P1                            | Selection phải cho biết mã thửa và cho phép chọn rõ ràng                               | Không tự đoán polygon                                      |
| EC-LPM-14 | Payload vượt giới hạn P1                                     | Giới hạn cursor/bbox và trả state yêu cầu lọc hẹp hơn                                  | Không tải toàn bộ đơn vị                                   |
| EC-LPM-15 | Map projection bị cache                                      | Response phải no-store; không phục vụ offline polygon P0                               | Không log hoặc lưu raw polygon ngoài boundary              |
| EC-LPM-16 | User mở public lookup rồi bấm map                            | Public lookup không có action/polygon; yêu cầu internal land session                   | Không nâng public query thành internal access              |
| EC-LPM-17 | Parcel ở `proposed`/`retired`                                | Hiển thị status read-only và nhãn mô phỏng                                             | Không cho mutation hoặc gọi là current legal boundary      |
| EC-LPM-18 | Audit/event service lỗi                                      | Theo transaction/audit policy hiện hành, báo lỗi an toàn nếu read audit bắt buộc       | Không ghi audit nửa chừng hoặc PII                         |
| EC-LPM-19 | P1 mở không có scalar filter và không có bbox                | Từ chối `400 LAND_INVALID_REQUEST`, hiển thị yêu cầu nhập filter hoặc thu hẹp viewport | Không tải toàn bộ OrganizationUnit                         |
| EC-LPM-20 | P1 identifier filter có whitespace/case khác nhau            | Trim/normalize trước query; exact match sau normalize; nhiều filter dùng AND           | Không dùng prefix/wildcard hoặc OR ngầm                    |
| EC-LPM-21 | P1 bbox ngoài `CADN_BOUNDS`, đảo min/max hoặc antimeridian   | Từ chối bounded request và yêu cầu chọn viewport hẹp hợp lệ                            | Không query toàn cầu hoặc tự wrap antimeridian             |
| EC-LPM-22 | P1 cursor không hợp lệ hoặc không thuộc filter/bbox hiện tại | Từ chối fail-closed bằng `400 LAND_INVALID_REQUEST`; client reset cursor               | Không bỏ qua cursor mismatch để trả page không xác định    |
| EC-LPM-23 | P1 item/geometry/serialized payload vượt safe boundary       | Trả narrow-query/overflow state an toàn; không cắt ngầm, không trả polygon bán hợp lệ  | Không silently truncate hoặc trả page thiếu mà báo success |
| EC-LPM-24 | P1 filter/bbox thay đổi khi page đang tải                    | Reset cursor, hủy/bỏ qua response cũ và tải query normalized mới                       | Không trộn item của hai query                              |
| EC-LPM-25 | P1 offline hoặc stale page                                   | Không render LandParcel polygon cache; hiển thị offline/stale và retry/reload explicit | Không dùng public lookup/basemap như polygon fallback      |

## DATA-MODEL-IMPACT

- B9 phải kiểm tra cách phát hiện geometry invalid/stale và cách giới hạn query; bảng/cột/index không được suy ra từ danh sách edge case này.
