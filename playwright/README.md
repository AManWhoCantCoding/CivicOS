# CivicOS browser suite

Isolated `pytest` + `pytest-playwright` acceptance suite. Python 3.13 or newer is the minimum. The verified Windows-native runtime is CPython 3.13.14 (`win32`) with `pytest 8.4.2`, `pytest-playwright 0.9.0`, and `pytest-base-url 2.1.0`. The suite runs real Chromium twice by default: a desktop context (`1440x1000`) and a touch mobile context (`390x844`).

## Prerequisite (Windows native, PowerShell)

Run everything below from `D:\Project\CivicOS\playwright` in Windows PowerShell (`powershell.exe`) using the suite virtualenv executable `D:\Project\CivicOS\playwright\.venv\Scripts\python.exe`. The harness launches Windows-native Node (`npm.cmd`), Windows Chromium, and Docker Desktop PostgreSQL (`docker.exe`, container `civicos-postgres-1`) on `127.0.0.1`/`localhost`. Do not run this suite from WSL or with Linux paths; the harness depends on Windows-only orchestration (`cmd.exe`/`taskkill`, `powershell.exe`, `CREATE_NEW_PROCESS_GROUP`), so WSL/Linux is not a supported standard path.

## Setup (Windows native, PowerShell)

```powershell
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pip install -e .
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m playwright install chromium
```

## Run (Windows native, PowerShell)

Targeted regression sweep (collects 18 items, both viewports):

```powershell
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest test_inspections.py test_vehicles.py test_incidents.py --browser chromium
```

Exact full suite (collects 32 items, both viewports):

```powershell
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest --browser chromium
```

Both commands passed with exit code 0 on the verified runtime above. Collection counts (18 and 32) are the observed passing-run totals. `--project desktop|mobile` (or `CIVICOS_E2E_PROJECT`) scopes a run to one viewport; the other viewport is reported as skipped.

## Environment variables

`CIVICOS_E2E_DATABASE_URL` selects the PostgreSQL host, port, and credentials; the database path is always rewritten to the dedicated `civicos_e2e` database (`DATABASE_URL` is the fallback, default `postgresql://civicos:civicos@localhost:5432/civicos`). `CIVICOS_E2E_APP_PORT` selects the isolated Next.js port (default `4317`). `CIVICOS_E2E_TIMEOUT` is the readiness timeout in seconds for PostgreSQL, Next.js, and the worker (default `90`). `CIVICOS_E2E_KEEP_DB=1` (or `--keep-e2e-db`) keeps `civicos_e2e` after the run for debugging.

## Database lifecycle

The harness waits for PostgreSQL, then drops and recreates the dedicated `civicos_e2e` database (unless `--no-recreate-e2e-db` is passed), runs `prisma:generate` plus `prisma:migrate:deploy` against it, and seeds only reference identity/configuration data (roles, organization units, test accounts, checklist templates). Every test starts with business tables truncated, and the database is removed after the run unless it is explicitly kept for inspection.

Business records are never inserted by the test code. Tests create and mutate Incidents, Establishments, Inspections, Evidence, registry entries, and observations through visible UI controls. The only HTTP calls outside browser-rendered UI are authentication/readiness during service startup and the authenticated worker/projection health check. PostgreSQL is used by fixtures for database lifecycle, reference seeding, and destructive test isolation only.

## Fixture dữ liệu demo

Fixture `demo_labels` trả về ba nhãn ổn định khớp với `scripts/demo/seed.ts`: `[DEMO-INCIDENT-01]` (Incident), `[DEMO] Quan karaoke Sao Dem` (Inspection) và `43DEMO01` (Vehicle). Dùng các nhãn này để chọn đúng hồ sơ khi trình diễn trên database demo cô lập (`civicos_demo`); mật khẩu demo là `civicos-dev`, chỉ dùng cho demo.

## Artifacts and cleanup

Service logs are written to `test-results/services/next.log` and `test-results/services/worker.log` (`D:\Project\CivicOS\playwright\test-results\services\next.log` and `worker.log` from `D:\Project\CivicOS\playwright`). Each test node gets a directory below `test-results/` (`D:\Project\CivicOS\playwright\test-results\`) holding `trace.zip` and `failure-*.png` on failure; passed-test videos are deleted. Use `--keep-e2e-db` when inspecting a failed database state.

After a run the harness stops the Next.js and worker processes (`taskkill`), leaving no `node`, Chromium/Edge, or Playwright processes and no listeners on ports `3000`, `3001`, or `4317`. PostgreSQL stays up via Docker Desktop (`civicos-postgres-1`, `pg_isready` accepting connections) with only `civicos`, `postgres`, `template0`, and `template1` present; `civicos_e2e` is absent.

The suite intentionally contains assertions for UI controls that are still being completed by the UI agent. Collection and syntax checks should work before every workflow is green.
