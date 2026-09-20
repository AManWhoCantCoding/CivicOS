# Ticket 07 evidence — Developer changes (/implement)

## Diagnosis (Ticket 05 native runtime, read-only)

- Source: `.brain/evidence/05-windows-next-transport-harness/tests.md`
  (independent Tester verification, 2026-09-20, latest run) + commit
  `35dcf3f` (Ticket 05 evidence close).
- Verified native runtime: `powershell.exe` from
  `D:\Project\CivicOS\playwright` via
  `D:\Project\CivicOS\playwright\.venv\Scripts\python.exe`;
  `platform win32 -- Python 3.13.14, pytest-8.4.2, pluggy-1.6.0`,
  plugins `base-url-2.1.0, playwright-0.9.0`; Windows Node/Chromium;
  `localhost`; Docker Desktop container `civicos-postgres-1` Up,
  `pg_isready` accepting connections; post-run databases `civicos`,
  `postgres`, `template0`, `template1` with `civicos_e2e` absent; no
  `node`/Chromium listeners on ports `3000`, `3001`, `4317`.
- Commands with raw passing evidence (exit code 0, quoted in tests.md):
  `... -m pytest test_inspections.py test_vehicles.py test_incidents.py
  --browser chromium` (18 passed) and `... -m pytest --browser chromium`
  (32 passed, 326.53s). No other command is documented as verified.
- Node 24.18.0 / Windows Chromium build strings are not quoted verbatim
  in Ticket 05 evidence, so the README states "Windows-native Node" and
  "Windows Chromium" without inventing version strings.

## Files changed (this slice only)

- `playwright/pyproject.toml`: `requires-python` `>=3.12` → `>=3.13`;
  no other declaration touched.
- `playwright/README.md`: Python 3.13+ minimum + verified CPython
  3.13.14 (`win32`) runtime; all commands via
  `playwright\.venv\Scripts\python.exe` in Windows PowerShell;
  editable-install + Chromium setup; sweep (18 items) + full (32 items)
  commands only; `CIVICOS_E2E_*` env vars, `civicos_e2e` lifecycle,
  `test-results` artifacts, `taskkill`/port/DB cleanup; explicit
  do-not-run-from-WSL warning. Removed the two single-node `--project`
  examples (no isolated single-node pass in final Ticket 05 evidence)
  and every Python 3.12 minimum claim.

## What was NOT changed

- No `src/**`, `tests/**`, `playwright/conftest.py`,
  `playwright/pages.py`, `playwright/test_*.py`, root `README.md`,
  Ticket 06 config, `.scratch/**`, venv, browser cache, or generated
  artifacts. Pre-existing worktree dirt outside this slice
  (`opencode.jsonc`, `.opencode/agent/reviewer.md`, `Lesson-learned.md`
  deletion, `06-.../files-changed.md`) was left untouched.

## Diagnosis — Tester failure 2026-09-20 (appended, read-only; no source/test/orchestration touched)

- Failure: `python.exe -m pytest test_inspections.py test_vehicles.py test_incidents.py --browser chromium` → `17 passed, 1 failed`; node `test_incidents.py::test_incident_full_lifecycle_approves_and_rejects_commands[mobile-chromium]`; `pages.py:203 incident_approve("closed")` → `incident_status("closed")` timeout 5s; UI aria snapshot stayed `resolved`, button `Gửi yêu cầu đóng Incident` still visible, `alert` empty (no server error text). Incident `bf7c16e5-92f0-445c-a5ed-9bc3959d33ee` (`lifecycle-bd357fba`).
- Verdict: NOT a product/test-contract bug. Flake = timing race in test helper `playwright/pages.py:200-203 incident_approve` (click `Phê duyệt` + immediate `page.reload` with no wait for the POST response). Order/timing/environment, not state/contract.
- Proof (real artifacts, zero edits):
  - `playwright/test-results/test_incidents_py__test_incident_full_lifecycle_approves_and_rejects_commands_mobile_chromium_/trace.zip` → `trace.network`: 10 POST `/api/incidents/<id>/commands`, 8× status 200 + 2× status -1 (aborted): `11:47:03.823` body 62 `{"command":"approve","approvalId":"cmu9r46z4032cwi7ce1q7nk4n"}` and `11:47:08.557` body 62 `{"command":"approve","approvalId":"cmu9r4bh2036swi7cbktrozp5"}`. `resources/*.json` confirm correct fresh approvalIds (stale-approvalId hypothesis falsified).
  - `trace.trace`: approve#1 click-done `220705.673` → reload `220711.899` (6ms); approve#2 click-done `225439.692` → reload `225446.195` (6.5ms). Reload cancels the in-flight fetch client-side.
  - `playwright/test-results/services/next.log`: all 10 POSTs for `bf7c16e5` logged `200` (lines 18433, 18747, 19172, 19300, 19558, 19799, 20010, 20127, 20347, 20451); zero 4xx/5xx for this incident. Prisma trail shows full legal chain `received→classified→verifying→resolved→closed` (versions …→8→9→10, `resolvedAt 11:47:03.929`, final `UPDATE Incident SET status/closedAt` + `Approval status=approved` + `EventRecord/Outbox/SLA` after line 20451). Server committed `closed`; the page had already re-fetched pre-commit `resolved` state and `incident_status` polls stale DOM 5s with no re-fetch → timeout. Approve#1 the commit landed before the post-reload GET → passed by luck.
  - Same 2× status -1 approve pattern in the desktop trace (`11:43:03.386`, `11:43:08.235`) — desktop passed this run by luck. Ticket05 `32 passed` (`.brain/evidence/05-windows-next-transport-harness/tests.md:228-249`) ran byte-identical `src/**`, `playwright/pages.py`, `playwright/test_incidents.py` (`git diff --stat` this slice: only `playwright/README.md`, `playwright/pyproject.toml` + unrelated agent-config files; last harness touch `76c07ef` predates Ticket05 evidence) → same race passed there by luck.
  - Projection/worker: `worker.log` has no entry for `bf7c16e5` and no error for this aggregate; assertion targets the synchronous read-model status, not projection → worker-lag hypothesis falsified.
  - Cleanup (per Tester `tests.md` post-run checks): no `node`/Chromium listeners on 3000/3001/4317, `civicos-postgres-1` Up, `pg_isready` accepting, DBs `civicos,postgres,template0,template1` with `civicos_e2e` absent. Local `playwright/test-results/` failure artifacts (`trace.zip`, `failure-0.png`, `video/`, `services/next.log`, `services/worker.log`) retained as evidence.
