# 06: Khôi phục lint/format quality gates

**What to build:** Người phát triển có thể chạy các quality command ở repository root và nhận kết quả xanh, trong khi application source/config/test thật vẫn được kiểm tra còn virtualenv, dependency, build output, cache và evidence generated không làm nhiễu kết quả.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

## Phạm vi

Đưa `npm run lint` và `npm run format:check` về trạng thái pass bằng cách xác định rõ phạm vi file cần kiểm tra, loại generated/dependency artifacts khỏi traversal và sửa các violation thật còn lại trong phạm vi repository.

## File được phép sửa

- `eslint.config.mjs`: phạm vi ignore/config của ESLint.
- `.prettierignore`: phạm vi ignore của Prettier.
- `.gitignore`: chỉ khi cần ngăn generated local artifacts bị đưa vào quality scope hoặc working tree.
- `.prettierrc`: chỉ khi cần giữ đúng format policy hiện tại.
- `src/**`, `tests/**`, `playwright.config.ts`, `next.config.ts`, `postcss.config.mjs`, `vitest.config.ts`: chỉ sửa violation thực sự do lint/format báo.
- `README.md`, `playwright/README.md`: chỉ sửa formatting cần thiết; nội dung Python version thuộc Ticket 07.
- `.brain/evidence/06-lint-format-quality-gates/**`: evidence của Developer/Tester/Reviewer.

## File cấm sửa

- `package-lock.json`, `prisma/**`, `.env*`, `opencode.jsonc`, `.opencode/**`.
- `.scratch/**`, `.brain/**` ngoài evidence của ticket này.
- `node_modules/**`, `.next/**`, `playwright/.venv/**`, `playwright/test-results/**`, `playwright/.pytest_cache/**`, `playwright/*.egg-info/**` và các generated artifacts khác.
- Không dùng `eslint-disable`, ignore toàn bộ application source, hoặc đổi script thành lệnh không còn kiểm tra source thật chỉ để đạt exit code `0`.

## Acceptance Criteria

- [x] Từ repository root, `npm run lint` exit `0` và không còn error; output không còn findings phát sinh từ virtualenv, dependency, build output, cache hoặc evidence generated.
- [x] Từ repository root, `npm run format:check` exit `0`; các source/config/test/docs thuộc phạm vi kiểm tra đều formatted theo policy hiện tại.
- [x] Các ignore boundary được khai báo rõ trong config/ignore files và vẫn cho phép lint/format phát hiện một violation thật trong application source nếu violation đó được đưa vào kiểm tra.
- [x] Không có application behavior change, test bypass hoặc xóa artifact/evidence chỉ để làm quality command pass.
- [x] `npm run typecheck`, `npm test` và `npm run build` vẫn exit `0` sau thay đổi quality configuration/formatting.

## Các bước thực hiện

- [x] Bước 1: Chạy nguyên văn `npm run lint` và `npm run format:check`, phân loại output thành application source violation và generated/dependency noise.
- [x] Bước 2: Khai báo ignore boundary tối thiểu cho các virtualenv, dependency, build output, cache, test artifact và agent evidence không thuộc quality scope.
- [x] Bước 3: Sửa từng lint/format violation thật còn lại trong các file được whitelist; không chỉnh rule để che một lỗi code.
- [x] Bước 4: Chạy lại lint và format từ repository root, xác nhận exit code và ghi output đầy đủ đã redact vào evidence.
- [x] Bước 5: Chạy typecheck, unit/database test suite hiện hành và production build để chứng minh quality cleanup không đổi behavior.
- [x] Bước 6: Kiểm tra git diff chỉ chứa config/formatting cần thiết và không đưa generated artifacts vào thay đổi.

## Trạng thái

ready-for-agent
