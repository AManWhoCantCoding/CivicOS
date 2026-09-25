# Plan — 06-mobile-readonly-backend-contract

## 0. Bảng rủi ro / phạm vi (quyết định đã chốt 2026-09-25)

| Mục | Nội dung |
|---|---|
| Scope | Backend owner HTTP contract read-only cho ticket 05: `GET /api/map/layers`, RelatedInfo search/counts/detail (4 entity), alarm/dispatch/task GET-only + alias `GET /api/forces/tasksbydispatchid?dispatchId=...`. Security boundary server: session → OU → active Assignment → allow-list masking, không raw PII. Read-only GET-only; không write flow. |
| Rủi ro cao nhất | Không còn blocker whitelist hay blocker domain. Alias `src/app/api/forces/tasksbydispatchid/route.ts` đã được whitelist nguyên văn trong ticket (dòng 14). Mapping domain, boundary Assignment và masking đã được user chốt nguyên văn ngày 2026-09-25 (ticket mục Quyết định mapping + Quyết định boundary và masking). Rủi ro còn lại là kỹ thuật triển khai: giữ identity ổn định/hình học/trạng thái đúng mapping đã chốt và enforce allow-list fail-closed trên mọi response. |
| Dependency | Blocker khai báo: 01, 02, 03, 04 (auth/RBAC/OU/Assignment/projection). Tái sử dụng seam hiện có: `getCurrentUser`, `canRead`/`canViewSensitive` (chỉ capability/audit sau seam), `TASK_CAPABILITIES`/`TASK_ALLOWED_ROLES`/`isTaskCompatibleWithRoles`, `Subject/SubjectManagementRecord`, `Establishment`, `Inspection/InspectionFinding`, `Incident/IntakeReport`, `ProjectionRecord`, `Assignment`, public `platform/map` (`resolveMapPermission`, không import `MAP_VIEWER_ROLES` non-export). Seam mới duy nhất: `hasActiveAssignmentForRead`/`requireMobileReadAccess` (mọi role, kể cả commander). Không cài package mới, không helper trùng lặp. |
| Quyết định đã chốt (nguyên văn ticket, không giữ blocker cũ) | (1) Whitelist đúng `src/app/api/forces/tasksbydispatchid/route.ts` — alias source-compatible bắt buộc của AC-06. (2) `HOTSPOT` read-only từ projection/domain hiện có `Incident` + `ProjectionRecord` có GeoPoint/GeoArea, identity ổn định, server OU + active Assignment; không model/seed/migration Hotspot mới. (3) `VIOLATION` từ `InspectionFinding` + `Inspection` + `Establishment`, gồm result `needs_action` và checklist/evidence metadata; server boundary; không diễn giải thành kết luận pháp lý. (4) `alarm` read projection từ `Notification`/`Incident` cần chú ý, giữ incident/resource/deep-link, không raw PII. (5) `dispatch` read view từ active `Assignment` gắn Incident/resource với assignmentSummary/deep-link, không aggregate Dispatch mới. (6) `task` read view từ active Assignment + SubjectManagementActivity/Inspection schedule, giữ dispatch/incident/resource/assignmentSummary, không aggregate Task mới. (7) Mọi mobile record list/detail/deep-link, kể cả commander, đều bắt buộc active Assignment phù hợp; tuyệt đối không có commander bypass. (8) Server allow-list/fail-closed strip/omit raw PII trước response; omit `description` và mọi free text không chứng minh phi-PII; không gửi raw PII để client tự che. (9) Read-only GET-only; route alias path đã hợp lệ. |
| Blocker kết luận | Không còn B1/C1 pending. B1 cũ (alias ngoài whitelist) đã gỡ vì ticket đã whitelist đúng path. C1 cũ (chờ xác nhận mapping) đã gỡ vì user đã chốt mapping nguyên văn 2026-09-25. Không còn quyết định nghiệp vụ chờ Research (ticket mục Đang chờ Research). |
| Quan hệ ticket 05 | Ticket 05 (`mobile/**`, consumer) bị block bởi ticket 06 và chỉ được giao/unblock sau khi ticket 06 pass toàn bộ AC; plan này không chạm `mobile/**`, không sửa ticket 05. |
| Working tree | Tree đang bẩn từ ticket khác: Developer chỉ được tạo/sửa file trong whitelist ticket 06 (mục 2), không reset/xóa/chạm file ngoài whitelist. |
| Migration | Không plan migration. Mọi resource đọc từ schema hiện tại + `ProjectionRecord` + `Assignment`. `prisma/schema.prisma` / `prisma/migrations/**` không nằm trong danh sách file dự định sửa. |

---

## 1. Tóm tắt scope / rủi ro / dependency

