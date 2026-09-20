# Ticket 07 — independent verification evidence

Runtime: Windows-native PowerShell invoked through `powershell.exe`; working directory `D:\Project\CivicOS\playwright`.

## 1. Runtime and metadata

Command:

```powershell
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe --version
```

Raw output:

```text
Python 3.13.14
```

Command:

```powershell
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -c "import sys, platform, tomllib; from pathlib import Path; data=tomllib.loads(Path('pyproject.toml').read_text(encoding='utf-8')); print('sys.version:', sys.version); print('platform:', platform.platform()); print('platform.system:', platform.system()); print('requires-python:', data['project']['requires-python']); assert data['project']['requires-python'].strip() == '>=3.13'"
```

Raw output:

```text
sys.version: 3.13.14 (tags/v3.13.14:fd17997, Jun 10 2026, 13:03:48) [MSC v.1944 64 bit (AMD64)]
platform: Windows-11-10.0.26200-SP0
platform.system: Windows
requires-python: >=3.13
```

Result: exit code 0.

## 2. README setup commands

Command:

```powershell
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pip install -e .
```

Raw output:

```text
Obtaining file:///D:/Project/CivicOS/playwright
  Installing build dependencies: started
  Installing build dependencies: finished with status 'done'
  Checking if build backend supports build_editable: started
  Checking if build backend supports build_editable: finished with status 'done'
  Getting requirements to build editable: started
  Getting requirements to build editable: finished with status 'done'
  Preparing editable metadata (pyproject.toml): started
  Preparing editable metadata (pyproject.toml): finished with status 'done'
Requirement already satisfied: psycopg<4,>=3.2 in .\.venv\Lib\site-packages (from psycopg[binary]<4,>=3.2->civicos-playwright==0.1.0) (3.3.6)
Requirement already satisfied: pytest<9,>=8.3 in .\.venv\Lib\site-packages (from civicos-playwright==0.1.0) (8.4.2)
Requirement already satisfied: pytest-playwright<1,>=0.7 in .\.venv\Lib\site-packages (from civicos-playwright==0.1.0) (0.9.0)
Requirement already satisfied: tzdata in .\.venv\Lib\site-packages (from psycopg[binary]<4,>=3.2->psycopg[binary]<4,>=3.2->civicos-playwright==0.1.0) (2026.4)
Requirement already satisfied: psycopg-binary==3.3.6 in .\.venv\Lib\site-packages (from psycopg[binary]<4,>=3.2->civicos-playwright==0.1.0) (3.3.6)
Requirement already satisfied: colorama>=0.4 in .\.venv\Lib\site-packages (from pytest<9,>=8.3->civicos-playwright==0.1.0) (0.4.6)
Requirement already satisfied: iniconfig>=1 in .\.venv\Lib\site-packages (from pytest<9,>=8.3->civicos-playwright==0.1.0) (2.3.0)
Requirement already satisfied: packaging>=20 in .\.venv\Lib\site-packages (from pytest<9,>=8.3->civicos-playwright==0.1.0) (26.3)
Requirement already satisfied: pluggy<2,>=1.5 in .\.venv\Lib\site-packages (from pytest<9,>=8.3->civicos-playwright==0.1.0) (1.6.0)
Requirement already satisfied: pygments>=2.7.2 in .\.venv\Lib\site-packages (from pytest<9,>=8.3->civicos-playwright==0.1.0) (2.21.0)
Requirement already satisfied: playwright>=1.18 in .\.venv\Lib\site-packages (from pytest-playwright<1,>=0.7->civicos-playwright==0.1.0) (1.63.0)
Requirement already satisfied: pytest-base-url<3.0.0,>=1.0.0 in .\.venv\Lib\site-packages (from pytest-playwright<1,>=0.7->civicos-playwright==0.1.0) (2.1.0)
Requirement already satisfied: python-slugify<9.0.0,>=6.0.0 in .\.venv\Lib\site-packages (from pytest-playwright<1,>=0.7->civicos-playwright==0.1.0) (8.0.4)
Requirement already satisfied: requests>=2.9 in .\.venv\Lib\site-packages (from pytest-base-url<3.0.0,>=1.0.0->pytest-playwright<1,>=0.7->civicos-playwright==0.1.0) (2.34.2)
Requirement already satisfied: text-unidecode<2,>=1.3 in .\.venv\Lib\site-packages (from python-slugify<9.0.0,>=6.0.0->pytest-playwright<1,>=0.7->civicos-playwright==0.1.0) (1.3)
Requirement already satisfied: pyee<14,>=13 in .\.venv\Lib\site-packages (from playwright>=1.18->pytest-playwright<1,>=0.7->civicos-playwright==0.9.0) (13.0.0)
Requirement already satisfied: greenlet<4,>=3.1.1 in .\.venv\Lib\site-packages (from playwright>=1.18->pytest-playwright<1,>=0.7->civicos-playwright==0.9.0) (3.2.4)
Requirement already satisfied: typing-extensions in .\.venv\Lib\site-packages (from pyee<14,>=13->playwright>=1.18->pytest-playwright<1,>=0.7->civicos-playwright==0.9.0) (4.14.1)
Requirement already satisfied: charset_normalizer<4,>=2 in .\.venv\Lib\site-packages (from requests>=2.9->pytest-base-url<3.0.0,>=1.0.0->pytest-playwright<1,>=0.7->civicos-playwright==0.9.0) (3.4.3)
Requirement already satisfied: idna<4,>=2.5 in .\.venv\Lib\site-packages (from requests>=2.9->pytest-base-url<3.0.0,>=1.0.0->pytest-playwright<1,>=0.7->pytest-playwright==0.9.0) (3.10)
Requirement already satisfied: urllib3<3,>=1.26 in .\.venv\Lib\site-packages (from requests>=2.9->pytest-base-url<3.0.0,>=1.0.0->pytest-playwright<1,>=0.7->pytest-playwright==0.9.0) (2.5.0)
Requirement already satisfied: certifi>=2017.4.17 in .\.venv\Lib\site-packages (from requests>=2.9->pytest-base-url<3.0.0,>=1.0->pytest-playwright<1,>=0.7->pytest-playwright==0.9.0) (2025.8.3)
Building wheels for collected packages: civicos-playwright
  Building editable for civicos-playwright (pyproject.toml): started
  Building editable for civicos-playwright (pyproject.toml): finished with status 'done'
  Created wheel for civicos-playwright: filename=civicos_playwright-0.1.0-0.editable-py3-none-any.whl size=2897 sha256=c0deb01bab37274a8f42e47c6732c8a72a97e7893d27899c31b4052005b5f3df
  Stored in directory: C:\Users\GODxDEMON\AppData\Local\Temp\pip-ephem-wheel-cache-bp3o921h\wheels\51\f0\46\c4028cca95c4d1c493eb4eb5359369374e71bda58ca4192056
Successfully built civicos-playwright
Installing collected packages: civicos-playwright
  Attempting uninstall: civicos-playwright
    Found existing installation: civicos-playwright 0.1.0
    Uninstalling civicos-playwright-0.1.0:
      Successfully uninstalled civicos-playwright-0.1.0
Successfully installed civicos-playwright-0.1.0

[notice] A new release of pip is available: 26.1.2 -> 26.2.1
[notice] To update, run: D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pip install --upgrade pip
```

