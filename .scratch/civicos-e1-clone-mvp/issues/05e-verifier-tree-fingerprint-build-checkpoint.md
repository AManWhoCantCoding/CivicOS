# Verifier Tree — ổn định checkpoint trước/sau mobile build

- **Status:** done
- **Blocked by:** không
- **Loại:** bug
- **Gate hướng:** có
- **Liên kết:** blocker/unblock cho `05-mobile-readonly-client`
- **File được phép sửa:**
  - `scripts/verify.mjs`
  - `tests/tooling/verify-tree-fingerprint.test.ts`
  - Evidence do Tester/Reviewer sinh trong workflow dưới `.brain/evidence/` theo quy trình hiện hành
- **File cấm sửa:**
  - Mọi production source và mobile business source dưới `src/**`, `mobile/src/**`
  - Mọi native/mobile source và config dưới `mobile/android/**`; không sửa generated artifact để làm ổn định fingerprint
  - `package.json`, `mobile/package.json`, mọi dependency manifest và lockfile
  - `node_modules/**`, `.env`, `.env.*`, `**/secrets/**`
  - `.brain/**` trong implementation patch; không sửa hoặc giả mạo evidence đã có
  - `.scratch/**` ngoài artifact của ticket do Research tạo
  - Các command/check/test/build thật của verifier; không được skip, exclude hoặc bypass bước kiểm tra để làm PASS
  - Không được lọc source/config relevant, thay đổi HTTP/business behavior, hoặc sửa Acceptance Criteria của `05-mobile-readonly-client`

## Mô tả

Checkpoint cuối của `05-mobile-readonly-client` có full PASS 35 nhưng thiếu evidence: output full ghi `Tree: 36173835`, còn `node scripts/verify.mjs --tree` độc lập sau native build ghi `Tree: edafd143`. Reviewer đã phân loại đây là thiếu evidence, không phải bug nghiệp vụ.

Ticket `05d-verifier-tree-fingerprint-generated-artifacts` đã loại các path có prefix `mobile/android/` và segment `build`, `.gradle`, `.cxx` khỏi input fingerprint, đồng thời có regression probe cho bốn thư mục đó. Tuy nhiên mismatch vẫn xuất hiện sau native build. Đọc source hiện tại cho thấy hai boundary kỹ thuật chưa được chứng minh:

- `treeFingerprint()` chạy ở dòng 191, trước toàn bộ `runStep()` ở dòng 204–241. Vì vậy full verifier ghi snapshot trước build, còn `--tree` độc lập sau build đọc snapshot sau build.
- Với tracked file, `git diff HEAD` chỉ có pathspec loại ba nhóm Android nói trên. Với untracked non-ignored file, fingerprint vẫn thêm `path:size:mtimeMs` và chỉ gọi `isGeneratedArtifact()` cho path nằm dưới `mobile/android/`. Một generated/untracked path nằm ngoài các nhóm này, hoặc một path bị build chạm mốc thời gian, vẫn có thể làm Tree đổi.

Evidence hiện có không lưu inventory path xuất hiện/thay đổi giữa lúc full PASS và lần `--tree` độc lập; do đó chưa được phép kết luận một path cụ thể là nguyên nhân. Ticket này giao đúng owner verifier để tái hiện, ghi inventory trong regression test và sửa tối thiểu lớp fingerprint, không mở rộng sang code sản phẩm.

## Acceptance Criteria (bắt buộc — chặn done, PASS 100%)

- [x] **AC-01:** Given cùng một checkout không sửa source/config relevant, When chụp `node scripts/verify.mjs --tree` trước và ngay sau `npm run mobile:build`, Then cả hai output đều có dạng `Tree: [0-9a-f]{8}` và fingerprint giống hệt nhau; test ghi được tập path generated/untracked xuất hiện hoặc đổi sau build.
- [x] **AC-02:** Given `node scripts/verify.mjs 05-mobile-readonly-client --scope=full` hoàn tất với exit `0` và bảy step `PASS`, When chạy ngay `node scripts/verify.mjs --tree` trên cùng checkout, Then dòng `Tree: <fingerprint>` trong full output/evidence bằng chính xác dòng `Tree: <fingerprint>` của invocation độc lập sau đó.
- [x] **AC-03:** Given inventory path do native build tạo/cập nhật, When kiểm tra từng path qua cùng logic phân loại fingerprint, Then mọi generated artifact bị loại khỏi input fingerprint bằng rule path cụ thể hoặc đã bị Git ignore; không có rule loại source/config relevant chỉ vì nằm trong `mobile/**` hoặc `mobile/android/**`.
- [x] **AC-04:** Given `mobile/android/settings.gradle`, `mobile/android/app/build.gradle`, `mobile/android/gradle.properties` và một untracked non-ignored source/config probe ngoài generated output, When sửa từng file rồi chạy `node scripts/verify.mjs --tree`, Then fingerprint đổi; sau khi khôi phục/xóa probe, fingerprint trở về đúng baseline.
- [x] **AC-05:** Given verifier sau patch và một invocation có step fail thật, When chạy `--check`, `--only`, `--scope=mobile` và profile có fail, Then thứ tự/chọn step, exit code, `PASS`/`FAIL`/`NOT_RUN`/`INCOMPLETE`, việc chạy command thật và output `RESULT` giữ nguyên baseline; chỉ input fingerprint được điều chỉnh.
- [x] **AC-06:** Given implementation patch và regression test của ticket, When kiểm tra changed paths và chạy test regression, Then implementation chỉ chạm `scripts/verify.mjs` và `tests/tooling/verify-tree-fingerprint.test.ts` (ngoài evidence workflow), không sửa product/mobile behavior, dependency, lockfile, ticket 05 hoặc dùng skip/exclude/bypass cho actual checks.

