# Mobile build boundary — cô lập TypeScript root/mobile và verifier

- **Status:** done
- **Blocked by:** Không còn (05b-mobile-gradle-repository-mode-fix đã done; repository-mode blocker đã được xử lý)
- **Loại:** bug
- **Gate hướng:** có
- **File được phép sửa:**
  - `tsconfig.json`
  - `package.json`
  - `scripts/verify.mjs`
  - `mobile/package.json` và `mobile/tsconfig.json` chỉ để bảo đảm command/config độc lập
  - `mobile/android/gradle/wrapper/gradle-wrapper.properties` chỉ để cập nhật `distributionUrl` lên Gradle `8.13` và `distributionSha256Sum` thành checksum chính thức phục vụ `mobile:build`
   - `mobile/src/test-globals.d.ts` chỉ khi cần loại bỏ workaround global gây xung đột
   - `mobile/jest.config.js` chỉ để cấu hình transform ESM cần cho test mobile/MapLibre; không được exclude hoặc skip test
   - `mobile/src/features/__tests__/deepLinks.test.ts` chỉ để cập nhật assertion theo contract object hiện tại
   - `mobile/src/features/__tests__/navigation-readonly.test.tsx` chỉ để sửa lỗi test loading/config integration liên quan MapLibre
   - `tests/tooling/mobile-build-boundary.test.ts`
- **File cấm sửa:**
  - `src/app/api/evidence/route.ts`
  - `src/app/**` và `src/modules/**`
  - `.env`, `.env.*`, `**/secrets/**`
    - `.brain/**`
    - `node_modules/**`
    - `mobile/android/**` — trừ đúng `mobile/android/gradle/wrapper/gradle-wrapper.properties` được whitelist ở trên
    - `mobile/src/features/**` và các mobile business source khác, trừ đúng hai test file được liệt kê trong whitelist
   - `.scratch/**` — trừ các ticket artifact do Research cập nhật

## Mô tả

Tách compiler project của Next/root khỏi `mobile/**` để lỗi global `FormData` của React Native không làm hỏng route Next hiện hữu. Bổ sung command root wrapper và profile verifier riêng cho mobile để `typecheck`, `test`, `build` của mobile được chạy độc lập. Theo quyết định scope ngày 2026-09-26, ticket cũng sở hữu các sửa đổi test/config tối thiểu để mobile test chạy được: cập nhật assertion `deepLinks` theo object contract hiện tại và cấu hình Jest transform cho ESM của MapLibre. Sau khi `mobile:build` xác định Gradle wrapper `8.11.1` thấp hơn mức tối thiểu `8.13` của Android plugin, user đã chọn mở rộng whitelist đúng file `mobile/android/gradle/wrapper/gradle-wrapper.properties` để cập nhật `distributionUrl` lên Gradle `8.13` và `distributionSha256Sum` thành checksum chính thức `20f1b1176237254a6fc204d8434196fa11a4cfb387567519c61556e8710aed78`, rồi chạy lại build. Build tiếp tục gặp repository-mode conflict tại `mobile/android/settings.gradle`; user chọn giữ nguyên whitelist hiện tại, nên `settings.gradle` nằm ngoài phạm vi ticket và ticket chờ xử lý blocker này ở scope riêng. Đây là blocker tooling/mobile integration trước khi giao lại `05-mobile-readonly-client`; không thay đổi mobile business source, AC nghiệp vụ, HTTP contract, read-only flow hoặc security boundary của mobile.

Không được sửa `src/app/api/evidence/route.ts` và không được thêm hoặc giữ global `FormData` shim làm điều kiện pass. Root phải compile route bằng boundary/config đúng; typing cần riêng cho mobile (nếu còn cần) phải chỉ thuộc mobile project.

## Acceptance Criteria (bắt buộc — chặn done, PASS 100%)

