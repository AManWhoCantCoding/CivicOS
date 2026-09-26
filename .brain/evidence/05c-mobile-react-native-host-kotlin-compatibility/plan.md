# Plan — 05c-mobile-react-native-host-kotlin-compatibility

## 0. Diễn đạt lại ticket (tối đa 5 dòng)
- Mục tiêu: sửa tương thích Kotlin của `MainApplication.kt` với RN `0.85.3` để vượt `:app:compileDebugKotlin` (4 lỗi log run31 dòng 201–204).
- File implementation duy nhất được phép: `mobile/android/app/src/main/java/com/civicosmobile/MainApplication.kt`.
- AC chính: explicit `List<ReactPackage>` cho `getPackages()` + giữ autolinking/`ApiConfigPackage()` đúng một lần; hai member architecture/Hermes override đúng API, giữ nguyên BuildConfig flags.
- Cấm: mọi file ngoài whitelist, settings/Gradle/wrapper, dependency/lockfile, verifier, business source, ticket/`.scratch`.
- Vòng này chỉ phân tích + ghi plan, không sửa code, không chạy verifier/build/test/lint/typecheck/format.

## 1. File dự định sửa / tạo
- Implementation patch (vòng implement sau, chưa làm vòng này): CHỈ `mobile/android/app/src/main/java/com/civicosmobile/MainApplication.kt`. Không tạo file mới, không thêm file test riêng cho ticket này.
- Artifact phân tích vòng này (đã tạo): `.brain/evidence/05c-mobile-react-native-host-kotlin-compatibility/plan.md` (file hiện tại). Artifact này không tính vào changed paths của AC-01 khi chấm implementation patch.
- Đọc tham chiếu (read-only, không sửa): log `.brain/evidence/05a-mobile-build-boundary-fix/logs/run31-mobile_build.log` (dòng 187, 201–204), `mobile/android/app/src/main/java/com/civicosmobile/ApiConfigPackage.kt` (xác nhận `ApiConfigPackage : ReactPackage`), `mobile/package.json` (khóa RN `0.85.3`).

## 2. Hàm / interface declaration sẽ đổi (tất cả trong cùng `MainApplication.kt`)
- C1 — `getPackages()`: từ `override fun getPackages() = packages + ApiConfigPackage()` sang `override fun getPackages(): List<ReactPackage>` với body dùng autolinking `PackageList(this).packages + ApiConfigPackage()`. Import bổ sung trong cùng file: `com.facebook.react.ReactPackage`, `com.facebook.react.PackageList`. Giữ đúng một `ApiConfigPackage()`.
- C2 — `isNewArchEnabled`: từ `override fun isNewArchEnabled(): Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED` sang `override val isNewArchEnabled: Boolean get() = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED` (property override, giữ nguyên cờ BuildConfig).
- C3 — `isHermesEnabled`: từ `override fun isHermesEnabled(): Boolean = BuildConfig.IS_HERMES_ENABLED` sang `override val isHermesEnabled: Boolean get() = BuildConfig.IS_HERMES_ENABLED` (property override, giữ nguyên cờ BuildConfig).
- Giữ nguyên tuyệt đối: `getUseDeveloperSupport`, `getJSMainModuleName`, `onCreate` (+ `load()`), package/class/interface, không thêm dependency/plugin/repository, không suppression/unsafe cast.

## 3. Luồng xử lý chi tiết (bao phủ 5 bước của ticket)
- B1 — Đối chiếu: đọc log run31 (4 lỗi Kotlin) và API đã resolve của RN `0.85.3` (`ReactNativeHost`/`DefaultReactNativeHost`); xác nhận warning `MavenRepo`/`MavenRepo2` chỉ non-fatal, không thuộc scope; nếu API resolved đòi sửa ngoài whitelist thì DỪNG, ghi blocker mới, không mở rộng scope.
- B2 — Sửa tối thiểu `MainApplication.kt` đúng C1–C3 mục 2: tường minh kiểu `getPackages()`/package list, chuyển hai member sang property override, giữ `ApiConfigPackage()` đúng một lần và hai cờ BuildConfig; chỉ chạm declaration cần thiết, không format unrelated code.
- B3 — Tự kiểm tra tĩnh trên diff (không chạy tool): changed paths chỉ một file whitelist; quét không có repository/URL/dependency/plugin mới, không sửa settings/wrapper, không skip/exclude/bypass, không suppression/unsafe cast.
- B4 — Verifier (do Tester thực hiện, Developer không chạy): `node scripts/verify.mjs 05a-mobile-build-boundary-fix --only=mobile:build --timeout=1200000`; kỳ vọng exit `0`, `mobile:build` PASS, `:app:compileDebugKotlin` không FAIL, không còn 4 lỗi Kotlin, warning repository non-fatal không tính lỗi.
- B5 — Evidence + liên kết: ghi exit code/`mobile:build` PASS/compileDebugKotlin/diff một file/snapshot autolinking + `ApiConfigPackage()`/BuildConfig flags/quét provenance; liên kết 05c là technical blocker đã giải quyết cho AC-04 của 05b; không sửa AC/scope/trạng thái 05a/05b.

