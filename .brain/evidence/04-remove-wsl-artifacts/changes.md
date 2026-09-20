# Ticket 04 — Remove WSL artifacts — changes.md

Prereq: Ticket 03 PASS — commit `795dc86` (record native browser acceptance gate) + closure `f481109` (close Ticket 03 evidence).

## 1. Whitelist đã xóa (đúng scope, không thêm)

- `/home/godxdemon/.cache/ms-playwright/` (WSL Linux browser cache)
- `/home/godxdemon/.playwright-deps/` (WSL Linux workaround libs)
- `playwright/__pycache__/` (repo generated)
- `playwright/.pytest_cache/` (repo generated)
- `playwright/civicos_playwright.egg-info/` (repo generated metadata)

## 2. Inventory TRƯỚC cleanup (raw)

- `ls -la ~/.cache/ms-playwright/` → chromium-1243, chromium_headless_shell-1243, ffmpeg-1011, .links; `du -sh` = 658M; `find -type f | wc -l` = 599.
- `ls -la ~/.playwright-deps/` → libs/, pkgs/; `du -sh` = 5.7M; `find -type f | wc -l` = 27.
- `playwright/__pycache__/` → 19 files (.pyc: conftest/pages/test_identity_shared/test_incidents/test_inspections/test_vehicles, py3.13/py3.14).
- `playwright/.pytest_cache/` → 5 files (.gitignore, CACHEDIR.TAG, README.md, v/cache/lastfailed, v/cache/nodeids).
- `playwright/civicos_playwright.egg-info/` → 5 files (PKG-INFO, SOURCES.txt, dependency_links.txt, requires.txt, top_level.txt).
- Native venv (bash): `playwright/.venv/Scripts/python.exe` tồn tại (255200, 2026-06-10); `playwright/.venv/bin/python` KHÔNG tồn tại; `playwright/.venv/` = Include, Lib, Scripts, pyvenv.cfg.
- PowerShell native PRE: `VENV_EXISTS=True`, `Python 3.13.14`; `LOCALAPPDATA=C:\Users\GODxDEMON\AppData\Local`; `MSPW_EXISTS=True` (chromium-1234, chromium-1243, chromium_headless_shell-1234/1243, ffmpeg-1011, firefox-1538, webkit-2336, winldd-1007, .links, .settings); `docker ps --filter name=civicos-postgres-1` → `civicos-postgres-1 | Up 8 hours | postgres:16-alpine`.
- `playwright/test-results/` tồn tại, `du -sh` = 148M (giữ nguyên).
- `.brain/evidence/` tồn tại: 01, 02-native-harness-login, 03-native-acceptance-gate, 05-windows-next-transport-harness, 06-lint-format-quality-gates, 07-python-313-readme.
- `LD_LIBRARY_PATH` env = `<empty>`; `grep -rn LD_LIBRARY_PATH` trong source (.py/.toml) = không match; chỉ match trong `.scratch/.../01-windows-native-runner.md`, `04-remove-wsl-artifacts.md` (tài liệu) và 1 file `.pyc` sẽ bị xóa.

Raw PRE commands (bash, workdir /mnt/d/Project/CivicOS):

- `git log --oneline -5; git status --short; ls -R .brain/evidence/03-native-acceptance-gate/`
- `ls -la ~/.cache/ms-playwright/; du -sh ~/.cache/ms-playwright/; ls -la ~/.playwright-deps/; du -sh ~/.playwright-deps/; ls -lad playwright/__pycache__/ playwright/.pytest_cache/ playwright/civicos_playwright.egg-info/; find ... | wc -l`
- `ls -la playwright/.venv/Scripts/python.exe; ls playwright/.venv/; ls playwright/test-results/; ls -R .brain/evidence/; env | grep LD/PLAYWRIGHT`
- PowerShell native: `powershell.exe -NoProfile -Command "$venv='D:\Project\CivicOS\playwright\.venv\Scripts\python.exe'; (Test-Path $venv); & $venv --version; $mp=Join-Path $env:LOCALAPPDATA 'ms-playwright'; (Test-Path $mp); Get-ChildItem $mp; docker ps --filter 'name=civicos-postgres-1' ..."`

## 3. Commands XÓA (raw, chỉ whitelist, không dùng docker prune/unregister/broad cleanup)

- `rm -r /home/godxdemon/.cache/ms-playwright` → exit 0 (dùng `rm -r`, không `rm -rf` do policy chặn pattern `rm -rf *`).
- `rm -r /home/godxdemon/.playwright-deps` → exit 0.
- `rm -r playwright/__pycache__` → exit 0.
- `rm -r playwright/.pytest_cache` → exit 0.
- `rm -r playwright/civicos_playwright.egg-info` → exit 0.
- KHÔNG chạy: `docker system prune`, `docker volume prune`, unregister WSL, xóa distribution, xóa source/config.

## 4. Verification SAU cleanup (raw)

