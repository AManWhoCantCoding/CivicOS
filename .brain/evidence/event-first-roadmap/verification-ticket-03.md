# Ticket 03 — native verification

## Environment

- Read `Lesson-learned.md` before execution; it was empty.
- Docker Desktop verified with `docker.exe info`; context was `desktop-linux`.
- PostgreSQL started with the repository `docker-compose.yml` (`civicos-postgres-1`).
- No source/config/test/README/.scratch files were edited and no commit was made.

## Required command results

### `RUN_DB_TESTS=1 npx.cmd vitest run tests/platform`

Exit: failed.

- `tests/platform/geo.integration.test.ts`: 8 passed.
- `tests/platform/evidence.integration.test.ts`: 2 passed, 1 failed.
  - Passed: `uses a stable content hash for immutable originals`.
  - Passed: `rejects incomplete or out-of-range capture coordinates at the contract boundary`.
  - Failed: `persists immutable metadata and is idempotent by original content`.
- `tests/platform/offline-sync.integration.test.ts`: 2 passed, 1 failed.
  - Passed: `requires a stable client command id for idempotency`.
  - Passed: `rejects a command based on a stale resource version`.
  - Failed: `persists client timestamps, retries idempotently, and preserves the prior result`.
- `tests/platform/sla.integration.test.ts`: 3 passed.
- Total: 2 test files failed, 2 passed; 15 passed, 2 failed, 0 skipped (17 total).

Failure logs:

```text
tests/platform/evidence.integration.test.ts > evidence contract > persists immutable metadata and is idempotent by original content
AssertionError: expected { …(15) } to match object { …(6) }
- Expected latitude: 20.9
- Received latitude: "20.9"
- Expected longitude: 105.8
- Received longitude: "105.8"
at tests/platform/evidence.integration.test.ts:75:21

tests/platform/offline-sync.integration.test.ts > offline command contract > persists client timestamps, retries idempotently, and preserves the prior result
Error: CLIENT_COMMAND_ID_CONFLICT
at acceptOfflineCommand src/modules/platform/field-sync/index.ts:101:29
at tests/platform/offline-sync.integration.test.ts:51:25
```

### `RUN_DB_TESTS=1 npm.cmd test`

Exit: failed.

- `tests/platform/evidence.integration.test.ts`: 2 passed, 1 failed.
- `tests/platform/offline-sync.integration.test.ts`: 2 passed, 1 failed.
- `tests/platform/sla.integration.test.ts`: 3 passed.
- `tests/platform/geo.integration.test.ts`: 8 passed.
- `tests/identity/encryption.integration.test.ts`: 5 passed.
- `tests/identity/sensitive-log-leak.test.ts`: 3 passed.
- `tests/identity/audit.integration.test.ts`: 3 passed.
- `tests/inspections/inspection-workflow.integration.test.ts`: 2 passed.
- `tests/incidents/incident-workflow.integration.test.ts`: 2 passed.
- `tests/vehicles/vehicle-watch.integration.test.ts`: 2 passed.
- `tests/eventing/event-kernel.integration.test.ts`: 2 passed.
- `tests/identity/authorization.integration.test.ts`: 7 passed.
- `tests/integration/parallel-wave.integration.test.ts`: 1 passed.
- `tests/integration/schema-and-migration.test.ts`: 2 passed.
- `tests/identity/session-seed-boundary.postgres.test.ts`: 7 passed.
- `tests/eventing/event-durability.postgres.test.ts`: 11 passed.
- `tests/eventing/event-kernel.postgres.test.ts`: 3 passed.
- `tests/eventing/projection-replay.postgres.test.ts`: 1 passed.
- `tests/incidents/incident-approval.postgres.test.ts`: 2 passed.
- `tests/inspections/inspection-schedule.postgres.test.ts`: 1 passed.
- Total: 2 failed, 18 passed; 69 passed, 2 failed, 0 skipped (71 total).
- The two failure logs were identical to the platform run above: latitude/longitude string-vs-number assertion and `CLIENT_COMMAND_ID_CONFLICT` at `acceptOfflineCommand` line 101.

### Static checks/build

- `npm.cmd run typecheck`: passed (exit 0).
- `npm.cmd run lint`: passed (exit 0).
- `npm.cmd run build`: passed (exit 0); Next build compiled, typechecked, generated 26 static pages, and completed route optimization.

### Playwright

- `npx.cmd playwright test tests/e2e/field-shell.spec.ts`: passed; 2 passed (Chromium and mobile), 0 failed.
  - `field shell exposes an offline status surface` passed in both projects.
- `npm.cmd run test:e2e`: passed; 18 passed, 0 failed.
  - Files: `tests/e2e/ps007-inspection.spec.ts` (2), `login-and-access.spec.ts` (6), `ps005-incident.spec.ts` (2), `field-shell.spec.ts` (2), `ps009-vehicle-watch.spec.ts` (2), `parallel-wave.spec.ts` (2).

## Direct coverage and remaining gaps

- Evidence public boundary: `src/modules/platform/index.ts` exports `createEvidence`, `getEvidence`, `LocalEvidenceStorage`, and evidence types. `src/app/api/evidence/route.ts` applies `assertAccess` for upload (`mutate`) and download (`read_sensitive`).
- Evidence immutability/content hash and coordinate validation are directly covered. The DB duplicate/replacement/access scenario is not fully passing: the persistence test fails on returned coordinate types before completing its duplicate, replacement, and retrieval assertions. No direct passing test covers evidence authorization/access.
- SLA transition and notification outbox causality are directly covered by the passing SLA integration test: one overdue transition, no notification before outbox processing, one notification after processing, and notification idempotency/read behavior.
- Offline persistence/retry/result preservation is not passing: the DB test fails with `CLIENT_COMMAND_ID_CONFLICT`. Only stable command-id and stale-version contract checks passed.
- Field-shell direct coverage is limited to the visible offline status surface in Chromium and mobile. No direct E2E coverage was run for additional field-shell, evidence-upload, GPS, online/offline upload, or offline-queue state transitions.
- No unsupported acceptance criteria were inferred as covered.
