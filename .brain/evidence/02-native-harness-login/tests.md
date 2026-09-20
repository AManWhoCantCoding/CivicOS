# Ticket 02 verification — Windows native rerun

Commands were invoked through native Windows PowerShell using `D:\Project\CivicOS\playwright\.venv\Scripts\python.exe`, Windows Node, and Chromium on `127.0.0.1`.

## Runs

### Full identity suite — desktop

```text
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest --browser chromium --project desktop test_identity_shared.py
```

Result: exit 1; 6 passed, 1 failed, 7 skipped (the 7 mobile cases are expected skips).

Failed case: `test_worker_and_projection_health_are_ready_after_ui_creation[desktop-chromium]`.

Raw failure:

```text
AssertionError: timed out after 15000ms waiting for civicos_session cookie to be set after login POST; expected True, saw False; session POSTs observed: 0
```

### Full identity suite — mobile

```text
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest --browser chromium --project mobile test_identity_shared.py
```

Result: exit 1; 6 passed, 1 failed, 7 skipped (the 7 desktop cases are expected skips).

Failed case: `test_worker_and_projection_health_are_ready_after_ui_creation[mobile-chromium]`.

Raw failure:

```text
AssertionError: timed out after 15000ms waiting for civicos_session cookie to be set after login POST; expected True, saw False; session POSTs observed: 0
```

### Targeted login — desktop

```text
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest --browser chromium --project desktop test_identity_shared.py::test_login_creates_single_session_and_redirects test_identity_shared.py::test_login_with_wrong_password_stays_on_login test_identity_shared.py::test_logout_clears_session
```

Result: exit 0; 3 passed, 3 skipped.

### Targeted login — mobile

```text
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest --browser chromium --project mobile test_identity_shared.py::test_login_creates_single_session_and_redirects test_identity_shared.py::test_login_with_wrong_password_stays_on_login test_identity_shared.py::test_logout_clears_session
```

Result: exit 1; 2 passed, 1 failed, 3 skipped.

Failed case: `test_logout_clears_session[mobile-chromium]`.

Raw failure:

```text
AssertionError: expected exactly one POST /api/auth/session, saw 0
```

An intermediate command using both `--project desktop --project mobile` produced `3 passed, 3 skipped, exit 0`; pytest selected the desktop project for that invocation, so separate desktop/mobile commands above are the authoritative targeted results.

## Regression observations

- Worker/projection health: failed on desktop and mobile before the health assertion, during login; observed zero session POSTs.
- Assignment revocation: passed in both full-suite runs (desktop and mobile).
- Cross-organization assignment alert/no assignment: passed in both full-suite runs (desktop and mobile).
- Valid login and wrong-password login: passed in both full-suite runs; targeted valid/wrong login passed on desktop and mobile.
- Logout: passed in the desktop full and targeted runs; passed in the mobile full run, but failed in the later targeted mobile run during login with zero observed session POSTs.

## Harness checks

- Windows-native pytest reported `platform win32`; Python 3.13.14; Node `v24.18.0` from `C:\Program Files\nodejs\node.exe`.
- WSL environment markers were absent. Source scan found no forbidden harness markers; the only `WSL` match was the README instruction “Do not run this suite from WSL”.
- `playwright/probe_login.py`: absent.
- After the runs: no CivicOS service process markers and no listeners on ports 3000, 3100, or 4173.
- PostgreSQL query for database `civicos_e2e`: `[]` (database removed during cleanup).

## Ticket 02 AC result

1. Harness WSL/gateway/library-path independence: **PASS** (within checked source/environment markers).
2. Windows Node, localhost binding, stale-process cleanup: **PASS** (win32 run, no stale process/ports observed).
3. Dedicated `civicos_e2e` database: **PASS** (post-run database absent after cleanup).
4. Valid login single POST/HTTP 200/session cookie/redirect: **PASS** in targeted desktop and mobile runs.
5. Wrong password stays on login/no session/inline error: **PASS** in targeted desktop and mobile runs.
6. Logout clears session/returns to login: **PASS** in desktop targeted run and mobile full run; **FAIL** in later mobile targeted run because login observed zero session POSTs.
7. Login regression desktop/mobile: **FAIL** (full runs each failed health test at login; later mobile targeted logout setup failed).
8. No throwaway probe/debug masking branch: **PASS** (`probe_login.py` absent; Python polling assertion remained observable).

## Latest Developer-change rerun — `_wait_for_login_ready()`

Commands were invoked through native Windows PowerShell (`platform win32`) with `D:\Project\CivicOS\playwright\.venv\Scripts\python.exe`, Windows Node/Chromium, and localhost.

### Full identity suite — desktop

