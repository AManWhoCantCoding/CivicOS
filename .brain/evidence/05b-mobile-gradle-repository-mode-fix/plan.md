# Plan — 05b-mobile-gradle-repository-mode-fix

## Diễn đạt lại ticket (tối đa 5 dòng)
- Mục tiêu: gỡ blocker `MavenRepo was added by plugin com.facebook.react` của `05a` bằng cách đổi duy nhất repository mode trong `mobile/android/settings.gradle`.
- File được phép sửa: duy nhất `mobile/android/settings.gradle`.
- Thay đổi: `RepositoriesMode.FAIL_ON_PROJECT_REPOS` thành `RepositoriesMode.PREFER_SETTINGS`, giữ nguyên mọi phần còn lại.
- AC chính: chỉ 1 file đổi, allow-list vẫn `google()` + `mavenCentral()`, plugin/autolinking/includeBuild giữ nguyên, `mobile:build` pass.
- Không thêm repository/dependency/plugin/URL/skip/bypass, không sửa file ngoài scope.

## (1) File dự định sửa / tạo
- Sửa: `mobile/android/settings.gradle` — dòng 7 duy nhất (DUY NHẤT, không thêm file).
- Tạo: `.brain/evidence/05b-mobile-gradle-repository-mode-fix/plan.md` — artifact phân tích này (không thuộc implementation patch).
- Không sửa: mọi file ngoài `mobile/android/settings.gradle`, đặc biệt `mobile/android/gradle/wrapper/**`, lockfile/dependency, `node_modules/**`, `.env`, `src/app/**`, `src/modules/**`, `scripts/verify.mjs`, `.scratch/**`.
- Không tạo: file Gradle mới, repository mới, test mới, script mới trong bước implementation.

## (2) Hàm / config / interface sẽ đổi
- Đổi duy nhất 1 token enum trong block `dependencyResolutionManagement` (dòng 7 hiện tại):
  - Cũ: `repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)`
  - Mới: `repositoriesMode.set(RepositoriesMode.PREFER_SETTINGS)`
- Giữ nguyên tuyệt đối trong cùng block `dependencyResolutionManagement`:
  - `repositories { google(); mavenCentral() }` — đúng thứ tự, không thêm repository thứ ba, không thêm URL.
- Giữ nguyên tuyệt đối các block/config còn lại:
  - `pluginManagement { includeBuild('../node_modules/@react-native/gradle-plugin'); repositories { google(); mavenCentral(); gradlePluginPortal() } }` (dòng 1-4).
  - `plugins { id('com.facebook.react.settings') }` (dòng 5).
  - `extensions.configure(com.facebook.react.ReactSettingsExtension) { ex -> ex.autolinkLibrariesFromCommand() }` (dòng 6).
  - `rootProject.name = 'CivicOSMobile'` (dòng 8).
  - `include ':app'` (dòng 9).
  - `includeBuild('../node_modules/@react-native/gradle-plugin')` (dòng 10).
- Không đổi interface/API, không đổi hàm Groovy nào khác, không đổi plugin version, không thêm `MavenRepo`/`jcenter()`/URL.

## (3) Luồng xử lý chi tiết
1. Đọc baseline `mobile/android/settings.gradle` (10 dòng) và đối chiếu ticket: xác nhận dòng 7 đang là `FAIL_ON_PROJECT_REPOS`, các dòng 1-6 và 8-10 khớp mô tả giữ nguyên.
2. Ghi nhận lỗi blocker từ `05a`: `Build was configured to prefer settings repositories over project repositories but repository 'MavenRepo' was added by plugin 'com.facebook.react'` — cơ chế: `FAIL_ON_PROJECT_REPOS` fail cứng khi plugin `com.facebook.react` thêm project repository; `PREFER_SETTINGS` vẫn ưu tiên settings nhưng không fail, đúng hướng tối thiểu trong ticket.
3. Thực hiện đúng 1 edit: thay token `FAIL_ON_PROJECT_REPOS` thành `PREFER_SETTINGS` tại dòng 7, không format lại file, không tách/gộp dòng, không đổi khoảng trắng ngoài mức tối thiểu của token.
4. Tự đối chiếu diff (bằng đọc lại, không chạy lệnh kiểm tra): `git diff --stat` chỉ hiện 1 file, `git diff` chỉ hiện 1 dòng đổi token; quét không có `MavenRepo`/`jcenter`/URL/http mới, không dependency/plugin version mới, không skip/exclude/bypass.
5. Bàn giao cho Tester (Developer KHÔNG chạy): `node scripts/verify.mjs 05a-mobile-build-boundary-fix --only=mobile:build --timeout=1200000` phải exit `0` và không còn chuỗi `repository 'MavenRepo' was added by plugin 'com.facebook.react'`.
6. Nếu `PREFER_SETTINGS` vẫn không đủ build: DỪNG, ghi technical blocker trong ticket, không tự mở rộng allow-list, không sửa `05a`, không hạ security — đúng mục `Đang chờ Research`.
7. Evidence bàn giao cho Planner/Tester: output đầy đủ verifier (AC-04), diff/stat settings.gradle, kiểm tra allow-list, xác minh liên kết blocker hiện hữu từ `05a` sang ticket này (`05a:4` đã có `Blocked by: 05b-mobile-gradle-repository-mode-fix`); Developer patch không chạm file `05a`, Planner xác nhận trạng thái/link hiện hữu sau Tester.

## (4) Bảng map thay đổi với AC / Rubric / Bước thực hiện

### 4a. Map thay đổi implementation với AC-01..AC-06

