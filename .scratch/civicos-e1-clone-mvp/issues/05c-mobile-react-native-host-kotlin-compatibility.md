# Mobile React Native host — tương thích Kotlin với RN 0.85.3

- **Status:** done
- **Blocked by:** Không còn (implementation của `05b-mobile-gradle-repository-mode-fix` đã hoàn tất)
- **Loại:** bug
- **Gate hướng:** không
- **File được phép sửa:**
  - `mobile/android/app/src/main/java/com/civicosmobile/MainApplication.kt`
- **File cấm sửa:**
  - Mọi file ngoài `mobile/android/app/src/main/java/com/civicosmobile/MainApplication.kt`
  - `mobile/android/settings.gradle` và toàn bộ Gradle/wrapper/build configuration khác
  - `mobile/android/**` ngoài file được whitelist ở trên
  - `mobile/src/**`, mobile business source và root production source
  - `package.json`, mọi lockfile, dependency manifest và `node_modules/**`
  - `.env`, `.env.*`, `**/secrets/**`
  - `.brain/**`, `scripts/verify.mjs`, test config và `.scratch/**` ngoài artifact do Research tạo
  - Skip, exclude, bypass, hạ compiler warning thành pass hoặc thay đổi verifier để né `mobile:build`

## Mô tả

Sau khi 05b đổi đúng một token `FAIL_ON_PROJECT_REPOS` thành `PREFER_SETTINGS`, exact verifier đã vượt qua repository-mode fatal và chạy tới `:app:compileDebugKotlin`. Build hiện bị chặn bởi `MainApplication.kt` khi RN `0.85.3` resolve `DefaultReactNativeHost`: `getPackages()` suy luận kiểu đệ quy/không tương thích và hai member `isNewArchEnabled`/`isHermesEnabled` đang dùng method override trong khi API đã expose property override.

Log tham chiếu: `.brain/evidence/05a-mobile-build-boundary-fix/logs/run31-mobile_build.log` (các dòng 187, 201–204). Các warning `MavenRepo`/`MavenRepo2` còn xuất hiện nhưng không còn là fatal ở settings; ticket này không được sửa repository hoặc mở rộng allow-list.

Đây là technical blocker tiếp theo của `05b-mobile-gradle-repository-mode-fix`: 05b đã có thay đổi repository-mode nhưng chưa thể đạt AC build cho tới khi host Kotlin tương thích. Không sửa `05a` hoặc `05b`; quan hệ blocker được ghi nhận trong ticket này để Planner liên kết khi triage.

### Boundary kỹ thuật tối thiểu

- Chỉ điều chỉnh declaration/override của `DefaultReactNativeHost` trong `MainApplication.kt` theo API thực tế của RN `0.85.3`.
- `getPackages()` phải có kiểu trả về tường minh, tương thích `List<ReactPackage>` của host và vẫn giữ package autolinking cùng `ApiConfigPackage()` đúng một lần.
- `isNewArchEnabled` và `isHermesEnabled` phải override đúng hình thức member mà API RN `0.85.3` công bố, vẫn lấy giá trị từ `BuildConfig.IS_NEW_ARCHITECTURE_ENABLED` và `BuildConfig.IS_HERMES_ENABLED`.
- Không đổi behavior `getUseDeveloperSupport`, `getJSMainModuleName`, `onCreate` hoặc thêm dependency/plugin/repository.

## Acceptance Criteria (bắt buộc — chặn done, PASS 100%)

- [x] **AC-01:** Given implementation patch của ticket, When kiểm tra changed paths, Then chỉ `mobile/android/app/src/main/java/com/civicosmobile/MainApplication.kt` xuất hiện; không có thay đổi trong `05a`, `05b`, settings/Gradle, dependency, lockfile, verifier hoặc business source.
- [x] **AC-02:** Given RN `0.85.3` và `DefaultReactNativeHost` đã resolve, When kiểm tra `MainApplication.kt`, Then `getPackages()` khai báo kiểu trả về tường minh tương thích `List<ReactPackage>` và không còn biểu thức khiến Kotlin báo recursive type checking; danh sách package vẫn gồm autolinking packages và đúng một `ApiConfigPackage()`.
- [x] **AC-03:** Given `BuildConfig` của app có hai cờ `IS_NEW_ARCHITECTURE_ENABLED` và `IS_HERMES_ENABLED`, When kiểm tra host declaration và compile Kotlin, Then `isNewArchEnabled` và `isHermesEnabled` override đúng member API RN `0.85.3`, lần lượt trả đúng hai cờ BuildConfig và không còn lỗi `overrides nothing`.
- [x] **AC-04:** Given patch chỉ nằm trong whitelist và repository mode của 05b đang là `PREFER_SETTINGS`, When chạy `node scripts/verify.mjs 05a-mobile-build-boundary-fix --only=mobile:build --timeout=1200000`, Then process exit `0`, step `mobile:build` PASS, task `:app:compileDebugKotlin` không FAIL và output không chứa bốn lỗi Kotlin tại `MainApplication.kt` nêu trong log; các warning repository không fatal không được coi là lỗi của AC này.
- [x] **AC-05:** Given diff sau implementation, When quét source/config/dependency và repository declarations, Then không có repository/URL/dependency/plugin mới, không sửa `mobile/android/settings.gradle`, không sửa wrapper, không skip/exclude/bypass build và không dùng suppression/unsafe cast để che lỗi Kotlin.
- [x] **AC-06:** Given `mobile:build` đã PASS theo AC-04, When đối chiếu quan hệ ticket, Then kết quả được ghi là technical blocker đã giải quyết cho AC-04 của `05b-mobile-gradle-repository-mode-fix`, còn toàn bộ Acceptance Criteria và phạm vi của `05a`/`05b` vẫn giữ nguyên.

