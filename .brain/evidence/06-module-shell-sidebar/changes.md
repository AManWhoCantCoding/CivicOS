# Ticket 06 — module shell/sidebar: files changed (this execution)

Scope: shared feature registry, Module shells/sidebar for Incident, Inspection,
Vehicle, Identity. No change to `src/modules/**`, `prisma/**`, worker, domain
APIs, dashboard cards, or `.scratch/**`.

## New files

- `src/components/navigation/feature-registry.ts`
  - Shared MODULES/FEATURES registry (module, route, required roles,
    assignment-task requirement, active-match rules). No sensitive data.
  - `visibleFeatures` (role + own active in-scope assignment + OU scope),
    `activeFeatureId` (exact/hash/prefix scoring), `hasBusinessCapability`
    (single source: `ROLE_BASE_CAPABILITIES`).
- `src/components/navigation/ModuleSidebar.tsx`
  - Presentational nav list with `aria-current="page"`, collapsed `sr-only`
    labels, 44px targets, trust-first dark tokens.
- `src/components/shell/ModuleShell.tsx`
  - Responsive shell: desktop sidebar + collapse (persisted), mobile drawer
    (focus trap, Escape, close-on-navigate, focus return), breadcrumb,
    offline notice, session-driven visibility.
- `src/components/shell/ModuleStatus.tsx`
  - Shared loading/empty/error/denied/offline states reusing AccessDenied.
- `src/components/shell/useModuleSession.ts`
  - Session-first hook: renders from `/api/auth/session`, refines with own
    `/api/identity/assignments`, skips the assignments fetch when no visible
    feature needs it, fail-closed on fetch errors.
- `src/app/incidents/layout.tsx`, `src/app/inspections/layout.tsx`,
  `src/app/vehicles/layout.tsx`
  - Server gate: logged-out renders page chrome unchanged; authenticated
    without business capability gets server-rendered denied shell; otherwise
    wraps pages in the module shell. No domain/API change.
- `tests/e2e/module-shell.spec.ts`
  - 12 browser tests: dashboard preservation, per-module shells, role
    visibility, client/server sync, deep-link denial, keyboard focus,
    desktop collapse, mobile drawer, offline.

## Edited files

- `src/app/assignments/page.tsx`, `src/app/users/page.tsx`
  - Content wrapped in the Identity shell; assignments additionally denies
    capability-less sessions server-side. Visual/route contracts kept.
- `src/app/inspections/establishments/page.tsx`
  - Anchor wrapper `id="inspection-schedule"` for the schedule feature link.
- `Lesson-learned.md`
  - Extended `Scoped E2E text locators` (producer side); added
    async-content-aware client effects and cold-dev heavy-page timeouts.

## Test outcomes (this execution)

- `tests/e2e/module-shell.spec.ts`: 22 passed, 2 project-gated skips, 0 failed
  (chromium + mobile).
- `tests/e2e/login-and-access.spec.ts`: 18 passed.
- `tests/e2e/ps005-incident.spec.ts`: 14 passed.
- `tests/e2e/ps007-inspection.spec.ts`: chromium 5 passed, mobile 5 passed.
- `tests/e2e/ps009-vehicle-watch.spec.ts`: 8 passed.
- `tests/e2e/evidence-authorization.spec.ts`: 4 failed — verified pre-existing
  on the clean tree (stash), unrelated to this ticket.
- `tsc --noEmit`, `eslint` on touched paths, `prettier --check` on touched
  files: clean (remaining prettier warnings are pre-existing in untouched files).

## Follow-up: `/identity` landing (explicit-scope exception)

Planner directed treating the AC (`/identity` shell) as required scope even
though `src/app/identity/**` was omitted from the ticket's allowed files.
Smallest adapter, no domain/API/prisma/worker changes:

- `src/app/identity/page.tsx` (new)
  - Reuses the Identity `ModuleShell` + header chrome of the sibling pages.
  - Server gates: logged-out and capability-less sessions get denied shells;
    `commander` sees Assignment + User cards, other business roles see only
    the Assignment card (mirrors `/users` server truth).
  - Cards link to the existing `/assignments` and `/users` surfaces only.
- `src/components/navigation/feature-registry.ts`
  - `MODULES.identity.homeHref`: `/assignments` → `/identity` (breadcrumb
    module crumb now points at the real landing).
- `tests/e2e/module-shell.spec.ts`
  - New test `identity landing exposes the module shell with user and
    assignment features` (commander full + office filtered), Red-first.

## Follow-up 2: server-authorized Feature entry URLs (Reviewer FAIL)