- **Scope thực thi:** công bố contract dùng chung trong `src/modules/mobile-readonly/**`; implement 10 route GET mới (mục 2b, gồm alias đã whitelist); mở rộng additive duy nhất trong `src/modules/identity/**` (seam `hasActiveAssignmentForRead`/`requireMobileReadAccess` + task/capability mapping + aggregate-type mapping, không đổi semantics `evaluatePolicy`/`canRead` caller cũ); chỉ đọc public contract đã có trong `src/modules/platform/map/**` (không import `MAP_VIEWER_ROLES` non-export, không thêm catalog/hàm mới ở đó; catalog mới nếu cần nằm trong `src/modules/mobile-readonly/**`); viết tests mới duy nhất trong `tests/mobile-readonly/**`. Không sửa `.scratch`, source ngoài whitelist, `mobile/**`, `.env*`, `docs/**`, root config, `Lesson-learned.md`, `changes.md` (ngoài evidence plan này).
- **Rủi ro R1 — mapping đã chốt, rủi ro còn lại là kỹ thuật:** mapping HOTSPOT/VIOLATION/alarm/dispatch/task áp nguyên văn quyết định 2026-09-25 (chi tiết mục 4). Không tạo model/seed/migration mới cho Hotspot/Violation/Alarm/Dispatch/Task. Nếu một chi tiết kỹ thuật (ví dụ trường checklist/evidence metadata cụ thể, ngưỡng alarm, cardinality dispatch/task) không lấy được từ source hiện có thì ghi dependency kỹ thuật cụ thể trong implementation, không tự đổi AC và không diễn giải VIOLATION thành kết luận pháp lý.
- **Rủi ro R2 — boundary Assignment cho mọi role (seam mới, không dùng `canRead` làm gate):** tuyệt đối không có commander bypass trên mobile surface vì `evaluatePolicy` (`authorization.ts:128-138`) cho commander/superior commander đọc cùng OU không cần Assignment. `resolveMobileLayers` và mọi service (`searchRelatedInfo`, `countRelatedInfo`, `getRelatedInfoDetail`, `listAlarms`, `listDispatches`, `getDispatch`, `listTasks`, `getTask`, `listTasksByDispatchId`) đều gọi seam `hasActiveAssignmentForRead`/`requireMobileReadAccess` TRƯỚC `canRead` cho mọi role, kể cả commander. `canRead` sau đó chỉ cho capability/audit nếu cần.
- **Rủi ro R3 — raw PII fail-closed:** allow-list field contract phi-PII; strip/omit mọi key ngoài allow-list ở server trước response; omit `Incident.description` và mọi free text không chứng minh được phi-PII; không gọi `decryptSensitive` để đưa vào response; không giữ raw field chỉ vì fixture synthetic sạch; không gửi raw PII để client tự che.
- **Rủi ro R4 — cây bẩn:** working tree có thay đổi từ ticket khác; Developer kiểm tra `git status` phạm vi whitelist trước khi viết, không checkout/reset ngoài whitelist.
- **Dependency:** session/OU/Assignment (`src/modules/identity`), projection Resident/Establishment/Incident (`src/modules/residents`, `src/modules/inspections`, `src/modules/incidents`), `platform/map` (chỉ đọc permission/marker/masking đã có), `ProjectionRecord`/`Assignment` qua Prisma. Các ticket 01–04 là blocker khai báo.

---

## 2. Danh sách file chính xác dự định sửa/tạo (tất cả thuộc whitelist ticket 06)

### 2a. Module contract mới — `src/modules/mobile-readonly/**`

| File | Tạo/Sửa | Nội dung |
|---|---|---|
| `src/modules/mobile-readonly/contracts.ts` | Tạo | Type/constant dùng chung: `RelatedInfoEntityType` (`RESIDENT\|BUSINESS\|HOTSPOT\|VIOLATION`), `RelatedInfoItem` (đúng shape contract, `masked: boolean`, không có key PII), `RelatedInfoSearchEnvelope`, `RelatedInfoCounts` (đúng 5 key), `MapLayerItem`, `MapLayersEnvelope`, `AlarmReadItem`, `DispatchReadItem`, `TaskReadItem`, deep-link types (`coordinates`, `relatedInfo` ref, `assignmentSummary`), hằng pagination (`DEFAULT_PAGE=1`, `DEFAULT_PAGE_SIZE=20`, `MAX_PAGE_SIZE=100`), allow-list field response phi-PII (fail-closed). |
| `src/modules/mobile-readonly/layers.ts` | Tạo | Hàm `resolveMobileLayers(user)` gọi seam `hasActiveAssignmentForRead` cho mọi role (kể cả commander); suy dẫn layer catalog từ OU + role của session (chỉ dùng public `resolveMapPermission` qua `platform/map` ở chế độ đọc, không import `MAP_VIEWER_ROLES` non-export); catalog layer mới (nếu cần) đặt tại đây, không đặt trong `platform/map`. Không nhận OU từ client. |
| `src/modules/mobile-readonly/related-info.ts` | Tạo | Hàm `searchRelatedInfo(user, query)`, `countRelatedInfo(user, query)`, `getRelatedInfoDetail(user, entityType, id)` — mỗi hàm gọi seam `hasActiveAssignmentForRead`/`requireMobileReadAccess` TRƯỚC `canRead` cho mọi role; parse/validate toàn bộ query contract (q/entityType/status/type/category/riskLevel/tag/dateFrom/dateTo/lat/lng/radiusKm/geo bounds/page/pageSize); enforce OU + seam Assignment; masking allow-list tập trung (`stripRawPII`, omit `description`/free text). |
| `src/modules/mobile-readonly/forces.ts` | Tạo | Hàm `listAlarms(user)`, `listDispatches(user, query)`, `getDispatch(user, id)`, `listTasks(user, query)`, `getTask(user, id)`, `listTasksByDispatchId(user, dispatchId)`; mỗi hàm gọi seam `hasActiveAssignmentForRead`/`requireMobileReadAccess` TRƯỚC `canRead` cho mọi role; ráp deep-link fields; list ngoài boundary trả `[]`, detail ngoài boundary ném `FORBIDDEN`. |
| `src/modules/mobile-readonly/index.ts` | Tạo | Public surface duy nhất của module (re-export contract + service + mã lỗi `FORBIDDEN/UNAUTHENTICATED/INVALID_*`). |

### 2b. API routes mới — map / related-info / forces

| File | Tạo/Sửa | Phục vụ |
|---|---|---|
| `src/app/api/map/layers/route.ts` | Tạo | `GET /api/map/layers` duy nhất; 401 khi vô danh, 403 khi không quyền layer, 200 envelope `{ layers }`. Không export POST/PUT/PATCH/DELETE. |
| `src/app/api/related-info/search/route.ts` | Tạo | `GET /api/related-info/search` với toàn bộ query contract + pagination chuẩn. |
| `src/app/api/related-info/counts/route.ts` | Tạo | `GET /api/related-info/counts` nhận cùng filter (bỏ page/pageSize), trả đúng 5 key. |
| `src/app/api/related-info/[entityType]/[id]/route.ts` | Tạo | `GET /api/related-info/:entityType/:id` (upper-case `RESIDENT\|BUSINESS\|HOTSPOT\|VIOLATION` ở path); entityType lạ trả 400; ngoài boundary trả 403. |
| `src/app/api/forces/alarms/route.ts` | Tạo | `GET /api/forces/alarms` → `{ alarms }`. Không nhận `phoneNumber`. |
| `src/app/api/forces/dispatches/route.ts` | Tạo | `GET /api/forces/dispatches` (query page/pageSize/q/status/incidentId) → envelope list. |
| `src/app/api/forces/dispatches/[dispatchId]/route.ts` | Tạo | `GET /api/forces/dispatches/:dispatchId` → 1 item; ngoài boundary 403. |
| `src/app/api/forces/tasks/route.ts` | Tạo | `GET /api/forces/tasks` (query page/pageSize/status/dispatchId/incidentId) → envelope list. |
| `src/app/api/forces/tasks/[taskId]/route.ts` | Tạo | `GET /api/forces/tasks/:taskId` → 1 item; ngoài boundary 403. |
| `src/app/api/forces/tasksbydispatchid/route.ts` | Tạo (đã whitelist, không chờ duyệt) | Alias source-compatible `GET /api/forces/tasksbydispatchid?dispatchId=...` → envelope list; `dispatchId` thiếu trả 400; dispatch ngoài boundary trả `data: []`. File route mỏng, toàn bộ logic gọi `listTasksByDispatchId` trong `src/modules/mobile-readonly/forces.ts`. |

