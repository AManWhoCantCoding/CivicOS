# Ticket 05 verification evidence

Verification only. No source, test, conftest, package, README, or ticket files were changed.

Environment: native `powershell.exe`; Windows Python `D:\Project\CivicOS\playwright\.venv\Scripts\python.exe`; Windows Node/Chromium; localhost; Docker Desktop PostgreSQL container `civicos-postgres-1` healthy. All pytest commands ran from `D:\Project\CivicOS\playwright`.

## Targeted set before full suite

Command template used for every row:

```text
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest <node> --browser chromium --project <desktop|mobile>
```

16 invocations: 9 passed, 7 failed, each collecting 2 items (`1 passed/failed, 1 skipped` because the opposite viewport is excluded). Durations are wrapper durations in seconds; raw stdout/stderr is preserved in the listed log.

| Test | Desktop | Mobile |
|---|---|---|
| `test_incidents.py::test_incident_projection_tracks_the_ui_lifecycle` | PASS 22.531s | PASS 21.623s |
| `test_incidents.py::test_incident_full_lifecycle_approves_and_rejects_commands` | FAIL 14.061s | PASS 34.273s |
| `test_inspections.py::test_establishment_create_edit_and_schedule` | PASS 25.833s | PASS 25.937s |
| `test_inspections.py::test_inspection_offline_checklist_finding_evidence_completion_and_recurring_schedule` | FAIL 59.724s | FAIL 59.930s |
| `test_inspections.py::test_inspection_recommendation_can_be_approved_and_rejected` | FAIL 59.603s | FAIL 58.282s |
| `test_inspections.py::test_stale_offline_inspection_command_is_rejected` | FAIL 28.784s | FAIL 28.828s |
| `test_vehicles.py::test_vehicle_registry_observation_match_confirm_verify_evidence_and_escalate` | FAIL 56.276s | FAIL 54.837s |
| `test_vehicles.py::test_duplicate_offline_vehicle_command_is_idempotent` | PASS 16.388s | PASS 15.910s |

Raw logs: `before-*.log`; machine-readable summary: `before-summary.log`.

## Exact full suite

Exact command:

```text
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest --browser chromium
```

Result: collection remained exactly **32 items**. **24 passed, 8 failed**, exit code 1, pytest duration `481.82s (0:08:01)`, wrapper duration `482.744s`.

Failures, all on desktop and mobile:

```text
test_inspections.py::test_inspection_offline_checklist_finding_evidence_completion_and_recurring_schedule[desktop-chromium]
test_inspections.py::test_inspection_recommendation_can_be_approved_and_rejected[desktop-chromium]
test_inspections.py::test_stale_offline_inspection_command_is_rejected[desktop-chromium]
test_vehicles.py::test_vehicle_registry_observation_match_confirm_verify_evidence_and_escalate[desktop-chromium]
test_inspections.py::test_inspection_offline_checklist_finding_evidence_completion_and_recurring_schedule[mobile-chromium]
test_inspections.py::test_inspection_recommendation_can_be_approved_and_rejected[mobile-chromium]
test_inspections.py::test_stale_offline_inspection_command_is_rejected[mobile-chromium]
test_vehicles.py::test_vehicle_registry_observation_match_confirm_verify_evidence_and_escalate[mobile-chromium]
```

Full raw log: `full-suite.log`; summary: `full-summary.log`.

## Targeted set after full suite

The same 16 commands were rerun in the same desktop/mobile scope. Result: 8 passed, 8 failed; each invocation collected 2 items with one viewport-exclusion skip.

| Test | Desktop | Mobile |
|---|---|---|
| `test_incidents.py::test_incident_projection_tracks_the_ui_lifecycle` | PASS 22.302s | PASS 21.749s |
| `test_incidents.py::test_incident_full_lifecycle_approves_and_rejects_commands` | PASS 35.328s | PASS 34.685s |
| `test_inspections.py::test_establishment_create_edit_and_schedule` | PASS 25.847s | PASS 25.606s |
| `test_inspections.py::test_inspection_offline_checklist_finding_evidence_completion_and_recurring_schedule` | FAIL 60.953s | FAIL 60.585s |
| `test_inspections.py::test_inspection_recommendation_can_be_approved_and_rejected` | FAIL 59.726s | FAIL 58.790s |
| `test_inspections.py::test_stale_offline_inspection_command_is_rejected` | FAIL 28.764s | FAIL 28.653s |
| `test_vehicles.py::test_vehicle_registry_observation_match_confirm_verify_evidence_and_escalate` | FAIL 55.831s | FAIL 55.031s |
| `test_vehicles.py::test_duplicate_offline_vehicle_command_is_idempotent` | PASS 16.445s | PASS 16.091s |

Raw logs: `after-*.log`; machine-readable summary: `after-summary.log`.

