# Changes — 05b-mobile-gradle-repository-mode-fix (sửa plan sau Plan Check FAIL)

## Diễn đạt lại ticket (mở đầu, tối đa 5 dòng)
- Mục tiêu: gỡ blocker `MavenRepo was added by plugin com.facebook.react` của `05a` bằng 1 token repository mode trong `mobile/android/settings.gradle`.
- File được phép sửa (implementation patch): duy nhất `mobile/android/settings.gradle`.
- AC chính: 1 file đổi, allow-list `google()` + `mavenCentral()`, plugin/autolinking/includeBuild giữ nguyên, `mobile:build` pass, AC-06 chỉ xác minh link blocker hiện hữu.
- Lần thực thi này: chỉ sửa `plan.md` theo Plan Check FAIL, không code, không sửa ticket, không chạy kiểm tra.

## File đã sửa trong lần thực thi này
- `.brain/evidence/05b-mobile-gradle-repository-mode-fix/plan.md`:
  - Luồng bước 7: đổi "cập nhật Blocked by/liên kết trong 05a" thành "xác minh liên kết hiện hữu `05a:4` đã có `Blocked by: 05b-...`"; ghi rõ Developer patch không chạm file `05a`, Planner xác nhận sau Tester.
  - Map AC-06: đổi hành động thành chỉ xác minh link hiện hữu, không sửa file/AC của `05a` trong implementation patch.
  - Map bước 5 ticket: đổi thành ghi evidence + xác minh link hiện hữu, không sửa file/AC của `05a`.
  - Rubric bắt buộc "Không né build...": bổ sung rõ Developer patch không chạm file `05a`, chỉ xác minh link để Planner xác nhận sau Tester.
  - Giữ nguyên mapping AC-01..AC-06, 5 bước, Rubric, scope một file `mobile/android/settings.gradle`.

## Lần thực thi implementation (theo plan Plan Check PASS, skill /implement + /ponytail)
- `mobile/android/settings.gradle` (dòng 7 duy nhất):
  - Đổi token `RepositoriesMode.FAIL_ON_PROJECT_REPOS` thành `RepositoriesMode.PREFER_SETTINGS` trong `dependencyResolutionManagement`.
  - Giữ nguyên byte/logic còn lại: `repositories { google(); mavenCentral() }`, `pluginManagement`, plugin `com.facebook.react.settings`, `ReactSettingsExtension` + `autolinkLibrariesFromCommand()`, `rootProject.name`, `include ':app'`, hai `includeBuild`.
  - Không thêm `MavenRepo`/`jcenter()`/URL/repository/dependency/plugin version; không sửa wrapper/checksum, lockfile, `node_modules`, source nghiệp vụ, root app, verifier, `.env`, `.scratch`.
- Không sửa file `05a-mobile-build-boundary-fix` hay Acceptance Criteria của `05a`; liên kết blocker `05a:4` giữ nguyên để Planner xác nhận sau Tester.
- Chưa chạy bất kỳ kiểm tra nào (test/lint/typecheck/format/build/verify) theo ràng buộc Developer.

## Ticket thay đổi giữa phiên
- Reviewer phát hiện AC-04 bản đầu yêu cầu output không được chứa warning `MavenRepo`, trong khi quyết định kỹ thuật của ticket chỉ đổi sang `RepositoriesMode.PREFER_SETTINGS`, build exit `0` nhưng warning non-fatal vẫn xuất hiện.
- Research đã cập nhật AC-04, Rubric, Evidence và bước thực hiện: chấp nhận warning nếu `mobile:build` PASS và repository-mode conflict không còn fatal; không mở rộng scope hoặc đổi verifier.
- Quyết định người dùng được Research ghi nhận ngày `2026-09-26`: chấp nhận warning non-fatal. Planner tiếp tục checkpoint cuối theo bản ticket đã cập nhật.
