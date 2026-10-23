# API contract: land-module

## Quy ước chung

- `IsoDate` là JSON `string` ISO-8601 UTC.
- `DecimalString` là JSON `string` có tối đa hai chữ số thập phân, dùng cho `areaSqm` và `sharePercent`.
- `GeometryPolygon` là GeoJSON object `{ "type": "Polygon", "coordinates": number[][][] }` với SRID 4326.
- Error body thống nhất là `{ "code": string, "error": string }`; `error` là thông báo tiếng Việt, `code` là mã ổn định.
- Internal API yêu cầu session; public lookup không yêu cầu session.
- `Idempotency-Key` là header bắt buộc cho create application; `If-Match-Version` là header bắt buộc cho transition command.
- **Nguồn:** quy ước mới được người dùng chốt tại B6 Q1, Q11, Q20, Q21, Q25; session/error shape tham chiếu `src/app/api/establishments/[establishmentId]/route.ts:12-29`.

## Kiểu response dùng chung

### `Party`

| Field                  | Kiểu          | Nullable        | Ghi chú                                                                          |
| ---------------------- | ------------- | --------------- | -------------------------------------------------------------------------------- |
| `id`                   | `string`      | Không           | Cuid.                                                                            |
| `referenceCode`        | `string`      | Không           | Mã không nhận diện.                                                              |
| `partyType`            | `"individual" | "organization"` | Không                                                                            | Theo data model.   |
| `displayName`          | `string`      | Không           | Đã giải mã cho internal role có `read_sensitive`.                                |
| `identityNumberMasked` | `string`      | Có              | Null nếu không có identity number; giữ 4 ký tự cuối, phần còn lại thay bằng `*`. |
| `status`               | `"active"     | "archived"`     | Không                                                                            | Không hard-delete. |
| `createdAt`            | `IsoDate`     | Không           | UTC.                                                                             |
| `updatedAt`            | `IsoDate`     | Không           | UTC.                                                                             |

### `Parcel`

| Field               | Kiểu              | Nullable | Ghi chú                          |
| ------------------- | ----------------- | -------- | -------------------------------- |
| `id`                | `string`          | Không    | Cuid.                            |
| `parcelCode`        | `string`          | Không    | Unique toàn module.              |
| `mapSheetNumber`    | `string`          | Không    | Số tờ.                           |
| `parcelNumber`      | `string`          | Không    | Số thửa.                         |
| `areaSqm`           | `DecimalString`   | Không    | `>0`.                            |
| `landUseType`       | `string`          | Không    | Catalog cấu hình.                |
| `address`           | `string`          | Không    | Internal response; không public. |
| `communeCode`       | `string`          | Không    | Mã xã.                           |
| `organizationId`    | `string`          | Không    | Phạm vi đơn vị.                  |
| `geometry`          | `GeometryPolygon` | Không    | Internal response; không public. |
| `nationalRecordRef` | `string`          | Có       | Null trước sync success.         |
| `status`            | `"proposed"       | "active" | "retired"`                       | Không | `proposed` trước completed split/merge. |
| `version`           | `integer`         | Không    | Optimistic concurrency.          |
| `createdAt`         | `IsoDate`         | Không    | UTC.                             |
| `updatedAt`         | `IsoDate`         | Không    | UTC.                             |

### `LandRightSummary` và `LandEncumbranceSummary`

- `LandRightSummary`: `id: string`, `parcelId: string`, `partyId: string`, `rightType: "land_use_right"`, `sharePercent: DecimalString`, `status: "active" | "ended"`, `validFrom: IsoDate`, `validTo: IsoDate | null`, `sourceApplicationId: string | null`.
- `LandEncumbranceSummary`: `id: string`, `parcelId: string`, `securedPartyId: string | null`, `encumbranceType: "mortgage"`, `status: "active" | "released"`, `externalReference: string | null`, `registeredAt: IsoDate`, `releasedAt: IsoDate | null`, `sourceApplicationId: string`.
- `LandRightSummary` không giải mã party; client dùng `GET /api/land/parties` để đọc party theo policy. Hai summary chỉ xuất hiện ở internal parcel detail, không public.
- **Nguồn:** field từ `data-model.md:84-118`; projection mới “Mới (xác nhận với người dùng ngày 2026-09-30, B6 Q27)”.

### `ApplicationSummary` và `ApplicationDetail`

| Field             | Kiểu                  | Nullable             | Ghi chú                                    |
| ----------------- | --------------------- | -------------------- | ------------------------------------------ |
| `id`              | `string`              | Không                | Aggregate ID.                              |
| `applicationCode` | `string`              | Không                | Public lookup key.                         |
| `organizationId`  | `string`              | Không                | Scope đơn vị.                              |
| `changeType`      | `"transfer"           | "information_update" | "mortgage"                                 | "parcel_split_merge"` | Không | Bốn loại trong scope. |
| `status`          | `string`              | Không                | Một trong tám state data model.            |
| `changePayload`   | `object`              | Không                | Chỉ có ở detail; không public.             |
| `createdById`     | `string`              | Không                | Actor cán bộ.                              |
| `parties`         | `ApplicationParty[]`  | Không                | Detail; có thể rỗng khi list link chưa có. |
| `parcels`         | `ApplicationParcel[]` | Không                | Detail; có thể rỗng khi list link chưa có. |
| `version`         | `integer`             | Không                | Header `If-Match-Version`.                 |
| `submittedAt`     | `IsoDate`             | Không                | UTC.                                       |
| `updatedAt`       | `IsoDate`             | Không                | UTC.                                       |
| `completedAt`     | `IsoDate`             | Có                   | Null trước completed.                      |
| `rejectionReason` | `string`              | Có                   | Null nếu chưa rejected.                    |