Result: exit code 0.

Command:

```powershell
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m playwright install chromium
```

Raw output: *(empty)*

Result: exit code 0.

## 3. Targeted README command

Command (first invocation, tool timeout 120 seconds):

```powershell
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest test_inspections.py test_vehicles.py test_incidents.py --browser chromium
```

Raw output before external timeout:

```text
============================= test session starts =============================
platform win32 -- Python 3.13.14, pytest-8.4.2, pluggy-1.6.0
rootdir: D:\Project\CivicOS\playwright
configfile: pyproject.toml
plugins: base-url-2.1.0, playwright-0.9.0
collected 18 items

test_inspections.py ....                                                 [ 22%]
test_vehicles.py ...                                                     [ 38%]
test_incidents.py
```

The command was rerun unchanged with a 600-second execution allowance.

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
test_incidents.py F.                                                     [100%]

================================== FAILURES ===================================
_ test_incident_full_lifecycle_approves_and_rejects_commands[mobile-chromium] _

app = <pages.CivicApp object at 0x0000025A9BAE4590>
accounts = {'commander': TestAccount(key='commander', user_id='e2e-user-commander', email='truong@civicos.local', password='civic...ocal', password='civicos-dev', name='Cán bộ hiện trường', role='field_officer', organization_id='unit-nghia-tru'), ...}

    def test_incident_full_lifecycle_approves_and_rejects_commands(
        app: CivicApp, accounts: dict[str, object]
    ) -> None:
        app.login(accounts["commander"])
        app.create_incident(f"lifecycle-{uuid.uuid4().hex[:8]}")

        app.incident_status("received")
        app.incident_classify()
        app.incident_start_verification()

        app.incident_request_resolution()
        app.incident_reject("verifying")

        app.incident_request_resolution()
        app.incident_approve("resolved")

        app.incident_request_close()
        app.incident_reject("resolved")

        app.incident_request_close()
