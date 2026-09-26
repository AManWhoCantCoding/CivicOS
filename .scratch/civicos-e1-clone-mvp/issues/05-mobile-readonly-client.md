# Mobile clone — Auth, Map và RelatedInfo read-only

- **Status:** done
- **Blocked by:** Không còn (00, 01, 02, 03, 04, 05a và 06-mobile-readonly-backend-contract đã done)
- **Loại:** feature
- **Gate hướng:** có
- **File được phép sửa:**
  - `mobile/**`
  - `src/modules/**/contracts.ts` chỉ khi cần công bố HTTP contract tương thích
  - `tests/**` cho API contract
- **File cấm sửa:**
  - `.env`, `.env.*`
  - `.brain/**` — ngoại trừ `.brain/evidence/05-mobile-readonly-client/**` theo role
  - `node_modules/**`
  - `**/secrets/**`

## Mô tả

Thêm app React Native trong `mobile/`, bám navigation/surface của source mobile và dùng backend/API chung. MVP có auth/main/map, MapLibre, `RelatedInfo` read-only cho Resident/Business/Hotspot/Violation và alarm/dispatch/task surface cần thiết cho context Incident. Không thêm mobile write flow cho E1-004/E1-007; không có public citizen app.

## Acceptance Criteria (bắt buộc — chặn done, PASS 100%)

- [x] Given checkout có `mobile/`, When chạy mobile build mà không có server-only Next.js module, Then build thành công và dependency graph không import server-only code.
- [x] Given user credentials/session hợp lệ, When login, logout hoặc session hết hạn, Then state/route lần lượt là authenticated/main, unauthenticated/auth và re-login flow.
- [x] Given provider OSS, point, polygon và location permission granted/denied, When mở map hoặc toggle layer, Then point/polygon render, visibility đổi theo toggle, permission-denied state hiển thị khi bị từ chối và OSM attribution luôn có.
- [x] Given thiết bị offline có basemap/cache, When xem map hoặc thử write command ngoài read-only MVP, Then basemap/cache vẫn xem được và write command không gửi request, hiển thị lý do bị chặn.
- [x] Given backend contract ticket 06 trả Resident/Business/Hotspot/Violation, When người dùng search/filter/chọn layer/mở map sheet/list/detail, Then mobile hiển thị đúng item từ HTTP response với debounce và không dựng response bằng client fixture.
- [x] Given backend trả item masked hoặc HTTP `403`, When mobile render dữ liệu nhạy cảm, Then field chỉ ở dạng masked/omitted, client không tự unmask và API response là security boundary.
- [x] Given alarm/dispatch/task response có deep-link fields, When người dùng mở surface hoặc tap resource, Then route/flow source-compatible và link tới map/RelatedInfo bằng `incidentId`/`resourceId`/reference; không có write action.
- [x] Given màn dữ liệu động lần lượt ở loading, empty, HTTP error, retry, `403`, masked và offline, When state tương ứng xảy ra, Then UI hiển thị đúng loading/empty/error+retry/permission-denied/masked/offline state.
- [x] Given mobile MVP render các surface E1-004/E1-007/E1-005, When inspect actions/routes, Then không có CTA create/update E1-004/E1-007 và không có public citizen intake.
- [x] Given command test/build được ticket 00 duyệt, When chạy mobile/API contract tests và build check, Then tất cả command exit `0` và có assertion cho contract, masking, boundary và read-only flow.
- [x] Given API base URL được inject ở hai giá trị runtime/build-time khác nhau, When chạy app với từng giá trị, Then request dùng đúng URL được inject, không hard-code production URL và repo không có mobile secret file.
- [x] Given ticket 00 đã ghi approval/availability cho React Native/MapLibre/native SDK, When giao implementation ticket 05, Then dùng dependency/toolchain đã duyệt; nếu approval/availability thiếu, ticket ở `needs-info` và không đổi sang mock pass.

## Rubric (mức độ đạt)

### Bắt buộc (chặn done — phải PASS 100%, Reviewer chấm như Acceptance Criteria)

