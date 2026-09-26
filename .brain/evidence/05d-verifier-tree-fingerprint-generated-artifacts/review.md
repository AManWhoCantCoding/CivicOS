# Review checkpoint cuối — 05d-verifier-tree-fingerprint-generated-artifacts

## Phạm vi và evidence được dùng

- Đã đọc lại toàn bộ ticket và Rubric trước checkpoint này.
- Không chạy test, lint, typecheck, format-check, build hoặc verifier profile. Chỉ chạy ngoại lệ được phép/bắt buộc ở checkpoint cuối: `node scripts/verify.mjs --tree`, kết quả `Tree: c4aea483`.
- Evidence regression quyết định: `tests.md` Lần chạy 6 chạy `only=test` **không có `filter`**, Tree `c4aea483`; log tương ứng ghi `tests/tooling/verify-tree-fingerprint.test.ts (5 tests)` PASS tại `logs/run6-test.log:21-24`.
- Overall `npm run test` của Lần chạy 6 FAIL chỉ ở 6 test `tests/mobile/readonly-http.contract.test.ts` do thiếu `CIVICOS_API_BASE_URL` (`tests.md:182-190,213-255`; `logs/run6-test.log:8-20,94-145`). Đây là lỗi ngoài scope, không phải lỗi fingerprint; không sửa hoặc né lỗi này.
- Run5 có `filter=tests/tooling/verify-tree-fingerprint.test.ts`, chỉ dùng để xác định regression target lịch sử; không dùng run5 làm evidence checkpoint đầy đủ.
- Integration 05a: Lần chạy 41 `scope=mobile` PASS, Tree `c4aea483`, cả `mobile:typecheck`, `mobile:test`, `mobile:build` PASS (`05a.../tests.md:943-952`); `--tree` độc lập hiện tại cũng `c4aea483`.
- Negative integration 05a: Lần chạy 42 ghi `TS6044` và FAIL (`05a.../tests.md:954-977`), chứng minh lỗi thật vẫn truyền qua verifier.
- Implementation patch được phân biệt với working-tree artifacts/evidence: patch sở hữu của 05d chỉ gồm `scripts/verify.mjs` và `tests/tooling/verify-tree-fingerprint.test.ts` (`changes.md:9-21,29-45`); generated Android artifacts và `.brain/evidence/**` không được tính là implementation patch.

## Kết luận checkpoint

**PASS checkpoint theo phạm vi ticket.** Regression file của ticket PASS 5/5 trên run unfiltered; lỗi overall test là 6 HTTP contract test ngoài scope do thiếu biến môi trường. Không phát hiện FAIL code thuộc fingerprint hoặc verifier behavior trong diff/evidence được giao.

## Bảng 1 — Spec-to-Code Traceability Matrix: Acceptance Criteria

| ID Yêu cầu (AC) | Mức độ đáp ứng | File & Dòng Code xử lý | Test Case chứng minh |
| :--- | :--- | :--- | :--- |
| AC-01 | **PASS** | `scripts/verify.mjs:154-162,173-190`: chuẩn hóa path và loại `mobile/android/**` có segment `build`, `.gradle`, `.cxx` ở cả tracked pathspec và untracked guard. | `tests/tooling/verify-tree-fingerprint.test.ts:77-126`: tạo, đổi nội dung và dọn 4 loại generated artifact; `logs/run6-test.log:21-24` ghi file regression PASS 5/5. Tree run6 và Tree hiện tại đều `c4aea483`. |
| AC-02 | **PASS** | `scripts/verify.mjs:164-190`: filter chỉ nằm trong `treeFingerprint`; luồng profile/Tree output giữ nguyên. | `05a.../tests.md:943-952`: run41 `scope=mobile`, 3 step đều PASS, Tree `c4aea483`; `node scripts/verify.mjs --tree` tại checkpoint trả `Tree: c4aea483`. |
| AC-03 | **PASS** | `scripts/verify.mjs:178-189`: untracked non-ignored chỉ bị bỏ qua khi `isExcluded(f) || isGeneratedArtifact(f)`, nên probe ngoài output vẫn được hash; tracked diff không bị loại ngoài các path artifact cụ thể. | `tests/tooling/verify-tree-fingerprint.test.ts:128-160`: probe untracked ngoài build và `tsconfig.json` tracked đều làm Tree đổi rồi trở về base; file regression run6 PASS 5/5. |
| AC-04 | **PASS** | `scripts/verify.mjs:154-162,166-176`: chỉ match segment chính xác dưới `mobile/android/`; giữ config/source ngoài output như `settings.gradle`, `app/build.gradle`, `gradle.properties`. | `tests/tooling/verify-tree-fingerprint.test.ts:185-201`: assert ba tracked pathspec, untracked guard và chỉ hai điểm gọi predicate; T1/T2 runtime PASS trong `logs/run6-test.log:21-24`. |
| AC-05 | **PASS** | `scripts/verify.mjs:204-241,243-284`: `runStep`, shell execution, thứ tự step, trạng thái và evidence/exit flow không bị filter fingerprint thay đổi; filter chỉ ở `treeFingerprint`. | `tests/tooling/verify-tree-fingerprint.test.ts:163-183`: `--check` scope/only và dấu hiệu `runStep`/`shell: true`/`NOT_RUN`/`INCOMPLETE`; 05a run41 PASS đầy đủ (`tests.md:943-952`); run42 giữ FAIL thật với `TS6044` (`tests.md:954-977`). |
| AC-06 | **PASS** | Diff implementation của ticket chỉ ở logic fingerprint trong `scripts/verify.mjs` và regression test `tests/tooling/verify-tree-fingerprint.test.ts`; không có assertion né/skip/exclude check thật (`changes.md:9-21,29-45`). | Regression file unfiltered PASS 5/5 (`logs/run6-test.log:21-24`); `changes.md:20-21,36,44` tách generated artifacts/evidence và xác nhận không đổi production/mobile behavior, dependency, 05a/05b/05c. |