## Step evidence and exact blockers

1. `test_incident_projection_tracks_the_ui_lifecycle`: PASS before and after on both viewports. Projection status reached `IncidentClassified`; worker dead-letter assertion passed.
2. `test_incident_full_lifecycle_approves_and_rejects_commands`: before desktop failed at login with the exact assertion `AssertionError: expected exactly one POST /api/auth/session, saw 0`; before mobile passed. After-full-suite both passed.
3. `test_establishment_create_edit_and_schedule`: PASS on both viewports before and after.
4. Offline inspection completion: FAIL on both viewports before and after. Exact blocker: `playwright._impl._errors.TimeoutError: Locator.select_option: Timeout 30000ms exceeded.` while waiting for `get_by_label("Mục checklist", exact=True)` in `pages.py:378`, called by `app.record_finding()` at `test_inspections.py:57`.
5. Inspection recommendation approval/rejection: FAIL on both viewports before and after at the same exact `Mục checklist` `Locator.select_option` timeout in `pages.py:378`, from `test_inspections.py:87`.
6. Stale offline inspection command: FAIL on both viewports before and after with exact `AttributeError: 'Expect' object has no attribute 'poll'` at `test_inspections.py:127`.
7. Vehicle observation lifecycle: FAIL on both viewports before and after. Exact blocker: `playwright._impl._errors.TimeoutError: Locator.evaluate: Timeout 30000ms exceeded.` while waiting for `get_by_label("OrganizationUnit đích", exact=True)` in `pages.py:553`, from `test_vehicles.py:40`.
8. Duplicate offline vehicle command: PASS on both viewports before and after; expected synced queue count and one rendered observation were observed.

## Network, status, queue, service, and cleanup observations

- Fresh service artifacts: `playwright/test-results/services/next.log` and `worker.log`. Browser traces/screenshots/video artifacts remain below `playwright/test-results/` for failed contexts.
- No literal `Không thể kết nối để lưu cơ sở` was found in the service-log scan. Service logs show localhost traffic and `/api/sync 200`; worker/outbox SQL is present.
- The passing projection, establishment, and duplicate-queue cases exercised status selectors/forms and queue terminal-state assertions. The failing workflows did not reach their later queue/status assertions because of the exact blockers above.
- No test retries, sleeps, API bypasses, or weakened assertions were used.
- Post-run native cleanup: no `node`, Chromium/Edge, or Playwright process output; no listeners on ports `3000`, `3001`, or `4317`.
- PostgreSQL: `pg_isready` reported `/var/run/postgresql:5432 - accepting connections`; `Test-NetConnection 127.0.0.1 -Port 5432` returned `TcpTestSucceeded : True`; Docker container remained `Up`.
- Database listing after cleanup was `civicos`, `postgres`, `template0`, `template1`; `civicos_e2e` was absent.
- Cleanup raw artifacts: `postrun-cleanup.log`, `postrun-cleanup-corrected.log`.

## AC 1–6

- AC 1 — native Windows/Node/Chromium/PostgreSQL harness and cleanup: **PASS** for the observed environment checks.
- AC 2 — requested targeted workflows on desktop and mobile before full suite: **FAIL** (9 passed, 7 failed).
- AC 3 — exact full suite collects 32 and passes: **FAIL** (32 collected; 24 passed, 8 failed).
- AC 4 — same targeted workflows after full suite: **FAIL** (8 passed, 8 failed).
- AC 5 — status selectors/forms, queue terminal state, transport/service behavior, and regression representatives: **FAIL** overall; several representatives passed, but inspection checklist/recommendation/stale-command and vehicle escalation remained blocked as documented.
- AC 6 — fresh logs/traces, raw evidence, network/service evidence, and cleanup: **PASS** for captured artifacts and observed cleanup state.

Overall verification result: **FAIL**. No pass claim is made while any requested test fails.

## Final verification after latest page-object/test fixes (2026-09-20)

Verification-only run. No source, test, conftest, package, README, or ticket files were edited.

Environment and invocation: native `powershell.exe`, Windows Python `D:\Project\CivicOS\playwright\.venv\Scripts\python.exe`, Windows Node/Chromium, Docker Desktop PostgreSQL, working directory `D:\Project\CivicOS\playwright`, localhost.

### 1. Targeted desktop/mobile run before the exact full suite

Commands used for each case and viewport:

```text
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest <node> --browser chromium --project <desktop|mobile>
```

14 invocations (7 requested cases × 2 viewports), each collected 2 items with one viewport-exclusion skip. Result: **9 passed, 5 failed, 14 skipped exclusions**.

