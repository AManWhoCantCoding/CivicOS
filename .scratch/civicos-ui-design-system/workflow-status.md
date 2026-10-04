# Workflow status — `civicos-ui-design-system`

- **B5:** inherited/approved scope for shared UI redesign.
- **B6:** inherited/approved Light/Blue design contract.
- **B7:** Stitch screen set created in canonical project; B8 visual approval recorded.
- **B8:** `APPROVED` — user message `Được tôi chốt`.
- **B9:** `APPROVED` — user message `Duyệt B9 — no data-model impact`; no data-model impact.
- **B10:** `COMPLETE` — phase/ticket decomposition created; ready for Techlead dispatch.
- **B11:** `COMPLETE` — implementation, review, verification, traceability, contract integrity and phase gates 01–04 passed.
- **B12:** `APPROVED` — user message `APPROVED`; review packet tại `.scratch/civicos-ui-design-system/review.md`.
- **B13:** `DEFERRED` — user message `Tạm thời tôi không muốn cải tiến thêm nữa`; không thêm innovation candidate hay mở rộng scope.

## Locked scope

- UI-only redesign across approved web/mobile surfaces.
- No legal-rule analysis is needed for this change because no legal/domain behavior is changed.
- No schema, migration, API, route, permission, Assignment, masking, state-machine, seed or map-projection change.
- Stitch canonical project: `projects/3369879313583874807`.
- Approved composite board: `projects/3369879313583874807/screens/fdb8b9704dd14acaa6000f342f921c14`.

## B9 evidence

- Assessment: `.scratch/civicos-ui-design-system/ui/data-model-assessment.md`.
- Existing schema/migration and data-access survey completed; conclusion is reuse of current structures.
- No production source, Prisma schema or migration changed.

## Full lock evidence

- Command: `node scripts/check-scope.mjs lock civicos-ui-design-system --stage=full --user-approved`
- Result: `PASS`.
- Locked contract docs:
  - `docs/design/civicos-ui-design-system/overview.md`
  - `docs/design/civicos-ui-design-system/api-contract.md`
  - `docs/design/civicos-ui-design-system/data-model.md`

## Contract integrity evidence

- User approved the completed contract artifact set after Research added the five missing canonical docs, SOW and feature-list.
- Full lock: `node scripts/check-scope.mjs lock civicos-ui-design-system --stage=full --user-approved` — `PASS`.
- Lock verification: `node scripts/check-scope.mjs verify-lock civicos-ui-design-system` — `PASS`.
- The final contract set contains the eight canonical design docs plus `LOCK.json`; `.scratch/civicos-ui-design-system/sow.md` and `.scratch/civicos-ui-design-system/feature-list.md` are present.
- No `TBD`, `TODO` or `???` markers were found in the new contract artifacts.

## B10 dependency frontier

- `CUI-001` (`phase-01-web-foundation-shell`) is the initial ticket.
- After `CUI-001`, `CUI-002` and `CUI-003` may proceed independently.
- `CUI-004` is blocked by both `CUI-002` and `CUI-003`.
- No ticket introduces a new Stitch screen; the approved 7-screen catalog and composite board remain the only visual references.

## B11 evidence

- `CUI-001` accepted in commit `e4f18ad` (`feat: apply shared light ui foundation`).
- Ticket-level verification: lock check, typecheck, lint, scoped Prettier check, targeted e2e `38 passed / 1 skipped`, and build all passed.
- The first e2e attempt was `BLOCKED-INFRA` because PostgreSQL was stopped; after `docker compose up -d postgres`, the required targeted suite passed.
- Phase-01 gate: `PHASE-PASS`; full verification evidence at `.brain/evidence/civicos-ui-design-system-phase-01/`.
- `CUI-002` accepted in commit `aff4de3` (`feat: unify web domain surface styling`). Ticket verification: lock check, typecheck, lint, targeted unit tests, targeted e2e `37 passed`, scoped Prettier check and build all passed.
- Phase-02 gate: `PHASE-PASS`; full verification evidence at `.brain/evidence/civicos-ui-design-system-phase-02/`.
- `CUI-003` accepted in commit `bd73d49` (`feat: align mobile presentation with shared baseline`). Ticket verification: lock check, mobile typecheck, targeted mobile tests `59/59`, mobile build, root typecheck/lint and scoped Prettier check all passed.
- Phase-03 gate: `PHASE-PASS`; root full verification plus mobile typecheck/test/build passed; evidence at `.brain/evidence/civicos-ui-design-system-phase-03/`.
- `CUI-004` accepted after verification-only review; no source/test files changed. Root full verification passed with local backend injection; mobile verification passed. Evidence at `.brain/evidence/civicos-ui-design-system-phase-04/`.
- Phase-04 gate: `PHASE-PASS`.
- `CUI-004` verification batch recorded in commit `03e6900` (`chore: record cross-surface verification`).

## Dispatch guard

- Before dispatch, Techlead must run `node scripts/check-scope.mjs verify-lock civicos-ui-design-system`.
- Ticket implementation is limited to the exact UI paths listed in each ticket; API, schema, migration, route, permission, Assignment, masking, state-machine, seed and map-projection behavior remain unchanged.
- If implementation discovers a need outside the locked presentation boundary, stop the ticket and open the corresponding review instead of expanding scope.

## Next gate

All four B11 tickets have reached their implementation/review gates, contract integrity is complete, Techlead commit/evidence bookkeeping is complete, and B12 human review is approved. B13 innovation is deferred by the user; no further implementation is scheduled.

`NEXT-SKILL: gov-to-phases` only after B9 approval.
