# API contract: `land-parcel-map`

## Nguyên tắc chung

- Đây là **map read projection riêng**, không dùng public lookup và không trả land detail đầy đủ.
- Tất cả route yêu cầu session hợp lệ và land policy; không có route public cho polygon.
- Response không chứa party, identity, address, rights, encumbrances, Evidence, `changePayload`, sync, approval hoặc audit payload.
- Client không gửi geometry; server đọc nguồn land và chuẩn hóa Polygon.
- Response map không được coi là nguồn pháp lý hoặc nguồn ghi.

## P0 — Đọc một parcel để focus

### `GET /api/map/land-parcels/{parcelId}`

#### Auth và scope

- Session bắt buộc.
- Role bắt buộc: `land_officer` hoặc `commune_leader`.
- Actor phải có `organizationUnitId`.
- `commune_leader` được đọc parcel cùng OrganizationUnit theo leader policy.
- `land_officer` phải thỏa parcel access policy hiện hành: direct Assignment hoặc Assignment của application liên kết theo rule đã khóa.
- Cross-OrganizationUnit, thiếu Assignment hoặc role map cũ → `403`.

#### Request

- Path `parcelId: string` bắt buộc.
- Không có body.
- Client không gửi `organizationId`, role, policy override hoặc geometry.
- Request dùng `cache: no-store`; không tạo offline fallback cho polygon.

#### Response `200`

```json
{
  "parcel": {
    "id": "parcel-001",
    "parcelCode": "PARCEL-001",
    "mapSheetNumber": "12",
    "parcelNumber": "34",
    "status": "active",
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [
          [105.98, 20.95],
          [105.981, 20.95],
          [105.981, 20.951],
          [105.98, 20.95]
        ]
      ]
    },
    "updatedAt": "2026-10-02T00:00:00.000Z"
  },
  "simulated": true,
  "projection": "land-parcel-map"
}
```

`geometry` là Polygon GeoJSON trong WGS84/SRID 4326. `simulated=true` bắt buộc để UI giữ nhãn nội bộ; không có field nào được hiểu là chứng nhận pháp lý.

#### Errors

| HTTP | Code                       | Khi nào                                             |
| ---: | -------------------------- | --------------------------------------------------- |
|  401 | `LAND_UNAUTHENTICATED`     | Thiếu hoặc hết session                              |
|  403 | `LAND_FORBIDDEN`           | Sai role, OrganizationUnit hoặc access policy       |
|  403 | `LAND_ASSIGNMENT_REQUIRED` | Officer thiếu Assignment hợp lệ                     |
|  404 | `LAND_PARCEL_NOT_FOUND`    | Parcel không tồn tại; không tiết lộ cross-scope     |
|  503 | `MAP_PROVIDER_UNAVAILABLE` | Không dựng được map provider; không phải quyền land |
|  503 | `MAP_LAYER_FAILED`         | Projection/geometry không thể phục vụ an toàn       |

Error body giữ contract land/map hiện hành: `{ "code": "...", "error": "..." }`; không chứa geometry hoặc resource detail.

## P1 — Web scoped discovery theo filter/bbox

### `GET /api/map/land-parcels`

P1 chỉ mở trên **web Map/parcel discovery**. Mobile giữ flow P0 focused-single-parcel và không gọi route discovery này. Route P1 dùng cùng land policy boundary với P0, trả `items` theo cursor và không thay thế parcel detail.

#### Auth, scope và request boundary

- Session bắt buộc; role là `land_officer` hoặc `commune_leader`; actor phải có `organizationUnitId`.
- Server áp dụng và re-check land scope cho từng kết quả trước khi materialize/serialize polygon. Cross-OrganizationUnit, public lookup và role map cũ không được làm lộ existence hoặc geometry.
- Không có body; client không gửi `organizationId`, role, policy override hoặc geometry.
- Client trim/normalize mọi filter trước khi gửi. Các filter đã cung cấp kết hợp bằng **AND**.
- Identifier filter (`parcelCode`, `mapSheetNumber`, `parcelNumber`, `communeCode`) là exact match sau normalization; không có prefix/wildcard semantics.
- `status` chỉ nhận giá trị hiện có của `LandParcel`: `proposed`, `active`, `retired`.
- Request phải có ít nhất một scalar filter hoặc một `bbox` hợp lệ. Query rỗng không bị dùng để tải toàn bộ OrganizationUnit.

#### Query parameters

| Parameter        | Contract                                       |
| ---------------- | ---------------------------------------------- |
| `parcelCode`     | Exact normalized match                         |
| `mapSheetNumber` | Exact normalized match                         |
| `parcelNumber`   | Exact normalized match                         |
| `communeCode`    | Exact normalized match                         |
| `status`         | `proposed`, `active` hoặc `retired`            |
| `bbox`           | `minLng,minLat,maxLng,maxLat`, WGS84/SRID 4326 |
| `limit`          | Default `50`, maximum `100`, integer dương     |
| `cursor`         | Opaque existing land cursor; optional          |

