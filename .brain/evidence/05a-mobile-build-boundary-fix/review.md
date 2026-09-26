# Round-trip check — `05a-mobile-build-boundary-fix`

## Bước 1 — suy ngược trước khi đọc ticket gốc

Phần này được ghi lại sau khi chỉ đối chiếu diff/source hiện tại và các evidence PASS được chỉ định; chưa mở ticket gốc tại bước này.

### Yêu cầu nghiệp vụ suy ngược

1. Root Next và mobile phải là hai compiler project độc lập: root vẫn compile được route Evidence dùng `form.get(...)`, còn mobile không làm nhiễm global `FormData` hoặc root/server-only code.
2. Mobile phải chạy độc lập qua ba lệnh `typecheck`, `test`, `build` của package mobile; root chỉ cung cấp wrapper mỏng và mobile phải tiếp tục gọi backend qua HTTP/security boundary hiện hữu.
3. Verifier phải có profile mobile theo thứ tự `mobile:typecheck` → `mobile:test` → `mobile:build`, hỗ trợ `--check` và `--only`, nhưng không tự chèn mobile native build vào profile root `fast/full`.
4. Thay đổi phải chỉ là build/tooling và test isolation cần thiết: không sửa route Evidence, không sửa business source, không thêm shim/bypass, không exclude/skip test và không làm thay đổi read-only/security boundary.

## Bước 2 — đối chiếu ticket gốc sau khi đã suy ngược

Ticket hiện tại được đọc tại `.scratch/civicos-e1-clone-mvp/issues/05a-mobile-build-boundary-fix.md`; AC-01..AC-10 và Rubric hiện tại khớp với phần suy ngược ở Bước 1.

## Ma trận Spec-to-Code Traceability — Acceptance Criteria

| ID yêu cầu | Mức độ đáp ứng | File & dòng code xử lý | Test/evidence chứng minh |
| :--- | :--- | :--- | :--- |
| AC-01 | **PASS** | `tsconfig.json:25-33` giữ include root và exclude `mobile/**`. | Run51 (`tests.md:1128-1135`; `run51-typecheck.log:48-345`) cho thấy effective `files` có `src/app/api/evidence/route.ts` nhưng không có file `mobile/`, và `exclude` chứa `mobile/**`. |
| AC-02 | **PASS** | `src/app/api/evidence/route.ts:19-25` vẫn dùng `form.get(...)`; route không nằm trong danh sách thay đổi (`changes.md:6-21`). | Run49 (`tests.md:1110-1117`; `run49-typecheck.log:2-4`) root `typecheck` PASS; không có lỗi `TS2339` trong evidence. |
| AC-03 | **PASS** | `mobile/tsconfig.json:1-10` không extends root; `mobile/package.json:8` chạy `tsc --noEmit`; root wrapper ở `package.json:14`. | Run46 mobile typecheck PASS; log `run46-mobile_typecheck.log:2-7` xác nhận delegate vào `civicos-mobile` rồi chạy `tsc --noEmit`. |
| AC-04 | **PASS** | `package.json:14-16` có ba wrapper; `mobile/package.json:8-10` có ba target; Gradle wrapper dùng 8.13 và checksum tại `mobile/android/gradle/wrapper/gradle-wrapper.properties:2-5`. | Run46 (`tests.md:1008-1017`) PASS cả ba bước; `run46-mobile_build.log:2-7,150-153` xác nhận delegate và `BUILD SUCCESSFUL`. Run48 (`run48-mobile_test.log:2-7,22-26`) PASS đúng invocation `mobile:test -- --runInBand`, 10/10 suites và 18/18 tests. |
| AC-05 | **PASS** | `package.json:27-32` khai báo profile mobile đúng thứ tự; `scripts/verify.mjs:55-67,94-108` chọn profile và báo `MISSING`/`RESULT`. | Regression profile chạy PASS 5/5 (`run50-test.log:8-13`), bao gồm `--check --scope=mobile` và kiểm tra thứ tự ba wrapper (`tests/tooling/mobile-build-boundary.test.ts:71-112`). |
| AC-06 | **PASS** | `scripts/verify.mjs:58-67,69-79` hỗ trợ `mobile`, `--only`, `fast/full`; `package.json:27-32` chỉ thêm profile mobile. | Cùng regression 5/5 (`run50-test.log:8-13`) kiểm tra `--only=mobile:typecheck` và xác nhận `fast/full` không chứa `mobile:build` (`tests/tooling/mobile-build-boundary.test.ts:83-110`). |
| AC-07 | **PASS** | `tests/tooling/mobile-build-boundary.test.ts:27-128` kiểm tra exclusion, project độc lập, wrapper, profile/selection và import boundary. | Run50: `1` file, `5 tests`, `5 passed` (`run50-test.log:8-13`). |
| AC-08 | **PASS** | `mobile/src/test-globals.d.ts:1-4` không có `interface FormData`/`declare global`; patch không chứa route Evidence; regression assertion ở `tests/tooling/mobile-build-boundary.test.ts:39-49`. | Run49 root typecheck PASS; regression 5/5 PASS; route hiện tại vẫn giữ `form.get(...)` tại `route.ts:19-25`. |
| AC-09 | **PASS** | Scan import tại `tests/tooling/mobile-build-boundary.test.ts:114-127` cấm `next`, `@prisma/`, `src/app/`; mobile boundary nằm ở `mobile/tsconfig.json:1-10` và HTTP client mobile không dùng server module. | Regression 5/5 PASS với test `keeps mobile source free of root and server-only imports`; Run46 mobile profile PASS. |
| AC-10 | **PASS** | `mobile/jest.config.js:1-7` chỉ thêm transform ESM; `deepLinks.test.ts:5-23` sửa expected contract; `navigation-readonly.test.tsx:1-11` mock MapScreen tối thiểu và vẫn giữ assertion read-only. | Run48 literal mobile test PASS 10/10 suites, 18/18 tests (`run48-mobile_test.log:11-26`); `changes.md:16-18` xác nhận đúng phạm vi whitelist, không exclude/skip. |

