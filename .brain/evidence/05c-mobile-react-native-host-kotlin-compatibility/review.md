# Review checkpoint cuối — 05c-mobile-react-native-host-kotlin-compatibility

## Phạm vi và evidence checkpoint

- Đã đọc lại toàn bộ ticket và Rubric `05c-mobile-react-native-host-kotlin-compatibility.md`, cùng `CONTEXT.md`, boundary của 05b và các evidence liên quan.
- Không chạy test, lint, typecheck, format-check hoặc build. Chỉ chạy ngoại lệ bắt buộc `node scripts/verify.mjs --tree` và nhận `Tree: ee73e1f9`.
- `05a/tests.md` Lần chạy 44 trên `HEAD: 8c454c2`, `Tree: ee73e1f9`, `only=mobile:build`, PASS; log ghi `:app:compileDebugKotlin UP-TO-DATE` và `BUILD SUCCESSFUL`.
- Theo xác nhận Tester trong yêu cầu recheck, Lần chạy 44 được thực hiện bằng exact command: `node scripts/verify.mjs 05a-mobile-build-boundary-fix --only=mobile:build --timeout=1200000`. Đây là scope đầy đủ của ticket 05c (ticket chỉ yêu cầu bước `mobile:build`), không có `filter=`.
- `05c/tests.md` Lần chạy 1 cũng khớp `HEAD: 8c454c2` và `Tree: ee73e1f9`; evidence runtime dùng kết quả mới nhất của 05a Lần chạy 44.

## Đối chiếu boundary, CONTEXT và ADR

| Phạm vi | Kết quả | Bằng chứng |
|---|---|---|
| Ticket boundary/allow-list | **PASS** | `changes.md:10–18,25–28` ghi implementation chỉ ở `MainApplication.kt`; source chỉ đổi import và declaration host, không chạm settings/Gradle/wrapper/dependency/verifier/05a/05b. Scoped status chỉ hiện target implementation cùng các artifact đã được tách riêng. |
| `CONTEXT.md` | **PASS** | `CONTEXT.md:74–79` yêu cầu mobile là package RN độc lập, dùng backend chung và MVP read-only; patch chỉ sửa host Kotlin, không thêm mobile business/write flow. |
| ADR | **Không áp dụng** | `docs/adr/` hiện không có tài liệu ADR; không có quyết định ADR nào để đối chiếu hoặc xung đột với patch. |
| Boundary của 05b | **PASS** | `05b...md:36–41` yêu cầu `PREFER_SETTINGS`, allow-list `google()` + `mavenCentral()`, giữ plugin/autolinking và không mở rộng repository. `mobile/android/settings.gradle:7` vẫn đúng mode và allow-list; 05c không sửa file này. |

## Round-trip evidence cũ

Đối chiếu evidence round-trip cũ trong `05c/review.md` trước khi cập nhật: evidence đó đã ghi rõ suy ngược trước, sau đó mới mở ticket, và kết luận PASS. Phần suy ngược nguyên văn được bảo toàn dưới đây:

> Host RN phải compile với RN `0.85.3` bằng declaration tương thích Kotlin: `getPackages(): List<ReactPackage>`, autolinking qua `PackageList(this).packages`, cộng đúng `ApiConfigPackage()`, và override hai API `isNewArchEnabled`/`isHermesEnabled` từ `BuildConfig`. Giữ nguyên hành vi host hiện hữu: `getUseDeveloperSupport()`, `getJSMainModuleName()`, `onCreate()`/`load()`; không mở rộng behavior, security hoặc scope. Evidence cần có build mobile PASS và full mobile run PASS trên cùng Tree.

- Kết luận round-trip cũ: **PASS**; khớp AC và Rubric của ticket tại `05c/review.md` cũ, và Tree hiện tại vẫn khớp `ee73e1f9`.

## Bảng 1 — Spec-to-Code Traceability Matrix: Acceptance Criteria

