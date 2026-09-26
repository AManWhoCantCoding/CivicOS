# Plan 05e — ổn định Tree fingerprint trước/sau mobile build

- Ticket bug gate: full PASS 35 (`Tree: 36173835`) lệch `--tree` sau build (`Tree: edafd143`) do snapshot trước step và untracked `path:size:mtimeMs` ngoài rule 05d.
- Chỉ được sửa `scripts/verify.mjs` + `tests/tooling/verify-tree-fingerprint.test.ts` (ngoài evidence workflow), giữ nguyên actual checks.
- AC chính: Tree trước/sau `npm run mobile:build` khớp nhau, inventory generated path có evidence, source/config relevant vẫn nhạy.
- Plan này xử lý toàn bộ kết luận FAIL/THIẾU EVIDENCE trong `review.md` hiện có và red reproduction bắt buộc của ticket bug.
- Phạm vi dừng ở plan: chưa viết code, chưa chạy test/lint/typecheck/format/build theo lệnh Planner.
- Trạng thái workspace: `tests/tooling/verify-tree-fingerprint.test.ts` đang modified trong working tree (`git status` báo `M`, `git diff --stat` ghi thêm dòng) là thay đổi dở dang/evidence hiện hữu cần Planner/Tester reconcile trước gate implementation; không tự restore/xóa, không coi là implementation mới; implementation cuối cùng vẫn whitelist đúng hai file `scripts/verify.mjs` + `tests/tooling/verify-tree-fingerprint.test.ts`.

## 1. Các file dự định sửa/tạo

- Sửa `scripts/verify.mjs`:
  - Chỉ chạm lifecycle chụp `treeFingerprint()` và lớp inventory/classifier làm input fingerprint.
  - Không chạm danh sách step, command, thứ tự thực thi, status, exit code, output `RESULT`, actual checks.
- Sửa `tests/tooling/verify-tree-fingerprint.test.ts`:
  - Bổ sung/siết regression lifecycle trước/sau `npm run mobile:build`, inventory path/mtime, source/config sensitivity.
  - Giữ guard hiện có cho `--check`, selection, status semantics, `maxBuffer`, `ComSpec`, timeout lifecycle.
- Tạo/cập nhật `.brain/evidence/05e-verifier-tree-fingerprint-build-checkpoint/plan.md` (chính file này; artifact kế hoạch, không phải implementation patch).
- Không sửa/tạo file nào khác. Cấm tuyệt đối: `src/**`, `mobile/src/**`, `mobile/android/**`, `package.json`, `mobile/package.json`, manifest/lockfile, `node_modules/**`, `.env*`, `**/secrets/**`, `.scratch/**`, ticket 05/05d, evidence đã có của Tester/Reviewer.

## 2. Hàm/Interface sẽ đổi

- `scripts/verify.mjs`:
  - `isGeneratedArtifact(f)`: mở rộng tối thiểu theo đúng path generated/untracked do inventory runtime chứng minh; chỉ loại artifact cụ thể, không loại toàn bộ `mobile/**` hay `mobile/android/**`.
  - `treeFingerprint()`: input untracked chuyển từ `path:size:mtimeMs` sang biểu diễn deterministic (hash content qua `readFileSync`) cho path được giữ lại; path generated đã loại không đóng góp hash.
  - Điểm gọi `treeFingerprint()`/biến `tree`: chuyển snapshot full verifier sang boundary sau vòng `runStep()` (baseline hiện tại chụp ở dòng 191 trước `runStep()` dòng 204–241); nhánh `--tree` giữ nguyên chỉ tính fingerprint rồi thoát.
  - Không đổi public CLI, `runStep(name)`, result shape, vòng lặp step, logic `PASS`/`FAIL`/`NOT_RUN`/`INCOMPLETE`, `--check`/`--only`/`--scope`.
- `tests/tooling/verify-tree-fingerprint.test.ts` (tái sử dụng helper hiện có, chỉ siết/bổ sung assertion):
  - `runTree()`, `untracked()`, `check()`, `runVerifier()`, `gitLines()`, `isGeneratedPath()`, `inventory()` được tái sử dụng; implementation phải bỏ lọc trước theo prefix `mobile/android/` trong helper inventory (hiện tại `file.startsWith('mobile/android/')` tại `tests/tooling/verify-tree-fingerprint.test.ts:114-116`), thu thập toàn bộ path ứng viên do build tạo/cập nhật rồi mới phân loại tracked/ignored/untracked và áp dụng classifier production; giữ fix `maxBuffer: 64MB` trong `gitLines()` và gọi build qua `ComSpec`/`cmd.exe /d /s /c` trên Windows.
  - Test lifecycle `keeps Tree stable across the real native build lifecycle`: bắt buộc `expect(lifecycle.length).toBeGreaterThan(0)`, sắp xếp lifecycle, in `native-build-inventory` (path/state/size/mtime/content hash) ra stdout trước assert classifier; inventory rỗng phải in và fail, không cho vòng `for` vacuous pass.
  - Test sensitivity giữ nguyên: untracked probe ngoài build, tracked config (`tsconfig.json`), ba native config (`settings.gradle`, `app/build.gradle`, `gradle.properties`), mtime/content.
  - Test selection/failure giữ nguyên: `--check` full/mobile/only, failure thật (`--only=typecheck --filter=--definitely-invalid` phải exit 1 + `FAIL`), guard source (`shell: true`, `NOT_RUN`, `INCOMPLETE`, `function runStep`).