- No rerun performed here (needs native PowerShell + ~250s; evidence already conclusive; no retry workaround added per instruction).
- Suggested next (Planner-owned, NOT done): single-node native rerun `D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest "test_incidents.py::test_incident_full_lifecycle_approves_and_rejects_commands[mobile-chromium]" --browser chromium` to confirm flake-pass; any hardening of `incident_approve` (await POST response before reload) is a `pages.py` change banned by Ticket07 and needs a follow-up ticket.

## Verification (Linux session; no Windows venv available here)

- `npx prettier --check playwright/README.md`: pass
  ("All matched files use Prettier code style!").
- `npx prettier --check playwright/pyproject.toml`: no parser inferred
  (exit 2; Prettier has no TOML parser, so the Ticket 06 prettier gate
  does not cover it). Substituted check: `python3` `tomllib` parses the
  file and reports `requires-python = >=3.13`; the TOML diff is one line.
- `grep` over both files: no `3.12` remains; the only `WSL` match is the
  required do-not-run-from-WSL warning.
- `git diff --stat` for this slice: `playwright/README.md` +
  `playwright/pyproject.toml` only (plus this new evidence directory).
- No Windows-native command was (re-)run from this Linux session: the
  venv executable, editable install, Chromium, and pytest runs are
  attested solely by the Ticket 05 raw logs cited above. No secrets
  appear in any cited output; nothing to redact.

## Diagnosis — Prisma EPERM environment failure 2026-09-20 (appended; no source/test/README/pyproject touched)