- [x] Mobile dùng backend/API chung, không tạo store dữ liệu nghiệp vụ tách khỏi CivicOS, nguồn: `spec.md#27-đích-triển-khai-mobile`.
- [x] Read-only mobile tôn trọng `OrganizationUnit`, Assignment và masking, nguồn: `spec.md#22-source-of-truth-và-allocation` và `CONTEXT.md#43-assignment`.
- [x] Không biến mobile source PS-E3 thành phạm vi E1; chỉ giữ surface liên quan E1 đã nêu trong spec, nguồn: `spec.md#6-ngoài-phạm-vi-tranche-này`.

### Khuyến nghị (không chặn done, chỉ ghi nhận — trừ khi dưới ngưỡng tối thiểu)

| Trục | Mô tả kỳ vọng | Thang điểm | Ngưỡng tối thiểu |
|---|---|---|---|
| Thiết kế/UI | Bám screen-11, screen-12 và screen-13; Stitch chưa khả dụng nên textual spec là baseline | 0–2 | 1 |
| Thao tác/UX | Bottom sheet/list/detail phù hợp mobile, tap target tối thiểu 44px, retry rõ | 0–2 | 1 |
| Quy trình | Điều hướng source-compatible nhưng không mở rộng ngoài E1 MVP | 0–2 | 1 |

## Các bước thực hiện

- [x] Scaffold package React Native trong `mobile/`, cấu hình environment/API base URL không commit secret.
- [x] Implement auth/main/map theo screen-11 và MapLibre adapter.
- [x] Implement RelatedInfo search/filter/map/list/detail read-only theo screen-12.
- [x] Implement alarm/dispatch/task surfaces tối thiểu theo screen-13.
- [x] Dùng dữ liệu synthetic do backend/test sở hữu và API contract tests cho Resident/Business/Hotspot/Violation/Incident; không dùng client-derived adapter/fixtures để giả đạt HTTP contract.
- [x] Kiểm tra masking, offline basemap, permission-denied và session expiry trên thiết bị/emulator.
- [x] Chạy `npm --prefix mobile ci` hoặc command tương đương đã được ticket 00 duyệt, typecheck/test/build mobile và API contract tests từ root; ghi rõ nếu chỉ kiểm tra Android/JS vì môi trường Windows không có iOS toolchain.

## Hợp đồng triển khai

### HTTP surface read-only

- `GET /api/auth/session` hoặc contract session tương đương.
- `GET /api/map/layers`/tile provider contract của ticket 01.
- `GET /api/related-info/search`, `GET /api/related-info/counts`, `GET /api/related-info/:entityType/:id`.
- `GET /api/incidents`, `GET /api/incidents/:incidentId` và các endpoint alarm/dispatch/task đã được ticket 00 xác nhận tồn tại.
- Response phải trả `entityType`, `id`, `title`, `status`, `address?`, `lat?`, `lng?`, `geometry?`, `updatedAt`; field nhạy cảm phải được server mask.
- Contract chi tiết và owner backend nằm tại `issues/06-mobile-readonly-backend-contract.md`; Developer chỉ được giao ticket này sau khi ticket 06 đạt toàn bộ AC.

### Backend contract bắt buộc cho mobile