- [x] Given checkout có cả `src/**` của Next và `mobile/**`, When chạy `tsc --showConfig -p tsconfig.json`, Then root compiler config có exclusion bao phủ `mobile/**` và danh sách `files`/`include` hiệu lực không chứa file dưới `mobile/`.
- [x] Given `src/app/api/evidence/route.ts` đang dùng `formData.get(...)`, When chạy `npm run typecheck`, Then command exit `0`, không xuất hiện lỗi `TS2339` về `FormData.get`, và file route không bị sửa.
- [x] Given package `mobile/` có `mobile/tsconfig.json`, When chạy `npm --prefix mobile run typecheck`, Then command dùng mobile project riêng, exit `0`, và không nạp root `tsconfig.json` hoặc module server-only của Next.
- [x] Given các script root đã có của CivicOS và `mobile/android/gradle/wrapper/gradle-wrapper.properties` có `distributionUrl` trỏ tới Gradle `8.13`, When chạy lần lượt `npm run mobile:typecheck`, `npm run mobile:test -- --runInBand` và `npm run mobile:build`, Then mỗi command delegate đúng sang package `mobile/`, chạy độc lập với root Next và exit `0` trong môi trường đã được ticket 00 duyệt.
- [x] Given `package.json` có profile `verify.mobile`, When chạy `node scripts/verify.mjs 05-mobile-readonly-client --check --scope=mobile`, Then verifier liệt kê đúng thứ tự `mobile:typecheck`, `mobile:test`, `mobile:build`, không có bước `MISSING` và kết luận `RESULT: đủ bước`.
- [x] Given verifier nhận `--scope=mobile` và `--only`, When chạy `node scripts/verify.mjs 05-mobile-readonly-client --scope=mobile --only=mobile:typecheck`, Then chỉ `mobile:typecheck` được chọn/chạy; khi `--scope=full` hoặc `--scope=fast`, danh sách root hiện hữu vẫn giữ nguyên và không tự chèn mobile native build.
- [x] Given regression test của build boundary, When chạy `npm test -- tests/tooling/mobile-build-boundary.test.ts`, Then test assert được root config không nhận `mobile/**`, profile mobile ánh xạ đủ ba command theo đúng thứ tự, và verifier không báo thiếu script.
- [x] Given patch build-boundary này được review, When kiểm tra danh sách file thay đổi và các khai báo type global, Then không có `src/app/api/evidence/route.ts` trong patch, không có khai báo/augmentation global `FormData` còn lại để che lỗi, và root typecheck pass không phụ thuộc shim global.
- [x] Given các command typecheck/test/build mobile được chạy, When quét dependency/import của mobile bundle và test entrypoint, Then không có import `next`, Prisma server-only, `src/app/**` hoặc `src/app/api/evidence/route.ts`; mobile chỉ gọi backend qua HTTP contract đã chốt ở ticket `06-mobile-readonly-backend-contract`.
- [x] Given các test/config mobile nằm trong whitelist của ticket, When sửa để làm `mobile:test -- --runInBand` PASS, Then chỉ được sửa assertion contract trong `deepLinks.test.ts` hoặc Jest/MapLibre transform trong `jest.config.js` và `navigation-readonly.test.tsx`; không được exclude/skip test hoặc sửa mobile business source.

## Rubric (mức độ đạt)

### Bắt buộc (chặn done — phải PASS 100%, Reviewer chấm như Acceptance Criteria)

- [x] Root/mobile là hai compiler boundary độc lập; nguồn: `.scratch/civicos-e1-clone-mvp/spec.md#27-đích-triển-khai-mobile` và AC-01/AC-32 của ticket `05-mobile-readonly-client`.
- [x] Route Next hiện hữu được giữ nguyên và lỗi `FormData` được giải quyết bằng project boundary, không bằng global shim; nguồn: ticket `05-mobile-readonly-client` — “Lý do wontfix”, và AC-02 của ticket này.
- [x] Verifier có profile mobile kiểm tra được bằng `--check`, chạy đúng command độc lập và không làm thay đổi profile root; nguồn: `.scratch/civicos-e1-clone-mvp/spec.md#9-hợp-đồng-triển-khai-tự-động`.

### Khuyến nghị (không chặn done, chỉ ghi nhận — trừ khi dưới ngưỡng tối thiểu)

| Trục | Mô tả kỳ vọng | Thang điểm | Ngưỡng tối thiểu |
|---|---|---|---|
| Tính tái lập | Một command verifier có thể kiểm tra riêng root hoặc mobile và báo thiếu script rõ ràng | 0–2 | 1 |
| An toàn boundary | Regression test bắt được việc root lại nạp `mobile/**` hoặc mobile nạp server-only code | 0–2 | 1 |
| Observability | Evidence verifier phân biệt command mobile, trạng thái `MISSING`, `FAIL`, `PASS` và `INCOMPLETE` | 0–2 | 1 |

## Các bước thực hiện