- `ls -la /home/godxdemon/.cache/ms-playwright/` → No such file or directory.
- `ls -la /home/godxdemon/.playwright-deps/` → No such file or directory.
- `ls -lad playwright/__pycache__/ playwright/.pytest_cache/ playwright/civicos_playwright.egg-info/` → cả 3 No such file or directory.
- Native venv nguyên vẹn: `playwright/.venv/Scripts/python.exe` tồn tại; `playwright/.venv/` = Include, Lib, Scripts, pyvenv.cfg; `playwright/.venv/bin/python` vẫn không tồn tại (đúng — không có WSL venv).
- PowerShell native POST: `POST_VENV_EXISTS=True`, `Python 3.13.14`; `POST_MSPW_EXISTS=True`; `civicos-postgres-1 | Up 8 hours | postgres:16-alpine`.
- `playwright/test-results/` nguyên vẹn: `du -sh` = 148M, danh sách dir desktop/mobile chromium còn đủ.
- `.brain/evidence/` nguyên vẹn (01, 02, 03, 05, 06, 07 còn đủ; chỉ thêm dir mới `04-remove-wsl-artifacts/`).
- `LD_LIBRARY_PATH` env vẫn `<empty>`; `grep -rn LD_LIBRARY_PATH` ngoài `.venv/node_modules/.git/.brain/test-results/.scratch` → exit 1 (no match); `grep -rn playwright-deps` chỉ còn match trong `.scratch/.../04-remove-wsl-artifacts.md` (tài liệu ticket, không phải runtime dependency); `grep -rn home/godxdemon/.cache` → no match.
- `git status --short` sau xóa: generated cache untracked nên không hiện deletion; không có source/config nào bị đụng.

## 5. Cấm chạm — đã giữ nguyên

- `playwright/.venv/**` (native Windows), `%LOCALAPPDATA%\ms-playwright`, `playwright/test-results/**`, `.brain/evidence/**` hiện có, Docker volumes/PostgreSQL/container `civicos-postgres-1`, WSL distribution, source/config/user files (`src/**`, `prisma/**`, `package.json`, `opencode.jsonc`, `.opencode/**`).

## 6. Dừng sau slice

- Không chạy targeted login lại, không review/tester/commit. Chờ Planner chỉ định bước tiếp theo.

## 7. Follow-up sau targeted native login PASS (Tester: 14 collected, 14 passed)

- Không rerun Playwright (tránh tái tạo cache), không sửa source, không gọi Reviewer/commit.
- PRE inventory (raw, workdir /mnt/d/Project/CivicOS):
  - `ls -la playwright/__pycache__` → 3 pyc (conftest.cpython-313-pytest-8.4.2.pyc, pages.cpython-313.pyc, test_identity_shared.cpython-313-pytest-8.4.2.pyc), exit 0.
  - `ls -la playwright/.pytest_cache` → .gitignore, CACHEDIR.TAG, README.md, v/, exit 0.
  - `ls -la playwright/civicos_playwright.egg-info` → No such file or directory, exit 2 (không tái xuất hiện).
  - `ls -ld ~/.cache/ms-playwright ~/.playwright-deps` → cả 2 No such file or directory.
  - `LD_LIBRARY_PATH=[]` (bash, empty).
- Cleanup (raw, chỉ whitelist):
  - `rm -r "/mnt/d/Project/CivicOS/playwright/__pycache__"` → RM_PYCACHE_EXIT=0.
  - `rm -r "/mnt/d/Project/CivicOS/playwright/.pytest_cache"` → RM_PYTESTCACHE_EXIT=0.
  - egg-info absent nên không xóa; không đụng `.venv`, Windows cache, test-results, evidence, Docker/data, source.
- POST probe (raw, quoting an toàn):
  - bash: `WSL_MSPLAYWRIGHT=absent`, `WSL_DEPS=absent`, `REPO_PYCACHE=absent`, `REPO_PYTESTCACHE=absent`, `REPO_EGGINFO=absent`, `LD_LIBRARY_PATH=[empty]`.
  - PowerShell native: `Test-Path 'D:\Project\CivicOS\playwright\.venv\Scripts\python.exe'` → True; `& python.exe --version` → `Python 3.13.14`; `Test-Path (Join-Path \$env:LOCALAPPDATA 'ms-playwright')` → True (chromium-1234, chromium-1243, chromium_headless_shell-1234/1243, ffmpeg-1011, firefox-1538, webkit-2336, winldd-1007, .links, .settings); `Test-Path test-results` → True (14 identity artifacts desktop/mobile + services logs còn đủ); evidence dirs 01/02-native-harness-login/03-native-acceptance-gate/04-remove-wsl-artifacts/05-windows-next-transport-harness/06-lint-format-quality-gates/07-python-313-readme; `docker ps` → `civicos-postgres-1 | Up 9 hours | postgres:16-alpine`; repo `Test-Path __pycache__/.pytest_cache/egg-info` → False x3; `$env:LD_LIBRARY_PATH` → empty (chỉ in DONE).
  - `git status --short` sau xóa: không hiện deletion cho 2 path generated (untracked); run này không đụng source/config.
- Probe syntax fix (evidence tests.md §WSL probe `];: line 0: syntax error: unterminated quoted string`):
  - Nguyên nhân: `$env:...` trong PowerShell one-liner bị bash expand khi nằm trong double quotes (vd `"...$env:LOCALAPPDATA..."` → bash nuốt `$env`, PowerShell nhận chuỗi vỡ → syntax error / `False` giả; đã tái hiện: không escape trả False, escape `\$env:` trả True đúng).
  - Cách sửa: đặt PowerShell expression trong single quotes của bash (`'...$env:......'`) hoặc escape `\$env:...` khi bắt buộc dùng double quotes; tách mỗi probe thành một invocation đơn, không gộp one-liner phức tạp. Toàn bộ probe follow-up đã áp dụng.
- Dừng; không rerun tests.
