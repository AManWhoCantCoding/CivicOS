# Ticket 03 native acceptance gate evidence

## Step 1 — targeted login/wrong-password/logout/session-boundary

Windows-native bridge used: `powershell.exe -NoProfile` (the requested `/usr/bin/powershell.exe` path was absent; `powershell.exe` resolved to `C:\WINDOWS\System32\WindowsPowerShell\v1.0\powershell.exe`).

Commands, in order:

```text
Set-Location "D:\Project\CivicOS\playwright"
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest --browser chromium --project desktop test_identity_shared.py::test_login_creates_single_session_and_redirects test_identity_shared.py::test_login_with_wrong_password_stays_on_login test_identity_shared.py::test_logout_clears_session
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest --browser chromium --project mobile test_identity_shared.py::test_login_creates_single_session_and_redirects test_identity_shared.py::test_login_with_wrong_password_stays_on_login test_identity_shared.py::test_logout_clears_session
```

Result: both exit `0`. Each invocation collected `6`, with `3 passed, 3 skipped` because the opposite project was excluded. Desktop duration `37.40s`; mobile duration `18.11s`. The targeted login, wrong-password, logout, and session-boundary checks passed on their matching desktop/mobile projects.

## Step 2 — exact full Python suite

```text
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest --browser chromium
```

First attempt was terminated by the test runner wrapper at `120000ms` after partial output. The complete re-run finished with exit `1`:

```text
collected 32 items
=========================== short test summary info ===========================
ERROR ... (all 32 parametrized desktop/mobile tests)
============================= 32 errors in 3.53s ==============================
```

The raw common setup error was:

```text
RuntimeError: Command failed (1): npm.cmd run prisma:generate
> civic-os@0.1.0 prisma:generate
> prisma generate
Prisma schema loaded from prisma\schema.prisma
Environment variables loaded from .env
Error:
EPERM: operation not permitted, rename 'D:\Project\CivicOS\node_modules\.prisma\client\query_engine-windows.dll.node.tmp17600' -> 'D:\Project\CivicOS\node_modules\.prisma\client\query_engine-windows.dll.node'
```

Collection: `32`; pass `0`; fail `0`; skip `0`; error `32`; complete-suite duration `3.53s`.

## Step 3 — failure classification

The full-suite failures are fresh Windows-native Prisma client generation/setup errors (`EPERM` rename of the generated Windows query engine), before the affected browser test bodies. This is distinct from the prior PostgreSQL-unavailable blocker. No workaround or source/config/test change was made. The targeted tests independently passed before and after the full suite.

## Step 4 — targeted re-run after full suite

The same desktop and mobile targeted commands were re-run after the full suite.

Result: both exit `0`. Each collected `6`, with `3 passed, 3 skipped`; desktop duration `18.35s`, mobile duration `17.75s`. No error output.

## Step 5 — native quality gates

All commands ran from `D:\Project\CivicOS` through `powershell.exe -NoProfile`.

| Command | Exit | Raw result |
|---|---:|---|
| `npm run typecheck` | 0 | `tsc --noEmit`; passed. |
| `npm run lint` | 1 | `✖ 11256 problems (2086 errors, 9170 warnings)`; 9 errors and 9 warnings potentially fixable. The output included generated/dependency content such as `playwright\.venv\Lib\site-packages\playwright\driver\...`. |
| `npm run format:check` | 1 | Prettier reported 5 files: `.brain/evidence/01/review.md`, `.brain/evidence/02-native-harness-login/review.md`, `.brain/evidence/03-native-acceptance-gate/changes.md`, `.brain/evidence/03-native-acceptance-gate/tests.md`, `playwright/.pytest_cache/README.md`. |
| `$env:RUN_DB_TESTS=1; npm test` | 0 | `17 passed` test files; `28 passed` tests; duration `8.55s`. |
| `npm run build` | 0 | Next.js production build completed successfully. |
| `npm run test:e2e` | 0 | `12 passed (9.1s)` across chromium desktop/mobile. |

The lint and format failures are pre-existing/generated or evidence/cache-file findings observed by the exact gates; no migration regression was inferred from them. The Python full-suite failure is the fresh Prisma Windows-file lock/rename error above.

## Step 6 — artifacts, README, processes, ports, cleanup

