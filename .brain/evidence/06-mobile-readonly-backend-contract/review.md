# Final Checkpoint Review — 06-mobile-readonly-backend-contract

## Phạm vi và evidence được chọn

- Đã đọc lại toàn bộ ticket hiện hành tại `.scratch/civicos-e1-clone-mvp/issues/06-mobile-readonly-backend-contract.md`, cùng `plan.md`, `changes.md`, `tests.md`, review cũ, source/test hiện tại, `CONTEXT.md`, `spec.md` và ADR-0001 đến ADR-0004 từ `HEAD`.
- Chỉ dùng full evidence gần nhất được Planner chỉ định: `tests.md:426-439`, **Lần chạy 14**, `scope=full`, PASS đủ 7 bước; không dùng các run cũ.
- Evidence Tester: `tests.md:428` ghi `Tree: 7fd28522`.
- Ngoại lệ fingerprint được phép đã chạy: `node scripts/verify.mjs --tree` → `Tree: 7fd28522`; khớp run 14.
- Không chạy test, lint, typecheck, format-check, build hoặc e2e.

## Bảng 1 — Spec-to-Code Traceability Matrix: Acceptance Criteria

| ID yêu cầu | Mức độ đáp ứng | File & dòng code xử lý | Test Case chứng minh |
| :--- | :--- | :--- | :--- |
| AC-01 | **PASS** | `src/app/api/map/layers/route.ts:7-15` lấy user từ session, không nhận OU từ request và map lỗi; `src/modules/mobile-readonly/layers.ts:25-95` lấy resource IDs từ OU persisted, gọi `hasActiveAssignmentForRead`, rồi chỉ trả layer allow-list; `layers.ts:102-107` trả `403` khi không có layer. | `tests/mobile-readonly/contract-matrix.contract.test.ts:45-58` kiểm tra envelope/field shape và commander thiếu Assignment; `tests/mobile-readonly/related-info-detail.contract.test.ts:61-67` gọi route thật và xác nhận layer không có Assignment trả `403`. |
| AC-02 | **PASS** | `src/modules/mobile-readonly/contracts.ts:12-28` định nghĩa item shape/allow-list; `src/modules/mobile-readonly/related-info.ts:141-324` có pipeline riêng cho Resident, Business, Hotspot, Violation, lọc OU persisted và active Assignment; `related-info.ts:84-97` serialize chỉ field contract, bỏ metadata nội bộ/raw PII; `:403-425` trả envelope/pagination. | `tests/mobile-readonly/related-info-search.contract.test.ts:13-22` kiểm tra pagination/no-PII thật; `:23-59` kiểm tra **cả 4 entity**, mỗi entity có item in-scope, loại cross-OU và missing Assignment, không array rỗng; `:60-72` xác nhận Business chỉ còn đúng record boundary. Matrix `contract-matrix.contract.test.ts:60-115` lặp lại boundary/filter/no-PII cho 4 entity. |
| AC-03 | **PASS** | `src/modules/mobile-readonly/related-info.ts:327-400` dùng cùng tập `allCandidates` đã qua OU + Assignment + filter; `:428-442` tạo đúng `ALL`, `RESIDENT`, `BUSINESS`, `HOTSPOT`, `VIOLATION`. | `tests/mobile-readonly/related-info-counts.contract.test.ts:9-32` xác nhận đúng 5 key, exact counts `ALL=4` và từng entity > 0; `contract-matrix.contract.test.ts:117-138` xác nhận counts với cùng filter `q/entityType/status` của search và exact counts boundary. |
| AC-04 | **PASS** | `src/modules/mobile-readonly/related-info.ts:445-462` resolve detail từ candidate đã qua boundary và gọi `requireMobileReadAccess`; `src/app/api/related-info/[entityType]/[id]/route.ts:7-21` map response/error; `src/modules/mobile-readonly/http.ts:3-15` map `FORBIDDEN` thành HTTP `403`. | `tests/mobile-readonly/related-info-detail.contract.test.ts:13-24` kiểm tra detail Resident in-scope 200/envelope/no-PII; `:26-34` kiểm tra missing Assignment; `:36-59` gọi HTTP route, xác nhận in-scope `200`, missing Assignment và cross-OU `403`. |
| AC-05 | **PASS** | `src/modules/mobile-readonly/contracts.ts:69-90` định nghĩa `coordinates`, `relatedInfo`, `assignmentSummary`, `incidentId/resourceId`; `src/modules/mobile-readonly/forces.ts:64-95` ráp deep-link; `:149-280` resolve coordinates persisted cho Incident/Establishment/SubjectManagementRecord/InspectionFinding; `:283-326` alarm không phát hành notification title/body tự do; `:330-383` dùng cùng mapper cho list/detail. | `tests/mobile-readonly/forces-read.contract.test.ts:24-83` kiểm tra alarm/dispatch/task list và **dispatch/task detail in-scope** có coordinates, relatedInfo, assignmentSummary, no-PII; `:84-110` gọi detail route thật, xác nhận 200 và outside detail 403; `contract-matrix.contract.test.ts:147-205` kiểm tra alarm, list deep-link, cross-OU/missing Assignment/no-PII. |
| AC-06 | **PASS** | `src/app/api/forces/tasksbydispatchid/route.ts:7-19` là alias GET source-compatible, bắt buộc `dispatchId`; `src/modules/mobile-readonly/forces.ts:386-403` trả list envelope và lọc parent qua `activeAssignments`; `forces.ts:371-383` detail ngoài boundary ném `FORBIDDEN`. | `tests/mobile-readonly/tasks-by-dispatch.contract.test.ts:21-42` chứng minh dispatch in-scope có data và dispatch ngoài boundary trả `data: []`; `:44-49` chứng minh task detail ngoài boundary `FORBIDDEN`. |
| AC-07 | **PASS** | `src/modules/identity/authorization.ts:201-260` resolver OU persisted riêng cho Establishment, SubjectManagementRecord, InspectionFinding → Inspection → Establishment và Incident → EventRecord; `:366-388` bỏ qua OU caller truyền, so sánh OU resource thật với session rồi mới tìm active Assignment/read-compatible task. `src/modules/mobile-readonly/forces.ts:98-118,283-305` không truyền `user.organizationUnitId` làm `resource.organizationId`; mọi force item/detail đều đi qua seam. | Fixture thật có resource cross/missing và forged Assignment: `tests/mobile-readonly/fixtures.ts:388-433,445-466`; `forces-read.contract.test.ts:31-37,60-65,101-117` loại cross/missing ở alarm/list và 403 forged detail; matrix `:164-169,199-223` lặp boundary list/detail; `:242-246` xác nhận commander không Assignment bị loại/403. `boundary.regression.test.ts:9-28` xác nhận commander chỉ được đọc khi có active Assignment và revoked bị từ chối. |
| AC-08 | **PASS** | Tất cả mobile route trong scope chỉ export `GET`; ví dụ `src/app/api/map/layers/route.ts:7`, `src/app/api/forces/tasksbydispatchid/route.ts:7`, `src/app/api/related-info/search/route.ts:10`; không có POST/PUT/PATCH/DELETE handler để chạy write flow. | `tests/mobile-readonly/read-only-guard.regression.test.ts:15-33` kiểm tra toàn bộ 10 route có GET và không có 4 method mutation; matrix `contract-matrix.contract.test.ts:248-265` kiểm tra lại cùng surface. Vì không có mutation handler, request non-GET không thể đi vào write flow của ticket. |
| AC-09 | **PASS** | Toàn bộ contract implementation nằm trong module/route allow-list; các mapper và seam là server-side, không phụ thuộc mobile client/fixture adapter. | Fixture có resource in-scope, cross-OU, missing Assignment cho đủ 4 entity tại `fixtures.ts:123-370`, force cross/missing/forged tại `:371-466`. Matrix `contract-matrix.contract.test.ts:44-115` phủ 4 entity boundary + shape/no-PII; `:117-138` phủ counts; `:147-205` phủ alarm/list/deep-link/masking; `:207-246` phủ list-empty/detail-403, force detail 200/403 và commander; `:248-265` phủ GET-only. `forces-read.contract.test.ts:84-110` bổ sung HTTP detail 200/403. |

