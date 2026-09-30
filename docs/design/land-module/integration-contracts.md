# Hợp đồng tích hợp: land-module

## PostgreSQL + PostGIS

- Cách gọi: Prisma migration additive và SQL parameterized qua geometry repository; môi trường demo phải dùng PostgreSQL image có PostGIS.
- Request/Response: migration tạo extension, tám bảng land, `geometry(Polygon,4326)` và GiST index; repository nhận GeoJSON Polygon và trả geometry chuẩn hóa.
- Lỗi xử lý: extension thiếu, geometry invalid hoặc SRID sai chặn migration/command với `LAND_GEOMETRY_INVALID` hoặc lỗi triển khai; không fallback sang Point/JSON.
- Retry/Timeout: migration không tự retry nghiệp vụ; deployment runner quyết định retry process. Geometry query nằm trong transaction hiện tại.
- Fallback: không có fallback geometry; giữ feature chưa khả dụng nếu PostGIS chưa có.
- Secret cần cấu hình: `DATABASE_URL` đã có trong hệ thống; không ghi giá trị secret trong tài liệu.
- Nguồn: `prisma/schema.prisma:5-8`; `docker-compose.yml:1-12`; `data-model.md:255-263`; B6 Q10/Q20.

## Mock adapter Cơ sở dữ liệu quốc gia về đất đai

- Cách gọi: interface nội bộ `NationalLandAdapter`; gọi đồng bộ trong `POST /api/land/applications/{applicationId}/sync` và `/sync/retry`; không gọi HTTP service thật.
- Request:
```json
{
  "requestKey": "sync-key-001",
  "applicationCode": "APP-001",
  "changeType": "transfer",
  "parcelCodes": ["PARCEL-001"],
  "mode": "mock"
}
```
- Response success:
```json
{
  "status": "succeeded",
  "remoteReference": "MOCK-REMOTE-001",
  "responsePayload": { "accepted": true, "simulated": true }
}
```
- Response failure:
```json
{
  "status": "failed",
  "failureCode": "MOCK_VALIDATION_FAILED",
  "responsePayload": { "accepted": false, "simulated": true }
}
```
- Lỗi xử lý: Adapter failure lưu `LandNationalSync.status=failed`, trả `502 LAND_SYNC_FAILED`, không tạo Approval và không mutate land aggregate.
- Retry/Timeout: Không automatic retry vô hạn; retry thủ công dùng cùng `requestKey`. Adapter là local mock nên không có network timeout; mọi exception được chuẩn hóa thành failure fixture.
- Fallback: Giữ application `sync_failed`, cho phép `/sync/retry`; không suy diễn success.
- Secret cần cấu hình: Không có secret hoặc endpoint quốc gia thật trong vòng này; fixture success/failure đến từ test/server configuration, không từ client request.
- Nguồn: `data-model.md:173-192`; `law-summary.md:148-161`; B6 Q4/Q5/Q14.

## EvidenceStorageAdapter

- Cách gọi: Tái sử dụng interface `EvidenceStorageAdapter.store/read/remove`; route nhận `multipart/form-data` field `file` và `description` tùy chọn.
- Request/Response: Adapter nhận `resourceId`, `fileName`, bytes; trả `storageKey`, SHA-256 `originalHash`, `sizeBytes`; API chỉ trả metadata, không trả `storageKey`.
- Lỗi xử lý: MIME ngoài PDF/JPEG/PNG → `LAND_EVIDENCE_TYPE_UNSUPPORTED`; bytes quá `10 MiB` → `LAND_EVIDENCE_TOO_LARGE`; lỗi storage rollback Evidence row.
- Retry/Timeout: Upload không tự retry nếu bytes chưa được xác nhận; cùng hash/resource không tạo row trùng.
- Fallback: Không lưu Evidence nếu storage write thất bại; không tạo metadata mồ côi.
- Secret cần cấu hình: Local adapter dùng root `storage/evidence` theo implementation hiện có; không ghi credential.
- Nguồn: `src/modules/platform/evidence/storage-adapter.ts:11-19,41-80`; B6 Q16/Q23.

## Event store và outbox

- Cách gọi: Transaction land gọi `appendEvent`, sau đó event hiện có phát hành `OutboxMessage`.
- Request/Response: Event payload chứa aggregate type/id/version, actor snapshot, before/after tối thiểu; outbox giữ retry fields hiện có.
- Lỗi xử lý: Event/audit failure rollback transaction nghiệp vụ.
- Retry/Timeout: Outbox worker dùng chính sách retry hiện có; land không tạo worker riêng.
- Fallback: Không complete mutation nếu event/audit không ghi được.
- Secret cần cấu hình: Không có.
- Nguồn: `prisma/schema.prisma:82-122`; `src/modules/eventing/event-store.ts:109-188`; `data-model.md:37-39`.

## Identity, Assignment và Authorization

- Cách gọi: Tái sử dụng `getCurrentUser`, policy evaluation và `/api/identity/assignments`; không tạo identity service mới.
- Request/Response: Assignment hiện có nhận `resourceType`, `resourceId`, `task`, `assigneeUserIds`, `organizationId`; land dùng `resourceType=LandChangeApplication`, `task=land_review`.
- Lỗi xử lý: Session thiếu → `401`; scope/role/Assignment sai → `403`; generic identity route giữ code hiện có, land service dùng mapper `LAND_*` khi trả qua land route.
- Retry/Timeout: Không có network call; assignment mutation dùng transaction hiện có.
- Fallback: Không cấp quyền tạm nếu policy lookup thất bại.
- Secret cần cấu hình: Không có.
- Nguồn: `src/app/api/identity/assignments/route.ts:11-105`; `src/modules/identity/assignments.ts:22-104,180-275`; B6 Q3/Q13.
