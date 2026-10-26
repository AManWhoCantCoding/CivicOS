---
title: CivicOS — trải nghiệm web/mobile và điều hướng
status: draft
owner: project
created: 2026-10-23
updated: 2026-10-23
sources:
  - ../../../docs/civicos-ui-design-system/overview.md
  - ../../../docs/civicos-ui-design-system/LOCK.json
  - ../../../docs/civicos-uiux-alignment/overview.md
  - ../../../docs/civicos-uiux-alignment/LOCK.json
  - ../../../docs/civicos-unified-web-workspace/overview.md
  - ../../../docs/civicos-unified-web-workspace/LOCK.json
  - ../../../brain/adr/0003-shared-civicos-ui-design-tokens.md
  - ../../../brain/adr/0004-civicos-uiux-alignment.md
  - ../../../brain/domains/ui-experience/research/civicos-uiux-alignment/input.md
  - ../../../brain/domains/ui-experience/research/civicos-unified-web-workspace/input.md
  - ../../../docs/UI-map.md
  - ../../../docs/rbac/role-matrix-v2.md
  - ../../../ui1-visual-redesign-brief.md
  - ../../../kiem-ke-ui-civicos.md
---

# CivicOS — trải nghiệm web/mobile và điều hướng

## Trạng thái nguồn

| Work item                       | Trạng thái trong nguồn hiện có                                                                                                                | Ý nghĩa                                                                                           |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `civicos-ui-design-system`      | Workflow ghi B8/B9/B12 approved, B11 complete; B13 deferred                                                                                   | Shared Light/Blue presentation baseline đã được duyệt; không mở rộng cải tiến ngoài quyết định đó |
| `civicos-uiux-alignment`        | B8 approved, B9 no-known-impact, B11 complete; B12 được duyệt ngày 2026-10-23 sau khi người dùng chấp nhận overview phục hồi làm bản thay thế | Phạm vi migration presentation rộng hơn; không được đổi behavior/data/permission                  |
| `civicos-unified-web-workspace` | Workflow ghi B6–B9 approved và B11 phase pass                                                                                                 | Unified web workspace; mobile chỉ visual/state audit                                              |
| UI map và root design briefs    | UI map mô tả click path; các brief/kiểm kê là proposal hoặc snapshot                                                                          | Dùng để truy vết surface, không tự thay feature contract hoặc quyền server                        |

Các dòng trên là status được đọc từ artifacts đang có. `brain/adr/0003` vẫn nói B8 pending trong khi workflow UI design system ghi B8/B12 approved. ADR canonical `brain/adr/0004` đã được chấp thuận sau B12 ngày 2026-10-23; bản nguồn cũ `docs/adr/0004` được giữ nguyên làm lịch sử. Overview UIX là bản phục hồi được người dùng chấp nhận thay thế, không phải bản gốc đã khôi phục.

## Shared Light/Blue baseline

ADR-0003 và bộ design system xác định presentation baseline Light/Blue. Các token được ghi nhận gồm canvas `#F8FAFC`, surface `#FFFFFF`, text `#172033`/`#475569`, action `#075985`, focus `#1D4ED8`, system sans, monospace cho mã/timestamp/version, semantic state colors và touch target 44px.

Phạm vi này là presentation: không tự đổi API, schema, route destination, permission, Assignment, masking, state machine, offline policy, map allowlist hoặc legal/public meaning. Loading, empty, error, forbidden, masked, stale, offline và simulated state phải giữ semantics an toàn hiện có.

## Unified web workspace

Design `civicos-unified-web-workspace` ghi nhận một workspace web sau login, navigation được tính từ session/role/Assignment/OU và một shell dùng chung. Chức năng PS-E1-004/005/007 có thể bị ẩn khỏi launcher/navigation theo quyết định đó nhưng direct route, API, server gate và domain behavior vẫn giữ. Hợp lệ nhưng không có feature visible thì hiển thị `AccessDenied`, không liệt kê data/module để suy diễn quyền.

Đây là quyết định về web presentation/navigation; không đồng nhất “ẩn navigation” với structural deletion. Mobile giữ native shell, route và capability hiện hành trừ khi một feature contract được duyệt riêng.

## Mobile: tách UI parity khỏi capability parity

- UI design system và UIX alignment là presentation-only, ghi boundary mobile read-only.
- Unified workspace chỉ yêu cầu audit visual/state mobile, không thay native navigation hoặc capability.
- Mobile write parity trong ADR-0005 là một proposal E1 riêng; xem [e1-operations.md](e1-operations.md). Không lấy design tokens, prototype hay UI map làm căn cứ cấp write/offline capability.

## UI map và tài liệu thiết kế rải rác

`docs/UI-map.md` diễn tả đường đi người dùng qua Intake/Incident, Inspection, Vehicle/Field, Resident, Land/map và native mobile. Đây là tài liệu hướng dẫn/click path, không phải authorization contract. Khi khác với role/Assignment policy, dùng contract server-side và matrix đã được chấp thuận.

Các file `ui1-visual-redesign-brief.md` và `kiem-ke-ui-civicos.md` là các brief/đề xuất/kiểm kê còn lại. Chúng được đưa vào nguồn tổng hợp để không bỏ sót route/archetype, nhưng trạng thái draft/visual proposal không biến chúng thành design approval.

`docs/previews/pilot-01-v2-visual-review.html` là preview artifact. Nó có thể giúp tra cứu hướng thị giác, nhưng không thay thế screen approval, locked UI contract hoặc capability/API contract.

## Tham chiếu cần đọc trước khi sửa UI

1. `docs/civicos-ui-design-system/` và lock tương ứng cho token/primitives đã duyệt.
2. `docs/civicos-uiux-alignment/` cho phạm vi presentation surfaces.
3. `docs/civicos-unified-web-workspace/` cho web launcher/navigation/AccessDenied boundary.
4. `brain/adr/0003-*.md` và `0004-*.md`; lưu ý status drift đã nêu ở trên.
5. `docs/UI-map.md`, role matrix, `.scratch/<feature>/ui/` và runbook phù hợp để truy vết screen/flow.