## Rubric (mức độ đạt)

### Bắt buộc (chặn done — phải PASS 100%, Reviewer chấm như Acceptance Criteria)

- [x] Tree full PASS khớp `--tree` độc lập ngay sau mobile build và không còn chênh lệch do generated artifact; nguồn: AC-01/AC-02 và review checkpoint của `05-mobile-readonly-client`.
- [x] Inventory generated path được bao phủ nhưng source/config relevant vẫn nhạy; nguồn: `spec.md#9-hợp-đồng-triển-khai-tự-động` và AC-03/AC-04.
- [x] Verifier actual checks không đổi, không có bypass, và patch chỉ thuộc owner verifier/test; nguồn: `05d-verifier-tree-fingerprint-generated-artifacts.md#20-21` và AC-05/AC-06.

### Khuyến nghị (không chặn done, chỉ ghi nhận — trừ khi dưới ngưỡng tối thiểu)

| Trục | Mô tả kỳ vọng | Thang điểm | Ngưỡng tối thiểu |
|---|---|---:|---:|
| Tính tái lập | Regression mô phỏng đúng lifecycle trước/sau native build và ghi inventory path | 0–2 | 1 |
| Bảo toàn phạm vi | Source/config tracked và untracked relevant vẫn làm Tree đổi | 0–2 | 1 |
| Tối thiểu hóa thay đổi | Diff chỉ ở fingerprint logic và regression test, không chỉnh verifier step flow | 0–2 | 1 |

## Các bước thực hiện

- [x] Đối chiếu evidence full PASS 35, `Tree: 36173835`, `Tree: edafd143` và source `scripts/verify.mjs`; xác nhận Tree được chụp trước step execution và lập giả thuyết path/mtime có thể làm lệch fingerprint.
- [x] Tái hiện lifecycle trước/sau `npm run mobile:build` trong test/regression harness mà không sửa generated artifact; ghi tập path xuất hiện, bị cập nhật hoặc thay đổi mtime và phân loại tracked/ignored/untracked.
- [x] Điều chỉnh tối thiểu `treeFingerprint`/path classifier trong `scripts/verify.mjs` để loại đúng generated path đã chứng minh; nếu nguyên nhân là metadata `mtimeMs`, thay bằng cách fingerprint deterministic nhưng vẫn giữ sensitivity của source/config relevant.
- [x] Mở rộng `tests/tooling/verify-tree-fingerprint.test.ts` cho exact generated-path inventory, lifecycle trước/sau native build, mtime/content change và source/config sensitivity.
- [x] Regression-test `--check`, `--only`, `--scope=mobile`, full profile và một failure thật; xác nhận mọi actual check vẫn chạy, status/exit semantics không đổi và không có skip/exclude/bypass.
- [x] Kiểm tra changed paths/diff theo whitelist, xác nhận không sửa ticket 05/05d, không sửa mobile/native/product source, rồi ghi evidence cho Planner/Reviewer để đối chiếu lại checkpoint ticket 05.

## Đang chờ Research

Không có quyết định nghiệp vụ cần hỏi user. Đây là blocker kỹ thuật của fingerprint/evidence. Nếu inventory cho thấy cần sửa `package.json`, mobile/native source/config, hoặc thay đổi command/check thật, phải dừng và tạo blocker riêng thay vì mở rộng ticket này.

## Trạng thái cuối

done

## Comments

- 2026-09-26 — Research: Tạo follow-up theo yêu cầu sau khi Reviewer xác nhận full PASS 35 của `05-mobile-readonly-client` không khớp `--tree` độc lập. Ticket sở hữu `scripts/verify.mjs` và regression test, liên kết để unblock ticket 05; không sửa code sản phẩm, AC ticket 05 hoặc evidence `.brain/**`.