**Phân loại overall test FAIL:** `logs/run6-test.log:8-20,104-145` chỉ nêu 6 failure tại `tests/mobile/readonly-http.contract.test.ts` với lỗi nguyên văn `CIVICOS_API_BASE_URL is required for the HTTP contract test`; không có failure trong `tests/tooling/verify-tree-fingerprint.test.ts`. Đây không phải FAIL của AC-01..AC-06 và không được sửa/né trong ticket này.

## Bảng 2 — Spec-to-Code Traceability Matrix: Rubric bắt buộc

| Trục Rubric | Mức độ đáp ứng | Đối chiếu với | Bằng chứng |
|---|---|---|---|
| Fingerprint ổn định trước/sau build và mobile verifier PASS khớp `--tree` | **PASS** | Ticket AC-01/AC-02; blocker evidence 05a | Regression unfiltered 5/5 (`logs/run6-test.log:21-24`); run41 mobile PASS với Tree `c4aea483` (`05a.../tests.md:943-952`); Tree độc lập tại checkpoint `c4aea483`. |
| Tracked/untracked source/config relevant vẫn nằm trong fingerprint; artifact chỉ bị loại ở lớp fingerprint | **PASS** | `spec.md:222-238`; ticket AC-03/AC-04 | Predicate/pathspec/guard tại `scripts/verify.mjs:154-190`; tracked và untracked sensitivity tại test `:128-160`; artifact boundary tại test `:77-126,185-201`; regression file PASS 5/5. |
| Verifier checks/tests/build behavior không đổi; không skip/exclude/bypass actual check; không sửa business source | **PASS** | `spec.md:224-238`; ticket AC-05/AC-06 | Chỉ input `treeFingerprint` thay đổi (`scripts/verify.mjs:154-190`); `--check`/`--only` regression tại test `:163-183`; run41 PASS và run42 `TS6044` FAIL thật; implementation patch chỉ hai file được phép. |

## Rubric khuyến nghị — bảng độc lập

| Trục | Kết quả | Điểm | Bằng chứng |
|---|---|---:|---|
| Tính ổn định | **PASS** | 2/2 | T1 tạo/thay đổi artifact ở `build`, `.gradle`, `.cxx` nhưng Tree giữ nguyên (`tests/tooling/verify-tree-fingerprint.test.ts:77-126`); regression unfiltered PASS 5/5. |
| Bảo toàn phạm vi | **PASS** | 2/2 | T2 chứng minh untracked probe ngoài build và tracked `tsconfig.json` làm Tree đổi, sau cleanup trở về base (`tests/tooling/verify-tree-fingerprint.test.ts:128-160`); regression unfiltered PASS 5/5. |
| Tối thiểu hóa thay đổi | **PASS** | 2/2 | Chỉ hai file implementation/test của ticket; hunk implementation chỉ ở fingerprint và test regression (`changes.md:9-21,29-45`). Generated Android artifacts/evidence được phân loại riêng, không tính vào implementation patch. |

## Checklist boundary / CONTEXT / ADR (Gate hướng: không)