### Kết luận theo AC

- **PASS:** AC-01 đến AC-09.
- Không có FAIL hoặc THIẾU EVIDENCE cho Acceptance Criteria.

## Bảng 2 — Spec-to-Code Traceability Matrix: Rubric

| Trục Rubric | Mức độ đáp ứng | Đối chiếu với | Bằng chứng |
| :--- | :--- | :--- | :--- |
| `OrganizationUnit` + `Assignment` là server-enforced boundary | **PASS** | Ticket `:48`, `CONTEXT.md:43-45`, ADR-0004 | `authorization.ts:201-259,366-388` resolve OU từ persisted resource và bắt buộc active Assignment cho mọi role; `forces.ts:98-118,300-305` không dùng OU session làm resource OU; tests fixture/matrix/commander nêu tại AC-07 chứng minh cross-OU, forged Assignment, missing/revoked Assignment và commander. |
| Masking và không raw PII ở backend | **PASS** | Ticket `:49,103-106`, `spec.md:66-70`, ADR-0003/0004 | `related-info.ts:48-76,84-97` quyết định `masked` server-side và serialize allow-list; `forces.ts:307-324` dùng title cố định, chỉ trả deep-link/summary; fixture có PII synthetic tại `fixtures.ts:123-131,177-186,233-238,320-329,434-464`; `helpers.ts:13-25` và các test AC-02/04/05/09 xác nhận key raw PII không xuất hiện. |
| Mobile read-only, không public citizen app/write flow | **PASS** | Ticket `:50`, `spec.md:36-37,74-79,200-206`, ADR-0001/0002 | Patch ticket chỉ thêm `src/modules/mobile-readonly/**`, các route map/related-info/forces, additive identity và `tests/mobile-readonly/**`; route source chỉ có GET và test `read-only-guard` xác nhận không có handler ghi. Không có `mobile/**`, public intake hoặc aggregate write mới trong patch ticket. |
| Thao tác/UX (khuyến nghị) | **PASS — đạt ngưỡng tối thiểu** | Ticket `:54-57` | `src/modules/mobile-readonly/http.ts:3-15` ổn định hóa 401/403/400/404/500; list ngoài boundary dùng envelope rỗng ở `forces.ts:135-143,386-403`, detail dùng 403; tests alias/detail/matrix xác nhận empty-vs-403. |
| Quy trình (khuyến nghị) | **PASS — đạt ngưỡng tối thiểu** | Ticket `:57`, plan `:136-148`, `spec.md:36-37,74-79` | Endpoint và envelope bám contract mobile, alias đúng whitelist, deep-link giữ `resourceId/incidentId/coordinates/relatedInfo/assignmentSummary`; mapping domain đọc từ Assignment/Notification/Incident/InspectionFinding đã chốt, không tạo aggregate mobile mới; tests matrix/forces/alias chứng minh shape và boundary. |

