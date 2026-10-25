# Thiết kế tính năng: xem thửa đất trên bản đồ nội bộ

## Trạng thái và boundary

- **Feature:** `land-parcel-map`
- **Stage:** B10 — Phase/Ticket
- **Trạng thái:** B9 `APPROVED` — người dùng duyệt data model kỹ thuật ngày 2026-10-02
- **Scope:** P0 web + mobile read-only; P1 discovery filters
- **Dữ liệu:** demo giả lập; không tuyên bố polygon là ranh giới pháp lý chính thức
- **Không làm:** public/citizen map, public polygon, chỉnh sửa geometry, đo đạc, tách/hợp thửa hoặc offline polygon cache

Feature này nối `LandParcel` với map workspace hiện hữu. Map là read projection phục vụ định vị và điều hướng; `LandParcel`/land detail mới là nguồn nghiệp vụ. Map không tạo aggregate hoặc quyền mới.

## Bối cảnh

Map hiện hữu dùng MapLibre/TileServer GL và đang chiếu `Incident`/`Inspection`. Land module có geometry Polygon nội bộ nhưng chỉ hiển thị preview trong parcel detail. Người dùng đã xác nhận cần xem thửa trên map với các quyết định sau:

1. Chỉ `land_officer` và `commune_leader` theo parcel policy hiện tại.
2. P0 gồm web và mobile read-only.
3. P0 tập trung một parcel được chọn; discovery nhiều parcel/filter là P1.
4. Polygon đất đai không được cache offline trong P0.
5. UI/API phải giữ nhãn `internal/simulated`; không dùng `official/certified`.

## Người dùng và mục tiêu

| Nhóm             | Mục tiêu                                    | Quyền trong feature                                            |
| ---------------- | ------------------------------------------- | -------------------------------------------------------------- |
| `land_officer`   | Mở đúng thửa để đối chiếu và xử lý hồ sơ    | Đọc parcel trong OrganizationUnit và Assignment/policy hợp lệ  |
| `commune_leader` | Kiểm tra vị trí thửa và mở hồ sơ liên quan  | Đọc parcel trong OrganizationUnit theo leader policy hiện hành |
| Role map cũ      | Tiếp tục dùng map cho domain hiện tại       | Không được xem LandParcel trong feature này                    |
| Citizen/public   | Tra cứu land projection tối thiểu nếu đã có | Không được xem polygon                                         |

## Feature slices

### F-01 — Scoped parcel map layer (P0)

- Map tải projection của đúng một `parcelId` được focus.
- Hiển thị Polygon, mã thửa, tờ/thửa, trạng thái và `updatedAt` tối thiểu.
- Polygon chỉ được trả sau khi server áp dụng land access policy.

### F-02 — Parcel ↔ map navigation (P0)

- Web parcel list/detail có action `Xem trên bản đồ`.
- Web map selection mở `/land/parcels/{parcelId}` sau khi selection được kiểm tra.
- Navigation giữ context focus nhưng không dùng URL/client state làm quyền.

### F-03 — Mobile read-only map link (P0)

- `LandScreen` hiển thị action `Xem trên bản đồ` khi parcel summary nội bộ đã sẵn sàng.
- Action mở `MapScreen` hiện hữu với parcel được focus.
- Khi offline, action không tải polygon và hiển thị state phù hợp; basemap cache không đồng nghĩa land polygon cache.

### F-04 — Privacy, states và audit (P0)

- Projection map không có party, identity, address, rights, encumbrances, Evidence, `changePayload`, sync hoặc audit payload.
- Có loading, empty, forbidden, not-found, geometry-unavailable, provider-error, offline và stale states.
- Map read/selection được audit ở mức không chứa plaintext PII.

### F-05 — Scoped parcel discovery (P1)

- Surface web-only trên Map/parcel discovery; mobile giữ P0 focused-single-parcel.
- Lọc theo `parcelCode`, `mapSheetNumber`, `parcelNumber`, `communeCode`, `status` với trim/normalize, exact identifier match và AND.
- Phải có ít nhất một scalar filter hoặc valid bounded bbox; bbox WGS84/SRID 4326, không antimeridian, trong `CADN_BOUNDS = [105.93, 20.91, 106.03, 20.99]`.
- Cursor `land:` + `id` opaque, `ORDER BY id ASC`, `id > cursorId`, reset/bind khi filter/bbox đổi; default `50`, max `100`, fetch `limit+1`.
- Query dùng `geometry && envelope` + `ST_Intersects`; response giữ map allowlist, không public/cross-unit leakage và không offline LandParcel polygon cache.
- Không silent truncate; overflow/geometry safety failure hiển thị safe narrow-query state.

## Luồng chính

### Web — parcel detail tới map

1. Actor mở parcel detail đã được land policy cho phép.
2. Actor chọn `Xem trên bản đồ`.
3. Client mở `/map?parcelId={id}` và không gửi polygon trong URL.
4. Map gọi map projection route riêng.
5. Server xác thực session, role, OrganizationUnit và parcel access.
6. Map render polygon, focus, mã thửa, tờ/thửa, status và nhãn `internal/simulated`.
7. Actor chọn polygon để quay lại parcel detail; server kiểm tra access lần nữa.

### Mobile — land summary tới MapScreen

1. Actor đăng nhập bằng role land hợp lệ và tra cứu/đọc parcel summary.
2. `LandScreen` hiển thị action `Xem trên bản đồ`.
3. Client điều hướng `MapScreen` với `parcelId` làm focus context.
4. Map gọi cùng map projection route; không dùng public lookup để lấy polygon.
5. Nếu offline hoặc server trả forbidden/not-found, mobile hiển thị state và không render polygon cũ.

## Boundary với module hiện hữu

- **Map provider:** tái sử dụng MapLibre/TileServer GL và provider config hiện hữu.
- **Land authorization:** tái sử dụng parcel access policy; không tạo role/task mới ở feature này.
- **Land source:** geometry và status lấy từ land read seam; map projection không phải nguồn ghi.
- **Public lookup:** giữ nguyên allowlist tám trường, không mở polygon.
- **Offline:** chỉ basemap có thể cache theo behavior cũ; land polygon không cache P0.

## DATA-MODEL-IMPACT

- B9 phải khảo sát read path geometry, ACL filtering, freshness/version, spatial filter và giới hạn payload sau B8.
- B9 quyết định có tái sử dụng read model hiện hữu hay cần projection/read seam khác; B6 không chọn bảng/cột/index/migration.
- B9 phải kiểm tra khả năng audit map read mà không tạo dữ liệu PII mới.

## Dependency và gate

`feature-list` đã được người dùng chốt ở B5, SOW/design đã được chốt ở B6, P0 Stitch screen set đã được người dùng chốt ở B8, P1 decision contract được user duyệt ngày 2026-10-02 và B9 logical model revision ghi rõ không migration/index. P1 B7 visual prototype resource còn được ghi nhận trong `.scratch/land-parcel-map/ui/stitch-screens.md`; B10 chỉ mở implementation sau khi explicit phase gate đạt.
