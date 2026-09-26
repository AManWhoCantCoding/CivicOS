# Checkpoint cuối lần 2 — `05-mobile-readonly-client`

## Phạm vi và evidence được chọn

- Đã đọc lại toàn bộ ticket và Rubric hiện tại tại `.scratch/civicos-e1-clone-mvp/issues/05-mobile-readonly-client.md`, cùng `CONTEXT.md`, `spec.md`, screen-11/12/13, diff và evidence ticket.
- Không chạy test, lint, typecheck, format-check, build, emulator hoặc `verify`; Reviewer chỉ đánh giá code/diff và evidence đã có.
- Evidence full duy nhất dùng cho điều kiện full PASS/Tree là run 46: `scope=full`, 7/7 PASS, `Tree: fe5c1195` trong `tests.md:2115-2128`. Standalone `verify --tree` ngay sau đó được Planner cung cấp cùng mã `fe5c1195`; Reviewer không tự chạy lại.
- Mobile-specific dùng run 43, cùng cây `Tree: fe5c1195`, `scope=mobile`, cả `mobile:typecheck`, `mobile:test`, `mobile:build` PASS tại `tests.md:1940-1949`. `run43-mobile_test.log:11-25` ghi 10 suites/21 tests PASS; không có `filter=`.
- Các run cũ FAIL/fast/filter không được dùng thay cho run 46 hoặc run 43.

## Bảng 1 — Spec-to-Code Traceability Matrix: Acceptance Criteria