## Ma trận Spec-to-Code Traceability — Rubric bắt buộc

| Trục Rubric | Mức độ đáp ứng | Đối chiếu với | Bằng chứng |
| :--- | :--- | :--- | :--- |
| Root/mobile là hai compiler boundary độc lập | **PASS** | Ticket Rubric hiện tại, AC-01/AC-03 | Root `exclude: mobile/**` (`tsconfig.json:25-33`), mobile config độc lập (`mobile/tsconfig.json:1-10`), Run51 effective config và Run46 mobile typecheck PASS. |
| Route Next giữ nguyên; FormData giải quyết bằng boundary, không bằng global shim | **PASS** | Ticket Rubric hiện tại, AC-02/AC-08 | `route.ts:19-25` còn `form.get(...)`; `test-globals.d.ts:1-4` không augmentation; Run49 và regression 5/5 PASS. |
| Verifier mobile độc lập, root profile không đổi | **PASS** | Ticket Rubric hiện tại, AC-05/AC-06 | `package.json:27-32`, `scripts/verify.mjs:55-108`; regression 5/5 PASS cho check/only/mobile/fast/full. |

## Ma trận Rubric khuyến nghị

| Trục Rubric | Mức độ đáp ứng | Đối chiếu với | Bằng chứng |
| :--- | :--- | :--- | :--- |
| Tính tái lập | **PASS — đạt ngưỡng** | Ticket Rubric: `Tính tái lập` | Profile mobile có thứ tự cố định, `--check` báo bước thiếu, `--only` chọn từng bước; regression 5/5 PASS. |
| An toàn boundary | **PASS — đạt ngưỡng** | Ticket Rubric: `An toàn boundary` | Regression quét root/server-only import và global FormData shim; Run49/Run46 PASS. |
| Observability | **PASS — đạt ngưỡng** | Ticket Rubric: `Observability` | `scripts/verify.mjs:94-108,243-248` biểu diễn `MISSING`, `FAIL`, `NOT_RUN`, `INCOMPLETE`, `PASS`; regression profile PASS. |

## Fingerprint và giới hạn evidence

- Đã chỉ chạy ngoại lệ được phép: `node scripts/verify.mjs --tree` → `Tree: eb3a4e28`.
- Fingerprint khớp Run46, Run48, Run49, Run50 và Run51 (`tests.md:1008-1135`), nên các evidence PASS được chọn áp dụng đúng cây hiện tại.
- Không có mục `scope=full` PASS không-filter sau Run47; Run47 là `scope=full` FAIL tại lint và dừng trước các bước còn lại. Vì vậy kết luận dưới đây là kết luận **round-trip về mức khớp yêu cầu**, không thay thế yêu cầu Tester chạy lại full unfiltered nếu Planner cần đóng checkpoint Acceptance Criteria cuối.

## Kết luận round-trip

- **PASS:** Phần suy ngược trước khi đọc ticket khớp AC-01..AC-10 và cả ba trục Rubric hiện tại; không phát hiện lệch yêu cầu nghiệp vụ, shim/bypass, thay đổi business source hoặc phá HTTP/security boundary.
- **Không commit.**

## Trục trặc gặp phải

- Không phát sinh trục trặc công cụ/hạ tầng trong vòng review này.
- Không ghi mới hoặc cập nhật `Lesson-learned.md`.
