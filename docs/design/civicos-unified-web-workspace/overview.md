# Design Overview — `civicos-unified-web-workspace`

## Trạng thái

- **B6:** `APPROVED` — user duyệt SOW/design.
- **B5:** `APPROVED` với UWS-01…UWS-06.
- **Primary runtime:** web.
- **Mobile:** chỉ visual/state audit; không đổi native navigation hoặc capability.
- **Canonical visual reference:** Light/Blue land-approved baseline trong
  `docs/adr/0003-shared-civicos-ui-design-tokens.md`.

## Problem statement

Web hiện có một root launcher độc lập với ba card hard-code, trong khi
`feature-registry.ts` đã có module catalog, role visibility và Assignment gate.
Các domain page dùng `ModuleShell` theo từng module nhưng chưa có một app-level
workspace. Người dùng có thể nhìn thấy navigation không phản ánh đúng chức năng
được giao.

## Goal

Tạo một web workspace duy nhất dùng shared shell dựa trên land-approved
presentation, trong đó chức năng hiển thị sau login được tính từ session, role và
Assignment hiện có. Ẩn UI navigation của PS-E1-004/005/007 nhưng không xóa route,
API hoặc backend capability.

## Required state

1. Root `/` là workspace entry sau login, không còn danh sách module hard-code.
2. Workspace hiển thị module/feature mà session hiện tại được phép thấy theo
   `visibleRoles`, `requiresTask`, `bypassTaskRoles`, organization scope và
   Assignment.
3. Shared web shell có thể chuyển giữa các module được phép, giữ active feature,
   breadcrumb, drawer, keyboard focus và state handling hiện có.
4. Các feature sau không xuất hiện trong web launcher/module navigation:
   - PS-E1-004: `resident-list`, `resident-reports`.
   - PS-E1-005: `incident-queue`, `incident-intake`.
   - PS-E1-007: `inspection-catalogue`, `inspection-schedule`,
     `inspection-workqueue`.
5. Direct URL, server route gate, API và business surface của các feature bị ẩn
   vẫn được giữ. “Ẩn navigation” không đồng nghĩa “xóa capability”.
6. Session hợp lệ nhưng không có feature visible hiển thị `AccessDenied` state;
   không liệt kê module/data để tránh suy diễn quyền hoặc lộ surface.
7. Mobile chỉ được audit token, typography, state, accessibility và visual
   vocabulary so với web; giữ `AppNavigator`, read-only boundary và current
   capability.

## Scope map

| Surface             | Required change                                     | Must preserve                                            |
| ------------------- | --------------------------------------------------- | -------------------------------------------------------- |
| Root `/`            | Role-aware workspace và module/feature switcher     | SessionControls, login API, role/Assignment semantics    |
| Web shell           | Reuse/extend `ModuleShell` và shared primitives     | Breadcrumb, drawer, focus, loading/error/empty/offline   |
| Registry            | Tách navigation visibility khỏi entry authorization | `visibleFeatures`, `canEnterFeature`, server enforcement |
| Land                | Làm visual anchor cho shared web shell              | land role, `land_review`, masking, map/public wording    |
| Identity/Assignment | Hiển thị feature được phép                          | Organization scope, Assignment policy, privacy           |
| PS-E1-004/005/007   | Ẩn khỏi navigation; không xóa page/API              | Direct route và domain behavior                          |
| Vehicles/Field/Map  | Tích hợp vào web workspace                          | Existing field/offline/map boundaries                    |
| Mobile              | Visual/state audit only                             | Native navigation, read-only, API/runtime boundary       |

## User flows

### Authenticated user

```text
Login success
  → `/`
  → load session + in-scope assignments
  → calculate role-visible navigation
  → show permitted workspace
  → select feature
  → existing route/page/server gate
```

### Valid session with no visible feature

```text
Session valid
  → no feature passes role + Assignment policy
  → AccessDenied state
  → no module/data inventory
```

### Direct link to hidden-navigation feature

```text
Direct URL
  → existing server authorization
  ├─ allowed: existing page renders; global navigation omits hidden feature
  └─ denied: existing forbidden/access boundary; no data leak
```

## Non-goals

- Không tạo dashboard/KPI/search/export/notification center hoặc business action
  mới.
- Không xóa page, route, endpoint, database structure, seed hoặc read model.
- Không đổi role catalog, permission, Assignment, masking, state machine hoặc
  public/legal meaning.
- Không đổi mobile route, write capability, offline store hoặc API contract.
- Không thay thế Google Stitch bằng provider khác nếu B7 cần UI artifact.

## Decision closure

| Decision                          | Status | Evidence                                                                          |
| --------------------------------- | ------ | --------------------------------------------------------------------------------- |
| Unified runtime                   | CLOSED | User: chỉ unified web                                                             |
| Navigation removal meaning        | CLOSED | User: ẩn khỏi navigation, giữ route/API                                           |
| Post-login landing                | CLOSED | User: workspace theo role                                                         |
| No-visible-feature state          | CLOSED | User: `AccessDenied`                                                              |
| Canonical visual baseline         | CLOSED | Existing approved Light/Blue contract                                             |
| Exact module-switcher composition | CLOSED | User request: one active module tab expands its feature list; other tabs collapse |
| B6 design/SOW approval            | CLOSED | User approval gate                                                                |
