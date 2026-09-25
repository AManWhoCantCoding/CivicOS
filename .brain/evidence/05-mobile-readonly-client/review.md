# Plan Check — `05-mobile-readonly-client`

## Phạm vi và tài liệu đã đối chiếu

- Đã đọc lại toàn bộ ticket từ đĩa, gồm AC, Rubric, Các bước thực hiện, scope, hợp đồng triển khai và trạng thái `pending`.
- Đã đối chiếu `.brain/evidence/05-mobile-readonly-client/plan.md`, `spec.md`, `CONTEXT.md`, ba UI baseline screen-11/12/13, `.brain/PROTOCOL.md`, ticket `00` và evidence ticket `00`.
- Đã kiểm tra route inventory hiện tại: có `src/app/api/map/config/route.ts`, `map/markers`, `map/health`, `auth/session`, `residents`, `establishments`, `inspections`, `incidents`, `notifications`; không có `map/layers`, `related-info/*` hoặc route alarm/dispatch/task riêng.
- Không tìm thấy tài liệu ADR nào trong repo qua inventory `docs/**` và toàn repo. Không có ADR liên quan để đối chiếu; review dựa trên `spec.md`, `CONTEXT.md`, UI baseline và ticket.
- Không chạy test, lint, typecheck, format-check, build, npm install/ci, emulator, Docker hay bất kỳ lệnh kiểm tra nào.

## Kết luận

**PLAN_FAIL**

### Blocker bắt buộc

1. **Chưa có approval đầy đủ cho React Native core.** Ticket yêu cầu nếu dependency chưa được ticket `00` approval thì phải dừng ở `needs-info` (`05-mobile-readonly-client.md:31-32`). Ticket `00` chỉ ghi approval cụ thể cho `@maplibre/maplibre-react-native@11.4.0` cùng license/command (`00-agent-preflight-permissions-infra.md:148-150` và `:175`); không có React Native core (`react`, `react-native`), version, license, command cài và test/toolchain package approval. Chính plan cũng thừa nhận “RN core chưa duyệt” (`plan.md:9-13`, `:68-71`) nhưng lại kết luận `PLAN_READY` (`plan.md:183-185`). Đây là mâu thuẫn trực tiếp với AC-12, không được scaffold/cài hoặc dùng mock pass trước khi Research/Planner chốt approval batch.
2. **Plan đưa file ra ngoài whitelist.** `mobile/.env.example` được liệt kê tại `plan.md:27`, trong khi ticket cấm `.env.*` tại `05-mobile-readonly-client.md:9-12`; `.env.example` khớp glob cấm này. Cần loại file đó khỏi plan và giữ injection qua `mobile/src/config.ts`/runtime override mà không tạo file env.
3. **HTTP contract bắt buộc chưa tồn tại và fallback hiện tại không đạt cùng AC.** Ticket yêu cầu `GET /api/map/layers`, ba `GET /api/related-info/*` và các endpoint alarm/dispatch/task đã được xác nhận (`05-mobile-readonly-client.md:65-69`). Route inventory không có các route này. Plan chọn tổng hợp client-side từ endpoint khác và derived Hotspot/Violation (`plan.md:159-166`), nhưng cách này chỉ tạo shape nội bộ của mobile, không cung cấp HTTP contract bắt buộc; `Hotspot` còn là domain object có lịch sử/thời hạn trong `CONTEXT.md:93-95`, không thể tự suy ra từ marker cluster rồi coi là tương đương. Vì whitelist chỉ cho `mobile/**`, `src/modules/**/contracts.ts` và `tests/**`, plan hiện không có đường thực thi để đạt AC-05/AC-07 theo hợp đồng. Cần Planner/Research chốt tối thiểu một trong các hướng: bổ sung owner/ticket hợp lệ cho backend contract, hoặc thay đổi AC/scope có quyết định được ghi nhận; không được coi adapter client-side là pass mặc định.
4. **Boundary `OrganizationUnit`/`Assignment` chưa được bảo đảm cho toàn bộ read surface.** Plan chỉ nêu lọc `OrganizationUnit` và mask ở map/residents/incidents, còn `Assignment` chỉ “hiển thị context ở Task” (`plan.md:116-118`). Điều này không đủ với `CONTEXT.md:43-45`: Assignment cấp quyền cho nhiệm vụ cụ thể và không cấp quyền xem toàn bộ dữ liệu của đơn vị. Nếu adapter tổng hợp list/detail từ endpoint mà không nêu rõ server-side scope theo OU + Assignment cho từng resource, mobile có thể hiển thị bản ghi cùng OU nhưng ngoài Assignment. Cần bổ sung contract matrix và test/owner xác nhận scope cho residents, businesses, inspections/violations, incidents, detail và deep-link; nếu backend hiện tại không cung cấp thì phải chặn plan.
5. **Verification đang trộn root-wide command vào ticket và TDD chưa phủ đủ các behavior mới.** Plan loại trừ full root test/e2e (`plan.md:179-181`) là đúng hướng, nhưng vẫn đưa `npm run prisma:generate` và `npm run typecheck` root-wide vào verification (`plan.md:180`), ngoài bước API contract test được ticket yêu cầu. Đồng thời TDD chỉ có red→green→refactor cho session/map/related-info/write guard/root adapter (`plan.md:168-175`), chưa có red test cho alarm/dispatch/task route-link flow, toàn bộ state matrix của các màn động, hoặc contract semantics Hotspot/Violation. Cần giới hạn verification vào ticket: mobile ci/typecheck/test/build/smoke và root API contract test phạm vi ticket; bỏ root-wide typecheck/generate hoặc chuyển sang gate sau toàn bộ ticket, và bổ sung test-first cases cho các AC còn lại.