`bbox` phải thỏa `minLng < maxLng`, `minLat < maxLat`, không dùng antimeridian và phải nằm trong map extent đã duyệt `CADN_BOUNDS = [105.93, 20.91, 106.03, 20.99]`. Spatial predicate dùng cả bounding-box operator `geometry && envelope` và `ST_Intersects(geometry, envelope)`.

#### Cursor and paging semantics

- Reuse cursor opaque hiện hành `base64url("land:" + id)`.
- Query sắp xếp `ORDER BY "id" ASC`, áp dụng `"id" > cursorId`, fetch `limit + 1` để tạo `nextCursor`.
- Client reset cursor khi normalized filters hoặc bbox thay đổi.
- Server kiểm tra cursor id còn thuộc normalized filter/bbox hiện tại; cursor invalid hoặc mismatch fail-closed bằng `400 LAND_INVALID_REQUEST` và không trả item.
- Không tạo cursor table, cursor cache hoặc cursor field mới.

#### Response `200`

```json
{
  "items": [
    {
      "id": "parcel-001",
      "parcelCode": "PARCEL-001",
      "mapSheetNumber": "12",
      "parcelNumber": "34",
      "status": "active",
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [105.98, 20.95],
            [105.981, 20.95],
            [105.981, 20.951],
            [105.98, 20.95]
          ]
        ]
      },
      "updatedAt": "2026-10-02T00:00:00.000Z"
    }
  ],
  "nextCursor": null,
  "simulated": true,
  "projection": "land-parcel-map"
}
```

Response giữ đúng projection allowlist P0. Mỗi page bị giới hạn bởi `limit` default/max; server không silently truncate item, geometry hoặc serialized payload. Khi safe item/geometry/payload boundary bị vượt, route fail-closed với error envelope an toàn để UI hiển thị `payload overflow / hãy thu hẹp bộ lọc`, không trả một page thiếu hoặc polygon bán hợp lệ.

#### P1 empty/error states

| HTTP/state                     | Contract                                                                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `200` + `items=[]`             | Filter hợp lệ nhưng không có kết quả; UI empty, không coi là `404`                                                                    |
| `400 LAND_INVALID_REQUEST`     | Query rỗng, filter/status/bbox invalid, bbox quá rộng/outside CADN extent, cursor invalid/mismatch hoặc request vượt bounded contract |
| `401 LAND_UNAUTHENTICATED`     | Thiếu hoặc hết session                                                                                                                |
| `403 LAND_FORBIDDEN`           | Sai role, OrganizationUnit, cross-scope hoặc land policy                                                                              |
| `403 LAND_ASSIGNMENT_REQUIRED` | Officer không có Assignment/policy liên quan cho kết quả                                                                              |
| `503 MAP_LAYER_FAILED`         | Query/geometry/serialization không thể phục vụ an toàn; UI query/geometry failure và yêu cầu lọc hẹp hơn khi phù hợp                  |
| `503 MAP_PROVIDER_UNAVAILABLE` | Basemap/provider không dựng được; UI provider error, không giả success                                                                |
| offline/stale                  | Client state; không gọi hoặc không render LandParcel polygon cache, stale phải reload                                                 |

Mọi error body giữ `{ "code": "...", "error": "..." }`, không chứa geometry, count ngoài scope, raw query hoặc resource detail. P1 không thêm error table/code persistence và không publicize payload size.

## Navigation contracts

### Web

- Entry: `/map?parcelId={parcelId}`.
- Map phải coi `parcelId` chỉ là navigation context; server route quyết định quyền.
- Selection link: `/land/parcels/{parcelId}`.
- Không encode polygon, address, party hoặc token trong URL.

### Mobile

- `LandScreen` gọi `MapScreen` với focus context `{ parcelId }`.
- `MapScreen` dùng cùng `GET /api/map/land-parcels/{parcelId}`.
- Mobile không tạo public polygon route và không ghi polygon vào offline pack.

## Projection allowlist

Được phép: `id`, `parcelCode`, `mapSheetNumber`, `parcelNumber`, `status`, `geometry`, `updatedAt`, `simulated`, `projection`.

Không được phép: `organizationId`, `address`, `landUseType`, `nationalRecordRef`, `version` nếu không cần cho UI map, party/identity, rights, encumbrances, Evidence, application payload, sync, approval, audit metadata và storage internals.

## Version/freshness

- `updatedAt` dùng để hiển thị freshness và phát hiện response cũ.
- Client không tự merge polygon cũ với response mới.
- Nếu geometry thay đổi trong lúc map đang mở, client tải lại projection và hiển thị cảnh báo stale; không tự sửa polygon.
