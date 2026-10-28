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

Before running either command, set the explicit E2E target and freshly verify that the PostgreSQL endpoint, container, and volume at `127.0.0.1:5432` belong to the intended test database. The URL guard does not prove container/volume ownership. If the port is occupied, identify its owner before attempting to free it; do not reset or remove a database/volume manually.

```powershell
$env:CIVICOS_E2E_DATABASE_URL = "postgresql://civicos:civicos@127.0.0.1:5432/civicos_e2e?schema=public"
```

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

`CIVICOS_E2E_DATABASE_URL` is the ONLY database target: it must be set explicitly for every process and must point at PostgreSQL `127.0.0.1:5432/civicos_e2e` — exact host, exact port, and database name `civicos_e2e`. There is NO fallback to `DATABASE_URL`, NO default URL, and NO path rewrite; anything else (other database names such as `civicos`, `civicos_test`, `civicos_demo`, other hosts/ports, fragments, unknown/duplicate query keys, non-`public` `schema=`, non-positive-integer `connection_limit=`) is refused fail-closed before any connection is opened. Only `schema=public` and a positive `connection_limit` are accepted in the query string; see `scripts/e2e/e2e-target.mjs` for the shared Node contract. Other variables: `CIVICOS_E2E_APP_PORT` selects the isolated Next.js port (default `4317`); `CIVICOS_E2E_TIMEOUT` is the readiness timeout in seconds for PostgreSQL, Next.js, and the worker (default `90`).

## Database lifecycle

The harness validates the explicit `civicos_e2e` target FIRST, waits for PostgreSQL readiness, then create-if-missing ONLY (it never drops or recreates the dedicated `civicos_e2e` database and never terminates database sessions), runs `prisma:generate` plus `prisma:migrate:deploy` against it, fully resets application data while `civicos_e2e`'s current identity is proven (`current_database()`), and seeds only reference identity/configuration data (roles, organization units, test accounts, checklist templates) — all under the shared whole-run PostgreSQL advisory lock (key `1128236101`, the same key as the Node harnesses, held on one persistent connection across migration, resets, fixture seeding, tests, and final cleanup so concurrent runs cannot interleave).

The full application-data reset (before seeding and again at session teardown) dynamically truncates every `public` application table, EXCLUDING `_prisma_migrations`, PostGIS `spatial_ref_sys`, and `pg_` catalog tables — so the schema, migration history, and PostGIS reference data survive every run. `civicos_e2e` is retained after the run (schema, migrations, and PostGIS remain; application rows are cleared). Business records are never inserted by the test code. Tests create and mutate Incidents, Establishments, Inspections, Evidence, registry entries, and observations through visible UI controls. The only HTTP calls outside browser-rendered UI are authentication/readiness during service startup and the authenticated worker/projection health check. PostgreSQL is used by fixtures for database lifecycle, reference seeding, and the per-test business-data isolation only (per-test isolation truncates the static `REFERENCE_TABLES` list and keeps reference fixtures available).

## Fixture dữ liệu demo

Fixture `demo_labels` trả về ba nhãn ổn định khớp với `scripts/demo/seed.ts`: `[DEMO-INCIDENT-01]` (Incident), `[DEMO] Quan karaoke Sao Dem` (Inspection) và `43DEMO01` (Vehicle). Khi chạy demo thủ công, dùng các nhãn này trên database `civicos` của Docker Compose local tại loopback:5432; suite Playwright dùng database E2E cô lập `civicos_e2e` như mô tả ở trên. Mật khẩu demo là `civicos-dev`, chỉ dùng cho demo.

## Artifacts and cleanup

Service logs are written to `test-results/services/next.log` and `test-results/services/worker.log` (`D:\Project\CivicOS\playwright\test-results\services\next.log` and `worker.log` from `D:\Project\CivicOS\playwright`). Each test node gets a directory below `test-results/` (`D:\Project\CivicOS\playwright\test-results\`) holding `trace.zip` and `failure-*.png` on failure; passed-test videos are deleted. For failed-run database inspection, connect to the retained `civicos_e2e` database directly (schema, migration history, and PostGIS rows are intact; application rows are cleared by the final reset).

After a run the harness stops the Next.js and worker processes (`taskkill`), leaving no `node`, Chromium/Edge, or Playwright processes and no listeners on ports `3000`, `3001`, or `4317`. PostgreSQL stays up via Docker Desktop (`civicos-postgres-1`, `pg_isready` accepting connections). The retained databases include `civicos`, `postgres`, `template0`, `template1`, and the dedicated `civicos_e2e`; `civicos_e2e` keeps its schema, migration history, and PostGIS data while application rows are reset at session end.

The suite intentionally contains assertions for UI controls that are still being completed by the UI agent. Collection and syntax checks should work before every workflow is green.
