# Integration Contracts — `civicos-unified-web-workspace`

## Web root and authentication

- `src/app/page.tsx` trở thành composition root cho authenticated role workspace;
  `SessionControls` và `/api/auth/session` vẫn là auth boundary hiện có.
- `LoginForm` giữ login API và session creation; post-login route `/` được giữ,
  nhưng workspace render sau khi session/Assignment projection sẵn sàng.
- Không tạo second session context hoặc second role resolver chỉ cho root.

## Feature registry

- `MODULES` là module metadata source.
- `FEATURES` vẫn là feature/entry authorization source.
- Navigation projection có thể lọc hidden IDs, nhưng `canEnterFeature()` và
  server entry gate phải tiếp tục thấy entry definitions để preserve direct URL.
- `visibleFeatures()` là policy source cho role/Assignment; implementation không
  được copy lại mảng role trong root.

## Shared shell

- Reuse/extend `src/components/shell/ModuleShell.tsx`,
  `ModuleSidebar.tsx`, `ModuleStatus.tsx` và existing focus/drawer behavior.
- Global shell có thể expose module-level navigation và feature-level navigation,
  nhưng không đổi module business content.
- Module navigation là single-expanded accordion/tab pattern: giữ các top-level
  module tab đủ điều kiện, chỉ render feature list của `activeModuleId`; click
  tab thay active module và ẩn feature list của tab trước.
- `activeModuleId` được lấy từ current route/active feature; tại root chưa có
  route, chọn module đầu tiên trong role-visible navigation projection. Đây là
  presentation/navigation state, không phải permission state.
- Feature label luôn nằm dưới `FEATURES.moduleId` tương ứng; không dùng screenshot
  grouping làm source cho business/module mapping.
- Land Light/Blue tokens là visual reference; shell không import land business
  repository/service để dựng navigation.

## Domain layouts and routes

- Existing layouts/pages remain owners of domain data/action/state.
- PS-E1-004/005/007 page/layout code không bị xóa trong UWS-03.
- `src/app/land/**`, `/map`, `/vehicles`, `/field`, identity/access và public
  lookup tiếp tục dùng route-specific server/domain guards.

## Mobile

- `mobile/src/navigation/AppNavigator.tsx` không nhận web module switcher.
- Audit dùng `mobile/src/components/States.tsx`, `mobileBaseline` và current
  feature screens; không tạo API parity hoặc write flow.

## Test/evidence integration

- Workspace tests phải bao phủ role union, Assignment gating, hidden navigation,
  direct route authorization, no-visible-feature `AccessDenied`, hash/deep-link,
  focus/drawer và session error.
- Existing domain tests remain authoritative for business action/state semantics.
- Mobile tests phải chứng minh navigation/read-only không đổi sau visual audit.

## Provider/UI gate

Sau khi B6 được user approve, UI/UX nhận một bounded web workspace contract với
closed vocabulary, expected states và `executable_prototype_required: true`.
Google Stitch là UI provider duy nhất; Research chỉ review conformance.