| Case | Desktop | Mobile |
|---|---|---|
| `test_incidents.py::test_incident_projection_tracks_the_ui_lifecycle` | FAIL — login assertion: `expected exactly one POST /api/auth/session, saw 0` | PASS |
| `test_incidents.py::test_incident_full_lifecycle_approves_and_rejects_commands` | PASS | PASS |
| `test_inspections.py::test_inspection_offline_checklist_finding_evidence_completion_and_recurring_schedule` | FAIL — `Locator.select_option: Timeout 30000ms exceeded`; resolved `<select ... id="inspection-finding-checklist" ...>` was disabled | FAIL — same |
| `test_inspections.py::test_inspection_recommendation_can_be_approved_and_rejected` | PASS | FAIL — `Locator.click: Timeout 30000ms exceeded`; `<textarea ...>`/container intercepted the `Duyệt` button |
| `test_inspections.py::test_stale_offline_inspection_command_is_rejected` | PASS | PASS |
| `test_vehicles.py::test_vehicle_registry_observation_match_confirm_verify_evidence_and_escalate` | FAIL — `AssertionError: timed out after 15000ms waiting for worker pendingCount to reach 0; expected 0, saw AssertionError('{"error":"FORBIDDEN"}')` | same |
| `test_vehicles.py::test_duplicate_offline_vehicle_command_is_idempotent` | PASS | PASS |

### 2. Exact full suite

Exact command:

```text
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest --browser chromium
```

Result: **32 collected; 27 passed; 5 failed; exit code 1**. Pytest duration: **422.16s (0:07:02)**.

Failures:

```text
test_inspections.py::test_inspection_offline_checklist_finding_evidence_completion_and_recurring_schedule[desktop-chromium]
test_vehicles.py::test_vehicle_registry_observation_match_confirm_verify_evidence_and_escalate[desktop-chromium]
test_inspections.py::test_inspection_offline_checklist_finding_evidence_completion_and_recurring_schedule[mobile-chromium]
test_inspections.py::test_inspection_recommendation_can_be_approved_and_rejected[mobile-chromium]
test_vehicles.py::test_vehicle_registry_observation_match_confirm_verify_evidence_and_escalate[mobile-chromium]
```

The full-suite failure logs reported the same disabled checklist select, recommendation-button pointer interception, and vehicle projection `FORBIDDEN` response quoted above.

### 3. Rerun of every case that had failed before the full suite

8 invocations (the four previously failing cases × desktop/mobile), with the same targeted command template. Result: **3 passed, 5 failed, 8 skipped exclusions**.

| Case | Desktop | Mobile |
|---|---|---|
| `test_inspections.py::test_inspection_offline_checklist_finding_evidence_completion_and_recurring_schedule` | FAIL — disabled `#inspection-finding-checklist` select timeout after 30s | FAIL — same |
| `test_inspections.py::test_inspection_recommendation_can_be_approved_and_rejected` | PASS | FAIL — `Duyệt` click timeout; form/container intercepted pointer events |
| `test_inspections.py::test_stale_offline_inspection_command_is_rejected` | PASS | PASS |
| `test_vehicles.py::test_vehicle_registry_observation_match_confirm_verify_evidence_and_escalate` | FAIL — projection poll ended with `{"error":"FORBIDDEN"}` | same |

### 4. Explicit blocker/status/transport observations

- The former `Expect.poll` blocker was not reproduced: stale offline rejection passed on desktop and mobile in both relevant runs.
- No old label-resolution failure was reproduced; however, the finding control was resolved by ID and remained disabled, so the checklist/ID workflow blocker is **not cleared**.
- Queue terminal status was observed for the passing stale and duplicate-offline cases; the failing inspection/vehicle workflows did not reach all later queue/projection assertions.
- No false connection message (`Không thể kết nối để lưu cơ sở`, `Cannot connect`, or `connection refused`) was found in `playwright/test-results/services/next.log` or `worker.log`.
- Service evidence included `POST /api/sync 200`; no retry, sleep, API bypass, or test workaround was used.
- Final cleanup: `node`, Chromium/Chrome/Edge, and Playwright processes: **none**; listeners on ports `3000`, `3001`, `4317`: **none**.
- Docker Desktop: `civicos-postgres-1` was **Up**, `pg_isready` reported `/var/run/postgresql:5432 - accepting connections`.
- PostgreSQL databases after cleanup: `civicos`, `postgres`, `template0`, `template1`; `civicos_e2e` was absent.

### 5. AC 1–6 / requested steps evidence

- **AC 1 / step 1 — native Windows/Node/Chromium/PostgreSQL and cleanup:** observed environment and cleanup checks passed.
- **AC 2 / step 1 — targeted desktop/mobile workflows:** **FAIL**, 9 passed and 5 failed; failures documented above.
- **AC 3 / step 2 — exact full suite:** **FAIL**, exactly 32 collected, 27 passed and 5 failed in 422.16s.
- **AC 4 / step 3 — rerun every pre-full failure desktop/mobile:** **FAIL**, 3 passed and 5 failed.
- **AC 5 / step 3 — no Expect.poll/label/ID blocker, queue status, false connection, and service/network checks:** **FAIL** overall; `Expect.poll` was clear and false connection messages were absent, but disabled checklist ID control, pointer interception, and vehicle projection `FORBIDDEN` remained.
- **AC 6 / step 4 — evidence and cleanup:** service logs were present, `/api/sync 200` was observed, and final process/port/PostgreSQL/database cleanup checks passed.

