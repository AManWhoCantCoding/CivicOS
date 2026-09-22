# Ticket 07 test evidence

Date: 2026-09-21

## Native database prerequisite

Command:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Stop"; Set-Location "D:\Project\CivicOS"; docker info; if ($LASTEXITCODE -ne 0) { Start-Process "Docker Desktop"; $ready=$false; for ($i=0; $i -lt 12; $i++) { Start-Sleep -Seconds 5; docker info; if ($LASTEXITCODE -eq 0) { $ready=$true; break } }; if (-not $ready) { throw "Docker Desktop không khởi động được, cần người dùng tự mở tay" } }; docker compose up -d'
```

Result: Docker Desktop was already available on context `desktop-linux`; PostgreSQL container `civicos-postgres-1` was running.

## PS-E1-005 mobile browser node, 5 consecutive runs

Command:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Continue"; Set-Location "D:\Project\CivicOS\playwright"; $node="test_incidents.py::test_incident_full_lifecycle_approves_and_rejects_commands[mobile-chromium]"; $results=@(); for ($i=1; $i -le 5; $i++) { & ".\.venv\Scripts\python.exe" -m pytest $node --browser chromium --project mobile; $code=$LASTEXITCODE; $results += $code }; if (($results | Where-Object { $_ -ne 0 }).Count -gt 0) { exit 1 }'
```

Raw result: 5 runs, 5 passed, 0 failed, 0 skipped. Exit codes: `0,0,0,0,0`. Durations: `36.11s`, `35.25s`, `35.58s`, `35.38s`, `33.77s`.

## Complete browser incident suite

Command:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Stop"; Set-Location "D:\Project\CivicOS\playwright"; & ".\.venv\Scripts\python.exe" -m pytest test_incidents.py --browser chromium'
```

Raw result: 4 collected; 3 passed, 1 failed, 0 skipped. Failed node: `test_incidents.py::test_incident_full_lifecycle_approves_and_rejects_commands[mobile-chromium]`.

Failure log:

```text
pages.py:174: in incident_status
AssertionError: Locator expected to be visible
Actual value: None
Error: element(s) not found
Call log:
- Expect "to_be_visible" get_by_text("closed", exact=True).last with timeout 5000ms
Aria snapshot:
- text: resolved
- listitem: IncidentClosed
```

Observed diagnosis: UI synchronization symptom. The timeline showed `IncidentClosed` v11 while the rendered status remained `resolved` when the assertion ran.

## Native DB integration commands

Parallel-wave command:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Continue"; Set-Location "D:\Project\CivicOS"; $env:RUN_DB_TESTS="1"; npx.cmd vitest run tests/integration/parallel-wave.integration.test.ts'
```

Raw result: 1 test file passed; 14 passed, 0 failed, 0 skipped. Exit code 0.

Relevant incidents scope command:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Continue"; Set-Location "D:\Project\CivicOS"; $env:RUN_DB_TESTS="1"; npx.cmd vitest run tests/incidents'
```

Raw result: 3 test files passed; 21 passed, 0 failed, 0 skipped. Exit code 0.

## Remaining gap

The exact mobile node passed 5 consecutive isolated runs, but the complete `test_incidents.py --browser chromium` run still had 1 mobile failure after the other viewport test sequence.

## Trục trặc gặp phải

The first Docker preflight invocation was rejected by PowerShell parsing because the WSL shell expanded PowerShell variables. It was rerun with corrected quoting and succeeded; Docker Desktop was already running, so no startup polling was needed.

## Ticket 07 step 3 re-verification (PS-E1-005)

Native Docker gate command:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Stop"; Set-Location "D:\Project\CivicOS"; docker info; if ($LASTEXITCODE -ne 0) { Start-Process "Docker Desktop"; $ready=$false; for ($i=0; $i -lt 12; $i++) { Start-Sleep -Seconds 5; docker info; if ($LASTEXITCODE -eq 0) { $ready=$true; break } }; if (-not $ready) { throw "Docker Desktop không khởi động được, cần người dùng tự mở tay" } }; docker compose up -d'
```

Raw result: Docker Desktop available, context `desktop-linux`; `civicos-postgres-1` running.

Parallel-wave integration:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Continue"; Set-Location "D:\Project\CivicOS"; $env:RUN_DB_TESTS="1"; npx.cmd vitest run tests/integration/parallel-wave.integration.test.ts'
```

Raw result: 1 test file passed; 14 passed, 0 failed, 0 skipped. Exit code 0.

Relevant incident/eventing/projection/approval/SLA DB tests:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Continue"; Set-Location "D:\Project\CivicOS"; $env:RUN_DB_TESTS="1"; npx.cmd vitest run tests/incidents tests/eventing tests/platform/sla.integration.test.ts'
```

Raw result: 8 test files passed; 45 passed, 0 failed, 0 skipped. Exit code 0.

Expected rollback-probe log from `incident-ticket04.postgres.test.ts`:

```text
prisma:error
Invalid `tx.incident.create()` invocation in
D:\Project\CivicOS\src\modules\incidents\commands.ts:420:40
Error occurred during query execution:
ConnectorError(ConnectorError { user_facing_error: None, kind: QueryError(PostgresError { code: "P0001", message: "T04_INJECTED_FAILURE", severity: "ERROR", detail: None, column: None, hint: None }), transient: false })
```

The rollback-probe test passed; this was expected test output, not a failed test.

Complete native incident browser suite, run twice:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Continue"; Set-Location "D:\Project\CivicOS\playwright"; $results=@(); for ($i=1; $i -le 2; $i++) { Write-Output ("--- complete incident suite run " + $i + " ---"); & ".\.venv\Scripts\python.exe" -m pytest test_incidents.py --browser chromium; $results += $LASTEXITCODE }; if (($results | Where-Object { $_ -ne 0 }).Count -gt 0) { exit 1 }'
```

Raw result: run 1 — 4 passed, 0 failed, 0 skipped; run 2 — 4 passed, 0 failed, 0 skipped. Both desktop and mobile projects executed. The prior `resolved` vs `IncidentClosed` mismatch did not recur.

Exact mobile lifecycle node:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Continue"; Set-Location "D:\Project\CivicOS\playwright"; & ".\.venv\Scripts\python.exe" -m pytest "test_incidents.py::test_incident_full_lifecycle_approves_and_rejects_commands[mobile-chromium]" --browser chromium --project mobile'
```

Raw result: 1 passed, 0 failed, 0 skipped. Exit code 0.

Step-3 quality checks:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Continue"; Set-Location "D:\Project\CivicOS"; npx.cmd tsc --noEmit'
```

Raw result: typecheck exit code 0; lint exit code 0; targeted Prettier reported `All matched files use Prettier code style!`, exit code 0.

Step 3 is verified.

## Trục trặc gặp phải

None during this re-verification run. Docker Desktop was already running and no retries were required.

## Ticket 07 step 4 re-verification (PS-E1-007)

Date: 2026-09-22

### Native Docker prerequisite

Command:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Stop"; Set-Location "D:\Project\CivicOS"; docker info; if ($LASTEXITCODE -ne 0) { Start-Process "Docker Desktop"; $ready=$false; for ($i=0; $i -lt 12; $i++) { Start-Sleep -Seconds 5; docker info; if ($LASTEXITCODE -eq 0) { $ready=$true; break } }; if (-not $ready) { throw "Docker Desktop không khởi động được, cần người dùng tự mở tay" } }; docker compose up -d'
```

Raw result: Docker Desktop available on context `desktop-linux`; `civicos-postgres-1` was running. `docker compose up -d` completed with the container still running. No reset/drop/recreate was run.

### Focused native database Vitest scope

Command:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Continue"; Set-Location "D:\Project\CivicOS"; $env:RUN_DB_TESTS="1"; npx.cmd vitest run tests/integration/parallel-wave.integration.test.ts tests/inspections tests/eventing tests/platform tests/identity'
```

Raw result: 20 test files passed; 112 tests passed, 0 failed, 0 skipped; exit code 0.

Relevant passing tests included:

- `tests/integration/parallel-wave.integration.test.ts`: 21 passed, including both PS-E1-005 tests and all six PS-E1-007 tests:
  - `runs the Establishment to Inspection lifecycle with versioned events and projections`
  - `creates Evidence and gates sensitive download with audit`
  - `runs Finding to Recommendation approval and rejection with stale version behavior`
  - `gates Inspection access for assigned, unassigned, revoked and cross-organization users`
  - `replays and rebuilds identical inspection and establishment read models`
- `tests/inspections/inspection-slices-4-6.postgres.test.ts`: 9 passed, including configured checklist/Evidence completion, checklist-linked finding ordering, assignment restrictions, and recommendation history.
- `tests/inspections/inspection-schedule.postgres.test.ts`: 1 passed.
- Eventing, platform, and identity scopes all passed with zero skips.

The Vitest output contained an expected Prisma unique-constraint error from the duplicate-schedule rejection test; that test passed and the overall run had zero failed tests.

### Native Playwright inspection suite

Command (run twice in the first invocation):

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Continue"; Set-Location "D:\Project\CivicOS\playwright"; $results=@(); for ($i=1; $i -le 2; $i++) { Write-Output ("--- test_inspections run " + $i + " ---"); & ".\.venv\Scripts\python.exe" -m pytest test_inspections.py --browser chromium; $results += $LASTEXITCODE }; Write-Output ("Exit codes: " + ($results -join ", ")); if (($results | Where-Object { $_ -ne 0 }).Count -gt 0) { exit 1 }'
```

