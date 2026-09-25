# Plan Check — `05-mobile-readonly-client` (chỉ plan, chưa code/test/chạy/commit)

## 0. Tóm tắt rủi ro / scope

| Hạng mục | Nội dung chốt trong plan này |
|---|---|
| Scope cho phép | Chỉ `mobile/**`, `src/modules/**/contracts.ts` khi thật sự cần công bố HTTP contract, `tests/**` cho API contract. Không chạm `.env`, secrets, CI/CD, `.scratch`, source repo ngoài. Không xóa/reset/format toàn repo (working tree đang bẩn từ ticket khác). |
| Điểm xuất phát | `mobile/` chưa tồn tại (glob rỗng). Root đã có `maplibre-gl@^6.11.1`. Backend có sẵn các endpoint thật ở mục 5, KHÔNG có `/api/related-info/*`, `/api/map/layers`, alarm/dispatch/task endpoints (glob `src/app/api/**/route.ts` đã xác nhận). |
| Dependency đã duyệt (ticket 00) | `@maplibre/maplibre-react-native@11.4.0` MIT, command `npm --prefix mobile install @maplibre/maplibre-react-native@11.4.0`; JDK 17 / SDK 12.0 / ADB 37 / emulator `Pixel_7` PASS; Gradle wrapper + Android project là deliverable của ticket này (không phải blocker preflight). |
| Rủi ro chính 1 | Ticket yêu cầu `GET /api/related-info/*`, `GET /api/map/layers`, alarm/dispatch/task endpoints nhưng repo chưa có → xử lý bằng adapter client-side trên endpoint thật (mục 5), KHÔNG bịa backend mới (backend route mới nằm ngoài whitelist). |
| Rủi ro chính 2 | Hotspot/Violation không có endpoint riêng → suy ra từ projection/markers + inspections/findings ở client, gắn nhãn rõ là derived view, không tạo store nghiệp vụ mới. |
| Rủi ro chính 3 | React Native core (`react`, `react-native`, TS, jest) chưa có approval/version chốt trong ticket 00 → scaffold phải xin approval version trước khi cài; chỉ mỗi MapLibre RN là đã APPROVED. |
| Rủi ro chính 4 | iOS toolchain không có trên Windows → chỉ cam kết Android/JS contract + ghi rõ giới hạn, theo đúng bước thực hiện cuối của ticket. |
| Kết luận sơ bộ | Xem cuối file. |

## 1. File dự định sửa / tạo (chính xác, không placeholder)

### 1a. Implementation — `mobile/` (tạo mới toàn bộ, React Native CLI hướng Android)

