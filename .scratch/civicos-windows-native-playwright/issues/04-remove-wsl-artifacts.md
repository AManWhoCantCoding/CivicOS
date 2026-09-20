# Ticket: 04 — Xóa artifact môi trường Playwright trong WSL

## Phạm vi

Sau khi native acceptance gate đã xanh, xóa đúng các runtime/cache/workaround của Playwright trong WSL; giữ nguyên repo, evidence, Docker data và toàn bộ môi trường Windows native.

**Blocked by:** 03: Native browser acceptance gate

## File được phép sửa

- `~/.cache/ms-playwright/**`: chỉ cache browser Linux của WSL.
- `~/.playwright-deps/**`: chỉ thư viện Linux workaround của WSL.
- `playwright/__pycache__/**`, `playwright/.pytest_cache/**`: generated WSL cache nếu tồn tại.
- `playwright/civicos_playwright.egg-info/**`: generated metadata không cần giữ sau cleanup nếu không còn được native run dùng.
- `.brain/evidence/**`: evidence cleanup/verification.

## File cấm sửa

- `playwright/.venv/**` native Windows, đặc biệt `playwright/.venv/Scripts/**`.
- `%LOCALAPPDATA%\\ms-playwright\\**` và các browser cache Windows native.
- `playwright/test-results/**`.
- Docker volumes, PostgreSQL database/container và repo source.
- `src/**`, `app/**`, `prisma/**`, `package.json`, `package-lock.json`.
- `opencode.jsonc`, `.opencode/**`, `.brain/**` ngoài `.brain/evidence/**`.
- `.scratch/civicos-event-first-roadmap/**`.

## Acceptance Criteria

- [x] `playwright/.venv/Scripts/python.exe` vẫn chạy được sau cleanup và không còn `playwright/.venv/bin/python` của WSL.
- [x] WSL Linux Playwright browser cache tại `~/.cache/ms-playwright` đã được xóa và không còn Linux browser executable được suite sử dụng.
- [x] `~/.playwright-deps` đã được xóa; suite không còn cần `LD_LIBRARY_PATH` workaround.
- [x] Generated WSL cache/metadata trong repo đã được xóa, còn native virtualenv không bị xóa nhầm.
- [x] `playwright/test-results/` được giữ nguyên để bảo toàn evidence trước cleanup.
- [x] Windows-native targeted login chạy lại thành công sau cleanup, chứng minh cleanup không làm hỏng runner.
- [x] Không có WSL distribution, Docker data, user-created configuration hoặc source code nào bị xóa ngoài phạm vi ticket.

## Các bước thực hiện

- [x] Bước 1: Xác nhận Ticket 03 pass và lưu danh sách chính xác các path cần xóa; không dùng `docker system prune`, `docker volume prune` hoặc lệnh xóa WSL distribution.
- [x] Bước 2: Từ PowerShell native, xác nhận native Python/Chromium vẫn tồn tại trước khi cleanup.
- [x] Bước 3: Xóa `~/.cache/ms-playwright`, `~/.playwright-deps` và generated WSL cache đúng phạm vi; không xóa Windows native cache.
- [x] Bước 4: Kiểm tra `test-results/`, `.brain/evidence/`, Docker container/database và native virtualenv vẫn nguyên vẹn.
- [x] Bước 5: Chạy targeted login native một lần nữa và ghi evidence path/browser executable.
- [x] Bước 6: Ghi rõ cleanup đã hoàn tất và không đánh dấu ticket nếu vẫn còn dependency runtime trỏ tới WSL.

## Trạng thái

Status: ready-for-agent
