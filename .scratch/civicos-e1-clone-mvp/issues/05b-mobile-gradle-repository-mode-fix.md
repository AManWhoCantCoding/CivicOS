# Mobile Gradle repository mode — giải quyết conflict với React Native settings plugin

- **Status:** done
- **Blocked by:** không (ticket này unblocks `05a-mobile-build-boundary-fix`)
- **Loại:** bug
- **Gate hướng:** không
- **File được phép sửa:**
  - `mobile/android/settings.gradle`
- **File cấm sửa:**
  - Mọi file ngoài `mobile/android/settings.gradle`
  - Mobile business source và production source
  - `mobile/android/gradle/wrapper/**` (wrapper/checksum đã đúng)
  - `package-lock.json`, `npm-shrinkwrap.json`, `yarn.lock`, `pnpm-lock.yaml` và mọi dependency/lockfile
  - `node_modules/**`
  - `.env`, `.env.*`, `**/secrets/**`
  - `src/app/**`, root route/app và `src/modules/**`
  - `scripts/verify.mjs`, các script/package config, test config và `.scratch/**` ngoài artifact ticket do Research tạo
  - Skip, exclude, bypass hoặc thay đổi verifier để né `mobile:build`

## Mô tả

`05a-mobile-build-boundary-fix` đã xử lý xong boundary/tooling và wrapper Gradle. Khi chạy:

```text
node scripts/verify.mjs 05a-mobile-build-boundary-fix --only=mobile:build --timeout=1200000
```

`mobile:build` dừng với lỗi:

```text
Build was configured to prefer settings repositories over project repositories but repository 'MavenRepo' was added by plugin 'com.facebook.react'.
```

`mobile/android/settings.gradle` hiện có `dependencyResolutionManagement` dùng `RepositoriesMode.FAIL_ON_PROJECT_REPOS`, đồng thời giữ React Native settings plugin và autolinking. Ticket này chỉ điều chỉnh repository mode trong file đó để Gradle không chặn repository do `com.facebook.react` thêm, nhưng phải giữ nguyên allow-list repository và dependency provenance hiện tại.

### Quyết định kỹ thuật trong scope

- Dùng mode ưu tiên repository tại settings nhưng không fail khi plugin React Native khai báo repository project (`RepositoriesMode.PREFER_SETTINGS`), vì đây là thay đổi tối thiểu để xử lý đúng lỗi hiện tại.
- Giữ nguyên `dependencyResolutionManagement.repositories` chỉ gồm `google()` và `mavenCentral()`.
- Giữ nguyên `pluginManagement.repositories` (`google()`, `mavenCentral()`, `gradlePluginPortal()`), React Native settings plugin, `ReactSettingsExtension`, autolinking và các `includeBuild` hiện có.
- Không thêm `MavenRepo`, `jcenter()`, URL repository mới, dependency, plugin version hoặc workaround skip/exclude. Nếu mode trên vẫn không đủ để build, ghi nhận technical blocker trong ticket thay vì tự mở rộng repository hoặc sửa `05a`.

## Acceptance Criteria (bắt buộc — chặn done, PASS 100%)

- [x] **AC-01:** Given checkout hiện tại có `mobile/android/settings.gradle`, When kiểm tra changed paths của patch, Then chỉ có `mobile/android/settings.gradle` được thay đổi trong implementation patch và file này không chứa thay đổi ngoài repository-mode fix cần cho blocker.
- [x] **AC-02:** Given `mobile/android/settings.gradle` sau patch, When đọc `dependencyResolutionManagement`, Then `repositoriesMode` là `RepositoriesMode.PREFER_SETTINGS` và danh sách repository dependency vẫn chính xác là `google()` rồi `mavenCentral()`, không có repository thứ ba.
- [x] **AC-03:** Given `mobile/android/settings.gradle` sau patch, When đối chiếu các phần không thuộc repository mode với baseline trước ticket, Then `pluginManagement.repositories` vẫn là `google()`, `mavenCentral()`, `gradlePluginPortal()`, còn React Native settings plugin, `ReactSettingsExtension`, `autolinkLibrariesFromCommand()`, `rootProject.name`, `include ':app'` và hai `includeBuild` không đổi.
- [x] **AC-04:** Given Android SDK/NDK và Gradle wrapper của ticket `05a` đã được duyệt, When chạy `node scripts/verify.mjs 05a-mobile-build-boundary-fix --only=mobile:build --timeout=1200000`, Then process exit `0`, step `mobile:build` PASS, repository-mode conflict không còn là fatal error, và output được phép vẫn chứa warning `repository 'MavenRepo' was added by plugin 'com.facebook.react'`.
- [x] **AC-05:** Given patch của ticket, When quét diff và dependency/repository declarations liên quan, Then không có thay đổi tới production/mobile business source, wrapper/checksum, lockfile/dependency, `node_modules`, `.env`, root route/app, verifier, skip/exclude/bypass, hoặc URL/repository mới.
- [x] **AC-06:** Given `mobile:build` đã pass theo AC-04, When kiểm tra trạng thái blocker của `05a-mobile-build-boundary-fix`, Then blocker repository-mode được liên kết tới ticket này và `05a` có thể tiếp tục các bước còn lại mà không thay đổi Acceptance Criteria nghiệp vụ/tooling của `05a`.

