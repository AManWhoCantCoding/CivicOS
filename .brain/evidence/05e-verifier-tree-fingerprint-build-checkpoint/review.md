# Reviewer evidence — round-trip check ticket 05e

## Tuân thủ thứ tự nguồn

- Bước 1 đã hoàn tất trước khi mở ticket gốc: chỉ đọc diff của `scripts/verify.mjs`, diff/test của `tests/tooling/verify-tree-fingerprint.test.ts`, `changes.md`, và `tests.md`.
- Đã đối chiếu evidence PASS đầy đủ gần nhất: `tests.md` — `## Lần chạy 16` (`scope=full`, không có `filter`) và standalone Tree ngay sau đó.
- Chưa đọc ticket gốc, Acceptance Criteria hoặc Rubric tại thời điểm ghi phần suy ngược này.

## Bước 1 — Suy ngược từ implementation + test/evidence PASS (ghi trước khi mở ticket)

### Yêu cầu nghiệp vụ/kỹ thuật có khả năng là yêu cầu ban đầu

1. Công cụ verifier phải tạo fingerprint `Tree` ổn định và tái lập được cho cùng một cây mã: fingerprint phải phản ánh nội dung của file, không bị thay đổi chỉ vì `mtimeMs` thay đổi.
2. Các artifact sinh ra trong vòng đời native Android (`mobile/android/**/build/**`, `mobile/android/**/.gradle/**`, `mobile/android/**/.cxx/**`) phải bị loại khỏi fingerprint; việc artifact xuất hiện, đổi nội dung hoặc đổi mtime không được làm `Tree` đổi.
3. Source/config có ý nghĩa phải vẫn nhạy với thay đổi: file untracked nằm ngoài vùng generated, file tracked, và các native config phải làm `Tree` đổi khi nội dung đổi rồi quay về đúng fingerprint ban đầu khi được khôi phục.
4. Fingerprint được ghi bởi một lần chạy verifier sau khi hoàn tất toàn bộ các step phải tương đương fingerprint từ nhánh standalone `node scripts/verify.mjs --tree`; một native build thật không được tạo chênh lệch do chụp snapshot sai thời điểm.
5. Việc sửa fingerprint không được làm thay đổi semantics của verifier: lựa chọn step qua `--scope`/`--only`/`--check`, trạng thái `PASS`/`FAIL`/`INCOMPLETE`/`NOT_RUN`, và failure thật phải vẫn được kiểm chứng.
6. Test phải bao phủ native build lifecycle thật, profile-vs-standalone checkpoint, generated artifact/content/mtime regression, source/config sensitivity, selection và failure behavior, đồng thời cleanup probe chính xác.

### Bằng chứng đã đọc ở bước 1

- `scripts/verify.mjs:158-183`: fingerprint untracked bằng path + bytes (`h.update(f)`, `h.update(readFileSync(f))`), bỏ generated qua `isGeneratedArtifact` và giữ các exclusion.
- `scripts/verify.mjs:185-187`: standalone `--tree` gọi fingerprint tại thời điểm invocation.
- `scripts/verify.mjs:223-235`: verifier chạy hết các step rồi mới tính `const tree = treeFingerprint()`.
- `tests/tooling/verify-tree-fingerprint.test.ts:182-231, 484-515`: generated artifact được tạo/đổi bytes/đổi mtime nhưng `Tree` phải ổn định; source ngoài build vẫn nhạy với content.
- `tests/tooling/verify-tree-fingerprint.test.ts:233-291, 293-422`: native build thật, inventory candidate lifecycle, profile Tree và standalone Tree phải bằng nhau.
- `tests/tooling/verify-tree-fingerprint.test.ts:445-481`: tracked/native config content sensitivity và khôi phục về baseline.
- `tests/tooling/verify-tree-fingerprint.test.ts:517-568`: giữ selection/failure behavior và classifier source-shape assertions.
- `tests.md:843-856`: lần chạy 16 là `scope=full`, toàn bộ các bước PASS.
- `tests.md:858-862`: standalone invocation ghi `Tree: f9348dc3`, trùng `Tree: f9348dc3` của full PASS lần 16.

## Bước 2 — Đối chiếu với ticket gốc

Đã mở và đọc toàn bộ ticket gốc sau khi phần suy ngược ở Bước 1 đã được ghi. Đối chiếu với ticket tại `.scratch/civicos-e1-clone-mvp/issues/05e-verifier-tree-fingerprint-build-checkpoint.md`:

| Ý suy ngược ở Bước 1 | Kết quả | Đối chiếu ticket gốc |
|---|---|---|
| 1. `Tree` deterministic, phản ánh content thay vì `mtimeMs`. | PASS — khớp | AC-03 yêu cầu dùng cùng logic phân loại cho inventory; AC-04 yêu cầu fingerprint đổi theo sửa content và trở về baseline. Mô tả ticket dòng 29 nêu trực tiếp vấn đề `path:size:mtimeMs`. Implementation dùng `h.update(f)` và `h.update(readFileSync(f))` ở `scripts/verify.mjs:176-178`. |
| 2. Loại generated Android `build`/`.gradle`/`.cxx`, kể cả xuất hiện/đổi content/mtime. | PASS — khớp | AC-01 yêu cầu inventory generated/untracked sau `npm run mobile:build`; AC-03 yêu cầu mọi generated path được loại theo rule cụ thể hoặc Git ignore. Ticket dòng 26-29 và Rubric dòng 46-47 cùng nêu đúng boundary này. |
| 3. Source/config relevant vẫn nhạy với content và khôi phục về baseline. | PASS — khớp | AC-04 nêu đúng ba native config và một untracked non-ignored source/config probe; AC-03 cấm lọc relevant source/config chỉ vì nằm dưới `mobile/**` hoặc `mobile/android/**`. |
| 4. Fingerprint của verifier sau step execution bằng standalone `--tree` sau native build. | PASS — khớp | AC-01 yêu cầu trước/ngay sau native build bằng nhau; AC-02 yêu cầu full verifier output/evidence bằng invocation độc lập ngay sau đó. Ticket dòng 28 xác định nguyên nhân boundary là snapshot trước `runStep()`. Code chuyển `const tree = treeFingerprint()` xuống sau vòng chạy step tại `scripts/verify.mjs:223-235`; test đối chiếu profile/standalone tại `tests/tooling/verify-tree-fingerprint.test.ts:293-415`. |
| 5. Giữ nguyên selection, status/exit semantics, actual checks và failure behavior. | PASS — khớp | AC-05 yêu cầu `--check`, `--only`, `--scope=mobile`, failure thật, thứ tự/chọn step, exit code, `PASS`/`FAIL`/`NOT_RUN`/`INCOMPLETE`, command thật và `RESULT` không đổi; AC-06 cấm skip/exclude/bypass. |
| 6. Regression bao phủ lifecycle, profile checkpoint, generated/source sensitivity, selection/failure và cleanup probe. | PASS — khớp về mục tiêu; cleanup exact là test hygiene bổ sung | Các phần lifecycle/inventory/mtime/content/selection/failure khớp AC-01, AC-03, AC-04, AC-05 và các bước thực hiện dòng 61-65. Ticket không nêu riêng “cleanup probe exact” trong AC, nhưng đây là biện pháp bảo đảm regression không để lại trạng thái làm nhiễm fingerprint, không làm lệch yêu cầu nghiệp vụ. |

### Đối chiếu phạm vi và Rubric

- **Phạm vi file:** PASS — ticket cho phép đúng `scripts/verify.mjs`, `tests/tooling/verify-tree-fingerprint.test.ts` và evidence; diff bước 1 chỉ thể hiện hai file implementation/test, còn evidence nằm trong workflow.
- **Tính tái lập:** PASS — yêu cầu ticket là mô phỏng lifecycle trước/sau native build và ghi inventory; test có `inventory()`, native build thật và profile/standalone equality.
- **Bảo toàn phạm vi:** PASS — test có untracked probe ngoài generated output và ba native config; code chỉ bỏ generated classifier, không loại rộng toàn bộ `mobile/**`/`mobile/android/**`.
- **Tối thiểu hóa thay đổi:** PASS — diff implementation chỉ đổi cách fingerprint untracked và thời điểm chụp Tree; test mở rộng regression, không đổi command/check flow. Evidence full PASS lần 16 cũng ghi toàn bộ bảy bước PASS.

## Kết luận round-trip

**PASS — khớp.** Phần suy ngược được ghi trước khi đọc ticket gốc; sau đó từng ý đều khớp với mô tả, AC, bước thực hiện và Rubric của ticket. Không phát hiện lệch hướng nghiệp vụ/kỹ thuật trong round-trip check.