- `mobile/package.json` — package độc lập, scripts `typecheck/test/build/android`.
- `mobile/package-lock.json` — sinh bởi lệnh cài đã duyệt (`npm --prefix mobile install ...`), commit kèm.
- `mobile/tsconfig.json` — strict, `noEmit`, tách khỏi root Next.js.
- `mobile/babel.config.js` — preset React Native.
- `mobile/metro.config.js` — cấu hình Metro mặc định.
- `mobile/index.js` — entry đăng ký App.
- `mobile/app.json` — tên app/displayName.
- `mobile/.env.example` — chỉ tên biến `CIVICOS_API_BASE_URL` + ghi chú emulator `10.0.2.2`, không giá trị thật, không file secret.
- `mobile/src/config.ts` — đọc API base URL runtime (env + override màn hình settings), default emulator `http://10.0.2.2:3000`, không hard-code production.
- `mobile/src/api/client.ts` — fetch wrapper: cookie/session header, parse lỗi `UNAUTHENTICATED/FORBIDDEN`, mã lỗi map.
- `mobile/src/api/session.ts` — `GET/POST/DELETE /api/auth/session` adapter.
- `mobile/src/api/mapApi.ts` — `GET /api/map/config` + `GET /api/map/markers` adapter.
- `mobile/src/api/relatedInfo.ts` — RelatedInfo adapter client-side (mục 5), gom Resident/Business/Hotspot/Violation từ endpoint thật.
- `mobile/src/api/incidents.ts` — `GET /api/incidents`, `GET /api/incidents/:incidentId` adapter read-only.
- `mobile/src/api/notifications.ts` — `GET /api/notifications` read-only (dùng cho alarm surface nếu có resource).
- `mobile/src/auth/SessionContext.tsx` — login/session state, logout, session-expiry handler toàn app.
- `mobile/src/auth/LoginScreen.tsx` — màn đăng nhập.
- `mobile/src/navigation/AppNavigator.tsx` — main tabs: Map / RelatedInfo / Alarm / Dispatch / Task / Settings.
- `mobile/src/features/map/MapScreen.tsx` — MapLibre RN view, point/polygon, layer toggle, OSM attribution, offline indicator.
- `mobile/src/features/map/ProviderAdapter.ts` — adapter styleUrl/tileBaseUrl từ `/api/map/config`, ép OSM attribution.
- `mobile/src/features/related-info/RelatedInfoScreen.tsx` — search debounce + layer tabs + filter sheet + bottom sheet list.
- `mobile/src/features/related-info/RelatedInfoDetail.tsx` — detail sheet read-only + mask + link map.
- `mobile/src/features/related-info/types.ts` — entityType/id/title/status/address/lat/lng/geometry/updatedAt + masked flags.
- `mobile/src/features/alarm/AlarmScreen.tsx` — surface alarm read-only, link map/RelatedInfo.
- `mobile/src/features/dispatch/DispatchScreen.tsx` — surface dispatch read-only, link map/RelatedInfo.
- `mobile/src/features/task/TaskScreen.tsx` — surface task read-only (Assignment context), link map/RelatedInfo.
- `mobile/src/components/States.tsx` — Loading/Empty/ErrorRetry/PermissionDenied/Masked/OfflineBanner dùng chung mọi màn.
- `mobile/src/components/WriteGuard.tsx` — guard chặn write command read-only (`MAP_OFFLINE_WRITE_BLOCKED` + `READ_ONLY_MVP`).
- `mobile/src/fixtures/synthetic.ts` — fixtures synthetic cho dev/test, không PII thật.
- `mobile/android/settings.gradle`, `mobile/android/build.gradle`, `mobile/android/app/build.gradle`, `mobile/android/app/src/main/AndroidManifest.xml`, `mobile/android/app/src/main/java/.../MainActivity.*` — Android native project tối thiểu (Gradle wrapper sinh bởi `gradle wrapper` sau approval; file `mobile/gradlew`, `mobile/gradle/wrapper/*` liệt kê khi sinh, không tự cài Gradle hệ thống).

### 1b. Contract chia sẻ (chỉ khi thật sự cần, thuần type)

- `src/modules/platform/map/contracts.ts` — KHÔNG tạo mới nếu `src/modules/platform/map/index.ts` hiện hữu đã đủ (`MapProviderConfig`, `MapMarker`, `MAP_ERRORS`, `maskMapMarker`, `resolveMapProvider`); chỉ thêm khi mobile cần type import mà không được import server-only. Mặc định: mobile tự định nghĩa type tương thích, không sửa file này.
- Không sửa `src/modules/identity/contracts.ts`, `src/modules/residents/contracts.ts`, `src/modules/incidents/contracts.ts`, `src/modules/inspections/contracts.ts` trừ khi Reviewer yêu cầu công bố contract; mặc định giữ nguyên.

### 1c. Test — trong phạm vi ticket

- `mobile/src/api/__tests__/session.test.ts` — contract session/login/logout/expiry.
- `mobile/src/api/__tests__/relatedInfo.test.ts` — mapping entityType/search/counts/detail/masking-passthrough.
- `mobile/src/api/__tests__/mapApi.test.ts` — provider adapter + markers parse + OSM attribution bắt buộc.
- `mobile/src/components/__tests__/writeGuard.test.ts` — mọi write E1-004/E1-007 bị chặn.
- `tests/mobile/related-info.contract.test.ts` — API contract root: residents/establishments/inspections/incidents/markers phục vụ adapter (không assert endpoint chưa tồn tại).

### 1d. Config / lockfile

- `mobile/package.json` + `mobile/package-lock.json` (mục 1a). Không sửa root `package.json`, `docker-compose.yml`, CI config.

### 1e. Package cần cài (liệt kê rõ)

- ĐÃ DUYỆT: `@maplibre/maplibre-react-native@11.4.0` (MIT) — command `npm --prefix mobile install @maplibre/maplibre-react-native@11.4.0`.
- CHƯA DUYỆT (phải xin approval version + license trước khi cài, không tự `npm install`): `react`, `react-native`, `typescript`, `@types/react`, `@types/react-native`, `jest`/`react-test-renderer` (hoặc vitest cho mobile nếu bám root toolchain). Không đề xuất thêm native dep (ví dụ `react-native-config`, async-storage, geolocation): config đọc env runtime + in-app override, location dùng API chuẩn của RN/MapLibre đã có trong package duyệt.

