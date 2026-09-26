# Plan Check — 05-mobile-readonly-client

## 0. Phạm vi và hiện trạng đã đối chiếu

- Căn cứ: ticket hiện tại, `CONTEXT.md`, `spec.md`, screen-11/12/13; không có `.scratch/feature-map.md` và không có ADR trong `docs/adr/`.
- Mục tiêu: app React Native độc lập trong `mobile/` dùng backend/API chung, chỉ read-only cho auth/main/map, RelatedInfo và alarm/dispatch/task cùng Incident context.
- Whitelist ticket: `mobile/**`; `src/modules/**/contracts.ts` chỉ khi bắt buộc công bố HTTP contract tương thích; `tests/**` cho API contract; evidence thuộc `.brain/evidence/05-mobile-readonly-client/**`.
- Hiện workspace đã có scaffold, source mobile, test skeleton/HTTP contract và Android artifacts; checklist triển khai đã `[x]` nhưng toàn bộ AC/Rubric vẫn chưa được coi là PASS vì evidence cuối thiếu khớp cây hiện tại và có các lần verification FAIL.
- Không sửa ticket/AC, `.env`/secret, `src/app/**`, root config, server-only implementation hoặc `.brain` ngoài evidence của ticket; không chạy test/lint/typecheck/format/build trong Plan Check.

## 1. File dự định sửa/tạo

### 1.1. Mobile implementation

- Package/toolchain: `mobile/package.json`, `mobile/package-lock.json`, `mobile/tsconfig.json`, `mobile/babel.config.js`, `mobile/metro.config.js`, `mobile/jest.config.js`, `mobile/index.js`, `mobile/app.json`.
- Android/native build boundary: `mobile/android/settings.gradle`, `mobile/android/build.gradle`, `mobile/android/gradle.properties`, `mobile/android/app/build.gradle`, `mobile/android/app/proguard-rules.pro`, `mobile/android/app/src/main/AndroidManifest.xml`, `mobile/android/app/src/main/java/com/civicosmobile/{MainActivity.kt,MainApplication.kt,ApiConfigModule.kt,ApiConfigPackage.kt}`, `mobile/android/gradle/wrapper/{gradle-wrapper.jar,gradle-wrapper.properties}`, `mobile/android/{gradlew,gradlew.bat}`. Generated `mobile/android/.gradle/**`, `mobile/android/app/build/**`, `mobile/android/app/.cxx/**` không phải file source dự định sửa/tạo.
- Entry/config/API: `mobile/src/App.tsx`, `mobile/src/config.ts`, `mobile/src/api/{client.ts,session.ts,map.ts,relatedInfo.ts,forces.ts}`.
- Auth/navigation: `mobile/src/auth/{SessionContext.tsx,LoginScreen.tsx}`, `mobile/src/navigation/{AppNavigator.tsx,deepLinks.ts}`.
- Shared UI guard/state: `mobile/src/components/{States.tsx,WriteGuard.ts}`.
- Features: `mobile/src/features/map/{MapScreen.tsx,ProviderAdapter.ts}`, `mobile/src/features/related-info/{types.ts,RelatedInfoScreen.tsx,RelatedInfoDetail.tsx}`, `mobile/src/features/alarm/AlarmScreen.tsx`, `mobile/src/features/dispatch/DispatchScreen.tsx`, `mobile/src/features/task/TaskScreen.tsx`, `mobile/src/features/incident/IncidentScreen.tsx`, `mobile/src/features/settings/SettingsScreen.tsx`.
- Không tạo `mobile/src/api/incidents.ts`, Incident wire type mới, Incident test riêng hoặc client business store/fixture.

### 1.2. Tests/contract evidence thuộc implementation scope

- Mobile tests: `mobile/src/config.test.ts`, `mobile/src/api/__tests__/{client.test.ts,session.test.ts,map.test.ts,relatedInfo.test.ts,forces.test.ts}`, `mobile/src/components/__tests__/{states.test.tsx,writeGuard.test.ts}`, `mobile/src/features/__tests__/{deepLinks.test.ts,navigation-readonly.test.tsx}`, `mobile/src/test-globals.d.ts` khi cần cho package test/type boundary.
- Root consumer contract: `tests/mobile/readonly-http.contract.test.ts`, chỉ gọi HTTP backend thật; không tạo fixture để giả response.
- `deepLinks.test.ts` chỉ kiểm tra route và field reference của deep-link theo contract ticket 06 cùng Incident envelope hiện có; không tạo Incident contract, wire type hoặc test contract Incident riêng.
- Không sửa `src/modules/**/contracts.ts` trong baseline này; nếu phát sinh nhu cầu bắt buộc thì dừng và xin Planner duyệt lại plan.