- [x] Cô lập root `tsconfig.json` khỏi `mobile/**` và bảo đảm root typecheck compile route Evidence mà không sửa route.
- [x] Bảo đảm `mobile/tsconfig.json` và các typing mobile cần thiết hoạt động trong project riêng; loại bỏ hoặc thay thế global `FormData` shim, không dùng shim để che lỗi root.
- [x] Thêm root wrapper scripts `mobile:typecheck`, `mobile:test`, `mobile:build` trong `package.json`, giữ nguyên các script root hiện hữu.
- [x] Mở rộng `scripts/verify.mjs` và `package.json` với profile `verify.mobile`, hỗ trợ `--scope=mobile`, `--check`, `--only` và không chèn mobile build vào `fast/full`.
- [x] Viết regression test cho exclusion, script mapping, verifier profile và chống cross-boundary import/shim.
- [x] Cập nhật duy nhất `distributionUrl` và `distributionSha256Sum` trong `mobile/android/gradle/wrapper/gradle-wrapper.properties` lên Gradle `8.13` và checksum chính thức `20f1b1176237254a6fc204d8434196fa11a4cfb387567519c61556e8710aed78`, giữ nguyên mọi dòng khác; sau đó chạy root typecheck, regression test, ba command mobile riêng và verifier `--check`/profile mobile; ghi kết quả cho Planner/Tester, không sửa AC nghiệp vụ ticket 05.
- [x] Sửa tối thiểu test/config mobile trong whitelist để giải quyết deepLinks contract và ESM MapLibre transform; chạy lại `mobile:test -- --runInBand` và xác nhận không dùng exclude/skip.

## Đang chờ Research

Không còn câu hỏi nghiệp vụ chờ user. Sau lỗi repository-mode conflict tại `mobile/android/settings.gradle`, user chọn giữ scope hiện tại; không mở rộng whitelist 05a sang file này. Ticket chờ xử lý conflict ở ticket/scope riêng.

## Hạ tầng chặn

Blocker Android SDK/NDK đã được user xử lý: `source.properties` hiện tồn tại trong NDK `27.0.12077973`. Repository-mode blocker tại `mobile/android/settings.gradle` đã được xử lý trong ticket 05b; 05a không mở rộng whitelist sang file đó.

## Trạng thái cuối

 done

## Comments

- 2026-09-26 — Research: Tạo ticket tooling/bug này theo phê duyệt của user. Ticket `05-mobile-readonly-client` giữ nguyên toàn bộ AC nghiệp vụ; ticket này sở hữu build boundary, root/mobile command và regression verifier, đồng thời cấm sửa `src/app/api/evidence/route.ts` và cấm global `FormData` shim.
- 2026-09-26 — Research: User chọn hướng mở rộng scope 05a. Bổ sung whitelist cho `mobile/jest.config.js`, `deepLinks.test.ts` và `navigation-readonly.test.tsx` để xử lý ESM MapLibre transform và assertion contract hiện tại; vẫn cấm sửa mobile business source, exclude/skip test, hoặc hạ assertion.
- 2026-09-26 — Research: Sau khi `mobile:build` fail vì wrapper đang ở Gradle `8.11.1` trong khi Android plugin yêu cầu tối thiểu `8.13`, user chọn mở rộng whitelist đúng `mobile/android/gradle/wrapper/gradle-wrapper.properties`. Chỉ được cập nhật `distributionUrl` lên Gradle `8.13`, không mở rộng sang Android source/config khác; sau đó phải chạy lại build.
- 2026-09-26 — Research: User xác nhận mở rộng whitelist thêm đúng dòng `distributionSha256Sum` trong `mobile/android/gradle/wrapper/gradle-wrapper.properties`, cập nhật thành checksum chính thức `20f1b1176237254a6fc204d8434196fa11a4cfb387567519c61556e8710aed78`, giữ nguyên mọi dòng khác; không thay đổi Acceptance Criteria.
- 2026-09-26 — Research: Build mới fail với repository-mode conflict do plugin `com.facebook.react` thêm `MavenRepo` trong khi settings ưu tiên repositories. User chọn giữ scope hiện tại; không whitelist `mobile/android/settings.gradle`, không thay đổi Acceptance Criteria, và để ticket chờ vì conflict nằm ngoài phạm vi 05a.
- 2026-09-26 — Research: Liên kết blocker sang `05b-mobile-gradle-repository-mode-fix`; chỉ cập nhật `Blocked by`, giữ nguyên toàn bộ Acceptance Criteria của 05a.