Run 1 raw result: 8 collected; 7 passed, 1 failed, 0 skipped. Desktop: 3 passed, 1 failed. Mobile: 4 passed, 0 failed. Failure:

```text
test_inspections.py::test_inspection_recommendation_can_be_approved_and_rejected[desktop-chromium]
AssertionError: expected exactly one POST /api/auth/session, saw 0
```

The first invocation exceeded the 240000 ms command timeout during run 2 after partial output `test_inspections.py ..F..`; no complete run-2 count was produced.

A separate complete retry used the same configured venv and command:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Continue"; Set-Location "D:\Project\CivicOS\playwright"; & ".\.venv\Scripts\python.exe" -m pytest test_inspections.py --browser chromium; exit $LASTEXITCODE'
```

Retry raw result: 8 collected; 0 passed, 0 failed, 8 errors, 0 skipped. Desktop: 0 passed, 0 failed, 4 setup errors. Mobile: 0 passed, 0 failed, 4 setup errors. All errors were `RuntimeError: Next app exited before readiness`; the captured `next.log` excerpt ended after `/api/auth/session` and `/login` requests.

### Quality checks

Commands:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Continue"; Set-Location "D:\Project\CivicOS"; npx.cmd tsc --noEmit; npx.cmd eslint .'
powershell.exe -NoProfile -Command '$ErrorActionPreference="Continue"; Set-Location "D:\Project\CivicOS"; npx.cmd prettier --check "src/app/api/establishments/[establishmentId]/route.ts" "src/app/api/establishments/route.ts" "src/app/api/inspections/[inspectionId]/route.ts" "src/app/api/inspections/route.ts" "src/modules/eventing/index.ts" "src/modules/eventing/projection.ts" "src/modules/inspections/index.ts" "src/modules/inspections/projection.ts" "src/modules/platform/index.ts" "tests/integration/parallel-wave.integration.test.ts" "tests/inspections/inspection-slice-7-8.test.ts" "tests/inspections/inspection-slices-4-6.postgres.test.ts" "tests/inspections/inspection-schedule.postgres.test.ts"'
```

Raw result: typecheck exit 0; lint exit 0; targeted Prettier: `All matched files use Prettier code style!`, exit 0.

### Trục trặc gặp phải

- The first two-run Playwright command exceeded the 240-second tool timeout while run 2 was still executing; it was retried once with a 420-second timeout.
- The retry completed but all 8 Playwright cases errored during app readiness (`Next app exited before readiness`).

## Ticket 07 step 4 independent verification after fixture/session/readiness fix

Date: 2026-09-22

### Native Docker prerequisite

Command:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Stop"; Set-Location "D:\Project\CivicOS"; docker info; if ($LASTEXITCODE -ne 0) { Start-Process "Docker Desktop"; $ready=$false; for ($i=0; $i -lt 12; $i++) { Start-Sleep -Seconds 5; docker info; if ($LASTEXITCODE -eq 0) { $ready=$true; break } }; if (-not $ready) { throw "Docker Desktop không khởi động được, cần người dùng tự mở tay" } }; docker compose up -d'
```

Result: Docker Desktop was already available on context `desktop-linux`; `civicos-postgres-1` was running. `docker compose up -d` completed with the container running.

### Complete native Playwright inspection suite, 3 consecutive runs

Command:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Continue"; Set-Location "D:\Project\CivicOS\playwright"; $results=@(); for ($i=1; $i -le 3; $i++) { Write-Output ("--- test_inspections run " + $i + " ---"); & ".\.venv\Scripts\python.exe" -m pytest test_inspections.py --browser chromium; $results += $LASTEXITCODE }; Write-Output ("Exit codes: " + ($results -join ", ")); if (($results | Where-Object { $_ -ne 0 }).Count -gt 0) { exit 1 }'
```

Raw result:

- Run 1: 8 passed, 0 failed, 0 skipped. Desktop 4/4 passed; mobile 4/4 passed. Exit code 0.
- Run 2: 7 passed, 1 failed, 0 skipped. Desktop 3/4 passed, 1 failed; mobile 4/4 passed. Exit code 1.
- Run 3: 8 passed, 0 failed, 0 skipped. Desktop 4/4 passed; mobile 4/4 passed. Exit code 0.
- Combined exit codes: `0, 1, 0`.

Exact failure (run 2):

```text
test_inspections.py::test_inspection_offline_checklist_finding_evidence_completion_and_recurring_schedule[desktop-chromium]
AssertionError: timed out after 15000ms waiting for offline queue to account for all commands as synced or rejected with no pending items; expected True, saw False
```

The failure occurred at `pages.py:467` in `CivicApp.sync_offline_queue`, polling `_poll_value` at `pages.py:672`. No `expected exactly one POST /api/auth/session, saw 0` failure occurred in these three runs. The requested 8/8 result on every run was not met; the offline queue readiness/timing assertion failed once.

### Native DB scope with RUN_DB_TESTS=1

Command:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Continue"; Set-Location "D:\Project\CivicOS"; $env:RUN_DB_TESTS="1"; npx.cmd vitest run tests/integration/parallel-wave.integration.test.ts tests/inspections tests/eventing tests/platform tests/identity; exit $LASTEXITCODE'
```

Raw result: 20 test files passed; 112 tests passed, 0 failed, 0 skipped; exit code 0. The expected duplicate-schedule Prisma unique-constraint error was printed by its passing rejection test.

### Step-4 quality checks

Commands:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Continue"; Set-Location "D:\Project\CivicOS\playwright"; & ".\.venv\Scripts\python.exe" -m compileall -q conftest.py pages.py test_inspections.py'
powershell.exe -NoProfile -Command '$ErrorActionPreference="Continue"; Set-Location "D:\Project\CivicOS"; npx.cmd tsc --noEmit; npx.cmd eslint .; $files=@(git diff --name-only --diff-filter=ACMRTUXB | Where-Object { $_ -match "\.(ts|tsx)$" }); npx.cmd prettier --check $files'
```

Raw result: Python `compileall` exit 0; typecheck exit 0; lint exit 0; targeted Prettier reported `All matched files use Prettier code style!`, exit 0. No Python formatter is configured in `playwright/pyproject.toml`; Python syntax was checked with `compileall`.

### Trục trặc gặp phải

One of the three required browser runs had a reproducible-in-this-sample offline queue polling timeout on desktop. The other two runs completed 8/8. Docker Desktop required no startup or retry. Step 4 is not marked verified because the required three consecutive browser runs were not all 8/8.

## Ticket 07 step 4 final independent verification after offline queue hardening

Date: 2026-09-22

### Native Docker prerequisite

Command:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Stop"; Set-Location "D:\Project\CivicOS"; docker info; if ($LASTEXITCODE -ne 0) { Start-Process "Docker Desktop"; $ready=$false; for ($i=0; $i -lt 12; $i++) { Start-Sleep -Seconds 5; docker info; if ($LASTEXITCODE -eq 0) { $ready=$true; break } }; if (-not $ready) { throw "Docker Desktop không khởi động được, cần người dùng tự mở tay" } }; docker compose up -d'
```

Raw result: Docker Desktop was available on context `desktop-linux`; `civicos-postgres-1` was running. `docker compose up -d` completed with the container running. No reset/drop/recreate was run.

### Complete native Playwright inspection suite, 3 consecutive runs

Command:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Continue"; Set-Location "D:\Project\CivicOS\playwright"; $results=@(); for ($i=1; $i -le 3; $i++) { Write-Output ("--- test_inspections run " + $i + " ---"); & ".\.venv\Scripts\python.exe" -m pytest test_inspections.py --browser chromium; $results += $LASTEXITCODE }; Write-Output ("Exit codes: " + ($results -join ", ")); if (($results | Where-Object { $_ -ne 0 }).Count -gt 0) { exit 1 }'
```

Raw result: run 1 — 8 passed, 0 failed, 0 skipped; run 2 — 8 passed, 0 failed, 0 skipped; run 3 — 8 passed, 0 failed, 0 skipped. Desktop and mobile each passed all 4 cases on every run. Exit codes: `0, 0, 0`. The offline checklist/evidence/recommendation/stale flows passed; no app-readiness error, auth POST=0 failure, or offline queue timeout was reported.

### Native DB integration scope with RUN_DB_TESTS=1

