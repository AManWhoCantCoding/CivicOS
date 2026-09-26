# Plan — `05a-mobile-build-boundary-fix`

PLAN_READY — ticket đã có whitelist, test skeleton và Acceptance Criteria đủ rõ để lập kế hoạch. Evidence `05a` chưa có thư mục hiện tại; blocker hạ tầng của ticket đã có trạng thái PASS trong `.brain/evidence/_infra-status.md`. Đây chỉ là plan, chưa sửa code và chưa chạy kiểm tra.

## 1. Phạm vi file

### File được phép sửa/tạo

- `tsconfig.json`
- `package.json`
- `scripts/verify.mjs`
- `mobile/package.json`
- `mobile/tsconfig.json`
- `mobile/android/gradle/wrapper/gradle-wrapper.properties` — chỉ đổi đúng hai dòng `distributionUrl` sang Gradle `8.13` và `distributionSha256Sum` thành `20f1b1176237254a6fc204d8434196fa11a4cfb387567519c61556e8710aed78`; giữ nguyên mọi dòng khác.
- `mobile/src/test-globals.d.ts` — chỉ để xoá workaround/augmentation global `FormData` nếu không còn cần sau khi tách compiler project.
- `mobile/jest.config.js` — chỉ để cấu hình ESM transform/loading cần cho test mobile/MapLibre; không exclude hoặc skip test.
- `mobile/src/features/__tests__/deepLinks.test.ts` — chỉ để cập nhật expected object contract hiện tại; không sửa production/mobile business source.
- `mobile/src/features/__tests__/navigation-readonly.test.tsx` — chỉ để xử lý ESM transform/loading của MapLibre; không exclude/skip test hoặc hạ assertion.
- `tests/tooling/mobile-build-boundary.test.ts` — regression test mới theo test skeleton.

Không tạo hoặc sửa lockfile, production/mobile business source khác, route Next, module nghiệp vụ hoặc file ngoài whitelist. Hai test file mobile chỉ nhận đúng các sửa đổi được nêu ở trên.

### File/phạm vi tuyệt đối không đụng tới

- `src/app/api/evidence/route.ts`
- `src/app/**`
- `src/modules/**`
- `.env`, `.env.*`, `**/secrets/**`
- `.brain/**` ngoài artifact plan này
- `node_modules/**`
- `.scratch/**`

File wrapper Android là ngoại lệ duy nhất trong `mobile/android/**`: chỉ được đổi đúng hai dòng `distributionUrl` và `distributionSha256Sum` theo giá trị Gradle `8.13`/checksum chính thức nêu trên; giữ nguyên mọi dòng khác. Không sửa Android source/config khác, không cập nhật lockfile hoặc dependency, không bỏ checksum và không tắt validate checksum.

## 2. Hàm, interface, config và schema dự kiến đổi

| Khu vực | Thay đổi dự kiến |
|---|---|
| Root `tsconfig.json` | Giữ compiler options và root include hiện hữu; bổ sung exclusion bao phủ `mobile/**` để effective root project không nạp mobile source/test. Không đổi route Evidence. |
| Mobile `mobile/tsconfig.json` | Khai báo project độc lập cho `mobile/src` và entrypoint mobile; giữ strict/noEmit phù hợp; giữ Jest types trong boundary mobile; không extends hoặc include root `tsconfig.json`, `src/app/**`, `src/modules/**` hay server-only code. |
| `mobile/android/gradle/wrapper/gradle-wrapper.properties` | Chỉ đổi `distributionUrl` từ Gradle `8.11.1` lên Gradle `8.13` và `distributionSha256Sum` thành `20f1b1176237254a6fc204d8434196fa11a4cfb387567519c61556e8710aed78`; giữ nguyên mọi dòng khác, không bỏ checksum hoặc tắt validate. |
| `mobile/src/test-globals.d.ts` | Loại bỏ file hoặc các khai báo/augmentation global `FormData` đang làm root typecheck pass giả. Nếu mobile test globals còn cần, chỉ giữ khai báo test runner thuần mobile, không mở rộng global `FormData`. |
| Root `package.json` scripts | Thêm đúng ba wrapper: `mobile:typecheck` delegate `npm --prefix mobile run typecheck`, `mobile:test` delegate `npm --prefix mobile run test`, `mobile:build` delegate `npm --prefix mobile run build`. Không đổi script root hiện hữu. |
| `mobile/package.json` scripts | Bảo đảm ba target độc lập `typecheck`, `test`, `build` tồn tại và không gọi root Next. Chỉ chỉnh command/config nếu cần để wrapper delegate đúng target mobile. |
| `mobile/jest.config.js` | Chỉ bổ sung/chỉnh ESM transform/loading tối thiểu để Jest nạp được MapLibre; không thêm exclude/skip. |
| `mobile/src/features/__tests__/deepLinks.test.ts` | Cập nhật expected object contract theo shape hiện tại; không đổi production/mobile business source. |
| `mobile/src/features/__tests__/navigation-readonly.test.tsx` | Chỉ sửa cấu hình/loading integration của test với MapLibre; giữ nguyên assertion và không bypass test. |
| `package.json.verify` | Giữ nguyên `verify.fast` và `verify.full`; thêm profile `verify.mobile` theo đúng thứ tự `mobile:typecheck`, `mobile:test`, `mobile:build`. Không đưa mobile build vào fast/full. |
| `scripts/verify.mjs` | Mở rộng scope hợp lệ thành `fast`, `full`, `mobile`; đọc `pkg.verify.mobile`; giữ semantics `--check`, `--only`, missing-step, `FAIL`, `PASS`, `INCOMPLETE`; usage/help phải phản ánh scope mobile. `--only` vẫn giới hạn danh sách bước được chọn, không chạy profile khác. |
| Regression test | Kiểm tra effective root config, profile/script mapping, thứ tự ba bước mobile, verifier `--check` không thiếu step, `--only` chọn đúng một bước, không có import server-only/cross-boundary và không còn global `FormData` shim. |

