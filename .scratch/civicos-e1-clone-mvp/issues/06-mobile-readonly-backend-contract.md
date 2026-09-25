# Backend owner — HTTP contract cho mobile read-only

- **Status:** done
- **Blocked by:** 01, 02, 03, 04
- **Loại:** feature
- **Gate hướng:** có
- **File được phép sửa:**
  - `src/modules/mobile-readonly/**`
  - `src/app/api/map/layers/route.ts`
  - `src/app/api/related-info/**`
  - `src/app/api/forces/alarms/**`
  - `src/app/api/forces/dispatches/**`
  - `src/app/api/forces/tasks/**`
  - `src/app/api/forces/tasksbydispatchid/route.ts` — alias source-compatible bắt buộc của AC-06
  - `src/modules/platform/map/**` chỉ để công bố/đọc layer contract đã có
  - `src/modules/identity/**` chỉ để dùng hoặc mở rộng seam session/OrganizationUnit/Assignment cần cho read authorization
  - `prisma/schema.prisma` và `prisma/migrations/**` chỉ khi schema hiện tại không thể đọc các resource/Assignment đã tồn tại
  - `tests/mobile-readonly/**`
  - `tests/**` chỉ khi cần sửa contract regression trực tiếp liên quan
- **File cấm sửa:**
  - `mobile/**`
  - `.env`, `.env.*`
  - `.brain/**` — ngoại trừ `.brain/evidence/06-mobile-readonly-backend-contract/**` theo role
  - `node_modules/**`
  - `**/secrets/**`
  - source repo bên ngoài

## Mô tả

Làm owner backend cho HTTP contract mà ticket `05-mobile-readonly-client` tiêu thụ. Contract phải là security boundary thật ở server: session → `OrganizationUnit` → resource `Assignment` → masking; không đạt bằng client-side filtering, client-derived adapter hoặc fixtures phía mobile.

## Acceptance Criteria (bắt buộc — chặn done, PASS 100%)

- [x] Given session hợp lệ thuộc một `OrganizationUnit`, When gọi `GET /api/map/layers`, Then response `200` có đúng shape `{ layers: [{ id, label, visibleByDefault, entityTypes }] }`, chỉ chứa layer được OU/quyền của session đọc; When session không có quyền đọc layer, Then response status là `403`.
- [x] Given các resource Resident/Business/Hotspot/Violation nằm trong hoặc ngoài scope, When gọi `GET /api/related-info/search` với `q`, `entityType`, một filter và `page=2&pageSize=20`, Then response `200` có `{ data, total, page: 2, pageSize: 20 }`, mỗi item có `entityType,id,title,status,address?,lat?,lng?,geometry?,updatedAt,masked`, và không có raw PII; item ngoài `OrganizationUnit` hoặc không có resource `Assignment` active không xuất hiện.
- [x] Given cùng bộ `q`/`entityType`/filters của search, When gọi `GET /api/related-info/counts`, Then response có đúng các key `ALL`, `RESIDENT`, `BUSINESS`, `HOTSPOT`, `VIOLATION`, mỗi value là số nguyên không âm và chỉ đếm resource trong boundary session.
- [x] Given detail `entityType=RESIDENT&id=<id>` thuộc boundary, When gọi `GET /api/related-info/RESIDENT/<id>`, Then response `200` có `{ entityType: "RESIDENT", data: <item> }` với item shape đã công bố, `masked` đúng trạng thái server masking và không có raw PII; Given detail ngoài OU/Assignment boundary, When gọi cùng endpoint, Then response status là `403`.
- [x] Given session có scope alarm/dispatch/task, When gọi các GET `/api/forces/alarms`, `/api/forces/dispatches`, `/api/forces/dispatches/:dispatchId`, `/api/forces/tasks`, `/api/forces/tasks/:taskId`, Then mỗi record trả được deep-link fields `incidentId` hoặc `resourceId` khi có, `coordinates` khi có, `relatedInfo` reference khi có và `assignmentSummary` khi có; list/detail không trả raw PII.
- [x] Given source mobile gọi `GET /api/forces/tasksbydispatchid?dispatchId=<id>`, When dispatch `d1` thuộc boundary, Then response `200` là list envelope `{ data, total, page, pageSize }`; When dispatch `d2` ngoài boundary, Then response `200` có `data: []`; When gọi `GET /api/forces/tasks/:taskId` với task ngoài boundary, Then response status là `403`.
- [x] Given record alarm/dispatch/task thuộc OU khác hoặc không có Assignment active phù hợp, When gọi list hoặc detail bằng session hiện tại, Then server không trả record đó; client-side filter/fixture không được là điều kiện duy nhất để đạt kết quả boundary.
- [x] Given endpoint contract được gọi bằng `POST`, `PUT`, `PATCH` hoặc `DELETE` thay vì GET, When request nhắm vào mobile read-only surface, Then không có write flow nào được thực thi hoặc thay đổi dữ liệu.
- [x] Given các contract test chạy với fixture backend có ít nhất một record in-scope, một record khác OU và một record thiếu Assignment, When chạy `tests/mobile-readonly/**`, Then test chứng minh response shape, `403`, filtering, masking, deep-link fields và không raw PII cho các endpoint trên.

