# Ticket 07 test evidence

Date: 2026-09-22

All database-bearing commands used native Windows PowerShell with:

```text
DATABASE_URL=postgresql://civicos:civicos@localhost:5432/civicos_e2e?schema=public
DIRECT_URL=postgresql://civicos:civicos@localhost:5432/civicos_e2e?schema=public
```

## Database preparation

- `docker.exe info` — passed; context `desktop-linux`.
- `docker.exe compose up -d` — passed; `civicos-postgres-1` running.
- `npx.cmd prisma migrate deploy` — passed; `civicos_e2e`, 9 migrations, no pending migrations.
- No database reset/drop was requested or performed.
- Stale Next processes were stopped before testing. No worker was running during Vitest projection/replay tests.

## Python E2E regression cases

- `python.exe -m pytest test_inspections.py -k 'offline_checklist_finding_evidence_completion_and_recurring_schedule' --browser chromium --keep-e2e-db` — **2 passed, 0 failed** (desktop, mobile).
- `python.exe -m pytest test_vehicles.py -k 'vehicle_registry_observation_match_confirm_verify_evidence_and_escalate' --browser chromium --keep-e2e-db` — **2 passed, 0 failed** (desktop, mobile).
- One harness worker was used with `EVENT_WORKER_INTERVAL_MS=200`.

## TypeScript Playwright E2E

- `npx.cmd playwright test tests/e2e/parallel-wave-read-model.spec.ts --project=chromium --project=mobile --reporter=line` — **6 passed, 0 failed** with exactly one worker at `EVENT_WORKER_INTERVAL_MS=200`.
- Initial read-model invocation had a PowerShell `Start-Process` setup error because stdout and stderr were redirected to the same file; the worker did not start and all 6 cases timed out at `tests/e2e/parallel-wave-read-model.spec.ts:36` while polling the read model. Corrected rerun passed; this is recorded as an environment/setup failure, not a product pass.
- Authorization matrix without a worker: **2 failed** desktop/mobile at `tests/e2e/parallel-wave.spec.ts:835`, `expectPermitted()` line 762; API returned 200 but registry plate text was absent from the UI. Root cause: the matrix reads projected registry data while no worker was running.
- Authorization matrix rerun with exactly one worker at interval 200: **2 passed, 0 failed**.
- Full `tests/e2e/parallel-wave.spec.ts` rerun with exactly one worker at interval 200: **26 passed, 0 failed**.

## Focused Ticket 07 Vitest

Command (native PowerShell, `RUN_DB_TESTS=1`, no worker):

```text
npx.cmd vitest run tests/eventing/event-catalog.test.ts tests/integration/parallel-wave.integration.test.ts tests/integration/parallel-wave-replay.integration.test.ts tests/eventing/projection-replay.postgres.test.ts tests/integration/parallel-wave-authorization.integration.test.ts tests/integration/parallel-wave-resilience.integration.test.ts tests/integration/schema-and-migration.test.ts --reporter=verbose
```

Result: **7 test files passed; 54 passed, 0 failed, 5 skipped (59 total)**. The 5 skips are the replay suite's disposable replay-database cases; no verification database was used. The integration log included the expected duplicate-command Prisma unique-constraint branch while its containing test passed:

```text
Invalid `tx.vehicleObservation.create()` invocation
Unique constraint failed on the fields: (`clientCommandId`)
```

## Static/quality checks

- `npm.cmd run typecheck` — exit 0.
- `npm.cmd run lint` — exit 0.
- `npx.cmd prettier --check .` — exit 0; all matched files use Prettier code style.

## 800ms loading fixtures

Both delays are intentional route fixtures with explicit loading assertions:

- `tests/e2e/parallel-wave.spec.ts:315-325`: delayed `/api/incidents`, then asserts `Đang tải hàng đợi Incident` at line 319.
- `tests/e2e/ps005-incident.spec.ts:273-283`: delayed `/api/incidents`, then asserts `Đang tải hàng đợi Incident` at line 277.

## Trục trặc gặp phải

- Initial PowerShell process inspection had nested `$` expansion and emitted `CommandNotFoundException`; corrected.
- A cleanup loop first used PowerShell's read-only `$PID` variable and failed before cleanup; corrected to a different variable.
- An initial Python invocation used unsupported `--no-recreate-e2e-db`; it collected no tests and was rerun without that option. No database reset/drop occurred.
- Initial TypeScript worker startup failed because `Start-Process` received identical stdout/stderr redirect paths; corrected with separate in-repo log paths.
- One native interop invocation emitted `WSL ... UtilAcceptVsock ... accept4 failed 110` before a successful rerun.

Ticket is not marked ready for Reviewer because the requested verification included the diagnosed failed invocation(s), despite corrected reruns passing.
