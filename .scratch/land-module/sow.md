# Scope of Work — land-module

## 1. Tổng quan & mục tiêu

Xây dựng demo backend/API + DB cho đăng ký biến động đất đai ở một xã với dữ liệu giả lập. Module nội bộ ghi PostgreSQL thật, dùng PostGIS cho Polygon, có workflow hồ sơ, Assignment, approval, audit/event, Evidence và public lookup tối thiểu; chỉ adapter Cơ sở dữ liệu quốc gia về đất đai là mock.

Nguồn mục tiêu: `docs/research/land-module/input.md`, `docs/research/land-module/law-summary.md:152-161`, `docs/design/land-module/data-model.md` và `.scratch/land-module/feature-list.md`.

## 2. Phạm vi trong / ngoài

### Trong phạm vi

- F-01 đến F-07 theo feature-list đã người dùng chốt ngày 2026-09-30.
- Tám bảng land và migration PostGIS theo `data-model.md` đã khóa ở B4.5.
- Route/module/contract theo `docs/design/land-module/api-contract.md`.
- Role/capability/Assignment land; error code `LAND_*` với message tiếng Việt.
- Web UI theo routes `/land`, `/land/applications`, `/land/applications/new`, `/land/applications/{applicationId}`, `/land/parcels`, `/land/parcels/{parcelId}`, `/public/land/lookup`.
- Mobile read-only cho public lookup và đọc application/parcel summary/timeline.

### Ngoài phạm vi

- Kết nối thật quốc gia, thuế, công chứng, ngân hàng; PII thật; public map/polygon.
- Quyết định hành chính, chữ ký điện tử, Giấy chứng nhận có giá trị pháp lý.
- Mobile write flow, public map/polygon, Evidence upload trên mobile, cloud/thuê dịch vụ, legal-rule versioning, thanh tra, quy hoạch, định giá và cấp độ an toàn thông tin production.

## 3. Deliverables

| Tính năng | Kết quả bàn giao | Tài liệu tham chiếu |
|---|---|---|
| F-01 | CRUD party/parcel nội bộ, mã hóa party, Polygon PostGIS, parcel detail đọc `LandRight`/`LandEncumbrance`; không hard-delete. | `api-contract.md`, `data-model.md`, `domain-rules.md` DR-02–DR-05, DR-22; UI screen-04 |
| F-02 | Create/list/detail/review application, bốn change type, idempotency và state machine; web officer flow. | `api-contract.md`, `domain-rules.md` DR-06–DR-08, DR-12–DR-15; UI screen-01–03 |
| F-03 | Mock adapter sync, `LandNationalSync`, success/failure/retry idempotent; web detail states. | `api-contract.md`, `integration-contracts.md`, `edge-cases.md` EC-13–EC-14; UI screen-03 |
| F-04 | Leader approve/reject và transaction hoàn tất quyền/thửa/ràng buộc cùng event/audit; role-gated web actions. | `api-contract.md`, `domain-rules.md` DR-16–DR-19; UI screen-03 |
| F-05 | Public lookup bằng một mã, projection 8 trường, rate limit và nhãn `simulated`; web + mobile read-only. | `api-contract.md`, `non-functional.md`, `edge-cases.md` EC-17–EC-19; UI screen-05–06 |
| F-06 | Role/capability land, Assignment `land_review`, timeline nội bộ và audit; web role states + mobile masked read. | `api-contract.md`, `integration-contracts.md`, `domain-rules.md` DR-09–DR-11, DR-19; UI screen-01–04, 06 |
| F-07 | Evidence multipart PDF/JPEG/PNG ≤10 MiB, SHA-256 immutable metadata, không public storageKey; web only. | `api-contract.md`, `integration-contracts.md`, `edge-cases.md` EC-20–EC-21; UI screen-03–04 |

### UI screen inventory cho B7

| Screen | Route/nền tảng | Nội dung bắt buộc | Trạng thái |
|---|---|---|---|
| `screen-01` | Web `/land` + `/land/applications` | Workspace/filter application, role/scope, entry create/detail. | loading, error, empty, forbidden, offline |
| `screen-02` | Web `/land/applications/new` | Form 4 change type, party/parcel links, validation/idempotency feedback. | loading, validation error, submit success/failure |
| `screen-03` | Web `/land/applications/{applicationId}` | Detail, timeline, sync/retry, Evidence, leader approve/reject action. | loading, error, forbidden, terminal/rejected, offline |
| `screen-04` | Web `/land/parcels` + `/land/parcels/{parcelId}` | Party/parcel, geometry, rights, encumbrances, Evidence internal. | loading, error, empty, forbidden |
| `screen-05` | Web `/public/land/lookup` | Application/parcel code lookup, minimal result, `simulated` label. | initial, loading, invalid, not found, rate limited, success |
| `screen-06` | Mobile read-only | Public lookup + application/parcel summary/timeline, masked data. | loading, empty, error, forbidden, masked, offline |

