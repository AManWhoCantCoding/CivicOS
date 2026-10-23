# Tổng quan — `civicos-uiux-alignment`

> [!CAUTION]
> **Bản phục hồi, không phải bản gốc.** Overview nguồn tại
> `docs/design/civicos-uiux-alignment/overview.md` đã bị ghi đè bằng nội dung
> hỏng. Bản nguồn và bản đích trước khi phục hồi có cùng SHA-256; đường dẫn
> nguồn không được Git theo dõi và không có bản lịch sử tại đường dẫn đó để
> khôi phục. Tài liệu này là bản tổng hợp không nguyên văn từ các artifact được
> dẫn ở cuối trang. Ngày 2026-10-23, người dùng chấp nhận bản tổng hợp này làm
> tài liệu thay thế và duyệt B12; việc đó không khôi phục nội dung gốc. Các sai
> khác trạng thái ngoài quyết định này vẫn được giữ nguyên. `LOCK.json` phản ánh
> bộ tài liệu hiện hành đã được duyệt, không phải hash của bản gốc đã mất.

## 1. Mục tiêu và loại thay đổi

Yêu cầu đầu vào B1 là đồng bộ giao diện dự án dựa trên giao diện module quản lý
đất đai. Work item được route `FULL_FEATURE`, risk `high`, loại
presentation/UI-only migration. Quyết định canonical đã ghi trong change
contract là dùng baseline Light/Blue, không dùng visual drift dark/cyan hoặc
handoff teal làm chuẩn.

Mục tiêu là thống nhất presentation/layout của các web và mobile surface hiện
có trong khi bảo toàn business behavior, API, dữ liệu, quyền, route và
capability boundary.

## 2. Trạng thái được ghi trong các nguồn

| Gate              | Trạng thái được ghi                                 | Nguồn/ghi chú                                                                                                                                  |
| ----------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| B1 / R0           | `RECORDED` / `ROUTED` — `FULL_FEATURE`, risk `high` | Workflow status; yêu cầu gốc ở research input.                                                                                                 |
| Source assessment | `COMPLETE`                                          | `.scratch/civicos-uiux-alignment/source-assessment.md`.                                                                                        |
| B5                | `APPROVED` — sáu slice UIX-01–UIX-06                | Workflow status và feature list.                                                                                                               |
| B6                | `APPROVED` — design docs và SOW                     | Workflow status; workflow ghi lúc đó chưa có final `data-model.md`.                                                                            |
| B7                | `READY_FOR_NEXT_GATE`                               | Workflow status ghi prototype/conformance hoàn tất trước human gate.                                                                           |
| B8                | `APPROVED`                                          | Workflow status ghi người dùng chọn phê duyệt B7; handoff là `STITCH_RENDERED_EXECUTABLE_PROTOTYPE`.                                           |
| B9                | `CLOSED_NO_KNOWN_IMPACT`                            | Workflow status ghi không có schema/API/data delta.                                                                                            |
| B10               | Hai trạng thái khác nhau được giữ nguyên            | Workflow status ghi `READY_FOR_NEXT_GATE`; change contract §9 ghi `B10_COMPLETE`. Không tự chọn một trạng thái thay cho trạng thái kia.        |
| B11               | `COMPLETE`; PH-01–PH-06 được ghi `PHASE-PASS`       | Workflow status/evidence; đây là trạng thái được ghi, không phải lần xác minh mới của bản phục hồi.                                            |
| B12               | `APPROVED`                                          | Người dùng chọn “Duyệt cả B12” ngày 2026-10-23, chấp nhận overview phục hồi làm bản thay thế; xem `.scratch/civicos-uiux-alignment/review.md`. |

ADR canonical `brain/adr/0004-civicos-uiux-alignment.md` được cập nhật
`ACCEPTED` sau quyết định B12 ngày 2026-10-23. Bản nguồn cũ
`docs/adr/0004-civicos-uiux-alignment.md` vẫn giữ status `PROPOSED`; không dùng
bản cũ đó làm status hiện hành.

**Sai khác về trạng thái baseline:** bảng AS-IS/GAP/TO-BE trong source assessment
gọi quyết định land baseline là `Contract decision required`; change contract
§4 cũng ghi canonical land reference đang `OPEN`. Các phần decision closure và
feature list lại ghi lựa chọn Light/Blue là `CLOSED`. Giữ cả wording cũ lẫn
closure được ghi; bản phục hồi này không tự tạo thêm quyết định.

## 3. AS-IS và khoảng trống

- Web đã có Light/Blue tokens và một số shared primitives. `/land/applications`
  và `/land/parcels` dùng baseline này, nhưng `/land` còn dark/cyan; handoff
  textual land từng mô tả teal.
- Login, identity/access và một số vehicle/field entry points còn style cục bộ
  hoặc raw slate; domain surfaces chưa dùng đồng nhất primitive/state grammar.
- Mobile đã có baseline/state primitives ở một số surface; auth, settings,
  incident và một số shell còn presentation rời rạc. `AppNavigator` giữ route,
  deep-link và read-only behavior hiện có.
- Cần thống nhất visual/state language trên các surface hiện hữu, không mở rộng
  capability hoặc suy diễn quyền từ giao diện.

## 4. Required state và phạm vi

