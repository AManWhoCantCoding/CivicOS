# Hợp đồng tích hợp presentation: `civicos-ui-design-system`

## Nguyên tắc tích hợp

Đây là presentation migration tương thích ngược. Web và mobile tiếp tục dùng
API, read model, error/status semantics, session, permission, Assignment,
masking, route và map boundary hiện có. `api-contract.md` §§7–26 và
`data-model.md` §§7–30 là nguồn sự thật; tài liệu này chỉ ghi seam mà UI phải
giữ, không định nghĩa endpoint hoặc payload mới.

## Các seam phải giữ nguyên

| Seam | Hợp đồng cần giữ | Traceability |
|---|---|---|
| Web foundation/shell | Reuse Home, `ModuleShell`, sidebar, organization context, breadcrumb/back và module destination hiện có; chỉ đổi presentation. | `ui/prototype.md` §§36–53; CUI-001 |
| Web domain surfaces | Reuse Residents, Intake, Inspection, Land list/detail, existing actions, fields, masking và state semantics; chỉ đổi token/layout/component presentation. | `ui/prototype.md` §§55–83; CUI-002 |
| Web map | Reuse map route/projection/provider, allowlist, safe error states và no-offline-polygon behavior; không thay đổi request, projection hoặc navigation destination. | `api-contract.md` §§15–16, §§24–26; `ui/prototype.md` §§85–92; TS-06–TS-08; CUI-002 |
| Mobile primitives/screens | Reuse `States`, `LandScreen`, `MapScreen`, Related Info, Alarm, Dispatch, Task, `AppNavigator` và read-only/offline semantics hiện có; không tạo API/config/deep-link mới. | `ui/design-tokens.md` §§96–111; `ui/prototype.md` §§85–100; TS-09–TS-10; CUI-003 |
| Data/persistence | Reuse current database, schema, read model, identity, audit, evidence, land và map structures; không thêm table/field/relation/index/migration/seed/offline store. | `data-model.md` §§7–30; `ui/data-model-assessment.md` §§9–37 |
| API/route | Giữ endpoint, method, path, request/response/error/status, pagination/version/idempotency semantics và route destinations hiện có. | `api-contract.md` §§7–26 |
| Visual reference | Đối chiếu đúng 7 Stitch resources và composite board trong canonical project; không tạo resources mới. | `ui/stitch-screens.md` §§3–21, §§32–46; B8 decision trong `ui/prototype.md` §§119–125 |

## Approved Stitch catalog

Canonical visual reference là project `projects/3369879313583874807`, design
system `assets/4585683734903032299` version 2. Catalog tại
`.scratch/civicos-ui-design-system/ui/stitch-screens.md` ghi các resource sau:

- Home/ModuleShell: `3ad19ede8c43414d819f2bc50fbcc4c0`;
- Complete Screen Set/composite board:
  `fdb8b9704dd14acaa6000f342f921c14`;
- Related Info: `50a9aebb49a4447d9fb72915b2a7a5aa`;
- Intake: `cb6a0dd978824a80bbbb87aa07e035c8`;
- Map: `5be82aba31df45d7b34cf20ac8de8a16`;
- Land overview: `6edec5c868c842a9969659814c7d0c3d`;
- Entity detail/bottom sheet: `aa859d4bac114dfbabc4c0bea207ef93`.

Stitch không cung cấp click-through runtime linking. Catalog và HTML/screenshot
chỉ là visual evidence đã được user chốt; không được dùng để suy ra route,
API, state transition hoặc production interaction mới.

## Ticket và file boundary

- CUI-001 là nguồn giới hạn cho web foundation/shell/token presentation;
  tham chiếu `.scratch/civicos-ui-design-system/phases/phase-01-web-foundation-shell/CUI-001-web-foundation-shell-tokens.md`.
- CUI-002 là nguồn giới hạn cho web domain/map presentation;
  tham chiếu `.scratch/civicos-ui-design-system/phases/phase-02-web-domain-surfaces/CUI-002-web-domain-surfaces-and-map-states.md`.
- CUI-003 là nguồn giới hạn cho mobile primitives/screen presentation;
  tham chiếu `.scratch/civicos-ui-design-system/phases/phase-03-mobile-primitives-screens/CUI-003-mobile-primitives-and-screens.md`.
- CUI-004 chỉ là union verification/accessibility/regression boundary;
  tham chiếu `.scratch/civicos-ui-design-system/phases/phase-04-cross-surface-verification/CUI-004-cross-surface-accessibility-regression.md`.

Các ticket nêu rõ file được phép và file cấm sửa. Tài liệu này không mở rộng
union đó. Nếu integration cần chạm API, schema, migration, route, config,
permission, Assignment, masking, state machine, seed, map projection/provider/
cache behavior hoặc Stitch resource thì phải dừng và mở review mới.

## Verification seam

Traceability runtime/visual dùng `.scratch/civicos-ui-design-system/ui/test-scenarios.md`
TS-01–TS-11 ở web `1440 × 900` và mobile `390 × 844`, cùng với verification
evidence đã ghi cho CUI-001–CUI-004. Không tạo test scenario hoặc integration
contract mới trong migration này.