Command:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Continue"; Set-Location "D:\Project\CivicOS"; $env:RUN_DB_TESTS="1"; npx.cmd vitest run tests/integration/parallel-wave.integration.test.ts tests/inspections tests/eventing tests/platform tests/identity; exit $LASTEXITCODE'
```

Raw result: 20 test files passed; 113 tests passed, 0 failed, 0 skipped; exit code 0. The new offline lease regression was included in `tests/platform/offline-sync.integration.test.ts` (5 tests passed). The expected duplicate-schedule Prisma unique-constraint error was printed by its passing rejection test.

### Step-4 quality checks

Command:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Continue"; Set-Location "D:\Project\CivicOS\playwright"; & ".\.venv\Scripts\python.exe" -m compileall -q conftest.py pages.py test_inspections.py; $pythonCode=$LASTEXITCODE; Set-Location "D:\Project\CivicOS"; npx.cmd tsc --noEmit; $typeCode=$LASTEXITCODE; npx.cmd eslint .; $lintCode=$LASTEXITCODE; $files=@(git diff --name-only --diff-filter=ACMRTUXB | Where-Object { $_ -match "\.(ts|tsx)$" }); npx.cmd prettier --check $files; $prettierCode=$LASTEXITCODE; if ($pythonCode -ne 0 -or $typeCode -ne 0 -or $lintCode -ne 0 -or $prettierCode -ne 0) { exit 1 }'
```

Raw result: Python syntax check (`compileall`) exit 0; typecheck exit 0; lint exit 0; targeted TypeScript Prettier reported `All matched files use Prettier code style!`, exit 0.

### Trục trặc gặp phải

None. Docker Desktop was already running; no retries were required. No test failures, readiness errors, auth POST=0 errors, or offline queue timeouts occurred.

Step 4 is verified.

## Ticket 07 step 9 verification

Date: 2026-09-22

### Native Docker prerequisite

Commands:

```powershell
powershell.exe -NoProfile -Command "docker info"
powershell.exe -NoProfile -Command "docker compose up -d"
```

Raw result: Docker Desktop was already running on context `desktop-linux`; `civicos-postgres-1` started/running. No reset, drop, or recreate was run.

### Required native Playwright UI preflight

```powershell
powershell.exe -NoProfile -Command "Set-Location 'D:\Project\CivicOS'; npx.cmd playwright test tests/e2e/parallel-wave.spec.ts --reporter=list --project=chromium --project=mobile; exit $LASTEXITCODE"
```

Raw result: 24 tests run; 24 passed, 0 failed, 0 skipped. Desktop (`chromium`): 12/12 passed. Mobile (`mobile`): 12/12 passed. Duration: 1.3m.

Coverage observed in the suite: desktop/mobile; Incident/IntakeReport, Establishment/Inspection, and registry/VehicleObservation routes; keyboard focus/Tab and focus-visible checks; accessible labels; custom validation/error feedback; loading/empty/error/retry, denied/401/403, and offline states; dark tokens and key WCAG contrast; reduced motion; touch-target checks; horizontal overflow/clipped-action checks; visible Vietnamese copy and metadata/navigation.

### Typecheck, targeted lint, and changed-file formatting

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Continue"; Set-Location "D:\Project\CivicOS"; npx.cmd tsc --noEmit; $typeCode=$LASTEXITCODE; $files=@(git diff --name-only --diff-filter=ACMRTUXB; git ls-files --others --exclude-standard) | Where-Object { $_ -match "\.(ts|tsx)$" }; Write-Output ("Targeted changed TypeScript files: " + $files.Count); npx.cmd eslint -- $files; $lintCode=$LASTEXITCODE; npx.cmd prettier --check -- $files; $prettierCode=$LASTEXITCODE; Write-Output ("Exit codes: tsc=" + $typeCode + ", eslint=" + $lintCode + ", prettier=" + $prettierCode); if ($typeCode -ne 0 -or $lintCode -ne 0 -or $prettierCode -ne 0) { exit 1 }'
```

Raw result: 36 changed TypeScript/TSX files selected; `tsc --noEmit` exit 0; targeted ESLint exit 0; targeted Prettier: `All matched files use Prettier code style!`, exit 0.

### Diff inspection

- No `waitForTimeout` or arbitrary sleep was found in `tests/e2e/parallel-wave.spec.ts`; the only delay is an 800 ms route delay used deliberately to expose the loading state.
- No new gradient, glassmorphism, page-specific CSS hack, or clipped-control workaround was observed in the inspected source diff.
- `git diff --check` reported one pre-existing/unrelated trailing-whitespace issue in `opencode.jsonc:138`.
- The working tree contains unrelated pre-existing changes outside this verification, including agent/config/evidence files; no source/tests/config/.scratch files were modified by this verification.

### Remaining coverage gaps

- The suite asserts denied UI/API behavior for the Incident surface only; it does not independently assert denied behavior on Establishment/Inspection and registry/VehicleObservation routes.
- Loading/empty/error/retry is explicitly exercised for the Incident list; the other two surface-list checks accept loading, empty, or populated content and do not independently force error responses.
- The plate-input contrast assertion checks that a ratio is present but does not assert `>= 4.5` like the heading and button checks.
- The E2E file uses an API helper to create the test Incident; it does not perform a complete user-entered create/read-model flow for all three modules.

### Trục trặc gặp phải

The first combined quality-check invocation was rejected by PowerShell parsing because the WSL shell expanded PowerShell variables; it was rerun with single-quoted PowerShell command text and succeeded. Docker Desktop required no startup polling or retry.

## Ticket 07 step 5 verification (PS-E1-009 vehicle integration)

Date: 2026-09-22

### Native Docker prerequisite

Commands:

```powershell
powershell.exe -NoProfile -Command "docker info"
```

Raw result: Docker Desktop was already running on context `desktop-linux`; `civicos-postgres-1` was running. No reset, drop, or recreate was run.

### Required parallel-wave integration suite

```powershell
powershell.exe -NoProfile -Command "Set-Location 'D:\Project\CivicOS'; $env:RUN_DB_TESTS='1'; npx.cmd vitest run tests/integration/parallel-wave.integration.test.ts"
```

Raw result: 1 test file passed; 30 passed, 0 failed, 0 skipped. PS-E1-005, PS-E1-007, and all six PS-E1-009 cases passed. Duration: 18.80s.

Expected duplicate-command Prisma unique-constraint output was printed by the passing PS-E1-009 idempotency test:

```text
Unique constraint failed on the fields: (`clientCommandId`)
```

### Focused vehicle and supporting DB tests

```powershell
powershell.exe -NoProfile -Command "Set-Location 'D:\Project\CivicOS'; $env:RUN_DB_TESTS='1'; npx.cmd vitest run tests/vehicles/vehicle-watch.integration.test.ts tests/vehicles/vehicle-watch-slices-4-7.postgres.test.ts tests/vehicles/vehicle-watch-slices-8-9.test.ts tests/vehicles/vehicle-watch-contract.test.ts tests/eventing/projection-replay.postgres.test.ts tests/eventing/event-durability.postgres.test.ts tests/platform/evidence.integration.test.ts tests/platform/sla.integration.test.ts tests/platform/offline-sync.integration.test.ts tests/platform/shared-capabilities.test.ts tests/identity/authorization.integration.test.ts tests/identity/audit.integration.test.ts tests/identity/session-seed-boundary.postgres.test.ts"
```

Raw result: 13 test files passed; 70 passed, 0 failed, 0 skipped. No schema-and-migration timeout occurred in this scope.

Expected rejection-probe Prisma output was printed by passing tests, including duplicate registry plate, stale match update, and duplicate offline command constraints; no test failed.

### Native TypeScript vehicle E2E (desktop and mobile)

```powershell
powershell.exe -NoProfile -Command "Set-Location 'D:\Project\CivicOS'; npx.cmd playwright test tests/e2e/ps009-vehicle-watch.spec.ts --project=chromium --project=mobile"
```

Raw result: 8 passed, 0 failed, 0 skipped. Desktop and mobile both passed registry → observation → match confirmation → verification → Evidence → escalation, offline idempotency/stale and authorization scope, and deterministic mock/no-network coverage. Duration: 32.3s.

### Configured Windows Python vehicle E2E

Venv located by searching the repository for `pytest.exe`: `D:\Project\CivicOS\playwright\.venv\Scripts\pytest.exe`.

```powershell
powershell.exe -NoProfile -Command "Set-Location 'D:\Project\CivicOS'; .\playwright\.venv\Scripts\pytest.exe playwright\test_vehicles.py --browser chromium"
```

Raw result: 8 collected; 8 passed, 0 failed, 0 skipped. Python 3.13.14, pytest 8.4.2, Playwright plugin 0.9.0. Coverage included registry → observation → match confirmation → verification → Evidence → escalation, offline duplicate idempotency, stale/SLA retry and outbox processing, authorization denial, and no-network mock behavior. Duration: 74.52s.

### Quality checks

```powershell
powershell.exe -NoProfile -Command "Set-Location 'D:\Project\CivicOS'; npx.cmd tsc --noEmit; npx.cmd eslint .; npx.cmd prettier --check src/modules/vehicles tests/vehicles tests/e2e/ps009-vehicle-watch.spec.ts; & .\playwright\.venv\Scripts\python.exe -c \"import ast; from pathlib import Path; ast.parse(Path('playwright/test_vehicles.py').read_text(encoding='utf-8')); print('Python syntax OK: playwright/test_vehicles.py')\""
```

Raw result: typecheck exit 0; lint exit 0; targeted Prettier exit 0 (`All matched files use Prettier code style!`); Python syntax check exit 0.

### Trục trặc gặp phải

The first attempt to run the required Vitest command had WSL shell expansion of `$env:RUN_DB_TESTS`, so PowerShell reported `:RUN_DB_TESTS=1 : The term ':RUN_DB_TESTS=1' is not recognized...` and the suite ran with 23 skips. The command was immediately rerun with corrected quoting; the required native run completed with 30/30 and 0 skips. Docker Desktop required no startup or retry. No Python environment blocker remained.

Step 5 is verified.

## Ticket 07 step 6 verification (cross-module replay)

Date: 2026-09-22

### Native Docker prerequisite

Commands:

```powershell
powershell.exe -NoProfile -Command "docker context show; docker info --format '{{.ServerVersion}}'"
powershell.exe -NoProfile -Command "docker compose up -d"
```

Raw result: Docker Desktop was already running on context `desktop-linux`, Docker server version `29.6.2`, and `civicos-postgres-1` was running. No shared database reset or drop was run.

### Disposable database replay, 9 migrations, two runs

The native PowerShell run created disposable database `civicos_ticket07_replay_605a1519`, set `DATABASE_URL` explicitly to that database and `PARALLEL_WAVE_REPLAY_DB=1`, ran `prisma migrate deploy`, ran the replay file twice, and dropped only that database in `finally`.

```powershell
powershell.exe -NoProfile -Command "<create civicos_ticket07_replay_605a1519>; $env:DATABASE_URL='postgresql://civicos:civicos@localhost:5432/civicos_ticket07_replay_605a1519?schema=public'; $env:PARALLEL_WAVE_REPLAY_DB='1'; npx.cmd prisma migrate deploy; npx.cmd vitest run tests/integration/parallel-wave-replay.integration.test.ts; npx.cmd vitest run tests/integration/parallel-wave-replay.integration.test.ts; <drop only civicos_ticket07_replay_605a1519>"
```

Raw migration result: `9 migrations found`; all 9 applied successfully; migration exit `0`.

Raw replay run 1 result: `1 test file passed; 9 passed, 0 failed, 0 skipped`; exit `0`; duration `4.54s`.

Raw replay run 2 result: `1 test file passed; 9 passed, 0 failed, 0 skipped`; exit `0`; duration `4.48s`.

The five replay cases covered unique Incident/Inspection/Vehicle public-entrypoint flows; event-history, Incident, Inspection, and Vehicle projection rebuild equivalence; detail/list/timeline equality; authorization denial; no cross-source writes; and scoped cleanup. The four safety guard cases passed. The disposable database was dropped successfully: `DROP DATABASE`, `DROP_EXIT=0`.

### Shared-environment safety run

Command used native PowerShell with `DATABASE_URL=postgresql://civicos:civicos@localhost:5432/civicos?schema=public` and `PARALLEL_WAVE_REPLAY_DB=0`:

```powershell
powershell.exe -NoProfile -Command "$env:DATABASE_URL='postgresql://civicos:civicos@localhost:5432/civicos?schema=public'; $env:PARALLEL_WAVE_REPLAY_DB='0'; npx.cmd vitest run tests/integration/parallel-wave-replay.integration.test.ts"
```

Raw result: `1 test file passed; 4 passed, 0 failed, 5 skipped`; exit `0`. The 4 guard tests passed and the 5 database replay cases were deliberately skipped. Read-only counts before and after were identical: `Incident=84`, `IntakeReport=84`, `Establishment=110`, `Inspection=126`, `EventRecord=124`, `OutboxMessage=124`, `AuditEvent=5387`. No reset or drop was run against shared `civicos`.

### Existing steps 3–5 integration regression suite with DB enabled

```powershell
powershell.exe -NoProfile -Command "$env:DATABASE_URL='postgresql://civicos:civicos@localhost:5432/civicos?schema=public'; $env:RUN_DB_TESTS='1'; npx.cmd vitest run tests/integration/parallel-wave.integration.test.ts"
```

Raw result: `1 test file passed; 30 passed, 0 failed, 0 skipped`; exit `0`; duration `15.36s`.

Expected rejection-path log printed by a passing idempotency test:

```text
Invalid `tx.vehicleObservation.create()` invocation
Unique constraint failed on the fields: (`clientCommandId`)
```

### Quality checks

```powershell
powershell.exe -NoProfile -Command "npm.cmd run typecheck; npm.cmd run lint; npx.cmd prettier --check tests/integration/parallel-wave-replay.integration.test.ts tests/integration/parallel-wave.integration.test.ts"
```

Raw result: typecheck exit `0`; lint exit `0`; targeted Prettier: `All matched files use Prettier code style!`, exit `0`.

### Trục trặc gặp phải

- The first disposable PowerShell invocation was malformed because the WSL shell expanded PowerShell `$` variables. It was rerun with escaped PowerShell variables and completed successfully.
- The first shared read-only count probe lost SQL identifier quoting and reported `ERROR: relation "incident" does not exist`; it performed no write. The safety test itself passed (`4 passed, 5 skipped`), and a corrected read-only probe plus repeat safety run showed identical before/after counts.
- The DB-enabled integration suite printed the expected Prisma unique-constraint rejection log shown above; the test passed and the suite exit was `0`.

Step 6 is verified.

## Ticket 07 step 7 authorization/audit matrix verification

Date: 2026-09-22

### Native Docker prerequisite

Command:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Stop"; Set-Location "D:\Project\CivicOS"; docker info; if ($LASTEXITCODE -ne 0) { Start-Process "Docker Desktop"; $ready=$false; for ($i=0; $i -lt 12; $i++) { Start-Sleep -Seconds 5; docker info; if ($LASTEXITCODE -eq 0) { $ready=$true; break } }; if (-not $ready) { throw "Docker Desktop không khởi động được, cần người dùng tự mở tay" } }; docker compose up -d'
```

Result: Docker Desktop was already running on context `desktop-linux`; `civicos-postgres-1` was running. No reset, drop, or recreate was run.

### Required authorization/audit matrix

Command:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Continue"; Set-Location "D:\Project\CivicOS"; $env:RUN_DB_TESTS="1"; npx.cmd vitest run tests/integration/parallel-wave-authorization.integration.test.ts; exit $LASTEXITCODE'
```

Raw result: 1 file passed; **4 passed, 0 failed, 0 skipped**; exit `0`.

The four passing cases exercised commander, assigned, unassigned, revoked, and cross-organization behavior for Incident/IntakeReport, Inspection, Vehicle registry/observation, and Evidence, plus audit operation presence, denied-audit absence, and content/sensitive/evidence marker non-leakage.

### DB-enabled steps 3–6 integration/replay and relevant suites

Command:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Continue"; Set-Location "D:\Project\CivicOS"; $env:RUN_DB_TESTS="1"; $env:DATABASE_URL="postgresql://civicos:civicos@localhost:5432/civicos?schema=public"; npx.cmd vitest run tests/integration/parallel-wave.integration.test.ts tests/integration/parallel-wave-replay.integration.test.ts tests/incidents tests/inspections tests/vehicles tests/identity tests/platform/evidence.integration.test.ts tests/platform/offline-sync.integration.test.ts tests/platform/shared-capabilities.test.ts tests/eventing; exit $LASTEXITCODE'
```

Raw result: **25 test files passed, 1 failed; 157 passed, 1 failed, 5 skipped**; exit `1`.

Failure reproduction: run the command above against the current shared `civicos` database. Expected `tests/integration/parallel-wave.integration.test.ts` vehicle projection/replay case to preserve registry list length across rebuild. Actual assertion at `tests/integration/parallel-wave.integration.test.ts:2834`: `expected 19 to be 12` (`registryAfter.length` versus `registryBefore.length`).

The replay suite's five database cases were skipped by its shared-database safety guard; its four guard tests passed. No disposable database was created or dropped because the requested scope prohibited drop/recreate operations.

The remaining relevant suites passed; expected rejection-probe Prisma errors were printed by passing tests (duplicate `clientCommandId`, duplicate plate, missing update row, duplicate inspection schedule, and injected `T04_INJECTED_FAILURE`).

### Native TypeScript browser denied/access flows, desktop and mobile

Command:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Continue"; Set-Location "D:\Project\CivicOS"; npx.cmd playwright test tests/e2e/ps005-incident.spec.ts tests/e2e/ps007-inspection.spec.ts tests/e2e/ps009-vehicle-watch.spec.ts tests/e2e/login-and-access.spec.ts tests/e2e/evidence-authorization.spec.ts --project=chromium --project=mobile; exit $LASTEXITCODE'
```

