# Phase 03 — Mobile primitives và screens

- **Phase ID:** `phase-03-mobile-primitives-screens`
- **Status:** `PHASE-PASS`
- **Mục tiêu:** migrate mobile `States` và các screen Map, Related Info, Alarm, Dispatch, Task, Land theo cùng Light/Blue presentation contract, không đổi read-only/API/offline behavior.
- **F-xx thuộc phase:** feature scope §§14–18 trong `docs/design/civicos-ui-design-system/overview.md`; locked docs không cung cấp mã F-xx riêng nên không phát minh ID mới.
- **Approved traceability:** Feature `docs/design/civicos-ui-design-system/overview.md` §§14–18; API invariants `docs/design/civicos-ui-design-system/api-contract.md` §§7–26; design rules `.scratch/civicos-ui-design-system/ui/design-tokens.md` §§46–111; evidence TS-09, TS-10, TS-11 trong `.scratch/civicos-ui-design-system/ui/test-scenarios.md`.
- **Dependencies:** `phase-01-web-foundation-shell` / `CUI-001`; có thể chạy song song với `phase-02-web-domain-surfaces` sau khi CUI-001 hoàn thành.
- **Tickets:** `CUI-003` — done (`bd73d49`).
- **Definition of Done:** mobile primitives/screens dùng native system sans/monospace, exact semantic copy/tokens, touch target `44 × 44px`, bottom sheet/read-only map presentation và no-polygon/error/offline boundary được giữ nguyên; không tạo API/route/cache/schema behavior.
- **Full-gate policy:** trước dispatch verify full lock; chỉ sửa mobile paths và targeted UI tests trong `CUI-003`; không sửa `mobile/src/api/`, config, route/deep-link semantics, provider/offline policy hoặc tạo Stitch screen mới.

## Phase gate evidence

- Root command: `node scripts/verify.mjs civicos-ui-design-system-phase-03 --scope=full --only=prisma:generate,typecheck,lint,test,test:e2e,build --keep-going --timeout=600000`
- Root result: `PASS`; `prisma:generate` skipped because the schema was unchanged; typecheck, lint, test, test:e2e and build passed.
- Mobile result: `npm run mobile:typecheck` passed; `npm run mobile:test` passed with 14 suites / 90 tests; `npm run mobile:build` completed with `BUILD SUCCESSFUL`.
- Evidence: `.brain/evidence/civicos-ui-design-system-phase-03/`.