| Checklist | Kết quả | Bằng chứng |
|---|---|---|
| Boundary module — fingerprint không điều khiển command/check thật | **PASS** | `treeFingerprint()` chỉ tạo input hash tại `scripts/verify.mjs:154-190`; `runStep` và vòng xử lý kết quả tại `:204-284` giữ nguyên. Test cũng giữ `runStep`, `shell: true`, `NOT_RUN`, `INCOMPLETE` (`tests/tooling/verify-tree-fingerprint.test.ts:178-183`). |
| Boundary module — không lọc source/config relevant khỏi check thật | **PASS** | Predicate yêu cầu prefix `mobile/android/` và segment artifact chính xác; test giữ probe ngoài output và tracked config (`tests/tooling/verify-tree-fingerprint.test.ts:128-160,185-201`). Filter không được truyền vào `runStep`. |
| `CONTEXT.md` | **PASS** | `CONTEXT.md:1-3` mô tả domain CivicOS; patch chỉ tooling fingerprint, không sửa domain/mobile business source hoặc thuật ngữ nghiệp vụ. |
| ADR liên quan | **KHÔNG ÁP DỤNG** | `docs/adr/` không có tài liệu; Gate hướng ticket là `không`, nên không suy diễn hoặc tạo ADR mới. |

## Reject rules

- **Không có code thừa ngoài Spec:** mọi dòng mới trong implementation phục vụ AC-01/AC-04 (lọc artifact ở input fingerprint); regression test phục vụ AC-01/03/04/05/06.
- **Không thiếu logic trực tiếp:** mỗi AC có dòng code xử lý và test/evidence tương ứng trong hai bảng trên.
- **Không có assertion né/skip/exclude check thật:** `isGeneratedArtifact` chỉ xuất hiện trong `treeFingerprint`; `runStep` và status flow vẫn được kiểm tra.

## Trục trặc gặp phải

- Có hai lần đọc đầu tiên dùng chuỗi đường dẫn Windows malformed, khiến ký tự `\t`/`\r` bị diễn giải thành control character. Đã dừng đoán path, retry bằng đường dẫn slash đã xác nhận; không ảnh hưởng source/evidence review. Đã cập nhật biến thể **Verified-path reads — Biến thể review** trong `Lesson-learned.md`.

## Round-trip check — suy ngược trước khi đối chiếu ticket gốc

### Phần suy ngược từ diff implementation và test PASS

Theo `scripts/verify.mjs` và `tests/tooling/verify-tree-fingerprint.test.ts`, yêu cầu nghiệp vụ mà implementation đang thực hiện là:

- Fingerprint `Tree` của verifier phải ổn định khi Android generated output xuất hiện hoặc thay đổi nội dung, cụ thể các nhánh `mobile/android/**` có segment `build`, `.gradle` hoặc `.cxx` không được làm đổi fingerprint; quy tắc này áp dụng cho cả tracked diff và untracked files.
- Fingerprint vẫn phải nhạy với thay đổi có ý nghĩa ngoài generated output: untracked source/config dưới `mobile/android/` nhưng ngoài các thư mục generated phải làm `Tree` đổi; tracked config như `tsconfig.json` cũng phải làm `Tree` đổi, rồi trở về giá trị ban đầu sau cleanup/restore.
- Việc loại generated output chỉ nằm trong lớp tạo fingerprint; hành vi chọn và thực thi verifier checks không được đổi. Test `--check` vẫn phải chọn đúng mobile/full/only steps và source vẫn giữ các dấu hiệu `runStep`, `shell: true`, `NOT_RUN`, `INCOMPLETE`.

Đây là phần suy ngược được ghi trước khi mở ticket gốc để thực hiện bước đối chiếu tiếp theo.

### Đối chiếu với ticket gốc sau khi suy ngược

- **Kết luận: PASS — khớp.** Ticket mô tả cùng một mục tiêu: loại generated Android build output khỏi **input** của fingerprint để Tree ổn định trước/sau build (AC-01/AC-02), nhưng vẫn giữ tracked/untracked source/config relevant ngoài generated output trong fingerprint (AC-03/AC-04), đồng thời không đổi command/check/test/build behavior và không bypass check thật (AC-05/AC-06).
- Việc implementation mở rộng nhóm artifact sang `.gradle` và `.cxx` không lệch yêu cầu: ticket cho phép “các thư mục generated/build output tương ứng” (AC-04), và test PASS bao phủ cả ba nhóm path.
- Không phát hiện điểm lệch giữa yêu cầu nghiệp vụ suy ngược và ticket gốc. Đây là kết luận **round-trip**; không phải kết luận thay thế cho việc bổ sung evidence full checkpoint nếu Planner yêu cầu đối chiếu AC riêng.