## Rubric (mức độ đạt)

### Bắt buộc (chặn done — phải PASS 100%, Reviewer chấm như Acceptance Criteria)

- [x] Host declaration tương thích đúng API RN `0.85.3`, không dùng workaround che lỗi; nguồn: log `run31-mobile_build.log` dòng 201–204 và `.scratch/civicos-e1-clone-mvp/spec.md#9-hợp-đồng-triển-khai-tự-động`.
- [x] Native build vượt qua `:app:compileDebugKotlin` bằng thay đổi duy nhất trong file whitelist; nguồn: AC-01, AC-04 và boundary của `05b-mobile-gradle-repository-mode-fix`.
- [x] Repository/dependency provenance và boundary của 05b không bị mở rộng; nguồn: `05b-mobile-gradle-repository-mode-fix.md#36-quyết-định-kỹ-thuật-trong-scope`.

### Khuyến nghị (không chặn done, chỉ ghi nhận — trừ khi dưới ngưỡng tối thiểu)

| Trục | Mô tả kỳ vọng | Thang điểm | Ngưỡng tối thiểu |
|---|---|---|---|
| Tối thiểu hóa thay đổi | Chỉ sửa declaration cần thiết trong `MainApplication.kt`, không format/chỉnh unrelated code | 0–2 | 1 |
| Tính tương thích RN | Signature/property bám API resolved của RN `0.85.3`, không hard-code workaround theo log đơn lẻ | 0–2 | 1 |
| Tính tái lập | Exact verifier command tái hiện được build pass và loại bỏ đúng bốn lỗi Kotlin | 0–2 | 1 |

## Evidence cần ghi cho Planner/Tester

- Nội dung đầy đủ của exact command trong AC-04, gồm exit code, `mobile:build PASS`, task `:app:compileDebugKotlin` và không còn bốn lỗi Kotlin tại `MainApplication.kt`.
- Diff/stat và changed-path list chứng minh chỉ file `MainApplication.kt` thay đổi.
- Snapshot/source check chứng minh `getPackages()` giữ autolinking + `ApiConfigPackage()` đúng một lần; hai BuildConfig flags được giữ nguyên.
- Kết quả quét chứng minh không sửa repository mode, repository allow-list, dependency, wrapper, verifier, 05a hoặc 05b.
- Comment/liên kết tracker xác nhận 05c là technical blocker của AC-04 trong 05b; Research không tự chuyển trạng thái 05a/05b.

## Các bước thực hiện

- [x] Đối chiếu log `run31-mobile_build.log` và API đã resolve của RN `0.85.3`; xác nhận repository warning chỉ là non-fatal và không thuộc scope sửa.
- [x] Sửa tối thiểu `MainApplication.kt`: làm tường minh kiểu `getPackages()`/package list và chuyển hai member architecture/Hermes sang declaration tương thích API, giữ nguyên behavior và `ApiConfigPackage()`.
- [x] Kiểm tra diff/changed paths và quét để loại trừ repository, dependency, wrapper, verifier, suppression, skip/exclude/bypass hoặc thay đổi ngoài whitelist.
- [x] Chạy exact verifier command ở AC-04; xác nhận `:app:compileDebugKotlin` PASS và bốn lỗi Kotlin không còn.
- [x] Ghi evidence theo mục trên và liên kết 05c như technical blocker đã giải quyết cho 05b; không sửa AC, scope hoặc trạng thái của 05a/05b.

## Đang chờ Research

Không có câu hỏi nghiệp vụ chờ người dùng. Đây là blocker kỹ thuật đã được xác định từ log; nếu API resolved của RN `0.85.3` yêu cầu sửa file ngoài whitelist, phải dừng, ghi blocker mới và không tự mở rộng scope.

## Trạng thái cuối

 done

## Comments

- 2026-09-26 — Research: Tạo ticket follow-up tối thiểu cho lỗi `MainApplication.kt` sau khi 05b đã vượt qua repository-mode fatal. 05b/05a không bị sửa; 05c ghi nhận quan hệ technical blocker và chỉ whitelist một file native host.