>       app.incident_approve("closed")

test_incidents.py:33:
pages.py:203: in incident_approve
    self.incident_status(expected_status)
_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ 

self = <pages.CivicApp object at 0x0000000000000000>, status = "closed"
>       expect(self.page.get_by_text(status, exact=True).last).to_be_visible()
E       AssertionError: Locator expected to be visible
E       Actual value: None
E       Error: element(s) not found
E       Call log:
E         - Expect "to_be_visible" get_by_text("closed", exact=True).last with timeout 5000ms
E         - waiting for get_by_text("closed", exact=True).last

E       Aria snapshot:
E       - main:
E         - link "← Hàng đợi":
E           - /url: /incidents
E         - link "Assignment":
E         - paragraph: Trưởng Công an xã
E         - paragraph: commander · truong@civicos.local
E         - button "Đăng xuất"
E         - paragraph: Incident
E         - heading "bf7c16e5-92f0-445c-a5ed-9bc3959d33ee" [level=1]
E         - paragraph: "Incident E2E lifecycle-bd357fba: kiểm tra luồng nghiệp vụ qua giao diện."
E         - button "Làm mới"
E         - text: resolved
E         - region "Tóm tắt Incident":
E         - heading "Timeline" [level=2]
E         - list:
E           - listitem:
E             - paragraph: IncidentRegistered
E             - paragraph: v1 · 18:46:52 20/9/2026
E           - listitem:
E             - paragraph: IncidentClassified
E         - button "Gửi yêu cầu đóng Incident"
E         - heading "Thao tác Incident" [level=2]
E         - alert

pages.py:173: AssertionError

=========================== short test summary info ============================
FAILED test_incidents.py::test_incident_full_lifecycle_approves_and_rejects_commands[mobile-chromium]
================== 1 failed, 17 passed in 250.17s (0:04:10) ===================
```

Observed failure: 17 passed, 1 failed, 18 collected. Expected `closed` to be visible after the final approval; actual UI remained at `resolved` and the locator found no exact `closed` text.

Per instruction, verification stopped after this failure. The requested Prettier check, README command/path/environment/artifact/cleanup audit, and restricted diff audit were not run.

## 3. Ticket07 rerun after Developer diagnosis

Execution environment: command launched from `/mnt/d/Project/CivicOS/playwright`, invoking the requested Windows-native executable path `D:\Project\CivicOS\playwright\.venv\Scripts\python.exe` (the shell environment exposed the same Windows Python runtime as `D:\Project\CivicOS\playwright`). No source or test files were modified.

### 3.1 Single failing node

Command:

```powershell
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest "test_incidents.py::test_incident_full_lifecycle_approves_and_rejects_commands[mobile-chromium]" --browser chromium
```

Raw output:

```text
============================= test session starts =============================
platform win32 -- Python 3.13.14, pytest-8.4.2, pluggy-1.6.0
rootdir: D:\Project\CivicOS\playwright
configfile: pyproject.toml
plugins: base-url-2.1.0, playwright-0.9.0
collected 1 item

test_incidents.py .                                                      [100%]

============================= 1 passed in 33.11s ==============================
```

Result: exit code 0; 1 passed, 0 failed. The previously failing node passed on this rerun.

### 3.2 Targeted README command (one invocation after single-node pass)

Command:

```powershell
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest test_inspections.py test_vehicles.py test_incidents.py --browser chromium
```

Raw output before execution-harness timeout:

```text
============================= test session starts =============================
platform win32 -- Python 3.13.14, pytest-8.4.2, pluggy-1.6.0
rootdir: D:\Project\CivicOS\playwright
configfile: pyproject.toml
plugins: base-url-2.1.0, playwright-0.9.0
collected 18 items