`ApplicationParty` gồm `partyId: string`, `partyRole: string`, `sharePercent: DecimalString | null`. `ApplicationParcel` gồm `parcelId: string`, `parcelRole: "subject" | "source" | "result"`.

### `Sync`

`Sync` gồm `id: string`, `applicationId: string`, `operation: "register_change"`, `requestKey: string`, `status: "pending" | "succeeded" | "failed"`, `remoteReference: string | null`, `requestPayload: object`, `responsePayload: object | null`, `failureCode: string | null`, `attempts: integer`, `requestedAt: IsoDate`, `completedAt: IsoDate | null`, `createdAt: IsoDate`, `updatedAt: IsoDate`.

### `Evidence`, `Approval`, `TimelineEvent`

- `Evidence`: `id`, `resourceType`, `resourceId`, `fileName`, `mimeType`, `sizeBytes`, `originalHash`, `immutable`, `description: string | null`, `createdAt` — tất cả `string` trừ `sizeBytes: integer`, `immutable: boolean`; không có `storageKey`.
- `Approval`: `id`, `resourceType`, `resourceId`, `action`, `status`, `organizationId`, `requestedById`, `decidedById: string | null`, `reason: string | null`, `payload: object | null`, `requestedAt`, `decidedAt: IsoDate | null`.
- `TimelineEvent`: `eventId`, `eventType`, `aggregateType`, `aggregateId`, `aggregateVersion: integer`, `actor: { id: string, name: string, role: string | null, organizationId: string | null } | null`, `payload: object`, `metadata: object`, `occurredAt: IsoDate`.
- **Nguồn:** các kiểu mới được chốt ở B6 Q19–Q25; cột/nullable nền từ `data-model.md:44-192` và `prisma/schema.prisma:82-180`.

## Bảng endpoint

| Method | Path                                                | Auth                                | Tính năng | Ghi chú                                    | Nguồn                                                     |
| ------ | --------------------------------------------------- | ----------------------------------- | --------- | ------------------------------------------ | --------------------------------------------------------- |
| GET    | `/api/land/parties`                                 | `land_officer`/`commune_leader`     | F-01      | Cursor list, cùng OrganizationUnit.        | Mới, B6 Q12/Q15                                           |
| POST   | `/api/land/parties`                                 | `land_officer`/`commune_leader`     | F-01      | Encrypt sensitive fields.                  | Mới, B6 Q12/Q19                                           |
| GET    | `/api/land/parcels`                                 | `land_officer`/`commune_leader`     | F-01      | Cursor list, geometry nội bộ.              | Mới, B6 Q12/Q15                                           |
| POST   | `/api/land/parcels`                                 | `land_officer`/`commune_leader`     | F-01      | GeoJSON Polygon SRID 4326.                 | Mới, B6 Q12/Q20                                           |
| GET    | `/api/land/parcels/{parcelId}`                      | scoped internal role                | F-01      | Parcel detail kèm rights/encumbrances.     | Mới, B6 Q27                                               |
| GET    | `/api/land/applications`                            | `land_officer`/`commune_leader`     | F-02      | Filter + cursor.                           | Mới, B6 Q12/Q15                                           |
| POST   | `/api/land/applications`                            | `land_officer`                      | F-02      | `Idempotency-Key` bắt buộc.                | Mới, B6 Q12/Q21                                           |
| GET    | `/api/land/applications/{applicationId}`            | scoped internal role                | F-02      | Detail, PII theo capability.               | Mới, B6 Q12/Q19                                           |
| POST   | `/api/land/applications/{applicationId}/review`     | assigned `land_officer`             | F-02/F-06 | `submitted → in_review`.                   | Mới, B6 Q12/Q13/Q22                                       |
| POST   | `/api/land/applications/{applicationId}/sync`       | assigned `land_officer`             | F-03      | Sync mock đồng bộ.                         | Mới, B6 Q12/Q14                                           |
| POST   | `/api/land/applications/{applicationId}/sync/retry` | assigned `land_officer`             | F-03      | Chỉ từ `sync_failed`.                      | Mới, B6 Q12/Q14                                           |
| POST   | `/api/land/applications/{applicationId}/approve`    | `commune_leader`                    | F-04      | `pending_approval → completed`.            | Mới, B6 Q12/Q22                                           |
| POST   | `/api/land/applications/{applicationId}/reject`     | `commune_leader`                    | F-04      | Reason bắt buộc.                           | Mới, B6 Q12/Q22                                           |
| GET    | `/api/land/applications/{applicationId}/timeline`   | scoped internal role                | F-02/F-06 | Event timeline, không public.              | Mới, B6 Q9/Q12                                            |
| POST   | `/api/land/applications/{applicationId}/evidence`   | scoped internal role                | F-07      | Multipart, max 10 MiB.                     | Mới, B6 Q16/Q23                                           |
| GET    | `/api/land/applications/{applicationId}/evidence`   | scoped internal role                | F-07      | Metadata, không storageKey.                | Mới, B6 Q12/Q23                                           |
| POST   | `/api/land/parcels/{parcelId}/evidence`             | scoped internal role                | F-07      | Nested multipart, max 10 MiB.              | Mới, người dùng xác nhận 2026-09-30                       |
| GET    | `/api/land/parcels/{parcelId}/evidence`             | scoped internal role                | F-07      | Nested metadata, không storageKey.         | Mới, người dùng xác nhận 2026-09-30                       |
| POST   | `/api/land/parties/{partyId}/evidence`              | scoped internal role                | F-07      | Nested multipart, max 10 MiB.              | Mới, người dùng xác nhận 2026-09-30                       |
| GET    | `/api/land/parties/{partyId}/evidence`              | scoped internal role                | F-07      | Nested metadata, không storageKey.         | Mới, người dùng xác nhận 2026-09-30                       |
| GET    | `/api/public/land/lookup`                           | Không cần session                   | F-05      | Chính xác một query key.                   | Mới, B6 Q12/Q24                                           |
| GET    | `/api/identity/assignments`                         | Existing identity policy            | F-06      | Reuse route; filter LandChangeApplication. | Đã có, `src/app/api/identity/assignments/route.ts:11-25`  |
| POST   | `/api/identity/assignments`                         | `commune_leader` sau policy mở rộng | F-06      | Reuse route; task `land_review`.           | Đã có route, role land là mới                             |
| DELETE | `/api/identity/assignments`                         | `commune_leader` sau policy mở rộng | F-06      | Reuse route; reason bắt buộc.              | Đã có, `src/app/api/identity/assignments/route.ts:76-105` |