Mọi Feature direct URL phải authorize phía server, không chỉ ẩn sidebar.
Một seam duy nhất suy từ registry + session/assignment/OU scope hiện tại;
domain/API authorization giữ nguyên làm security boundary.

- `src/components/navigation/feature-registry.ts`
  - Thêm `canEnterFeature` / `canEnterAnyFeature` (pure, suy từ
    `visibleFeatures` — cùng một visibility sidebar dùng).
- `src/components/shell/feature-entry.ts` (mới, server-only)
  - `canEnterEntry(actor, featureIds)`: role-check trước, chỉ fetch
    `listAssignments` khi còn feature task-gated khả dĩ; map về
    `AssignmentScope` (own + in-scope). Không import từ client.
- Entry pages (giữ chrome logged-out nguyên; denied → `AccessDenied`
  server-render, không nested shell thừa):
  - `src/app/incidents/page.tsx` → `['incident-queue']`.
  - `src/app/inspections/establishments/page.tsx` → catalogue/schedule/
    workqueue (any-of; giữ anchor `#inspection-schedule`).
  - `src/app/vehicles/registry/page.tsx` → `['vehicle-registry']`.
  - `src/app/field/vehicles/page.tsx` → observation/verification (any-of).
  - `src/app/users/page.tsx` → `['identity-users']` (tương đương
    commander-only cũ); `src/app/assignments/page.tsx` +
    `src/app/identity/page.tsx` → `['identity-assignments']` (tương đương
    business-cap cũ); card User landing dùng seam thay role-check rời.
- `tests/e2e/module-shell.spec.ts`
  - Thêm test `feature entry routes deny unauthorized direct links from the
    server` (registry/field/establishments/incidents/identity), viết fail
    trước (Red).
- Ngoại lệ có chủ ý: `/intake` KHÔNG gate chrome (parallel-wave pin form
  visible + client-validation cho commander); boundary của intake là API
  `POST /api/intake-reports` 403 (đã có test ps005). Detail routes
  (`/incidents/[id]`, `/inspections/[id]`, `/field/vehicles/[id]`,
  `/inspections/establishments/[id]`) giữ per-resource denial đã pin.

## Follow-up 3: Tester FAIL — sync test theo hành vi denied đúng

- `tests/e2e/module-shell.spec.ts` (`client visibility stays in sync...`):
  DB sạch → `hientruong` không có `incident_verification` nên server gate
  đúng render denied (không sidebar) thay vì sidebar rỗng. Test điều chỉnh
  theo hành vi bảo mật đúng, KHÔNG nới gate: `ownActive.length === 0` →
  assert denied heading + không có sidebar nav; có assignment → assert
  sidebar + queue như cũ. Nhánh Vehicle chuyển sang entry field officer
  được phép (`/field/vehicles`: observation visible, verification theo
  `ownVehicle`) + assert `/vehicles/registry` bị server denied (field role
  không bao giờ thuộc COMMAND_ROLES).

## Follow-up 4: Tester FAIL — `/field/vehicles` thiếu ModuleShell

- `src/app/field/vehicles/layout.tsx` (mới, shell-only, không query/gate)
  - Bọc cây `/field/vehicles` (landing + detail) bằng
    `ModuleShell module="vehicles"` → sidebar/drawer/breadcrumb cho
    observation/verification. Parent `/field/layout.tsx` và `/field/offline`
    giữ nguyên.
- Gate giữ DUY NHẤT tại `src/app/field/vehicles/page.tsx` (không chuyển lên
  layout, không duplicate): layout mà deny sẽ bao luôn
  `/field/vehicles/[observationId]`, phá pin per-resource denial
  `/Không có quyền xem quan sát/` của parallel-wave matrix cho CROSS_ORG
  (superior_officer ngoài observation/verification visibleRoles) — file đó
  ngoài phạm vi sửa. Detail giữ denial chi tiết từ domain/API boundary.

## Verification (lần thực thi này)

- Developer KHÔNG chạy test/lint/typecheck/prettier theo quy định mới.
- Tester chạy toàn bộ verification, MỖI lần chạy test clean DB trước đó:
  `tests/e2e/module-shell.spec.ts` (kỳ vọng full green 2 projects),
  `tests/e2e/login-and-access.spec.ts`, `ps005`, `ps007`, `ps009`,
  `parallel-wave`, `parallel-wave-read-model` (pin form/chrome commander +
  logged-out), `tsc --noEmit`, `eslint`, `prettier --check` các path đã chạm.
- Trạng thái compile/test: CHƯA XÁC NHẬN trong lần này.
