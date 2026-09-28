# Review cuối — 00-clear-demo-db

## Phạm vi và quy tắc review

- Đã đọc lại toàn bộ ticket `.scratch/demo-seed-complete/issues/00-clear-demo-db.md`, `.scratch/demo-seed-complete/spec.md`, `CONTEXT.md`, `plan.md`, `changes.md`, `tests.md`, log scoped và source/diff hiện tại.
- Áp dụng quyết định đóng ticket theo phạm vi ticket: dùng unit demo bootstrap, integration reset và format check scoped; **không yêu cầu full verifier/e2e ở ticket 00**. Full E2E được để sau khi chuỗi 00–08 hoàn tất.
- Reviewer không chạy test, lint, typecheck, format-check, build hoặc full verifier. Chỉ dùng ngoại lệ fingerprint bắt buộc của checkpoint: `node scripts/verify.mjs --tree`.
- `docs/adr/` hiện không có ADR. Boundary implementation của ticket theo `changes.md:7-13` gồm `scripts/demo/demo-db.ts`, `scripts/demo/reset.ts`, helper Evidence, test demo/integration; README hiện tại được ghi nhận là thay đổi pre-existing, không có hunk mới của ticket (`changes.md:15-19`).
- Không sửa source production, không sửa ticket và không commit.

## Evidence scoped và Tree

| Hạng mục | Evidence | Tree trong evidence | Đối chiếu Tree hiện tại |
|---|---|---:|---|
| Unit demo bootstrap/guard | `tests.md:946-954`, `logs/run20-test.log:8-13` — 1 file pass, 7 test pass, 4 test DB skip đúng điều kiện môi trường | `6ffd8357` | Khớp |
| Integration reset/isolation | `tests.md:955-962`, `logs/run21-test.log:48-57` — 4/4 test pass | `6ffd8357` | Khớp |
| Format check scoped | `tests.md:855-863`, `logs/run18-format_check.log:2-6` — `All matched files use Prettier code style!` | `eacaa061` | Khác Tree hiện tại; ghi nhận là evidence format scoped bổ trợ, không biến thành yêu cầu full verifier/e2e |
| Fingerprint mã nguồn hiện tại | Output của ngoại lệ `node scripts/verify.mjs --tree` | — | **`Tree: 6ffd8357`** |

Hai evidence test scoped mới nhất khớp chính xác Tree hiện tại `6ffd8357`; đây là cơ sở cho các AC. Format check PASS được ghi nhận riêng theo quyết định scoped, không dùng các lần chạy full/E2E lịch sử để chặn ticket này.

## Bảng 1 — Spec-to-Code Traceability Matrix: Acceptance Criteria

| ID Yêu cầu (AC) | Mức độ đáp ứng | File & Dòng Code xử lý | Test Case chứng minh |
| :--- | :--- | :--- | :--- |
| AC-00-01 | **PASS** | `scripts/demo/demo-db.ts:38-59` chọn `DEMO_DATABASE_URL` trước `DATABASE_URL`, validate đúng tên `civicos_demo` và ném `DEMO_RESET_REFUSED`; `scripts/demo/reset.ts:90-100` resolve/confirm trước dynamic import Prisma. | `tests/demo/demo-bootstrap.test.ts:47-64,67-92` kiểm tra target sai, thiếu confirmation, raw precedence và target gần giống; run20 pass tại `logs/run20-test.log:8-13`. | 
| AC-00-02 | **PASS** | `scripts/demo/reset.ts:15-47` whitelist đủ 31 model trùng các model trong `prisma/schema.prisma:10-529`; `:63-73` đếm mọi bảng; `:111-115` chỉ `TRUNCATE TABLE` whitelist với `RESTART IDENTITY CASCADE`, không gồm `_prisma_migrations`/schema. | `tests/integration/demo-seed-reset.integration.test.ts:91-111` assert count từng model bằng `0` và `_prisma_migrations` còn tồn tại; run21 log trước/sau tại `logs/run21-test.log:8-14`, testcase pass tại `:48-50`. Schema không có đường code drop; thao tác chỉ truncate các table whitelist. |
| AC-00-03 | **PASS** | `scripts/demo/reset.ts:103-110` chỉ lấy Evidence có `metadata.demoNamespace = "civicos-demo"` rồi cleanup trước truncate; `src/modules/platform/evidence/storage-adapter.ts:21-38` loại absolute/traversal/out-of-root và chỉ gọi `remove` trong `storage/evidence`. | `tests/integration/demo-seed-reset.integration.test.ts:113-181` kiểm tra file marker bị xóa, non-marker/tile còn, và key absolute/traversal không được chuyển tới `remove`; run21 log tại `logs/run21-test.log:16-22,48-51`. |
| AC-00-04 | **PASS** | `tests/integration/demo-seed-reset.integration.test.ts:56-84` tạo Prisma client test riêng, xác nhận database kết nối không phải `civicos_demo`; `:191-203` chỉ đọc snapshot/sentinel qua client `CIVICOS_DATABASE_URL`; `resetDemo` nhận client test tại `scripts/demo/reset.ts:86-100`. | Test `chi mutate civicos_demo va giu snapshot civicos` tại `tests/integration/demo-seed-reset.integration.test.ts:191-203`; run21 log chứng minh target log và testcase pass tại `logs/run21-test.log:40-52`. Snapshot count và sentinel được so sánh bằng `expect(after).toEqual(before)` và equality sentinel. |
| AC-00-05 | **PASS** | `scripts/demo/reset.ts:111-120,122-128` chỉ query/cleanup/truncate, không seed hay tạo file; flow thành công resolve Promise và entrypoint exit `0`. | `tests/integration/demo-seed-reset.integration.test.ts:185-189` gọi reset hai lần trên DB rỗng; run21 log ghi cả hai lần target `civicos_demo`, summary sau bằng `0` và `evidenceFiles=0` tại `logs/run21-test.log:24-38`; testcase pass tại `:48-52`. |

