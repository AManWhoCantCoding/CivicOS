# CUI-004 — Cross-surface accessibility và regression verification

- **Ticket ID:** `CUI-004`
- **Status:** `done`
- **Blocked by:** `CUI-002`, `CUI-003` — web domain/map và mobile implementation phải hoàn tất trước matrix verification.
- **Loại:** feature
- **Gate hướng:** không
- **Lane:** full
- **Demo path:** chạy TS-01–TS-11 trên web `1440 × 900` và mobile `390 × 844`; review Home/shell, Residents, Intake, Inspection, Land, web map states, mobile Land/Map và read-only screens.
- **F/DR/EC refs:** F: `docs/design/civicos-ui-design-system/overview.md` §§11–29; DR: `.scratch/civicos-ui-design-system/ui/design-tokens.md` §§16–111; API/data boundary: `docs/design/civicos-ui-design-system/api-contract.md` §§7–26 và `docs/design/civicos-ui-design-system/data-model.md` §§7–30; EC: TS-01–TS-11 trong `.scratch/civicos-ui-design-system/ui/test-scenarios.md`.
- **File được phép sửa:**
  - `src/app/incidents/layout.tsx`
  - `src/app/incidents/page.tsx`
  - `src/app/intake/page.tsx`
  - `src/app/residents/page.tsx`
  - `src/app/residents/[subjectId]/page.tsx`
  - `src/app/land/applications/page.tsx`
  - `src/app/land/applications/[applicationId]/page.tsx`
  - `src/app/land/parcels/page.tsx`
  - `src/app/land/parcels/[parcelId]/page.tsx`
  - `src/app/map/layout.tsx`
  - `src/app/map/page.tsx`
  - `src/app/globals.css`
  - `src/app/page.tsx`
  - `src/components/shell/ModuleShell.tsx`
  - `src/components/shell/ModuleStatus.tsx`
  - `src/components/navigation/ModuleSidebar.tsx`
  - `src/components/residents/`
  - `src/components/incidents/`
  - `src/components/inspections/`
  - `src/components/land/`
  - `src/components/map/`
  - `mobile/src/components/States.tsx`
  - `mobile/src/features/map/`
  - `mobile/src/features/related-info/`
  - `mobile/src/features/alarm/`
  - `mobile/src/features/dispatch/`
  - `mobile/src/features/task/`
  - `mobile/src/features/land/`
  - `tests/e2e/module-shell.spec.ts`
  - `tests/e2e/field-shell.spec.ts`
  - `tests/e2e/ps004-resident.spec.ts`
  - `tests/e2e/ps005-incident.spec.ts`
  - `tests/e2e/ps007-inspection.spec.ts`
  - `tests/residents/resident-regression.test.ts`
  - `tests/incidents/intake-report-lifecycle.test.ts`
  - `tests/inspections/inspection-contract.test.ts`
  - `tests/land-ui/lnd05-parcel-workspace.test.ts`
  - `tests/land-ui/land-parcel-map-focus.test.tsx`
  - `tests/land-ui/land-parcel-map-accessibility.test.tsx`
  - `tests/map/land-parcel-map-states.test.tsx`
  - `mobile/src/components/__tests__/states.test.tsx`
  - `mobile/src/features/__tests__/land.test.ts`
  - `mobile/src/features/__tests__/land-parcel-map.test.tsx`
  - `mobile/src/features/__tests__/land-parcel-map-offline.test.tsx`
  - `mobile/src/features/__tests__/navigation-readonly.test.tsx`
- **File cấm sửa:** `docs/design/**`, `docs/research/**`, mọi ADR, mọi file dưới `.scratch/civicos-ui-design-system/ui/**`, `docs/design/civicos-ui-design-system/LOCK.json`, `prisma/**`, `src/app/api/**`, `mobile/src/api/**`, config/package files, route/deep-link/API/read-model contracts, permission/Assignment/masking/state-machine logic, seed behavior, map projection/provider/cache behavior và Stitch resources.

## Phạm vi

Đây là verification/hardening ticket cho presentation đã triển khai. Có thể sửa lỗi presentation/accessibility trong union of approved UI paths; không được biến một regression thành thay đổi domain/API/data model. Runtime click-through limitation của Stitch không được coi là production behavior và không được giải quyết bằng cách tạo screen mới.

## Acceptance Criteria

### AC-1 — Token and visual regression matrix

**Given** toàn bộ web/mobile surfaces đã migrate, **when** đối chiếu ở viewport `1440 × 900` và `390 × 844`, **then** canvas/surface/accent/focus/semantic colors, typography, spacing, radius, focus ring, simulated label và map fill/stroke khớp token artifact; không có gradient, neon, glow, đen tuyệt đối hoặc status chỉ bằng màu.

