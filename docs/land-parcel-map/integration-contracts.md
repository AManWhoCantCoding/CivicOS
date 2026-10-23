# Hợp đồng tích hợp: `land-parcel-map`

## Map provider và rendering

- Tái sử dụng provider config, OSM attribution, CADN bounds và MapLibre hiện hữu.
- Provider chỉ cung cấp basemap/style; không phải nguồn geometry land.
- Polygon land được đưa vào GeoJSON layer riêng với id/name không đụng layer Incident/Inspection.
- Provider unavailable chỉ ảnh hưởng rendering surface; không được biến thành success của land read.

## Land access và source

- Route map gọi land access seam hiện hành, tương đương parcel detail: role, OrganizationUnit, Assignment và resource scope.
- Map route không gọi public lookup để lấy geometry.
- Map projection đọc source geometry của land module qua read seam được B9 xác nhận.
- Map không tạo `LandParcel` hoặc thay đổi `LandParcel`, quyền, ràng buộc, application hay Evidence.

## Map projection API

- P0 dùng `GET /api/map/land-parcels/{parcelId}`.
- P1 dùng `GET /api/map/land-parcels` trên web với scalar filter/cursor/bbox theo `api-contract.md`; không có empty unbounded query.
- P1 filter exact normalized + AND; bbox nằm trong `CADN_BOUNDS`, dùng `geometry && envelope` + `ST_Intersects`; cursor/limit dùng contract hiện hành `land:` + `id` / `50/100`.
- P0 giữ projection contract chung web/mobile; P1 không tạo mobile discovery hoặc mobile-only polygon shape.
- Allowlist, errors, no-store và `simulated=true` theo `api-contract.md`; overflow không silent truncate và chuyển safe narrow-query state.

## Web integration

- Parcel list/detail link tới `/map?parcelId=...`.
- `MapWorkspace` đọc query context, gọi route map projection và render focus/selection.
- Selection quay về `/land/parcels/{parcelId}`; detail API vẫn kiểm tra land policy.
- Không truyền polygon qua URL hoặc server component props nếu không cần.

## Mobile integration

- `LandScreen` giữ flow lookup/application/parcel hiện tại và thêm action read-only sau khi parcel summary sẵn sàng.
- Action dùng `AppNavigator` context để mở `MapScreen`; không tạo map component thứ hai.
- Mobile map gọi cùng P0 route; offline chỉ hiển thị state, không dùng land polygon cache.
- Mobile không gọi P1 discovery; mobile remains P0 focused-single-parcel.
- `RelatedInfo` layer catalog không được dùng để giả dạng LandParcel; land layer có contract/policy riêng.

## Audit và eventing

- Map read/selection dùng audit seam hiện có; metadata tối thiểu, không ghi raw polygon/PII.
- Không phát hành domain event chỉ vì người dùng xem map nếu event store không yêu cầu; audit read là boundary bắt buộc theo policy được chốt.
- Map projection không tạo outbox message và không làm thay đổi aggregate version.

## Security/cache boundary

- Polygon response `no-store`; không đưa vào offline pack P0.
- Browser/mobile cache chỉ được giữ basemap theo map module cũ.
- Không cache response qua CDN/public proxy.

## P1 query-plan decision

- B9 reuse existing `LandParcel` scalar/GiST indexes and raw SQL read seam.
- Techlead local read-only probe ran scalar and bounded bbox shapes against one demo row; `Seq Scan`/sub-millisecond execution is non-representative.
- **No migration/index change authorized** from this probe. Any future production-like evidence requiring an index reopens B9 and user approval.

## B9 handoff

- B9 khảo sát schema/database hiện tại, PostGIS read path, query plan, spatial index, projection freshness và audit storage.
- Nếu cần cấu trúc dữ liệu mới, B9 phải thiết kế sau khi SOW/design/mockup được chốt; B6 không tạo `data-model.md`.