test_inspections.py ....                                                 [ 22%]
test_vehicles.py ...                                                     [ 38%]
test_incidents.py
```

Result: the shell tool terminated the invocation after its 120-second limit. No pytest exit code was returned. At termination, 7 tests had completed visibly (4 inspection + 3 vehicle passes); the incident module had started and had not emitted a completion result. This is an incomplete run, not a pytest failure report.

### 3.3 Artifacts and cleanup

Observed artifact directory for the single-node run:

```text
D:\Project\CivicOS\playwright\test-results\test_incidents_py__test_incident_full_lifecycle_approves_and_rejects_commands_mobile_chromium_\failure-0.png
D:\Project\CivicOS\playwright\test-results\test_incidents_py__test_incident_full_lifecycle_approves_and_rejects_commands_mobile_chromium_\trace.zip
D:\Project\CivicOS\playwright\test-results\test_incidents_py__test_incident_full_lifecycle_approves_and_rejects_commands_mobile_chromium_\video\
```

No additional artifacts were emitted by the timed-out targeted invocation before termination. Process check after termination found no remaining `python.exe`, `pytest`, or Playwright process. Existing artifacts were retained; no cleanup deletion was performed.

## 4. Exact targeted README command rerun with 600-second allowance

Execution environment: `/mnt/d/Project/CivicOS/playwright`; the requested Windows-native Python executable was invoked through the available shell as `D:\Project\CivicOS\playwright\.venv\Scripts\python.exe`. The command was allowed up to 600 seconds and completed in 3.23 seconds; it was not killed by the tool timeout.

Command:

```powershell
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest test_inspections.py test_vehicles.py test_incidents.py --browser chromium
```

Raw stdout/stderr (combined by the test runner):

```text
============================= test session starts =============================
platform win32 -- Python 3.13.14, pytest-8.4.2, pluggy-1.6.0
rootdir: D:\Project\CivicOS\playwright
configfile: pyproject.toml
plugins: base-url-2.1.0, playwright-0.9.0
collected 18 items

test_inspections.py EEEE                                                 [ 22%]
test_vehicles.py EEE                                                     [ 38%]
test_incidents.py EE                                                     [ 50%]
test_inspections.py EEEE                                                 [ 72%]
test_vehicles.py EEE                                                     [ 88%]
test_incidents.py EE                                                     [100%]

==================================== ERRORS ====================================
_ ERROR at setup of test_establishment_create_edit_and_schedule[desktop-chromium] _

E           RuntimeError: Command failed (1): npm.cmd run prisma:generate
E           > civic-os@0.1.0 prisma:generate
E           > prisma generate
E
E           Prisma schema loaded from prisma\schema.prisma
E           Environment variables loaded from .env
E           Error:
E           EPERM: operation not permitted, rename 'D:\Project\CivicOS\node_modules\.prisma\client\query_engine-windows.dll.node.tmp2952' -> 'D:\Project\CivicOS\node_modules\.prisma\client\query_engine-windows.dll.node'

conftest.py:263: RuntimeError

[The same setup error was emitted for each of the 18 collected items.]