## 2. Hàm/interface/module sẽ đổi

- `resolveApiBaseUrl`, `apiBaseUrl` (`mobile/src/config.ts`): runtime injection ưu tiên build-time/native injection, chỉ nhận `http/https`, bỏ slash cuối, thiếu/invalid thì lỗi; không hard-code production URL.
- `ApiError`, `parseResponse`, `requestJson`, `onSessionExpired` (`mobile/src/api/client.ts`): nối base URL, credentials, giữ nguyên HTTP `401/403`, phát tín hiệu expiry tập trung cho `401`, map lỗi mạng thật thành `OFFLINE`, gọi `WriteGuard` trước mọi write.
- `sessionStateFromResponse`, `getSession`, `login`, `logout` (`mobile/src/api/session.ts`) và `SessionProvider/useSession` (`SessionContext.tsx`): loading/authenticated/unauthenticated/expired và re-login.
- `getMapLayers`, `getMapItems`, `getMapProvider` (`api/map.ts`) và `ProviderAdapter`: consume map contract, point/polygon từ HTTP RelatedInfo, luôn giữ OSM attribution.
- `RelatedInfoEntityType`, `RelatedInfoItem`, `RelatedInfoQuery`, các response type search/count/detail (`features/related-info/types.ts`), cùng `buildRelatedInfoPath`, `searchRelatedInfo`, `countRelatedInfo`, `getRelatedInfoDetail` (`api/relatedInfo.ts`): giữ shape ticket 06, query phẳng, pagination, debounce và detail HTTP thật.
- `ForceLink`, `ForceItem`, list/detail envelopes, `forcePaths`, `getAlarms`, `listDispatches/getDispatch`, `listTasks/getTask/listTasksByDispatch` (`api/forces.ts`): GET-only, giữ deep-link fields `incidentId`, `resourceId`, `coordinates`, `relatedInfo`, `assignmentSummary` và alias task.
- `deepLinkFor`, `AppNavigator`: route source-compatible tới Map/RelatedInfo/Incident, chỉ truyền id/reference/coordinates/assignment summary; không có route write/citizen.
- `States`, `StateMessage`, `OfflineBanner`, `MaskedValue`, `WriteGuard.assertReadOnly`: state matrix và chặn POST/PUT/PATCH/DELETE ngoài auth.
- `MapScreen`, `RelatedInfoScreen`, `RelatedInfoDetail`, `AlarmScreen`, `DispatchScreen`, `TaskScreen`, `IncidentScreen`, `SettingsScreen`: render dữ liệu HTTP, retry/loading/empty/error/403/masked/offline, tap target mobile và không thêm write CTA.
- Incident seam bắt buộc tái sử dụng: `requestJson<{ incidents: [...] }>('/api/incidents')` và `requestJson<{ incident: { incident, events, approvals, informant } }>(`/api/incidents/${incidentId}`)`; không tạo contract/type/test Incident mới, không đổi hai envelope này.

## 3. Luồng xử lý chi tiết

1. `App` mount `SessionProvider`; gọi `GET /api/auth/session`. Loading hiển thị loading; user hợp lệ vào main; không có user vào auth; `401`/expiry chuyển `expired` về auth và cho re-login; logout dùng endpoint auth đã có.
2. Main map gọi layers/provider và RelatedInfo items từ HTTP. Server tự resolve session `OrganizationUnit`; client chỉ toggle visibility local. Point/polygon lấy từ response, location denied vẫn cho xem map nhưng hiển thị permission-denied; attribution OSM luôn hiện.
3. Khi offline, giữ basemap/offline pack và last-known view cache. Read vẫn render cache; write command bị chặn trước `fetch` với lý do rõ ràng. `403` là permission-denied, không biến thành empty/offline.
4. RelatedInfo search debounce 300ms; tab/filter tạo query phẳng gửi server; counts dùng cùng boundary; list giữ `data/total/page/pageSize`; marker/polygon mở map sheet; detail fetch `/api/related-info/:entityType/:id`, render masked/omitted nguyên trạng, không unmask.
5. Alarm gọi `GET /api/forces/alarms`; dispatch/task gọi list/detail và task alias theo contract ticket 06. List/detail enforce boundary ở server; client chỉ hiển thị fields và trạng thái read-only.
6. Item có `relatedInfo` mở RelatedInfo detail bằng reference rồi fetch server; có `resourceId/coordinates` mở map; có `incidentId` mở `IncidentScreen` và fetch `GET /api/incidents/:incidentId` với envelope detail hiện có. Khi cần danh sách Incident, fetch `GET /api/incidents` với envelope list hiện có. Không chuyển Incident context thành contract mới.
7. Mọi surface dữ liệu dùng state loading/empty/error+retry/403/masked/offline; không thêm create/update/assign/verify/approve/public citizen intake.
8. Base URL đọc tại thời điểm request từ injection; kiểm thử sau đó phải dùng ít nhất hai giá trị runtime/build-time khác nhau, không commit secret.