Raw result: **43 passed, 1 failed, 0 skipped** (44 tests).

Failure reproduction: Chromium `tests/e2e/ps005-incident.spec.ts:60` intake-to-close lifecycle, after clicking `Gửi yêu cầu chuyển`. Expected visible `Đã gửi yêu cầu Approval.` and `Approval đang chờ`; actual `Đã gửi yêu cầu Approval.` was not found within 5 seconds. Mobile counterpart passed. All executed denied/access assertions in the other 43 cases passed.

### Configured Windows Python browser suites with Chromium

Command:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Continue"; Set-Location "D:\Project\CivicOS"; & ".\playwright\.venv\Scripts\pytest.exe" playwright\test_identity_shared.py playwright\test_incidents.py playwright\test_inspections.py playwright\test_vehicles.py --browser chromium; exit $LASTEXITCODE'
```

Raw result: **34 passed, 0 failed, 0 skipped**; exit `0`. Both configured desktop and mobile projects ran.

### Quality checks

Commands:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Continue"; Set-Location "D:\Project\CivicOS"; npx.cmd tsc --noEmit; $type=$LASTEXITCODE; npx.cmd eslint .; $lint=$LASTEXITCODE; Write-Output "typecheck=$type lint=$lint"; if ($type -ne 0 -or $lint -ne 0) { exit 1 }'
powershell.exe -NoProfile -Command '$ErrorActionPreference="Continue"; Set-Location "D:\Project\CivicOS"; npx.cmd prettier --check tests/integration/parallel-wave-authorization.integration.test.ts tests/integration/parallel-wave.integration.test.ts tests/integration/parallel-wave-replay.integration.test.ts tests/e2e/ps005-incident.spec.ts tests/e2e/ps007-inspection.spec.ts tests/e2e/ps009-vehicle-watch.spec.ts tests/e2e/login-and-access.spec.ts tests/e2e/evidence-authorization.spec.ts src/modules/identity src/modules/incidents src/modules/inspections src/modules/vehicles src/modules/platform'
powershell.exe -NoProfile -Command '$ErrorActionPreference="Continue"; Set-Location "D:\Project\CivicOS"; & ".\playwright\.venv\Scripts\python.exe" -m compileall -q playwright\test_identity_shared.py playwright\test_incidents.py playwright\test_inspections.py playwright\test_vehicles.py'
```

Raw result: TypeScript typecheck exit `0`; ESLint exit `0`; Python `compileall` exit `0`. Targeted Prettier failed only for `tests/e2e/evidence-authorization.spec.ts` and reported: `Code style issues found in the above file. Run Prettier with --write to fix.` No formatting changes were made.

### Trục trặc gặp phải

- The shared current database contains registry rows from prior runs, causing the vehicle replay length assertion to observe `19` instead of `12`.
- The replay database cases could not be enabled without creating/dropping a disposable database; they were therefore safety-skipped under the no-drop/recreate constraint.
- The first combined quality command's inline Python `-c` quoting was malformed by PowerShell, so Python syntax was rerun with native `compileall`; it passed. No source/test/config changes were made.

Step 7 is **not verified**: the requested zero-failure/zero-skip criteria were not met.

## Ticket 07 step 7 final independent verification after registry replay and PS005 approval timing stabilization

Date: 2026-09-22

### Native Docker prerequisite

Command:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Stop"; Set-Location "D:\Project\CivicOS"; docker info; if ($LASTEXITCODE -ne 0) { Start-Process "Docker Desktop"; $ready=$false; for ($i=0; $i -lt 12; $i++) { Start-Sleep -Seconds 5; docker info; if ($LASTEXITCODE -eq 0) { $ready=$true; break } }; if (-not $ready) { throw "Docker Desktop không khởi động được, cần người dùng tự mở tay" } }; docker compose up -d'
```

Raw result: Docker Desktop was available on context `desktop-linux`; `civicos-postgres-1` was running. No reset, drop, or recreate was run.

### Required DB authorization matrix and relevant shared-DB suites

Command:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Continue"; Set-Location "D:\Project\CivicOS"; $env:RUN_DB_TESTS="1"; $env:DATABASE_URL="postgresql://civicos:civicos@localhost:5432/civicos?schema=public"; npx.cmd vitest run tests/integration/parallel-wave-authorization.integration.test.ts tests/integration/parallel-wave.integration.test.ts tests/integration/parallel-wave-replay.integration.test.ts tests/incidents tests/inspections tests/vehicles tests/identity tests/platform/evidence.integration.test.ts; exit $LASTEXITCODE'
```

Raw result: **21 test files passed; 137 passed, 0 failed, 5 skipped**; exit `0`. The 5 skips were the deliberate disposable-database replay guard under the no-drop/recreate constraint. The authorization matrix file passed 4/4, including commander, assigned, unassigned, revoked, cross-organization, audit, and non-leakage assertions. Expected rejection-probe Prisma errors were emitted by passing tests (duplicate client command, duplicate registry plate, stale update, duplicate schedule, and injected rollback failure).

### Native TypeScript PS005 and evidence authorization E2E, desktop and mobile

Command:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Continue"; Set-Location "D:\Project\CivicOS"; npx.cmd playwright test tests/e2e/ps005-incident.spec.ts tests/e2e/evidence-authorization.spec.ts --project=chromium --project=mobile; exit $LASTEXITCODE'
```

Raw result: **18 passed, 0 failed, 0 skipped**. Both desktop and mobile passed PS005 lifecycle, UI/API denied access, exact 401/403 boundary assertions, and evidence upload/download authorization/non-leakage flows.

PS005 lifecycle repetition command:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Continue"; Set-Location "D:\Project\CivicOS"; $results=@(); for ($i=1; $i -le 3; $i++) { Write-Output ("--- PS005 lifecycle run " + $i + " ---"); npx.cmd playwright test tests/e2e/ps005-incident.spec.ts -g "intake-to-close lifecycle runs through the browser with approvals" --project=chromium --project=mobile; $results += $LASTEXITCODE }; Write-Output ("Exit codes: " + ($results -join ", ")); if (($results | Where-Object { $_ -ne 0 }).Count -gt 0) { exit 1 }'
```

Raw result: 3 consecutive runs, each **2 passed, 0 failed, 0 skipped** (desktop and mobile); exit codes `0, 0, 0`. Approval message timing did not flake.

### Configured Windows Python venv browser suites

Command:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Continue"; Set-Location "D:\Project\CivicOS"; & ".\playwright\.venv\Scripts\pytest.exe" playwright\test_identity_shared.py playwright\test_incidents.py playwright\test_inspections.py playwright\test_vehicles.py --browser chromium; exit $LASTEXITCODE'
```

Raw result: **34 passed, 0 failed, 0 skipped**; Python 3.13.14, pytest 8.4.2, Playwright plugin 0.9.0. Desktop and mobile projects ran.

### Quality checks

Commands:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Continue"; Set-Location "D:\Project\CivicOS"; npx.cmd tsc --noEmit; npx.cmd eslint .; npx.cmd prettier --check <all current tracked changed .ts/.tsx files plus tests/integration/parallel-wave-authorization.integration.test.ts tests/integration/parallel-wave-replay.integration.test.ts>; & ".\playwright\.venv\Scripts\python.exe" -m compileall -q playwright\conftest.py playwright\pages.py playwright\test_identity_shared.py playwright\test_incidents.py playwright\test_inspections.py playwright\test_vehicles.py'
```

Raw result: typecheck exit `0`; ESLint exit `0`; targeted Prettier exit `0` (`All matched files use Prettier code style!`); Python syntax exit `0`.

### Trục trặc gặp phải

- The first combined quality command used a malformed PowerShell quote while parsing the dynamic changed-file list and exited before running checks. It was rerun with a valid native PowerShell command.
- An additional broad `prettier --check src tests` probe reported baseline style warnings in `tests/e2e/field-shell.spec.ts`, `tests/eventing/event-durability.postgres.test.ts`, and `tests/identity/sensitive-log-leak.test.ts`; none are current step-7 changed files. The required targeted changed-file Prettier run passed.

Step 7 is verified.

## Ticket 07 step 8 resilience/freshness verification

Date: 2026-09-22

### Native Docker prerequisite