## Chi tiết endpoint

### GET `/api/land/parties`

- Mô tả: Liệt kê party trong OrganizationUnit của actor.
- Auth: `land_officer` hoặc `commune_leader`, capability `read_sensitive` nếu cần displayName.
- Request: query `status: active|archived` tùy chọn, `partyType: individual|organization` tùy chọn, `limit: integer` tùy chọn default 50 max 100, `cursor: string` tùy chọn.
- Response 200:

```json
{
  "items": [
    {
      "id": "party-001",
      "referenceCode": "PARTY-001",
      "partyType": "individual",
      "displayName": "Demo Citizen",
      "identityNumberMasked": "*******0001",
      "status": "active",
      "createdAt": "2026-09-30T00:00:00.000Z",
      "updatedAt": "2026-09-30T00:00:00.000Z"
    }
  ],
  "nextCursor": null
}
```

- Mã lỗi: `401 LAND_UNAUTHENTICATED`; `403 LAND_FORBIDDEN`; `400 LAND_INVALID_REQUEST` nếu query sai.
- Pagination: `limit` default 50/max 100, cursor opaque, `nextCursor` nullable string.
- Idempotency: GET không mutation.
- Nguồn: Mới, B6 Q12/Q15/Q19.

### POST `/api/land/parties`

- Mô tả: Tạo party giả lập và mã hóa field nhạy cảm.
- Auth: `land_officer` hoặc `commune_leader`.
- Request JSON: `referenceCode: string` bắt buộc, `partyType: "individual"|"organization"` bắt buộc, `displayName: string` bắt buộc, `identityNumber: string|null` tùy chọn; `Idempotency-Key` không bắt buộc cho endpoint này.
- Response 201:

```json
{
  "party": {
    "id": "party-001",
    "referenceCode": "PARTY-001",
    "partyType": "individual",
    "displayName": "Demo Citizen",
    "identityNumberMasked": "*******0001",
    "status": "active",
    "createdAt": "2026-09-30T00:00:00.000Z",
    "updatedAt": "2026-09-30T00:00:00.000Z"
  }
}
```

- Mã lỗi: `401 LAND_UNAUTHENTICATED`; `403 LAND_FORBIDDEN`; `400 LAND_INVALID_REQUEST`; `409 LAND_DUPLICATE_CODE`.
- Pagination: Không áp dụng.
- Idempotency: Retry không bảo đảm nếu không gửi key; client dùng `referenceCode` unique để phát hiện duplicate.
- Nguồn: Mới, B6 Q12/Q19.

### GET `/api/land/parcels`

- Mô tả: Liệt kê parcel nội bộ theo OrganizationUnit.
- Auth: `land_officer` hoặc `commune_leader`.
- Request: query `status`, `communeCode`, `parcelCode` tùy chọn; `limit` default 50 max 100; `cursor` tùy chọn.
- Response 200: `{ "items": [Parcel], "nextCursor": "string | null" }`; `Parcel.geometry` luôn là GeoJSON Polygon nội bộ.
- Mã lỗi: `401 LAND_UNAUTHENTICATED`; `403 LAND_FORBIDDEN`; `400 LAND_INVALID_REQUEST`.
- Pagination: cursor, default/max như quy ước chung.
- Idempotency: GET không mutation.
- Nguồn: Mới, B6 Q12/Q15/Q20.