**Final verification result: FAIL. No pass claim is made because requested tests still failed.**

## Independent Tester verification (2026-09-20, latest run)

No source or test code was changed. All commands were invoked through native `powershell.exe` from `D:\Project\CivicOS\playwright`, using `D:\Project\CivicOS\playwright\.venv\Scripts\python.exe`.

### 1. Targeted affected sweep before full suite

Command:

```text
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest test_inspections.py test_vehicles.py test_incidents.py --browser chromium
```

Raw result:

```text
============================= test session starts =============================
platform win32 -- Python 3.13.14, pytest-8.4.2, pluggy-1.6.0
rootdir: D:\Project\CivicOS\playwright
configfile: pyproject.toml
plugins: base-url-2.1.0, playwright-0.9.0
collected 18 items
test_inspections.py ....                                                 [ 22%]
test_vehicles.py ...                                                     [ 38%]
test_incidents.py ..                                                     [ 50%]
test_inspections.py ....                                                 [ 72%]
test_vehicles.py ...                                                     [ 88%]
test_incidents.py ..                                                     [100%]
======================= 18 passed in 241.53s (0:04:01) ========================
EXIT_CODE=0
```

Result: 18 passed, 0 failed, exit code 0. Desktop and mobile projects both ran (9 tests per project).

### 2. Exact full suite

Command:

```text
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest --browser chromium
```

Raw result:

```text
============================= test session starts =============================
platform win32 -- Python 3.13.14, pytest-8.4.2, pluggy-1.6.0
rootdir: D:\Project\CivicOS\playwright
configfile: pyproject.toml
testpaths: .
plugins: base-url-2.1.0, playwright-0.9.0
collected 32 items
test_identity_shared.py .......                                          [ 21%]
test_incidents.py ..                                                     [ 28%]
test_inspections.py ....                                                 [ 40%]
test_vehicles.py ...                                                     [ 50%]
test_identity_shared.py .......                                          [ 71%]
test_incidents.py ..                                                     [ 78%]
test_inspections.py ....                                                 [ 90%]
test_vehicles.py ...                                                     [100%]
======================= 32 passed in 326.53s (0:05:26) ========================
EXIT_CODE=0
```

Result: collection 32, 32 passed, 0 failed, pytest duration 326.53s (0:05:26), exit code 0. No failure nodeids.

### 3. Targeted affected sweep after full suite

Same command as step 1:

```text
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest test_inspections.py test_vehicles.py test_incidents.py --browser chromium
```

Raw result:

```text
============================= test session starts =============================
platform win32 -- Python 3.13.14, pytest-8.4.2, pluggy-1.6.0
rootdir: D:\Project\CivicOS\playwright
configfile: pyproject.toml
plugins: base-url-2.1.0, playwright-0.9.0
collected 18 items
test_inspections.py ....                                                 [ 22%]
test_vehicles.py ...                                                     [ 38%]
test_incidents.py ..                                                     [ 50%]
test_inspections.py ....                                                 [ 72%]
test_vehicles.py ...                                                     [ 88%]
test_incidents.py ..                                                     [100%]
======================= 18 passed in 244.47s (0:04:04) ========================
EXIT_CODE=0
```

Result: 18 passed, 0 failed, exit code 0. No order-contamination failure observed.

### Post-run checks (native PowerShell)

Raw observations:

```text
TEST_PROCESS_SCAN_EXCLUDING_THIS_CHECK
NONE
WSL_MARKER_TEST_COMMANDS
NONE
LISTENERS_3000_3001_4317
NONE
DOCKER_POSTGRES
civicos-postgres-1   Up 5 hours   0.0.0.0:5432->5432/tcp, [::]:5432->5432/tcp
POSTGRES_READY
/var/run/postgresql:5432 - accepting connections
DATABASES
civicos
postgres
E2E_DB_EXISTS
f
WSL_MARKER_SCAN_SERVICE_LOGS
NONE
```

Service logs:

```text
D:\Project\CivicOS\playwright\test-results\services\next.log
D:\Project\CivicOS\playwright\test-results\services\worker.log
```

No failures occurred in this run, so no new failure trace/screenshot artifacts were produced. Existing artifact paths under `D:\Project\CivicOS\playwright\test-results\` include `trace.zip` and `failure-*.png` files from earlier verification runs; they are not attributed to this passing run.