| ID yêu cầu (AC) | Mức độ đáp ứng | File & dòng Code xử lý | Test Case chứng minh |
|---|---|---|---|
| AC-01 | **PASS** | `mobile/package.json:1-26`; `mobile/src/App.tsx:1-9`; các client mobile đi qua `mobile/src/api/client.ts:1-68`, không import Next.js/Prisma/server-only. Android boundary nằm trong `mobile/android/**`. | Run 43 `mobile:build` PASS (`tests.md:1945-1949`); log `run43-mobile_build.log:6-7,152-153` ghi `assembleDebug` và `BUILD SUCCESSFUL`. Run 46 root build cũng PASS (`tests.md:2120-2128`). |
| AC-02 | **PASS** | `mobile/src/api/session.ts:3-50` phân biệt authenticated/unauthenticated/expired và POST/DELETE session; `mobile/src/auth/SessionContext.tsx:18-43` refresh, expiry và sign-out; `mobile/src/navigation/AppNavigator.tsx:32-43,105-110` đưa user về auth hoặc main. | Run 43 mobile Jest PASS (`run43-mobile_test.log:13,22-25`); `session.test.ts:3-10` chứng minh authenticated, `401 → expired`, guest; `client.test.ts:22-45` chứng minh request `401` phát tín hiệu expiry. |
| AC-03 | **PASS** | `mobile/src/features/map/MapScreen.tsx:116-170,197-255,300-312` lấy layer/item/provider từ HTTP, render Point/Polygon, toggle visibility và permission state; `ProviderAdapter.ts:2-9` luôn giữ OSM attribution. | Run 43 `map.test.ts` PASS trong `run43-mobile_test.log:19,22-25`; test kiểm tra provider/OSM/offline (`mobile/src/api/__tests__/map.test.ts:3-14`). `mobile:build` PASS chứng minh native MapLibre boundary (`run43-mobile_build.log:41-43,152-153`). |
| AC-04 | **PASS** | `MapScreen.tsx:89-113,144-155,269-298` đọc OfflineManager pack/cache, dùng cached style, hiển thị offline và tạo basemap pack; `client.ts:50-68` gọi `assertReadOnly` trước `fetch`; `WriteGuard.ts:5-20` chặn write và trả lý do. | Run 43 mobile Jest PASS; `writeGuard.test.ts:3-21` chứng minh POST/PATCH bị chặn và không tạo request, `map.test.ts:3-14` chứng minh offline provider. Root full run 46 test PASS (`tests.md:2122-2127`) và map/offline/read-only contract nằm trong root suite (`run46-test.log:32-42,61,74-75`). |
| AC-05 | **PASS** | `mobile/src/features/related-info/types.ts:1-52`; `api/relatedInfo.ts:11-39`; `RelatedInfoScreen.tsx:50-95,108-223` dùng HTTP search/count, flat filter, debounce 300ms, list/detail/map sheet; `RelatedInfoDetail.tsx:22-87` fetch detail thật. | Run 43 `relatedInfo.test.ts` PASS (`run43-mobile_test.log:14,22-25`), kiểm tra query/entity/filter (`relatedInfo.test.ts:3-16`). Run 46 root HTTP contract PASS: `run46-test.log:8-10,32-42`; source contract test `tests/mobile/readonly-http.contract.test.ts:23-67` phủ đủ Resident/Business/Hotspot/Violation và detail. |
| AC-06 | **PASS** | Client giữ `403`/`401` trong `client.ts:31-68`; `States.tsx:4-14,45-52` chỉ render masked value; RelatedInfo/forces screens không unmask. Server OU/Assignment/masking được đối chiếu qua contract matrix. | Run 43 `client.test.ts:8-20,22-45` PASS cho 401/403; run 46 root contract matrix/detail/boundary PASS (`run46-test.log:32-42,61,78-82`), gồm no-raw-PII và active Assignment boundary. |
| AC-07 | **PASS** | `mobile/src/api/forces.ts:4-51` giữ `incidentId`, `resourceId`, coordinates, RelatedInfo reference, assignment summary và GET-only; `deepLinks.ts:5-18` ưu tiên `incidentId`; `AppNavigator.tsx:34-44,78-88` route Incident; `IncidentScreen.tsx:18-43` gọi `/api/incidents/:incidentId` hiện có. | Run 43 `forces.test.ts` và `deepLinks.test.ts` PASS (`run43-mobile_test.log:15,20,22-25`; `deepLinks.test.ts:31-63` kiểm tra đồng thời `incidentId` + `relatedInfo` và fallback). Direction Gate sau REDO đã PASS theo evidence Planner cung cấp; `changes.md:6-20` ghi rõ precedence và không tạo Incident contract/type/test riêng. |
| AC-08 | **PASS** | `States.tsx:4-35,38-52` có loading/empty/error/forbidden/masked/offline và retry; `MapScreen.tsx:172-179,269-298`, RelatedInfo/forces/Incident screens có các nhánh tương ứng. | Run 43 `states.test.tsx` PASS (`run43-mobile_test.log:17,22-25`; `states.test.tsx:3-12` kiểm tra loading/empty/error/forbidden/offline); cùng mobile Jest run PASS gồm các screen/state seams. Root run 46 test/e2e PASS (`tests.md:2126-2127`). |
| AC-09 | **PASS** | `AppNavigator.tsx:15-23` chỉ có Map/RelatedInfo/Alarms/Dispatches/Tasks/Incident/Settings; `WriteGuard.ts:10-20` chỉ mở auth POST/DELETE, chặn write nghiệp vụ; không có public intake route. | Run 43 `navigation-readonly.test.tsx:7-12` và `writeGuard.test.ts:3-21` PASS (`run43-mobile_test.log:17,11,22-25`). Root `read-only-guard`/route contract PASS trong run 46 (`run46-test.log:32-42,61`). |
| AC-10 | **PASS** | `mobile/package.json:5-10` có typecheck/test/build; root `tests/mobile/readonly-http.contract.test.ts:13-117` và `tests/mobile-readonly/contract-matrix.contract.test.ts:41-265` có assertion HTTP, masking, boundary, GET-only/read-only. | Run 46 full 7/7 PASS (`tests.md:2115-2128`); run 43 mobile typecheck/test/build đều PASS (`tests.md:1940-1949`). |
| AC-11 | **PASS** | `mobile/src/config.ts:8-38` chỉ nhận runtime/build-time `http/https`, ưu tiên runtime, không hard-code production; native injection ở `ApiConfigModule.kt:8-14` và `app/build.gradle:5-8`. Không có mobile secret file trong changed-path/evidence map. | Run 43 `config.test.ts:3-24` PASS (`run43-mobile_test.log:16,22-25`), gồm hai injected URL và runtime-over-build-time precedence. |
| AC-12 | **PASS** | `mobile/package.json:12-26` dùng đúng batch approved; Android wrapper/native project nằm trong `mobile/android/**`, không dùng mock thay native build. Approval được ghi trong ticket `:94-113`. | Run 43 Android build PASS (`run43-mobile_build.log:6-7,152-153`); run 46 full PASS (`tests.md:2122-2128`). |

**Kết luận Bảng AC:** 12/12 PASS; không có AC nào THIẾU EVIDENCE.

## Bảng 2 — Rubric bắt buộc, độc lập với AC