- Feedback loop (tight, red-capable, native): `powershell.exe -NoProfile -Command "Set-Location 'D:\Project\CivicOS'; npm.cmd run prisma:generate"` (Windows Node v24.18.0, npm 10.9.4 via native PowerShell).
- Reproduce (pre-cleanup): exit 1, `EPERM: operation not permitted, rename 'D:\Project\CivicOS\node_modules\.prisma\client\query_engine-windows.dll.node.tmp19428' -> 'D:\Project\CivicOS\node_modules\.prisma\client\query_engine-windows.dll.node'`. Matches Tester `tests.md` §4 error path (`...tmp2952` → same destination). Pre-cleanup listing showed both `query_engine-windows.dll.node.tmp2952` and `query_engine-windows.dll.node.tmp19428` (each 21182976 bytes, LastWriteTime 9/18/2026 3:54:58 PM) alongside `query_engine-windows.dll.node` (same size/date).
- Hypotheses (ranked, falsifiable): (1) stale `.tmp*` blocks rename — if so, deleting `tmp*` makes generate green; (2) destination `.node` locked by running Node harness servers — if so, generate still EPERM after `tmp*` cleanup while `node.exe` harness processes hold the engine; (3) AV/watcher lock; (4) NTFS ACL/read-only; (5) Prisma Windows rename bug. Tested (1) and probed (2)/(4) read-only.
- Cleanup (ONLY stale generated tmp, native): `powershell.exe -NoProfile -Command "Remove-Item 'D:\Project\CivicOS\node_modules\.prisma\client\query_engine-windows.dll.node.tmp*' -Force"` → listing showed only `query_engine-windows.dll.node` (21182976 bytes). No package lock, source, Docker data, venv, browser cache, or test-results touched. Post-verify `tmp18752` (same size/date) removed the same way; final listing again only the destination `.node`.
- Verify (post-cleanup, no retry/workaround): same native `npm.cmd run prisma:generate` → exit 1, `EPERM: operation not permitted, rename 'D:\Project\CivicOS\node_modules\.prisma\client\query_engine-windows.dll.node.tmp18752' -> 'D:\Project\CivicOS\node_modules\.prisma\client\query_engine-windows.dll.node'`. Hypothesis (1) falsified as sufficient fix.
- Lock evidence (read-only probe): `Get-Process node` listed 8× `node.exe`; `Get-CimInstance Win32_Process` command lines (all `CreationDate` 9/20/2026 ~19:00, stale e2e harness `--e2e-run=7250d3f5f252`): `eslint.js .` (17100), `pm-cli.js run dev -- --hostname 127.0.0.1 --port 4317` (18688), `next dev --hostname 127.0.0.1 --port 4317` (21248), `next/dist/server/lib/start-server.js` (21840), turbopack pool entry (18656), `pm-cli.js run worker -- --e2e-run=7250d3f5f252` (13564), `tsx/dist/cli.mjs src/worker.ts --e2e-run=7250d3f5f252` (6148 + 1892). `attrib` on destination = `A` only (not read-only). No process kill, no destination `.node` delete, no retry loop performed per instruction.
- Verdict: environment failure (stale generated query-engine temp state + destination locked by lingering harness Node servers), not Ticket07 code (`playwright/README.md` + `playwright/pyproject.toml` only). No secrets in outputs; nothing to redact.

## Cleanup — stale harness terminate + prisma:generate green 2026-09-20 (appended; no source/test/README/pyproject touched)

- Feedback loop (tight, red-capable, native): `powershell.exe -NoProfile -Command "Set-Location 'D:\Project\CivicOS'; npm.cmd run prisma:generate"` (Windows PowerShell 5.1 `5.1.26100.9444`, repo root `D:\Project\CivicOS`).
- Pre-cleanup verify (read-only, command line still matches stale harness `--e2e-run=7250d3f5f252` / Next `--port 4317` / eslint; all `CreationDate` 9/20/2026 ~19:00):
  - Raw: `powershell.exe -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Select-Object ProcessId,ParentProcessId,CreationDate,@{N='CommandLine';E={$_.CommandLine}} | Format-Table -AutoSize | Out-String -Width 400"`
  - Result: 8x `node.exe` exactly matching recorded PIDs — `17100` (`eslint.js .`), `18688` (`pm-cli.js run dev -- --hostname 127.0.0.1 --port 4317`), `21248` (`next dev --hostname 127.0.0.1 --port 4317`), `21840` (`next/dist/server/lib/start-server.js`), `18656` (turbopack pool entry), `13564` (`pm-cli.js run worker -- --e2e-run=7250d3f5f252`), `6148` (`tsx/dist/cli.mjs src/worker.ts --e2e-run=7250d3f5f252`), `1892` (`tsx loader src/worker.ts --e2e-run=7250d3f5f252`).
  - Raw: `Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in @(3000,3001,4317) }` + `netstat -ano | Select-String ':(3000|3001|4317)\s'`
  - Result: only `127.0.0.1:4317 LISTENING 21840` (inside stale set); no listeners on `3000`/`3001`.
- Cleanup (ONLY the 8 verified stale PIDs, native PowerShell, no tree needed; no other user process touched):
  - Raw: `powershell.exe -NoProfile -Command "$ids = @(17100,18688,21248,21840,18656,13564,6148,1892); foreach ($id in $ids) { try { Stop-Process -Id $id -Force -ErrorAction Stop; Write-Output \"killed $id\" } catch { Write-Output \"miss $id : $_\" } }; Start-Sleep -Seconds 3; Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Select-Object ProcessId,CommandLine | Format-Table -AutoSize | Out-String -Width 400"`
  - Result: `killed 17100`, `killed 18688`, `killed 21248`, `killed 21840`, `killed 18656`, `killed 13564`, `killed 6148`, `killed 1892`; follow-up `Win32_Process` query returned zero rows.
  - NOT done per instruction: no destination `query_engine-windows.dll.node` delete, no Docker/venv/browser-cache/`test-results` delete.