### POST `/api/land/parcels`

- Mô tả: Tạo parcel giả lập.
- Auth: `land_officer` hoặc `commune_leader`.
- Request JSON: `parcelCode`, `mapSheetNumber`, `parcelNumber`, `areaSqm: DecimalString`, `landUseType`, `address`, `communeCode`, `geometry: GeometryPolygon`; tất cả bắt buộc và `organizationId` lấy từ session.
- Response 201: `{ "parcel": Parcel }` với `status="active"`, `version=1`, `nationalRecordRef=null`.
- Mã lỗi: `401 LAND_UNAUTHENTICATED`; `403 LAND_FORBIDDEN`; `400 LAND_INVALID_REQUEST` hoặc `LAND_GEOMETRY_INVALID`; `409 LAND_DUPLICATE_CODE`.
- Pagination: Không áp dụng.
- Idempotency: Retry dùng `parcelCode` unique; không tạo row thứ hai.
- Nguồn: Mới, B6 Q12/Q20; cột từ `data-model.md:60-80`.

### GET `/api/land/parcels/{parcelId}`

- Mô tả: Đọc một parcel nội bộ cùng quyền sử dụng và ràng buộc thế chấp hiện tại/lịch sử.
- Auth: `land_officer` có Assignment liên quan hoặc `commune_leader` cùng OrganizationUnit; response không public.
- Request: Path `parcelId: string` bắt buộc; không có query/body.
- Response 200:

```json
{
  "parcel": {
    "id": "parcel-001",
    "parcelCode": "PARCEL-001",
    "mapSheetNumber": "12",
    "parcelNumber": "34",
    "areaSqm": "125.50",
    "landUseType": "residential",
    "address": "Demo address",
    "communeCode": "DEMO-COMMUNE",
    "organizationId": "ou-demo",
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [
          [105, 20],
          [105.001, 20],
          [105.001, 20.001],
          [105, 20]
        ]
      ]
    },
    "nationalRecordRef": null,
    "status": "active",
    "version": 1,
    "createdAt": "2026-09-30T00:00:00.000Z",
    "updatedAt": "2026-09-30T00:00:00.000Z"
  },
  "rights": [
    {
      "id": "right-001",
      "parcelId": "parcel-001",
      "partyId": "party-001",
      "rightType": "land_use_right",
      "sharePercent": "100.00",
      "status": "active",
      "validFrom": "2026-09-30T00:00:00.000Z",
      "validTo": null,
      "sourceApplicationId": null
    }
  ],
  "encumbrances": []
}
```

- Mã lỗi: `401 LAND_UNAUTHENTICATED`; `403 LAND_FORBIDDEN`/`LAND_ASSIGNMENT_REQUIRED`; `404 LAND_PARCEL_NOT_FOUND`.
- Pagination: Không áp dụng cho một parcel; `rights` và `encumbrances` trả đầy đủ lịch sử đã giữ trong DB demo.
- Idempotency: GET không mutation nhưng ghi audit read nội bộ.
- Nguồn: Mới, B6 Q27; summary field từ `data-model.md:84-118`.

### GET `/api/land/applications`

- Mô tả: Liệt kê application trong scope actor.
- Auth: `land_officer`/`commune_leader`; officer chỉ thấy resource được Assignment hoặc resource cùng policy scope theo implementation hiện có.
- Request: query `status`, `changeType`, `assignedTo`, `limit` default 50 max 100, `cursor` tùy chọn.
- Response 200: `{ "items": [ApplicationSummary], "nextCursor": "string | null" }`; `changePayload` không có trong list.
- Mã lỗi: `401 LAND_UNAUTHENTICATED`; `403 LAND_FORBIDDEN`; `400 LAND_INVALID_REQUEST`.
- Pagination: cursor, default/max như quy ước chung.
- Idempotency: GET không mutation.
- Nguồn: Mới, B6 Q12/Q15.

### POST `/api/land/applications`

- Mô tả: Tạo application ở `submitted`.
- Auth: `land_officer`.
- Request headers: `Idempotency-Key: string` bắt buộc.
- Request JSON:

```json
{
  "changeType": "transfer",
  "changePayload": {
    "shareChanges": [{ "partyRole": "proposed_holder", "sharePercent": 100 }]
  },
  "parties": [
    {
      "partyId": "party-current",
      "partyRole": "current_holder",
      "sharePercent": null
    },
    {
      "partyId": "party-new",
      "partyRole": "proposed_holder",
      "sharePercent": "100.00"
    }
  ],
  "parcels": [{ "parcelId": "parcel-001", "parcelRole": "subject" }]
}
```

