# Data-model disposition — `civicos-uiux-alignment`
 
## Kết luận
 
- **Status:** `NO_KNOWN_IMPACT`
- **Feature type:** presentation/UI-only migration
- **Schema decision:** reuse current database structures; không thêm, xóa hoặc
  đổi table, field, relation, index, constraint, migration, seed, read-model
  field, cache hoặc offline store.
- **API/data decision:** giữ nguyên endpoint, payload, error/status, read model,
  version, idempotency và data semantics hiện có.
- **Approval:** `USER_APPROVED_FOR_FULL_LOCK` — user chọn
  `Phê duyệt và chạy full lock (Khuyến nghị)` tại human gate.
 
## AS-IS evidence
 
- PostgreSQL + Prisma datasource và toàn bộ model hiện có nằm tại
  `prisma/schema.prisma`.
- Migration history, constraints, indexes, PostGIS geometry, event/audit,
  evidence, offline và domain tables đã được khảo sát trong
  `.scratch/civicos-uiux-alignment/database-survey.md`.
- Callers/access boundaries đã được đối chiếu tại các module identity,
  incidents, inspections, land và mobile API được nêu trong survey.
 
## Required preservation
 
- `User`, `Role`, `OrganizationUnit`, `Assignment`, session và server-side access
  policy không thay đổi.
- Masking, PII, Evidence, AuditEvent, OfflineCommand, version/idempotency,
  `internal / simulated`, public projection và no-offline-polygon boundary không
  thay đổi.
- JSON payloads, polymorphic resource references, temporal/version fields,
  PostGIS geometry và existing foreign-key/delete behavior được reuse nguyên trạng.
 
## Gap classification
 
| Area                 | Classification           | Decision                                                     |
| -------------------- | ------------------------ | ------------------------------------------------------------ |
| UI visual parity     | Reuse existing structure | Chỉ đổi presentation trong allowed files của ticket          |
| API/read model       | No delta                 | Không thêm field/endpoint/error/status                       |
| Database schema      | No delta                 | Không tạo migration hoặc persistence artifact mới            |
| Permission/privacy   | Preserve                 | Không đổi role, Assignment, masking hoặc disclosure boundary |
| Legal/public meaning | Preserve                 | Không thêm authority/legal claim; giữ wording hiện có        |
 
## Reopen rule
 
Nếu một implementation ticket cần field/API/permission/state/legal/public meaning
mới để đạt mục tiêu, ticket phải dừng với `BLOCKED-CONTRACT`. Research phải
mở lại contract review và chỉ tạo data-model/migration design sau khi delta đó
được user phê duyệt. Kết luận `NO_KNOWN_IMPACT` này không cho phép suy luận
hoặc bypass một delta mới.