## Đối chiếu 7 Steps

| Step | Mức độ | Bằng chứng |
|---|---|---|
| 1. Công bố type/constant contract | **PASS** | `src/modules/mobile-readonly/contracts.ts:3-119`, `index.ts:1-40`: 4 entity, item/envelope, pagination, masking/deep-link types. |
| 2. Implement `GET /api/map/layers` + 403 | **PASS** | `layers.ts:25-107`, route `map/layers/route.ts:7-15`; test matrix `:45-58` và direct HTTP 403 `related-info-detail.contract.test.ts:61-67`. |
| 3. RelatedInfo search/counts/detail + OU/Assignment/masking | **PASS** | `related-info.ts:141-462` có đủ 4 pipeline, cùng boundary-filtered set cho search/counts/detail; tests search/counts/detail/matrix phủ shape, filter, 403 và no-PII. |
| 4. GET-only alarm/dispatch/task + alias + deep-link | **PASS** | `forces.ts:98-404`, 6 route forces chỉ export GET; tests forces-read, alias và matrix phủ list/detail, deep-link, cross/missing boundary. |
| 5. Authorization/query seam, migration | **PASS** | `authorization.ts:201-259,366-400` là seam additive, `identity/contracts.ts:79-120` mapping `mobile_read`; không có schema/migration ticket-owned trong `changes.md:7-36,77-101`. |
| 6. Contract/integration/regression tests mọi AC | **PASS** | Có đủ 11 file `tests/mobile-readonly/**`; fixture persisted đủ 4 entity, force cross/missing/forged, masking và commander boundary; matrix không dùng array rỗng để giả đạt. |
| 7. Verification | **PASS** | Chỉ dùng `tests.md:426-439`, run 14 `scope=full` PASS đủ `prisma:generate`, `typecheck`, `lint`, `format:check`, `test`, `test:e2e`, `build`; Tree `7fd28522` khớp `node scripts/verify.mjs --tree`. |