### 2c. Auth/query seam — chỉ `src/modules/identity/**` và đọc `src/modules/platform/map/**`

| File | Tạo/Sửa | Phạm vi sửa cho phép |
|---|---|---|
| `src/modules/identity/authorization.ts` | Sửa additive | Bổ sung đúng 1 seam mobile-specific `hasActiveAssignmentForRead(user, resource, client?) → Promise<boolean>` + `requireMobileReadAccess(user, resource, client?) → Promise<void>` (ném `FORBIDDEN` khi thiếu); query trực tiếp `Assignment` (`status='active'`, `assigneeUserId=user.id`, đúng `resourceType/resourceId`, đúng `organizationId`, task có capability `read` qua `TASK_CAPABILITIES`/`TASK_ALLOWED_ROLES`/`isTaskCompatibleWithRoles`); áp dụng cho mọi role kể cả commander, không nhánh bypass. Không đổi semantics `evaluatePolicy`/`canAccess`/`canRead` cho caller cũ. Mobile service gọi seam mới TRƯỚC `canRead` (dùng `canRead` sau đó chỉ cho capability/audit nếu cần). Bổ sung `resourceAggregateTypes` cho resourceType mobile còn thiếu (additive). |
| `src/modules/identity/contracts.ts` | Sửa additive | Bổ sung exact: task mobile vào `ASSIGNMENT_TASKS` + `TASK_CAPABILITIES` (ít nhất `read`) + `TASK_ALLOWED_ROLES` (dùng `BUSINESS_ROLES` hiện có, gồm mọi role mobile kể cả commander); check qua `isTaskCompatibleWithRoles` hiện có. Không đổi `ROLE_BASE_CAPABILITIES`, không thêm commander bypass. |
| `src/modules/platform/map/**` | Chỉ đọc / công bố public contract đã có | Chỉ dùng public export đã có: `resolveMapPermission`, `maskMapMarker`, `MAP_PROJECTION_SOURCE_AGGREGATES`, `OSM_ATTRIBUTION`/bounds. `MAP_VIEWER_ROLES` hiện là non-export (`src/modules/platform/map/index.ts:52`) nên KHÔNG import trực tiếp; mọi phân loại role/layer cho mobile đặt additive trong `src/modules/mobile-readonly/layers.ts` (thuộc whitelist), không copy âm thầm thành hằng trùng tên trong `platform/map`. Không thêm catalog/hàm mới tại `platform/map`. Không đổi behavior `/api/map/markers`, `/api/map/config`. |

### 2d. Schema/migration — không sửa

- `prisma/schema.prisma`, `prisma/migrations/**`: không tạo/sửa vì mapping đã chốt đọc từ bảng hiện tại (`Subject`, `SubjectManagementRecord`, `Establishment`, `Inspection`, `InspectionFinding`, `Incident`, `IntakeReport`, `Assignment`, `ProjectionRecord`, `EventRecord`, `Notification`).

### 2e. Tests mới — chỉ `tests/mobile-readonly/**`

| File | Tạo/Sửa | Phủ AC |
|---|---|---|
| `tests/mobile-readonly/fixtures.ts` | Tạo | Seed backend: OU `ou-a`/`ou-b`; user in-scope/khác OU/commander có và không Assignment/revoked Assignment; record in-scope + khác OU + thiếu Assignment cho 4 entity + forces; bản ghi masked/PII thô (synthetic, chỉ để assert masking fail-closed). Không dùng mobile fixture/client adapter. |
| `tests/mobile-readonly/helpers.ts` | Tạo | Helper gọi route GET trực tiếp, đọc JSON, assert shape/403/empty/masking/no-PII. |
| `tests/mobile-readonly/map-layers.contract.test.ts` | Tạo | AC-01. |
| `tests/mobile-readonly/related-info-search.contract.test.ts` | Tạo | AC-02. |
| `tests/mobile-readonly/related-info-counts.contract.test.ts` | Tạo | AC-03. |
| `tests/mobile-readonly/related-info-detail.contract.test.ts` | Tạo | AC-04. |
| `tests/mobile-readonly/forces-read.contract.test.ts` | Tạo | AC-05. |
| `tests/mobile-readonly/tasks-by-dispatch.contract.test.ts` | Tạo | AC-06. |
| `tests/mobile-readonly/boundary.regression.test.ts` | Tạo | AC-07. |
| `tests/mobile-readonly/read-only-guard.regression.test.ts` | Tạo | AC-08 (POST/PUT/PATCH/DELETE no-op). |
| `tests/mobile-readonly/contract-matrix.contract.test.ts` | Tạo | AC-09 (ma trận tổng hợp shape/403/filter/masking/no-PII/deep-link trên cùng seed). |

Không sửa `mobile/**`, `.env*`, `docs/**`, root config, `.brain/**` khác, `node_modules/**`, `**/secrets/**`, source repo ngoài. Không thêm `mobile/**`, `.env.*`, `docs/**`, root config vào whitelist.

---

## 3. Hàm / interface / type / constant / query seam sẽ đổi/tạo và cách tái sử dụng authorization hiện có

### 3a. Tạo mới trong `src/modules/mobile-readonly/`