Không thêm thư viện, abstraction hoặc helper trùng lặp; dùng script/package/config sẵn có và Node API hiện tại của verifier.

Các ràng buộc bất biến phải giữ nguyên trong toàn bộ thực hiện: root/mobile compiler boundary vẫn độc lập; route Evidence không đổi và không có global `FormData` shim; Jest chỉ được xử lý ESM/MapLibre trong whitelist, không exclude/skip test hoặc hạ assertion; mobile vẫn read-only và chỉ gọi HTTP contract đã chốt; không mở rộng hoặc làm yếu security/authorization boundary. Không sửa Android source/config khác, lockfile/dependency, không bỏ checksum và không tắt checksum validation.

## 3. Luồng xử lý chi tiết

1. **Root boundary:** `tsconfig.json` loại `mobile/**` khỏi root project. Root `npm run typecheck` tiếp tục bao phủ `src/**`, nên `src/app/api/evidence/route.ts` được compile bằng boundary đúng mà không cần sửa route hoặc shim.
2. **Mobile boundary:** `npm --prefix mobile run typecheck` lấy `mobile/tsconfig.json` làm project độc lập. Mobile giữ typing riêng trong package; xoá/thay thế `mobile/src/test-globals.d.ts` nếu nó augment global `FormData`, tuyệt đối không dùng shim đó để che lỗi root.
3. **Command delegation:** root chỉ làm wrapper mỏng tới `mobile/`; `mobile:typecheck`, `mobile:test`, `mobile:build` lần lượt chạy target `typecheck`, `test`, `build` của `mobile/package.json`. Các script root hiện hữu (`typecheck`, `test`, `build`, v.v.) không đổi.
4. **Verifier profile:** `package.json.verify.mobile` cung cấp danh sách mobile. `scripts/verify.mjs` chọn danh sách theo `--scope=mobile`, hỗ trợ `--check` để chỉ kiểm tra mapping và `--only=mobile:typecheck` để chỉ chọn step đó. `fast/full` vẫn lấy profile root cũ và không tự chèn mobile native build.
5. **Import graph:** regression test đọc entrypoint/import của mobile và các khai báo global trong phạm vi root/mobile để bắt `next`, Prisma/server-only, `src/app/**`, route Evidence hoặc `FormData` augmentation lọt qua boundary. Mobile chỉ dùng HTTP client contract đã chốt ở ticket 06.
6. **Evidence runtime:** Developer chỉ viết thay đổi và test; Tester sẽ chạy root typecheck, regression test, ba wrapper command và verifier check/profile, rồi ghi exit code/log vào evidence của ticket. Developer không tự chạy bất kỳ test/lint/typecheck/format/build/verify nào.
7. **Gradle wrapper repair:** Chỉ cập nhật đúng hai dòng `distributionUrl` và `distributionSha256Sum` trong `mobile/android/gradle/wrapper/gradle-wrapper.properties` lên Gradle `8.13` và checksum chính thức `20f1b1176237254a6fc204d8434196fa11a4cfb387567519c61556e8710aed78`; giữ nguyên mọi dòng khác. Không sửa Android source/config khác, không cập nhật lockfile/dependency, không bỏ checksum hoặc tắt validate. Sau checksum repair, Tester kiểm tra diff wrapper chỉ có hai dòng này, rồi chạy lại theo thứ tự `npm run mobile:typecheck`, `npm run mobile:test -- --runInBand`, `npm run mobile:build` và verifier `--check`/`--scope=mobile` đầy đủ.
8. **Mobile test/config repair:** Chỉ cập nhật expected object contract trong `deepLinks.test.ts`; chỉ điều chỉnh ESM transform/loading của MapLibre trong `jest.config.js` và `navigation-readonly.test.tsx`. Không exclude/skip test, không hạ assertion, không sửa production/mobile business source. Tester chạy lại `mobile:test -- --runInBand` và đối chiếu đầy đủ test được thực thi.