| ID yêu cầu (AC) | Mức độ đáp ứng | File & dòng code xử lý | Test Case/evidence chứng minh |
|---|---|---|---|
| AC-01 | **PASS** | `mobile/android/app/src/main/java/com/civicosmobile/MainApplication.kt:1–21`; implementation patch chỉ có file whitelist này. | `05c/changes.md:10–12,25–28`; `05a/tests.md:990–997` xác nhận cùng `HEAD`/Tree. Git diff tracked rỗng vì mobile implementation là file untracked trong baseline; scoped status vẫn xác nhận đúng target, không dùng sự rỗng đó để suy đoán có patch khác. |
| AC-02 | **PASS** | `MainApplication.kt:4,7,14`: import `PackageList`/`ReactPackage`; `override fun getPackages(): List<ReactPackage> = PackageList(this).packages + ApiConfigPackage()` — autolinking và đúng một `ApiConfigPackage()`. | `05c/changes.md:14–15,20–23`; `05a/logs/run44-mobile_build.log:45–49` có generate autolinking và `05a/tests.md:990–997` ghi `mobile:build PASS`. |
| AC-03 | **PASS** | `MainApplication.kt:16–17`: `override val isNewArchEnabled` và `override val isHermesEnabled` lần lượt trả `BuildConfig.IS_NEW_ARCHITECTURE_ENABLED` và `BuildConfig.IS_HERMES_ENABLED`. | `05c/changes.md:16–18`; `05a/logs/run44-mobile_build.log:87` ghi `:app:compileDebugKotlin UP-TO-DATE`, không có bốn lỗi Kotlin, và dòng 152 ghi `BUILD SUCCESSFUL`. |
| AC-04 | **PASS** | Host declaration xử lý trực tiếp tại `MainApplication.kt:12–17`; không có workaround ngoài whitelist. | Exact command `node scripts/verify.mjs 05a-mobile-build-boundary-fix --only=mobile:build --timeout=1200000` đã được Tester xác nhận cho run44; `05a/tests.md:990–997` ghi `HEAD: 8c454c2`, `Tree: ee73e1f9`, `mobile:build PASS`; log `run44-mobile_build.log:87,152` xác nhận compile Kotlin không lỗi và build thành công. Tree do Reviewer đối chiếu bằng `node scripts/verify.mjs --tree` cũng là `ee73e1f9`. Warning repository tại `run44-mobile_build.log:31–43` không fatal, phù hợp AC-04. |
| AC-05 | **PASS** | `MainApplication.kt:3–20` chỉ thêm import/type/declaration cần cho API RN; không có repository, URL, dependency/plugin, suppression, unsafe cast, skip/exclude/bypass. | `05c/changes.md:18,25–28`; `05b` settings và `mobile/package.json` được đọc đối chiếu, không có thay đổi từ 05c. Các import mới phục vụ trực tiếp AC-02/AC-03, không phải code thừa. |
| AC-06 | **PASS** | Không thêm code ngoài host declaration; quan hệ blocker được ghi ở ticket/evidence, không sửa scope hoặc AC của 05a/05b. | `05c/changes.md:18,30–33`; `05b...md:48–50` xác định build pass là điều kiện tiếp tục của 05a, còn run44 PASS xác nhận blocker Kotlin đã được giải quyết mà không mở rộng boundary. |

## Bảng 2 — Spec-to-Code Traceability Matrix: Rubric

| Trục Rubric | Mức độ đáp ứng | Đối chiếu với | Bằng chứng |
|---|---|---|---|
| Host declaration tương thích đúng API RN `0.85.3`, không workaround | **PASS** | Ticket Rubric bắt buộc; `MainApplication.kt` | Explicit `List<ReactPackage>` và property override tại dòng 14, 16–17; `05c/changes.md:20–23`; build PASS tại `05a/tests.md:990–997`. |
| Native build vượt `:app:compileDebugKotlin` bằng thay đổi duy nhất trong file whitelist | **PASS** | AC-01, AC-04 và boundary 05b | `05a/logs/run44-mobile_build.log:87,152`; `05c/changes.md:10–18`; Tree `ee73e1f9` khớp sau checkpoint. |
| Repository/dependency provenance và boundary 05b không bị mở rộng | **PASS** | AC-05; `05b...md:36–41,56–58` | `settings.gradle:7` giữ `PREFER_SETTINGS` và chỉ `google()`/`mavenCentral()`; 05c không sửa settings, wrapper, dependency hay verifier. |
| Tối thiểu hóa thay đổi | **PASS — 2/2** | Ticket Rubric khuyến nghị | Chỉ sửa declaration/import cần thiết; `getUseDeveloperSupport`, `getJSMainModuleName`, `onCreate`/`load()` vẫn giữ nguyên tại `MainApplication.kt:13,15,20`. |
| Tính tương thích RN | **PASS — 2/2** | Ticket Rubric khuyến nghị | Signature/property bám API RN `0.85.3`, không suppression/unsafe cast/workaround; `mobile/package.json:13–22` xác nhận version RN và tooling. |
| Tính tái lập | **PASS — 2/2** | Ticket Rubric khuyến nghị | Exact verifier command của AC-04, run44 PASS trên `HEAD 8c454c2`/`Tree ee73e1f9`, compile Kotlin không lỗi; Reviewer fingerprint khớp cùng Tree. |

## Kết luận

- AC-01..AC-06: **PASS**.
- Rubric bắt buộc: **PASS** toàn bộ.
- Rubric khuyến nghị: **PASS** toàn bộ, 2/2 mỗi trục.
- Round-trip evidence cũ: **PASS**; không phát hiện lệch yêu cầu nghiệp vụ.
- Không phát hiện code thừa ngoài Spec: các import mới là dependency kỹ thuật trực tiếp của AC-02/AC-03.
- Chưa tự chuyển trạng thái ticket; commit được thực hiện theo lệnh của Planner.

## Trục trặc gặp phải

- Không phát sinh trục trặc công cụ/hạ tầng trong lần recheck này.
- Không có cập nhật mới cho `Lesson-learned.md`.

## Commit

- Commit ticket ban đầu: `4103c65` (`fix: align React Native host with Kotlin API`).