| Thay đổi dự kiến | Map AC | Cách thỏa mãn |
|---|---|---|
| Đổi duy nhất token `FAIL_ON_PROJECT_REPOS` → `PREFER_SETTINGS` tại dòng 7 `mobile/android/settings.gradle`, không đụng dòng khác | AC-01 (chỉ 1 file, không thay đổi ngoài repository-mode fix) | Diff/stat chỉ 1 file; Reviewer đối chiếu diff thấy đúng 1 token đổi |
| Cùng edit trên nhưng `repositories { google(); mavenCentral() }` giữ nguyên thứ tự, không repository thứ ba | AC-02 (`repositoriesMode` là `PREFER_SETTINGS`, allow-list đúng `google()` rồi `mavenCentral()`) | Đọc block `dependencyResolutionManagement` sau patch kiểm tra enum + 2 entries |
| Không đụng dòng 1-6, 8-10: `pluginManagement` (`google/mavenCentral/gradlePluginPortal`), plugin `com.facebook.react.settings`, `ReactSettingsExtension` + `autolinkLibrariesFromCommand()`, `rootProject.name`, `include ':app'`, 2 `includeBuild` | AC-03 (phần không thuộc repository mode không đổi so với baseline) | Diff từng dòng 1-6, 8-10 rỗng; đối chiếu baseline trước ticket |
| Đổi mode để Gradle không chặn repository do `com.facebook.react` thêm (thay đổi tối thiểu, không workaround) | AC-04 (`mobile:build` exit `0`, output không còn thông báo `MavenRepo ... com.facebook.react`) | Tester chạy exact command `node scripts/verify.mjs 05a-mobile-build-boundary-fix --only=mobile:build --timeout=1200000`; Developer không tự chạy |
| Không thêm/sửa production/mobile business source, wrapper/checksum, lockfile/dependency, `node_modules`, `.env`, root route/app, verifier, skip/exclude/bypass, URL/repository mới | AC-05 (không thay đổi ngoài scope) | Quét diff + declarations: changed paths = 1 file; không có URL/dependency mới |
| Không sửa file `05a`; chỉ xác minh liên kết blocker hiện hữu `05a` → ticket này để `05a` tiếp tục | AC-06 (blocker được liên kết, `05a` tiếp tục mà không đổi AC nghiệp vụ/tooling) | Chỉ xác minh `Blocked by: 05b-mobile-gradle-repository-mode-fix` đã tồn tại tại `05a:4`; Developer patch không chạm file `05a`, Planner xác nhận sau Tester, không sửa AC của `05a` |

### 4b. Map với Rubric bắt buộc

| Rubric bắt buộc | Thay đổi đáp ứng | Nguồn đối chiếu |
|---|---|---|
| Allow-list giới hạn ở `google()` + `mavenCentral()` trong `dependencyResolutionManagement` | Giữ nguyên `repositories { google(); mavenCentral() }`, không thêm repository | `spec.md#9-hợp-đồng-triển-khai-tự-động` + yêu cầu blocker |
| RN settings plugin/autolinking vẫn hoạt động, `mobile:build` pass bằng thay đổi repository mode tối thiểu | Giữ plugin/autolinking/includeBuild, chỉ đổi enum mode | `05a-mobile-build-boundary-fix.md#79-hạ-tầng-chặn` + AC-04 |
| Không né build, không hạ boundary/security bằng repository tùy tiện/skip/exclude/bypass/sửa ngoài allow-list | Không thêm repository/URL/dependency/plugin version, không skip/bypass, không sửa file ngoài scope; Developer patch không chạm file `05a`, chỉ xác minh link hiện hữu để Planner xác nhận sau Tester | `spec.md#9-hợp-đồng-triển-khai-tự-động` + AC-05 |

### 4c. Map với Rubric khuyến nghị (không chặn done)

| Trục (thang 0-2, ngưỡng 1) | Thay đổi đáp ứng |
|---|---|
| Tối thiểu hóa thay đổi | Diff đúng 1 token enum, không format lại, không chỉnh unrelated config |
| Provenance repository | Evidence chỉ rõ settings allow-list 2 entries, không repository/dependency mới |
| Tính tái lập | Exact verifier command AC-04 tái hiện build pass và loại bỏ đúng lỗi blocker (Tester thực hiện) |

### 4d. Map với Các bước thực hiện trong ticket

| Bước trong ticket | Phủ bởi plan |
|---|---|
| Xác nhận baseline settings.gradle và lỗi `MavenRepo`, xác nhận wrapper/checksum ngoài scope | Luồng bước 1-2 + mục (2) giữ nguyên wrapper |
| Đổi duy nhất `repositoriesMode` sang `PREFER_SETTINGS`, giữ allow-list/plugin/autolinking/include build | Luồng bước 3 + toàn bộ mục (2) |
| Kiểm tra diff không thêm repository/dependency/plugin version/URL/skip/exclude/bypass/file ngoài scope | Luồng bước 4 + map AC-01/AC-05 |
| Chạy verifier AC-04, xác nhận exit `0` và hết conflict | Luồng bước 5 (Tester chạy, Developer không chạy) |
| Ghi evidence theo rubric và xác minh liên kết blocker hiện hữu từ `05a` sang ticket này, không sửa file/AC của `05a` | Luồng bước 7 + map AC-06 (Developer patch không chạm `05a`; Planner xác nhận link hiện hữu sau Tester) |

### 4e. Thay đổi không map AC/Rubric/bước — lý do
- Không có. Plan này KHÔNG chứa thay đổi nào ngoài 1 token enum đã map đầy đủ ở trên; mọi phần giữ nguyên là yêu cầu显式 trong AC-02/AC-03/AC-05 nên đều đã map, không phát sinh thay đổi thừa cần biện minh.