## 4. Mapping Acceptance Criteria và Rubric

| AC | Thay đổi/file map | Bằng chứng Tester dự kiến |
|---|---|---|
| AC-01 | `tsconfig.json`; `mobile/tsconfig.json`; `tests/tooling/mobile-build-boundary.test.ts` | `tsc --showConfig -p tsconfig.json` không có effective `mobile/`; regression assert exclusion và include/files root không bắt đầu `mobile/`. |
| AC-02 | `tsconfig.json`; xoá/chỉnh `mobile/src/test-globals.d.ts` nếu cần | `npm run typecheck` exit 0, không có `TS2339 FormData.get`; hash/content route trước-sau không đổi. |
| AC-03 | `mobile/tsconfig.json`; `mobile/package.json`; `mobile/src/test-globals.d.ts` nếu cần | `npm --prefix mobile run typecheck` exit 0; config/import scan không nạp root tsconfig, Next, Prisma server-only hoặc `src/app/**`. |
| AC-04 | Root `package.json`; `mobile/package.json`; `mobile/android/gradle/wrapper/gradle-wrapper.properties`; `mobile/jest.config.js`; `mobile/src/features/__tests__/deepLinks.test.ts`; `mobile/src/features/__tests__/navigation-readonly.test.tsx` | Kiểm tra wrapper properties chỉ đổi đúng hai dòng `distributionUrl` sang Gradle `8.13` và `distributionSha256Sum` thành checksum chính thức `20f1b1176237254a6fc204d8434196fa11a4cfb387567519c61556e8710aed78`, giữ nguyên mọi dòng khác; không bỏ checksum hoặc tắt validate. Sau checksum repair, chạy theo đúng thứ tự `npm run mobile:typecheck`, `npm run mobile:test -- --runInBand`, `npm run mobile:build`, mỗi command exit 0 trong hạ tầng ticket 00; chạy verifier `node scripts/verify.mjs 05-mobile-readonly-client --check --scope=mobile` và full `scope=mobile` sau repair. Riêng `mobile:test` phải dùng đúng test/config repair tối thiểu của AC-10. Không sửa Android source/config khác hoặc lockfile/dependency. |
| AC-05 | `package.json.verify.mobile`; `scripts/verify.mjs`; regression test | `node scripts/verify.mjs 05-mobile-readonly-client --check --scope=mobile` liệt kê đúng ba step, không `MISSING`, `RESULT: đủ bước`, exit 0. |
| AC-06 | `scripts/verify.mjs`; `package.json`; regression test | `--scope=mobile --only=mobile:typecheck` chỉ chọn một step; `fast/full` giữ nguyên root list và không thêm mobile build. |
| AC-07 | `tests/tooling/mobile-build-boundary.test.ts` | `npm test -- tests/tooling/mobile-build-boundary.test.ts` assert exclusion, mapping/thứ tự profile và không thiếu script. |
| AC-08 | `tsconfig.json`; `mobile/src/test-globals.d.ts`; regression test; không sửa route | Changed paths không có route Evidence; không còn global `FormData` declaration/augmentation để che lỗi; root typecheck độc lập shim. |
| AC-09 | `mobile/tsconfig.json`; `mobile/package.json`; `mobile/jest.config.js`; `mobile/src/features/__tests__/navigation-readonly.test.tsx`; regression test | Scan compiler/import graph của mobile typecheck/test/build entrypoints không thấy `next`, Prisma server-only, `src/app/**` hoặc route Evidence; request seam chỉ là HTTP contract. Jest/test integration chỉ xử lý ESM transform/loading MapLibre, không mở boundary sang production/mobile business source. |
| AC-10 | `mobile/jest.config.js`; `mobile/src/features/__tests__/deepLinks.test.ts`; `mobile/src/features/__tests__/navigation-readonly.test.tsx` | `mobile:test -- --runInBand` nạp được MapLibre qua ESM transform/loading và expected `deepLinks` khớp object contract hiện tại; xác nhận không có exclude/skip, không hạ assertion, không sửa production/mobile business source. |