- Types (trong `contracts.ts`): `RelatedInfoEntityType`, `RelatedInfoItem` (đúng shape contract, `masked: boolean`, allow-list phi-PII, không key PII, không `description`), `RelatedInfoSearchQuery`, `RelatedInfoSearchEnvelope`, `RelatedInfoCounts` (đúng 5 key), `MapLayerItem`, `MapLayersEnvelope`, `AlarmReadItem`/`DispatchReadItem`/`TaskReadItem` (gồm `id/title/status/createdAt` + optional `dispatchId/incidentId/resourceId/coordinates/relatedInfo/assignmentSummary`), `MobileReadError` (`UNAUTHENTICATED/FORBIDDEN/INVALID_*`).
- Hàm (trong `layers.ts` / `related-info.ts` / `forces.ts`): `resolveMobileLayers`, `parseRelatedInfoQuery` (chuẩn hóa page/pageSize, clamp 1..100, parse số/ngày/tọa độ/bounds, entityType upper-case), `searchRelatedInfo`, `countRelatedInfo`, `getRelatedInfoDetail`, `listAlarms`, `listDispatches`, `getDispatch`, `listTasks`, `getTask`, `listTasksByDispatchId`, `toRelatedInfoItem` (mapper từng entity → item + masking allow-list), `toForcesItem` (ráp deep-link), `stripRawPII` (allow-list filter áp cuối trước khi trả response; omit `description`/free text).
- Query seam tái sử dụng (không viết lại): `listSubjects/getSubjectDetail` (`residents/projection.ts`), `listEstablishments` (`inspections/projection.ts`), `listIncidents` (`incidents/projection.ts`), `readModels` (`eventing/read-model.ts`), `projectToMapMarkers` (`platform/map`), truy vấn Prisma trực tiếp `InspectionFinding`/`Assignment`/`Notification`/`EventRecord` với filter `organizationId` + `status: 'active'`.

### 3b. Mở rộng additive trong `src/modules/identity/**` (không đổi behavior caller cũ)

- `contracts.ts`: thêm task mobile vào `ASSIGNMENT_TASKS` + `TASK_CAPABILITIES` (ít nhất `read`) + `TASK_ALLOWED_ROLES` (dùng `BUSINESS_ROLES` hiện có, gồm mọi role kể cả commander); thêm `resident_followup` vào map để `findMatchingAssignment`/`isTaskCompatibleWithRoles` nhận diện Assignment resident. Không đổi `ROLE_BASE_CAPABILITIES`, không thêm commander bypass.
- `authorization.ts`: (i) thêm key còn thiếu vào `resourceAggregateTypes` để `resourceOrganizationId` resolve OU cho `Subject/SubjectManagementRecord/Establishment/Inspection/InspectionFinding`; (ii) bổ sung đúng 1 seam mobile-specific additive `hasActiveAssignmentForRead(user: IdentityUser, resource: ResourceRef, client?) → Promise<boolean>` — query trực tiếp `Assignment` (`status='active'`, `assigneeUserId=user.id`, đúng `resourceType/resourceId`, đúng `organizationId` khi có, task có capability `read` qua `TASK_CAPABILITIES`/`TASK_ALLOWED_ROLES`/`isTaskCompatibleWithRoles`); thiếu/revoked → `false`; áp dụng cho mọi role kể cả commander, không nhánh bypass — và `requireMobileReadAccess(...)` ném `FORBIDDEN` khi `false`. Không đổi semantics `evaluatePolicy`/`canAccess`/`canRead` cho caller cũ. Mọi service mobile gọi seam mới TRƯỚC `canRead` (bước 4 khung 4.0); `canRead` sau đó chỉ dùng cho capability/audit nếu cần, `canViewSensitive` quyết định `masked`. Fail-closed — thiếu role/capability, khác OU, thiếu/revoked Assignment, thiếu `organizationUnitId` → từ chối hoặc mask, không bao giờ trả PII thô.

### 3c. Đọc trong `src/modules/platform/map/**` (không thêm mới tại đây)

- Public export đã có `resolveMapPermission`, `maskMapMarker`, `MAP_PROJECTION_SOURCE_AGGREGATES`, `OSM_ATTRIBUTION`/bounds cho layer metadata. `MAP_VIEWER_ROLES` là non-export nên không import trực tiếp; catalog layer mới (nếu cần) nằm trong `src/modules/mobile-readonly/layers.ts`. Phân quyền đọc layer = `resolveMapPermission(session)` public + OU của session + seam `hasActiveAssignmentForRead` cho entity của layer (mọi role, kể cả commander).

---

## 4. Luồng server chi tiết session → OU → Assignment → query → masking → response

### 4.0. Khung chung mọi endpoint (áp dụng cho tất cả route mục 2b)

1. `getCurrentUser()` từ cookie session. Vô danh → `401 { error: 'UNAUTHENTICATED' }`.
2. Lấy `user.organizationUnitId`; thiếu OU → list trả envelope rỗng, detail/layer không quyền trả 403 theo contract (detail luôn 403, list trả empty để không lộ tồn tại).
3. Resolve capability nền từ `ROLE_BASE_CAPABILITIES[user.roles]`; role không có `read` → layer 403, list empty, detail 403.
4. Với từng resource ứng viên: gọi seam mới `hasActiveAssignmentForRead(user, { resourceType, resourceId, organizationId })` TRƯỚC — `false` (thiếu/revoked Assignment, sai OU/task) → list loại record, detail ném/l map `FORBIDDEN` (kể cả commander cùng OU không Assignment; `evaluatePolicy` dòng 128-138 có commander bypass nên KHÔNG được dùng làm gate ở đây và không bị đổi semantics cho caller cũ). Chỉ khi seam pass mới gọi `canRead` cho capability/audit nếu cần. Không có nhánh `commander cùng OU` không Assignment.
5. Query resource đã lọc OU ở tầng DB (`organizationId`/`assignedOrganizationId` bằng OU của session), sau đó lọc Assignment ở tầng ứng dụng bằng seam `hasActiveAssignmentForRead` từng item (fail-closed khi seam `false` hoặc `requireMobileReadAccess` ném `FORBIDDEN`).
6. Masking allow-list tập trung trước response: chỉ trả field contract phi-PII; `canView = await canViewSensitive(...)` quyết định `masked`; nếu false → `masked: true`, title/tên qua `maskDisplayName`/`maskMapMarker`, strip toàn bộ key ngoài allow-list (`sensitiveProfile`, `sensitiveIndex`, `sensitiveRef`, `sourceName`, `sourceContact`, `ownerName` thô, `licenseRef` thô nếu nhạy cảm, `description` và mọi free text không chứng minh phi-PII đều omit). Không gọi `decryptSensitive` để đưa vào response mobile (response luôn masked/omitted theo contract — mobile không có quyền unmask).
7. Trả response đúng envelope contract (mục 2a) + `recordAudit` cho lượt list/detail nhạy cảm theo pattern hiện có.

