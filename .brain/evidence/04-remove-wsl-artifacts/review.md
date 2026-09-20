# Ticket 04 — Reviewer evidence

Review scope: only `.scratch/civicos-windows-native-playwright/issues/04-remove-wsl-artifacts.md` and `.brain/evidence/04-remove-wsl-artifacts/**`. No commit made.

## Acceptance Criteria

| Criterion | Result | Evidence |
|---|---|---|
| AC1. Native `playwright/.venv/Scripts/python.exe` works and WSL `playwright/.venv/bin/python` is absent | **PASS** | Actual probe: `playwright/.venv/Scripts/python.exe` exists; PowerShell reports `NativePythonExists=True` and `Python 3.13.14`; `playwright/.venv/bin/python` is absent. This is also recorded in `changes.md:47-48` and `tests.md:42-44`. |
| AC2. WSL browser cache is removed and no Linux browser executable remains in use | **PASS** | Actual probe reports `/home/godxdemon/.cache/ms-playwright` absent. Actual process probe found no Playwright/pytest/Chromium/Chrome test process. `changes.md:44-45,76-77` records the same post-cleanup absence. Native Windows Chromium executables remain recorded at `tests.md:109-110`. |
| AC3. `~/.playwright-deps` is removed and no `LD_LIBRARY_PATH` workaround is needed | **PASS** | Actual probe reports `/home/godxdemon/.playwright-deps` absent and `LD_LIBRARY_PATH=<>`. `changes.md:51,76-77` records no runtime `LD_LIBRARY_PATH`/`playwright-deps` dependency; `tests.md:133-143` records the final WSL probe and no test process/listener. |
| AC4. Generated WSL repo cache/metadata is removed without deleting native venv | **PASS** | Actual probe reports `playwright/__pycache__`, `playwright/.pytest_cache`, and `playwright/civicos_playwright.egg-info` absent, while `playwright/.venv/Scripts/python.exe` remains. The exact five-path whitelist and deletion commands are recorded in `changes.md:5-11,33-40`; final cleanup after the test is explained at `changes.md:62-82`. |
| AC5. `playwright/test-results/` is preserved | **PASS** | Actual probe reports `playwright/test-results` present (`139M`); existing desktop/mobile artifacts and service logs are recorded in `changes.md:49` and `tests.md:35,106-108`. |
| AC6. Windows-native targeted login succeeds after main cleanup | **PASS** | `tests.md:5-31` records the native Chromium run: `14 collected`, `14 passed`, `0 failed`, desktop/mobile matrix, Python 3.13.14, and artifact root `D:\Project\CivicOS\playwright\test-results\`. Browser executable paths are recorded at `tests.md:109-110`. `changes.md:62-77` explicitly documents that final generated-cache removal occurred after this test and did not alter native runtime. |
| AC7. No WSL distro, Docker data, user-created configuration, or source code was deleted outside scope | **PASS** | `changes.md:35-40,54-56` records no prune/unregister/source/config deletion. Actual probes show `docker-desktop` and `Ubuntu` still running, `civicos-postgres-1` up, Docker CivicOS volumes present, and source/config paths (`src`, `prisma`, `package.json`, `package-lock.json`, `opencode.jsonc`, `.opencode`) present. Existing evidence directories remain listed in `changes.md:50` and the current `.brain/evidence` listing. |

## Execution steps

| Step | Result | Evidence |
|---|---|---|
| Step 1 — Ticket 03 pass, exact deletion list captured, no Docker prune/WSL unregister | **PASS** | Tick is present at ticket line 39. Ticket 03 prerequisite and exact five-path whitelist are recorded in `changes.md:3-11`; prohibited commands are explicitly recorded as not run at `changes.md:33-40`. |
| Step 2 — Native Python/Chromium confirmed before cleanup | **PASS** | Tick is present at ticket line 40. Pre-cleanup native Python 3.13.14, Windows cache, and executable inventory are recorded in `changes.md:20-24`. |
| Step 3 — Only WSL cache/deps/generated cache removed | **PASS** | Tick is present at ticket line 41. Raw whitelist-only `rm -r` commands and successful exits are recorded in `changes.md:33-40`; final absence is confirmed by actual probe and `changes.md:44-47`. |
| Step 4 — test-results, evidence, Docker/database, native venv verified intact | **PASS** | Tick is present at ticket line 42. Actual probes confirm test-results, evidence, native Python, Docker container/volumes; supporting post-cleanup records are `changes.md:47-56` and `tests.md:101-120`. |
| Step 5 — Native targeted login rerun and evidence path/browser executable recorded | **PASS** | Tick is present at ticket line 43. `tests.md:5-35` records the rerun and artifact root; `tests.md:109-110` records native browser executables. |
| Step 6 — Cleanup completion recorded and no WSL runtime dependency remains | **PASS** | Tick is present at ticket line 44. Completion and post-test generated-cache removal are recorded in `changes.md:62-82`; final `LD_LIBRARY_PATH` and process/listener checks are recorded in `tests.md:122-147`. |

All requested AC1–AC7 and steps 1–6 have concrete evidence. No commit was made.

Commit: `6f8ed25` (`chore: remove WSL Playwright artifacts`)
