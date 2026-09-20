# Ticket 02 independent verification

## Database readiness

- Command: `powershell.exe -NoProfile -Command "Set-Location 'D:\Project\CivicOS'; docker.exe info"`
- Result: Docker Desktop server available; context `desktop-linux`.
- Command: `powershell.exe -NoProfile -Command "Set-Location 'D:\Project\CivicOS'; docker.exe compose ps; docker.exe compose exec -T postgres pg_isready -U civicos -d civicos"`
- Result: `civicos-postgres-1` was already `Up`; PostgreSQL reported `/var/run/postgresql:5432 - accepting connections`.
- No compose start/stop or database reset was performed.

## Vitest identity slice

- Command: `$env:RUN_DB_TESTS='1'; npx.cmd vitest run tests/identity`
- Result: **4 test files passed; 22 tests passed; 0 failed**.
- Exact files:
  - `tests/identity/encryption.integration.test.ts` — 5 passed
  - `tests/identity/audit.integration.test.ts` — 3 passed
  - `tests/identity/authorization.integration.test.ts` — 7 passed
  - `tests/identity/session-seed-boundary.postgres.test.ts` — 7 passed

## Full Vitest suite

- Command: `$env:RUN_DB_TESTS='1'; npm.cmd test`
- Result: **19 test files passed; 58 tests passed; 0 failed**.
- Exact files:
  - `tests/incidents/incident-approval.postgres.test.ts` — 2 passed
  - `tests/identity/session-seed-boundary.postgres.test.ts` — 7 passed
  - `tests/inspections/inspection-schedule.postgres.test.ts` — 1 passed
  - `tests/eventing/event-durability.postgres.test.ts` — 11 passed
  - `tests/identity/authorization.integration.test.ts` — 7 passed
  - `tests/eventing/event-kernel.postgres.test.ts` — 3 passed
  - `tests/eventing/projection-replay.postgres.test.ts` — 1 passed
  - `tests/identity/encryption.integration.test.ts` — 5 passed
  - `tests/identity/audit.integration.test.ts` — 3 passed
  - `tests/platform/geo.integration.test.ts` — 3 passed
  - `tests/inspections/inspection-workflow.integration.test.ts` — 2 passed
  - `tests/platform/offline-sync.integration.test.ts` — 2 passed
  - `tests/integration/schema-and-migration.test.ts` — 2 passed
  - `tests/incidents/incident-workflow.integration.test.ts` — 2 passed
  - `tests/integration/parallel-wave.integration.test.ts` — 1 passed
  - `tests/platform/evidence.integration.test.ts` — 1 passed
  - `tests/eventing/event-kernel.integration.test.ts` — 2 passed
  - `tests/vehicles/vehicle-watch.integration.test.ts` — 2 passed
  - `tests/platform/sla.integration.test.ts` — 1 passed

## Static checks and build

- `npm.cmd run typecheck` — passed.
- `npm.cmd run lint` — passed.
- `npm.cmd run build` — passed; Next.js production build completed and generated 26 static pages.

## Playwright

- Command: `npx.cmd playwright test tests/e2e/login-and-access.spec.ts`
- Result: **8 passed; 0 failed** — desktop/chromium 4, mobile 4.
- Verified file: `tests/e2e/login-and-access.spec.ts` (4 tests, each in desktop and mobile projects).

- Command: `npm.cmd run test:e2e`
- Result: **18 passed; 0 failed** — desktop/chromium 9, mobile 9.
- Exact files:
  - `tests/e2e/field-shell.spec.ts` — desktop 1, mobile 1
  - `tests/e2e/ps007-inspection.spec.ts` — desktop 1, mobile 1
  - `tests/e2e/login-and-access.spec.ts` — desktop 4, mobile 4
  - `tests/e2e/ps009-vehicle-watch.spec.ts` — desktop 1, mobile 1
  - `tests/e2e/ps005-incident.spec.ts` — desktop 1, mobile 1
  - `tests/e2e/parallel-wave.spec.ts` — desktop 1, mobile 1

## Limited source/evidence inspection

- Public identity entry point: `src/modules/identity/index.ts` exports the documented identity surface and does not export Prisma.
- Session API: `src/app/api/auth/session/route.ts` uses the public identity entry point for authentication, session creation, and logout.
- Direct persistence/authorization evidence was present in the verified identity tests, including hashed session persistence/expiry handling, seed persistence, role/unit/assignment authorization, denial after revocation, audit/event history, and public-surface checks.

## Remaining coverage gaps

- These commands do not establish behavior beyond the listed tests.
- No test here advances real wall-clock time and observes expiry solely through elapsed time; the persistence test sets an expiry in the past and then reads it.
- No multipart upload flow or multipart-specific acceptance test was run/covered by these commands.
