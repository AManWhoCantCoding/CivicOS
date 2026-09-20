# 07: Nâng minimum Python lên 3.13 và đồng bộ README

**What to build:** Người dùng Windows có một runbook nhất quán cho browser acceptance suite: Python 3.13 trở lên là minimum được khai báo và README chỉ dẫn đúng runtime Windows-native cùng các lệnh đã xác minh.

**Blocked by:** 05: Ổn định Windows-native Next/browser transport và harness

**Status:** done

## Phạm vi

Đồng bộ dependency declaration và tài liệu setup/run của Python Playwright suite theo quyết định Python 3.13 là minimum. Không thay đổi workflow hoặc orchestration; chỉ ghi các lệnh Windows-native đã xác minh sau khi harness ổn định.

## File được phép sửa

- `playwright/pyproject.toml`: nâng `requires-python` lên Python `>=3.13`.
- `playwright/README.md`: cập nhật prerequisite, setup, run, browser, database lifecycle, artifact và cảnh báo không chạy từ WSL.
- `.brain/evidence/07-python-313-readme/**`: evidence của Developer/Tester/Reviewer.

## File cấm sửa

- `src/**`, `tests/**`, `playwright/conftest.py`, `playwright/pages.py`, `playwright/test_*.py`.
- `package.json`, `package-lock.json`, `eslint.config.mjs`, `.prettierignore`, `.gitignore`.
- `README.md` root và các ticket khác trong `.scratch/**`.
- `opencode.jsonc`, `.opencode/**`, `.brain/**` ngoài evidence của ticket này.
- `playwright/.venv/**`, Windows Playwright browser cache, `node_modules/**` và generated test artifacts.

## Acceptance Criteria

- [x] `playwright/pyproject.toml` khai báo Python `>=3.13` và không còn yêu cầu/khẳng định Python 3.12 là minimum.
- [x] `playwright/README.md` ghi rõ Python 3.13+ là minimum, Python 3.13.x là runtime Windows-native đã xác minh, và các lệnh PowerShell dùng `playwright\.venv\Scripts\python.exe`.
- [x] README không đưa WSL/Linux path, gateway hoặc library workaround làm đường chạy chuẩn; các environment variables, database cleanup và artifact locations được mô tả đúng với harness hiện tại.
- [x] Một virtualenv Python 3.13 native cài được package editable và Chromium theo dependency declaration; lệnh collection/smoke được chạy bằng đúng executable trong README.
- [x] Tài liệu không chứa command chưa được chạy thành công và không làm thay đổi source/orchestration của application hoặc harness.

## Các bước thực hiện

- [x] Bước 1: Xác nhận Ticket 05 đã pass và lưu version Python/Node/Chromium cùng các lệnh native đã chạy thành công.
- [x] Bước 2: Đổi `requires-python` sang `>=3.13` trong dependency declaration của suite.
- [x] Bước 3: Cập nhật README để dùng Python 3.13+ làm minimum, ghi runtime 3.13.x đã xác minh và chuẩn hóa toàn bộ command/path theo PowerShell native.
- [x] Bước 4: Tạo hoặc kiểm tra virtualenv Windows Python 3.13, chạy editable install, cài Chromium và chạy collection/smoke bằng executable được tài liệu hóa.
- [x] Bước 5: Kiểm tra README bằng Prettier/format gate và đối chiếu từng command với output evidence đã redacted.
- [x] Bước 6: Ghi evidence, kiểm tra diff chỉ nằm trong declaration/documentation và không sửa các ticket hoặc runtime artifact khác.

## Trạng thái

done