## 2. Hàm / interface / contract sẽ đổi hoặc tạo

- Tạo `SessionState { user, status: 'loading'|'authed'|'guest'|'expired', login(), logout(), refresh() }` trong `SessionContext.tsx`; 1 dòng đầu hàm/method/class/interface duy nhất, không comment rời.
- Tạo `ApiError { code, status }`, `requestJson(path, options)` trong `api/client.ts`; 401 → `status 'expired'`, 403 → permission-denied/masked.
- Tạo `MapProviderView { styleUrl, tileBaseUrl, attribution, bounds, official: false }` trong `ProviderAdapter.ts`; ép `attribution` chứa `OpenStreetMap`, ném `MAP_PROVIDER_UNAVAILABLE` nếu thiếu.
- Tạo `RelatedInfoItem { entityType: 'resident'|'business'|'hotspot'|'violation', id, title, status, address?, lat?, lng?, geometry?, updatedAt, masked: boolean }`, `searchRelatedInfo(query, layer, filters)`, `getRelatedInfoDetail(entityType, id)`, `countRelatedInfo(layer)` trong `api/relatedInfo.ts` + `types.ts`.
- Tạo `IncidentSummary/IncidentDetail` read-only + `listIncidents/getIncident` trong `api/incidents.ts`; alarm/dispatch/task screens chỉ render + link, không mutation.
- Tạo `ReadOnlyGuard.assertReadable()` / `WriteGuard` chặn mọi CTA tạo/cập nhật E1-004/E1-007 và mọi POST/PATCH/PUT/DELETE từ mobile (ngoại trừ `POST/DELETE /api/auth/session` cho login/logout và `PATCH /api/notifications` chỉ nếu ticket diễn giải alarm cần mark-read — mặc định KHÔNG gọi, giữ read-only tuyệt đối; nếu cần thì xin Planner trước).
- Không đổi hàm backend hiện có; không tạo store nghiệp vụ mới trên mobile (fixtures + cache basemap/markers chỉ là view cache).

## 3. Luồng xử lý chi tiết

1. Session/login: mở app → `SessionContext` gọi `GET /api/auth/session` (loading) → 200 có user → vào main tabs; 401 → `LoginScreen`; `POST /api/auth/session` sai credential → error + retry, không lưu secret; logout gọi `DELETE /api/auth/session` → về guest. Mọi API 401 giữa chừng → `status 'expired'` + banner + điều về login, giữ lại route để quay lại sau login.
2. Main navigation: tabs Map / RelatedInfo / Alarm / Dispatch / Task / Settings (giữ route/flow source PS-E3, không thêm tab citizen intake, không thêm tab tạo E1-004/E1-007). `CIVICOS_API_BASE_URL` đổi trong Settings chỉ áp dụng runtime, không commit.
3. Map (screen-11): lấy `GET /api/map/config` → dựng provider adapter OSS (styleUrl/tileBaseUrl/bounds/Official false + OSM attribution) → `GET /api/map/markers` (lọc sẵn OrganizationUnit + mask server-side) → render point/polygon + layer toggle + tap marker mở RelatedInfo detail sheet. Location permission: granted → hiện vị trí; denied → banner permission-denied + vẫn xem basemap/markers. Error → retry; empty → empty-state; offline → basemap/cache + banner offline, mọi write bị `WriteGuard` chặn (`MAP_OFFLINE_WRITE_BLOCKED`).
4. RelatedInfo (screen-12): search debounce 300ms + layer tabs (Resident/Business/Hotspot/Violation) + filter sheet → gọi adapter (mục 5) → bottom sheet list → tap mở detail sheet read-only. Masking: server đã mask, client chỉ render `masked=true` thành text che + không có nút reveal; 403 → permission-denied/masked state. Không có CTA tạo/cập nhật.
5. Alarm/dispatch/task (screen-13): list read-only từ incidents/notifications context → detail read-only → deep-link tới map (tọa độ) / RelatedInfo (entity liên quan) khi có resource; task hiển thị Assignment context (ai được phân công) nhưng không mutation. Không có dispatch/assign/verify/approve CTA.
6. Trạng thái bắt buộc mọi màn động: loading skeleton, empty, error/retry, permission-denied/masked, offline banner, session-expiry redirect. Tap target tối thiểu 44px, retry rõ ràng.
7. Read-only write guard: mọi nút/command ghi E1-004/E1-007 và public citizen intake không được render; nếu code path nào lọt (defensive) thì `WriteGuard` chặn + thông báo read-only MVP; offline thì mọi write đều chặn.

