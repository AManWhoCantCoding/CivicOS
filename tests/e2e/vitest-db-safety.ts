// Vitest global safety setup for database-backed suites (database-
// consolidation slice). Runs in EVERY Vitest worker before any test file is
// imported, so an unsafe or misconfigured DB-test request fails the whole run
// BEFORE a DB suite can connect anywhere.
//
// Ordinary runs (no `RUN_DB_TESTS=1`) are completely unaffected: the gate is
// inert and DB-backed suites remain skipped via their own skip guards.
//
// When `RUN_DB_TESTS=1` is requested, the strict lifecycle gate requires ALL
// of:
// - the explicit lifecycle marker `CIVICOS_E2E_LIFECYCLE=1` (set only by the
//   approved runner `node scripts/e2e/run-vitest-db.mjs`),
// - the explicit `CIVICOS_E2E_DATABASE_URL` target (exact
//   127.0.0.1:5432/civicos_e2e, validated by scripts/e2e/e2e-target.mjs), and
// - the effective `DATABASE_URL` equal to that exact validated target
//   (runner builds the child env so they agree).
// Any main-db alias (`DEMO_DATABASE_URL`, `CIVICOS_DATABASE_URL`,
// `CIVICOS_TEST_DATABASE_URL`) present in DB-test mode is refused — the
// runner strips them, so their presence means the contract was bypassed.
// Bare `RUN_DB_TESTS=1` (no marker) is rejected outright.
//
// Refusals carry stable credential-free codes only.

import { validateVitestDbLifecycleEnv } from '../../scripts/e2e/run-vitest-db.mjs';

const check = validateVitestDbLifecycleEnv(process.env);
if (!check.ok) {
  throw new Error(
    `E2E_DB_LIFECYCLE_SAFETY_REFUSED: ${check.code}. DB-backed tests must run via ` +
      'node scripts/e2e/run-vitest-db.mjs (marker + explicit civicos_e2e target required).',
  );
}