Command:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Stop"; Set-Location "D:\Project\CivicOS"; docker info; if ($LASTEXITCODE -ne 0) { Start-Process "Docker Desktop"; $ready=$false; for ($i=0; $i -lt 12; $i++) { Start-Sleep -Seconds 5; docker info; if ($LASTEXITCODE -eq 0) { $ready=$true; break } }; if (-not $ready) { throw "Docker Desktop không khởi động được, cần người dùng tự mở tay" } }; docker compose up -d'
```

Result: Docker Desktop was available on context `desktop-linux`; PostgreSQL container `civicos-postgres-1` was running. No reset, drop, or recreate was run.

### Resilience/freshness suite, three consecutive native runs

Command:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Continue"; Set-Location "D:\Project\CivicOS"; $env:RUN_DB_TESTS="1"; $results=@(); for ($i=1; $i -le 3; $i++) { Write-Output ("--- resilience run " + $i + " ---"); npx.cmd vitest run tests/integration/parallel-wave-resilience.integration.test.ts; $results += $LASTEXITCODE }; Write-Output ("Exit codes: " + ($results -join ", ")); if (($results | Where-Object { $_ -ne 0 }).Count -gt 0) { exit 1 }'
```

Raw result:

- Run 1: 1 file, **4 passed, 0 failed, 0 skipped**; `sample=9`, `p95_ms=1740`, `max_ms=1740`; exit `0`.
- Run 2: 1 file, **4 passed, 0 failed, 0 skipped**; `sample=9`, `p95_ms=1640`, `max_ms=1640`; exit `0`.
- Run 3: 1 file, **4 passed, 0 failed, 0 skipped**; `sample=9`, `p95_ms=1652`, `max_ms=1652`; exit `0`.
- Exit codes: `0, 0, 0`.

The four cases verified local worker stop/restart with no dead letters, duplicate delivery exactly-once checkpoints, failing-consumer retry backoff and terminal dead-letter behavior, replay without duplicate notification/audit side effects, and append-to-projection freshness across incident/establishment/vehicle paths. Each run reported a nine-sample p95 below the 10,000 ms threshold; scoped cleanup completed without contamination.

### Eventing, replay, SLA, and Ticket 07 steps 3–7 integration/authorization scope

Command:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Continue"; Set-Location "D:\Project\CivicOS"; $env:RUN_DB_TESTS="1"; $env:DATABASE_URL="postgresql://civicos:civicos@localhost:5432/civicos?schema=public"; npx.cmd vitest run tests/eventing/event-durability.postgres.test.ts tests/eventing/event-kernel.postgres.test.ts tests/eventing/event-kernel.integration.test.ts tests/eventing/projection-replay.postgres.test.ts tests/platform/sla.integration.test.ts tests/integration/parallel-wave.integration.test.ts tests/integration/parallel-wave-authorization.integration.test.ts tests/integration/parallel-wave-replay.integration.test.ts; exit $LASTEXITCODE'
```

Raw result: **8 test files passed; 61 passed, 0 failed, 5 skipped**; exit `0`. The five skips were the deliberate disposable-database replay guard cases under the no-drop/recreate constraint. Counts by file: event durability `11`, event kernel PostgreSQL `3`, event kernel integration `2`, projection replay `1`, SLA `6`, Ticket 07 integration `30`, authorization `4`, replay guard/replay file `4 passed + 5 skipped`.

Expected duplicate-command Prisma error was printed by the passing idempotency test; it was not a failed test. No shared-data contamination or dead-letter leak was reported.

### Worker health and quality checks

Worker health was covered by the passing `getOutboxHealth` assertions in the resilience and event-durability suites. No separate worker-health API test file exists in `tests/`.

Command:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Continue"; Set-Location "D:\Project\CivicOS"; npx.cmd tsc --noEmit; $type=$LASTEXITCODE; npx.cmd eslint .; $lint=$LASTEXITCODE; npx.cmd prettier --check tests/integration/parallel-wave-resilience.integration.test.ts tests/integration/parallel-wave.integration.test.ts tests/integration/parallel-wave-authorization.integration.test.ts tests/integration/parallel-wave-replay.integration.test.ts src/modules/eventing src/app/api/health/worker/route.ts; $prettier=$LASTEXITCODE; Write-Output ("typecheck=" + $type + " lint=" + $lint + " prettier=" + $prettier); if ($type -ne 0 -or $lint -ne 0 -or $prettier -ne 0) { exit 1 }'
```

Raw result: `typecheck=0 lint=0 prettier=0`. Inspection of the added resilience test found no arbitrary sleeps or busy waits; polling loops are deadline-bounded and yield with awaited worker ticks/setImmediate.

### Trục trặc gặp phải

None. Docker Desktop was already running; no retries were required. No source, test, or config files were modified.

**Step 8 is verified.**

## Ticket 07 step 9 re-verification after Developer gap closure

Date: 2026-09-22

### Native Docker prerequisite

Command:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Stop"; Set-Location "D:\Project\CivicOS"; docker info; if ($LASTEXITCODE -ne 0) { Start-Process "Docker Desktop"; $ready=$false; for ($i=0; $i -lt 12; $i++) { Start-Sleep -Seconds 5; docker info; if ($LASTEXITCODE -eq 0) { $ready=$true; break } }; if (-not $ready) { throw "Docker Desktop không khởi động được, cần người dùng tự mở tay" } }; docker compose up -d'
```

Raw result: Docker Desktop was already available on context `desktop-linux`; `civicos-postgres-1` was running. No reset, drop, recreate, or alternate database engine was used.

### Required complete native Playwright scope

Command:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Continue"; Set-Location "D:\Project\CivicOS"; npx.cmd playwright test tests/e2e/parallel-wave.spec.ts --reporter=list --project=chromium --project=mobile; exit $LASTEXITCODE'
```

Raw result: **26 passed, 0 failed, 0 skipped**; desktop `chromium` **13/13**, mobile **13/13**; exit code `0`; duration `1.3m`.

The current assertions explicitly cover:

- denied UI/API behavior for Incident, Establishment/Inspection, and Vehicle/Observation (401/403 API assertions, denied UI copy, and authorized-fixture route denials);
- forced HTTP 500 plus recovery/retry behavior for Establishment, Inspection, Registry, and Observation;
- vehicle plate contrast asserted at **>= 4.5**;
- prior keyboard/focus and focus-visible behavior, accessible labels, custom validation/error feedback, loading/empty/offline states, dark mode, reduced motion, touch targets, horizontal overflow/clipped controls, and visible Vietnamese copy/metadata/navigation.

### Typecheck, targeted ESLint, and Prettier

Command:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Continue"; Set-Location "D:\Project\CivicOS"; npx.cmd tsc --noEmit; $type=$LASTEXITCODE; npx.cmd eslint -- tests/e2e/parallel-wave.spec.ts; $lint=$LASTEXITCODE; npx.cmd prettier --check tests/e2e/parallel-wave.spec.ts; $prettier=$LASTEXITCODE; Write-Output ("Exit codes: tsc=" + $type + ", eslint=" + $lint + ", prettier=" + $prettier); if ($type -ne 0 -or $lint -ne 0 -or $prettier -ne 0) { exit 1 }'
```

Raw result: `tsc=0`, targeted ESLint `0`, targeted Prettier `0`; `All matched files use Prettier code style!`.

### Inspection for sleeps, design anti-patterns, and unrelated changes

- No `waitForTimeout` or arbitrary sleep was found in `tests/e2e/parallel-wave.spec.ts`; the only `setTimeout` is the deliberate 800 ms route delay used to expose loading state.
- No gradient, glassmorphism, `!important`, clipped-control workaround, or page-specific CSS hack was found in the E2E file.
- `git diff --check` reported only the ignored pre-existing/unrelated `opencode.jsonc:138` trailing whitespace.
- The working tree already contained unrelated source/test/config/agent/evidence changes. This verification modified no source, tests, config, or `.scratch`; only this evidence file was updated.

### Remaining gap

None observed within the requested step-9 scope. **Ticket 07 step 9 is verified.**

### Trục trặc gặp phải

None. Docker Desktop was already running; no retry or startup polling was required.

## Ticket 07 step 10 final operational gates

Date: 2026-09-22

### Native Docker and migration status

Commands:

```powershell
powershell.exe -NoProfile -Command "Set-Location 'D:\Project\CivicOS'; docker info"
powershell.exe -NoProfile -Command "Set-Location 'D:\Project\CivicOS'; npx.cmd prisma migrate status"
powershell.exe -NoProfile -Command "Set-Location 'D:\Project\CivicOS'; docker compose up -d"
```

Raw result: Docker Desktop was running on context `desktop-linux`; `civicos-postgres-1` was running. Prisma reported `9 migrations found` and `Database schema is up to date!`. Compose left the PostgreSQL container running. No reset/drop was run against shared `civicos`.

### Required quality gates

Commands:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run format:check
```

Raw result: all four commands passed. Build compiled successfully and generated 26 static pages. Format check reported `All matched files use Prettier code style!`.

### Full native Vitest

Required command:

```powershell
powershell.exe -NoProfile -Command "Set-Location 'D:\Project\CivicOS'; $env:RUN_DB_TESTS='1'; npx.cmd vitest run"
```

First native invocation was malformed by WSL `$env` expansion; PowerShell reported `:RUN_DB_TESTS=1 : The term ':RUN_DB_TESTS=1' is not recognized...`, and that run completed without DB enablement as `22 passed`, `81 passed`, `111 skipped`.