### Rubric bắt buộc

| Rubric | File/luồng map | Evidence dự kiến |
|---|---|---|
| Root/mobile là hai compiler boundary độc lập | `tsconfig.json`, `mobile/tsconfig.json`, root/mobile typecheck | ShowConfig root không nhận mobile; mobile typecheck dùng project mobile riêng; cả hai command được Tester chạy độc lập. |
| Route Next giữ nguyên, FormData giải quyết bằng boundary | `tsconfig.json`, `mobile/src/test-globals.d.ts` nếu xoá, route chỉ đọc để snapshot | Root typecheck pass; route không xuất hiện trong patch và không bị sửa; không có global shim làm điều kiện pass. |
| Verifier mobile độc lập, root profile không đổi | `package.json`, `scripts/verify.mjs`, regression test | `--check`, `--scope=mobile`, `--only` và fast/full được chạy/đối chiếu đúng profile. |

### Rubric khuyến nghị

| Trục | File/luồng map | Bằng chứng dự kiến |
|---|---|---|
| Tính tái lập | `scripts/verify.mjs`, `package.json.verify` | `--check` báo rõ từng script và trạng thái thiếu; mobile có thể chạy riêng không phụ thuộc root. |
| An toàn boundary | `tsconfig.json`, `mobile/tsconfig.json`, regression test | Test bắt root nạp lại `mobile/**`, mobile nạp server-only hoặc shim global quay lại. |
| Observability | `scripts/verify.mjs` | Profile mobile phân biệt `MISSING`, `FAIL`, `PASS`, `INCOMPLETE`; `--only` hiển thị đúng selection. |

Không có thay đổi nào ngoài whitelist mà không map AC/Rubric; các thay đổi verifier/help chỉ là phần kỹ thuật bắt buộc để AC-05/AC-06 và Rubric Observability hoạt động.

## 5. Mapping toàn bộ “Các bước thực hiện”

| Bước ticket | File/luồng bao phủ | Cách hoàn tất/đối chiếu |
|---|---|---|
| 1. Cô lập root `tsconfig.json` khỏi `mobile/**` và bảo đảm root typecheck compile route Evidence mà không sửa route | `tsconfig.json`; regression test; root typecheck của Tester | Exclude root bao phủ mobile; route giữ nguyên; root typecheck không còn lỗi `FormData.get`. |
| 2. Bảo đảm `mobile/tsconfig.json` và typing mobile hoạt động project riêng; loại bỏ/thay thế global `FormData` shim | `mobile/tsconfig.json`; `mobile/src/test-globals.d.ts`; mobile typecheck | Mobile project tự resolve typing; shim FormData bị xoá/thu hẹp khỏi global; không ảnh hưởng root. |
| 3. Thêm root wrapper scripts `mobile:typecheck`, `mobile:test`, `mobile:build`, giữ nguyên script root | `package.json`; `mobile/package.json` | Root wrappers delegate đúng package mobile; regression test kiểm tra mapping; diff xác nhận script root cũ không đổi. |
| 4. Mở rộng verifier và `package.json` với `verify.mobile`, hỗ trợ scope/check/only, không chèn mobile build vào fast/full | `scripts/verify.mjs`; `package.json`; regression test | Mobile profile đúng thứ tự; parser/selection hỗ trợ ba scope và `--only`; fast/full snapshot không đổi. |
| 5. Viết regression test exclusion, script mapping, verifier profile và chống cross-boundary import/shim | `tests/tooling/mobile-build-boundary.test.ts` | Test skeleton được hiện thực thành các assertion độc lập cho AC-01/03/05/06/08/09. |
| 6. Cập nhật wrapper Gradle và chạy lại build mobile; chạy root typecheck, regression test, ba command mobile và verifier check/profile; ghi kết quả, không sửa AC nghiệp vụ ticket 05 | `mobile/android/gradle/wrapper/gradle-wrapper.properties` chỉ với đúng hai dòng `distributionUrl` và `distributionSha256Sum`; checksum phải còn được validate, mọi dòng khác giữ nguyên; không thêm file Android source/config, lockfile hoặc dependency; evidence runtime do Tester ghi | Developer không chạy kiểm tra; Planner/Tester nhận kết quả từ Tester. Tester phải đối chiếu diff wrapper chỉ có hai dòng được phép, sau checksum repair chạy theo thứ tự `npm run mobile:typecheck`, `npm run mobile:test -- --runInBand`, `npm run mobile:build`, rồi full verifier `node scripts/verify.mjs 05-mobile-readonly-client --scope=mobile`, đồng thời đối chiếu `--check`/`--only`. Không sửa `05-mobile-readonly-client` hoặc code nghiệp vụ. |
| 7. Sửa tối thiểu test/config mobile trong whitelist để `mobile:test -- --runInBand` chạy được | `mobile/jest.config.js`; `mobile/src/features/__tests__/deepLinks.test.ts`; `mobile/src/features/__tests__/navigation-readonly.test.tsx` | Cập nhật expected object contract hiện tại trong `deepLinks.test.ts`; cấu hình ESM transform/loading MapLibre trong Jest/test integration; không exclude/skip test, không hạ assertion, không sửa production/mobile business source. |