## 4. Tiêu chí nghiệm thu theo tính năng

### F-01

- [ ] Given `land_officer` cùng OrganizationUnit gửi party hợp lệ, When `POST /api/land/parties`, Then HTTP `201`, response có `party.status=active` và database chỉ giữ ciphertext cho field nhạy cảm.
- [ ] Given parcel GeoJSON Polygon valid SRID 4326 và `areaSqm="125.50"`, When `POST /api/land/parcels`, Then HTTP `201`, response có `parcel.geometry.type="Polygon"`, `version=1`, `nationalRecordRef=null`.
- [ ] Given Polygon self-intersect hoặc SRID khác 4326, When tạo parcel, Then HTTP `400` với `code=LAND_GEOMETRY_INVALID` và không có row parcel mới.
- [ ] Given parcel có một `LandRight` active và một `LandEncumbrance` released, When `GET /api/land/parcels/{parcelId}`, Then HTTP `200`, response có `rights` và `encumbrances` đúng summary, không trả ciphertext hoặc public projection.
- [ ] Given cán bộ mở `screen-04`, When parcel detail load thành công, Then UI hiển thị geometry/rights/encumbrances nội bộ và không hiển thị ciphertext.

### F-02

- [ ] Given application payload transfer hợp lệ và `Idempotency-Key=key-001`, When POST create hai lần cùng payload, Then cả hai response tham chiếu cùng `application.id` và database có đúng một row.
- [ ] Given application mới có đủ party/parcel links, When `POST /review` với version hiện tại, Then status đổi từ `submitted` sang `in_review` và version tăng một.
- [ ] Given transition không hợp lệ hoặc thiếu link bắt buộc, When gọi command tương ứng, Then response là `409 LAND_INVALID_TRANSITION` hoặc `400 LAND_INVALID_REQUEST` và state không đổi.
- [ ] Given `land_officer` mở `screen-01` và chọn tạo mới, When form `screen-02` submit thành công, Then UI điều hướng tới application detail và hiển thị status `submitted`.

### F-03

- [ ] Given application `in_review` và fixture mock success, When `POST /sync`, Then response có `sync.status=succeeded`, application là `pending_approval`, `remoteReference` khác null và chưa mutate `LandRight`.
- [ ] Given application `in_review` và fixture mock failure, When `POST /sync`, Then HTTP `502`, code `LAND_SYNC_FAILED`, application là `sync_failed` và không có Approval.
- [ ] Given application `sync_failed`, When retry với cùng request key, Then `attempts` tăng, không tạo sync operation thứ hai, và fixture success chuyển application thành `pending_approval`.
- [ ] Given mock sync failure trên `screen-03`, When UI nhận `LAND_SYNC_FAILED`, Then UI hiển thị message tiếng Việt và nút retry chỉ khi actor có quyền.

### F-04

- [ ] Given application `pending_approval` và leader đúng OrganizationUnit, When `POST /approve` với version hiện tại, Then status `completed`, `completedAt` khác null, Approval `approved`, và quyền/thửa/ràng buộc được cập nhật cùng transaction.
- [ ] Given actor không phải `commune_leader`, When gọi approve/reject, Then HTTP `403 LAND_FORBIDDEN` và không có Approval mới.
- [ ] Given reject reason rỗng, When `POST /reject`, Then HTTP `400 LAND_INVALID_REQUEST`, application vẫn `pending_approval` và không mutate land aggregate.
- [ ] Given `commune_leader` mở `screen-03`, When application `pending_approval`, Then approve/reject action visible; Given `land_officer`, Then hai action này không visible.

### F-05