| Trục Rubric | Mức độ đáp ứng | Đối chiếu với | Bằng chứng |
|---|---|---|---|
| Mobile dùng backend/API chung, không tạo business store riêng | **PASS** | Ticket `:40`; `spec.md` mục 2.2 và 2.7 | API mobile chỉ gọi `requestJson`/HTTP (`client.ts:46-68`, `map.ts:19-31`, `relatedInfo.ts:22-36`, `forces.ts:32-50`); không có business store/client fixture. Root HTTP contract thật PASS trong `run46-test.log:8-10,32-42`. |
| Read-only tôn trọng OrganizationUnit, Assignment và masking | **PASS** | Ticket `:41`; `spec.md` mục 2.2; `CONTEXT.md:43-45` | Backend contract matrix kiểm tra OU, cross-scope, active Assignment và no raw PII (`contract-matrix.contract.test.ts:44-145,147-245`); boundary regression kiểm tra assignment-free/active/revoked (`boundary.regression.test.ts:7-28`); client giữ masked/403 (`States.tsx:45-52`). |
| Không mở rộng PS-E3 thành phạm vi E1 | **PASS** | Ticket `:42`; `spec.md` mục 6 | Routes không có create/update/citizen intake (`AppNavigator.tsx:15-23`); `WriteGuard.ts:10-20`; `navigation-readonly.test.tsx:7-12`; mobile surfaces chỉ là auth/map/RelatedInfo/forces/Incident context. |

## Bảng 3 — Rubric khuyến nghị và ngưỡng tối thiểu

| Trục Rubric | Điểm | Ngưỡng | Mức độ đáp ứng | Đối chiếu với | Bằng chứng |
|---|---:|---:|---|---|---|
| Thiết kế/UI | 1/2 | 1 | **PASS — đạt ngưỡng** | `screen-11`, `screen-12`, `screen-13` | Auth/main/map, layer toggle, Point/Polygon/OSM/offline (`MapScreen.tsx:197-317`); search/filter/list/detail/bottom sheet (`RelatedInfoScreen.tsx:108-223`); alarm/dispatch/task list/detail (`AlarmScreen.tsx:55-102`, `DispatchScreen.tsx:69-135`, `TaskScreen.tsx:69-134`). Stitch không khả dụng nên textual spec là baseline. |
| Thao tác/UX | 1/2 | 1 | **PASS — đạt ngưỡng** | Ticket Rubric `:49`, screen-11/12/13 | Các Pressable chính có `minHeight: 44`; StateMessage có retry (`States.tsx:16-35`); RelatedInfo có modal map sheet (`RelatedInfoScreen.tsx:184-223`). |
| Quy trình | 1/2 | 1 | **PASS — đạt ngưỡng** | Ticket Rubric `:50`, spec mục 5/6 | Navigation source-compatible, deep-link `incidentId` ưu tiên (`deepLinks.ts:5-18`), RelatedInfo chỉ fallback khi thiếu Incident reference; không có write/public route. Direction Gate sau REDO PASS. |

**Kết luận Rubric:** 3/3 trục khuyến nghị đạt tối thiểu 1/2; 3/3 trục bắt buộc PASS.

## Đối chiếu “Các bước thực hiện”

| Bước | Kết quả | Evidence đối chiếu |
|---|---|---|
| Scaffold React Native, environment/API URL không secret | **PASS** | `mobile/package.json`, `mobile/config.ts`, native `ApiConfigModule.kt`; run 43 build PASS; không thấy `.env`/secret file trong changed-path map. |
| Auth/main/map theo screen-11 và MapLibre adapter | **PASS** | `SessionContext.tsx`, `LoginScreen.tsx`, `MapScreen.tsx`, `ProviderAdapter.ts`; run 43 mobile Jest/build PASS. |
| RelatedInfo search/filter/map/list/detail read-only theo screen-12 | **PASS** | `RelatedInfoScreen.tsx`, `RelatedInfoDetail.tsx`, `api/relatedInfo.ts`; run 43 relatedInfo suite PASS và run 46 HTTP contract PASS. |
| Alarm/dispatch/task tối thiểu theo screen-13 | **PASS** | `AlarmScreen.tsx`, `DispatchScreen.tsx`, `TaskScreen.tsx`, `api/forces.ts`; run 43 forces/deep-link suites PASS, run 46 forces contract PASS. |
| Synthetic data do backend/test sở hữu, HTTP contract thật; không client-derived fixture | **PASS** | Root contract test gọi `fetch(new URL(path, baseUrl))` (`tests/mobile/readonly-http.contract.test.ts:5-10`) và kiểm tra 4 entity types/detail (`:23-67`); Incident exception được giữ đúng direction gate: consume seam 03/06, không tạo Incident contract/type/test riêng (`changes.md:12-20`). |
| Masking, offline basemap, permission-denied, session expiry | **PASS** | `MapScreen.tsx:89-170,269-298`, `States.tsx:4-14,45-52`, `SessionContext.tsx:27-38`; run 43 session/map/states/client suites PASS. |
| Các command được duyệt: typecheck/test/build mobile và API contract từ root | **PASS** | Run 43 `scope=mobile` 3/3 PASS (`tests.md:1940-1949`); run 46 `scope=full` 7/7 PASS và Tree khớp (`tests.md:2115-2128`). Windows limitation: evidence là Android/JS, không tuyên bố iOS. |

