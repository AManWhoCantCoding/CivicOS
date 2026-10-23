# Data Model — demo-seed-restart

## Quyết định chính

Work item này **reuse toàn bộ current schema**. Không tạo model, column, enum,
index hoặc migration mới chỉ để phục vụ demo. File này mô tả data contract của
fixture và ownership seed; không thay thế `prisma/schema.prisma`.

## Database hiện tại

- PostgreSQL/PostGIS, Prisma datasource `DATABASE_URL`.
- Schema owner: `prisma/schema.prisma`.
- Migration owner: `prisma/migrations/`.
- Demo target: database name chính xác `civicos_demo`.
- Database `civicos` không thuộc lifecycle của seed/reset.

## Model groups và seed ownership

| Group           | Existing models                                                                                                                                         | Seed owner                                 | Derived behavior                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------- |
| Identity        | `User`, `Role`, `UserRole`, `OrganizationUnit`, `Assignment`, `Session`                                                                                 | identity fixture + assignment service      | Auth/session/permission read             |
| Intake/Incident | `IntakeReport`, `IntakeCommand`, `Incident`, `Approval`                                                                                                 | incident commands                          | Event/audit/SLA/projection               |
| Inspection      | `Establishment`, `ChecklistTemplate`, `Inspection`, `InspectionFinding`, `EnforcementRecommendation`                                                    | inspection commands                        | Event/audit/SLA/projection/approval      |
| Vehicle         | `SuspiciousVehicleEntry`, `VehicleObservation`, `VehicleVerification`                                                                                   | vehicle commands                           | Notification/SLA/evidence/projection     |
| Resident        | `Subject`, `SubjectManagementRecord`, `SubjectManagementActivity`, `ResidentMonthlyReport`                                                              | resident commands                          | SLA/event/audit/report snapshot          |
| Platform        | `Evidence`, `SlaInstance`, `Notification`                                                                                                               | evidence/SLA/notification services         | Worker/read model                        |
| Eventing        | `EventRecord`, `OutboxMessage`, `ProjectionCheckpoint`, `ProjectionRecord`, `AuditEvent`                                                                | event store/worker/audit service           | Must drain/resolve                       |
| Land            | `LandParty`, `LandParcel`, `LandRight`, `LandEncumbrance`, `LandChangeApplication`, `LandApplicationParty`, `LandApplicationParcel`, `LandNationalSync` | land commands/services + raw geometry seam | Approval/sync/timeline/public projection |

## DS-09 VehicleObservation mobile read model

### Persistence decision

DS-09 **reuse existing structure**. Không tạo table, column, enum, index, foreign
key hoặc migration mới. `?view=mobile` là API read projection, không phải
persistence model mới.

| Existing structure               | Current role                                                                   | DS-09 use                                                                                                               | Classification                            |
| -------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `VehicleObservation`             | Canonical observation với plate, time, coordinates, status và lifecycle fields | Resource canonical cho alarm/detail; không remap sang related-info entity khác                                          | Reuse                                     |
| `Assignment`                     | Polymorphic `resourceType`/`resourceId`, assignee, task, OU/status boundary    | Thêm một synthetic `task=mobile_read` row cho observation; giữ `vehicle_report`/`vehicle_verification` cho web workflow | Reuse + seed delta                        |
| `Notification`                   | Derived user notification có `resourceType`/`resourceId` và body               | Forces projection đọc metadata; mobile không trả `body`                                                                 | Reuse                                     |
| `ProjectionRecord`               | Event-first vehicle read model với unique projection/resource key              | Vehicle summary/detail projection đọc state hiện có                                                                     | Reuse                                     |
| `VehicleVerification`/`Evidence` | Web verification/evidence workflow và sensitive content                        | Không load vào mobile-safe response                                                                                     | Existing, excluded from mobile projection |

### Resource ownership and authorization

- `VehicleObservation` hiện không có `organizationId`; mobile organization được
  resolve từ `User.organizationUnitId` của `observedById`, sau đó so khớp với
  actor OU và `Assignment.organizationId` hiện hành.
- `Assignment` vẫn là polymorphic reference; không thêm FK riêng cho
  `VehicleObservation`. Resource existence không được suy ra cho actor ngoài
  assignment/OU boundary.
- `mobile_read` đã tồn tại trong `TASK_CAPABILITIES` với capability chỉ là
  `read`; không cần enum/migration mới.
- Existing indexes đủ cho bounded demo query: `Assignment` có index theo
  resource/status và assignee/status; `Notification` có index user/read/time;
  `ProjectionRecord` có unique projection/resource key.

### Mobile response projection

`GET /api/vehicles/observations/:observationId?view=mobile` trả projection
application-level gồm:

- `id`
- full `plate` sau khi `mobile_read` + same-OU authorization pass
- `status`
- `observedAt`
- `latitude`
- `longitude`