## 1. Kiểm tra hướng thiết kế, CONTEXT/spec và whitelist

| Tiêu chí | Kết quả | Bằng chứng và đánh giá |
|---|---|---|
| Dùng backend/API chung, không tạo store nghiệp vụ mobile | **PASS về hướng, nhưng bị chặn bởi contract** | Plan chỉ định adapter GET, synthetic fixtures và view cache (`plan.md:145-166`, `:81`), không tạo DB/store nghiệp vụ. Phù hợp `spec.md:74-79`. Tuy nhiên adapter không thể thay thế các HTTP contract đang thiếu; xem blocker 3. |
| Không import server-only Next.js | **PASS về hướng** | Plan yêu cầu mobile tự định nghĩa type tương thích, không import `src/modules/**` server-only (`plan.md:51-54`, `:99`). Cần giữ nguyên ràng buộc này khi sửa plan. |
| Đúng file whitelist | **FAIL** | Phần lớn path nằm trong `mobile/**`, `tests/**` hoặc `src/modules/**/contracts.ts`, nhưng `mobile/.env.example` (`plan.md:27`) vi phạm `.env.*` bị cấm (`ticket:9-12`). |
| Không bịa backend endpoint | **PASS về ý định, FAIL về khả năng đạt AC** | Plan không tạo route backend và ghi rõ route thiếu (`plan.md:159-166`). Nhưng plan lại kết luận sẵn sàng dù fallback client-side không thực hiện được HTTP contract mà ticket bắt buộc; phải chuyển thành blocker thay vì `PLAN_READY`. |
| Không tạo store nghiệp vụ riêng | **PASS về hướng** | `plan.md:80-81` cấm store mới; fixtures/cache được giới hạn là view cache. |
| Không tự mở rộng PS-E3 thành E1 | **PASS về hướng** | Plan giới hạn alarm/dispatch/task ở Incident context, bỏ write E1-004/E1-007 và citizen intake (`plan.md:85-91`, `:116-118`), phù hợp `spec.md:200-205`. |

## 2. Ma trận map từng Acceptance Criteria trong plan