## 4. Map thay đổi → AC / Rubric / Các bước thực hiện

### 4a. Map từng dòng Acceptance Criteria

| AC | Thay đổi phục vụ (mục 1–3) | Ghi chú |
|---|---|---|
| `mobile/` độc lập, build được, không import server-only Next.js | `mobile/package.json`, `tsconfig.json`, `babel/metro/index/app.json`, toàn bộ `mobile/src/**` tự chứa; provider/contract type copy tương thích thay vì import `src/modules/**` server-only | Không sửa root package |
| Login/session, main navigation, logout, session hết hạn | `SessionContext.tsx`, `LoginScreen.tsx`, `api/session.ts`, `api/client.ts`, `AppNavigator.tsx` + luồng §3.1–3.2 | — |
| MapLibre RN: provider adapter OSS, point/polygon, layer toggle, location permission, OSM attribution | `ProviderAdapter.ts`, `MapScreen.tsx`, `api/mapApi.ts` + ép attribution chứa OpenStreetMap | Package đã duyệt 11.4.0 |
| Offline chỉ xem basemap/cache; write ngoài read-only bị chặn rõ | `States.tsx` (OfflineBanner), `WriteGuard.tsx`, `assertMapWriteAllowed` tương thích + luồng §3.3 | — |
| RelatedInfo search/list/detail Resident/Business/Hotspot/Violation + debounce/filter/layer/map sheet | `RelatedInfoScreen.tsx`, `RelatedInfoDetail.tsx`, `types.ts`, `api/relatedInfo.ts` + fixtures | Hotspot/Violation là derived view (mục 5) |
| Field nhạy cảm mask cùng policy web; API là security boundary | Không tự mask thêm ở client ngoài render `masked`; dựa `maskMapMarker`/`maskDisplayName`/server mask; `writeGuard.test.ts` + contract test | Không tạo nút reveal |
| Alarm/dispatch/task giữ route/flow source, link map/RelatedInfo khi có resource | `AlarmScreen.tsx`, `DispatchScreen.tsx`, `TaskScreen.tsx`, `api/incidents.ts`, `api/notifications.ts` | Chỉ read-only + link |
| Loading/empty/error-retry/permission-denied-masked/offline mọi màn động | `States.tsx` dùng chung + áp trong Map/RelatedInfo/Alarm/Dispatch/Task | — |
| Không CTA tạo/cập nhật E1-004/E1-007 hoặc citizen intake | Không tạo màn/form đó + `WriteGuard.tsx` + test chặn write | — |
| Mobile/API contract tests + build check | 4 file test mobile + `tests/mobile/related-info.contract.test.ts` + build/typecheck ở mục 7 | Chỉ mô tả lệnh, không chạy |
| API base URL inject runtime; không secret file | `.env.example` (tên biến only), `config.ts`, Settings override | Không commit secret |
| Dependency RN/MapLibre + native SDK đã duyệt ở ticket 00, nếu chưa thì `needs-info` | MapLibre RN 11.4.0 + JDK/SDK/ADB/emulator PASS đã có evidence; RN core chưa duyệt → xin approval trước cài, không mock pass | Điều kiện `PLAN_READY` ở mục kết luận |

### 4b. Map từng dòng Rubric bắt buộc

| Rubric | Thay đổi phục vụ |
|---|---|
| Dùng backend/API chung, không store nghiệp vụ tách khỏi CivicOS (`spec.md#27`) | Chỉ GET endpoint thật mục 5 + view cache; fixtures synthetic chỉ cho dev/test; không tạo DB/store mobile |
| Tôn trọng `OrganizationUnit`, Assignment, masking (`spec.md#22`, `CONTEXT.md#43`) | Dựa lọc OrganizationUnit + mask server-side của `/api/map/markers`, residents, incidents; Assignment chỉ hiển thị context ở Task; `masked` render-only |
| Không biến mobile PS-E3 thành phạm vi E1; chỉ surface E1 đã nêu (`spec.md#6`) | Chỉ alarm/dispatch/task surface phục vụ Incident context + link; không mobile write E1-004/E1-007, không citizen app |

