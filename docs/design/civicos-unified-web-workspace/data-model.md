# Final Data Model Disposition — `civicos-unified-web-workspace`

## Trạng thái

`B9_APPROVED` — user duyệt `NO_KNOWN_IMPACT`.

## Decision

`NO_KNOWN_IMPACT`.

Unified web workspace, role-aware navigation, single-expanded sidebar,
PS-E1-004/005/007 navigation exclusion, direct-route integration và mobile visual
audit không tạo hoặc thay đổi persistence/data model.

## Existing structures reused

- `User`, `Role`, `UserRole`, `OrganizationUnit`, `Assignment`, `Session` cho
  session/role/Assignment projection.
- Existing event/audit/evidence/offline/approval structures cho domain behavior
  vẫn giữ nguyên.
- Existing domain structures/read models cho Identity, Intake/Incident,
  Inspection, Residents, Vehicles/Field và Land/Map vẫn là source of truth.

## No new model

- Không có table/collection mới.
- Không có field/type/default/nullability mới.
- Không có PK/FK/relation/index/constraint mới.
- Không có migration, seed, retention, cache/offline store hoặc telemetry mới.
- Không có workspace/navigation API hoặc permission projection persistence.

## Compatibility

- Existing routes/API/read models/deep links và server/domain authorization được
  giữ nguyên.
- Navigation exclusion chỉ là UI projection; direct route không bị xóa hoặc đổi
  data behavior.
- Role/Assignment/masking/audit/privacy, version/idempotency và organization
  scope không đổi.

## Source of decision

- `docs/design/civicos-unified-web-workspace/overview.md`
- `docs/design/civicos-unified-web-workspace/api-contract.md`
- `docs/design/civicos-unified-web-workspace/domain-rules.md`
- `.scratch/civicos-unified-web-workspace/database-survey.md`
- `prisma/schema.prisma:10-80`
- `src/components/navigation/feature-registry.ts`
- `src/modules/identity/authorization.ts`
- Approved user prototype: `.scratch/civicos-unified-web-workspace/ui/`

## Gate

Approval evidence: user message `Duyệt NO_KNOWN_IMPACT (Khuyến nghị)`.
Full lock đã được tạo và verify bằng:

```text
node scripts/check-scope.mjs lock civicos-unified-web-workspace --stage=full --user-approved
node scripts/check-scope.mjs verify-lock civicos-unified-web-workspace
```

Nếu implementation phát sinh schema/API/data-semantics delta, phải dừng ticket
và reroute B9; không dùng disposition này để bypass thay đổi dữ liệu thật.