| AC | Kết quả Plan Check | Thay đổi plan đã map và vấn đề còn lại |
|---|---|---|
| AC-01 package/app RN độc lập, build, không server-only Next.js | **FAIL** | Có map tới package/config/native files và tự chứa (`plan.md:18-49`, `:99`), nhưng có file `.env.example` ngoài whitelist và RN core chưa approval; build path chưa đủ điều kiện. |
| AC-02 login/session/navigation/logout/session expiry | **PASS về độ phủ plan** | `SessionContext`, `LoginScreen`, `api/session`, `api/client`, `AppNavigator` và flow expiry được map (`plan.md:35-37`, `:85-86`, `:100`). Cần test sau khi blocker dependency được giải quyết. |
| AC-03 MapLibre RN/provider OSS/point-polygon/layer/location/OSM | **PASS về độ phủ plan, chưa đủ điều kiện triển khai** | `ProviderAdapter`, `MapScreen`, `mapApi`, OSM attribution, permission và point/polygon được map (`plan.md:38-39`, `:87`, `:101`). Bị chặn bởi approval RN core và native build boundary. |
| AC-04 offline basemap/cache, write ngoài read-only bị chặn | **PASS về độ phủ plan** | `States`, `WriteGuard`, offline cache và write block được nêu (`plan.md:46-47`, `:87`, `:91`, `:102`). Cần giữ rõ cache chỉ là view/basemap cache, không trở thành business store. |
| AC-05 RelatedInfo đủ 4 entity + search/list/detail/debounce/filter/layer/map sheet theo API contract | **FAIL — blocker** | UI/adapter đã được liệt kê (`plan.md:40-42`, `:103`), nhưng các HTTP route bắt buộc không tồn tại (`plan.md:159-166`) và derived Hotspot/Violation không tự chứng minh contract/domain semantics. Không thể pass trong whitelist hiện tại. |
| AC-06 sensitive field mask cùng policy web, API là security boundary | **FAIL — thiếu boundary cụ thể trong plan** | Plan đúng khi không tự reveal và dựa server mask (`plan.md:104`, `:117`), nhưng chưa chỉ ra contract/security test cho từng endpoint list/detail/derived view; `Assignment` cũng chưa được chứng minh là scope đọc. Cần bổ sung matrix server-side mask + OU/Assignment trước implementation. |
| AC-07 alarm/dispatch/task source-compatible, link map/RelatedInfo | **FAIL — blocker** | Ba screen và deep-link được map (`plan.md:43-45`, `:89`, `:105`), nhưng route/endpoint riêng không có và plan chỉ dựng từ incidents/notifications (`plan.md:159-165`). Chưa có contract/source mapping đủ để bảo đảm source-compatible. |
| AC-08 loading/empty/error-retry/permission-denied/masked/offline mọi màn động | **PASS về độ phủ plan** | `States.tsx` dùng chung và được áp cho Map/RelatedInfo/Alarm/Dispatch/Task (`plan.md:46`, `:90`, `:106`); screen-11/12/13 đều yêu cầu cùng state matrix. Cần thêm test-first coverage còn thiếu trong mục TDD. |
| AC-09 không CTA write E1-004/E1-007/citizen intake | **PASS về hướng** | Không tạo form, có `WriteGuard`, không có tab citizen/write (`plan.md:47`, `:86`, `:91`, `:107`). |
| AC-10 mobile/API contract tests và build check | **FAIL — chưa khả thi theo plan hiện tại** | Có danh sách test (`plan.md:56-63`, `:108`), nhưng RN core chưa approval; root contract test không kiểm tra các endpoint ticket yêu cầu và plan còn root-wide commands ngoài scope (`plan.md:177-181`). |
| AC-11 API base URL runtime/build, không secret file | **FAIL** | `config.ts` và runtime override đúng hướng (`plan.md:28-29`, `:109`), nhưng `mobile/.env.example` bị cấm. Loại file này khỏi plan. |
| AC-12 dependency RN/MapLibre/native SDK được ticket 00 approval | **FAIL — blocker trực tiếp** | MapLibre RN và Android prerequisites có evidence ở ticket `00`, nhưng RN core/version/license/command không có. Plan tự ghi “RN core chưa duyệt” (`plan.md:110`) nên phải dừng `needs-info`, không `PLAN_READY`. |

## 3. Kiểm tra độc lập Rubric bắt buộc