- Không thêm interface/export mới; không thêm dependency.

## 3. Luồng xử lý chi tiết

- **Bước 0 — Red reproduction bắt buộc (Tester sở hữu, Developer không tự chạy):** trên baseline đã khôi phục (`changes.md:12` — `scripts/verify.mjs` đúng `HEAD`, giữ fix 05d), Tester ghi diagnostic triệu chứng `Tree trước !== Tree sau native build` làm evidence quan sát được, đồng thời chạy cùng một regression assertion invariant `Tree trước === Tree sau native build` (cả hai mốc đều phải khớp format `Tree: [0-9a-f]{8}`) để baseline/pre-fix FAIL đúng Tree mismatch và sau implementation cùng invariant đó PASS; không mô tả assertion bất đẳng thức là assertion phải FAIL. Các FAIL cũ (`ENOBUFS` lần 2, `EINVAL` lần 3, timeout 5s lần 5 trong `tests.md`) là lỗi hạ tầng/harness, không được dùng làm red reproduction.
- **Bước 1 — Baseline và inventory trước build:** test chụp `Tree: [0-9a-f]{8}` qua `runTree()` (`node scripts/verify.mjs --tree`), đồng thời `inventory()` thu thập toàn bộ path ứng viên xuất hiện/đổi sau native build, không lọc trước theo prefix `mobile/android/`; sau đó mới phân loại từng path thành tracked/ignored/untracked kèm path/state/size/mtime/content hash và áp dụng cùng classifier production, bao gồm cả path ngoài prefix nếu build chạm.
- **Bước 2 — Lifecycle native build thật:** test chạy đúng `npm run mobile:build` (timeout riêng 180000ms), không tạo artifact giả thay build, không sửa generated artifact. Sau build chụp inventory lần hai trên toàn bộ path ứng viên (không lọc trước theo prefix); tính ba tập `appeared` (path mới), `updated` (đổi size/content), `mtimeOnly` (chỉ đổi mtimeMs); sắp xếp và in toàn bộ ra stdout.
- **Bước 3 — Fingerprint trước/sau:** `--tree` trước và ngay sau build đều phải khớp format `Tree: [0-9a-f]{8}` và bằng nhau khi không có source/config relevant đổi. Mọi path ứng viên trong lifecycle (bao gồm path ngoài prefix `mobile/android/` nếu build chạm) phải qua cùng classifier production: `ignored` hoặc `isGeneratedPath()` mới được loại; path relevant ngoài rule vẫn đóng góp hash content deterministic.
- **Bước 4 — Full verifier checkpoint:** full invocation `05-mobile-readonly-client --scope=full` phải exit `0` với đủ bảy step `PASS` trước khi đối chiếu Tree; snapshot ghi dòng `Tree:` lấy sau vòng `runStep()`; invocation `--tree` kế tiếp trên cùng checkout phải cho cùng fingerprint. Đổi thời điểm snapshot chỉ ảnh hưởng evidence fingerprint, không đổi step/command/thứ tự/exit/`RESULT`.
- **Bước 5 — Source/config sensitivity:** sửa rồi khôi phục từng file `settings.gradle`, `app/build.gradle`, `gradle.properties` và một untracked non-ignored probe ngoài generated output; mỗi thay đổi phải làm Tree đổi, sau khôi phục/xóa phải về baseline. Giữ test tracked config hiện có.
- **Bước 6 — Regression verifier behavior:** giữ/bổ sung `--check`, `--only`, `--scope=mobile`, full profile và một invocation failure thật bắt buộc; đối chiếu nguyên trạng thứ tự/chọn step, exit code, `PASS`/`FAIL`/`NOT_RUN`/`INCOMPLETE`, command thật, output `RESULT`. Nếu harness không tạo được failure thật thì dừng ở dependency blocker/needs-info, không hạ thành assertion tùy chọn.
- **Bước 7 — Whitelist:** scoped diff implementation chỉ có hai file cho phép; nếu inventory chứng minh cần sửa file/command/dependency ngoài whitelist hoặc path cần loại là source/config relevant thì dừng, báo Planner tạo blocker riêng, không mở rộng scope.

