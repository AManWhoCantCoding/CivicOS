# Ticket 04 native verification

Environment: native Windows PowerShell from `D:\Project\CivicOS`; PostgreSQL was available. No source/config/test/README/.scratch files were changed.

## Required commands and raw results

1. `\$env:RUN_DB_TESTS='1'; npx.cmd vitest run tests/incidents`

Observed:

- `tests/incidents/incident-ticket04.postgres.test.ts`: 15 passed.
- `tests/incidents/incident-workflow.integration.test.ts`: 2 passed.
- `tests/incidents/incident-approval.postgres.test.ts`: 1 passed, 1 failed.
- Aggregate: 2 test files passed, 1 failed; 18 tests passed, 1 failed.
- Failure: `Incident Approval PostgreSQL seam > requires and records approval for transfer, resolution, and closure`.
- Exact error: `Error: Test timed out in 5000ms.` at `tests/incidents/incident-approval.postgres.test.ts:91:3`.

2. `\$env:RUN_DB_TESTS='1'; npm.cmd test`

Observed:

- `tests/incidents/incident-approval.postgres.test.ts`: 1 failed, 1 passed.
- Exact failure: `requires and records approval for transfer, resolution, and closure` — `Test timed out in 5000ms.`
- The process then emitted:
  `thread '<unnamed>' panicked at query-engine\\query-engine-node-api\\src\\engine.rs:52:1:`
  `assertion \`left == right\` failed: failed to delete napi ref`
  `left: 1`
  `right: 0`
- No final Vitest aggregate was printed after the panic.

3. Quality commands:

- `npm.cmd run typecheck` — passed; `tsc --noEmit` produced no errors.
- `npm.cmd run lint` — passed; `eslint .` produced no errors.
- `npm.cmd run build` — passed; Next.js compiled, TypeScript completed, and 26 static pages generated.

4. Playwright:

- `npx.cmd playwright test tests/e2e/ps005-incident.spec.ts` — 12 passed in 56.1s: 6 `[chromium]` desktop and 6 `[mobile]`.
- `npm.cmd run test:e2e` — 46 passed in 1.2m: 23 `[chromium]` desktop and 23 `[mobile]`.

## Direct-test coverage verification

The direct incident tests do assert:

- Server validation: channel, time, content, location, and role errors (`incident-ticket04.postgres.test.ts` lines 347–365).
- Exactly one report/incident and duplicate idempotency returning the original result without extra records/events (lines 367–440).
- Authorization and organization/assignment scope for reads and writes (lines 442–492; approval scope also in `incident-approval.postgres.test.ts` lines 169–200).
- Approval-required transfer, resolution, and closure, approval rejection/already-decided behavior, and event history (ticket04 lines 494–594; approval seam lines 91–167).
- Audit records for creation, mutations, sensitive reads, and listing (ticket04 lines 645–690).
- SLA kind advancement, the asserted due-date margin, explicit backdating, overdue status/event, and SLA completion (lines 692–761).
- Timeline ordering/filtering and redaction (lines 596–643).

REST error shapes are covered by the Playwright test `REST boundary returns exact status and idempotency shapes` (`tests/e2e/ps005-incident.spec.ts` lines 177–256): exact status/error pairs are asserted for unauthenticated access, invalid channel, empty content, unknown command, and forbidden intake; idempotency status/body identity is asserted. The missing-approval REST case asserts status `404` but does not assert its JSON error code. The PostgreSQL direct tests do not exercise HTTP routes.

## Exact remaining AC/step gaps

- The required DB incident run is not clean because the approval seam test timed out at 5 seconds; the full Vitest run also emitted the Prisma/query-engine N-API panic and did not print a final aggregate.
- No test induces a transactional failure and verifies atomic rollback; the “atomically” test only verifies the resulting records/events after success. Atomic rollback is therefore unverified here.
- No wall-clock SLA passage is tested. The SLA test checks the due-date margin, then manually sets `dueAt` into the past before calling `markOverdue`; it does not verify elapsed real time or scheduler timing.
- REST coverage is E2E rather than direct PostgreSQL coverage, and the missing-approval REST response lacks an asserted JSON error shape.