- Response 201: `{ "application": ApplicationDetail }` với `status="submitted"`, `version=1`, `completedAt=null`, `rejectionReason=null`.
- Mã lỗi: `401 LAND_UNAUTHENTICATED`; `403 LAND_FORBIDDEN`; `400 LAND_INVALID_REQUEST`; `404 LAND_PARTY_NOT_FOUND`/`LAND_PARCEL_NOT_FOUND`; `409 LAND_IDEMPOTENCY_CONFLICT`/`LAND_DUPLICATE_CODE`.
- Pagination: Không áp dụng.
- Idempotency: Cùng key+cùng payload trả cùng application; cùng key+payload khác trả conflict.
- Nguồn: Mới, B6 Q12/Q20/Q21; field từ `data-model.md:120-148,150-171`.

### GET `/api/land/applications/{applicationId}`

- Mô tả: Đọc application detail, links, payload và trạng thái.
- Auth: `land_officer` có Assignment active hoặc `commune_leader` cùng OrganizationUnit.
- Request: Path `applicationId: string` bắt buộc; không có body.
- Response 200: `{ "application": ApplicationDetail }`; party detail chỉ giải mã theo `read_sensitive`.
- Mã lỗi: `401 LAND_UNAUTHENTICATED`; `403 LAND_FORBIDDEN`/`LAND_ASSIGNMENT_REQUIRED`; `404 LAND_APPLICATION_NOT_FOUND`.
- Pagination: Không áp dụng.
- Idempotency: GET không mutation.
- Nguồn: Mới, B6 Q12/Q19/Q13.

### POST `/api/land/applications/{applicationId}/review`

- Mô tả: Thẩm tra application.
- Auth: `land_officer` có Assignment `land_review` active.
- Request headers: `If-Match-Version: integer` bắt buộc; body `{}`.
- Response 200: `{ "application": ApplicationDetail }` với `status="in_review"`, `version` tăng một.
- Mã lỗi: `401 LAND_UNAUTHENTICATED`; `403 LAND_FORBIDDEN`/`LAND_ASSIGNMENT_REQUIRED`; `404 LAND_APPLICATION_NOT_FOUND`; `409 LAND_VERSION_CONFLICT`/`LAND_INVALID_TRANSITION`.
- Pagination: Không áp dụng.
- Idempotency: Version header ngăn lặp transition; gọi lại với version cũ trả conflict.
- Nguồn: Mới, B6 Q12/Q13/Q21/Q22.

### POST `/api/land/applications/{applicationId}/sync`

- Mô tả: Gọi mock adapter sau khi application ở `in_review`.
- Auth: `land_officer` có Assignment `land_review` active.
- Request headers: `If-Match-Version: integer` bắt buộc; body `{}`.
- Response 200:

```json
{
  "application": {
    "id": "app-001",
    "status": "pending_approval",
    "version": 4
  },
  "sync": {
    "id": "sync-001",
    "applicationId": "app-001",
    "operation": "register_change",
    "requestKey": "sync-key-001",
    "status": "succeeded",
    "remoteReference": "MOCK-REMOTE-001",
    "requestPayload": {},
    "responsePayload": { "accepted": true, "simulated": true },
    "failureCode": null,
    "attempts": 1,
    "requestedAt": "2026-09-30T00:00:00.000Z",
    "completedAt": "2026-09-30T00:00:00.000Z",
    "createdAt": "2026-09-30T00:00:00.000Z",
    "updatedAt": "2026-09-30T00:00:00.000Z"
  }
}
```

Nếu fixture failure, application status là `sync_failed`, sync status `failed`, `failureCode` khác null và response HTTP là `502`.

- Mã lỗi: `401 LAND_UNAUTHENTICATED`; `403 LAND_FORBIDDEN`/`LAND_ASSIGNMENT_REQUIRED`; `404 LAND_APPLICATION_NOT_FOUND`; `409 LAND_VERSION_CONFLICT`/`LAND_INVALID_TRANSITION`; `502 LAND_SYNC_FAILED`.
- Pagination: Không áp dụng.
- Idempotency: `requestKey` ổn định theo application/operation; retry không tạo sync row thứ hai.
- Nguồn: Mới, B6 Q12/Q14/Q21/Q22; `data-model.md:173-192`.

### POST `/api/land/applications/{applicationId}/sync/retry`

- Mô tả: Retry application đang `sync_failed`.
- Auth: `land_officer` có Assignment `land_review` active.
- Request headers: `If-Match-Version: integer` bắt buộc; body `{}`.
- Response 200/502: Cùng shape `{ "application": ApplicationSummary, "sync": Sync }`; success chuyển `pending_approval`, failure giữ `sync_failed`.
- Mã lỗi: Như `/sync`, thêm `409 LAND_INVALID_TRANSITION` nếu status không phải `sync_failed`.
- Pagination: Không áp dụng.
- Idempotency: Cùng `requestKey`; attempts tăng và operation không nhân bản.
- Nguồn: Mới, B6 Q5/Q12/Q14/Q22.

### POST `/api/land/applications/{applicationId}/approve`

