# Verifier tree fingerprint — loại generated Android build artifacts khỏi checkpoint evidence

- **Status:** ready-for-human
- **Blocked by:** không (unblocks checkpoint evidence của `05a`, `05b`, `05c`)
- **Loại:** bug
- **Gate hướng:** không
- **File được phép sửa:**
  - `scripts/verify.mjs`
  - `tests/tooling/verify-tree-fingerprint.test.ts`
  - Evidence do Tester/Reviewer sinh trong workflow dưới `.brain/evidence/` theo quy trình hiện hành; Research không tự ghi evidence
- **File cấm sửa:**
  - Mọi production source và mobile business source dưới `src/**`, `mobile/src/**`
  - Mọi native/mobile behavior hoặc Android source/config ngoài logic fingerprint trong `scripts/verify.mjs`, gồm `mobile/android/**` và đặc biệt `mobile/android/**/build/**`
  - `package.json`, `mobile/package.json`, mọi dependency manifest và lockfile
  - `node_modules/**`, `.env`, `.env.*`, `**/secrets/**`
  - `.brain/**` trong implementation patch; không sửa hoặc giả mạo evidence đã có
  - `.scratch/civicos-e1-clone-mvp/issues/05a-mobile-build-boundary-fix.md`
  - `.scratch/civicos-e1-clone-mvp/issues/05b-mobile-gradle-repository-mode-fix.md`
  - `.scratch/civicos-e1-clone-mvp/issues/05c-mobile-react-native-host-kotlin-compatibility.md`
  - Các command/check/test/build thật của verifier; không được skip, exclude hoặc bypass bước kiểm tra thực tế để làm PASS
  - Không được dùng fingerprint filter này để loại source/config hoặc business input khỏi các check thật

## Mô tả

Đây là technical blocker cho checkpoint evidence của `05a-mobile-build-boundary-fix`, `05b-mobile-gradle-repository-mode-fix` và `05c-mobile-react-native-host-kotlin-compatibility`. Code/build đã PASS, nhưng fingerprint cuối không ổn định vì `scripts/verify.mjs` hiện tính Tree từ `git diff HEAD` và mọi untracked non-ignored path. Mobile Android build tạo/cập nhật hàng trăm generated artifact dưới `mobile/android/app/build/**`, `mobile/android/build/**` và các thư mục `build` tương tự, khiến fileset của fingerprint thay đổi dù production code không đổi.

Sửa tối thiểu phần tạo fingerprint để chỉ loại generated/build output khỏi **input của fingerprint** (tối thiểu `mobile/android/**/build/**`, hoặc pattern tổng quát tương đương nhưng chỉ áp dụng cho thư mục build/generated artifact), đồng thời giữ nguyên command/test behavior và không thay đổi Acceptance Criteria nghiệp vụ của `05a`, `05b`, `05c`. Các tracked hoặc untracked non-ignored source/config liên quan vẫn phải được fingerprint; không được biến việc lọc artifact thành cách che thay đổi implementation.

## Acceptance Criteria (bắt buộc — chặn done, PASS 100%)

- [x] **AC-01:** Given cùng một checkout trước và sau khi chạy mobile build tạo/cập nhật file dưới `mobile/android/app/build/**` hoặc `mobile/android/build/**`, When chạy `node scripts/verify.mjs --tree` ở cả hai thời điểm, Then hai dòng `Tree <fingerprint>` giống hệt nhau nếu không có thay đổi source/config liên quan.
- [x] **AC-02:** Given mobile build và test đã PASS, When chạy `node scripts/verify.mjs 05a-mobile-build-boundary-fix --scope=mobile` và ngay sau đó chạy `node scripts/verify.mjs --tree`, Then command profile mobile exit `0`, toàn bộ step được chọn đều `PASS`, và fingerprint `Tree` trong output/evidence của lần PASS bằng fingerprint của lần `--tree` độc lập.
- [x] **AC-03:** Given một tracked source/config relevant hoặc một untracked non-ignored source/config relevant được thêm/sửa ngoài generated/build output, When chạy `node scripts/verify.mjs --tree` trước và sau thay đổi, Then fingerprint thay đổi; các path source/config đó không bị loại khỏi input fingerprint.
- [x] **AC-04:** Given các path dưới `mobile/android/**/build/**` và các thư mục generated/build output tương ứng, When kiểm tra tập path đưa vào fingerprint sau patch, Then các artifact/generated/build output này bị loại khỏi fingerprint, nhưng các config/source như `mobile/android/settings.gradle`, `mobile/android/app/build.gradle`, `mobile/android/gradle.properties` và source/config liên quan ngoài thư mục build vẫn được giữ lại.
- [x] **AC-05:** Given `scripts/verify.mjs` sau patch, When chạy `node scripts/verify.mjs 05a-mobile-build-boundary-fix --check --scope=mobile`, `node scripts/verify.mjs 05a-mobile-build-boundary-fix --scope=mobile --only=mobile:typecheck`, và một profile verifier có step fail thật, Then thứ tự/chọn step, mã thoát, trạng thái `PASS`/`FAIL`/`INCOMPLETE`, `--check`, `--only`, `--scope` và việc chạy test/build thật giữ nguyên; chỉ input của `treeFingerprint` được thay đổi.
- [x] **AC-06:** Given implementation patch của ticket, When kiểm tra changed paths và chạy regression test fingerprint, Then chỉ `scripts/verify.mjs` và `tests/tooling/verify-tree-fingerprint.test.ts` thay đổi (ngoài evidence workflow do Tester/Reviewer sinh), không có thay đổi production/mobile behavior, dependency, lockfile, business source, `05a`/`05b`/`05c`, và không có assertion né/skip/exclude check thật.