=========================== short test summary info ============================
ERROR test_inspections.py::test_establishment_create_edit_and_schedule[desktop-chromium]
ERROR test_inspections.py::test_inspection_offline_checklist_finding_evidence_completion_and_recurring_schedule[desktop-chromium]
ERROR test_inspections.py::test_inspection_recommendation_can_be_approved_and_rejected[desktop-chromium]
ERROR test_inspections.py::test_stale_offline_inspection_command_is_rejected[desktop-chromium]
ERROR test_vehicles.py::test_vehicle_registry_observation_match_confirm_verify_evidence_and_escalate[desktop-chromium]
ERROR test_vehicles.py::test_duplicate_offline_vehicle_command_is_idempotent[desktop-chromium]
ERROR test_vehicles.py::test_vehicle_observation_is_denied_to_an_unassigned_role[desktop-chromium]
ERROR test_incidents.py::test_incident_full_lifecycle_approves_and_rejects_commands[desktop-chromium]
ERROR test_incidents.py::test_incident_projection_tracks_the_ui_lifecycle[desktop-chromium]
ERROR test_inspections.py::test_establishment_create_edit_and_schedule[mobile-chromium]
ERROR test_inspections.py::test_inspection_offline_checklist_finding_evidence_completion_and_recurring_schedule[mobile-chromium]
ERROR test_inspections.py::test_inspection_recommendation_can_be_approved_and_rejected[mobile-chromium]
ERROR test_inspections.py::test_stale_offline_inspection_command_is_rejected[mobile-chromium]
ERROR test_vehicles.py::test_vehicle_registry_observation_match_confirm_verify_evidence_and_escalate[mobile-chromium]
ERROR test_vehicles.py::test_duplicate_offline_vehicle_command_is_idempotent[mobile-chromium]
ERROR test_vehicles.py::test_vehicle_observation_is_denied_to_an_unassigned_role[mobile-chromium]
ERROR test_incidents.py::test_incident_full_lifecycle_approves_and_rejects_commands[mobile-chromium]
ERROR test_incidents.py::test_incident_projection_tracks_the_ui_lifecycle[mobile-chromium]
======================== 18 errors in 3.23s ========================
```

Result: pytest exit code `1`; collection `18`; passed `0`; failed `0`; errors `18`; duration `3.23s` (`0:00:03`). The failure occurred during the session database setup command `npm.cmd run prisma:generate`, before test bodies ran. The exact error was `EPERM: operation not permitted` while renaming the Prisma Windows query engine temporary file.

Reproduction and expected/actual:

1. Run the exact command above from `D:\Project\CivicOS\playwright`.
2. Expected: collect and execute 18 tests, producing a pytest completion result.
3. Actual: collection completed, then all 18 items errored during setup because `prisma generate` could not rename `query_engine-windows.dll.node.tmp2952` to `query_engine-windows.dll.node`.

Artifacts: no `playwright/test-results/` directory or service-log artifacts were present after this invocation.

Cleanup: the process completed normally; post-run process inspection found no remaining pytest, Playwright, Chromium, or Next processes. No cleanup deletion was performed.

Because this exact command produced real pytest errors, the requested `npx.cmd prettier --check playwright/README.md` check and README/pyproject/diff audit were not run.

## 5. Ticket07 rerun after Prisma/stale-harness cleanup

Execution environment: Windows-native PowerShell via `powershell.exe`, working directory `D:\Project\CivicOS\playwright`, tool/process timeout `700000 ms`.

### 5.1 Exact targeted command

Command:

```powershell
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest test_inspections.py test_vehicles.py test_incidents.py --browser chromium
```

Raw output:

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

======================= 18 passed in 244.68s (0:04:04) ========================
```

Result: exit code `0`; 18 collected, 18 passed, 0 failed, 0 errors.

### 5.2 README format check

Command:

```powershell
npx.cmd prettier --check playwright/README.md
```

Raw output:

```text
Checking formatting...
All matched files use Prettier code style!
```

Result: exit code `0`.

### 5.3 Native Python TOML/version parse

Command:

```powershell
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -c "import pathlib, tomllib, sys; p=pathlib.Path(r'playwright/pyproject.toml'); data=tomllib.loads(p.read_text(encoding='utf-8')); version=data['project']['version']; requirement=data['project']['requires-python']; print(f'python={sys.version}'); print(f'version={version}'); print(f'requires-python={requirement}'); assert requirement.replace(' ','') == '>=3.13'; assert tuple(sys.version_info[:2]) >= (3,13)"
```

Raw output:

```text
python=3.13.14 (tags/v3.13.14:fd17997, Jun 10 2026, 13:03:48) [MSC v.1944 64 bit (AMD64)]
version=0.1.0
requires-python=>=3.13
```

Result: exit code `0`; native Python parse and Python `>=3.13` assertion passed.

### 5.4 README/evidence and cleanup audit

- README setup commands (`pip install -e .`, `playwright install chromium`) have exit-code-0 evidence in §2 above.
- README targeted command has exit-code-0 evidence in §5.1 above.
- README full command (`pytest --browser chromium`, 32 items) has 32-pass evidence in `.brain/evidence/05-windows-next-transport-harness/tests.md:219-249` and `.brain/evidence/07-python-313-readme/changes.md:19-20`.
- README contains no Python 3.12 assertion. Its WSL/Linux text is an explicit prohibition, not a standard execution path; no WSL/Linux path is documented as standard.
- Ticket-scoped changed paths are `playwright/pyproject.toml`, `playwright/README.md`, and `.brain/evidence/07-python-313-readme/**`. The working tree also contains unrelated pre-existing changes outside this ticket (reported by `git status --short`); none were changed by this run.
- Cleanup audit: `STALE_PROCESSES=none`; `LISTENERS=none on 3000,3001,4317`.
- Docker/DB preserved: `civicos-postgres-1 Up 7 hours`; `pg_isready` reported `/var/run/postgresql:5432 - accepting connections`; databases listed were `civicos` and `postgres`.

