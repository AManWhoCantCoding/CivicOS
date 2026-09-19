# Ticket: 01 — Bootstrap Windows-native Playwright runner

## Phạm vi

Thay runtime Python/Chromium của bộ acceptance test bằng runtime Windows native. Ticket này chỉ chuẩn bị và kiểm tra runner; chưa thay đổi orchestration của Next.js/worker.

**Blocked by:** None (can start immediately)

## File được phép sửa

- `playwright/README.md`: hướng dẫn setup Windows native nếu cần.
- `playwright/pyproject.toml`: chỉ khi khai báo dependency hiện tại không cài được trên Python Windows 3.13.
- `playwright/.venv/**`: xóa WSL virtualenv cũ và tạo virtualenv Windows native tại cùng đường dẫn.
- `playwright/test-results/**`: artifact/evidence sinh ra khi smoke test.
- `.brain/evidence/**`: evidence của Developer/Tester cho ticket này.

## File cấm sửa

- `src/**`, `app/**`, `prisma/**`, `tests/**`.
- `playwright/conftest.py`, `playwright/pages.py` và các test workflow hiện có.
- `opencode.jsonc`, `.opencode/**`, `.brain/**` ngoài `.brain/evidence/**`.
- `.scratch/civicos-event-first-roadmap/**`.
- Docker volume/database và Windows native browser cache.

## Acceptance Criteria

- [x] Windows Python `3.13.x` đáp ứng yêu cầu `requires-python >=3.12` và được gọi từ PowerShell/Command Prompt native.
- [x] `playwright/.venv/Scripts/python.exe` tồn tại và chạy được; không còn `playwright/.venv/bin/python` của WSL.
- [x] Virtualenv Windows cài thành công `pytest`, `pytest-playwright` và `psycopg` từ dependency declaration của suite.
- [x] Chromium được cài vào Windows native Playwright cache và browser executable là bản Windows, không phải Linux headless shell.
- [x] Một smoke test native mở được Chromium, tạo page, truy cập một URL test và đóng browser không lỗi.
- [x] Smoke test chứng minh process Python và browser đều chạy native Windows; không sử dụng gateway WSL hoặc `LD_LIBRARY_PATH` workaround.

## Các bước thực hiện

- [x] Bước 1: Từ PowerShell native, xác nhận Python 3.13, Node/npm và Docker Desktop khả dụng; ghi lại version vào evidence.
- [x] Bước 2: Xác nhận `playwright/.venv` hiện tại là WSL virtualenv, sau đó xóa đúng virtualenv này theo lựa chọn Q3-B; không xóa repo hoặc test artifacts.
- [x] Bước 3: Tạo lại `playwright/.venv` bằng Windows Python 3.13.
- [x] Bước 4: Cài dependency của suite vào virtualenv Windows và chạy `python -m playwright install chromium`.
- [x] Bước 5: Chạy smoke test bằng Python executable trong `playwright/.venv/Scripts/` và lưu output/artifact vào evidence.
- [x] Bước 6: Chỉ khi mọi acceptance criteria pass, chuyển sang Ticket 02.

## Trạng thái

Status: done