## Rubric (mức độ đạt)

### Bắt buộc (chặn done — phải PASS 100%, Reviewer chấm như Acceptance Criteria)

- [x] Repository allow-list vẫn bị giới hạn ở `google()` và `mavenCentral()` trong `dependencyResolutionManagement`; nguồn: `spec.md#9-hợp-đồng-triển-khai-tự-động` và yêu cầu blocker này.
- [x] React Native settings plugin/autolinking vẫn hoạt động và `mobile:build` pass bằng thay đổi repository mode tối thiểu; nguồn: `05a-mobile-build-boundary-fix.md#79-hạ-tầng-chặn` và AC-04 của ticket này.
- [x] Không né build hoặc hạ boundary/security bằng repository tùy tiện, skip/exclude/bypass hay sửa ngoài allow-list; nguồn: `spec.md#9-hợp-đồng-triển-khai-tự-động` và AC-05 của ticket này.

### Khuyến nghị (không chặn done, chỉ ghi nhận — trừ khi dưới ngưỡng tối thiểu)

| Trục | Mô tả kỳ vọng | Thang điểm | Ngưỡng tối thiểu |
|---|---|---|---|
| Tối thiểu hóa thay đổi | Diff chỉ đổi repository mode cần thiết trong `settings.gradle`, không format lại hoặc chỉnh unrelated config | 0–2 | 1 |
| Provenance repository | Evidence chỉ ra rõ settings allow-list và không có repository/dependency mới | 0–2 | 1 |
| Tính tái lập | Exact verifier command của AC-04 tái hiện được build pass và chứng minh repository-mode conflict không còn là fatal blocker; warning `MavenRepo` non-fatal được chấp nhận | 0–2 | 1 |

### Evidence cần ghi cho Planner/Tester

- Output đầy đủ của `node scripts/verify.mjs 05a-mobile-build-boundary-fix --only=mobile:build --timeout=1200000`, gồm command, exit code, kết quả `mobile:build` và ghi nhận warning `MavenRepo` (nếu xuất hiện) là non-fatal theo AC-04.
- Diff/stat của `mobile/android/settings.gradle`, chứng minh chỉ repository mode thay đổi và các block/plugin/autolinking còn lại giữ nguyên.
- Kết quả kiểm tra allow-list: `dependencyResolutionManagement.repositories` chỉ có `google()` và `mavenCentral()`; không có repository URL hoặc dependency mới.
- Liên kết blocker từ `05a-mobile-build-boundary-fix` sang ticket này; không thay đổi AC của `05a`.

## Các bước thực hiện

- [x] Xác nhận baseline của `mobile/android/settings.gradle` và lỗi `MavenRepo` bằng command verifier đã nêu; xác nhận Gradle wrapper/checksum không thuộc scope ticket.
- [x] Đổi duy nhất `repositoriesMode` trong `dependencyResolutionManagement` sang `RepositoriesMode.PREFER_SETTINGS`; giữ nguyên toàn bộ repository allow-list, plugin/autolinking và include build.
- [x] Kiểm tra diff để bảo đảm không thêm repository, dependency, plugin version, URL, skip/exclude/bypass hoặc thay đổi file ngoài scope.
- [x] Chạy `node scripts/verify.mjs 05a-mobile-build-boundary-fix --only=mobile:build --timeout=1200000` và xác nhận `mobile:build` exit `0`, repository-mode conflict không còn fatal; không thêm bước loại bỏ warning `MavenRepo` hoặc đổi verifier.
- [x] Ghi evidence theo rubric và liên kết blocker này trong `05a-mobile-build-boundary-fix`, chỉ cập nhật `Blocked by`/liên kết, không sửa Acceptance Criteria của `05a`.

## Đang chờ Research

Không có câu hỏi nghiệp vụ chờ người dùng. Quyết định đã xác nhận: chấp nhận warning `repository 'MavenRepo' was added by plugin 'com.facebook.react'` nếu warning non-fatal và `mobile:build` exit `0`; không mở rộng scope, không thêm repository và không đổi verifier để loại bỏ warning. Nếu `RepositoriesMode.PREFER_SETTINGS` vẫn không giải quyết được build, dừng và ghi technical blocker để Planner xin quyết định.

## Trạng thái cuối

 done

## Comments

- 2026-09-26 — Research: Tạo ticket blocker riêng theo yêu cầu tiếp tục sau khi `05a` bị chặn. Scope chỉ gồm `mobile/android/settings.gradle`; hướng kỹ thuật tối thiểu là `PREFER_SETTINGS`, giữ nguyên allow-list và React Native settings/autolinking.
- 2026-09-26 — User decision: Chấp nhận warning `repository 'MavenRepo' was added by plugin 'com.facebook.react'` khi warning non-fatal; AC-04 được hiểu là `mobile:build` exit `0`, step PASS và repository-mode conflict không còn fatal. Không mở rộng scope hoặc thay đổi verifier để loại bỏ warning.