## Đối chiếu changed paths, dependency, security và read-only boundary

- **Implementation scope:** các file implementation/test mới thuộc `mobile/**` và `tests/**`, đúng whitelist ticket `:7-10`; không thấy thay đổi `src/modules/**/contracts.ts`, backend contract, `.env*` hoặc `**/secrets/**` trong `changes.md:22-34` và `files-changed.md:5-18`.
- **Planner workflow artifact:** `.scratch/civicos-e1-clone-mvp/issues/05-mobile-readonly-client.md` có diff ở Status/Blocked by/checklist/comments/Research history. Đây là artifact workflow được Planner cho phép; không coi là Developer implementation scope violation. Đối chiếu diff cho thấy 12 dòng AC và nội dung Rubric không bị sửa để né yêu cầu.
- **Evidence/workflow artifacts:** `.brain/evidence/05-mobile-readonly-client/**` được ticket cho phép theo role. `Lesson-learned.md` là artifact bài học workflow, không phải code implementation.
- **Generated workspace artifacts:** `mobile/android/.gradle/**`, `app/build/**`, `app/.cxx/**` và các artifact verifier hiện diện do build/evidence; chúng không phải business source và không được coi là code thừa để map AC. Khi commit, Planner cần chỉ stage source/lockfile/evidence được chọn, không stage generated outputs hoặc `NUL`.
- **Dependency:** `mobile/package.json:12-26` khớp batch approved; `run43-mobile_build.log:152-153` chứng minh Android build thật thành công.
- **Security:** OU + Assignment + masking vẫn nằm ở server; client giữ `masked`, 403 và không tự chọn OU/không unmask. Contract matrix và boundary regression PASS.
- **Read-only:** mobile API chỉ GET ngoài auth session; route contract và `WriteGuard` đều cấm POST/PUT/PATCH/DELETE nghiệp vụ; không có public citizen route.

## Kết luận checkpoint

**PASS — đủ điều kiện để Planner tick 12 AC, 3 Rubric bắt buộc và 3 Rubric khuyến nghị, sau đó commit.**

- Reviewer không tự tick ticket, không tự đổi Status và không commit.
- Direction Gate sau REDO đã PASS: `incidentId` ưu tiên; Incident dùng endpoint/envelope ticket 03/06 hiện có; RelatedInfo chỉ fallback khi thiếu Incident reference; không có Incident contract/type/test riêng.
- Full evidence hiện tại là run 46, `Tree: fe5c1195`; mobile-specific evidence là run 43 trên cùng Tree.

## Trục trặc gặp phải

- Candidate ticket path đầu tiên bị thiếu thư mục `issues/`; sau đó đã enumerate `.scratch`, feature parent và `issues/`, rồi đọc exact path thành công. Đây là sự cố path/tooling, không phải lỗi repository.
- Lệnh đọc diff bị giới hạn hiển thị và tool lưu phần output đầy đủ ra file tạm; đã không dùng phần output bị cắt làm evidence, chuyển sang read-back bounded của file hiện tại và status scoped. Đây là sự cố hiển thị đã được mục **Portable diff-output paging** trong `Lesson-learned.md` bao phủ.
- Đã cập nhật biến thể reviewer checkpoint vào mục **Hidden-path candidate verification** trong `Lesson-learned.md`; không tạo mục trùng. Không chạy lại kiểm tra để xử lý sự cố này.

Đường dẫn evidence: `.brain/evidence/05-mobile-readonly-client/review.md`

## Round-trip check — Bước 1: phần suy ngược trước khi đọc ticket gốc