- [ ] Given application tồn tại với `applicationCode=APP-001`, When public client gửi đúng query key, Then HTTP `200`, response có đúng 8 field lookup và `simulated=true`.
- [ ] Given public client gửi đồng thời `applicationCode` và `parcelCode`, When gọi lookup, Then HTTP `400 LAND_LOOKUP_QUERY_INVALID` và không trả resource detail.
- [ ] Given query key không match, When gọi lookup, Then HTTP `404 LAND_LOOKUP_NOT_FOUND` và response không chứa party, address, polygon, sync, approval hoặc evidence.
- [ ] Given người dùng mở `screen-05` hoặc `screen-06` và nhập một mã hợp lệ, When lookup success, Then UI hiển thị 8 trường projection và nhãn `simulated`, không hiển thị PII/polygon.

### F-06

- [ ] Given `commune_leader` cùng OrganizationUnit, When POST Assignment với `resourceType=LandChangeApplication` và `task=land_review`, Then Assignment active được tạo cho officer cùng đơn vị.
- [ ] Given officer không có Assignment `land_review` active, When gọi review/sync/retry, Then HTTP `403 LAND_ASSIGNMENT_REQUIRED` và không có transition.
- [ ] Given application có event/audit đã ghi, When internal actor gọi timeline, Then response event tăng theo `occurredAt` và public lookup không trả event detail.
- [ ] Given mobile user mở `screen-06`, When application/parcel read thành công, Then chỉ có control đọc và các trường nhạy cảm được mask; không có control create/review/approve/upload.

### F-07

- [ ] Given officer có scope upload file PDF 1 MiB, When POST multipart evidence, Then HTTP `201`, Evidence có SHA-256, `immutable=true`, và response không có `storageKey`.
- [ ] Given file MIME `text/plain` hoặc kích thước `10 MiB + 1 byte`, When upload, Then HTTP `400` với code tương ứng và không có Evidence row/storage file.
- [ ] Given public client gọi route evidence hoặc lookup resource có Evidence, When request, Then public không nhận bytes, `storageKey`, hash hoặc evidence metadata.
- [ ] Given web hoặc mobile screen ở trạng thái loading/error/empty/forbidden/offline, When state tương ứng xảy ra, Then UI dùng state surface đã có và cung cấp retry khi contract cho phép.

## 5. Phụ thuộc & ràng buộc

- `data-model.md` đã khóa ở stage `data-model`; không sửa trực tiếp trong phase triển khai.
- PostgreSQL image phải có PostGIS trước migration; dùng `DATABASE_URL` hiện có.
- Tái sử dụng identity/session, Assignment, Approval, Evidence, EventRecord, OutboxMessage và AuditEvent; không tạo bản sao.
- Chỉ mock adapter quốc gia; mọi persistence/API land nội bộ chạy thật trên dữ liệu giả lập.
- Tuân thủ tối thiểu hóa PII, phân quyền, audit và boundary pháp lý trong `law-summary.md:53-65,125-146,152-161`.
- UI web/mobile là deliverable; B7 phải gọi `ui-ux` sau khi B6 design được người dùng chốt và full lock.

## 6. Ước lượng & giả định

| Lát dọc | Ước lượng điều phối | Phụ thuộc |
|---|---|---|
| F-01 | 1 ticket triển khai schema/party/parcel và geometry seam | PostGIS, data-model lock |
| F-02 | 1 ticket application create/list/detail/review | F-01, identity |
| F-03 | 1 ticket mock adapter/sync/retry | F-02, event/outbox |
| F-04 | 1 ticket approval/completion transaction | F-03, authorization |
| F-05 | 1 ticket public projection/rate limit | F-02 |
| F-06 | 1 ticket role/capability/Assignment/timeline | identity/eventing |
| F-07 | 1 ticket Evidence upload/read | F-02, Evidence adapter |
| UI web | 6 screen specs + implementation tickets theo B7 report | F-01–F-07, existing ModuleShell |
| Mobile read-only | 1 read-only screen flow + contract integration | F-05/F-06, existing AppNavigator/States |

Các con số là số lát dọc để chia phase, không phải cam kết ngày công. Seed demo gồm một OrganizationUnit, hai party, một parcel và một application mẫu cho mỗi change type; không dùng PII thật.

## 7. Chấp nhận

- **Trạng thái:** chờ người dùng đọc và chốt bộ design + SOW.
- **Người xác nhận:** người dùng dự án sẽ xác nhận sau khi review bản B6 này.
- Sau khi người dùng chốt, chạy `node scripts/check-scope.mjs lock land-module --stage=full --user-approved`; sau đó B7 tạo `.scratch/land-module/ui/brief.md` và gọi `ui-ux`; chưa tạo ticket hoặc phase ở B6/B7.
