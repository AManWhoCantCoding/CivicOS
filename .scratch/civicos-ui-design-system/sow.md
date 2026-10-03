# Scope of Work — `civicos-ui-design-system`

## 1. Trạng thái và mục tiêu

Đây là artifact hoàn tất contract cho một presentation migration đã được chốt,
không phải yêu cầu triển khai mới.

- **Feature:** `civicos-ui-design-system`.
- **Phạm vi:** UI-only Light/Blue presentation migration trên các web/mobile
  surface đã được duyệt.
- **B8:** `APPROVED` — user message `Được tôi chốt`.
- **B9:** `APPROVED` — user message `Duyệt B9 — no data-model impact`.
- **B10:** `COMPLETE`; CUI-001–CUI-004 đã qua các implementation/review/
  verification/phase gates theo `.scratch/civicos-ui-design-system/workflow-status.md`.
- **Mục tiêu:** thống nhất token, typography, spacing, shape, focus và semantic
  state presentation giữa web/mobile mà không đổi domain behavior hoặc contract
  hiện có.

## 2. Căn cứ contract và traceability

| Căn cứ | Phạm vi được dùng |
|---|---|
| `docs/design/civicos-ui-design-system/overview.md` §§7–29 | Vấn đề, scope Light/Blue, approved surfaces, boundary tương thích và contract summary. |
| `docs/design/civicos-ui-design-system/api-contract.md` §§7–26 | Giữ nguyên endpoint/method/path, request/response/error, authorization, map và navigation contracts. |
| `docs/design/civicos-ui-design-system/data-model.md` §§7–30 | Kết luận B9 không có table/field/relation/index/migration/seed/read-model/offline-store change. |
| `.scratch/civicos-ui-design-system/ui/design-tokens.md` §§16–111 | Giá trị token, typography, spacing/shape, semantic states và migration boundary. |
| `.scratch/civicos-ui-design-system/ui/prototype.md` §§23–100 | Entry points, interaction/presentation contract, web/mobile/map states và approved boundary. |
| `.scratch/civicos-ui-design-system/ui/test-scenarios.md` TS-01–TS-11 | Scenario và kỳ vọng review trên web `1440 × 900`, mobile `390 × 844`. |
| `.scratch/civicos-ui-design-system/ui/stitch-screens.md` §§3–21, §§32–46 | Canonical Stitch project, design system và 7 screen resources/composite board. |
| `.scratch/civicos-ui-design-system/phases/` CUI-001–CUI-004 | File boundary, ticket acceptance criteria, dependency và verification scope đã dùng khi triển khai. |

Không có F-xx trong locked docs. SOW dùng section references và ticket IDs đã
tồn tại, không tạo F-ID mới.

## 3. Phạm vi trong

### Shared Light/Blue presentation baseline

- Dùng exact color, typography, spacing, radius, focus và semantic token trong
  `ui/design-tokens.md` §§24–95.
- Trạng thái có text/icon/copy; giữ simulated/internal copy; không dùng
  gradient, neon, glow hoặc màu đen tuyệt đối.
- Baseline áp dụng trên surface đã ghi trong `overview.md` §§11–17 và các path
  đã ghi trong `ui/design-tokens.md` §§96–105.

### Web foundation, shell và domain surfaces

- CUI-001: Home, `ModuleShell`, `ModuleStatus`, sidebar và web foundation;
  tham chiếu `.scratch/civicos-ui-design-system/phases/phase-01-web-foundation-shell/CUI-001-web-foundation-shell-tokens.md`,
  `prototype.md` §§36–53, TS-01 và TS-11.
- CUI-002: Residents, Intake, Inspection, Land list/detail và web map state
  presentation; tham chiếu `.scratch/civicos-ui-design-system/phases/phase-02-web-domain-surfaces/CUI-002-web-domain-surfaces-and-map-states.md`,
  `prototype.md` §§55–92, TS-02–TS-08.
- Cả hai ticket chỉ migrate render/style/presentation trong allowed paths; giữ
  API/read model, field, action visibility, masking, Assignment, state,
  projection, provider, cache và navigation semantics hiện có.

### Mobile primitives và screens