Corrected native invocation initially failed: the full run reported `1 failed`, `60000ms` timeout in `tests/integration/parallel-wave.integration.test.ts` at `projects and replays the Incident read model deterministically`; the command wrapper also reached its 120-second timeout. The raw Prisma log included `Unique constraint failed on the fields: (\`clientCommandId\`)` from the duplicate-command assertion.

The corrected command was rerun with a longer command timeout and completed: **31 test files passed; 187 passed, 0 failed, 5 skipped**. The five skips were the deliberate replay cases guarded from shared `civicos`; the four replay guard tests passed. Expected rejection logs included `T04_INJECTED_FAILURE`, duplicate `clientCommandId`, duplicate schedule, duplicate plate, and missing-row probes inside passing tests.

### Disposable replay proof

Created only `civicos_ticket07_replay_step10_202609220920` under the guarded `civicos_ticket07_replay_` prefix, applied all 9 migrations with `npx.cmd prisma migrate deploy`, then ran:

```powershell
npx.cmd vitest run tests/integration/parallel-wave-replay.integration.test.ts
```

Raw result: **1 test file passed; 9 passed, 0 failed, 0 skipped**. The disposable database was dropped afterward with `DROP DATABASE`; shared `civicos` was not dropped or reset.

### Exact full native Playwright command, twice consecutively

Command (run once per invocation):

```powershell
powershell.exe -NoProfile -Command "Set-Location 'D:\Project\CivicOS'; npx.cmd playwright test --reporter=list"
```

Run 1 raw result: **83 passed, 1 failed, 0 skipped** out of 84. Failure:

```text
tests/e2e/parallel-wave.spec.ts:594
401 and 403 AccessDenied surfaces use authorized fixtures, never bypass
Test timeout of 30000ms exceeded.
Error: page.goto: Test timeout of 30000ms exceeded
navigating to "http://127.0.0.1:3000/login", waiting until "load"
```

Run 2 raw result: **84 passed, 0 failed, 0 skipped**. PS007 completion synchronization and its 4-case desktop/mobile coverage remained in the run; the full Ticket 07 parallel-wave suite executed all 84 cases.

### README and source-scope confirmation

README verification: the documented commands map to existing `package.json` scripts (`prisma:generate`, `prisma:migrate`, `typecheck`, `lint`, `format:check`, `test`, `test:e2e`, `build`, and `prisma:migrate:deploy`); the Docker and `RUN_DB_TESTS=1` instructions are accurate for the current setup.

Diff inspection: no README change was present. Changed source modules were limited to the Ticket 07 eventing, incidents, inspections, platform, and vehicles surfaces plus their expected API/UI/worker adapters. The Ticket 07 integration/replay tests' cross-module source-table write assertions passed; no additional out-of-scope module or cross-module source-table write was observed in the inspected source diff.

### Trục trặc gặp phải

- WSL expanded the first native PowerShell `$env:RUN_DB_TESTS` invocation; it was rerun with escaped PowerShell variables.
- The first DB-enabled full Vitest run timed out on the Incident replay case and was rerun; the rerun passed with the five deliberate replay guard skips.
- The first exact full Playwright run had one Chromium timeout at `/login`; the consecutive second run passed 84/84. Both results are recorded; the rerun does not replace the failure.

Step 10 is **not verified** because the required two consecutive exact full E2E runs were not both 84/84.

## Ticket 07 step 10 final independent verification (current run)

Date: 2026-09-22

### Docker and migration status

Command:

```powershell
powershell.exe -NoProfile -Command "Set-Location 'D:\Project\CivicOS'; docker.exe info; npx.cmd prisma migrate status"
```

Raw Docker result: Docker Desktop server `29.6.2`, context `desktop-linux`, one running container (`civicos-postgres-1`).

Raw migration result: `9 migrations found`; `Database schema is up to date!` Exit code `0`.

No reset/drop was run against shared `civicos`.

### Required quality gates

