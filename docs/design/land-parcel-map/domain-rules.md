# Quy tắc nghiệp vụ: `land-parcel-map`

## DR-LPM-01 — Map là read projection

Map chỉ đọc dữ liệu đã được land policy cho phép. Không có command thay đổi `LandParcel`, `LandRight`, `LandEncumbrance` hoặc `LandChangeApplication` từ map.

## DR-LPM-02 — Giữ nguyên land access boundary

Quyền xem map parcel không rộng hơn quyền xem parcel detail:

- `land_officer` phải có OrganizationUnit hợp lệ và Assignment/policy liên quan.
- `commune_leader` chỉ đọc parcel cùng OrganizationUnit theo leader policy.
- Role của map module cũ không tự động có quyền xem parcel.
- Cross-OrganizationUnit, unknown parcel và thiếu Assignment đều fail-closed.

## DR-LPM-03 — Nguồn nghiệp vụ duy nhất

Geometry/status của map phải bắt nguồn từ land read seam. Map projection không được trở thành bản ghi địa chính thứ hai và không được cho phép client gửi geometry để render như dữ liệu thật.

## DR-LPM-04 — Geometry không suy diễn

- Chỉ nhận Polygon WGS84/SRID 4326 đã hợp lệ.
- Không biến Point thành Polygon.
- Không tự đóng ring, tự sửa self-intersection hoặc tự đổi CRS.
- Geometry invalid/không thể chuẩn hóa → `MAP_LAYER_FAILED` hoặc state `geometry-unavailable`, không trả polygon bán hợp lệ.

## DR-LPM-05 — Tối thiểu hóa projection

Map chỉ trả allowlist phục vụ định vị, selection và điều hướng. Party, identity, address, rights, encumbrances, Evidence, sync, approval và audit detail chỉ đọc ở surface được phép khác.

## DR-LPM-06 — Một parcel được focus ở P0

P0 hỗ trợ navigation và selection một parcel. Hiển thị nhiều parcel, filter và viewport discovery thuộc P1, phải giữ bounded payload và cùng policy.

## DR-LPM-07 — Mobile online-only polygon

Mobile có thể mở map read-only từ `LandScreen`, nhưng không cache polygon đất đai trong P0. Khi offline, chỉ giữ basemap behavior hiện hữu; land layer chuyển sang offline/stale state và không render polygon cũ.

## DR-LPM-08 — Nhãn mô phỏng bắt buộc

UI map phải hiển thị `internal`/`simulated`. Không dùng `official`, `certified`, `legal boundary` hoặc wording khiến người dùng hiểu polygon là hồ sơ pháp lý.

## DR-LPM-09 — Selection phải kiểm tra lại quyền

Polygon click, deep-link, query string và mobile navigation context chỉ là input không tin cậy. Trước khi trả map projection hoặc mở detail, server phải thực hiện access check theo resource thật.

## DR-LPM-10 — Freshness không được giả thành current

Map hiển thị `updatedAt`. Response cũ, provider stale hoặc geometry thay đổi trong lúc xem phải tạo state cảnh báo/tải lại; không âm thầm coi dữ liệu cũ là hiện trạng.

## DR-LPM-11 — Audit không ghi PII

Map list/read/selection được audit theo resource và kết quả policy tối thiểu. Metadata audit không ghi plaintext party, identity, address đầy đủ, polygon raw hoặc token.

## DR-LPM-12 — P1 discovery bounded và web-only

- P1 chỉ mở trên web Map/parcel discovery; mobile giữ P0 focused-single-parcel.
- Query phải có ít nhất một scalar filter hoặc bbox hợp lệ trong `CADN_BOUNDS`; không có empty unbounded query.
- Scalar filters được trim/normalize, identifier exact match và kết hợp bằng AND.
- Cursor/limit reuse contract hiện hành: opaque `land:` + `id`, `ORDER BY id ASC`, `id > cursorId`, default `50`, max `100`, fetch `limit+1`; filter/bbox đổi thì reset và mismatch fail-closed.
- Bbox WGS84/SRID 4326 không antimeridian, dùng `geometry && envelope` và `ST_Intersects`.
- Không silent truncate item/geometry/payload. Safe overflow hoặc geometry failure chuyển thành narrow-query/error state, không trả dữ liệu không đầy đủ như success.

## Máy trạng thái UI

```text
idle → loading → ready
             ├── forbidden
             ├── not_found
             ├── geometry_unavailable
             ├── provider_error
             ├── offline
             └── stale → reload → ready/error
```

Trạng thái UI không phải trạng thái nghiệp vụ của `LandParcel`; không được ghi ngược state map vào land aggregate.

## DATA-MODEL-IMPACT

- Việc lưu `updatedAt`, version, geometry source, spatial filter và projection freshness cần được B9 khảo sát trên database hiện tại.
- B6 không chọn bảng/cột/index hoặc migration để thực thi các rule trên.
