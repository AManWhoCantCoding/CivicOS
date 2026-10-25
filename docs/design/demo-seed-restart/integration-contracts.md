# Integration Contracts — demo-seed-restart

## PostgreSQL/Prisma

- Migrate deploy và seed dùng cùng target `civicos_demo`.
- Prisma import chỉ xảy ra sau target validation.
- Không tạo migration mới trong seed work item.

## Eventing/worker

- Domain command append event/outbox.
- Worker xử lý projection/SLA/notification.
- Rebuild phải drain đến idle; live demo chạy worker riêng nếu có mutation sau
  rebuild.

## Evidence storage

- Dùng `LocalEvidenceStorage` hiện có.
- File key phải relative, safe và mang metadata `demoNamespace`.
- Reset chỉ cleanup file thuộc namespace demo.

## Map/TileServer

- Map provider/config/layers dùng contract hiện có.
- Marker lấy từ Incident/Inspection projection.
- Land parcel geometry đi qua land map projection riêng.
- Tile asset/provider là dependency runtime, không seed business table.

## Mobile

- Mobile chỉ đọc read model/API hiện có.
- `Assignment` là boundary để related-info và forces read.
- Không tạo aggregate `Dispatch`, `Task` hoặc `Camera` mới.

### DS-09 VehicleObservation path

- Vehicle command/event/projection hiện có tạo `Notification` với
  `resourceType=VehicleObservation`; forces read projection resolve resource
  bằng explicit type/ID và `mobile_read` Assignment.
- Alarm/dispatch/task rows dùng existing force read models; không direct insert
  derived rows và không tạo aggregate mới.
- Detail reuse `/api/vehicles/observations/:observationId?view=mobile`; mobile
  projection phải tách khỏi raw web response nhưng giữ nguyên web path khi query
  không có.
- Coordinates được truyền sang existing map context; map không cấp thêm
  permission hoặc mutation capability.

## Land

- Internal land dùng authorization/OU boundary hiện có.
- Public lookup chỉ đọc projection tối thiểu, không trả party/geometry/evidence
  nhạy cảm.
- Application timeline lấy từ event/audit semantics hiện có.