### 4.1. `GET /api/map/layers`

- Session → OU như 4.0. `resolveMobileLayers(user)` trong `src/modules/mobile-readonly/layers.ts`: với mỗi layer trong catalog (đặt tại đây, không đặt trong `platform/map`), kiểm tra public `resolveMapPermission({ id, roles }) === 'ok'` và seam `hasActiveAssignmentForRead(user, { resourceType, resourceId, organizationId })` với ít nhất 1 resource thuộc entityTypes của layer trong OU có active Assignment phù hợp — áp dụng cho mọi role, kể cả commander. Không đọc bất kỳ OU nào từ query/body. Không có nhánh commander không Assignment. Route `src/app/api/map/layers/route.ts` mỏng: parse → gọi `resolveMobileLayers` → map lỗi.
- Có ít nhất 1 layer đọc được → `200 { layers: [...] }` (mỗi item đúng `{ id, label, visibleByDefault, entityTypes }`). Không có quyền layer nào → `403 { error: 'FORBIDDEN' }`. Client filter/toggle layer chỉ là UX, không thay boundary.

### 4.2. RelatedInfo search / counts / detail (mapping đã chốt, không tự đổi AC)

- Parse query theo contract: `q? entityType? status? type? category? riskLevel? tag? dateFrom? dateTo? lat? lng? radiusKm? geoLatMin? geoLatMax? geoLngMin? geoLngMax? page?=1 pageSize?=20 clamp 100`. `entityType` sai tập → 400 (search/counts); detail path entityType sai → 400.
- Nguồn theo entity, sau lọc OU + seam `hasActiveAssignmentForRead` từng item cho mọi role (như 4.0; gọi trong `searchRelatedInfo`/`countRelatedInfo`/`getRelatedInfoDetail` thuộc `src/modules/mobile-readonly/related-info.ts`, KHÔNG gọi `canRead` làm gate):
  - `RESIDENT`: `Subject` + `SubjectManagementRecord` qua `listSubjects/getSubjectDetail` + `scopedRecords`; title = displayName đã mask; status từ record; address từ record metadata nếu có; lat/lng từ Subject; `updatedAt` từ record/subject.
  - `BUSINESS`: `Establishment` qua `listEstablishments` + `getEstablishment`; title = name; status/risk/type/category map từ `status/type/risk`; address/lat/lng trực tiếp; `ownerName` thô omit/mask.
  - `HOTSPOT`: read-only từ `Incident` + `ProjectionRecord` có `GeoPoint`/`GeoArea`, identity ổn định (id suy dẫn ổn định để search/counts/detail nhất quán), geometry từ GeoArea/bounds của query, status từ trạng thái nguồn; server OU + active Assignment boundary; không model/seed/migration Hotspot mới. Nếu chi tiết kỹ thuật (ô lưới/bán kính grouping exact) không lấy được từ source hiện có thì ghi dependency kỹ thuật cụ thể, không tự đổi AC.
  - `VIOLATION`: từ `InspectionFinding` (+ `Inspection` → `Establishment` để lấy OU/address/coords), gồm result `needs_action` và checklist/evidence metadata; title rút gọn phi-PII (omit free text chứa PII); status từ finding/result; category/severity map trực tiếp; `updatedAt` = createdAt của finding; server boundary; không diễn giải finding thành kết luận pháp lý.
- Search: áp `q` (match title/id/status/type, case-insensitive), filters phẳng, lọc không gian (radiusKm quanh lat/lng hoặc geo bounds), sắp xếp `updatedAt desc`, phân trang trên tập đã lọc boundary; trả `{ data, total, page, pageSize }`. Item ngoài OU/thiếu Assignment không bao giờ lọt vào `data`/`total`.
- Counts: cùng pipeline filter (bỏ page/pageSize), đếm trên tập đã lọc boundary; trả đúng `{ ALL, RESIDENT, BUSINESS, HOTSPOT, VIOLATION }` số nguyên ≥ 0; `ALL` = tổng 4 loại.
- Detail: resolve 1 bản ghi theo entityType+id từ nguồn tương ứng; gọi `requireMobileReadAccess` bên trong `getRelatedInfoDetail` — ngoài OU hoặc seam `false` (gồm commander thiếu Assignment) → `403`; trong boundary → `200 { entityType, data }` với item shape search + `masked` đúng trạng thái server, không raw PII. Route `src/app/api/related-info/[entityType]/[id]/route.ts` map `FORBIDDEN→403`.

### 4.3. Alarm / dispatch / task + alias (mapping đã chốt, không aggregate mới)

- `alarm`: read projection từ `Notification`/`Incident` có trạng thái cần chú ý, giữ `incidentId`/resource/deep-link, không raw PII; không nhận `phoneNumber` hay identity nào từ client; recipient/OU/scope resolve từ session.
- `dispatch`: read view từ active `Assignment` gắn `Incident`/resource với `assignmentSummary`/deep-link, không tạo dispatch aggregate mới; mỗi assignment/nhóm assignment là 1 dispatch view có id ổn định, ghi rõ trong contract file.
- `task`: read view từ active Assignment + `SubjectManagementActivity`/Inspection schedule, giữ dispatch/incident/resource/`assignmentSummary`, không tạo task aggregate mới.
- Mỗi hàm forces trong `src/modules/mobile-readonly/forces.ts` (`listAlarms`, `listDispatches`, `getDispatch`, `listTasks`, `getTask`, `listTasksByDispatchId`) gọi seam `hasActiveAssignmentForRead`/`requireMobileReadAccess` cho từng resource ứng viên TRƯỚC `canRead` (mọi role, kể cả commander); 6 route forces mục 2b (gồm alias) mỏng: parse query → gọi đúng 1 hàm forces → map lỗi `FORBIDDEN→403/UNAUTHENTICATED→401/INVALID_*→400`.
- Mỗi item ráp optional `incidentId/resourceId/coordinates{lat,lng}/relatedInfo{entityType,id}/assignmentSummary{assignmentId,task,status}` khi dữ liệu nguồn có; không raw PII (tên/contact người báo, PII subject, `description`/free text đều omit).
- List (`alarms`, `dispatches`, `tasks`, alias `tasksbydispatchid`): query page/pageSize/q/status/incidentId (+ `dispatchId` cho tasks và bắt buộc cho alias); ngoài boundary → `200` envelope rỗng (`alarms: []` cho alarms; `{ data: [], total: 0, page, pageSize }` cho còn lại). Detail (`dispatches/:id`, `tasks/:id`): ngoài boundary → `403`; trong boundary → 1 item.
- Alias `tasksbydispatchid?dispatchId=d1`: dispatch trong boundary → envelope list tasks con; dispatch ngoài boundary → `data: []`; thiếu `dispatchId` → 400.