## 4. Bảng map thay đổi với Acceptance Criteria

| Thay đổi ở mục 1–3 | Acceptance Criteria phục vụ | Đối chiếu / lý do |
|---|---|---|
| Chuyển untracked input từ `path:size:mtimeMs` sang hash content deterministic + mở rộng `isGeneratedArtifact()` đúng path inventory chứng minh (`scripts/verify.mjs`) | AC-01 (ticket dòng 35), AC-03 (dòng 37) | AC-01 yêu cầu Tree giống hệt sau `mobile:build` và test ghi tập path đổi; AC-03 yêu cầu loại đúng generated bằng rule cụ thể hoặc Git ignore. Xử lý boundary mtime mà ticket dòng 29 nêu. |
| Chuyển snapshot full verifier sang sau vòng `runStep()`, giữ nhánh `--tree` độc lập; đối chiếu chỉ sau full exit `0` + bảy step `PASS` | AC-01 (dòng 35), AC-02 (dòng 36) | Dependency lifecycle bắt buộc: baseline chụp dòng 191 trước `runStep()` 204–241 nên full và `--tree` đọc hai state khác nhau (ticket dòng 28). Xử lý trực tiếp review PASS AC-02 (run 7 `b5098e3e` khớp `--tree`) để khóa lại sau red→green. |
| Siết lifecycle test: `expect(lifecycle.length).toBeGreaterThan(0)`, sắp xếp + in `native-build-inventory` đầy đủ ra stdout, assert từng path `ignored \|\| isGeneratedPath()` | AC-01 (dòng 35), AC-03 (dòng 37) | Xử lý review FAIL AC-01 (`review.md:23` — vòng `for` vacuous, không assert non-empty, không ghi inventory) và THIẾU EVIDENCE AC-03 (`review.md:25` — không xuất tập path/state). Không có thay đổi này thì test pass giả. |
| Giữ sensitivity: untracked probe ngoài build, tracked config, ba native config, mtime/content (`tests/tooling/verify-tree-fingerprint.test.ts`) | AC-03 (dòng 37), AC-04 (dòng 38) | AC-04 yêu cầu từng native config + probe ngoài output làm Tree đổi và về baseline sau khôi phục; AC-03 cấm loại source/config relevant vì nằm trong `mobile/**`. Giữ review PASS AC-04 (`review.md:26`). |
| Giữ/bổ sung regression `--check`/`--only`/`--scope=mobile`/full profile + failure thật bắt buộc, không đổi `runStep`/step flow | AC-05 (dòng 39) | AC-05 chỉ cho điều chỉnh input fingerprint, giữ nguyên thứ tự/chọn step, exit code, status, command thật, output `RESULT`. Giữ review PASS AC-05 (`review.md:27`); failure phải fail thật, nếu không tạo được thì dừng blocker/needs-info. |
| Chỉ sửa hai file whitelist ngoài evidence workflow; không đụng product/mobile/dependency/lockfile/ticket | AC-06 (dòng 40) | AC-06 là whitelist trực tiếp; giữ review PASS AC-06 (`review.md:28`) và whitelist/cấm (`review.md:52-60`). |
| Red reproduction + Tester confirmation thứ tự red → implementation → green (diagnostic `!==` tách khỏi invariant `===`), kèm inventory runtime từng path/state | Gate bug ticket dòng 5-6 + AC-01/AC-03 + review `Gate bắt buộc` (`review.md:61-69`) | Xử lý review THIẾU EVIDENCE gate: các FAIL cũ là hạ tầng, chưa có invariant `before === after` FAIL trước fix rồi PASS sau fix trên cùng contract. Đây là dependency quy trình bắt buộc, không phải thay đổi code; thiếu thì chưa được đóng ticket dù Tree hiện tại đã khớp (`review.md:71-76`). |
| Giữ `maxBuffer 64MB`, gọi build qua `ComSpec`, timeout lifecycle 180s, in inventory rỗng rồi fail | Không map AC nào — dependency kỹ thuật/harness bắt buộc | Kế thừa từ `changes.md:8-10`: checkout lớn gây `ENOBUFS`, Windows `npm.cmd` gây `EINVAL`, build thật ~78s gây timeout 5s. Không có thì lifecycle không chạy được để đo AC-01/AC-03; không đổi semantics AC-05. |
| File `plan.md` này | Không map AC nào — artifact quy trình theo lệnh Planner | Được yêu cầu trực tiếp trong lệnh gọi; không phải implementation patch, không tính vào whitelist AC-06. |