### 4c. Map Rubric khuyến nghị (ghi nhận, ngưỡng tối thiểu 1/2)

| Trục | Thay đổi phục vụ |
|---|---|
| Thiết kế/UI bám screen-11/12/13 (textual baseline, Stitch chưa có) | Map/RelatedInfo/Alarm-Dispatch-Task bám component + trạng thái của 3 screen spec |
| Thao tác/UX bottom sheet, tap 44px, retry rõ | Bottom sheet list/detail, filter sheet, `States.tsx` retry, style tap target |
| Quy trình source-compatible, không mở rộng ngoài E1 MVP | `AppNavigator` giữ navigation source, `WriteGuard` khóa mở rộng |

### 4d. Map từng dòng Các bước thực hiện

| Bước ticket | Thực hiện trong plan |
|---|---|
| Scaffold `mobile/`, env/API base URL không secret | `mobile/package.json/lockfile/tsconfig/babel/metro/index/app.json`, `.env.example`, `config.ts` |
| Auth/main/map theo screen-11 + MapLibre adapter | `SessionContext/LoginScreen/AppNavigator/MapScreen/ProviderAdapter/api(session/mapApi)` |
| RelatedInfo read-only theo screen-12 | `RelatedInfoScreen/Detail/types/api-relatedInfo/fixtures` |
| Alarm/dispatch/task tối thiểu theo screen-13 | `Alarm/Dispatch/TaskScreen + api(incidents/notifications)` |
| Fixtures synthetic + contract tests Resident/Business/Hotspot/Violation/Incident | `fixtures/synthetic.ts` + 5 file test mục 1c |
| Kiểm tra masking/offline/permission/session-expiry trên thiết bị/emulator | Kịch bản thủ công ở mục 7 (Tester thực hiện, Developer không chạy) |
| `npm --prefix mobile ci` (lệnh đã duyệt) rồi typecheck/test/build mobile | Mô tả ở mục 7, đúng lệnh duyệt + lệnh mobile |
| API contract tests từ root, ghi rõ chỉ Android/JS vì Windows thiếu iOS toolchain | `tests/mobile/related-info.contract.test.ts` + ghi giới hạn iOS trong kết luận/mục 7 |

Thay đổi không map trực tiếp AC/Rubric: Android native files (`settings.gradle/build.gradle/AndroidManifest/MainActivity`, `gradlew` sinh sau) — lý do dependency kỹ thuật: React Native CLI yêu cầu để `build được` (AC dòng 1) và Definition of Done native của ticket; `metro/babel/index/app.json` tương tự là yêu cầu toolchain, không phải tính năng.

## 5. Endpoint có thật + contract adapter; endpoint ticket yêu cầu nhưng chưa có

Có thật (đã đọc source route, chỉ dùng GET read-only từ mobile):

| Endpoint thật | Dùng cho | Adapter |
|---|---|---|
| `GET/POST/DELETE /api/auth/session` | Login/session/logout | `api/session.ts`; POST chỉ login, DELETE chỉ logout |
| `GET /api/map/config` | Provider adapter OSS | `ProviderAdapter.ts`: styleUrl/tileBaseUrl/bounds/attribution/healthUrl |
| `GET /api/map/markers` | Point/polygon + Hotspot derived | `api/mapApi.ts`; đã lọc OrganizationUnit + mask server-side |
| `GET /api/residents` + `GET /api/residents/:subjectId` (+ management-records/activities) | RelatedInfo Resident | `api/relatedInfo.ts` map sang `entityType 'resident'` |
| `GET /api/establishments` (+ detail) | RelatedInfo Business | map sang `'business'` |
| `GET /api/inspections` (+ detail, `stats`) | RelatedInfo Violation (finding/result `needs_action`) + Task context | map sang `'violation'`; không gọi POST schedule từ mobile |
| `GET /api/incidents` + `GET /api/incidents/:incidentId` | Incident context + alarm/dispatch/task surface | `api/incidents.ts` read-only |
| `GET /api/notifications` | Alarm surface (thông báo incident) | `api/notifications.ts` read-only; mặc định không PATCH |
| `GET /api/map/health` | Kiểm tra tile health cho banner offline | Chỉ GET |

Ticket yêu cầu nhưng repo CHƯA có (không bịa backend, vì route mới nằm ngoài whitelist):