### 4.4. Method guard GET-only (AC-08)

- Mọi route mới chỉ export `GET`; không export POST/PUT/PATCH/DELETE → Next.js trả 405 mặc định, không có write flow nào được thực thi. Regression test gửi 4 method với payload đổi status/title rồi assert dữ liệu trước/sau giữ nguyên (đọc lại qua GET).

---

## 5. Bảng map thay đổi ↔ Acceptance Criteria ↔ Rubric ↔ Các bước thực hiện

### 5a. Map tới từng dòng Acceptance Criteria (9 dòng)

| AC | File thay đổi | Cách đạt |
|---|---|---|
| AC-01 map layers shape + 403 | `mobile-readonly/contracts.ts` (layer types + allow-list), `mobile-readonly/layers.ts` (catalog + `resolveMobileLayers` gọi seam `hasActiveAssignmentForRead` mọi role), `api/map/layers/route.ts`, `identity/authorization.ts` (seam mới) + `identity/contracts.ts` (task mapping, không bypass), `tests/mobile-readonly/map-layers.contract.test.ts` + fixtures/helpers | 200 đúng `{ layers:[{id,label,visibleByDefault,entityTypes}] }` lọc theo OU + public `resolveMapPermission` + seam Assignment (kể cả commander; commander cùng OU thiếu Assignment → layer ẩn/hết layer → 403); không quyền → 403; không nhận OU client. `platform/map` chỉ đọc public export đã có. |
| AC-02 search + pagination + shape + no-PII + boundary filter | `contracts.ts` (query/item/envelope types + allow-list, omit `description`), `related-info.ts` (`searchRelatedInfo` gọi seam `hasActiveAssignmentForRead` từng item mọi role, KHÔNG dùng `canRead` làm gate), `api/related-info/search/route.ts`, `identity/authorization.ts` (seam), `tests/.../related-info-search.contract.test.ts` | `page=2&pageSize=20` echo đúng; item đủ field, `masked` đúng; khác OU/thiếu Assignment bị loại khỏi `data`/`total` (gồm commander thiếu Assignment); không raw PII. |
| AC-03 counts 5 key | `related-info.ts` (`countRelatedInfo` gọi seam `hasActiveAssignmentForRead`), `api/related-info/counts/route.ts`, `tests/.../related-info-counts.contract.test.ts` | Đúng key `ALL/RESIDENT/BUSINESS/HOTSPOT/VIOLATION`, int ≥ 0, chỉ đếm item seam pass (commander thiếu Assignment không được cộng). |
| AC-04 detail shape + 403 | `related-info.ts` (`getRelatedInfoDetail` gọi `requireMobileReadAccess`), `api/related-info/[entityType]/[id]/route.ts` (map `FORBIDDEN→403`), `tests/.../related-info-detail.contract.test.ts` | In-scope → `200 { entityType, data }` masked đúng; ngoài OU/Assignment (kể cả commander thiếu Assignment) → 403; không raw PII. |
| AC-05 forces deep-link + no-PII | `contracts.ts` (read-item types), `forces.ts` (mỗi hàm gọi seam `hasActiveAssignmentForRead`/`requireMobileReadAccess` trước `canRead`), 5 route forces (alarms/dispatches×2/tasks×2), `tests/.../forces-read.contract.test.ts` | Item có `incidentId/resourceId/coordinates/relatedInfo/assignmentSummary` khi nguồn có; ngoài boundary không trả (kể cả commander); không raw PII, omit free text. |
| AC-06 alias tasksbydispatchid + 403 task detail | `forces.ts` (`listTasksByDispatchId` + `getTask` gọi seam), `api/forces/tasksbydispatchid/route.ts` (đã whitelist), `api/forces/tasks/[taskId]/route.ts`, `tests/.../tasks-by-dispatch.contract.test.ts` | d1 trong boundary → envelope list; d2 ngoài → `data: []`; task ngoài boundary → 403 (kể cả commander). |
| AC-07 server boundary, client filter không đủ | `related-info.ts` + `forces.ts` + `layers.ts` (gọi seam `hasActiveAssignmentForRead`/`requireMobileReadAccess` mọi role, không commander bypass; `canRead` chỉ capability/audit sau seam), `authorization.ts` (seam) /`contracts.ts` (aggregate/task mapping), `tests/.../boundary.regression.test.ts` | Commander cùng OU thiếu/revoked Assignment → list empty/loại record, detail 403; commander có active Assignment → được đọc; session OU khác/thiếu Assignment (mọi role) → list loại record, detail 403; đổi query/client filter không lộ record. |
| AC-08 GET-only, không write flow | Tất cả route mục 2b (chỉ export GET), `tests/.../read-only-guard.regression.test.ts` | POST/PUT/PATCH/DELETE không thực thi mutation; dữ liệu trước/sau giữ nguyên. |
| AC-09 suite `tests/mobile-readonly/**` chứng minh toàn bộ | `tests/mobile-readonly/fixtures.ts`, `helpers.ts`, `contract-matrix.contract.test.ts` + 8 file test trên | Seed in-scope/khác OU/thiếu Assignment/commander thiếu Assignment/masked/deep-link; assertions shape/403/filter/masking/no-PII; không phụ thuộc mobile fixture/adapter. |

### 5b. Map tới Rubric bắt buộc (3 dòng, chặn done)

