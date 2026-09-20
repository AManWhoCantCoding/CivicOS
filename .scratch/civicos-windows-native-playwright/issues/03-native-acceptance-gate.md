# Ticket: 03 — Native browser acceptance gate

## Phạm vi

Chạy và ghi nhận toàn bộ Python Playwright acceptance suite bằng Windows-native Python và Chromium cho desktop/mobile; cập nhật runbook chỉ bằng các lệnh đã chạy thành công.

**Blocked by:** 02: Chuẩn hóa harness và xác minh login trên Windows native

## File được phép sửa

- `playwright/test_*.py`: chỉ sửa assertion/test helper cần thiết để kiểm chứng hành vi đã thống nhất; không thêm workaround che lỗi.
- `playwright/README.md`: lệnh PowerShell, prerequisite và artifact location đã xác minh.
- `playwright/test-results/**`: artifact sinh ra trong verification.
- `.brain/evidence/**`: evidence của Tester/Reviewer.

## File cấm sửa

- `src/**`, `app/**`, `prisma/**`, `package.json`, `package-lock.json`.
- `playwright/conftest.py` và các service/orchestration helper sau khi Ticket 02 đã hoàn tất.
- `opencode.jsonc`, `.opencode/**`, `.brain/**` ngoài `.brain/evidence/**`.
- `.scratch/civicos-event-first-roadmap/**`.
- Bất kỳ production code nào chỉ để bỏ qua một acceptance failure.

## Acceptance Criteria

- [x] `python -m pytest --browser chromium` chạy từ PowerShell native và toàn bộ test được collection không lỗi.
- [x] Tất cả test desktop và mobile hiện có pass bằng Windows-native Chromium; không còn test nào phụ thuộc browser binary trong WSL.
- [x] Login hợp lệ, login sai mật khẩu, logout và session boundary đều pass trong suite và có network/session evidence.
- [x] Suite giữ đúng nguyên tắc business flow qua UI; API chỉ được dùng cho seed, cleanup, readiness và health check đã quy định.
- [x] Khi test fail, `test-results/` có service log, screenshot/trace/video tương ứng; khi pass không để artifact cũ gây hiểu nhầm.
- [x] Các quality gate hiện có (`typecheck`, `lint`, `format:check`, database tests, `build` và TypeScript E2E) vẫn pass sau migration harness.
- [x] README chỉ chứa lệnh Windows native đã chạy thành công, không còn hướng dẫn WSL là đường chạy chuẩn.

## Các bước thực hiện

- [x] Bước 1: Chạy targeted login desktop và mobile sau Ticket 02 để xác nhận baseline trước full suite.
- [x] Bước 2: Chạy toàn bộ Python Playwright suite bằng Windows native, ghi collection count, pass/fail count và thời lượng.
- [x] Bước 3: Nếu có failure ngoài phạm vi migration, phân loại bằng evidence và tạo follow-up ticket riêng; không sửa production code trong ticket này.
- [x] Bước 4: Chạy lại targeted login sau khi full suite hoàn tất để loại trừ test-order contamination.
- [x] Bước 5: Chạy toàn bộ TypeScript/database quality gates và lưu kết quả đã redacted vào evidence.
- [x] Bước 6: Cập nhật README bằng đúng lệnh PowerShell đã xác minh và xác nhận Ticket 04 đủ điều kiện bắt đầu.

## Trạng thái

Status: ready-for-agent