- `GET /api/map/layers`: không nhận OU do client tự chọn; server lấy session hiện tại, resolve `OrganizationUnit`, lọc layer theo OU/quyền và trả `{ layers: [{ id, label, visibleByDefault, entityTypes }] }`. Session không có quyền đọc layer trả `403`.
- `GET /api/related-info/search`: query bắt buộc tương thích gồm `q?`, `entityType?` (`RESIDENT|BUSINESS|HOTSPOT|VIOLATION`), `page?` (mặc định `1`), `pageSize?` (mặc định `20`, tối đa `100`) và các filter phẳng `status?`, `type?`, `category?`, `riskLevel?`, `tag?`, `dateFrom?`, `dateTo?`, `lat?`, `lng?`, `radiusKm?`, `geoLatMin?`, `geoLatMax?`, `geoLngMin?`, `geoLngMax?`. Response là `{ data, total, page, pageSize }`; mỗi item đúng tối thiểu `{ entityType, id, title, status, address?, lat?, lng?, geometry?, updatedAt, masked }`.
- `GET /api/related-info/counts`: nhận cùng `q`/`entityType`/filter như search, bỏ `page`/`pageSize`; response đúng `{ ALL, RESIDENT, BUSINESS, HOTSPOT, VIOLATION }` với value là số nguyên không âm.
- `GET /api/related-info/:entityType/:id`: response đúng `{ entityType, data }`, trong đó `data` có cùng item shape tối thiểu với search. Server enforce `OrganizationUnit` + resource `Assignment`, không trả raw PII; detail ngoài scope trả `403`.
- RelatedInfo list/count/detail chỉ trả record nằm trong `OrganizationUnit` của session và có resource `Assignment` active phù hợp; field nhạy cảm bị mask/loại bỏ ở server, client-side filtering chỉ là UX.
- Alarm read-only: `GET /api/forces/alarms` lấy recipient/scope từ session, không nhận `phoneNumber` để mở rộng quyền; response `{ alarms: [...] }`, mỗi item tối thiểu có `id`, `title`, `status`, `createdAt` và optional `incidentId`, `resourceId`, `coordinates: { lat, lng }`, `relatedInfo: { entityType, id }`, `assignmentSummary: { assignmentId, task, status }`.
- Dispatch read-only: `GET /api/forces/dispatches?page&pageSize&q&status&incidentId` và `GET /api/forces/dispatches/:dispatchId`; response list `{ data, total, page, pageSize }`, item/detail tối thiểu có `id`, `title`, `status`, `createdAt`, optional `incidentId`, `resourceId`, `coordinates`, `relatedInfo`, `assignmentSummary`.
- Task read-only: `GET /api/forces/tasks?page&pageSize&status&dispatchId&incidentId`, `GET /api/forces/tasks/:taskId`, và source-compatible alias `GET /api/forces/tasksbydispatchid?dispatchId=...`; response list/detail dùng item shape gồm `id`, `title`, `status`, `createdAt`, optional `dispatchId`, `incidentId`, `resourceId`, `coordinates`, `relatedInfo`, `assignmentSummary`.
- Alarm/dispatch/task list và detail đều enforce cùng `OrganizationUnit` + resource `Assignment` boundary; deep-link chỉ chứa id/reference/coordinates/assignment summary, không chứa raw PII và detail ngoài scope trả `403`. Không thêm write endpoint cho mobile MVP.

### Platform/build boundary

- `mobile/` có `package.json`, lockfile, TypeScript config, source navigation/features, Android native project nếu native build được duyệt.
- Không import `src/modules/**` server-only trực tiếp vào React Native; nếu cần shared contract, đặt file contract thuần type tại path được ticket 00 duyệt.
- API base URL cho Android emulator dùng giá trị runtime phù hợp (`10.0.2.2` khi backend chạy host), không hard-code production URL.
- Definition of Done native: Android debug build + emulator smoke nếu ticket 00 xác nhận JDK/SDK/ADB; nếu không, chỉ được đóng phần contract/JS khi Planner ghi rõ ticket bị hạ scope bởi hạ tầng.

## Quyết định user đã xác nhận — 2026-09-25

### Approval dependency React Native/toolchain (giữ nguyên)