- Mô tả: Leader approve application `pending_approval`, hoàn tất land mutation.
- Auth: `commune_leader` cùng OrganizationUnit.
- Request headers: `If-Match-Version: integer`; body `{ "reason": "string | null" }`.
- Response 200: `{ "application": ApplicationDetail, "approval": Approval }` với application `completed`, `completedAt` khác null, approval `status="approved"`.
- Mã lỗi: `401 LAND_UNAUTHENTICATED`; `403 LAND_FORBIDDEN`; `404 LAND_APPLICATION_NOT_FOUND`; `409 LAND_VERSION_CONFLICT`/`LAND_INVALID_TRANSITION`.
- Pagination: Không áp dụng.
- Idempotency: Version header; application terminal không approve lần hai.
- Nguồn: Mới, B6 Q3/Q12/Q22; `data-model.md:223-235`.

### POST `/api/land/applications/{applicationId}/reject`

- Mô tả: Leader reject application ở `submitted`, `in_review` hoặc `pending_approval`.
- Auth: `commune_leader` cùng OrganizationUnit.
- Request headers: `If-Match-Version: integer`; body `{ "reason": "string" }`, trim không rỗng.
- Response 200: `{ "application": ApplicationDetail, "approval": Approval }` với `status="rejected"`, `rejectionReason` khác null, `completedAt=null`.
- Mã lỗi: `401 LAND_UNAUTHENTICATED`; `403 LAND_FORBIDDEN`; `404 LAND_APPLICATION_NOT_FOUND`; `400 LAND_INVALID_REQUEST`; `409 LAND_VERSION_CONFLICT`/`LAND_INVALID_TRANSITION`.
- Pagination: Không áp dụng.
- Idempotency: Version header; rejected là terminal.
- Nguồn: Mới, B6 Q3/Q12/Q22.

### GET `/api/land/applications/{applicationId}/timeline`

- Mô tả: Đọc timeline EventRecord an toàn cho internal actor.
- Auth: `land_officer` có Assignment active hoặc `commune_leader` cùng OrganizationUnit.
- Request: Path `applicationId: string`; không có query/body.
- Response 200: `{ "events": [TimelineEvent] }`; events sắp xếp `occurredAt` tăng dần.
- Mã lỗi: `401 LAND_UNAUTHENTICATED`; `403 LAND_FORBIDDEN`/`LAND_ASSIGNMENT_REQUIRED`; `404 LAND_APPLICATION_NOT_FOUND`.
- Pagination: Demo trả toàn bộ timeline của một application; không public.
- Idempotency: GET không mutation nhưng ghi audit `application.timeline.listed`.
- Nguồn: Mới, B6 Q9/Q12; EventRecord hiện có `data-model.md:37`.

### POST `/api/land/applications/{applicationId}/evidence`

- Mô tả: Upload Evidence giả lập cho application.
- Auth: `land_officer` có Assignment active hoặc `commune_leader` cùng OrganizationUnit.
- Request: `multipart/form-data`; field `file` bắt buộc, `description: string` tùy chọn; MIME PDF/JPEG/PNG; size ≤ `10 MiB`.
- Response 201: `{ "evidence": Evidence }`; không có `storageKey`.
- Mã lỗi: `401 LAND_UNAUTHENTICATED`; `403 LAND_FORBIDDEN`/`LAND_ASSIGNMENT_REQUIRED`; `404 LAND_APPLICATION_NOT_FOUND`; `400 LAND_EVIDENCE_TYPE_UNSUPPORTED`/`LAND_EVIDENCE_TOO_LARGE`.
- Pagination: Không áp dụng.
- Idempotency: Unique resource+SHA-256 ngăn duplicate bytes; retry không tạo Evidence row thứ hai.
- Nguồn: Mới, B6 Q12/Q16/Q23; adapter hiện có `src/modules/platform/evidence/storage-adapter.ts:11-19,46-67`.

### GET `/api/land/applications/{applicationId}/evidence`

- Mô tả: Liệt kê Evidence metadata của application.
- Auth: Cùng policy với POST evidence.
- Request: Path `applicationId: string`.
- Response 200: `{ "evidence": [Evidence] }`; không có bytes hoặc storageKey.
- Mã lỗi: `401 LAND_UNAUTHENTICATED`; `403 LAND_FORBIDDEN`/`LAND_ASSIGNMENT_REQUIRED`; `404 LAND_APPLICATION_NOT_FOUND`.
- Pagination: Một application demo trả metadata hiện có; `Evidence` không public.
- Idempotency: GET không mutation nhưng ghi audit read.
- Nguồn: Mới, B6 Q12/Q23.

### POST `/api/land/parcels/{parcelId}/evidence`