```text
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest --browser chromium --project desktop test_identity_shared.py
======================== 7 passed, 7 skipped in 56.43s ========================
FULL_DESKTOP_EXIT=0
```

### Full identity suite — mobile

```text
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest --browser chromium --project mobile test_identity_shared.py
======================== 7 passed, 7 skipped in 54.30s ========================
FULL_MOBILE_EXIT=0
```

### Targeted login/logout — desktop and mobile

```text
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest --browser chromium --project desktop test_identity_shared.py::test_login_creates_single_session_and_redirects test_identity_shared.py::test_login_with_wrong_password_stays_on_login test_identity_shared.py::test_logout_clears_session
======================== 3 passed, 3 skipped in 18.57s ========================
TARGETED_DESKTOP_EXIT=0

D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest --browser chromium --project mobile test_identity_shared.py::test_login_creates_single_session_and_redirects test_identity_shared.py::test_login_with_wrong_password_stays_on_login test_identity_shared.py::test_logout_clears_session
======================== 3 passed, 3 skipped in 18.55s ========================
TARGETED_MOBILE_EXIT=0
```

### Consecutive login/logout verification — run 2

```text
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest --browser chromium --project desktop test_identity_shared.py::test_login_creates_single_session_and_redirects test_identity_shared.py::test_login_with_wrong_password_stays_on_login test_identity_shared.py::test_logout_clears_session
======================== 3 passed, 3 skipped in 18.49s ========================
TARGETED_DESKTOP_RUN2_EXIT=0

D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest --browser chromium --project mobile test_identity_shared.py::test_login_creates_single_session_and_redirects test_identity_shared.py::test_login_with_wrong_password_stays_on_login test_identity_shared.py::test_logout_clears_session
======================== 3 passed, 3 skipped in 18.32s ========================
TARGETED_MOBILE_RUN2_EXIT=0
```

### Post-run harness checks

```text
NO_CIVICOS_PROCESS_MARKERS
NO_LISTENERS_3000_3100_4173
[]
NO_WSL_DISTRO_NAME
NO_WSLENV
NO_WSL_HARNESS_MARKERS
PROBE_ABSENT
```

Database query was executed with native Python/psycopg against PostgreSQL using the harness credentials; `[]` means no `civicos_e2e` database remained after cleanup.

## Latest Ticket 02 AC result

1. Harness WSL/gateway/library-path independence: **PASS** (`NO_WSL_HARNESS_MARKERS`; no WSL environment markers).
2. Windows Node, localhost binding, stale-process cleanup: **PASS** (desktop/mobile runs passed; no CivicOS process markers or listeners on 3000/3100/4173).
3. Dedicated `civicos_e2e` database: **PASS** (query returned `[]` after cleanup).
4. Valid login single POST/HTTP 200/session cookie/redirect: **PASS** (desktop and mobile targeted runs, including run 2).
5. Wrong password stays on login/no session/inline error: **PASS** (desktop and mobile targeted runs, including run 2).
6. Logout clears session/returns to login: **PASS** (desktop and mobile targeted runs, including run 2).
7. Login regression desktop/mobile: **PASS** (full identity suites: each 7 passed, 7 skipped).
8. No throwaway probe/debug masking branch: **PASS** (`probe_login.py` absent).

Step 7 stability requirement: **PASS** — login/logout passed in two consecutive targeted runs for both desktop and mobile.

## Infrastructure readiness — Ticket 02

Commands were invoked through native Windows PowerShell from `D:\Project\CivicOS`.

```text
COMMAND: docker.exe context show
desktop-linux

COMMAND: docker.exe info
Client: Docker 29.6.2; Context: desktop-linux
Server: Docker Desktop; Containers: 1 running; Images: 6

COMMAND: docker.exe compose up -d postgres
 Container civicos-postgres-1 Running

COMMAND: docker.exe ps --filter name=civicos-postgres-1 --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
NAMES                STATUS        PORTS
civicos-postgres-1   Up 11 hours   0.0.0.0:5432->5432/tcp, [::]:5432->5432/tcp

COMMAND: docker.exe exec civicos-postgres-1 pg_isready -U civicos -h 127.0.0.1
127.0.0.1:5432 - accepting connections

COMMAND: npx.cmd prisma migrate status
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "civicos", schema "public" at "localhost:5432"
4 migrations found in prisma/migrations
Database schema is up to date!

COMMAND: npx.cmd prisma generate
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
✔ Generated Prisma Client (v6.19.3) to .\node_modules\@prisma\client in 166ms
```

Result: PostgreSQL container is running and accepting connections; Prisma reached the database, reported the schema up to date, and generated the client successfully. Infrastructure blocker: none observed.
