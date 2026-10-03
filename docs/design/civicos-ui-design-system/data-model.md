# Mô hình dữ liệu: civicos-ui-design-system

- **Trạng thái:** B9 `APPROVED` — **không có tác động data model**.
- **Phạm vi:** UI-only; không tạo persistence contract mới.
- **Nguồn:** `.scratch/civicos-ui-design-system/ui/data-model-assessment.md` và các UI artifacts đã được duyệt.

## Quyết định cuối cùng

- **Bảng/collection:** không tạo mới.
- **Field, relation, PK/FK, constraint, index:** không thay đổi.
- **Migration:** không có.
- **Seed/reference data:** giữ nguyên.
- **Read model/API:** tái sử dụng contract hiện có; không thêm field hoặc lifecycle mới.
- **Offline storage:** không tạo nơi lưu polygon hoặc dữ liệu domain mới.

PostgreSQL/PostGIS qua Prisma, schema/migration hiện tại, identity, OrganizationUnit, Assignment, masking, audit, evidence, land và map-projection structures tiếp tục là nguồn sự thật hiện có. Approved Light/Blue tokens, shell/state presentation và screen set chỉ thay đổi cách trình bày.

## Gap map

| Thay đổi UI đã duyệt | Kết quả data model |
|---|---|
| Shared Light/Blue tokens, shell và navigation | Reuse existing structures; không persistence change. |
| Residents, Intake, Inspection và Land list/detail presentation | Reuse existing API/read models; không đổi field hoặc lifecycle. |
| Web/mobile map states và focused parcel display | Reuse existing allowlisted projection; không đổi geometry/cache. |
| Loading, empty, forbidden, stale, error và offline states | UI state only; không thêm database status/workflow state. |
| Simulated/internal labels và masked values | Giữ copy và access boundary hiện có; không thêm data source. |

## Compatibility và giới hạn

Các consumer web/mobile hiện có phải tiếp tục tương thích vì migration chỉ chạm token, layout và component presentation. Không được suy ra legal retention, effective-date, provenance pháp lý, permission mới hoặc domain rule mới từ tài liệu này. Nếu implementation phát sinh nhu cầu schema, migration, API, route, permission, Assignment, masking, state-machine, seed hoặc map-projection change, phải dừng và mở lại review tương ứng.