- Mô tả: Upload Evidence giả lập gắn với parcel.
- Auth: `land_officer` có Assignment active liên quan hoặc `commune_leader` cùng OrganizationUnit; dùng đúng policy với application Evidence.
- Request: Path `parcelId: string` bắt buộc; `multipart/form-data`; field `file` bắt buộc, `description: string | null` tùy chọn; MIME PDF/JPEG/PNG; size ≤ `10 MiB`.
- Response 201: `{ "evidence": Evidence }`, trong đó `Evidence` gồm `id: string`, `resourceType: string`, `resourceId: string`, `fileName: string`, `mimeType: string`, `sizeBytes: integer`, `originalHash: string`, `immutable: boolean`, `description: string | null`, `createdAt: IsoDate`; không có `storageKey`.
- Mã lỗi: `401 LAND_UNAUTHENTICATED`; `403 LAND_FORBIDDEN`/`LAND_ASSIGNMENT_REQUIRED`; `404 LAND_PARCEL_NOT_FOUND`; `400 LAND_EVIDENCE_TYPE_UNSUPPORTED`/`LAND_EVIDENCE_TOO_LARGE`.
- Pagination: Không áp dụng.
- Idempotency: Unique `resourceType + resourceId + originalHash` ngăn duplicate bytes; retry không tạo Evidence row thứ hai.
- Nguồn: Mới, người dùng xác nhận nested route và reuse exact Evidence policy ngày 2026-09-30; resource polymorphic từ `data-model.md:40`.

### GET `/api/land/parcels/{parcelId}/evidence`

- Mô tả: Liệt kê Evidence metadata của parcel.
- Auth: Cùng policy scoped internal với POST parcel Evidence.
- Request: Path `parcelId: string` bắt buộc; không có query/body.
- Response 200: `{ "evidence": Evidence[] }`; mỗi item có `id`, `resourceType`, `resourceId`, `fileName`, `mimeType`, `sizeBytes`, `originalHash`, `immutable`, `description: string | null`, `createdAt: IsoDate`; không có bytes hoặc `storageKey`.
- Mã lỗi: `401 LAND_UNAUTHENTICATED`; `403 LAND_FORBIDDEN`/`LAND_ASSIGNMENT_REQUIRED`; `404 LAND_PARCEL_NOT_FOUND`.
- Pagination: Parcel demo trả metadata hiện có; Evidence không public.
- Idempotency: GET không mutation nhưng ghi audit read.
- Nguồn: Mới, người dùng xác nhận nested route và reuse exact Evidence policy ngày 2026-09-30.

### POST `/api/land/parties/{partyId}/evidence`

- Mô tả: Upload Evidence giả lập gắn với party.
- Auth: `land_officer` có Assignment active liên quan hoặc `commune_leader` cùng OrganizationUnit; dùng đúng policy với application Evidence.
- Request: Path `partyId: string` bắt buộc; `multipart/form-data`; field `file` bắt buộc, `description: string | null` tùy chọn; MIME PDF/JPEG/PNG; size ≤ `10 MiB`.
- Response 201: `{ "evidence": Evidence }`, với cùng đầy đủ field/type như POST parcel Evidence; không có `storageKey`.
- Mã lỗi: `401 LAND_UNAUTHENTICATED`; `403 LAND_FORBIDDEN`/`LAND_ASSIGNMENT_REQUIRED`; `404 LAND_PARTY_NOT_FOUND`; `400 LAND_EVIDENCE_TYPE_UNSUPPORTED`/`LAND_EVIDENCE_TOO_LARGE`.
- Pagination: Không áp dụng.
- Idempotency: Unique `resourceType + resourceId + originalHash` ngăn duplicate bytes; retry không tạo Evidence row thứ hai.
- Nguồn: Mới, người dùng xác nhận nested route và reuse exact Evidence policy ngày 2026-09-30; resource polymorphic từ `data-model.md:40`.

### GET `/api/land/parties/{partyId}/evidence`

- Mô tả: Liệt kê Evidence metadata của party.
- Auth: Cùng policy scoped internal với POST party Evidence.
- Request: Path `partyId: string` bắt buộc; không có query/body.
- Response 200: `{ "evidence": Evidence[] }`; mỗi item có `id`, `resourceType`, `resourceId`, `fileName`, `mimeType`, `sizeBytes`, `originalHash`, `immutable`, `description: string | null`, `createdAt: IsoDate`; không có bytes hoặc `storageKey`.
- Mã lỗi: `401 LAND_UNAUTHENTICATED`; `403 LAND_FORBIDDEN`/`LAND_ASSIGNMENT_REQUIRED`; `404 LAND_PARTY_NOT_FOUND`.
- Pagination: Party demo trả metadata hiện có; Evidence không public.
- Idempotency: GET không mutation nhưng ghi audit read.
- Nguồn: Mới, người dùng xác nhận nested route và reuse exact Evidence policy ngày 2026-09-30.

### GET `/api/public/land/lookup`

- Mô tả: Tra cứu tối thiểu không cần session.
- Auth: Không yêu cầu session; áp dụng rate limit 60 request/minute/IP.
- Request: Chính xác một query param: `applicationCode: string` hoặc `parcelCode: string`; không có body.
- Response 200:

```json
{
  "lookup": {
    "applicationCode": "APP-001",
    "parcelCode": "PARCEL-001",
    "mapSheetNumber": "12",
    "parcelNumber": "34",
    "status": "completed",
    "submittedAt": "2026-09-30T00:00:00.000Z",
    "updatedAt": "2026-09-30T00:00:00.000Z",
    "completedAt": "2026-09-30T00:00:00.000Z"
  },
  "simulated": true
}
```