### AC-2 — Accessibility and interaction matrix

**Given** keyboard, screen reader hoặc touch user chạy TS-01–TS-11, **when** tab/focus/chạm retry/back/detail/map controls, **then** focus-visible, label/heading/live-region/status copy và alternative selection đều có; control/touch target tối thiểu `44px` (mobile `44 × 44px`); loading/empty/error/forbidden/stale/offline có bước tiếp theo rõ ràng.

### AC-3 — Privacy and state-boundary regression

**Given** masked/forbidden/out-of-scope/offline/stale/map failure scenarios, **when** chạy regression matrix, **then** không lộ PII/raw payload/rights/Evidence/sync/storage key ngoài boundary, không render polygon cũ/cache khi bị cấm/offline/provider/geometry failure, không fake success và simulated data vẫn có copy nội bộ.

### AC-4 — Compatibility and scope gate

**Given** full verification hoàn tất, **when** review diff và chạy contract checks, **then** API paths/shapes/status, routes/destinations, permissions, Assignment, masking, state machines, schema/migrations/seed, map projection và Stitch catalog không đổi; chỉ token/layout/component presentation và targeted tests thuộc allowed files được thay đổi.

## Các bước thực hiện

1. Chạy lock verification và lập matrix TS-01–TS-11 cho web/mobile.
2. Chạy targeted root/mobile tests và visual/accessibility review ở hai viewport đã khóa.
3. Kiểm tra token values, focus/target sizing, state copy, simulated labels và prohibited content.
4. Kiểm tra privacy/no-polygon/read-only/API-route compatibility bằng existing regression suites.
5. Chỉ sửa presentation/accessibility trong allowed paths nếu phát hiện lỗi; không sửa contract behavior.
6. Chạy full root/mobile verification và ghi evidence; đánh dấu blocker nếu scope/diff không phù hợp.

## Verification

- `node scripts/check-scope.mjs verify-lock civicos-ui-design-system`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run test:e2e`
- `npm run build`
- `npm run mobile:typecheck`
- `npm run mobile:test`
- `npm run mobile:build`
- Manual/visual matrix: `.scratch/civicos-ui-design-system/ui/test-scenarios.md` TS-01–TS-11 at web `1440 × 900` and mobile `390 × 844`; compare only against approved Stitch catalog in `.scratch/civicos-ui-design-system/ui/stitch-screens.md`, không tạo screen mới.

## test-skeleton

- AC-1: `it('passes the shared web/mobile token and prohibited-style regression matrix', ...)`.
- AC-2: `it.each(['keyboard','screen-reader','touch'])('keeps focus, labels, state copy and 44px targets accessible for %s', ...)`.
- AC-3: `it('keeps masking, no-polygon, offline, forbidden and simulated-data boundaries across surfaces', ...)`.
- AC-4: `it('asserts compatibility invariants and allowed-file scope without API/schema/route/domain changes', ...)`.

## Review and verification evidence

- Developer result: verification-only; no source or test files changed; allowed-path diff is empty.
- Ponytail review: `Lean already. Ship.` No abstraction, dependency, screen, or validation removal was introduced.
- `gov-code-review`: `REVIEW-PASS` for Standards, Spec, government-domain correctness, privacy/masking, read-only boundaries, and scope compliance.
- `node scripts/check-scope.mjs verify-lock civicos-ui-design-system`: `PASS`.
- Root full gate: `node scripts/verify.mjs civicos-ui-design-system-phase-04 --scope=full --only=prisma:generate,typecheck,lint,test,test:e2e,build --keep-going --timeout=600000`: `PASS` (run 3; `prisma:generate` skipped because the schema was unchanged).
- Root result: `typecheck`, `lint` (4 pre-existing warnings), `test`, `test:e2e` and `build` passed; `npm test` completed with 556 passed / 272 skipped when the local backend was available at `http://localhost:3001`.
- Mobile gate: `node scripts/verify.mjs civicos-ui-design-system-phase-04 --scope=mobile --timeout=600000`: `PASS` (mobile typecheck, 14 suites / 90 tests, and Android build).
- Evidence: `.brain/evidence/civicos-ui-design-system-phase-04/`.
- Initial missing `CIVICOS_API_BASE_URL` and port contention were infrastructure setup issues; rerun with the local backend resolved them. No product regression or out-of-scope change remains.
- Commit: `03e6900` (`chore: record cross-surface verification`).
