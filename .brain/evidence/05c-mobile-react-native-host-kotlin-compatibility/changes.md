# Changes — 05c-mobile-react-native-host-kotlin-compatibility

## Diễn đạt lại ticket (5 dòng)
- Mục tiêu: sửa tương thích Kotlin của host RN trong `MainApplication.kt` với RN `0.85.3` để vượt `:app:compileDebugKotlin` (4 lỗi log run31 dòng 829–832).
- File implementation duy nhất được phép: `mobile/android/app/src/main/java/com/civicosmobile/MainApplication.kt`.
- AC chính: `getPackages()` kiểu tường minh `List<ReactPackage>` + giữ autolinking/`ApiConfigPackage()` đúng một lần; `isNewArchEnabled`/`isHermesEnabled` property override đúng API, giữ nguyên hai cờ BuildConfig.
- Cấm: mọi file ngoài whitelist, settings/Gradle/wrapper, dependency/lockfile, verifier, business source, suppression/unsafe cast/skip/bypass.
- Vòng này chỉ sửa code + ghi evidence, không chạy bất kỳ kiểm tra nào; Tester chạy exact verifier command AC-04.

## File đã sửa
- `mobile/android/app/src/main/java/com/civicosmobile/MainApplication.kt` (duy nhất; không tạo file mới, không file test).

## Tóm tắt thay đổi
- Thêm import `com.facebook.react.PackageList` và `com.facebook.react.ReactPackage` trong cùng file whitelist.
- `getPackages()`: từ `= packages + ApiConfigPackage()` (đệ quy, suy luận kiểu lỗi) sang `override fun getPackages(): List<ReactPackage> = PackageList(this).packages + ApiConfigPackage()` — kiểu tường minh tương thích `ReactNativeHost.getPackages(): List<ReactPackage>`, giữ autolinking packages + đúng một `ApiConfigPackage()`.
- `isNewArchEnabled`: từ `override fun ...(): Boolean` sang `override val isNewArchEnabled: Boolean get() = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED` (property override đúng `DefaultReactNativeHost.kt:94–95`).
- `isHermesEnabled`: từ `override fun ...(): Boolean` sang `override val isHermesEnabled: Boolean get() = BuildConfig.IS_HERMES_ENABLED` (property override đúng `DefaultReactNativeHost.kt:107–108`).
- Giữ nguyên: `getUseDeveloperSupport`, `getJSMainModuleName`, `onCreate` (+ `load()`), package/class/interface; không suppression/unsafe cast/skip/exclude/bypass, không repository/dependency/plugin mới.

## Đối chiếu nguồn
- Log: `.brain/evidence/05a-mobile-build-boundary-fix/logs/run31-mobile_build.log` dòng 829–832 (2 lỗi `getPackages` return-type/recursive + 2 lỗi `overrides nothing`); warning repository là non-fatal, không sửa trong ticket này.
- API RN `0.85.3` (`mobile/package.json:15`): `ReactNativeHost.java:242` (`protected abstract List<ReactPackage> getPackages()`), `DefaultReactNativeHost.kt:94–95`/`107–108` (hai `protected open val`).
- `ApiConfigPackage : ReactPackage` xác nhận tại `ApiConfigPackage.kt:8`; `PackageList` autolinking tại `com.facebook.react` (`mobile/android/app/build/generated/autolinking/.../PackageList.java:55`).

## Kiểm tra tĩnh (không chạy tool kiểm tra)
- Changed paths vòng này: chỉ file whitelist trên. `git status --porcelain` scoped: `?? mobile/android/app/src/main/java/com/civicosmobile/MainApplication.kt` (cả thư mục `mobile/` đang untracked nên `git diff --stat/--check` scoped trả rỗng/sạch, không hiện patch text).
- `git diff --name-only` (tracked): chỉ các file có sẵn từ trước vòng này (`05-mobile` plan/review, ticket `05-mobile-readonly-client.md`, `Lesson-learned.md`, `package.json`, `scripts/verify.mjs`, `tsconfig.json`) — vòng này không chạm bất kỳ file nào trong số đó.
- Quét nội dung file sau sửa: không có `Suppress`, `as ` cast, `skip`, `exclude`, `bypass`, repository URL, dependency/plugin mới, không sửa settings/Gradle/wrapper/verifier/05a/05b/business source.

## Bàn giao Tester
- Chạy exact command AC-04: `node scripts/verify.mjs 05a-mobile-build-boundary-fix --only=mobile:build --timeout=1200000`.
- Kỳ vọng: exit `0`, step `mobile:build` PASS, `:app:compileDebugKotlin` không FAIL, không còn bốn lỗi Kotlin tại `MainApplication.kt`; warning repository non-fatal không tính lỗi.
- Developer chưa chạy bất kỳ test/lint/typecheck/format/build/verify nào trong vòng này.