## Whitelist, file cấm và direction

- **Whitelist:** ticket-owned source/test trong `changes.md:7-36,77-101` chỉ thuộc `src/modules/mobile-readonly/**`, `src/app/api/map/layers/**`, `src/app/api/related-info/**`, `src/app/api/forces/**`, additive `src/modules/identity/**` và `tests/mobile-readonly/**`; các path này phục vụ trực tiếp AC/Step/Rubric.
- **Không có code thừa ngoài Spec:** không thấy dòng code ticket-owned mới nào ngoài contract, routes, auth/query seam, mapper và regression tests đã map ở hai bảng trên.
- **File cấm:** không có ticket-owned change trong `mobile/**`, `.env*`, `**/secrets/**`, source repo ngoài, `prisma/schema.prisma` hoặc `prisma/migrations/**`; không có migration/schema trong `changes.md`.
- `Lesson-learned.md` không thuộc patch ticket; thay đổi đang tồn tại của file này là baseline ngoài ticket, không được gán cho patch 06.
- **Direction:** PASS. Không có commander bypass trên mobile; resource OU được resolve persisted trước Assignment; HOTSPOT/VIOLATION/alarm/dispatch/task dùng mapping đã chốt; backend allow-list masking; surface chỉ GET.

## Kết luận

- **`FINAL_PASS`** — AC-01…AC-09, cả 3 Rubric bắt buộc, 2 Rubric khuyến nghị và 7 Steps đều đạt theo source/test và full evidence run 14 trên đúng Tree hiện tại.
- Đủ điều kiện để Planner tick Acceptance Criteria và gọi round-trip check. Chưa commit.

## Trục trặc gặp phải

- Lệnh đọc diff toàn repo bị giới hạn hiển thị và tool lưu phần còn lại vào output file; đã chuyển sang đọc source/test theo đúng scope để hoàn tất suy ngược, không chạy lại kiểm tra. Đã cập nhật mục **Portable diff-output paging** trong `Lesson-learned.md` với biến thể round-trip.

Đường dẫn evidence: `.brain/evidence/06-mobile-readonly-backend-contract/review.md`.

## Round-trip check

### 1. Suy ngược trước khi mở ticket gốc

Chỉ từ diff hiện tại và các test PASS của ticket, yêu cầu nghiệp vụ được suy ngược là:

- Backend phải tạo một surface mobile chỉ đọc, lấy session làm nguồn tin cậy; mọi lớp map, RelatedInfo và force read phải đi qua boundary `OrganizationUnit` persisted của resource và `Assignment` active tương thích, áp dụng cho mọi role kể cả commander. Resource khác OU, thiếu Assignment hoặc Assignment đã revoke phải bị loại khỏi list; detail/deep-link ngoài boundary phải bị `403`.
- Server phải tự allow-list response và masking/no-PII, không gửi raw PII hoặc free text notification cho mobile tự lọc. RelatedInfo phải hỗ trợ đủ bốn entity `RESIDENT`, `BUSINESS`, `HOTSPOT`, `VIOLATION`, cùng envelope/pagination/counts/detail.
- Alarm, dispatch và task phải là read views có deep-link (`incidentId`/`resourceId`, `coordinates`, `relatedInfo`, `assignmentSummary` khi có), không tạo write flow hay aggregate mobile mới. Alias `tasksbydispatchid` phải trả envelope rỗng cho dispatch ngoài boundary, còn task detail ngoài boundary phải `403`.
- Toàn bộ HTTP surface phải GET-only; contract tests phải chứng minh shape, boundary OU + missing Assignment, commander có/không Assignment, masking/no-PII, list-empty/detail-403, deep-link và đủ bốn entity.