- **APPROVED bởi user ngày 2026-09-25:** chấp thuận nguyên batch React Native/toolchain cụ thể sau; không tạo hoặc commit `mobile/.env.example`, không sửa `.env.*`, và API base URL phải được inject runtime/build-time bởi người chạy, không commit secret.
  - `react@19.2.3` — MIT — React runtime.
  - `react-native@0.85.3` — MIT — React Native core/Android.
  - `@maplibre/maplibre-react-native@11.4.0` — MIT — MapLibre native (đã được ticket 00 chốt).
  - `@types/react@19.2.14` — MIT — React types.
  - `typescript@5.9.3` — Apache-2.0 — typecheck.
  - `@react-native/typescript-config@0.85.3` — MIT — TypeScript config.
  - `@react-native/babel-preset@0.85.3` — MIT — Babel transform.
  - `@react-native/metro-config@0.85.3` — MIT — Metro bundling.
  - `@react-native/jest-preset@0.85.3` — MIT — RN Jest preset.
  - `jest@29.7.0` — MIT — test runner.
  - `@types/jest@29.5.14` — MIT — test types.
  - `@react-native-community/cli@20.0.0` — MIT — RN CLI nếu scaffold/build cần.
  - Lý do: package RN độc lập, tương thích peer của MapLibre 11.4.0, có TS/Babel/Metro/CLI, test JS/API contract và Android build.
  - Install exact: `npm --prefix mobile install --save-exact react@19.2.3 react-native@0.85.3 @maplibre/maplibre-react-native@11.4.0`; `npm --prefix mobile install --save-dev --save-exact @types/react@19.2.14 typescript@5.9.3 @react-native/typescript-config@0.85.3 @react-native/babel-preset@0.85.3 @react-native/metro-config@0.85.3 @react-native/jest-preset@0.85.3 jest@29.7.0 @types/jest@29.5.14 @react-native-community/cli@20.0.0` nếu CLI cần.
  - CI/install: `npm --prefix mobile ci`.
  - JS checks: `npm --prefix mobile run typecheck`; `npm --prefix mobile test -- --runInBand`.
  - Android checks: `npm --prefix mobile run android -- --no-packager` hoặc script tương đương được ghi sau scaffold; `cd mobile/android && gradlew.bat assembleDebug`.
- **Câu trả lời user (nguyên batch) ngày 2026-09-25:**
  1. “Chấp thuận như đề xuất (Recommended)” — tạo backend dependency ticket với file scope backend/API/domain/tests cụ thể; ticket 05 bị block tới khi ticket backend done.
  2. “Chấp thuận nguyên văn (Recommended)” — `GET /api/map/layers` scope theo session + `OrganizationUnit`, response `{layers:[{id,label,visibleByDefault,entityTypes}]}`, server lọc OU và trả `403` khi không có quyền.
  3. “Chấp thuận; detail ngoài scope = 403 (Recommended)” — RelatedInfo dùng query `q`, `entityType`, filters, pagination; item có các field đã nêu, server enforce `OrganizationUnit` + resource `Assignment`, mask sensitive fields, không raw PII.
  4. “Chấp thuận; dùng contract tối thiểu này” — alarm/dispatch/task read-only có incident/resource id, coordinates, relatedInfo reference, assignment summary và cùng boundary.
  5. “Chấp thuận nguyên văn (Recommended)” — ticket 05 thêm backend blocker, chỉ giao implementation sau backend contract pass, không dùng client-derived adapter/fixtures để giả đạt HTTP AC.
- **Backend contract boundary — hướng A đã chốt:** owner backend là ticket `06-mobile-readonly-backend-contract`; contract chi tiết nằm trong ticket 06 và phần `Backend contract bắt buộc cho mobile` ở trên.
- **Security boundary — APPROVED bởi user ngày 2026-09-25:** server phải enforce `OrganizationUnit` + `Assignment` + masking trên list, detail và deep-link; mobile tự lọc chỉ là UX, không thay thế security boundary.

## Đang chờ Research

Đã có quyết định của user ngày 2026-09-26:

- **Incident contract/client seam:** Ticket 05 được phép tiêu thụ response shape/type hiện có của ticket 03/06 cho `GET /api/incidents` và `GET /api/incidents/:incidentId`; **không** bổ sung contract/type/test riêng trong ticket 05. Plan phải nêu rõ client gọi hai endpoint hiện có và giữ nguyên envelope hiện tại: list `{ incidents: [...] }`, detail `{ incident: { incident, events, approvals, informant } }`. Incident context của alarm/dispatch/task dùng `incidentId` trong contract ticket 06 để deep-link/fetch, không tạo response shape mới.
- **Mapping AC:** Planner/Developer được phép map đúng thứ tự 12 checkbox nghiệp vụ hiện tại thành AC-01..AC-12 trong plan/evidence nội bộ; không sửa hoặc diễn giải lại Acceptance Criteria trong ticket. Test skeleton hiện tại đã là nguồn assertion tương ứng theo thứ tự này.