## 6. Chiến lược TDD Red → Green → Refactor

### Red

- Viết `tests/tooling/mobile-build-boundary.test.ts` trước implementation.
- Assert root effective config loại mobile, route không đổi/không nằm trong changed paths, mobile config độc lập, không có shim global `FormData`, profile/script mapping đúng thứ tự, `--only`/scope semantics và không có import server-only. Regression test cũng phải giữ các file mobile test/config trong đúng whitelist, không biến AC-10 thành exclude/skip.
- Không chạy test đỏ; Tester là bên xác nhận trạng thái Red.

### Green

- Sửa tối thiểu `tsconfig.json` và mobile tsconfig/global typing để hai project tách nhau.
- Thêm đúng ba root wrapper và profile `verify.mobile`.
- Mở rộng parser/list selection của `scripts/verify.mjs` tối thiểu để test verifier/config pass; giữ nguyên hành vi fast/full.
- Cập nhật duy nhất hai dòng `distributionUrl` và `distributionSha256Sum` trong `mobile/android/gradle/wrapper/gradle-wrapper.properties` lên Gradle `8.13` và checksum chính thức `20f1b1176237254a6fc204d8434196fa11a4cfb387567519c61556e8710aed78`; giữ nguyên mọi dòng khác, không sửa Android source/config khác, không cập nhật lockfile/dependency, không bỏ checksum hoặc tắt validate; sau đó Tester chạy lại `mobile:build` và full `scope=mobile`.
- Cập nhật `deepLinks.test.ts` chỉ ở expected object contract hiện tại; chỉnh `jest.config.js`/`navigation-readonly.test.tsx` chỉ cho ESM transform/loading của MapLibre, giữ nguyên assertion và không exclude/skip test.

### Refactor

- Chỉ sau khi Tester xác nhận Green: gom logic profile verifier dùng chung nếu cần, giữ output/help và trạng thái `MISSING`/`INCOMPLETE` rõ ràng.
- Loại bỏ duplication hoặc workaround thừa mà không mở rộng file scope; không refactor route/mobile business code.
- Tester chạy lại toàn bộ evidence commands sau refactor.

### Bằng chứng Tester sẽ thu

1. `tsc --showConfig -p tsconfig.json` và `npm run typecheck`, gồm kiểm tra route Evidence không đổi và không có `TS2339 FormData.get`.
2. `npm test -- tests/tooling/mobile-build-boundary.test.ts`.
3. `npm --prefix mobile run typecheck` và ba wrapper: `npm run mobile:typecheck`, `npm run mobile:test -- --runInBand`, `npm run mobile:build`.
4. `node scripts/verify.mjs 05-mobile-readonly-client --check --scope=mobile`.
5. `node scripts/verify.mjs 05-mobile-readonly-client --scope=mobile --only=mobile:typecheck`.
6. Sau khi sửa wrapper, chạy `node scripts/verify.mjs 05-mobile-readonly-client --scope=mobile` đầy đủ và xác nhận thứ tự `mobile:typecheck`, `mobile:test`, `mobile:build`; ghi log/exit code vào evidence.
7. Đối chiếu `--scope=fast` và `--scope=full` để chứng minh root profiles không bị chèn mobile native build; ghi log/exit code vào evidence.
8. Chạy `npm run mobile:test -- --runInBand`; xác nhận MapLibre được load qua ESM transform/config, expected `deepLinks` đúng object contract hiện tại, toàn bộ test liên quan vẫn được thực thi, không có exclude/skip và không có assertion bị hạ.

Developer không chạy các lệnh trên và plan này không chứa kết quả PASS/FAIL runtime.