- Fresh service artifacts remain under `playwright/test-results/services/next.log` and `worker.log`. `next.log` shows `next dev --hostname 127.0.0.1 --port 4317`, `Ready`, and successful `/login`/auth/worker-health requests. `worker.log` shows the native worker command and Prisma queries; no application exception was present in the inspected logs.
- Native acceptance reported `platform win32`, Python `3.13.14`, and Windows paths. The browser runs used the Windows venv/Node/Chromium path; no WSL browser dependency was used.
- `playwright/README.md` accurately documents Windows-native PowerShell paths, Chromium, desktop/mobile projects, `127.0.0.1`/`localhost`, dedicated `civicos_e2e` cleanup, and “Do not run this suite from WSL”. It says Python 3.12 while the installed native interpreter reported 3.13.14; that version wording is not exact.
- After the final runs, no listeners were found on app ports `3000`, `3001`, `4173`, `4317`, or `4318`; no `node`, `python`, `chrome`, `chromium`, or `playwright` processes were found. PostgreSQL port `5432` remained listening.
- Container state was retained as requested: `civicos-postgres-1` is `Up`, mapping `0.0.0.0:5432->5432/tcp`; `docker.exe exec ... pg_isready -U civicos -h 127.0.0.1` returned `127.0.0.1:5432 - accepting connections` and exit `0`.
- Database cleanup check listed `civicos`, `postgres`, `template0`, and `template1`; `civicos_e2e` was absent. Docker Desktop/Postgres was left running.

## AC 1–7 evidence map

| AC | Result |
|---|---|
| 1 | PASS — Windows-native bridge, Python/Node/Chromium execution and win32 platform observed. |
| 2 | PASS — targeted login, wrong-password, logout/session-boundary checks passed on desktop and mobile. |
| 3 | FAIL — exact full Python suite collected 32 but ended with 32 Prisma `EPERM` setup errors. |
| 4 | PASS — fresh full-suite error was captured and classified with raw Prisma output; targeted re-run passed. |
| 5 | FAIL — `npm run lint` and `npm run format:check` exited `1`; other four quality gates exited `0`. |
| 6 | FAIL — README is functionally native/WSL-accurate but states Python 3.12 while native runtime is 3.13.14. |
| 7 | PASS — no stale app/browser processes or app-port listeners; `civicos_e2e` absent; Postgres container healthy and intentionally left running. |

## Blockers

1. Exact full Python acceptance suite remains blocked by the Windows-native Prisma client `EPERM` rename during fixture setup.
2. `npm run lint` exits `1` with `11256` reported problems.
3. `npm run format:check` exits `1` on 5 files, including this evidence file and generated/cache evidence files.

No source, test, conftest, package, README, configuration, or generated-file edits were made by this verification run; only this evidence file was updated.

## Step 7 — rerun after Prisma generated-file cleanup

Windows-native bridge: `powershell.exe -NoProfile`; no WSL runtime was used.

Exact command, from `D:\Project\CivicOS\playwright`:

```text
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest --browser chromium
```

Result:

```text
collected 32 items
16 failed, 16 passed in 257.58s (0:04:17)
```

The exact full command exercised both parametrized projects: `desktop-chromium` and `mobile-chromium`. Separate full desktop/mobile runs were therefore not required. The previous Prisma generation error did not recur: no `EPERM` or `prisma:generate` error appeared, and the suite progressed into browser test bodies. The failures were application/API behavior failures, not Prisma setup failures.

Representative raw failure symptoms included:

```text
alert: Không thể kết nối để lưu registry.
alert: Không thể kết nối để lưu cơ sở.
alert: Không thể lưu quan sát vào hàng đợi cục bộ.
AssertionError: Locator expected to be visible
```

Failed tests (each appeared for desktop and mobile):

```text
test_incidents.py::test_incident_full_lifecycle_approves_and_rejects_commands
test_inspections.py::test_establishment_create_edit_and_schedule
test_inspections.py::test_inspection_offline_checklist_finding_evidence_completion_and_recurring_schedule
test_inspections.py::test_inspection_recommendation_can_be_approved_and_rejected
test_inspections.py::test_stale_offline_inspection_command_is_rejected
test_vehicles.py::test_vehicle_registry_observation_match_confirm_verify_evidence_and_escalate
test_vehicles.py::test_duplicate_offline_vehicle_command_is_idempotent
test_vehicles.py::test_vehicle_observation_is_denied_to_an_unassigned_role
```

Fresh full-suite artifacts were produced under `playwright/test-results/`, including `services/next.log`, `services/worker.log`, and failure PNG/video/trace artifacts for the failed browser cases. The service logs were updated at approximately `2026-09-20T12:31:41–12:31:42`.

## Step 8 — post-suite targeted identity checks

Desktop command:

```text
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest --browser chromium --project desktop test_identity_shared.py::test_login_creates_single_session_and_redirects test_identity_shared.py::test_login_with_wrong_password_stays_on_login test_identity_shared.py::test_logout_clears_session
```

Result: exit `0`; collected `6`; `3 passed`, `3 skipped`; duration `20.18s`. The three skips were the mobile cases excluded by `--project=desktop`.

Mobile command:

```text
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest --browser chromium --project mobile test_identity_shared.py::test_login_creates_single_session_and_redirects test_identity_shared.py::test_login_with_wrong_password_stays_on_login test_identity_shared.py::test_logout_clears_session
```