| Trục Rubric | Kết quả | Đối chiếu độc lập |
|---|---|---|
| Backend/API chung, không store nghiệp vụ tách khỏi CivicOS | **PASS về kiến trúc dự kiến** | `spec.md:74-79` yêu cầu mobile package riêng nhưng backend chung. Plan dùng GET adapter + view cache/fixtures, không DB/store (`plan.md:116`, `:80-81`). Việc thiếu endpoint vẫn là blocker AC riêng, không biến thành lý do tạo store mobile. |
| Tôn trọng `OrganizationUnit`, `Assignment`, masking | **FAIL** | `CONTEXT.md:43-45` nói Assignment chỉ cấp quyền cho nhiệm vụ cụ thể, không xem toàn bộ dữ liệu đơn vị. Plan mới nêu OU/mask và chỉ hiển thị Assignment ở Task (`plan.md:117`), chưa có quy tắc scope cho mỗi list/detail/derived resource. Cơ chế rủi ro: adapter tổng hợp nhiều endpoint có thể trả dữ liệu ngoài Assignment nếu server contract không lọc; client render `masked` không sửa được việc đã nhận dữ liệu quá quyền. |
| Không biến mobile PS-E3 thành phạm vi E1 ngoài spec | **PASS về hướng** | `spec.md:36-37`, `:74-79`, `:200-205` giới hạn mobile read-only, không citizen app/write mới. Plan chỉ giữ auth/map/RelatedInfo và Incident context, cấm CTA mutation (`plan.md:116-118`). Cần giữ nguyên khi sửa blocker endpoint. |

## 4. Kiểm tra Rubric khuyến nghị độc lập với screen baseline

| Trục | Kết quả dự kiến | Bằng chứng đối chiếu |
|---|---|---|
| Thiết kế/UI | **Đạt hướng tối thiểu 1/2, nhưng cần dependency/contract unblock** | Screen-11 yêu cầu auth, tabs, MapLibre, permission, layer, marker/polygon, offline và state matrix (`screen-11:9-20`); plan có các thành phần tương ứng (`plan.md:35-47`, `:87-90`). Screen-12 yêu cầu debounce, tabs/filter, map/list/detail sheet, mask, polygon/point, không write (`screen-12:9-21`); plan map đủ (`plan.md:40-42`, `:88`). Screen-13 yêu cầu alarm/dispatch/task, field/map context, masking/link RelatedInfo (`screen-13:9-20`); plan có screens/read-only/deep-link (`plan.md:43-46`, `:89`). |
| Thao tác/UX | **Đạt hướng tối thiểu 1/2, chưa thể chốt** | Plan nêu bottom sheet/list/detail, filter sheet, retry và tap target 44px (`plan.md:120-126`, `:90`). Chưa có test-first cases cho toàn bộ state/deep-link; route contract thiếu làm UX flow chưa kiểm chứng được. |
| Quy trình | **FAIL dưới ngưỡng hiện tại** | Plan tuyên bố giữ source-compatible (`plan.md:86`, `:126`) nhưng chưa có mapping route/endpoint cụ thể cho alarm/dispatch/task; route riêng không tồn tại (`plan.md:159-165`). Không được suy diễn source-compatible chỉ từ tên tab. |

## 5. Đối chiếu từng dòng `Các bước thực hiện`

| Bước ticket | Kết quả | Đối chiếu |
|---|---|---|
| Scaffold `mobile/`, env/API base URL không secret | **FAIL** | Có danh sách scaffold/config (`plan.md:18-30`, `:132`), nhưng `.env.example` vi phạm whitelist và dependency RN core chưa approval. |
| Implement auth/main/map theo screen-11 + MapLibre adapter | **PASS về kế hoạch, bị chặn triển khai** | Thành phần/flow được map (`plan.md:35-39`, `:87`, `:133`); cần unblock dependency và native command. |
| Implement RelatedInfo read-only theo screen-12 | **FAIL** | UI map đủ (`plan.md:40-42`, `:134`) nhưng API contract bắt buộc thiếu; fallback derived view chưa đạt AC-05. |
| Implement alarm/dispatch/task tối thiểu theo screen-13 | **FAIL** | Screen files có trong whitelist, nhưng endpoint/route flow chưa được ticket `00` xác nhận và plan chưa chứng minh source-compatible (`plan.md:43-45`, `:89`, `:135`, `:159-165`). |
| Synthetic fixtures + API contract tests Resident/Business/Hotspot/Violation/Incident | **FAIL** | Có fixtures/test files (`plan.md:56-63`, `:136`), nhưng root contract test chỉ kiểm tra residents/establishments/inspections/incidents/markers và còn ghi “không assert endpoint chưa tồn tại” (`plan.md:62`, `:159-166`); không phải contract test cho Hotspot/Violation HTTP surface bắt buộc. |
| Kiểm tra masking/offline/permission/session expiry trên device/emulator | **FAIL — chưa đủ TDD/contract plan** | Có kịch bản manual (`plan.md:137`, `:179-181`) nhưng chưa có test-first cases cho toàn bộ state/security scope; Android prerequisites có evidence ticket `00`, còn native project/build chưa tạo. |
| `npm --prefix mobile ci`/command được ticket 00 duyệt, rồi typecheck/test/build mobile | **FAIL** | Ticket `00` chỉ approval MapLibre install, không approval RN core/package batch. Plan còn giả định `gradle wrapper` (`plan.md:49`) trong khi evidence `00/tests.md:146-156`, `:339` ghi chưa có Gradle/Gradle wrapper; cần exact approved scaffold/build path. |
| API contract tests từ root, ghi giới hạn Android/JS trên Windows | **FAIL — scope cần sửa** | Plan có targeted test và ghi Android/JS (`plan.md:180-181`), nhưng thêm `npm run prisma:generate` và root-wide `npm run typecheck` (`plan.md:180`) ngoài verification scope ticket. Giữ root targeted contract test; chuyển full/root-wide gate sau toàn bộ ticket theo yêu cầu Planner. |

