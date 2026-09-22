# Ticket 07 final review

Date: 2026-09-22

## Verdict

**PASS**, based on the current source/diff and the latest Tester evidence in
`.brain/evidence/ticket-07/tests.md`. No commit was made.

## Implementation steps

| Step | Result | Evidence |
|---|---|---|
| 1 | PASS | Public entry-point imports are used by the changed API adapters; replay/source-table guards and the current diff show no cross-module internal command/projection imports. |
| 2 | PASS | `tests.md` records native `civicos_e2e`, 9 migrations deployed/status-clean, and disposable clean-database replay. |
| 3 | PASS | Native PS005 integration/browser evidence is recorded; final full E2E includes the PS005 path. |
| 4 | PASS | Native PS007 DB/browser evidence is recorded; final inspection suite is 8/8 for three consecutive runs. |
| 5 | PASS | Native PS009 evidence records integration, TypeScript/Python E2E, offline/idempotency, authorization, SLA, and no-network mock checks. |
| 6 | PASS | Disposable replay runs 9/9 twice and compares rebuilt list/detail/timeline/read models; shared DB safety counts remain unchanged. |
| 7 | PASS | Real-session authorization matrix covers commander, assigned, unassigned, revoked, and cross-organization users across all three surfaces; latest matrix is 2/2. |
| 8 | PASS | Three resilience runs report p95 1740/1640/1652 ms, retry/dead-letter, exactly-once, replay, and worker-health checks. |
| 9 | PASS | Native UI preflight is 26/26 desktop/mobile with labels, focus, overflow, states, contrast, dark mode, reduced motion, and visible-copy checks. |
| 10 | PASS | Native lint, typecheck, build, format, full Vitest, full Playwright, migration, README, and scope evidence pass. |

## Acceptance criteria (ticket lines 49–61)

| Line | Result | Evidence of actual behavior |
|---|---|---|
| 49 | PASS | `tests/integration/schema-and-migration.test.ts` declares the ordered 9-migration chain; native disposable deployment applied all 9 and was cleaned up. |
| 50 | PASS | Evidence records PS005 → PS007 → PS009 verification order; each slice's lint/typecheck/format gates passed, and the final full gates passed. |
| 51 | PASS | Commands append aggregate events/outbox transactionally within their owning module; disposable replay/source-table guard passed with no Incident/Inspection/Vehicle cross-source writes. |
| 52 | PASS | Public typed `EVENT_CATALOG` contains every incident, inspection, vehicle, and SLA event with version, `owningModule`, aggregate, and named consumers; `event-catalog.test.ts` verifies catalog coverage and registered consumers; replay passed 9/9. |
| 53 | PASS | Cross-module references are IDs/projections/suggestions; match verification requires confirmation and authorization tests reject unassigned/cross-organization access. |
| 54 | PASS | Real browser sessions (not mocked routes) exercise commander, assigned, unassigned, revoked, and unrelated-OU users on Incident, Inspection, and Vehicle surfaces; Tester evidence records auth 2/2 and full wave 26/26. |
| 55 | PASS | Integration/API tests assert sensitive read/download/mutation audit rows; audit persistence is transactional/evented for all three modules. |
| 56 | PASS | SLA tests cover continuous two-hour timing across weekend/holiday boundaries; retry/outbox and `sourceEventId` idempotency tests prove no duplicate notification side effects. |
| 57 | PASS | Resilience workload reports p95 below 10 seconds on all three runs and exposes lag/failure/dead-letter health signals. |
| 58 | PASS | `parallel-wave-read-model.spec.ts` drives UI creation/actions and then asserts list/detail read models for IntakeReport/Incident, Establishment/Inspection, and Registry/VehicleObservation: 6/6 passed. |
| 59 | PASS | `parallel-wave.spec.ts` asserts labels/errors/focus, mobile overflow/clipping, loading/empty/error/retry, denied/offline, dark mode, WCAG contrast, reduced motion, and touch targets; 26/26 passed. |
| 60 | PASS | Native `npm.cmd run lint`, build, typecheck, format, focused Vitest (54 passed/0 failed/5 intentional skips), and full relevant E2E gates pass. |
| 61 | PASS | README commands map to existing package scripts and accurately describe app, worker, PostgreSQL, migrations, and tests. |

## Previous Reviewer findings

- **Public typed event catalog/real consumers: FIXED.** `src/modules/eventing/event-catalog.ts` and `tests/eventing/event-catalog.test.ts` provide and verify the catalog.
- **Mocked authorization matrix: FIXED.** Current matrix uses real login/API/UI requests; no `page.route` mock is registered in that test.
- **Six UI read-model smoke tests: FIXED.** `parallel-wave-read-model.spec.ts` has three flows across Chromium/mobile and Tester evidence records 6/6.
- **Shared CSS system: FIXED.** `globals.css` defines and uses `--civicos-*` surface/text/status/radius/icon/control tokens and shared `.civicos-surface`, `.civicos-feedback`, `.civicos-control`, and `.civicos-icon` classes.
- **Visual anti-patterns: FIXED.** Current inspection/evidence found no gradient, glassmorphism, decorative hero, duplicate CTA, or clipped-control workaround.

## Test-environment verification

- Database-bearing commands in the latest Tester record use native Windows PowerShell and `civicos_e2e` (`DATABASE_URL` and `DIRECT_URL`), never `civicos` or `civicos_verify_20260920160325`.
- Exactly one worker is recorded for projection/read-model E2E (`EVENT_WORKER_INTERVAL_MS=200`).
- Vitest projection/replay is explicitly recorded as running with no worker.
- Both 800 ms delays are route fixtures with explicit loading assertions (`parallel-wave.spec.ts:315-325` and `ps005-incident.spec.ts:273-283`), not synchronization hacks.

## Scope and workspace

The working tree contains broad pre-existing/unrelated `.brain`, `.scratch`, agent/config, and other source/test changes. They were inspected and were not treated as Ticket 07 implementation. No actual Ticket 07 out-of-scope module or cross-module source-table write was found. `git diff --check` reports only the pre-existing unrelated `opencode.jsonc` whitespace issue.

## Trục trặc gặp phải

The evidence records earlier PowerShell quoting, worker-start, and test setup failures; each was corrected and the latest required native reruns passed. No source, `.scratch/**`, or `.brain/**` content was changed by the review except this mandatory evidence file.