- Post-cleanup verify (read-only):
  - Raw: `Get-Process node` + `Get-CimInstance Win32_Process -Filter "Name='node.exe'"` → zero rows (no `node.exe` remains).
  - Raw: `Get-NetTCPConnection -State Listen | Where({ $_.LocalPort -in @(3000,3001,4317) })` + `netstat -ano | Select-String ':(3000|3001|4317)\s'` → zero rows (no listeners on `3000`/`3001`/`4317`).
  - Raw: `Get-ChildItem 'D:\Project\CivicOS\node_modules\.prisma\client\query_engine-windows.dll.node*'` → only `query_engine-windows.dll.node` (`21182976` bytes, `9/18/2026 3:54:58 PM`); no `.tmp*` remains.
- Verify (post-cleanup, native from repo root, no retry/workaround):
  - Raw: `powershell.exe -NoProfile -Command "Set-Location 'D:\Project\CivicOS'; npm.cmd run prisma:generate"`
  - Result: exit `0`; `Prisma schema loaded from prisma\schema.prisma`; `Generated Prisma Client (v6.19.3) to .\node_modules\@prisma\client in 176ms`.
- Paths/evidence: repo root `D:\Project\CivicOS`; engine dir `D:\Project\CivicOS\node_modules\.prisma\client\`; evidence file `.brain/evidence/07-python-313-readme/changes.md` (this file). No secrets in any quoted output; nothing to redact.

## Fix — Reviewer AC3 artifact path 2026-09-20 (scoped; README only)

- File: `playwright/README.md:44` — `playwright/test-results/...` →
  `test-results/services/next.log` + `test-results/services/worker.log`
  (`D:\Project\CivicOS\playwright\test-results\services\...` from
  `D:\Project\CivicOS\playwright`); per-node dir below `test-results/`
  (`D:\Project\CivicOS\playwright\test-results\`). Reason: runbook runs
  from `D:\Project\CivicOS\playwright`, old prefix read as nested
  `playwright\playwright\test-results`; harness writes
  `PLAYWRIGHT_ROOT / test-results` (`conftest.py:473,752`).
- No source/orchestration/command/pyproject/ticket/venv/cache touched.
- Verify: `npx --yes prettier --check playwright/README.md` → pass
  (`All matched files use Prettier code style!`, exit 0).
- Diff scope this run: `playwright/README.md` + this evidence file only;
  other worktree dirt left untouched.

## Diagnosis — Tester §6 prettier invocation 2026-09-20 (appended; no README/pyproject/source touched)

- Feedback loop (tight, red-capable): `npx.cmd prettier --check
  playwright/README.md` executed from Linux shell vs Windows-native
  PowerShell; asserts exact Tester symptom (exit 2 `unexpected EOF`)
  vs formatting verdict.
- Reproduce (Linux shell `/mnt/d/Project/CivicOS`, WSL interop):
  - Raw: `npx.cmd prettier --check playwright/README.md`
  - Result: exit `2`; output
    `/mnt/c/Program Files/nodejs/npx.cmd: line 13: unexpected EOF while
    looking for matching \`''`. Matches Tester `tests.md` §6.1 verbatim.
  - Cause on disk: `/mnt/c/Program Files/nodejs/npx.cmd` is a Windows
    batch file (`@ECHO OFF`, `SET "NODE_EXE=%~dp0\node.exe"`, final
    `"%NODE_EXE%" "%NPX_CLI_JS%" %*`); Linux bash parses it as shell
    and chokes on batch quoting at line 13. Supplemental Linux-native
    `npx prettier --check playwright/README.md` → exit `0`,
    `Checking formatting... / All matched files use Prettier code
    style!`.
- Hypotheses (ranked, falsifiable): (1) `.cmd`-via-bash invocation
  issue — if so, same `npx.cmd` args under native PowerShell go green;
  (2) README formatting regression — if so, native prettier also
  fails; (3) prettier version/config drift — if so, both shims fail
  identically. Tested (1)/(2) via native probes below; (3) ruled out
  by identical pass on both native shims.
- Verify (native, via `powershell.exe` interop from same checkout):
  - Raw: `powershell.exe -NoProfile -NonInteractive -Command
    "Set-Location 'D:\Project\CivicOS'; npx.cmd prettier --check
    playwright/README.md"`
  - Result: exit `0`; output `Checking formatting... / All matched
    files use Prettier code style!`.
  - Raw (equivalent): `powershell.exe -NoProfile -NonInteractive
    -Command "Set-Location 'D:\Project\CivicOS'; npm.cmd exec
    prettier -- --check playwright/README.md"`
  - Result: exit `0`; same `All matched files use Prettier code
    style!`.
- Verdict: invocation issue, not README formatting. Hypothesis (1)
  confirmed, (2)/(3) falsified. `playwright/README.md` is
  Prettier-clean under both Windows-native entry points; the exit-2
  path only exists when the Windows `.cmd` wrapper is executed by a
  Linux shell. No source/README/pyproject/reviewer/tester/commit
  touched; scope this run is this evidence file only.