## Rubric (mức độ đạt)

### Bắt buộc (chặn done — phải PASS 100%, Reviewer chấm như Acceptance Criteria)

- [x] Fingerprint ổn định trước/sau generated Android build và fingerprint trong mobile verifier PASS khớp `--tree`; nguồn: blocker report của `05a`/`05b`/`05c` và AC-01/AC-02 ticket này.
- [x] Tracked/untracked source/config relevant vẫn nằm trong fingerprint, còn generated/build artifact chỉ bị loại ở lớp fingerprint; nguồn: `.scratch/civicos-e1-clone-mvp/spec.md#9-hợp-đồng-triển-khai-tự-động` và AC-03/AC-04.
- [x] Verifier checks/tests/build behavior không đổi; không có skip/exclude/bypass actual check và không sửa business source; nguồn: `.scratch/civicos-e1-clone-mvp/spec.md#9-hợp-đồng-triển-khai-tự-động` và AC-05/AC-06.

### Khuyến nghị (không chặn done, chỉ ghi nhận — trừ khi dưới ngưỡng tối thiểu)

| Trục | Mô tả kỳ vọng | Thang điểm | Ngưỡng tối thiểu |
|---|---|---|---|
| Tính ổn định | Regression test mô phỏng artifact xuất hiện/thay đổi và chứng minh Tree không đổi khi source/config không đổi | 0–2 | 1 |
| Bảo toàn phạm vi | Regression test chứng minh cả tracked và untracked source/config relevant vẫn làm Tree đổi | 0–2 | 1 |
| Tối thiểu hóa thay đổi | Diff chỉ chạm fingerprint logic và regression test; không format/chỉnh unrelated verifier behavior | 0–2 | 1 |

## Các bước thực hiện

- [x] Tái hiện baseline bằng `node scripts/verify.mjs 05a-mobile-build-boundary-fix --scope=mobile` và `node scripts/verify.mjs --tree`, đồng thời xác nhận generated files dưới `mobile/android/**/build/**` là nguyên nhân làm fileset/fingerprint thay đổi.
- [x] Điều chỉnh tối thiểu `treeFingerprint` trong `scripts/verify.mjs` để lọc generated/build output khỏi input fingerprint, giữ nguyên các exclusion hiện có, thứ tự/hash behavior và không sửa luồng chạy step.
- [x] Thêm regression test tại `tests/tooling/verify-tree-fingerprint.test.ts` cho ổn định trước/sau artifact, bảo toàn tracked/untracked source/config, và giữ nguyên các verifier check/selection/status behavior.
- [x] Chạy regression test và các lệnh `--check`, `--only`, `--scope` liên quan; xác nhận verifier vẫn thực thi test/build thật và không có skip/exclude/bypass.
- [x] Chạy lại mobile verifier PASS sau build và đối chiếu fingerprint trong output/evidence với `node scripts/verify.mjs --tree`; lặp kiểm tra sau khi artifact được tạo/cập nhật.
- [x] Kiểm tra changed paths/diff và ghi evidence cho blocker của `05a`, `05b`, `05c`; không sửa ba ticket đó, không sửa AC nghiệp vụ và không thay đổi production/mobile behavior.

## Đang chờ Research

Không có câu hỏi nghiệp vụ chờ người dùng. Hướng kỹ thuật đã rõ: chỉ sửa fingerprint input để loại generated/build artifact và bổ sung regression test; nếu phát hiện cần sửa command/check thật, dependency, business source hoặc ticket `05a`/`05b`/`05c`, phải dừng và tạo blocker riêng thay vì mở rộng scope.

## Trạng thái cuối

pending

## Comments

- 2026-09-26 — Research: Tạo blocker follow-up theo yêu cầu nghiệm thu. Code/build của `05a`, `05b`, `05c` đã PASS nhưng checkpoint Tree không ổn định do untracked Android generated artifacts; ticket chỉ sở hữu `scripts/verify.mjs` và regression test, không sửa ba ticket trước hoặc AC nghiệp vụ.