- Mã lỗi: `400 LAND_LOOKUP_QUERY_INVALID`; `404 LAND_LOOKUP_NOT_FOUND`; `429 LAND_RATE_LIMITED`.
- Pagination: Không áp dụng; một key trả một projection.
- Idempotency: GET read-only; không public hóa audit detail.
- Nguồn: Mới, B6 Q6/Q12/Q18/Q24; `data-model.md:238-244`.

### Existing `/api/identity/assignments`

- `GET`: query `resourceType`, `resourceId`, `includeRevoked`; response `{ "assignments": Assignment[] }`; route hiện có `src/app/api/identity/assignments/route.ts:11-25`.
- `POST`: body `resourceType`, `resourceId`, `task`, `assigneeUserIds`, `organizationId`; land dùng `resourceType="LandChangeApplication"`, `task="land_review"`; response `201 { "assignments": Assignment[] }`; policy mở rộng để `commune_leader` được tạo.
- `DELETE`: body `assignmentId`, `reason`; response `{ "assignment": Assignment }`; route hiện có yêu cầu reason và role command hiện có cần mở rộng cho `commune_leader`.
- Generic identity errors giữ response hiện trạng; land API map lỗi land-specific theo bảng bên dưới.
- **Nguồn:** Đã có `src/app/api/identity/assignments/route.ts:11-105`; thay đổi capability/role là “Mới (xác nhận B6 Q13)”.

## Bảng mã lỗi

| Status | Code                             | Message tiếng Việt                                          | Điều kiện phát sinh                            |
| -----: | -------------------------------- | ----------------------------------------------------------- | ---------------------------------------------- |
|    401 | `LAND_UNAUTHENTICATED`           | `Bạn cần đăng nhập để thực hiện thao tác này.`              | Internal route thiếu session.                  |
|    403 | `LAND_FORBIDDEN`                 | `Bạn không có quyền thực hiện thao tác này.`                | Role/scope/capability không phù hợp.           |
|    403 | `LAND_ASSIGNMENT_REQUIRED`       | `Bạn chưa được phân công xử lý hồ sơ này.`                  | Officer thiếu Assignment active.               |
|    404 | `LAND_NOT_FOUND`                 | `Không tìm thấy dữ liệu đất đai yêu cầu.`                   | Fallback resource not found.                   |
|    404 | `LAND_APPLICATION_NOT_FOUND`     | `Không tìm thấy hồ sơ biến động.`                           | Application ID không tồn tại hoặc ngoài scope. |
|    404 | `LAND_PARTY_NOT_FOUND`           | `Không tìm thấy chủ thể đất đai.`                           | Party link không tồn tại.                      |
|    404 | `LAND_PARCEL_NOT_FOUND`          | `Không tìm thấy thửa đất.`                                  | Parcel link không tồn tại.                     |
|    404 | `LAND_LOOKUP_NOT_FOUND`          | `Không tìm thấy kết quả tra cứu.`                           | Public key không match.                        |
|    400 | `LAND_INVALID_REQUEST`           | `Dữ liệu yêu cầu không hợp lệ.`                             | Schema, relation hoặc payload invalid.         |
|    400 | `LAND_LOOKUP_QUERY_INVALID`      | `Cần cung cấp chính xác một mã hồ sơ hoặc mã thửa.`         | Lookup thiếu cả hai hoặc truyền cả hai.        |
|    400 | `LAND_GEOMETRY_INVALID`          | `Hình học thửa đất không hợp lệ.`                           | Polygon invalid/SRID sai.                      |
|    409 | `LAND_INVALID_TRANSITION`        | `Hồ sơ không thể chuyển sang trạng thái yêu cầu.`           | Transition ngoài state machine.                |
|    409 | `LAND_VERSION_CONFLICT`          | `Dữ liệu đã thay đổi; hãy tải lại trước khi thử lại.`       | Version header cũ.                             |
|    409 | `LAND_IDEMPOTENCY_CONFLICT`      | `Khóa idempotency đã được dùng cho dữ liệu khác.`           | Same key, different payload.                   |
|    409 | `LAND_DUPLICATE_CODE`            | `Mã dữ liệu đã tồn tại.`                                    | Unique code/hash duplicate.                    |
|    502 | `LAND_SYNC_FAILED`               | `Đồng bộ mô phỏng Cơ sở dữ liệu quốc gia thất bại.`         | Mock adapter fixture failure.                  |
|    429 | `LAND_RATE_LIMITED`              | `Bạn đã vượt quá số lần tra cứu cho phép; hãy thử lại sau.` | Public IP vượt quota.                          |
|    400 | `LAND_EVIDENCE_TOO_LARGE`        | `Tệp Evidence vượt quá dung lượng cho phép.`                | File > 10 MiB.                                 |
|    400 | `LAND_EVIDENCE_TYPE_UNSUPPORTED` | `Định dạng tệp Evidence không được hỗ trợ.`                 | MIME ngoài allowlist.                          |

**Nguồn:** B6 Q11/Q25; status convention existing `src/app/api/establishments/[establishmentId]/route.ts:17-28`.