Phần dưới đây chỉ được suy ngược từ implementation/test hiện tại thuộc ticket và các evidence PASS đã chỉ định; tại thời điểm ghi phần này, chưa mở ticket gốc, Acceptance Criteria hoặc Rubric:

- Xây dựng một mobile React Native client Android/JS cho CivicOS, có đăng nhập/đăng xuất và khôi phục phiên qua HTTP backend thật; khi phiên hết hạn thì chuyển về trạng thái hết phiên, còn lỗi mạng/403 phải được biểu diễn thành state UI phù hợp.
- Client là read-only cho nghiệp vụ: mọi dữ liệu business đi qua HTTP API chung, các request đọc dùng GET; chỉ cho phép POST/DELETE của auth session, chặn các write nghiệp vụ và không expose public citizen/intake/create/update route.
- Main/map phải lấy layer, provider và các item từ backend, hiển thị dữ liệu Point/Polygon bằng MapLibre/OSS, giữ attribution OpenStreetMap, cho phép toggle layer cục bộ, xử lý permission bị từ chối và hỗ trợ basemap/cache/offline với trạng thái offline rõ ràng.
- RelatedInfo phải hỗ trợ search, đếm theo entity type, filter, pagination/debounce, danh sách và detail; detail fetch theo entity type/id từ backend, hiển thị masking do server trả về, và có đường mở vị trí trên bản đồ/bottom sheet khi response có geometry hoặc tọa độ.
- Alarm/dispatch/task phải có list/detail read-only từ backend, hiển thị loading/empty/error/403/masked/offline và retry; dữ liệu nhạy cảm/assignment summary phải giữ masking, không tự unmask hoặc tự suy diễn quyền ở client.
- Các force item phải mang được các reference do backend cung cấp (`incidentId`, `resourceId`, coordinates, RelatedInfo reference, assignment summary) để deep-link. Thứ tự route phải là: có `incidentId` thì mở Incident và gọi detail endpoint Incident hiện có; chỉ khi không có `incidentId` mới mở RelatedInfo; nếu chỉ có resource/coordinates thì mở Map. Khi có Incident đồng thời với RelatedInfo thì không để RelatedInfo làm route active.
- Incident context chỉ là consumer của endpoint/envelope Incident đã tồn tại, không tạo contract/wire type/backend business store riêng trong mobile ticket.
- API/config phải nhận runtime hoặc build-time base URL hợp lệ qua native/build injection, không hard-code production URL và không chứa secret; Android native boundary/dependency phải build được trên Windows.
- UI mobile cần có các trạng thái động (loading, empty, error, forbidden, masked, offline), retry và tap target tối thiểu; phạm vi hình ảnh gồm auth/main/map, RelatedInfo và alarm/dispatch/task, không mở rộng sang workflow write.

## Round-trip check — Bước 3: đối chiếu với ticket gốc

Ticket gốc được mở sau khi phần suy ngược ở trên đã được ghi. Kết quả đối chiếu từng ý:

| Ý suy ngược | Đối chiếu ticket gốc | Kết quả |
|---|---|---|
| Mobile React Native Android/JS, auth/session, login/logout/expiry và auth/main route | Mô tả ticket yêu cầu app React Native với auth/main/map tại `:19`; AC-02 yêu cầu authenticated/main, unauthenticated/auth và re-login khi session hết hạn tại `:24`; HTTP surface có session tại `:66`. | **PASS** — khớp. Evidence implementation `mobile/src/api/session.ts:3-50`, `SessionContext.tsx:18-43`; run 43 có `session.test.ts` PASS (`run43-mobile_test.log:13,22-25`). |
| Read-only, business data qua HTTP chung, GET-only, chặn write nghiệp vụ và không có public citizen/write route | Ticket nêu không thêm mobile write/public citizen app tại `:19`, AC-07 và AC-09 tại `:29-31`, cùng HTTP read-only surface tại `:64-70,83`. | **PASS** — khớp. `mobile/src/api/client.ts:46-68` gọi HTTP và `WriteGuard.ts:5-20` chặn write ngoài auth; `navigation-readonly.test.tsx:7-12` PASS trong run 43. |
| Map lấy dữ liệu backend, MapLibre/OSS, point/polygon, toggle, permission denied, OSM attribution và offline cache | AC-03/04 tại `:25-26`, HTTP map tại `:67,75`, platform boundary tại `:85-90`. | **PASS** — khớp. `MapScreen.tsx:89-170,197-317`, `ProviderAdapter.ts:2-9`; mobile map test/build PASS trong run 43 (`tests.md:1940-1949`, `run43-mobile_test.log:19,22-25`). |
| RelatedInfo search/filter/count/pagination/debounce/list/detail/map sheet từ HTTP response, không client fixture | Mô tả và AC-05 tại `:19,27`; endpoint/shape/boundary tại `:68,70,76-79`; bước thực hiện cấm client-derived adapter/fixture tại `:58`. | **PASS** — khớp. `api/relatedInfo.ts:11-37`, `RelatedInfoScreen.tsx:50-223`, `RelatedInfoDetail.tsx:22-87`; run 43 RelatedInfo PASS và run 46 HTTP contract PASS (`run43-mobile_test.log:14,22-25`, `run46-test.log:8-10,32-42`). |
| Forces alarm/dispatch/task read-only, masked assignment summary, state/retry và deep-link fields | AC-07/08 tại `:29-30`; các endpoint và field bắt buộc tại `:69,80-83`. | **PASS** — khớp. `api/forces.ts:4-51`, `AlarmScreen.tsx:14-103`, `DispatchScreen.tsx:21-136`, `TaskScreen.tsx:21-135`; forces/deep-link suites PASS trong run 43 và HTTP contract PASS trong run 46. |
| Deep-link giữ `incidentId`, `resourceId`, coordinates/reference; ưu tiên Incident khi có `incidentId`, RelatedInfo chỉ fallback khi thiếu, resource/coordinates mở Map | Ticket yêu cầu route source-compatible và links tại `:29`; backend fields/boundary tại `:80-83`; phần quyết định Incident xác nhận dùng `incidentId` của contract 03/06 và không tạo contract/type/test riêng tại `:127`. | **PASS** — khớp về nghiệp vụ và không mâu thuẫn với ticket. `deepLinks.ts:5-18` thực thi đúng thứ tự; `deepLinks.test.ts:31-63` có cả trường hợp đồng thời `incidentId` + `relatedInfo` và fallback, PASS trong run 43 (`run43-mobile_test.log:20,22-25`). |
| Incident chỉ consume endpoint/envelope hiện có, không tạo Incident contract/wire type/test riêng trong ticket 05 | Ticket HTTP surface nêu endpoint hiện có tại `:69`; quyết định Research ghi rõ envelope 03/06 và cấm bổ sung contract/type/test riêng tại `:127`. | **PASS** — khớp. `IncidentScreen.tsx:18-43` gọi `/api/incidents/:incidentId`; `changes.md:12-20` ghi rõ không tạo contract/type/test Incident mới. |
| Base URL runtime/build-time qua native/build injection, không hard-code production URL/secret; dùng batch dependency và Android build trên Windows | AC-11/12 tại `:33-34`; platform boundary tại `:85-90`; approval/toolchain tại `:94-113`. | **PASS** — khớp. `config.ts:8-38` và native config boundary; `config.test.ts` PASS, mobile build PASS trong run 43 (`tests.md:1940-1949`). |
| UI động gồm loading/empty/error/403/masked/offline, retry, tap target tối thiểu và các surface auth/map/RelatedInfo/forces | AC-08 tại `:30`, các bước thực hiện tại `:54-60`, Rubric UI/UX tại `:48-50`. | **PASS** — khớp. `States.tsx:4-52` và các screen tương ứng có state/retry, Pressable chính có `minHeight: 44`; run 43 mobile suite PASS (`run43-mobile_test.log:11-23`). |

### Kết luận round-trip

**PASS.** Phần suy ngược khớp ticket gốc về phạm vi nghiệp vụ, read-only/security boundary, các surface mobile, deep-link Incident/RelatedInfo/Map, Incident seam hiện có và platform/build boundary. Không phát hiện điểm lệch cụ thể nào giữa yêu cầu gốc và điều mà implementation/test hiện tại đang cố đáp ứng.

## Trục trặc gặp phải trong vòng round-trip này

- Một số lần đọc đầu tiên dùng chuỗi đường dẫn Windows bị chèn ký tự `null byte`, khiến tool trả lỗi trước khi đọc file. Đã dừng dùng path lỗi, chuyển sang path slash-separated đã xác nhận và đọc lại thành công; không chạy kiểm tra để xử lý sự cố này.
- Đã cập nhật biến thể **round-trip** trong mục **Verified-path reads** của `Lesson-learned.md`, không tạo mục trùng.
