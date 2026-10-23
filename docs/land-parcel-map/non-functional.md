# Yêu cầu phi chức năng: `land-parcel-map`

## Bảo mật và riêng tư

- Mọi map parcel route gọi session và land policy server-side.
- Role map cũ không được suy ra quyền land.
- Response projection không chứa PII, party, address, Evidence, sync hoặc approval detail.
- `Cache-Control: no-store` cho polygon response; không đưa polygon vào browser/offline pack cache trong P0.
- URL chỉ chứa navigation context; không chứa geometry, PII, token hoặc policy override.
- Log/audit chỉ giữ resource id, action và kết quả policy cần thiết; không log polygon raw.

## Tính đúng đắn không gian

- Input/output Polygon phải dùng WGS84/SRID 4326 theo land geometry contract.
- Polygon invalid, CRS sai hoặc geometry không thể chuẩn hóa phải fail-closed.
- Map không tự đóng ring, sửa geometry hoặc tính lại diện tích nghiệp vụ.
- `areaSqm` của land detail không được suy ra từ polygon map.

## Hiệu năng và giới hạn

- P0 chỉ tải một parcel được focus để tránh tải toàn bộ đơn vị.
- P1 web-only bắt buộc ít nhất một scalar filter hoặc valid bounded bbox; không query rỗng để tải toàn bộ đơn vị.
- P1 filter trim/normalize, exact identifier match và AND; cursor dùng `land:` + `id`, `ORDER BY id ASC`, `id > cursorId`, default `50`, max `100`, fetch `limit+1`.
- P1 bbox dùng WGS84/SRID 4326, không antimeridian, nằm trong `CADN_BOUNDS = [105.93, 20.91, 106.03, 20.99]`, và query dùng `geometry && envelope` + `ST_Intersects`.
- P1 item payload bị giới hạn bởi default/max `limit` `50/100`. Không silently truncate geometry hoặc response; overflow/geometry safety failure phải fail-closed và yêu cầu narrow query.
- Map projection không join party/rights/encumbrance/Evidence nếu không cần cho allowlist.
- UI phải hủy/ignore response cũ khi actor đổi parcel focus.
- Không coi tile/provider health là bằng chứng geometry hoặc dữ liệu land đã sẵn sàng.

## Khả dụng và offline

- Map provider lỗi → `MAP_PROVIDER_UNAVAILABLE`/provider error state, không giả success.
- Land polygon không có offline fallback P0.
- P1 discovery không mở mobile polygon flow; mobile vẫn P0 focused-single-parcel và không cache LandParcel polygon.
- Web P1 offline không phục vụ polygon cũ; stale page/filter/cursor phải reload, không merge response cũ.
- Basemap offline có thể tiếp tục theo behavior map hiện hữu nhưng land layer phải báo offline/stale.
- Retry không được tự động lặp vô hạn và không tạo request mutation.

## Accessibility và UX

- Action `Xem trên bản đồ`, `Mở chi tiết thửa`, layer/selection và retry có accessible name/keyboard/touch target.
- Polygon selection phải có alternative text/status panel; không phụ thuộc màu duy nhất.
- Loading, empty, forbidden, not-found, geometry-unavailable, provider-error, offline và stale phải được thông báo qua state surface hiện hữu.
- P1 phải có state text cho initial idle/no unbounded query, invalid/wide bbox, invalid/mismatched cursor, empty result và safe payload/geometry overflow.
- Nhãn `internal/simulated` hiển thị gần polygon/selection, không ẩn trong tooltip duy nhất.

## Audit và quan sát

- Audit map projection read và selection theo resource, actor, organization scope, outcome và timestamp.
- Không ghi raw polygon, party plaintext, identity hoặc full query nếu có thể suy ra dữ liệu nhạy cảm.
- Metrics nên tách provider failure, policy denial, geometry failure, stale reload và successful projection; không đếm làm lộ số parcel ngoài scope.

## DATA-MODEL-IMPACT

- B9 khảo sát spatial index/read model, geometry serialization, freshness và audit storage.
- Không tạo cache table, materialized view hoặc spatial index mới tại B6.
