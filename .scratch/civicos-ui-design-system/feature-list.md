# Danh sách phạm vi — `civicos-ui-design-system`

## Trạng thái và nguồn

- Phạm vi B5/B6 là scope kế thừa đã được ghi trong
  `.scratch/civicos-ui-design-system/workflow-status.md` §§3–6; tài liệu này
  hoàn tất artifact còn thiếu, không mở lại Feature Council hoặc tạo quyết
  định nghiệp vụ mới.
- B8 đã `APPROVED` bằng user message `Được tôi chốt` cho Light/Blue baseline và
  composite board; B9 đã `APPROVED` bằng user message
  `Duyệt B9 — no data-model impact`.
- B10 đã `COMPLETE`; CUI-001, CUI-002, CUI-003 và CUI-004 đã qua implementation,
  review, verification và phase gates theo `workflow-status.md` §§41–60.
- Locked docs hiện có và là nguồn contract: `overview.md`, `api-contract.md`,
  `data-model.md`. Các phạm vi dưới đây không thay thế nội dung của ba file đó.

## Danh sách phạm vi đã duyệt

Locked docs không cung cấp mã F-xx cho feature này. Vì vậy danh sách dùng tên
phạm vi và section references hiện có, không phát minh F-ID mới.

| Phạm vi đã duyệt | Nội dung giới hạn | Traceability hiện có |
|---|---|---|
| Shared Light/Blue baseline | Token màu, typography, spacing, shape, focus và semantic state presentation dùng chung; không đổi domain behavior. | `docs/design/civicos-ui-design-system/overview.md` §§7–9, §§11–17; `.scratch/civicos-ui-design-system/ui/design-tokens.md` §§16–95; Stitch design system `assets/4585683734903032299`. |
| Web foundation, shell và navigation | Home, `ModuleShell`, sidebar, organization context, active navigation và state presentation trên destination hiện có. | `overview.md` §§11–17; `ui/prototype.md` §§36–53; TS-01, TS-11; CUI-001. |
| Web domain surfaces | Residents, Intake, Inspection, Land list/detail và presentation của web map states trên surface/path đã được duyệt; giữ field, action, masking và state semantics hiện có. | `overview.md` §§11–17; `ui/prototype.md` §§55–92; TS-02–TS-08; CUI-002. |
| Mobile primitives và surfaces | Map, Related Info, Alarm, Dispatch, Task và Land dùng chung baseline; giữ read-only flow, context, offline guard và back destination hiện có. | `overview.md` §§14–17; `ui/design-tokens.md` §§96–111; `ui/prototype.md` §§85–100; TS-09–TS-11; CUI-003. |
| Cross-surface compatibility verification | Kiểm tra token, accessibility, masking/privacy, state copy, no-polygon/offline và không drift API/schema/route/permission/map boundary. | `overview.md` §§19–29; `api-contract.md` §§7–26; `data-model.md` §§7–30; TS-01–TS-11; CUI-004. |

## Approved Stitch catalog

Visual reference duy nhất là canonical project
`projects/3369879313583874807`, được liệt kê đầy đủ tại
`.scratch/civicos-ui-design-system/ui/stitch-screens.md` §§3–21:

- Home `3ad19ede8c43414d819f2bc50fbcc4c0`;
- composite board `fdb8b9704dd14acaa6000f342f921c14`;
- Related Info `50a9aebb49a4447d9fb72915b2a7a5aa`;
- Intake `cb6a0dd978824a80bbbb87aa07e035c8`;
- Map `5be82aba31df45d7b34cf20ac8de8a16`;
- Land overview `6edec5c868c842a9969659814c7d0c3d`;
- Entity detail/bottom sheet `aa859d4bac114dfbabc4c0bea207ef93`.

B8 chấp nhận limitation rằng Stitch không có click-through/runtime linking;
catalog không tạo screen, route hoặc production behavior mới.

## Ticket contract references

| Ticket đã tồn tại | Contract scope được kế thừa |
|---|---|
| `CUI-001` | `.scratch/civicos-ui-design-system/phases/phase-01-web-foundation-shell/CUI-001-web-foundation-shell-tokens.md` — web foundation, shell, navigation và token presentation. |
| `CUI-002` | `.scratch/civicos-ui-design-system/phases/phase-02-web-domain-surfaces/CUI-002-web-domain-surfaces-and-map-states.md` — web domain surfaces và map state presentation. |
| `CUI-003` | `.scratch/civicos-ui-design-system/phases/phase-03-mobile-primitives-screens/CUI-003-mobile-primitives-and-screens.md` — mobile primitives và screen presentation. |
| `CUI-004` | `.scratch/civicos-ui-design-system/phases/phase-04-cross-surface-verification/CUI-004-cross-surface-accessibility-regression.md` — cross-surface accessibility/regression verification. |

Các ticket là nguồn giới hạn file được phép/cấm sửa và acceptance criteria;
feature-list này không mở rộng ticket scope.

## Ngoài phạm vi và bất biến

- Không tạo legal rule, retention rule, public claim, permission, Assignment,
  masking rule, state machine hoặc business action mới.
- Không đổi API path/method/payload/error/status, route/navigation destination,
  API/read model, database/schema/seed/migration/index/relation, cache/offline
  storage hoặc map projection/provider behavior.
- Không tạo Stitch resource mới, không biến simulated data thành official/
  certified và không mở public/citizen surface.
- Không có F-xx mới; CUI-001–CUI-004 là ticket IDs đã tồn tại trong phase
  contracts và là boundary triển khai/verification.

## DATA-MODEL-IMPACT

B9 đã kết luận **no data-model impact**. Các surface trên reuse structures và
contracts hiện có; không có table, field, relation, index, constraint,
migration, seed, read-model field hoặc offline store mới. Nếu implementation
phát sinh nhu cầu ngoài kết luận này, phải dừng và mở lại B9 review.

## Contract-integrity gate

- Năm canonical design docs còn thiếu đã được bổ sung tại
  `docs/design/civicos-ui-design-system/`:
  `domain-rules.md`, `edge-cases.md`, `glossary.md`,
  `integration-contracts.md`, `non-functional.md`.
- `.scratch/civicos-ui-design-system/sow.md` là SOW tương ứng.
- Nội dung mới chưa được thêm vào `LOCK.json`; B8/B9 approvals không tự động
  đồng nghĩa với approval/lock cho các artifact vừa tạo.
- Contract owner/user phải review và chấp thuận bộ artifact trước khi chạy
  `node scripts/check-scope.mjs lock civicos-ui-design-system --stage=full --user-approved`.
  Cho tới khi đó workflow vẫn là `BLOCKED-CONTRACT`.