## Bảng 2 — Rubric

| Trục Rubric | Mức độ đáp ứng | Đối chiếu với | Bằng chứng |
| :--- | :--- | :--- | :--- |
| **Bắt buộc — Reset đủ ownership** | **PASS** | Ticket `:37`; `.scratch/demo-seed-complete/spec.md:129-135` | Inventory 31 model tại `scripts/demo/reset.ts:15-47`, Evidence physical cleanup trước truncate tại `:102-115`, test isolation bằng client riêng tại `tests/integration/demo-seed-reset.integration.test.ts:56-84`; run21 4/4 pass. |
| **Bắt buộc — Guard trước dynamic import và contract** | **PASS** | Ticket `:38`; Spec `:131` | `scripts/demo/demo-db.ts:42-59` giữ `DEMO_RESET_REFUSED`; `scripts/demo/reset.ts:55-60,90-100` giữ `DEMO_RESET_CONFIRM_REQUIRED`, validate/confirm trước `await import('@/lib/prisma')`; unit guard pass tại `logs/run20-test.log:8-13`. |
| **Bắt buộc — Không xóa tile/Evidence ngoài namespace** | **PASS** | Ticket `:39`; Spec `:132` | Query marker tại `scripts/demo/reset.ts:103-106`; containment tại `storage-adapter.ts:25-38`; assertions giữ non-marker/tile tại `tests/integration/demo-seed-reset.integration.test.ts:157-171`; run21 testcase pass. |
| **Bắt buộc — Chứng minh không chạm `civicos`** | **PASS** | Ticket `:40`; AC-00-04; Spec `:134-135` | `tests/integration/demo-seed-reset.integration.test.ts:74-84` inject client test không phải `civicos_demo`, `:77-79,191-203` dùng client `civicos` read-only để so snapshot/sentinel; run21 `:40-52` pass. |
| **Khuyến nghị — Quy trình** | **PASS — 2/2** | Ticket `:44-46`, ngưỡng tối thiểu 1 | `scripts/demo/reset.ts:91-95` log target/confirmation; `:102-118` log count trước/sau và `evidenceFiles`; run21 `logs/run21-test.log:8-46` chứa các summary tương ứng. |
| **Khuyến nghị — An toàn** | **PASS — 2/2** | Ticket `:44-47`, ngưỡng tối thiểu 2 | Database allow-list exact tại `scripts/demo/demo-db.ts:4,52-59`; table allow-list tại `scripts/demo/reset.ts:15-47,111-114`; file containment tại `storage-adapter.ts:25-38`; target được validate trước bind/import tại `reset.ts:90-100`. |

## Kiểm tra boundary và Reject Rules

- Không có dòng code mới của implementation ticket nằm ngoài AC/Rubric: map trong `plan.md:44-60` bao phủ AC-00-01..05 và cả hai trục khuyến nghị; `changes.md:7-13` xác định đúng file implementation/test.
- Helper `cleanupDemoEvidenceFiles` chỉ phục vụ AC-00-03, không tự quét thư mục, không chạm `storage/tiles/**` và không mở Prisma.
- Các thay đổi pre-existing ngoài boundary (bao gồm README hiện tại, `scripts/verify.mjs`, mobile/generated artifacts và evidence khác) không được gán cho ticket này theo `changes.md:15-19`; không dùng chúng để tạo FAIL.

## Trục trặc gặp phải

- Không phát sinh lỗi công cụ/hạ tầng trong vòng review; không có mục mới cần ghi hoặc cập nhật trong `Lesson-learned.md`.

## Kết luận

- **PASS** AC-00-01..05.
- **PASS** toàn bộ Rubric bắt buộc; Rubric khuyến nghị đạt Quy trình 2/2 và An toàn 2/2.
- Tree hiện tại đã được kiểm tra: **`6ffd8357`**, khớp hai evidence test scoped dùng để đóng ticket.
- Không yêu cầu full verifier/E2E ở checkpoint này theo quyết định người dùng; Reviewer không chạy test hay lệnh kiểm tra nào, chỉ chạy fingerprint `--tree` bắt buộc, và chưa commit.