| Rubric | File thay đổi | Cách đạt |
|---|---|---|
| OU + Assignment là server-enforced boundary cho list/detail/deep-link | `related-info.ts`, `forces.ts`, `layers.ts` (gọi seam `hasActiveAssignmentForRead`/`requireMobileReadAccess` mọi role), `identity/authorization.ts` (seam mới, không đổi `evaluatePolicy` caller cũ), `identity/contracts.ts` (task mapping additive), mọi route 2b, `boundary.regression.test.ts` | Mọi item đi qua seam Assignment bắt buộc + OU-DB-filter cho mọi role (kể cả commander; `evaluatePolicy`/`canRead` hiện tại có commander bypass nên không làm gate); `canRead` chỉ capability/audit sau seam; deep-link chỉ chứa id/ref/coordinates/summary. Không nhánh commander không Assignment. |
| Masking + không raw PII ở backend | `contracts.ts` (allow-list), `related-info.ts`/`forces.ts` (`stripRawPII` + `canViewSensitive` + omit `description`/free text), tái sử dụng `maskDisplayName`/`maskMapMarker`, `related-info-*.test.ts` + `boundary.regression.test.ts` (assert absence key PII) | Fail-closed masking ở server: chỉ trả field contract phi-PII, còn lại masked/omitted; mobile chỉ nhận masked/omitted, không raw PII để tự che. |
| Giữ mobile read-only, không thành citizen app/write flow | Tất cả route chỉ GET, không tạo POST/PUT/PATCH/DELETE, `read-only-guard.regression.test.ts`, không chạm `mobile/**` | Không endpoint ghi mới; không intake công khai; không CTA create/update phía backend. |

### 5c. Map tới từng dòng Các bước thực hiện (7 dòng)

| Bước | File thay đổi |
|---|---|
| Công bố type/constant contract trong `src/modules/mobile-readonly/` | `contracts.ts` + `index.ts` |
| Implement `GET /api/map/layers` + 403 | `layers.ts` (`resolveMobileLayers` gọi seam `hasActiveAssignmentForRead`), `api/map/layers/route.ts`, đọc public `platform/map/**` (`resolveMapPermission`, không import `MAP_VIEWER_ROLES` non-export), `identity/*` seam mới (không thêm catalog trong `platform/map`) |
| Implement RelatedInfo search/counts/detail + OU/Assignment/masking | `related-info.ts` (gọi seam `hasActiveAssignmentForRead`/`requireMobileReadAccess`), 3 route related-info, `identity/*` seam + task mapping, query seam Resident/Establishment/Incident hiện có theo mapping đã chốt |
| Implement GET-only alarm/dispatch/task + alias + deep-link | `forces.ts` (mỗi hàm gọi seam trước `canRead`), 6 route forces (gồm alias đã whitelist) theo mapping đã chốt |
| Bổ sung/dùng lại auth/query seam; migration tối thiểu nếu cần | `identity/authorization.ts` (seam `hasActiveAssignmentForRead`/`requireMobileReadAccess` + `resourceAggregateTypes`), `identity/contracts.ts` (exact `ASSIGNMENT_TASKS`/`TASK_CAPABILITIES`/`TASK_ALLOWED_ROLES`) (không migration — schema hiện tại đủ; xem 2d) |
| Viết contract/integration/regression tests mọi AC | 11 file `tests/mobile-readonly/**` (mục 2e) |
| Chạy command verification; ghi contract pass trước khi gỡ blocker 05 | Tester chạy command mục 8; Planner gỡ blocker 05 chỉ sau pass (Developer không chạy, không kết luận) |

Không có thay đổi nào ngoài 3 bảng trên. Không còn mục chờ Planner xác nhận domain/whitelist; mọi mapping/boundary/masking áp nguyên văn quyết định 2026-09-25.

---

## 6. Boundary matrix (OU khác / thiếu-revoked Assignment / 403-vs-empty / masking / no raw PII)

| Resource | List trong boundary | List OU khác | List thiếu/revoked Assignment (mọi role, kể cả commander) | Detail trong boundary | Detail OU khác / thiếu Assignment | Masking / PII |
|---|---|---|---|---|---|---|
| Map layers | 200 `{ layers:[...] }` lọc theo OU+role+Assignment | 200 với layers của OU mình (không thấy layer OU khác); không quyền layer nào → 403 | Coi như không quyền trên entity đó → layer ẩn; hết layer → 403 | N/A (không có detail) | N/A | label/entityTypes phi-PII; không trả OU nội bộ nhạy cảm |
| RelatedInfo search (4 entity) | 200 `{ data,total,page,pageSize }` chỉ item OU+Assignment | Item OU khác không xuất hiện (data/total loại) | Item revoked/thiếu Assignment không xuất hiện (mọi role) | — | — | `masked` đúng; allow-list strip, omit `description`/free text |
| RelatedInfo counts | 200 đủ 5 key, chỉ đếm boundary | Không cộng record OU khác | Không cộng record thiếu/revoked (mọi role) | — | — | Số nguyên ≥ 0, không lộ nội dung |
| RelatedInfo detail | — | — | — | 200 `{ entityType,data }` | 403 (cả 2 trường hợp, mọi role) | `masked` + không raw PII, omit free text |
| Alarms list | 200 `{ alarms:[...] }` trong boundary | 200 `{ alarms: [] }` | 200 `{ alarms: [] }` (mọi role) | — | — | deep-link id/ref/coordinates/summary; không PII |
| Dispatches list | 200 envelope có data | 200 `data: []` | 200 `data: []` (mọi role) | — | — | như trên |
| Dispatch detail | — | — | — | 200 1 item | 403 (cả 2 trường hợp, mọi role) | như trên |
| Tasks list | 200 envelope có data | 200 `data: []` | 200 `data: []` (mọi role) | — | — | như trên + `dispatchId` cha |
| Task detail | — | — | — | 200 1 item | 403 (cả 2 trường hợp, mọi role) | như trên |
| Alias tasksbydispatchid | d1 trong boundary → envelope có data | d2 ngoài boundary → `data: []` | dispatch revoked/thiếu Assignment → `data: []` (mọi role) | — | Task con ngoài boundary khi gọi detail → 403 | như tasks |
| Mọi surface với POST/PUT/PATCH/DELETE | — | — | — | 405, không mutation, dữ liệu trước/sau giữ nguyên | 405, không mutation | Không trả body nghiệp vụ |

Nguyên tắc phân biệt 403-vs-empty: list không bao giờ 403 vì lý do boundary của từng record (trả empty để không lộ tồn tại), detail luôn 403 khi ngoài boundary; 403 ở tầng surface (map layers) chỉ khi session không có quyền đọc layer nào (đã gồm điều kiện seam Assignment). Gate boundary là seam `hasActiveAssignmentForRead`/`requireMobileReadAccess` (mọi role, kể cả commander), KHÔNG phải `canRead`/`evaluatePolicy` hiện tại. Commander cùng OU thiếu/revoked Assignment → list empty/loại record, detail 403; commander có active Assignment phù hợp → được đọc như mọi role.