## 6. Kiểm tra TDD và verification boundary

- **TDD red→green→refactor: FAIL một phần, cần sửa plan.** Plan có thứ tự này cho 5 nhóm test (`plan.md:168-175`), nhưng chưa có red test cho alarm/dispatch/task link flow, permission/masking theo OU+Assignment trên từng resource, state matrix của mọi màn động, và contract semantics của Hotspot/Violation. Không đủ để coi toàn bộ AC được test-first.
- **Verification scope: FAIL một phần.** Việc loại `npm test` toàn bộ, `test:e2e`, `lint`, `format:check`, `build` root khỏi ticket là đúng (`plan.md:179-181`). Tuy nhiên `npm run prisma:generate` và `npm run typecheck` không được giới hạn theo ticket; cần bỏ/chuyển chúng. Root API contract test phạm vi ticket vẫn được giữ vì ticket yêu cầu.
- **Native boundary: chưa đủ để PASS.** Ticket `00` có Android/JDK/SDK/ADB approval/evidence, nhưng chưa có RN core approval và plan chưa chỉ ra cách tạo Gradle wrapper mà không phụ thuộc `gradle` hệ thống chưa có.

## 7. Hướng sửa plan tối thiểu

1. Chuyển kết luận từ `PLAN_READY` sang `needs-info`/`PLAN_FAIL`; xin approval đầy đủ cho React Native core và các package/tool cần thiết: package, version, license, reason, exact install/CI/build/test command.
2. Xóa `mobile/.env.example` khỏi file dự kiến; giữ API base URL qua runtime env/in-app override trong `mobile/src/config.ts`, không tạo bất kỳ `.env.*` nào.
3. Dừng implementation cho đến khi có quyết định contract/owner cho các route đang thiếu. Nếu vẫn giữ whitelist hiện tại, ghi rõ AC-05/AC-07 không thể đạt và không dùng adapter client-side/derived view để giả pass. Nếu mở backend ticket/scope, cập nhật dependency graph và exact contract trước khi Developer làm.
4. Bổ sung boundary matrix cho OrganizationUnit + Assignment + masking ở mọi list/detail/derived view, với test cases server-side; không chỉ hiển thị Assignment ở Task.
5. Bổ sung red→green→refactor cho alarm/dispatch/task, deep-link, toàn bộ state matrix và Hotspot/Violation contract; giữ synthetic fixtures chỉ cho test/dev, không dùng thay backend contract.
6. Giới hạn lệnh verification trong ticket: mobile dependency install đã approved, mobile typecheck/test/build/Android smoke và root API contract test phạm vi ticket; chuyển `prisma:generate`, root-wide typecheck và full root test/e2e sang gate sau khi toàn bộ ticket hoàn tất.

## Trục trặc gặp phải

- Không gặp trục trặc công cụ/hạ tầng cần tự xử lý trong vòng review này.
- Không có cập nhật mới cho `Lesson-learned.md`.
