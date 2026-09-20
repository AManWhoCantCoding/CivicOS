# CivicOS browser suite

This directory contains the isolated Python 3.12 `pytest` + `pytest-playwright` acceptance suite. It runs real Chromium twice by default: a desktop context (`1440x1000`) and a touch mobile context (`390x844`).

## Setup (Windows native, PowerShell)

From this directory in Windows PowerShell:

```powershell
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pip install -e .
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m playwright install chromium
```

The harness runs Windows-native Node/Python/Chromium on `127.0.0.1`/`localhost`. It creates and owns a dedicated `civicos_e2e` database, runs Prisma migrations against it, seeds only reference identity/configuration data, and removes the database after the run. Do not run this suite from WSL.

## Run (Windows native, PowerShell)

```powershell
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest --browser chromium
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest --browser chromium --project desktop "test_identity_shared.py::test_login_creates_single_session_and_redirects"
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest --browser chromium --project mobile "test_identity_shared.py::test_login_creates_single_session_and_redirects"
```

Useful environment variables are `CIVICOS_E2E_DATABASE_URL`, `CIVICOS_E2E_APP_PORT`, `CIVICOS_E2E_TIMEOUT`, and `CIVICOS_E2E_KEEP_DB=1`. The database URL is always rewritten to the dedicated `civicos_e2e` database; set `CIVICOS_E2E_DATABASE_URL` to choose the host, port, and credentials.

Failure artifacts are written below `playwright/test-results/`: service logs, screenshots, trace archives, and videos. Passed-test videos are deleted. Use `--keep-e2e-db` when inspecting a failed database state.

Business records are never inserted by the test code. Tests create and mutate Incidents, Establishments, Inspections, Evidence, registry entries, and observations through visible UI controls. The only HTTP calls outside browser-rendered UI are authentication/readiness during service startup and the authenticated worker/projection health check. PostgreSQL is used by fixtures for database lifecycle, reference seeding, and destructive test isolation only.

The suite intentionally contains assertions for UI controls that are still being completed by the UI agent. Collection and syntax checks should work before every workflow is green.