### 3.1. Trình tự TDD bắt buộc

Thực hiện toàn bộ implementation/test plan theo đúng Red → Green → Refactor, theo từng contract, state hoặc boundary đã map vào AC:

1. **Red:** viết test trước implementation và chạy test đó để xác nhận test đỏ đúng hành vi còn thiếu; test phải bao phủ contract/state/boundary tương ứng, gồm cả deep-link route/field reference của AC-07 khi cần.
2. **Green:** viết implementation tối thiểu để test đỏ chuyển xanh, không tạo abstraction hoặc contract ngoài whitelist.
3. **Refactor:** chỉ refactor sau khi test đã xanh; giữ nguyên hành vi và chạy lại các test liên quan để xác nhận vẫn xanh.

Ngoại lệ Incident của AC-07 chỉ là consumer/deep-link behavior: test route/field reference dùng `incidentId` từ contract ticket 06 và hai Incident envelope hiện có; không tạo Incident contract, wire type hoặc test contract Incident riêng.

## 4. Map thay đổi với AC/Rubric theo đúng thứ tự ticket

| AC nội bộ | Checkbox ticket | File/hàm/thay đổi phục vụ | Map tới ticket/Rubric |
|---|---|---|---|
| AC-01 | 1 | Package/config/entry/Android; mobile source chỉ import RN/MapLibre/mobile code, không import Next.js/Prisma/server-only. | Ticket `05:23`; Platform `05:87-90`; Rubric bắt buộc `05:40`. Android artifacts là dependency scaffold/build, không phải business logic. |
| AC-02 | 2 | `client.ts`, `session.ts`, `SessionContext`, `LoginScreen`, `AppNavigator`; session state và centralized `401` expiry. | Ticket `05:24`; screen-11 `:9-20`; không có AC Rubric riêng. |
| AC-03 | 3 | `map.ts`, `ProviderAdapter`, `MapScreen`, `States`; OSS provider, point/polygon, toggle, permission và OSM attribution. | Ticket `05:25`; HTTP map contract `05:67,75`; screen-11 `:9-20`; Rubric UI `05:48`. |
| AC-04 | 4 | `MapScreen` offline pack/cache, `client.ts`, `WriteGuard`, `States`; cache đọc được và mutation không phát request. | Ticket `05:26`; `spec.md:54-64`; screen-11 `:11-20`; không mở rộng thành write flow. |
| AC-05 | 5 | RelatedInfo types/API/screens/detail; debounce, filter, counts, pagination, map/list/detail từ response thật cho Resident/Business/Hotspot/Violation. | Ticket `05:27,68,76-79`; screen-12 `:9-21`; Rubric `05:40-41,48`. |
| AC-06 | 6 | `client.ts`, `States`, RelatedInfo detail và contract test; giữ masked/omitted, giữ `403`, không unmask; OU/Assignment là server boundary. | Ticket `05:28,78-79`; Rubric bắt buộc `05:41`; `CONTEXT.md:43-45`. |
| AC-07 | 7 | `forces.ts`, alarm/dispatch/task screens, `deepLinks.ts`, `AppNavigator`, `IncidentScreen`; deep-link id/reference/coordinates và read-only. Incident dùng nguyên envelope list `{ incidents: [...] }`, detail `{ incident: { incident, events, approvals, informant } }`. | Ticket `05:29,69,80-83,125-127`; screen-13 `:9-20`; Rubric `05:42,48-50`. Không tạo Incident contract/type/test mới. |
| AC-08 | 8 | `States` và mọi screen động; các nhánh loading/empty/error+retry/403/masked/offline. | Ticket `05:30`; screen-11 `:14-20`, screen-12 `:15-21`, screen-13 `:14-20`; Rubric thao tác `05:49`. |
| AC-09 | 9 | `AppNavigator` routes, mọi screen, `WriteGuard`, readonly/navigation tests; không CTA/route create-update/citizen. | Ticket `05:31`; `spec.md:36-38,74-79,200-205`; Rubric bắt buộc `05:42`. |
| AC-10 | 10 | Mobile scripts/tests và `tests/mobile/readonly-http.contract.test.ts`; assertion HTTP thật, masking/boundary/read-only. | Ticket `05:32`; platform `05:87-90`; không coi checklist `[x]` hoặc run lệch cây là PASS. |
| AC-11 | 11 | `config.ts`, native `ApiConfigModule`, settings display, config/client tests; runtime/build-time injection hai giá trị, không env/secret. | Ticket `05:33` và các quyết định approval `05:94-113`; đối chiếu các source/config implementation và test hiện có khi phù hợp; không có fallback production. |
| AC-12 | 12 | Package/lock exact approved batch; Android toolchain chỉ dùng dependency/toolchain đã được approval/availability xác nhận, không mock pass. | Ticket AC-12 `05:34`; approval batch React Native/MapLibre/toolchain `05:94-113`; nếu thiếu approval/SDK thì `needs-info`, không thêm package. |

