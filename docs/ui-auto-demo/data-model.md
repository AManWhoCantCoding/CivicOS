# Data Model — `ui-auto-demo`

## Trạng thái

`APPROVED_BY_USER` — user đã duyệt disposition B9 `NO_NEW_SCHEMA`.

## Final disposition: `NO_NEW_SCHEMA`

Scope expanded vẫn có database impact về **cách sử dụng** dữ liệu hiện có, nhưng
không cần thêm table/field/relation/index/constraint/migration nếu giữ các điều
kiện đã khóa trong SOW:

- live mutation chỉ qua existing web command/API/component;
- target guard chính xác là `civicos_demo`;
- mobile read-only;
- persona broker/bridge và run evidence nằm ngoài database nghiệp vụ;
- cleanup/reset do operator chạy ngoài UI;
- scene thiếu idempotency/fixture policy bị block.

## Reuse map

### Identity, persona và scope

- `User(id, email, passwordHash, organizationUnitId, active)` là identity source.
- `Role` + `UserRole` là role catalog/link; không tạo role `demo` hoặc claim mới.
- `OrganizationUnit` giữ scope tổ chức.
- `Assignment(resourceType, resourceId, task, assigneeUserId, organizationId,
  status, revokedAt, revokeReason)` giữ task/resource boundary.
- `Session(tokenHash, userId, expiresAt)` là session store. Raw credential chỉ ở
  local/demo provider; không thêm password/token/run fields.

### Live web workflow và provenance

Runner không sở hữu aggregate. Các domain model hiện có (IntakeReport/Incident,
Inspection/Establishment, VehicleObservation/registry, Subject/record/report,
LandChangeApplication/parcel và Approval) vẫn là owner của state/constraint.

Mỗi mutation phải tiếp tục tạo side effect theo command hiện có:

- `AuditEvent` cho audit access/change;
- `EventRecord` với actor/organization/correlation/causation/metadata;
- `OutboxMessage` cho async consumer;
- `ProjectionCheckpoint`/`ProjectionRecord`, `Notification`, `SlaInstance` nếu
  workflow hiện tại tạo chúng;
- existing version/idempotency/unique constraints để chống duplicate/conflict.

Auto-demo không thêm `DemoRun`/`DemoStep` persistent record. Run evidence an toàn
chỉ gồm run/scene/step/status/duration/reason ở local artifact; không thay thế
AuditEvent hoặc DomainEvent.

### Fixture, replay và cleanup

Reuse `scripts/demo/demo-db.ts`, `manifest.ts`, `seed*.ts`, stable labels/keys,
idempotency keys, `clientCommandId`, unique tuple và existing `demoNamespace`.

`demo:reset` vẫn là destructive operator command với exact database guard và
confirmation. UI runner không được gọi reset hoặc truncate. Nếu B10 phát hiện
scene cần durable run ledger, đó là contract gap phải mở lại B9, không tự thêm
model trong implementation ticket.

### Mobile

Native mobile reuse existing read projections/API, `Session`, `Assignment` scope,
deep-link context và `WriteGuard`. Không tạo mobile mutation table, offline write
parity hoặc bridge persistence.

## Keys, constraints và delete/update behavior

- Giữ PK/unique/index/FK/delete semantics trong `prisma/schema.prisma`.
- Reuse domain-specific idempotency:
  `idempotencyKey`, `clientCommandId`, `requestKey`, aggregate version và unique
  approval/schedule/business code; không dùng một key chung cho mọi domain.
- Existing reset `TRUNCATE ... CASCADE` và evidence namespace cleanup vẫn giữ
  nguyên; không thay đổi retention/deletion behavior.
- Nếu action đã commit trước khi stop, database state không rollback theo runner;
  cleanup pending phải giao operator.

## Migration strategy

`NO MIGRATION`. Không sửa Prisma schema, không tạo migration, không thêm seed
model hoặc read-model field trong scope hiện tại.

## Compatibility considerations

- Existing web/mobile runtime khi demo mode tắt không thay đổi.
- API payload/error/status/version/pagination/idempotency/masking giữ nguyên.
- Session/Assignment/authorization vẫn là server boundary.
- Event/audit/outbox/projection/SLA history được bảo toàn; không ghi derived table
  trực tiếp để làm UI đẹp hơn.
- Nếu cần durable run history, per-run cleanup ledger hoặc credential provenance
  cho production-like audit, disposition này không còn hợp lệ và phải mở lại B9.

## Decision sources

- `prisma/schema.prisma`: current models/constraints.
- `scripts/demo/demo-db.ts`, `manifest.ts`, `seed.ts`, `reset.ts`: target guard,
  stable fixture, idempotency và destructive reset behavior.
- `src/modules/identity/session.ts`, `local-provider.ts`, auth route: session/
  credential boundary.
- `src/modules/eventing/*`, `src/modules/platform/field-sync/*`: event/outbox/
  retry/version behavior.
- B6 SOW/design và B7 prototype: live web vs mobile read-only boundary, cleanup
  pending và safe evidence.

## Decision closure

User đã duyệt `NO_NEW_SCHEMA` và operator-owned cleanup để chuyển B10. Nếu phát
sinh nhu cầu lưu durable DemoRun/step/cleanup history trong database, phải dừng
implementation và mở lại B9 trước khi thay đổi schema.