Commands:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run format:check
```

Raw result: all four passed. Build compiled successfully and generated 26 static pages. Format check: `All matched files use Prettier code style!`.

### Full native Vitest with DB enabled

Command:

```powershell
powershell.exe -NoProfile -Command "Set-Location 'D:\Project\CivicOS'; [Environment]::SetEnvironmentVariable('RUN_DB_TESTS','1','Process'); npx.cmd vitest run"
```

Raw result: **31 test files; 23 passed, 8 failed; 171 passed, 16 failed, 5 skipped; exit nonzero**. The 5 skips were the deliberate shared-database replay cases; the 4 replay guard tests passed. This was not a pass: failures included event durability, Ticket 04 rollback count, inspection schedule, vehicle authorization/replay/source-table guards, resilience, schema migrate-status timeout, and PS-E1-005/007 projection/source-table assertions.

Failure logs (verbatim excerpts):

```text
Failed Tests 16
AssertionError: expected [] to include '5899ce9a-e9e1-4c48-9fb9-3d8b2910e6da'
AssertionError: expected [ true, true ] to have a length of 1 but got 2
Error: Test timed out in 5000ms.
AssertionError: expected undefined to match object { scheduleState: 'overdue' }
AssertionError: expected [] to include 'cmuc3c7va005jwi4gxbenclcz'
AssertionError: expected '' to be truthy
AssertionError: expected +0 to be 1 // Object.is equality
AssertionError: expected 0 to be greater than 0
AssertionError: expected { …(14) } to deeply equal { …(13) }
AssertionError: expected { …(17) } to match object { …(2) }
Unique constraint failed on the fields: (`clientCommandId`)
```

### Disposable replay proof

Using native PowerShell, created disposable `civicos_ticket07_replay_step10_202609221045` under the existing `civicos_ticket07_replay_` prefix, applied all 9 migrations, and ran the exact replay file twice with `PARALLEL_WAVE_REPLAY_DB=1`. Both runs passed **9/9, 0 failed, 0 skipped**. The disposable database was dropped with `DROP DATABASE`; shared `civicos` was not reset/dropped.

### Exact full native Playwright command twice consecutively

Command (each invocation):

```powershell
powershell.exe -NoProfile -Command "Set-Location 'D:\Project\CivicOS'; npx.cmd playwright test --reporter=list"
```

Raw result:

- Run 1: **84 passed, 0 failed, 0 skipped**, workers `1`.
- Run 2: **84 passed, 0 failed, 0 skipped**, workers `1`.

The full Ticket 07 parallel-wave suite was included. PS007 completion synchronization was included in both runs via `ps007-inspection.spec.ts`; its desktop/mobile cases passed.

### README and scope checks

README commands were verified against `package.json`: `prisma:generate`, `prisma:migrate`, `typecheck`, `lint`, `format:check`, `test`, `test:e2e`, `build`, and `prisma:migrate:deploy` all exist; Docker and `RUN_DB_TESTS=1` instructions match the current setup.

The working tree already contained broad unrelated changes. The changed source modules visible in this run were eventing, incidents, inspections, platform, vehicles, their API/UI/worker adapters, and test files. No source/tests/config/.scratch files were modified by this verification. The isolated disposable replay passed its no-cross-module-source-table-write assertions. The shared-DB full Vitest run nevertheless reported failures in cross-module aggregate/source-table count assertions, so those assertions were not green in the shared database.

### Trục trặc gặp phải

- The first native full Vitest command exceeded the 120-second tool timeout without a summary; it was rerun with a 300-second timeout and completed with the failure counts above.
- The first disposable replay command interpolated the PowerShell `$db?schema` expression incorrectly, creating a stray `=public` database and causing the replay cases to skip. The stray database was then dropped, and the guarded disposable replay was rerun with `${db}` interpolation; both correct runs passed 9/9 and the prefixed database was dropped.

Step 10 is **not verified**: both exact full E2E gates and isolated replay proof passed, but the required full DB-enabled Vitest gate had 16 failures.

## Ticket 07 step 10 final independent verification after test-only race fix

Date: 2026-09-22

### A. Quality and migrations

Commands:

```powershell
npx.cmd prisma migrate status
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run format:check
```

Raw result: all exit code `0`. Prisma reported `9 migrations found` and `Database schema is up to date!`; build compiled successfully and generated 26 static pages; Prettier reported `All matched files use Prettier code style!`.

### B. Full DB-enabled Vitest on fresh disposable database

Disposable database: `civicos_ticket07_full_02905311`.

Native PowerShell created it with Docker `psql`, deployed all 9 migrations, ran `tests/identity/session-seed-boundary.postgres.test.ts` first (`1 file, 7 passed, 0 failed, 0 skipped`), then ran `$env:RUN_DB_TESTS='1'; npx.cmd vitest run`.

Raw full result: **31 test files passed; 187 passed; 5 skipped; 0 failed**, exit code `0`. The 5 skips were only the deliberate replay-guard skips. Expected rejection-probe Prisma logs appeared inside passing tests, including duplicate `clientCommandId`, duplicate schedule/plate, missing-row, and `T04_INJECTED_FAILURE` probes.

Cleanup raw result: only `civicos_ticket07_full_02905311` was dropped; `PREFIXED_DATABASES_REMAINING=none`. Shared `civicos` before/after table statistics were identical: `SHARED_DB_UNCHANGED=verified`.

### C. Exact full E2E command twice

Command, run consecutively twice:

```powershell
npx.cmd playwright test --reporter=list
```

Raw result: both runs used current `workers: 1`; run 1 **84 passed, 0 failed, 0 skipped**, exit `0`; run 2 **84 passed, 0 failed, 0 skipped**, exit `0`. Parallel-wave coverage included all 26 cases (13 Chromium and 13 mobile), including PS007 synchronization.

### D. README mapping and out-of-scope/cross-module scan

README command mapping was checked against `package.json`: all documented npm commands mapped to existing scripts (`README_COMMAND_MAPPING=verified`).

No source/tests/config/.scratch files were modified by this verification. The current pre-existing worktree scan showed 38 changed paths and 125 write-keyword matches; those matches include test assertions and existing changes, not writes made by this run. The disposable full Vitest run passed the cross-module source-table guard assertions. `git diff --check` reported only pre-existing line-ending warnings and the existing `opencode.jsonc:147` trailing whitespace.

### Trục trặc gặp phải

- The first disposable-DB PowerShell attempt interpolated `$db?schema` incorrectly and created a stray `=public` database; it was cleaned up along with the empty prefixed database. The corrected run used `${db}` and completed successfully.
- The first README scan used an incorrect PowerShell substring offset; the corrected scan passed.

**Step 10 is verified.**

## Reviewer-fix verification (Ticket 07)

Date: 2026-09-22

### Native Docker/database prerequisite

Command:

```powershell
powershell.exe -NoProfile -Command '$ErrorActionPreference="Stop"; Set-Location "D:\Project\CivicOS"; docker info; if ($LASTEXITCODE -ne 0) { Start-Process "Docker Desktop"; $ready=$false; for ($i=0; $i -lt 12; $i++) { Start-Sleep -Seconds 5; docker info; if ($LASTEXITCODE -eq 0) { $ready=$true; break } }; if (-not $ready) { throw "Docker Desktop không khởi động được, cần người dùng tự mở tay" } }; docker compose up -d'
```

Raw result: Docker Desktop was already running on context `desktop-linux`; `civicos-postgres-1` was running. `docker compose up -d` completed. `prisma migrate deploy` on shared `civicos` reported no pending migrations. No reset/drop was run on shared `civicos`.

### 1. Event catalog and eventing/projection integration

Exact command:

```powershell
$env:RUN_DB_TESTS='1'; npx.cmd vitest run tests/eventing/event-catalog.test.ts tests/inspections/inspection-contract.test.ts tests/vehicles/vehicle-watch-contract.test.ts
```

Raw result: **3 files passed; 16 passed, 0 failed, 0 skipped**.

Relevant eventing/projection command:

```powershell
$env:RUN_DB_TESTS='1'; npx.cmd vitest run tests/eventing tests/integration/parallel-wave.integration.test.ts tests/inspections
```

Raw result: **10 files passed, 1 failed; 75 passed, 1 failed, 0 skipped**. Passing event/projection tests included event durability, event kernel, projection replay, inspection projections, and vehicle replay. Failure:

```text
FAIL tests/integration/parallel-wave.integration.test.ts
PS-E1-005 IntakeReport to Incident path > projects and replays the Incident read model deterministically
Error: Test timed out in 60000ms.
tests/integration/parallel-wave.integration.test.ts:451:5
```

The run also printed the expected duplicate `clientCommandId` and duplicate inspection schedule Prisma errors from passing rejection tests. Because the replay integration test timed out, this verification does not mark the reviewer event/projection finding fixed.

### 2. Authorization UI matrix

Command:

```powershell
npx.cmd playwright test tests/e2e/parallel-wave.spec.ts --reporter=list --project=chromium --project=mobile
```

Raw result: **26 tests; 24 passed, 2 failed, 0 skipped**. Chromium: 12 passed, 1 failed. Mobile: 12 passed, 1 failed.

The failing test was the requested five-principal authorization matrix on both projects. The test uses real session/API/UI requests in the auth case: no `page.route` mock is registered in that test; it creates incident, establishment/inspection, registry, and observation through `page.request`, then checks UI navigation/API status for commander, assigned, unassigned, cross-organization, and revoked paths.

Raw failure (Chromium):

```text
Error: expect(locator).toBeVisible() failed
Locator: getByText(/89A06399/).first()
Expected: visible
Error: element(s) not found
tests/e2e/parallel-wave.spec.ts:760:51
```

Raw failure (mobile):

```text
Error: expect(locator).toBeVisible() failed
Locator: getByText(/89A83157/).first()
Expected: visible
Error: element(s) not found
tests/e2e/parallel-wave.spec.ts:760:51
```

The API response immediately preceding each failure was expected status `200`; the visible registry text assertion failed.

### 3. UI-to-read-model smoke

Command:

```powershell
npx.cmd playwright test tests/e2e/parallel-wave-read-model.spec.ts --reporter=list --project=chromium --project=mobile
```

Raw result: **6 tests; 0 passed, 6 failed, 0 skipped**. All three UI create/action→list/detail/read-model paths failed on Chromium and mobile.

Failures:

```text
intake report: getByText('Read model intake <generated-id>') not found at tests/e2e/parallel-wave-read-model.spec.ts:44:49
establishment/inspection: getByText('Read model cơ sở <generated-id>') not found at line 110:59
registry/observation: getByText('<generated-plate>') not found at line 186:47
```

The same symptoms occurred in both browser projects; the list API response status assertions reached `200` before the visible-text assertions failed.

### 4. PS005/PS007/PS009 browser smoke and quality checks

Command:

```powershell
npx.cmd playwright test tests/e2e/ps005-incident.spec.ts tests/e2e/ps007-inspection.spec.ts tests/e2e/ps009-vehicle-watch.spec.ts --reporter=list --project=chromium --project=mobile
```

Raw result: **30 passed, 0 failed, 0 skipped**.

Command:

```powershell
npx.cmd tsc --noEmit
npx.cmd eslint .
npx.cmd prettier --check "src/**/*.ts" "src/**/*.tsx" "src/**/*.css" "tests/e2e/parallel-wave.spec.ts" "tests/e2e/parallel-wave-read-model.spec.ts"
npx.cmd next build
```

Raw result: typecheck `0`; ESLint `0`; Prettier `All matched files use Prettier code style!`, `0`; Next build `0` (26 static pages generated).

CSS inspection of `src/app/globals.css`: shared `--civicos-*` tokens are used for canvas/surface/border/text/accent/status/radius/icon/control sizing and focus ring; no gradient, `backdrop-filter`, or glassmorphism declaration was observed. The reduced-motion block uses `!important` for the intended media-query overrides.

### 5. Full native E2E and disposable DB regression

Full native E2E command:

```powershell
npx.cmd playwright test --reporter=list --project=chromium --project=mobile
```

Raw result: **90 tests; 82 passed, 8 failed, 0 skipped**. The eight failures were exactly the six read-model smoke cases and the two authorization-matrix cases listed above. PS005/PS007/PS009 cases passed in this full run.

Disposable database command created `civicos_ticket07_20260922113437` via Docker PostgreSQL, applied all 9 migrations, ran `$env:RUN_DB_TESTS='1'; npx.cmd vitest run tests/eventing tests/integration tests/inspections tests/vehicles tests/identity tests/platform tests/incidents`, then dropped only that disposable database. Shared `civicos` was not reset or dropped.

Raw result: **32 files; 30 passed, 2 failed; 180 passed, 4 failed, 12 skipped**. Failures:

```text
FAIL tests/integration/parallel-wave.integration.test.ts
Error: PS005_SEEDED_FIELD_USER_MISSING
tests/integration/parallel-wave.integration.test.ts:367:25

FAIL tests/incidents/incident-ticket04.postgres.test.ts (4 tests)
Error: ASSIGNEE_NOT_FOUND
src/modules/identity/assignments.ts:44:34
```

Expected rejection-probe Prisma logs (duplicate client command, duplicate schedule/plate, missing-row, and `T04_INJECTED_FAILURE`) appeared inside passing tests. Disposable DB cleanup succeeded (`DROP DATABASE`, exit code 0).

### Trục trặc gặp phải

None during Docker startup or migration deployment. The requested eventing/projection integration scope timed out once; the authorization and read-model browser assertions failed consistently in their requested desktop/mobile runs. No source/tests/config/.scratch files were modified; only this evidence file was updated.

Reviewer-fix verification is **not marked fixed** because the requested eventing replay scope, authorization matrix, UI-to-read-model smoke, full E2E, and disposable DB regression each contained failures.