### 4.1. Rubric độc lập

- Rubric bắt buộc `05:40`: toàn bộ business data đi qua HTTP backend/API chung; không tạo mobile business store. Map/API/RelatedInfo/forces/Incident chỉ là client transport/render.
- Rubric bắt buộc `05:41`: client giữ `masked`, `403`, `OrganizationUnit`/Assignment không do client tự chọn; server ticket 06 là security boundary.
- Rubric bắt buộc `05:42`: chỉ auth/map/RelatedInfo/forces/Incident context read-only trong E1; không public citizen app hay write surface.
- Rubric khuyến nghị `05:48-50`: screen-11/12/13 là textual baseline vì Stitch chưa khả dụng; cần map/list/detail/bottom sheet, retry và navigation source-compatible, tối thiểu tap target 44px.

### 4.2. Thay đổi không map trực tiếp

- Android Gradle/wrapper, package configs và `App.tsx`: bắt buộc để tạo package/build boundary của AC-01/AC-10/AC-12, không chứa business behavior.
- `test-globals.d.ts`, config/client unit tests: seam kỹ thuật cho AC-10/AC-11; không phải feature UI.
- `IncidentScreen`: dependency để consume endpoint Incident đã tồn tại và thỏa AC-07; deep-link test chỉ kiểm tra route/field reference theo contract ticket 06 và Incident envelope hiện có, không tạo contract/type/test Incident mới.
- Việc cần sửa ngoài các nhóm trên, hoặc cần đổi `src/modules/**/contracts.ts`, là dependency chưa được plan phê duyệt; phải dừng và xin Planner cập nhật plan.

## 5. Dependency/toolchain được user approve

- Được phép đúng batch ticket `05:94-113`: `react@19.2.3`, `react-native@0.85.3`, `@maplibre/maplibre-react-native@11.4.0`, `@types/react@19.2.14`, `typescript@5.9.3`, RN TypeScript/Babel/Metro/Jest presets `0.85.3`, `jest@29.7.0`, `@types/jest@29.5.14`, `@react-native-community/cli@20.0.0`.
- Không thêm npm package, native dependency, mock để thay availability, `.env.example`, `.env` hoặc secret file. API URL do người chạy inject runtime/build-time.
- Các lệnh được ticket approve cho Tester gồm `npm --prefix mobile ci`, mobile typecheck/test, Android build tương đương; Plan Check không chạy các lệnh đó.

## 6. Giới hạn môi trường và điều kiện native smoke

- Windows hiện không có iOS toolchain; không tuyên bố iOS build/smoke. Chỉ ghi nhận Android/JS nếu toolchain thực sự sẵn sàng.
- Android debug build và emulator smoke chỉ được coi là điều kiện Definition of Done khi ticket 00 xác nhận JDK/Android SDK/ADB và hạ tầng backend/port/API base URL khả dụng (`05:87-90,111-113`).
- Android emulator dùng API host phù hợp, thường `10.0.2.2:3000`; không hard-code production. Nếu JDK/SDK/ADB/emulator/backend thiếu, phải ghi `needs-info`/hạ scope theo Planner, không mock pass.
- Evidence hiện có ghi mobile-only pass ở một số lần và root/full runs FAIL hoặc lệch tree; vì vậy checklist `[x]` không được dùng thay cho current-tree evidence. HTTP contract cần server thật và injection `CIVICOS_API_BASE_URL`; không có server thì chưa có evidence PASS.

## 7. Rủi ro và điểm còn thiếu quyết định

- Rủi ro chính: full verification trước đây có lỗi root `FormData` ngoài whitelist và HTTP contract có lần thiếu/không kết nối API; đây là evidence/toolchain boundary, chưa phải kết luận AC PASS.
- Gradle generated artifacts đang hiện trong workspace; chỉ source Android nằm trong plan, không đưa `.gradle/**`, `build/**`, `.cxx/**` vào thay đổi có chủ đích.
- Không phát hiện thiếu quyết định nghiệp vụ mới trong các tài liệu đã được yêu cầu. Các điều kiện availability native/Android và server runtime là điều kiện môi trường đã nêu trong ticket, không tự bịa cách vượt qua.
