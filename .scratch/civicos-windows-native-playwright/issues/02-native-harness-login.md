# Ticket: 02 — Chuẩn hóa harness và xác minh login trên Windows native

## Phạm vi

Loại bỏ toàn bộ nhánh orchestration dành riêng cho WSL/Windows interop khỏi browser harness, để Next.js, worker, Prisma migration và Chromium dùng cùng localhost trên Windows native. Khóa lại regression cho luồng login UI.

**Blocked by:** 01: Bootstrap Windows-native Playwright runner

## File được phép sửa

- `playwright/conftest.py`: orchestration Windows native, local host, database lifecycle và process cleanup.
- `playwright/pages.py`: helper login và assertion request/redirect nếu cần.
- `playwright/test_identity_shared.py`: regression assertion cho login/logout.
- `playwright/README.md`: lệnh chạy native harness đã xác minh.
- `playwright/probe_login.py`: xóa throwaway probe sau khi chuyển assertion cần thiết vào test chính.
- `.brain/evidence/**`: evidence của Developer/Tester cho ticket này.
- `playwright/test-results/**`: trace/screenshot/video/log sinh ra khi test.

## File cấm sửa

- `src/**`, `app/**`, `prisma/**`, `package.json`, `package-lock.json`.
- Các test workflow ngoài `playwright/test_identity_shared.py`.
- `opencode.jsonc`, `.opencode/**`, `.brain/**` ngoài `.brain/evidence/**`.
- `.scratch/civicos-event-first-roadmap/**`.
- Windows native virtualenv và Windows native Playwright browser cache.

## Acceptance Criteria

- [x] Harness không còn phụ thuộc vào `WSLENV`, `/mnt/`, `ip route`, gateway `172.28.0.1`, Linux library path hoặc process cleanup chỉ cần thiết khi Node chạy qua WSL interop.
- [x] Next.js và worker được khởi động bằng Windows Node, bind/được truy cập qua `127.0.0.1` hoặc `localhost`, và được cleanup mà không để lại process stale.
- [x] Prisma generate/migration/seed sử dụng đúng database `civicos_e2e`; không fallback sang database development `civicos`.
- [x] Login UI gửi đúng một request `POST /api/auth/session` với credentials hợp lệ, nhận HTTP `200`, tạo session cookie và chuyển đến `/`.
- [x] Login sai mật khẩu ở lại `/login`, không tạo session mới và hiển thị lỗi inline có thể quan sát được.
- [x] Logout xóa session và đưa người dùng về `/login`.
- [x] Login regression pass trên cả desktop và mobile Chromium Windows native.
- [x] Không còn throwaway probe hoặc retry/timeout debug có thể che giấu lỗi hydration/request.

## Các bước thực hiện

- [x] Bước 1: Xác nhận Ticket 01 đã pass và mọi lệnh trong ticket này chạy từ PowerShell native.
- [x] Bước 2: Xóa detection/gateway/WSLENV/process-interoperation branch khỏi harness; dùng Windows-native process group và localhost.
- [x] Bước 3: Kiểm tra đường truyền `DATABASE_URL` từ Python fixture sang Node/Prisma bằng database name đã seed, không in credential/token vào log.
- [x] Bước 4: Hoàn nguyên các thay đổi debug tạm thời trong helper nếu không cần thiết; xóa `probe_login.py`.
- [x] Bước 5: Thêm assertion network/session vào login regression tại seam browser thật, không sửa `LoginForm` chỉ để làm test xanh.
- [x] Bước 6: Chạy riêng login/logout trên desktop và mobile; lưu trace/log khi fail và evidence khi pass.
- [x] Bước 7: Chỉ khi login regression pass ổn định ít nhất hai lần liên tiếp, chuyển sang Ticket 03.

## Trạng thái

Status: done
