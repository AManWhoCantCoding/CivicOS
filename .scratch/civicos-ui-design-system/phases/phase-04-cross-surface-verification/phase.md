# Phase 04 — Cross-surface accessibility và regression verification

- **Phase ID:** `phase-04-cross-surface-verification`
- **Status:** `PHASE-PASS`
- **Mục tiêu:** xác minh toàn bộ web/mobile presentation migration theo approved token, test scenarios và non-goal boundary sau khi hai implementation lanes hoàn tất.
- **F-xx thuộc phase:** toàn bộ feature scope §§11–29 trong `docs/design/civicos-ui-design-system/overview.md`; locked docs không cung cấp mã F-xx riêng nên không phát minh ID mới.
- **Approved traceability:** `docs/design/civicos-ui-design-system/overview.md` §§19–29; `docs/design/civicos-ui-design-system/api-contract.md` §§7–26; `docs/design/civicos-ui-design-system/data-model.md` §§7–30; TS-01–TS-11 trong `.scratch/civicos-ui-design-system/ui/test-scenarios.md`.
- **Dependencies:** `phase-02-web-domain-surfaces` / `CUI-002` và `phase-03-mobile-primitives-screens` / `CUI-003`.
- **Tickets:** `CUI-004` — done.
- **Definition of Done:** targeted web/mobile tests và full verification pass; keyboard/focus/live-region/text/icon/touch target, masking/privacy, state copy, map no-polygon, simulated labeling và visual token matrix được kiểm tra; diff không chạm API/schema/route/permission/Assignment/masking/state-machine/seed/map-projection behavior hoặc Stitch resources.
- **Full-gate policy:** đây là full verification lane; chạy lock verification, root/mobile checks và visual/manual matrix ở viewport web `1440 × 900`, mobile `390 × 844`; phát hiện behavior/data contract drift là blocker, không tự mở rộng ticket.

## Phase gate evidence

- `CUI-004` verification-only review produced an empty allowed-path diff.
- Root full verification: `node scripts/verify.mjs civicos-ui-design-system-phase-04 --scope=full --only=prisma:generate,typecheck,lint,test,test:e2e,build --keep-going --timeout=600000` — `PASS` (run 3).
- Mobile verification: `node scripts/verify.mjs civicos-ui-design-system-phase-04 --scope=mobile --timeout=600000` — `PASS` (run 4).
- `verify-lock` — `PASS`; no API, schema, route, permission, Assignment, masking, state-machine, seed, map-projection, or Stitch resource changes.
- Evidence: `.brain/evidence/civicos-ui-design-system-phase-04/`.