Không còn câu hỏi nghiệp vụ chờ user. Planner cập nhật plan theo hai quyết định trên trước khi tiếp tục Plan Check/triage; Research không ghi `.brain/**` evidence.

### Đã giải quyết — 2026-09-26

- README và ticket 00 xác nhận Next.js dùng port `3000`; Tester khởi động `npm run dev` và xác nhận `GET /api/auth/session` trả `200` với `{"user":null}`.
- Root verification đã chạy với injection tạm thời `CIVICOS_API_BASE_URL=http://localhost:3000`; không sửa `.env` hay commit URL.
- Không còn câu hỏi nghiệp vụ/hạ tầng về base URL; evidence runtime nằm trong `tests.md` lần chạy đầy đủ gần nhất.

## Lý do wontfix (lịch sử trước khi reopen)

- `node scripts/verify.mjs 05-mobile-readonly-client --scope=fast` vẫn FAIL ở lần chạy 6 (`Tree ae5fc214`), chỉ còn lỗi typecheck ngoài phạm vi mobile: `src/app/api/evidence/route.ts(20-25): error TS2339: Property 'get' does not exist on type 'FormData'`.
- Nguyên nhân là dependency React Native đã được ticket 00 phê duyệt nhưng kéo global `FormData`/web declarations vào root compiler; route Next.js và các DOM consumer thuộc ticket khác bị xung đột. Ticket 05 cấm sửa `src/app/**`, root config và file ngoài whitelist, nên không có chủ sở hữu hợp lệ trong ticket này để sửa lỗi cuối mà không làm sai phạm vi.
- Đã thử 4 vòng sửa cùng lỗi trong `mobile/**`: explicit nested Jest/Node references; global `FormData` augmentation theo `undici-types`; chuyển về DOM `FormDataEntryValue` và giữ `export {}` cho `declare global`; mỗi vòng đều giữ nguyên route root, không dùng `any`/`@ts-ignore`. Lỗi cuối vẫn tái hiện ở lần chạy 6.
- Các lỗi MapLibre API drift, Jest globals và partial matcher trong mobile đã được sửa trong các vòng trước; tuy nhiên chưa thể chạy lint, format, test, e2e hoặc build vì typecheck là bước chặn.
- Tiến độ dở dang: toàn bộ Acceptance Criteria và toàn bộ “Các bước thực hiện” vẫn chưa tick; `mobile/**` và `tests/mobile/**` đã có thay đổi nhưng chưa có verification PASS, chưa final review và chưa commit.
- Evidence cuối: `.brain/evidence/05-mobile-readonly-client/tests.md`, `.brain/evidence/05-mobile-readonly-client/logs/run6-typecheck.log`, `.brain/evidence/05-mobile-readonly-client/files-changed.md`.

## Trạng thái cuối

done

## Comments

- 2026-09-26 — Research: User đã phê duyệt kế hoạch cô lập root/mobile TypeScript và mở rộng verifier. Tạo ticket prerequisite `05a-mobile-build-boundary-fix` cho `tsconfig.json`, `package.json`, `scripts/verify.mjs` và regression test; toàn bộ AC nghiệp vụ mobile của ticket này giữ nguyên. Ticket 05 chưa được Research tự chuyển trạng thái; Planner cần triage ticket 05a trước, sau đó quyết định mở lại ticket 05 để giao implementation.
- 2026-09-26 — Planner: Reopen ticket sau khi toàn bộ dependency `00`–`06` và `05a` đã done; giữ nguyên Acceptance Criteria, Rubric và phạm vi mobile read-only.
- 2026-09-26 — Research: User xác nhận ticket 05 dùng response shape/type incident hiện có của ticket 03/06 cho `GET /api/incidents` và `GET /api/incidents/:incidentId`, không tạo contract/type/test riêng; Plan phải ghi rõ client seam/envelope hiện có và liên kết `incidentId` từ contract ticket 06. User cũng xác nhận map 12 checkbox theo thứ tự thành AC-01..AC-12 trong plan/evidence nội bộ, không sửa Acceptance Criteria.