Result: exit `0`; collected `6`; `3 passed`, `3 skipped`; duration `19.37s`. The three skips were the desktop cases excluded by `--project=mobile`.

## Step 9 — post-run cleanup and container state

- No `node`, `python`, `chrome`, `chromium`, or `playwright` processes remained.
- No listeners remained on app ports `3000`, `3001`, `4173`, `4317`, or `4318`.
- PostgreSQL remained listening on port `5432` (Windows listeners observed on `::1:5432` and `:::5432`).
- `civicos-postgres-1` remained `Up`, with `0.0.0.0:5432->5432/tcp` and `[::]:5432->5432/tcp`.
- `docker.exe exec civicos-postgres-1 pg_isready -U civicos -h 127.0.0.1` returned `127.0.0.1:5432 - accepting connections`, exit `0`.
- Database listing remained `civicos`, `postgres`, `template0`, and `template1`; `civicos_e2e` was absent.
- Docker Desktop/PostgreSQL was intentionally left running.

## Current rerun status

The stale Prisma query-engine temp-file condition is gone for this rerun: the exact native Python suite passed Prisma fixture setup and reached the tests. Current full-suite result is `16 passed / 16 failed / 0 skipped / 32 collected` in `257.58s`; targeted desktop and mobile identity checks each passed `3/3` with `3` opposite-project skips. The current browser failures are recorded above with fresh artifacts; the historical Step 2 Prisma `EPERM` result is retained as prior-run evidence only.

## Step 10 — Ticket 03 diagnosis-only isolated runs

Before the new runs, the current service logs were copied to:

- `.brain/evidence/03-native-acceptance-gate/diagnosis-full-suite-next-before-isolated.log`
- `.brain/evidence/03-native-acceptance-gate/diagnosis-full-suite-worker-before-isolated.log`

The requested Windows-native commands were run through `powershell.exe -NoProfile`, from `D:\Project\CivicOS\playwright`, using the requested Windows venv interpreter. An initial invocation from the repository root was not counted because pytest did not load the Playwright options (`RAW_EXIT=4`, `--project` unrecognized).

### 10a — isolated first failing workflow

```text
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest --browser chromium --project desktop test_inspections.py::test_establishment_create_edit_and_schedule
```

Raw result:

```text
collected 2 items
FAILED test_inspections.py::test_establishment_create_edit_and_schedule[desktop-chromium]
SKIPPED test_inspections.py:22: --project=desktop excludes mobile
1 failed, 1 skipped in 21.78s
RAW_EXIT=1
DURATION_MS=22820
```

First failure:

```text
expect(self.page.get_by_text("Đã tạo cơ sở.", exact=True)).to_be_visible()
AssertionError: Locator expected to be visible
Actual value: None
Error: element(s) not found
alert: Không thể kết nối để lưu cơ sở.
```

The service log records `POST /api/establishments 201 in 374ms`, followed by the client-side failure to observe the success message. Thus, for this failure, the HTTP response was `201` while client rendering/state handling failed. The page navigation and supporting API responses were `200`.

Fresh service logs were copied before the next run:

- `.brain/evidence/03-native-acceptance-gate/diagnosis-isolated-establishment-next-after-run.log`
- `.brain/evidence/03-native-acceptance-gate/diagnosis-isolated-establishment-worker-after-run.log`

Trace/network evidence was available and copied as `.brain/evidence/03-native-acceptance-gate/diagnosis-isolated-establishment-trace.network`; the original trace remains at `playwright/test-results/test_inspections_py__test_establishment_create_edit_and_schedule_desktop_chromium_/trace.zip`.

### 10b — 16-vs-17 discrepancy command

```text
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest --browser chromium --project desktop test_identity_shared.py::test_login_and_logout
```

Raw result:

```text
collected 0 items
ERROR: not found: D:\Project\CivicOS\playwright\test_identity_shared.py::test_login_and_logout
(no match in any of [<Module test_identity_shared.py>])
RAW_EXIT=4
DURATION_MS=982
```

Browser/test result: no browser was launched; `0 passed`, `0 failed`, `0 skipped`, `0 collected`. There was no first test-body failure and no HTTP response attributable to this invocation. The command did not resolve the 16-vs-17 discrepancy because the requested node id does not exist in the current test module. No fresh identity trace/network was produced by this no-test run; the existing identity trace directory was not attributed to this invocation.

Fresh service logs were copied after this run:

- `.brain/evidence/03-native-acceptance-gate/diagnosis-identity-login-next-after-run.log`
- `.brain/evidence/03-native-acceptance-gate/diagnosis-identity-login-worker-after-run.log`

### 10c — cleanup/process state

No `node`, `python`, or `chrome` process was listed after the runs, and no listener remained on app port `4317`. PostgreSQL listeners remained on `::1:5432` and `:::5432`. Docker Desktop/Postgres was left running as requested; no cleanup or process termination was performed.
