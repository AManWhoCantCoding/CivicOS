# Ticket 03 native verification

Date: 2026-09-21. Native Windows PowerShell only. Docker Desktop context: desktop-linux; docker info succeeded. docker compose up -d: civicos-postgres-1 Running.

## Migration status
Command: npx.cmd prisma migrate status
Result: PASS. 5 migrations found. Database schema is up to date!

## Focused platform tests
Command: `$env:RUN_DB_TESTS='1'; npx.cmd vitest run tests/platform
Result: PASS. 5 files passed; 24 tests passed; 0 skipped. Duration 2.75s.
Note: an initial WSL quoting wrapper expanded $env incorrectly and produced a PowerShell CommandNotFound error before running tests; the exact native PowerShell command above was then rerun successfully. A later evidence-file quoting attempt also invoked each test command once without RUN_DB_TESTS, yielding 19 passed/5 skipped for platform and 38 passed/40 skipped for the full suite; these were not used as verification results.

## Full unit/integration tests
Command: `$env:RUN_DB_TESTS='1'; npm.cmd test
Result: PASS. 21 files passed; 78 tests passed. Duration 13.06s.

## Static checks and build
Command: npm.cmd run typecheck
Result: PASS; tsc --noEmit produced no diagnostics.
Command: npm.cmd run lint
Result: PASS; eslint . produced no diagnostics.
Command: npm.cmd run build
Result: PASS. Next.js compiled successfully; TypeScript completed; 26 static pages generated.

## Targeted E2E
Command: npx.cmd playwright test tests/e2e/evidence-authorization.spec.ts tests/e2e/field-shell.spec.ts
Result: PASS. 18 passed, 0 failed across chromium and mobile; 14.3s.
Coverage directly observed: unauthenticated evidence upload/download rejection; authorized upload/download/dedupe and metadata; unassigned cross-resource denial; field-shell offline surface, pending/failed/synced persistence, retry failure/success, online transitions, and reduced-motion usability.

## Full E2E
Command: npm.cmd run test:e2e
Result: PASS. 34 passed, 0 failed across chromium and mobile; 24.1s.
Direct public-boundary coverage observed: invalid login and denied state, development login/session/logout, unassigned direct URL/API tampering denial, plus public module entry surfaces.

## Isolated migration verification
A temporary database civicos_ticket03_isolated_20260921 was created in the existing Docker Desktop PostgreSQL container; existing civicos was not reset or dropped.
Commands/results:
- npx.cmd prisma migrate deploy: PASS; applied 0001_event_first, 20260919042323_incident_approval, 20260919050000_approval_organization_scope, 20260919052000_inspection_cadence, and 20260921090000_shared_field_capabilities.
- npx.cmd prisma migrate status: PASS; Database schema is up to date!
- npx.cmd prisma migrate deploy (second run): PASS; No pending migrations to apply.
- DROP DATABASE IF EXISTS civicos_ticket03_isolated_20260921: PASS; cleanup completed.

## Direct coverage mapping
- Evidence HTTP authorization: targeted E2E evidence-authorization.spec.ts, 8 executions across two browser projects, all passed; platform evidence integration also passed 3 tests.
- SLA/notification: platform sla.integration.test.ts, 6 tests passed, including continuous SLA clock and notification only after outbox processing.
- Offline retry/append-only: platform offline-sync.integration.test.ts, 4 tests passed; targeted field-shell retry failure/success and persisted state also passed.
- Field-shell state/preflight: targeted field-shell.spec.ts, 16 executions across two browser projects, all passed; shared-capabilities platform test, 3 tests passed.
- Public boundary: full E2E login-and-access coverage included unassigned direct URL/API tampering denial; all relevant executions passed.

## Remaining blockers / limitations
No test failures or migration blockers observed in this run. Known geolocation-permission branch limitation remains: the executed coverage validates GPS/domain coordinates and evidence GPS metadata, but does not exercise a real browser geolocation permission-denied branch.