- CUI-003: mobile `States`, Map, Related Info, Alarm, Dispatch, Task và Land;
  tham chiếu `.scratch/civicos-ui-design-system/phases/phase-03-mobile-primitives-screens/CUI-003-mobile-primitives-and-screens.md`,
  `prototype.md` §§85–100, TS-09–TS-11.
- Giữ `LandScreen → MapScreen`, parcel context, bottom sheet/read-only flow,
  back destination, semantic states và no-offline-polygon boundary hiện có.

### Cross-surface verification

- CUI-004: đối chiếu TS-01–TS-11, token/accessibility/privacy/state copy và
  compatibility trên web/mobile; tham chiếu
  `.scratch/civicos-ui-design-system/phases/phase-04-cross-surface-verification/CUI-004-cross-surface-accessibility-regression.md`.
- CUI-004 là verification/hardening boundary; không mở thêm screen, route,
  API, data model hoặc domain behavior.

## 4. Approved Stitch reference

SOW dùng canonical Stitch project `projects/3369879313583874807` và design
system `assets/4585683734903032299` version 2. Catalog 7 resources gồm Home,
composite board, Related Info, Intake, Map, Land overview và Entity detail;
resource IDs đầy đủ nằm tại `.scratch/civicos-ui-design-system/ui/stitch-screens.md`
§§11–21.

Composite board `fdb8b9704dd14acaa6000f342f921c14` là visual reference cho các
surface được tổng hợp. Stitch không có click-through/runtime linking; limitation
đó đã được chấp nhận tại Human Gate B8 và không được chuyển thành production
requirement.

## 5. Ngoài phạm vi

- Không tạo hoặc thay đổi API endpoint, method, payload, error/status, route,
  navigation destination, webhook, event contract hoặc public API.
- Không tạo hoặc thay đổi role, permission, OrganizationUnit, Assignment,
  masking, state machine, business action, legal rule, retention rule, public
  claim hoặc policy mới.
- Không tạo table/field/relation/index/constraint, migration, seed, read-model
  field, cache hoặc offline store; không sửa schema/data-access contract.
- Không đổi map projection allowlist, geometry/provider/cache/no-offline-polygon
  behavior và không dùng public lookup thay internal projection.
- Không tạo Stitch resource/screen mới, không làm click-through runtime và
  không đưa dữ liệu thật/PII vào prototype/test.

Nếu một nhu cầu triển khai chạm các boundary trên, phải dừng ticket và mở
review contract/data-model tương ứng; không mở rộng SOW này.

## 6. Deliverables của đợt contract completion

Đợt này chỉ tạo/adapt tài liệu, không sửa application source, test, Stitch,
ADR hoặc `.brain/evidence/**`:

1. `docs/design/civicos-ui-design-system/domain-rules.md`;
2. `docs/design/civicos-ui-design-system/edge-cases.md`;
3. `docs/design/civicos-ui-design-system/glossary.md`;
4. `docs/design/civicos-ui-design-system/integration-contracts.md`;
5. `docs/design/civicos-ui-design-system/non-functional.md`;
6. `.scratch/civicos-ui-design-system/feature-list.md`;
7. `.scratch/civicos-ui-design-system/sow.md`.

Ba locked docs hiện có (`overview.md`, `api-contract.md`, `data-model.md`) phải
được giữ byte-for-byte; các phase/ticket/UI artifacts hiện có là evidence tham
chiếu, không bị rewrite.

## 7. Gate và hành động còn lại

- `LOCK.json` hiện chỉ chứa hash của `overview.md`, `api-contract.md` và
  `data-model.md`; sau khi tạo 5 canonical docs mới, `verify-lock` sẽ coi chúng
  là file mới sau khi khóa.
- Không tự regenerate `LOCK.json` ở đợt này: việc đó thay đổi lock metadata và
  chỉ được thực hiện sau khi contract owner/user review, approve nội dung mới.
- Hành động sau approval: chạy
  `node scripts/check-scope.mjs lock civicos-ui-design-system --stage=full --user-approved`,
  rồi chạy `node scripts/check-scope.mjs verify-lock civicos-ui-design-system`.
- Trước hành động đó, recommendation là `BLOCKED-CONTRACT`; không claim bộ docs
  mới đã được final-approved hoặc B12 đã mở.