## 6. AC3 follow-up verification

Execution environment: Linux shell at `/mnt/d/Project/CivicOS`; no source, orchestration, or generated files were modified by this verification.

### 6.1 Requested Prettier command

Command:

```text
npx.cmd prettier --check playwright/README.md
```

Raw result:

```text
/mnt/c/Program Files/nodejs/npx.cmd: line 13: unexpected EOF while looking for matching `''
```

Result: exit code `2`; the Windows `.cmd` wrapper is not executable by this Linux shell.

Supplemental native command:

```text
npx prettier --check playwright/README.md
```

Raw output:

```text
Checking formatting...
All matched files use Prettier code style!
```

Result: exit code `0`.

### 6.2 TOML/version check

Command:

```text
python3 -c "import pathlib,tomllib; p=pathlib.Path('playwright/pyproject.toml'); data=tomllib.loads(p.read_text(encoding='utf-8')); value=data['project']['requires-python']; print('requires-python:', value); assert value == '>=3.13'"
```

Raw output:

```text
requires-python: >=3.13
```

Result: exit code `0`; TOML parsed and `requires-python` is exactly `>=3.13`.

### 6.3 README/harness/path and command audit

Checks: `13 PASS, 0 FAIL`.

```text
PASS: relative test-results artifacts
PASS: absolute Windows test-results artifacts
PASS: nested playwright\playwright\test-results absent
PASS: harness roots artifacts at PLAYWRIGHT_ROOT/test-results
PASS: harness service logs under test-results/services
PASS: harness trace under artifact_dir/trace.zip
PASS: harness failure png under artifact_dir
PASS: Python 3.12 minimum absent
PASS: WSL/Linux standard execution path absent
PASS: setup command present
PASS: browser install command present
PASS: targeted command present
PASS: full command present
```

Existing evidence audit: setup commands pass in §2; targeted command passes with `18 collected, 18 passed` in §5.1; full command has 32-pass evidence referenced in §5.4.

### 6.4 Scoped diff audit

Tracked diff paths under the requested scope:

```text
playwright/README.md
playwright/pyproject.toml
```

The evidence update is `.brain/evidence/07-python-313-readme/tests.md`. No source, orchestration, or generated changes are part of the Ticket07 scoped diff. The working tree contains unrelated pre-existing changes outside this ticket.

## 7. Retest after native Prettier diagnosis

### 7.1 Exact native PowerShell format command

Command:

```text
powershell.exe -NoProfile -NonInteractive -Command "Set-Location 'D:\Project\CivicOS'; npx.cmd prettier --check playwright/README.md"
```

Raw result:

```text
Checking formatting...
All matched files use Prettier code style!
```

Result: exit code `0`.

### 7.2 Ticket07 README/declaration recheck

- `playwright/pyproject.toml` parses successfully and declares exactly
  `requires-python = ">=3.13"`.
- README states Python 3.13+ as the minimum and contains no Python 3.12
  minimum claim.
- README explicitly prohibits WSL/Linux as the standard execution path; no
  WSL/Linux path is documented as the standard path.
- Setup evidence is present for editable install and Chromium installation,
  both exit code `0` in §2.
- Targeted command evidence is present for the exact documented command:
  `18 collected, 18 passed`, exit code `0`, in §5.1.
- Full command evidence is present for the exact documented command:
  `32 passed`, exit code `0`, in §5.4 / the cited Ticket05 evidence.
- Artifact paths are documented both relative to
  `D:\Project\CivicOS\playwright` (`test-results/services/...` and
  `test-results/`) and with the corresponding absolute
  `D:\Project\CivicOS\playwright\test-results\...` paths.
- Scoped tracked diff paths are `playwright/README.md` and
  `playwright/pyproject.toml`; this evidence file is the only Ticket07
  evidence update. No source, orchestration, or test files were edited.

Retest result: **PASS**.