| Yêu cầu ticket | Cách xử lý trong phạm vi cho phép |
|---|---|
| `GET /api/map/layers` / tile provider contract ticket 01 | Dùng `GET /api/map/config` thật làm provider contract; layer toggle là client-side filter trên markers theo `aggregateType`; ghi rõ trong evidence là thay thế tương thích |
| `GET /api/related-info/search`, `counts`, `:entityType/:id` | KHÔNG tạo route mới; `api/relatedInfo.ts` client-side tổng hợp search/counts/detail từ các endpoint thật trên + `markers`; response mobile nội bộ giữ shape ticket (`entityType/id/title/status/address/lat/lng/geometry/updatedAt`, sensitive đã mask) |
| Alarm/dispatch/task endpoints "ticket 00 xác nhận tồn tại" | Glob xác nhận không tồn tại route riêng; surface dựng từ `incidents` + `notifications` thật, giữ route/flow source ở navigation, link map/RelatedInfo khi có resource; đánh dấu là giới hạn tương thích trong evidence |
| Hotspot endpoint riêng | Không có; Hotspot là derived view từ cluster markers/polygon (`hasArea`) + incidents/inspections; gắn nhãn synthetic/derived, không khẳng định là Hotspot nghiệp vụ đầy đủ |

## 6. Kế hoạch TDD red → green → refactor (chỉ trong phạm vi ticket)

1. `session.test.ts`: red — login 200 lưu user, 401 invalid, 401 giữa chừng → expired, logout về guest; green — `SessionContext` + `client.ts` tối thiểu; refactor — tách parse lỗi dùng chung.
2. `mapApi.test.ts`: red — config thiếu OSM attribution → `MAP_PROVIDER_UNAVAILABLE`, markers thiếu tọa độ bị bỏ, mask title khi thiếu quyền; green — `ProviderAdapter` + `mapApi.ts`; refactor — dùng chung `States.tsx`.
3. `relatedInfo.test.ts`: red — search debounce + layer filter + detail map đúng `entityType`, masked passthrough, empty; green — adapter + screens tối thiểu; refactor — tách fixtures.
4. `writeGuard.test.ts`: red — mọi write E1-004/E1-007/intake bị chặn cả online/offline; green — `WriteGuard`; refactor — thông điệp chung.
5. `tests/mobile/related-info.contract.test.ts`: red — GET residents/establishments/inspections/incidents/markers trả shape mà adapter cần (có auth, mask không lộ PII thật); green — giữ nguyên backend, chỉ sửa adapter/mobile khi lệch; refactor — helper assert shape dùng chung.
6. Fixtures synthetic phục vụ red trước khi backend seed sẵn; không dùng PII/credential thật.

## 7. Lệnh verification dự kiến (mô tả only, KHÔNG chạy)

- Mobile (thư mục `mobile/`, sau khi dependency RN core được approval + cài): `npm --prefix mobile ci` (lệnh đã duyệt ở ticket 00, áp cho cả MapLibre RN) → `npm --prefix mobile run typecheck` (`tsc --noEmit`) → `npm --prefix mobile test` (4 suite mục 1c) → Android debug build + emulator smoke (`Pixel_7`, API base `10.0.2.2:3000`) nếu JDK/SDK/ADB PASS (đã PASS) và Gradle wrapper đã sinh; thủ công: masking/offline/permission-denied/session-expiry theo §3.
- Root API contract (thư mục root): `npm run prisma:generate` → `npm run typecheck` → `npm test tests/mobile/related-info.contract.test.ts` (chỉ file phạm vi ticket, DB Docker đã PASS ở ticket 00). Không ghi full root test/e2e (`npm test` toàn bộ, `test:e2e`, `lint`, `format:check`, `build`) vào phạm vi ticket này.
- Ghi rõ trong evidence Tester: chỉ kiểm tra Android/JS vì Windows không có iOS toolchain; không mock pass iOS.

## Kết luận

`PLAN_READY` — plan bao phủ 100% AC/Rubric/steps bằng file mục 1, hàm mục 2, luồng mục 3, adapter mục 5 và TDD mục 6 trong đúng whitelist; dependency đã duyệt (MapLibre RN 11.4.0 MIT + JDK/SDK/ADB/emulator PASS) đủ để scaffold, phần RN core chưa duyệt được nêu rõ là phải xin approval trước khi cài chứ không tự cài; các endpoint ticket yêu cầu nhưng repo chưa có đều có cách xử lý tương thích không bịa backend; verification tách rõ mobile vs root contract và loại trừ full root test/e2e khỏi phạm vi ticket.