## Rubric (mức độ đạt)

### Bắt buộc (chặn done — phải PASS 100%, Reviewer chấm như Acceptance Criteria)

- [x] `OrganizationUnit` + `Assignment` là server-enforced boundary cho list/detail/deep-link, nguồn: câu trả lời user ngày 2026-09-25 và `CONTEXT.md#43-assignment`.
- [x] Masking và không raw PII được enforce ở response backend, không phó mặc cho mobile, nguồn: câu trả lời user ngày 2026-09-25 và `spec.md#26-bảo-mật-và-tích-hợp`.
- [x] Contract giữ mobile read-only và không mở rộng thành public citizen app hoặc mobile write flow, nguồn: `spec.md#27-đích-triển-khai-mobile` và `spec.md#6-ngoài-phạm-vi-tranche-này`.

### Khuyến nghị (không chặn done, chỉ ghi nhận — trừ khi dưới ngưỡng tối thiểu)

| Trục | Mô tả kỳ vọng | Thang điểm | Ngưỡng tối thiểu |
|---|---|---|---|
| Thao tác/UX | Error status/body ổn định để mobile phân biệt `403`, empty, retry và masked | 0–2 | 1 |
| Quy trình | Endpoint/shape bám source mobile nhưng giữ domain boundary CivicOS | 0–2 | 1 |

## Các bước thực hiện

- [x] Công bố type/constant contract dùng chung trong `src/modules/mobile-readonly/`, chốt entity type, item envelope, filter/pagination, deep-link và masking fields.
- [x] Implement `GET /api/map/layers` với session + `OrganizationUnit` scope, response shape và `403` boundary.
- [x] Implement RelatedInfo search/counts/detail, nối query hiện có của Resident/Establishment/Incident/map projection và enforce `OrganizationUnit` + `Assignment` + masking.
- [x] Implement GET-only alarm/dispatch/task list/detail và `tasksbydispatchid` source-compatible alias với deep-link fields.
- [x] Bổ sung hoặc dùng lại authorization/query seam; nếu schema thiếu dữ liệu cần thiết thì chỉ thêm migration tối thiểu trong file scope đã nêu, không tạo client fallback.
- [x] Viết contract/integration/regression tests cho mọi AC, gồm in-scope, khác OU, thiếu Assignment, masked và không raw PII.
- [x] Chạy command verification do Planner/Tester giao; ghi rõ contract pass trước khi gỡ blocker cho ticket 05.

## Hợp đồng triển khai

### `GET /api/map/layers`

- Request scope lấy từ authenticated session; không tin `OrganizationUnit` do client tự chọn để mở rộng quyền.
- `200`: `{ "layers": [{ "id": "...", "label": "...", "visibleByDefault": true, "entityTypes": ["RESIDENT"] }] }`.
- `403`: session không có quyền đọc layer trong OU scope.

### RelatedInfo

- Entity types được hỗ trợ: `RESIDENT`, `BUSINESS`, `HOTSPOT`, `VIOLATION`.
- Search query: `q?`, `entityType?`, `status?`, `type?`, `category?`, `riskLevel?`, `tag?`, `dateFrom?`, `dateTo?`, `lat?`, `lng?`, `radiusKm?`, `geoLatMin?`, `geoLatMax?`, `geoLngMin?`, `geoLngMax?`, `page?`, `pageSize?`; mặc định `page=1`, `pageSize=20`, tối đa `100`.
- Search `200`: `{ data: RelatedInfoItem[], total: number, page: number, pageSize: number }`.
- `RelatedInfoItem`: `{ entityType, id, title, status, address?, lat?, lng?, geometry?, updatedAt, masked }`; sensitive/raw PII fields không được xuất hiện.
- Counts `200`: `{ ALL: number, RESIDENT: number, BUSINESS: number, HOTSPOT: number, VIOLATION: number }`.
- Detail `200`: `{ entityType, data: RelatedInfoItem }`; ngoài OU/Assignment scope: `403`.

### Alarm/dispatch/task