Không trả `description`, `observedById`, `clientCommandId`, `version`,
`evidenceIds`, `matchedRegistryId`, verification records, owner lookup, notes,
evidence content hoặc mutation permissions. Request không có `view=mobile` giữ
raw web response hiện tại.

### Required application/seed delta

- Mobile forces phải resolve `VehicleObservation` organization/resource links và
  trả explicit `resourceType` + `resourceId`.
- Vehicle notification flow giữ nguyên; không insert trực tiếp `Notification`,
  `ProjectionRecord`, SLA hoặc audit rows.
- Seed orchestration sau vehicle command phải grant `mobile_read` bằng existing
  assignment service, sau đó drain worker/outbox như các derived state khác.
- Tests phải cover assigned/same-OU, unassigned, cross-OU, missing resource,
  body redaction và web raw-response compatibility.

## Fixture identity/key rules

- Aggregate database IDs không hard-code trừ khi existing command contract yêu cầu.
- `idempotencyKey`, `clientCommandId`, `referenceCode`, `parcelCode`,
  `applicationCode` và stable scenario key là identity của fixture.
- Mọi key phải có prefix synthetic, không trùng dữ liệu development ngoài demo.
- Khi model không có idempotency field, adapter phải preflight bằng tuple hiện có;
  không thêm column.

## Representative data contract

| Surface         | Minimum fixture rows/state                                                                                                                     |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity        | Current development identities + ít nhất 1 `land_officer` và 1 `commune_leader` synthetic user; không tạo session persistent                   |
| Residents       | 3 subject types, 3 records, 3 activities, report states `draft`/`approved`/`sent`                                                              |
| Intake/Incident | ≥4 intake và ≥4 incident, có received/verified/processed/rejected hoặc completed state                                                         |
| Inspection      | ≥3 establishment/template/inspection; ít nhất 1 finding và 1 recommendation approval path                                                      |
| Vehicle         | ≥3 registry/observation; recorded, match và escalated; ≥1 verification                                                                         |
| Mobile          | ≥4 active `mobile_read` assignments cho related-info hiện có, thêm ≥1 `VehicleObservation` `mobile_read`; 1 unassigned/cross-OU negative actor |
| Map             | Mọi fixture map có coordinate hợp lệ; land có valid Polygon SRID 4326 trong bounds                                                             |
| Land            | ≥1 party, parcel, right và application có cả party/parcel link; ít nhất 1 public lookup success                                                |
| Evidence        | Ít nhất một file synthetic cho mỗi flow cần evidence; metadata có demo namespace                                                               |

## Relations/constraints cần giữ

- `UserRole` giữ composite key.
- `Assignment` resource reference phải resolve tới aggregate và actor/OU hợp lệ.
- `IntakeReport.idempotencyKey`, `VehicleObservation.clientCommandId`,
  `ResidentMonthlyReport.idempotencyKey` không duplicate.
- `Inspection.establishmentId + scheduledAt` không duplicate.
- `LandParcel` geometry phải valid SRID 4326; application links phải resolve.
- Evidence unique theo `(resourceType, resourceId, originalHash)`.
- Event/outbox/projection/SLA/notification không được orphan sau drain.

## Migration/compatibility

- Migration required: `NONE`.
- Schema extension: `NONE`.
- Reset source change: `REQUIRED` — mở rộng whitelist land models trong demo reset.
- New orchestration/verifier files: `REQUIRED`.
- Existing API/UI/mobile consumers: giữ nguyên shape và permission semantics.

## B9 decision and evidence

- Database engine/ORM: PostgreSQL/PostGIS + Prisma (`prisma/schema.prisma:1-8`).
- Current persistence: `Assignment` (`prisma/schema.prisma:50-69`),
  `Notification` (`201-214`), `ProjectionRecord` (`131-143`),
  `VehicleObservation` (`418-438`) và `VehicleVerification` (`440-453`).
- Vehicle constraints/indexes: migration
  `20260922080000_ps_e1_009_vehicle_watch_contract/migration.sql`.
- Assignment capability: `src/modules/identity/contracts.ts:88-123`;
  mobile read boundary: `src/modules/identity/authorization.ts:283-341,447-481`.
- Current mobile force projection: `src/modules/mobile-readonly/forces.ts:149-327,329-405`.
- Current vehicle detail raw response: `src/modules/vehicles/projection.ts:335-423`.
- B4 legal/compliance: `N/A` per `.scratch/demo-seed-restart/routing-decision.md`
  (`legal_compliance: NONE`); DS-09 adds no legal retention, effective-date or
  administrative geography semantics.

### Final B9 classification

```yaml
schema_change: NONE
migration_required: NONE
new_tables: NONE
new_columns: NONE
application_projection_delta: REQUIRED
authorization_delta: REQUIRED
seed_assignment_delta: REQUIRED
backward_compatibility: PRESERVE_EXISTING_WEB_RESPONSE
```
