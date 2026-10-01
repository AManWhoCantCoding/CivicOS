# Verification evidence — baseline repairs

## Demo/format

- `tests/demo/demo-now-invalid.test.ts`, `tests/platform/clock.test.ts`, `tests/demo/demo-bootstrap.test.ts`: **21 passed** with the correct demo DB environment.
- `npx prettier --check .`: **PASS**.
- `npx tsc --noEmit`: **PASS**.

## Incidents

- 8 affected incident/identity/integration files: **65 passed, 5 skipped** in the focused run; the two remaining resilience failures at that time were vehicle fixtures, not incident failures.
- `npx tsc --noEmit`, scoped ESLint and scoped Prettier: **PASS**.

## Inspection/vehicles/identity

- `tests/integration/parallel-wave.integration.test.ts`: **30 passed**.
- `tests/integration/parallel-wave-resilience.integration.test.ts`: **4 passed**.
- `tests/vehicles/vehicle-authorization.postgres.test.ts`: **10 passed**.
- `tests/identity/session-seed-boundary.postgres.test.ts`: **7 passed**.
- Scoped typecheck, ESLint and Prettier: **PASS**.

Expected PostgreSQL unique-constraint output from idempotency race tests remained handled by assertions; no test failed.

## Eventing/SLA repair

- Synthetic stale-outbox reproduction: **RED** before the fix; the probe was
  not selected when older pending rows existed.
- `tests/platform/sla.integration.test.ts`: **6 passed** with a synthetic
  backlog and again clean, including the same shared `civicos` DB environment.
- `tests/eventing/event-kernel.postgres.test.ts`:
  **2 passed**; `tests/eventing/event-durability.postgres.test.ts`:
  **14 passed**.
- `npx tsc --noEmit`: **PASS**.
- Scoped ESLint and Prettier checks for `src/modules/eventing/outbox.ts` and
  `tests/platform/sla.integration.test.ts`: **PASS**.