Mọi web/mobile surface hiện có dùng cùng semantic visual vocabulary — canvas,
surface, text, action, focus, typography, spacing, shape và state presentation
— cùng responsive, keyboard/focus và touch target phù hợp. Các capability khác
nhau có chủ đích vẫn được giữ.

| Slice  | Phạm vi được ghi                                                                                     |
| ------ | ---------------------------------------------------------------------------------------------------- |
| UIX-01 | Shared Light/Blue foundation, state grammar và land anchor `/land`.                                  |
| UIX-02 | Web shell/navigation, login, identity, users, assignments và access-denied.                          |
| UIX-03 | Residents, IntakeReport/Incident, Inspection, Vehicles/Field.                                        |
| UIX-04 | Land application/parcel/public lookup, Map và offline/provider/geometry states.                      |
| UIX-05 | Mobile auth/shell, Map, RelatedInfo, Alarm, Dispatch, Task, Incident, Land, Settings; vẫn read-only. |
| UIX-06 | Cross-surface visual, accessibility, privacy, behavior regression và evidence.                       |

Thứ tự phụ thuộc: `UIX-01 → {UIX-02, UIX-03, UIX-04, UIX-05} → UIX-06`.
Chi tiết surface, ticket và acceptance criteria nằm trong SOW, feature list và
các phase/ticket của work item.

## 5. Canonical presentation

Các giá trị sau được ghi trong SOW và design tokens; không phải quyết định mới
của bản phục hồi:

- Canvas `#F8FAFC`, surface `#FFFFFF`, muted `#F1F5F9`.
- Text `#172033` / `#475569`, border `#CBD5E1`.
- Accent `#075985`, hover `#0C4A6E`, focus `#1D4ED8`.
- Success `#166534`, warning `#854D0E`, danger `#B91C1C`, info `#1E40AF`.
- Simulated background/text `#FFF7ED` / `#9A3412`.
- System sans; monospace cho code, timestamp và version.
- Spacing `4/8/12/16/24/32/48px`, radius `6/10/16px`, control tối thiểu
  `44px`; state không được truyền đạt chỉ bằng màu.

## 6. Must preserve và non-goals

- Không đổi API path/method/payload/error/status, read model, pagination,
  version, idempotency, database/schema/seed, route destination, deep link hay
  navigation behavior.
- Không đổi business action/state machine, session/role, OrganizationUnit,
  Assignment, permission, masking, audit/privacy hoặc integration behavior.
- Giữ `internal / simulated`, non-legal public wording, map projection/provider
  boundary và quy tắc no-offline-polygon.
- Mobile giữ read-only; không thêm create/edit/submit/approve/upload hoặc
  public-intake capability.
- Không thêm capability, endpoint, table/field/relation/migration, seed,
  read-model field, cache/offline store hoặc telemetry để đạt visual parity.
- Không dùng Stitch screenshot/HTML làm production implementation. Prototype là
  evidence thiết kế/runtime theo SOW, không phải quyền sửa contract.
- Nếu cần API, permission, route, data, state-machine, map hoặc legal/public
  meaning mới, dừng và mở contract review riêng (`BLOCKED-CONTRACT` khi áp dụng).

## 7. Data-model disposition

`docs/civicos-uiux-alignment/data-model.md` ghi `NO_KNOWN_IMPACT` và
`USER_APPROVED_FOR_FULL_LOCK`: work item presentation-only dùng cấu trúc hiện
có, không tạo hoặc đổi persistence, API/data semantics, read model, cache hay
offline store. Đây là nội dung disposition đã có trong tài liệu đó; không phải
phê duyệt mới phát sinh từ bản phục hồi.

## 8. Handoff và xác minh theo hồ sơ

SOW yêu cầu B7 có Stitch artifacts đã verify, closed vocabulary,
`navigation-flow.md`, `interaction-spec.md`, `motion-spec.md`, executable local
prototype và evidence. Các trục review được ghi gồm web `1440 × 900`, mobile
`390 × 844`, accessibility/focus/keyboard, reduced motion, safe-state copy,
masking/privacy và behavior preservation. Workflow status ghi B11/PH-06 đã
pass; B12 được người dùng duyệt ngày 2026-10-23.

## 9. Nguồn và giới hạn phục hồi

- `.scratch/design-structure-migration-2026-10-23/worker-progress.md` — ghi nhận sự cố ghi đè và yêu cầu giữ nguồn cũ.
- `.scratch/civicos-uiux-alignment/workflow-status.md` — gate status/frontier.
- `.scratch/civicos-uiux-alignment/{sow.md,change-contract.md,feature-list.md,source-assessment.md}` — mục tiêu, baseline, phạm vi, invariants và AS-IS/GAP/TO-BE.
- `docs/civicos-uiux-alignment/{api-contract.md,data-model.md,domain-rules.md,non-functional.md}` — contract và boundary hiện hành.
- `.scratch/civicos-ui-design-system/ui/design-tokens.md` và
  `brain/adr/0003-shared-civicos-ui-design-tokens.md` — baseline được ghi.
- `brain/adr/0004-civicos-uiux-alignment.md` — ADR có status discrepancy đã nêu.

Không có bản nguyên văn nào được khôi phục. Người dùng đã chấp nhận bản tổng
hợp này làm tài liệu thay thế và duyệt B12; source cũ được giữ lại để bảo toàn
dấu vết sự cố, không được coi là nội dung hợp lệ.