- Alarm: `GET /api/forces/alarms` → `{ alarms: AlarmReadItem[] }`.
- Dispatch: `GET /api/forces/dispatches?page&pageSize&q&status&incidentId` và `GET /api/forces/dispatches/:dispatchId` → `{ data: DispatchReadItem[], total, page, pageSize }` cho list; detail trả một `DispatchReadItem`.
- Task: `GET /api/forces/tasks?page&pageSize&status&dispatchId&incidentId`, `GET /api/forces/tasks/:taskId`, `GET /api/forces/tasksbydispatchid?dispatchId=...` → list envelope `{ data, total, page, pageSize }`.
- `AlarmReadItem`, `DispatchReadItem`, `TaskReadItem` đều có `id`, `title`/mô tả tương thích, `status`, `createdAt` và optional `incidentId`, `resourceId`, `coordinates: { lat, lng }`, `relatedInfo: { entityType, id }`, `assignmentSummary: { assignmentId, task, status }`.
- Server tự resolve recipient/OU/Assignment từ session; không nhận `phoneNumber` làm security input. Không tạo POST/PUT/PATCH/DELETE cho mobile surface.
- List query ngoài boundary trả `200` với `data: []`; detail ngoài boundary trả `403`.

### Quyết định mapping domain/backend (đã chốt 2026-09-25)

- `HOTSPOT`: chấp thuận expose read-only bằng projection/domain data đã tồn tại từ `Incident` + `ProjectionRecord` có `GeoPoint`/`GeoArea`, với identity ổn định và server `OrganizationUnit` + active `Assignment` boundary; không tạo model/seed/migration `Hotspot` mới.
- `VIOLATION`: chấp thuận expose từ `InspectionFinding` + `Inspection` + `Establishment`, gồm `result needs_action` và checklist/evidence metadata, với server boundary.
- `alarm`: chấp thuận read projection từ `Notification`/`Incident` có trạng thái cần chú ý, giữ `incidentId`/resource/deep-link, không raw PII.
- `dispatch`: chấp thuận read view từ active `Assignment` gắn `Incident`/resource với `assignmentSummary`/deep-link, không tạo dispatch aggregate mới.
- `task`: chấp thuận read view từ active `Assignment` + `SubjectManagementActivity`/Inspection schedule (hoặc nguồn user chỉ định), giữ dispatch/incident/resource/`assignmentSummary`, không tạo task aggregate mới.

### Quyết định boundary và masking (đã chốt 2026-09-25)

- Không có commander bypass cho mobile surface. Mọi record list/detail/deep-link, kể cả commander, phải có active `Assignment` phù hợp.
- Server phải allow-list/fail-closed để strip raw PII trước response; không dựa riêng vào fixture synthetic và không gửi raw PII để mobile tự che.

## Dependency cập nhật cho Planner

- **Plan status hiện tại:** `PLAN_FAIL` — chưa được tự chuyển ticket sang trạng thái triage khác.
- **Quyết định đã gỡ:** alias được whitelist đúng một path `src/app/api/forces/tasksbydispatchid/route.ts`; mapping `HOTSPOT`/`VIOLATION`/`alarm`/`dispatch`/`task`, Assignment boundary và masking được chấp thuận nguyên văn ngày `2026-09-25`.
- **Việc Planner cần làm trước khi gọi Developer:** cập nhật plan để phản ánh đúng các quyết định trên, loại bỏ commander bypass và masking dựa trên synthetic fixture; giữ mọi path ngoài whitelist bị cấm. Plan vẫn phải xử lý blocker TDD Red đã nêu trong Plan Check trước khi chuyển cho Developer.

## Đang chờ Research

Không còn quyết định nghiệp vụ chờ user. Contract được chốt theo câu trả lời user ngày 2026-09-25; mọi khác biệt implementation phải quay lại Planner/Research, không tự đổi AC.

## Trạng thái cuối

done

## Comments

- 2026-09-25 — Research: User chấp thuận tạo backend dependency ticket, contract map layers, RelatedInfo với detail ngoài scope `403`, alarm/dispatch/task read-only/deep-link tối thiểu và blocker của ticket 05. Ticket 05 chỉ được giao sau khi ticket này pass.
- 2026-09-25 — Research: User chốt whitelist alias đúng `src/app/api/forces/tasksbydispatchid/route.ts`; chấp thuận nguyên văn mapping `HOTSPOT`/`VIOLATION`/`alarm`/`dispatch`/`task`; xác nhận không có commander bypass và server allow-list/fail-closed strip raw PII trước response. Planner cập nhật plan dependency trước khi gọi Developer.