---

## 7. TDD red → green → refactor theo `tests/mobile-readonly/**` (tests chỉ ticket 06)

- **Red → Green → Refactor trong cùng một `/tdd` call:** Developer tạo file test trước code trong cùng call theo `/tdd` (test mô tả AC/boundary/masking trước, implementation tối thiểu sau, rồi refactor giữ cấu trúc). Developer không chạy test dưới bất kỳ hình thức nào (quy tắc role); Tester chạy targeted tests sau implementation (mục 8).
- **Red (test trước):** 9 file test mục 2e, mỗi file đúng 1 AC (AC-09 là ma trận tổng hợp). Fixture trong `fixtures.ts`: OU `ou-a` (in-scope) / `ou-b` (khác OU); user `u-in` (Assignment active), `u-cross` (thuộc `ou-b`), `u-noassign` (cùng `ou-a`, không Assignment), `u-commander-noassign` (commander cùng `ou-a`, không Assignment — seam `false` → list empty/detail 403), `u-commander-active` (commander cùng `ou-a`, có active Assignment phù hợp — seam pass → được đọc), `u-revoked` (Assignment đã revoke — seam `false`); record `r1/b1/h1/v1` in-scope, bản sao `r2/b2/h2/v2` ở `ou-b`, bản sao thiếu Assignment; alarm/dispatch/task `d1` (boundary) / `d2` (ngoài); bản ghi PII thô (`sensitiveProfile`, `sourceContact`, `ownerName`, `description`/free text) để assert omit/masking fail-closed. AC-07/`boundary.regression.test.ts` assert rõ 2 chiều commander: thiếu/revoked Assignment → list empty/detail 403, active Assignment → được đọc.
- **Green (code tối thiểu):** thứ tự `identity/contracts.ts` (task mapping) → `identity/authorization.ts` (seam `hasActiveAssignmentForRead`/`requireMobileReadAccess` + `resourceAggregateTypes`) → `contracts.ts` → `layers.ts` + route layers → `related-info.ts` + 3 route → `forces.ts` + 6 route (gồm alias đã whitelist).
- **Refactor (giữ cấu trúc):** gom parse/pagination/masking trùng lặp vào `contracts.ts`/`related-info.ts`; trích `stripRawPII` dùng chung forces + related-info; giữ route mỏng (parse → gọi service → map lỗi `FORBIDDEN→403/UNAUTHENTICATED→401/INVALID_*→400/NOT_FOUND→404`).
- **Mutation no-op (AC-08):** test snapshot GET trước → gửi POST/PUT/PATCH/DELETE payload đổi status/title → assert status 404/405 (không có handler ghi) + GET lại snapshot sau bằng trước.
- **Không tuyên bố runtime red evidence khi chưa chạy:** plan này không khẳng định test đã fail/pass ở runtime; việc chạy và xác nhận pass/fail do Tester đảm nhận ở bước sau bằng targeted tests mục 8. Không đưa full root/e2e/mobile test vào verification.
- **Cấm tuyệt đối:** không dùng `mobile/**` fixture/adapter, không seed PII thật (synthetic), không client-side filtering thay boundary, không `phoneNumber`/OU client-derived trong test hay implementation, không decrypt/raw sensitive vào response.

---

## 8. Verification chỉ trong ticket 06 (targeted, không full suite)

Tester (không phải Developer) chạy từng lệnh sau, mỗi lệnh độc lập, dừng ở lệnh fail đầu và báo Planner:

1. `npx vitest run tests/mobile-readonly/map-layers.contract.test.ts`
2. `npx vitest run tests/mobile-readonly/related-info-search.contract.test.ts`
3. `npx vitest run tests/mobile-readonly/related-info-counts.contract.test.ts`
4. `npx vitest run tests/mobile-readonly/related-info-detail.contract.test.ts`
5. `npx vitest run tests/mobile-readonly/forces-read.contract.test.ts`
6. `npx vitest run tests/mobile-readonly/tasks-by-dispatch.contract.test.ts`
7. `npx vitest run tests/mobile-readonly/boundary.regression.test.ts`
8. `npx vitest run tests/mobile-readonly/read-only-guard.regression.test.ts`
9. `npx vitest run tests/mobile-readonly/contract-matrix.contract.test.ts`
10. Gộp (tùy chọn, vẫn trong scope): `npx vitest run tests/mobile-readonly`

Không ghi/không chạy: full root `npm test`, e2e, lint, format-check, build, mobile build/test. `typecheck` (`npx tsc --noEmit`) quét toàn repo nên không thuộc verification ticket 06; chỉ chạy khi Planner yêu cầu rõ và không được diễn giải pass typecheck toàn repo thành pass contract ticket 06. Không migration nên không có verify migration/DB.

---

## 9. Kết luận

**`PLAN_READY`** — Blocker Plan Check (commander bypass qua `canRead`/`evaluatePolicy` dòng 128-138) đã được gỡ bằng seam mobile-specific `hasActiveAssignmentForRead`/`requireMobileReadAccess` trong `src/modules/identity/authorization.ts` (additive, không đổi semantics caller cũ), gọi TRƯỚC `canRead` trong `resolveMobileLayers`, toàn bộ RelatedInfo service và toàn bộ forces service + routes. Alias `src/app/api/forces/tasksbydispatchid/route.ts` đã whitelist nên không còn B1; mapping HOTSPOT/VIOLATION/alarm/dispatch/task, boundary Assignment mọi role và masking allow-list fail-closed giữ nguyên văn 2026-09-25 nên không còn C1. `MAP_VIEWER_ROLES` non-export được xử lý rõ: chỉ dùng public `resolveMapPermission` (+ `maskMapMarker`/bounds), catalog mobile đặt trong `mobile-readonly/layers.ts`. Mọi file trong whitelist; boundary matrix (commander thiếu/revoked → empty/403, active → được đọc), TDD fixture/test seam, verification targeted `tests/mobile-readonly/**` đầy đủ. Đủ điều kiện giao Developer trong đúng scope này.
