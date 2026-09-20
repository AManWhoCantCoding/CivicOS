# Ticket 04 — Tester evidence

## Targeted suite

Command run from native PowerShell, working directory `D:\Project\CivicOS\playwright`:

```text
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest test_identity_shared.py --browser chromium
```

Raw result:

```text
============================= test session starts =============================
platform win32 -- Python 3.13.14, pytest-8.4.2, pluggy-1.6.0
rootdir: D:\Project\CivicOS\playwright
configfile: pyproject.toml
plugins: base-url-2.1.0, playwright-0.9.0
collected 14 items

test_identity_shared.py ..............                                   [100%]

======================== 14 passed in 92.09s (0:01:32) ========================
__EXIT_CODE__=0
```

- Collected: 14
- Passed: 14
- Failed: 0
- Duration: 92.09s (0:01:32)
- Matrix: desktop and mobile (14 total; fixture is parametrized for both)
- Browser: Chromium (`--browser chromium`)
- Browser executable: not emitted by the requested command; no follow-up executable query was run after the post-run failure.
- Artifact root: `D:\Project\CivicOS\playwright\test-results\`
- Observed identity artifact paths under that root included desktop/mobile directories for login, wrong-password login, logout, unassigned incident access, assignment revocation, cross-organization assignment, and worker/projection health. Existing `services\next.log` and `services\worker.log` were also present.

## Required post-run checks

Raw observations from native PowerShell:

```text
Python 3.13.14
ScriptsPythonExists=True
BinPythonExists=False

D:\Project\CivicOS\playwright\__pycache__=True
D:\Project\CivicOS\playwright\.pytest_cache=True
D:\Project\CivicOS\playwright\civicos_playwright.egg-info=False

Path=C:\Users\GODxDEMON\AppData\Local\ms-playwright
Exists=True

Process=

NAME=civicos-postgres-1 STATUS=Up 9 hours IMAGE=postgres:16-alpine
STATUS=running RUNNING=true MOUNTS=[{"Type":"volume","Name":"civicos_civicos-postgres","Source":"/var/lib/docker/volumes/civicos_civicos-postgres/_data","Destination":"/var/lib/postgresql/data","Driver":"local","Mode":"rw","RW":true}]
/var/run/postgresql:5432 - accepting connections
```

WSL state raw output showed:

```text
* docker-desktop   Running   2
  Ubuntu           Running   2
```

The WSL artifact probe itself emitted this raw shell-quoting error and therefore did not produce valid absence results:

```text
];: line 0: syntax error: unterminated quoted string
```

The process/listener query produced no rows after the header. No `LD_LIBRARY_PATH` value was present in the native PowerShell process (`Process=`).

## Failure / stopping condition

Post-run cleanup checks found the requested repo artifacts present:

```text
D:\Project\CivicOS\playwright\__pycache__=True
D:\Project\CivicOS\playwright\.pytest_cache=True
```

Per instruction, testing stopped on this failure. No source was edited, no additional cleanup was performed, and no Developer/Reviewer/commit was invoked.

## Final read-only verification after generated-cache deletion

Playwright was not rerun. The previously recorded targeted native login result remains the post-main-WSL-cleanup result: 14 collected, 14 passed. No files were modified or deleted by this verification.

### Raw native PowerShell probe

Command:

```text
powershell.exe -NoLogo -NoProfile -NonInteractive -Command '$ErrorActionPreference="Continue"; ...'
```

Raw output:

```text
--- native python ---
Python 3.13.14
NativePythonExists=True
BinPythonExists=False
--- native paths ---
LOCALAPPDATA_ms-playwright=True
test-results=True
brain-evidence=True
--- browser executables ---
C:\Users\GODxDEMON\AppData\Local\ms-playwright\chromium-1234\chrome-win64\chrome.exe
C:\Users\GODxDEMON\AppData\Local\ms-playwright\chromium-1243\chrome-win64\chrome.exe
--- native process/listeners ---
No matching Playwright/pytest/python/chrome process was returned.
Native listeners included existing system/application listeners, including [::1]:5432 and 127.0.0.1:6432; no test-specific listener was identified.
--- docker ---
NAME=civicos-postgres-1 STATUS=Up 9 hours IMAGE=postgres:16-alpine
STATUS=running RUNNING=true MOUNTS=[{"Type":"volume","Name":"civicos_civicos-postgres","Source":"/var/lib/docker/volumes/civicos_civicos-postgres/_data","Destination":"/var/lib/postgresql/data","Driver":"local","Mode":"rw","RW":true,"Propagation":""}]
/var/run/postgresql:5432 - accepting connections
DockerExit=0
```

### Raw WSL/repository probe

Command ran in the Ubuntu/WSL environment:

```text
printf 'LD_LIBRARY_PATH=%s\n' "${LD_LIBRARY_PATH-}"; probe "$HOME/.cache/ms-playwright" "$HOME/.playwright-deps"; probe repo caches; ps; ss -lntup
```

Raw output:

```text
LD_LIBRARY_PATH=
--- WSL cache paths ---
/home/godxdemon/.cache/ms-playwright ABSENT
/home/godxdemon/.playwright-deps ABSENT
--- repo artifacts ---
/mnt/d/Project/CivicOS/playwright/__pycache__ ABSENT
/mnt/d/Project/CivicOS/playwright/.pytest_cache ABSENT
/mnt/d/Project/CivicOS/playwright/civicos_playwright.egg-info ABSENT
```

The WSL process table contained no Playwright, pytest, Python, Chromium, or browser test process. The listener table contained only existing WSL/system listeners and the existing database port 5432; no test-specific listener was identified.

### Result

PASS — all requested final absence checks passed; native Python and expected native Playwright/browser paths were present; `test-results/`, `.brain/evidence/`, Docker container/database state, and existing listeners remained present/available as observed. Browser executable paths are recorded above, and the artifact root remains `D:\Project\CivicOS\playwright\test-results\`.