Evidence đã dùng ở bước suy ngược: source diff trong `src/modules/mobile-readonly/**`, các route mobile và `tests/mobile-readonly/**`; chỉ mục PASS đầy đủ gần nhất là `tests.md:426-439` (Lần chạy 14, `scope=full`, PASS, `Tree: 7fd28522`). Không dùng các run cũ.

### 2. Đối chiếu với ticket gốc hiện hành sau đó

| Yêu cầu ticket | Kết quả đối chiếu với phần suy ngược | Bằng chứng diff/test |
|---|---|---|
| AC-01 — map layers có shape đúng, scope OU/quyền và `403` khi không có quyền | **Khớp** | `layers.ts:10-23,25-107`; `tests/mobile-readonly/contract-matrix.contract.test.ts:45-58`; `related-info-detail.contract.test.ts:61-67`. |
| AC-02 — RelatedInfo search đủ filter/pagination, bốn entity, boundary và no-PII | **Khớp** | `related-info.ts:141-425`; `tests/mobile-readonly/related-info-search.contract.test.ts:13-72`; `contract-matrix.contract.test.ts:60-115`. |
| AC-03 — counts dùng cùng boundary/filter và đúng năm key | **Khớp** | `related-info.ts:327-442`; `related-info-counts.contract.test.ts:9-32`; `contract-matrix.contract.test.ts:117-138`. |
| AC-04 — detail envelope, masking/no-PII và ngoài boundary `403` | **Khớp** | `related-info.ts:445-462`; `related-info/[entityType]/[id]/route.ts:7-21`; `related-info-detail.contract.test.ts:13-59`. |
| AC-05 — alarm/dispatch/task list/detail có deep-link và không raw PII | **Khớp** | `forces.ts:64-95,149-326,329-383`; `forces-read.contract.test.ts:24-110`; `contract-matrix.contract.test.ts:147-205`. |
| AC-06 — alias task-by-dispatch, dispatch trong boundary có data, ngoài boundary empty, task detail ngoài boundary `403` | **Khớp** | `tasksbydispatchid/route.ts:7-19`; `forces.ts:386-403`; `tasks-by-dispatch.contract.test.ts:21-49`. |
| AC-07 — force record khác OU/thiếu Assignment không xuất hiện ở list/detail | **Khớp** | `authorization.ts:201-259,365-400`; fixture `fixtures.ts:371-466`; `forces-read.contract.test.ts:31-37,60-65,101-117`; matrix `:207-246`. |
| AC-08 — mobile read-only, không có write flow trên POST/PUT/PATCH/DELETE | **Khớp** | Các route mobile chỉ export `GET`; `read-only-guard.regression.test.ts:15-33`; matrix `contract-matrix.contract.test.ts:248-265`. |
| AC-09 — fixture backend và contract tests chứng minh shape, `403`, filtering, masking, deep-link, no-PII | **Khớp** | `fixtures.ts:123-466`; matrix `contract-matrix.contract.test.ts:44-265`; full PASS `tests.md:426-439`. |
| Rubric bắt buộc — OU + Assignment server-enforced; masking/no-PII ở backend; read-only, không public citizen/write flow | **Khớp** | `authorization.ts:201-259,365-400`; `related-info.ts:48-97`; `forces.ts:282-324`; toàn bộ route mobile GET-only. |

Không thấy lệch giữa yêu cầu suy ngược và ticket hiện hành; ticket chỉ diễn đạt chi tiết hơn các envelope/filter/mapping mà diff và test đã thực hiện.

### Kết luận Round-trip

- **`ROUND_TRIP_PASS`**
- Tree tester và fingerprint hiện tại khớp: `7fd28522`.