## 4. Bảng map thay đổi ↔ AC-01..AC-06 và Rubric
| Thay đổi | AC map | Rubric map | Ghi chú |
|---|---|---|---|
| C1: explicit `List<ReactPackage>` + autolinking + đúng một `ApiConfigPackage()` | AC-02 (trực tiếp), AC-04 (compileDebugKotlin hết 2 lỗi getPackages) | Bắt buộc 1 (đúng API, không workaround), Bắt buộc 2 (vượt compile bằng một file); Khuyến nghị Tương thích RN + Tái lập | Trọng tâm sửa lỗi dòng 201–202 log run31 |
| C2: `isNewArchEnabled` → property override, giữ `BuildConfig.IS_NEW_ARCHITECTURE_ENABLED` | AC-03 (trực tiếp), AC-04 (hết lỗi `overrides nothing`) | Bắt buộc 1, Bắt buộc 2; Khuyến nghị Tương thích RN + Tái lập | Sửa lỗi dòng 203 log run31 |
| C3: `isHermesEnabled` → property override, giữ `BuildConfig.IS_HERMES_ENABLED` | AC-03 (trực tiếp), AC-04 (hết lỗi `overrides nothing`) | Bắt buộc 1, Bắt buộc 2; Khuyến nghị Tương thích RN + Tái lập | Sửa lỗi dòng 204 log run31 |
| C4: import `ReactPackage` + `PackageList` trong cùng file | Không map trực tiếp AC nào | Không map trực tiếp Rubric nào | Dependency kỹ thuật bắt buộc của C1 (Kotlin cần type/import tường minh); nằm trong cùng file whitelist nên không vi phạm AC-01/AC-05 |
| C5: giữ nguyên `getUseDeveloperSupport`/`getJSMainModuleName`/`onCreate`, không thêm repo/dep/plugin, không suppression/skip/bypass | AC-01 (một file), AC-05 (provenance sạch), AC-06 (không sửa 05a/05b) | Bắt buộc 2 (một file), Bắt buộc 3 (không mở rộng boundary 05b); Khuyến nghị Tối thiểu hóa thay đổi | Ràng buộc âm — chứng minh bằng diff/quét |
| Artifact plan này | Không tính vào AC-01..AC-06 của implementation patch | Không tính | Evidence phân tích theo lệnh Planner, do Research tạo |

## 5. Kết luận kỹ thuật cần kiểm chứng theo API RN `0.85.3` (vòng implement/Tester đối chiếu, vòng này chưa chạy gì)
- `getPackages()` phải có kiểu tường minh tương thích `List<ReactPackage>` của `ReactNativeHost` (log yêu cầu `(Mutable)List<ReactPackage!>`), khử suy luận đệ quy (`packages` trần tự trỏ lại `getPackages()` gây recursive type checking); body giữ autolinking packages + đúng một `ApiConfigPackage()`; không suppression/unsafe cast.
- `isNewArchEnabled`/`isHermesEnabled` phải là property override (`override val ... get() = ...`) đúng API RN `0.85.3`, không còn `overrides nothing`; giá trị giữ nguyên hai cờ `BuildConfig.IS_NEW_ARCHITECTURE_ENABLED` / `BuildConfig.IS_HERMES_ENABLED`.
- Điểm đối chiếu cuối trước khi đóng: diff một file, `:app:compileDebugKotlin` PASS qua exact command AC-04, 4 lỗi Kotlin biến mất.

## 6. Ranh giới không chạm (nhắc lại để Reviewer đối chiếu AC-01/AC-05/AC-06)
- Không sửa: `settings.gradle`, mọi Gradle/wrapper/build config, `mobile/android/**` ngoài whitelist, `mobile/src/**`/business source, `package.json`/lockfile/dependency/`node_modules`, `.env`/secrets, `.brain/**` (ngoài plan này), `scripts/verify.mjs`/test config, `.scratch/**`, ticket 05a/05b.
