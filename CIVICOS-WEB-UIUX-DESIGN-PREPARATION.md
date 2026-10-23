---
title: CivicOS Web — Chuẩn bị thiết kế UI/UX và kiểm kê route
status: proposed
owner: techlead
created: 2026-10-21
updated: 2026-10-21
sources:
  - AGENTS.md
  - docs/reset/requirements-baseline.md
  - docs/reset/decision-log.md
  - docs/UI-map.md
  - docs/civicos-unified-web-workspace/overview.md
  - docs/civicos-ui-design-system/overview.md
  - docs/civicos-uiux-alignment/overview.md
  - docs/land-module/overview.md
  - src/app/
  - src/components/
---

# CivicOS Web — Chuẩn bị thiết kế UI/UX và kiểm kê route

## 1. Phạm vi và trạng thái

Đây là kết quả phân tích tĩnh để PO review. Không sửa source/API/RBAC/schema/database/Docker; không tạo HTML, mockup, hình ảnh hay prototype; không chạy test, build, browser hoặc API live.

- Pilot 01 v2 gồm `/`, `/land/parcels`, `/land/parcels/[parcelId]`, shell/navigation/breadcrumb và responsive/accessibility.
- Kiểm kê bao gồm mọi Web route `page.tsx` hiện có, kể cả route ẩn khỏi navigation, public lookup và offline queue.
- Không thêm màn hình, KPI, chart, CRUD, export, tìm kiếm hoặc workflow ngoài source/contract.
- Trạng thái visual của Pilot vẫn **chưa được PO duyệt**. Giữ nguyên Light/Blue tokens hiện có.
- `CONFIRMED` dưới đây là xác nhận tĩnh route/component/gate từ source, không phải kết quả test. `PARTIAL` nghĩa là page có nhưng role/resource/API boundary chưa đầy đủ từ route source. Runtime/API live/visual/accessibility của mọi route đều **NOT_VERIFIED**.

**Thuật ngữ:** RBAC là phân quyền theo vai trò. Assignment là phân công theo một hồ sơ/nhiệm vụ/phạm vi cụ thể; không mặc nhiên cấp quyền xem toàn đơn vị. Role ID được ghi ở đây là giá trị trong source, không xác nhận mapping chính thức giữa chức danh nghiệp vụ và role.

### Số lượng route

Lệnh kiểm kê:

```text
find src/app -type f -name 'page.tsx' ! -path '*/api/*' | sort
WEB_PAGE_ROUTE_COUNT=28
API_ROUTE_COUNT=62
```

**Kết quả: 28 Web page routes**, khớp baseline 28; không có chênh lệch số lượng. 62 API route files không được tính là màn hình. `/land` và `/land/applications` là hai route nhưng cùng queue composition, nên số route không đồng nghĩa số thiết kế màn hình duy nhất.

## 2. Kiểm kê route: module → role → màn hình → chức năng

Các role/task lấy từ `src/components/navigation/feature-registry.ts:91-284`; quy tắc active Assignment/scope nằm tại `:296-334`. Bảy feature hiện bị loại khỏi navigation nhưng được giữ trong registry/direct-route model tại `:359-387`. Page tồn tại không có nghĩa API/runtime quyền truy cập đã được kiểm chứng.

### Workspace, đăng nhập và Identity

| Route | Role/task/Assignment hiện có | Mục đích, chức năng source, component và dữ liệu/API | Loại, reuse/điểm cần nghiên cứu | Trạng thái |
|---|---|---|---|---|
| `/` | Không có một role cố định; module/feature được chiếu theo session, role và Assignment. | Workspace chọn module/feature được phép; đọc `/api/auth/session` và `/api/identity/assignments`; Demo Center chỉ render khi điều kiện demo cho phép. `RoleWorkspace`, `useWorkspaceSession`. (`src/app/page.tsx:5-77`; `RoleWorkspace.tsx:56-60,141-238`; `useWorkspaceSession.ts:59-84`) | Workspace/launcher. Dùng chung navigation projection; `RoleWorkspace` dựng tab riêng thay vì `ModuleTabs`, nên cần soát keyboard behavior. Không có KPI. | CONFIRMED tĩnh |
| `/login` | Public; không cần role để mở form. | Đăng nhập nội bộ qua `POST /api/auth/session`; `LoginForm`. (`src/app/login/page.tsx:3-20`; `LoginForm.tsx:6-39`) | Form. Source đang điền sẵn development account và hiển thị ghi chú development; cần xử lý trước preview, không đưa thông tin đăng nhập vào hình. | CONFIRMED tĩnh |
| `/identity` | `identity-assignments`: `commander`, `superior_commander`, `duty_officer`, `field_officer`, `office_officer`, `village_officer`, `superior_officer`. Link Users tùy feature `identity-users`. | Màn hình điều hướng tới Assignment và Users; đọc current user và kiểm tra feature. (`src/app/identity/page.tsx:9-55,56-106`; registry `:187-210`) | Module landing. Shell đã có trên route; chuẩn hóa với workspace chính. | CONFIRMED tĩnh |
| `/assignments` | Bảy role của `identity-assignments`; registry không đòi task riêng cho feature này. | Xem/tạo/thu hồi Assignment; dùng `/api/identity/assignments`, `/api/identity/users`, `/api/identity/organization-units`; `AssignmentWorkspace`, `UserPicker`. (`src/app/assignments/page.tsx:10-34,56-83`; `AssignmentWorkspace.tsx:89-106,109-157,241-329`) | Workspace/list/form. Đây cũng là href của feature `incident-assignment`; không tạo hai màn hình cho cùng route. | CONFIRMED tĩnh |
| `/users` | `commander` theo `identity-users`; page kiểm tra feature trước khi đọc danh sách. | Đọc User/OrganizationUnit và tạo User; `CreateUserForm` gửi `POST /api/identity/users`. (`src/app/users/page.tsx:14-64`; `CreateUserForm.tsx:18-28`; registry `:203-210`) | List/form. Giữ role và phạm vi đơn vị hiện có. | CONFIRMED tĩnh |

### Incidents / Intake

| Route | Role/task/Assignment hiện có | Mục đích, chức năng source, component và dữ liệu/API | Loại, reuse/điểm cần nghiên cứu | Trạng thái |
|---|---|---|---|---|
| `/incidents` | `commander`/`superior_commander` bypass; `duty_officer`, `field_officer`, `office_officer`, `village_officer`, `superior_officer` cần Assignment active `incident_verification`. Feature hiện ẩn khỏi navigation. | Queue gọi `/api/incidents`; link tới detail, Assignment và Intake; `IncidentTable`. (`src/app/incidents/page.tsx:9-13,33-57`; `IncidentTable.tsx:52-67`; registry `:91-110`) | List/queue. Giữ status và phân biệt Incident với tin tiếp nhận. | CONFIRMED tĩnh |
| `/incidents/[incidentId]` | Registry gắn prefix với `incident-queue`, nhưng page detail không có gate feature riêng; quyền hồ sơ phải được xác minh ở API/resource. | `IncidentDetail` đọc `/api/incidents/:incidentId`; timeline, action theo trạng thái và Assignment. (`src/app/incidents/[incidentId]/page.tsx:3-9`; `IncidentDetail.tsx:152-166,175-203`) | Detail/workflow. Không thiết kế action theo role chưa xác nhận. | PARTIAL |
| `/intake` | Registry: `duty_officer`, `commander`, `superior_commander`, không task; feature ẩn khỏi navigation. Page không có `canEnterEntry` trong source đã kiểm tra. | Form và queue; form `POST /api/intake-reports`; `IntakeReportForm`, `IntakeReportQueue`. Tin báo chưa tự trở thành Incident. (`src/app/intake/page.tsx:7-45`; `IntakeReportForm.tsx:22-76`; registry `:112-119`) | Form + list. Giữ khác biệt IntakeReport/Incident và masking; không tự thiết kế reveal. | PARTIAL |
| `/intake/[reportId]` | Cùng feature Intake; page không có route gate tường minh. | `IntakeReportDetail` đọc/cập nhật hồ sơ và command chuyển thành Incident khi workflow hiện tại cho phép. (`src/app/intake/[reportId]/page.tsx:3-9`; `IntakeReportDetail.tsx:239-305`) | Detail/workflow. Quyền xem danh tính người tố giác chưa được suy diễn. | PARTIAL |

### Inspections

| Route | Role/task/Assignment hiện có | Mục đích, chức năng source, component và dữ liệu/API | Loại, reuse/điểm cần nghiên cứu | Trạng thái |
|---|---|---|---|---|
| `/inspections/establishments` | Page chấp nhận một trong ba feature: `commander`/`office_officer` cho catalogue/schedule; `commander` bypass hoặc `field_officer`/`office_officer` có `inspection_fieldwork` cho workqueue. Ba feature ẩn navigation. | Danh mục, tạo/sửa cơ sở, lịch kiểm tra; `EstablishmentForm`, `EstablishmentList`, `InspectionScheduleBoard`; dữ liệu establishment và inspection APIs. (`src/app/inspections/establishments/page.tsx:10-18,39-52`; registry `:129-154`) | Catalogue/form/schedule trên cùng route; không tách thành màn giả. | CONFIRMED tĩnh |
| `/inspections/establishments/[establishmentId]` | Catalogue registry là `commander`/`office_officer`; page detail không gọi gate feature rõ ràng. | `EstablishmentDetail` đọc `/api/establishments/:id`, sửa thông tin và xem lịch liên quan. (`src/app/inspections/establishments/[establishmentId]/page.tsx:3-10`; `EstablishmentDetail.tsx:17-71`) | Detail/form. Xác minh quyền resource trước khi chốt action theo role. | PARTIAL |
| `/inspections/[inspectionId]` | `inspection-workqueue`: `commander` bypass, `field_officer`/`office_officer` cần `inspection_fieldwork`; route cần dựa vào API/resource. | `InspectionDetail`, checklist, finding, recommendation, Evidence; checklist dùng offline-command queue; detail API `/api/inspections/:id`. (`src/app/inspections/[inspectionId]/page.tsx:3-9`; `InspectionDetail.tsx:89-134`; `ChecklistForm.tsx:42-125`; registry `:146-154`) | Detail/workflow/form. Offline của Inspection không phải cam kết offline chung. | PARTIAL |

### Vehicles / Field

| Route | Role/task/Assignment hiện có | Mục đích, chức năng source, component và dữ liệu/API | Loại, reuse/điểm cần nghiên cứu | Trạng thái |
|---|---|---|---|---|
| `/vehicles/registry` | `commander`, `superior_commander`. | Tạo/cập nhật registry, xem danh sách qua `/api/vehicles/registry`; `RegistryForm`, `RegistryList`. (`src/app/vehicles/registry/page.tsx:9-12,39-48`; `RegistryForm.tsx:52-95`; `RegistryList.tsx:19-55`; registry `:156-163`) | List/form. Giữ nguồn, lý do, thời hạn; không trình bày như camera thật. | CONFIRMED tĩnh |
| `/field/vehicles` | Có thể vào bằng `vehicle-observation` (`commander`, `superior_commander`, `field_officer`, `village_officer`) hoặc `vehicle-verification` (`field_officer` có `vehicle_verification`). | Ghi nhận và xem quan sát; `/api/vehicles/observations`, form/list và offline flow; `VehicleObservationWorkspace`. (`src/app/field/vehicles/page.tsx:8-15,24-43`; `VehicleObservationWorkspace.tsx:8-18`; registry `:165-185`) | Field workspace/form/list. Giữ vị trí và trạng thái đồng bộ thực tế. | CONFIRMED tĩnh |
| `/field/vehicles/[observationId]` | `vehicle-verification` có prefix detail; candidate `field_officer` với task. Page không có gate riêng; API/resource quyết định quyền. | `VehicleObservationDetail` đọc `/api/vehicles/observations/:id`; xác nhận match, xác minh/chuyển tiếp và Evidence. (`src/app/field/vehicles/[observationId]/page.tsx:3-10`; `VehicleObservationDetail.tsx:72-147`) | Detail/workflow. Role/task là candidate, chưa runtime verify. | PARTIAL |
| `/field/offline` | Không có feature ID riêng trong registry; route nằm trong Field shell. Direct URL eligibility chưa xác định được từ page. | `OfflineQueueStatus` đọc local queue, trạng thái mạng và thử đồng bộ. (`src/app/field/offline/page.tsx:3-18`; `OfflineQueueStatus.tsx:12-53`; `offline-queue.ts:26-42`) | Status/other. Giữ pending/failed/rejected/synced; không biến thành dashboard. | PARTIAL |

### Residents

| Route | Role/task/Assignment hiện có | Mục đích, chức năng source, component và dữ liệu/API | Loại, reuse/điểm cần nghiên cứu | Trạng thái |
|---|---|---|---|---|
| `/residents` | `commander`/`superior_commander` bypass; `duty_officer`, `field_officer`, `office_officer`, `village_officer` cần `resident_followup`. Feature ẩn navigation. | Queue `/api/residents`, lọc loại cư dân và mở hồ sơ; `ResidentList`. (`src/app/residents/page.tsx:9-13,25-42`; `ResidentList.tsx:37-70,127-142`; registry `:212-228`) | List. Kiểm tra bảng ở viewport nhỏ và masking. | CONFIRMED tĩnh |
| `/residents/[subjectId]` | Candidate theo `resident-list`/Assignment; page detail không có gate route tường minh. | `ResidentDetail` đọc `/api/residents/:subjectId`; hiển thị dữ liệu đã che khi cần, records và link báo cáo. (`src/app/residents/[subjectId]/page.tsx:5-25`; `ResidentDetail.tsx:26-58,102-124`) | Detail. Không thiết kế nút reveal từ suy luận. | PARTIAL |
| `/residents/[subjectId]/records/[recordId]` | Page không có gate rõ ràng; thao tác cần quyền/Assignment trên resource tại API. | `ActivityForm` POST `/api/residents/:subjectId/management-records/:recordId/activities`. (`src/app/residents/[subjectId]/records/[recordId]/page.tsx:5-28`; `ActivityForm.tsx:19-55`) | Form/workflow. Đây là Web write hiện có, không xác nhận Mobile write. | PARTIAL |
| `/residents/reports` | `commander`, `office_officer`; page kiểm tra `resident-reports` và OrganizationUnit. Feature ẩn navigation. | `ReportPreview` đọc, approve/send báo cáo tháng qua Residents report APIs. (`src/app/residents/reports/page.tsx:8-33`; `ReportPreview.tsx:15-80`; registry `:230-236`) | Report. Không thêm export/chart ngoài contract. | CONFIRMED tĩnh |

### Map, Land và public lookup

| Route | Role/task/Assignment hiện có | Mục đích, chức năng source, component và dữ liệu/API | Loại, reuse/điểm cần nghiên cứu | Trạng thái |
|---|---|---|---|---|
| `/map` | `commander`, `superior_commander`, `duty_officer`, `field_officer`, `office_officer`, `village_officer`, `superior_officer`; feature không khai báo task; page kiểm tra `map-workspace`. | `MapWorkspace`: `/api/map/config`, `/api/map/markers`; focus/discovery thửa qua `/api/map/land-parcels`. (`src/app/map/page.tsx:6-43`; `MapWorkspace.tsx:310-381,397-411,603-610`; registry `:238-253`) | Map/workspace. PS-E1-001 còn nêu lớp, time slider, export chưa được source tại route này xác nhận; không thêm lớp/KPI giả. | CONFIRMED route; provider/runtime NOT_VERIFIED |
| `/land` | `land_officer` có `land_review` hoặc `commune_leader` bypass; route kiểm tra queue feature. | `ApplicationQueue` trong Land shell, lọc queue hồ sơ và nhãn mô phỏng. (`src/app/land/page.tsx:9-17,19-50`; `ApplicationQueue.tsx:24-48`) | List/queue; cùng composition với `/land/applications`. | CONFIRMED composition |
| `/land/applications` | Như `/land`. | Cùng `ApplicationQueue`, feature gate và nhãn mô phỏng. (`src/app/land/applications/page.tsx:9-17,19-50`) | Alias giao diện; không thiết kế queue thứ hai. | CONFIRMED |
| `/land/applications/new` | `land_officer`; feature tạo không đòi task trong registry; page kiểm tra role và feature. | `ApplicationForm`; lấy party/parcel, tạo hồ sơ qua `/api/land/parties`, `/api/land/parcels`, `/api/land/applications`. (`src/app/land/applications/new/page.tsx:9-16,27-49`; `land-api.ts:18-21`) | Form. Giữ loại hồ sơ/nhãn mô phỏng; không thêm fields/workflow. | CONFIRMED tĩnh |
| `/land/applications/[applicationId]` | `land_officer` có `land_review` hoặc `commune_leader` bypass; page kiểm tra queue feature. | `ApplicationDetail`: chi tiết, timeline, action theo state/role; Land application APIs. (`src/app/land/applications/[applicationId]/page.tsx:10-20,23-52`; `ApplicationDetail.tsx:84-121`) | Detail/workflow. Không thêm trạng thái hoặc action. | CONFIRMED tĩnh |
| `/land/parcels` | `land_officer` có `land_review` hoặc `commune_leader` bypass; page kiểm tra `land-parcel-workspace`. | `ParcelList` và `PartyList`, filter/pagination; `/api/land/parcels`, `/api/land/parties`. (`src/app/land/parcels/page.tsx:9-14,18-57`; `ParcelList.tsx:35-90,147-200`; `land-api.ts:18-19,224-292`) | List/table. Giữ che định danh chủ thể. | CONFIRMED tĩnh |
| `/land/parcels/[parcelId]` | Như list; API vẫn quyết định quyền resource. | `ParcelDetail`: thửa, quyền sử dụng, ràng buộc, Evidence và map link; parcel/party APIs. Có loading/denied/not-found/offline/error. (`src/app/land/parcels/[parcelId]/page.tsx:10-20,23-40`; `ParcelDetail.tsx:33-59,149-223,264-453`) | Detail. Giữ masking, effective dates/version, read-only và map boundary; không chuyển thành CRUD. | CONFIRMED source; live access NOT_VERIFIED |
| `/public/land/lookup` | Public lookup; không thuộc feature menu nội bộ. | `PublicLandLookup` tra một applicationCode hoặc parcelCode qua `/api/public/land/lookup`; response gắn `simulated`. (`src/app/public/land/lookup/page.tsx:5-43`; `land-api.ts:18-21,123-221`) | Public lookup/form. Giữ copy mô phỏng/không có giá trị pháp lý; không mở polygon/PII. | CONFIRMED source; live NOT_VERIFIED |

## 3. Đối chiếu registry, navigation và tài liệu

- Feature registry có 7 module; eligibility yêu cầu role phù hợp, và nếu feature có task thì Assignment phải active/in-scope, trừ bypass role (`src/components/navigation/feature-registry.ts:3-10,46-89,296-334`).
- Bảy feature ẩn khỏi navigation nhưng vẫn giữ trong registry/direct-route model: Residents list/reports; Incident queue/intake; Inspection catalogue/schedule/workqueue (`feature-registry.ts:359-387`). Thiết kế route ẩn không có nghĩa thêm chúng vào menu.
- Các route đa feature/alias đã xác nhận: `/land` và `/land/applications` cùng queue; `/assignments` có hai feature ID; `/field/vehicles` dùng hai feature; `/inspections/establishments` phục vụ ba feature trên một page.
- `/intake`, một số detail route và `/field/offline` không có gate cụ thể tại page. Đây không phải kết luận lỗi bảo mật; cần xác minh API/resource boundary trước khi khẳng định quyền.
- `docs/UI-map.md:30-42` mô tả ba thẻ Incident/Inspection/Field ở trang chủ; source `/` hiện là workspace chiếu theo session/Assignment (`src/app/page.tsx:5-77`; `RoleWorkspace.tsx:56-60,141-238`). Đây là lệch discoverability/tài liệu.
- `docs/rbac/role-matrix.md` được AGENTS.md trỏ làm nguồn role × function nhưng không thấy file trong workspace. Registry role ID là bằng chứng hiện trạng UI, không phải ma trận RBAC chuẩn.
- Land có contract riêng về route, role, Assignment, masking, mock adapter và public lookup (`docs/land-module/overview.md:13-33,54-69`). Không gán FR của PS-E1 cho Land nếu baseline không định nghĩa.

## 4. Pilot 01 v2 — phương án preview trực quan (chưa tạo artifact)

Kiến trúc có workspace theo session/Assignment; `ModuleShell` đã có sidebar desktop, thu gọn, mobile drawer, breadcrumb, focus handling và offline notice (`RoleWorkspace.tsx:56-60,106-143`; `ModuleShell.tsx:315-425,428-478`). Root layout chỉ bọc HTML/body, nên shell chưa thành chrome toàn Web (`src/app/layout.tsx:9-17`).

Trình PO theo ba route hiện hữu:

1. **`/` — workspace sau đăng nhập:** module/feature chỉ hiện theo role/task/Assignment; có loading/error/empty/denied. Không thêm KPI/search tổng.
2. **`/land/parcels` — danh sách:** chỉ dùng filter hiện có (trạng thái, mã xã, mã thửa), pagination, danh sách thửa/chủ thể và link map.
3. **`/land/parcels/[parcelId]` — chi tiết:** tổng quan, quyền, ràng buộc, Evidence, masking, version/effective dates và link map; đây không phải màn chỉnh sửa.

Preview tương lai nên soát desktop/mobile, keyboard/focus, drawer, breadcrumb và loading/empty/denied/offline/error. NFR design system nêu viewport 1440×900 và 390×844 (`docs/civicos-ui-design-system/non-functional.md:21-28`). Lượt này không tạo mockup/screenshot/prototype.

`src/components/land/ParcelPilotUI.tsx` hiện có `ParcelPageHeader`, `ParcelFilterToolbar`, `ParcelTableViewport`, `ParcelStatusBadge`, `ParcelFeedback`, `ParcelSection` (`:10-33,35-76,79-133`); đây là component có sẵn trong working tree, không phải artifact do lượt này tạo.

## 5. Shared components và reuse/refactor matrix

| Nhóm | Hiện có | Phương án thiết kế, không đổi behavior |
|---|---|---|
| Authenticated Admin Shell | `ModuleShell`, `ModuleTabs`, `ModuleSidebar`, breadcrumb, desktop sidebar/mobile drawer, focus handling. | Tái sử dụng; thống nhất user context/topbar. SessionControls hiện ở một số page, không phải chrome toàn cục. Giữ lọc điều hướng theo session/role/task/Assignment. |
| Page headers/breadcrumb | Breadcrumb thuộc shell; headings tự dựng ở nhiều page; Land có `ParcelPageHeader`. | Refactor presentation khi được duyệt; giữ route, nhãn nghiệp vụ và action. |
| Tables/filters | Land có toolbar/table viewport cuộn + focus; Residents/Incidents dùng markup riêng. | Dùng primitive chung khi tương tác thật sự giống nhau; kiểm tra Residents ở viewport hẹp (`ResidentList.tsx:141-172`). |
| Detail sections/status badges | Land có `ParcelSection`, `ParcelStatusBadge`; domain khác có status mapping riêng. | Có thể dùng chung vỏ trình bày; giữ mapping và meaning theo domain. |
| Loading/empty/error/denied/offline | `ModuleStatus`, `AccessDenied`, `FeedbackMessage`, `ParcelFeedback`. | Tái sử dụng khi semantics trùng; không coi offline ở một module là hỗ trợ offline toàn hệ thống. |
| Map | `MapWorkspace`/MapLibre và projection riêng cho parcel. | Đặc thù; giữ allowlist, privacy, `simulated`, geometry/provider/offline rules. |
| Charts | Không xác minh được chart screen/component trong route kiểm kê. | Không thêm chart/KPI khi chưa có requirement và dữ liệu được xác nhận. |
| Responsive/accessibility | Shell xử lý drawer/focus; CSS có focus-visible/reduced motion; Land table có keyboard focus. | Root dựng tab riêng; soát chênh lệch so với keyboard arrows/Home/End và roving `tabIndex` của `ModuleTabs` (`RoleWorkspace.tsx:145-180`; `ModuleTabs.tsx:25-80`). |

## 6. Đặc thù phân hệ và vấn đề cần thiết kế

- **Incidents/Intake:** giữ khác biệt tin tiếp nhận và Incident, timeline, assignment, action theo state; không tự thiết kế reveal người tố giác.
- **Residents:** list/detail/report riêng, PII và Assignment; bảng cần soát ở màn hẹp. Không suy diễn Mobile write.
- **Inspections:** catalogue/schedule/workqueue chung route; checklist/finding/recommendation/Evidence và offline command là pattern đặc thù.
- **Vehicles:** Registry khác quan sát hiện trường; giữ GPS/vị trí, Evidence, queue offline hiện có. Không giả định LPR/camera đang kết nối.
- **Land:** parcel list/detail và application workflow riêng; giữ masking, effective dates/version, read-only states, map projection riêng và nhãn mô phỏng.
- **Map:** hiện có config/marker Incident–Inspection và Land focus/discovery; PS-E1-001 còn yêu cầu lớp/time slider/export chưa được source tại route này xác nhận (`docs/reset/requirements-baseline.md:27-37`). Đây là gap scope/capability, không phải lệnh tự tạo màn/lớp mới.
- **Identity/Assignment:** user/admin và assignment theo hồ sơ/task/OrganizationUnit; không diễn giải Assignment thành quyền xem mọi dữ liệu trong đơn vị.
- Date/time: `ParcelDetail.formatDateTime` hiện giữ nguyên chuỗi đầu vào (`ParcelDetail.tsx:28-31`); các màn hiển thị thời gian nên được soát timezone/format, không tự thay legal/business rule.

## 7. Kế hoạch nhân rộng sau khi PO duyệt Pilot

1. Duyệt Pilot ở `/`, parcel list, parcel detail trên desktop/mobile, keyboard và state thực tế; giữ nguyên tokens.
2. Chốt Shared Admin Shell và Design System bằng component hiện có trước khi thêm abstraction.
3. Chốt shared page-header/table/filter/detail/status/state primitives; rà blast radius theo callers.
4. Chia track sau khi shell ổn định: (a) Incidents/Intake và Residents, phối hợp privacy nhưng giữ workflow riêng; (b) Inspections và Vehicles/Field, chia sẻ feedback/Evidence/offline chỉ khi behavior tương đương; (c) Land applications/parcels; (d) Map riêng do geometry/provider/privacy boundary; (e) Identity/Assignment cross-cutting.
5. Cross-module regression và PO acceptance: route ẩn/alias, role/resource boundary, PII masking, timezone, responsive/accessibility và state. Chỉ song song khi shared foundation/file ownership đã phân ranh.

Shared shell/token/state có ảnh hưởng rộng tới các route dùng module layouts; page header/table theo phân hệ có blast radius hẹp hơn. Map và sensitive-data surfaces cần review riêng.

## 8. Phụ thuộc, rủi ro và quyết định PO

### Phụ thuộc/rủi ro

- Trạng thái visual approval trong docs không đồng nhất: ADR-0003 ghi token baseline approved nhưng B8 screen visual pending (`brain/adr/0003-shared-civicos-ui-design-tokens.md:3,30-34`); ADR-0004 còn PROPOSED (`brain/adr/0004-civicos-uiux-alignment.md:3`); overview `civicos-uiux-alignment` ghi B8 approved (`docs/civicos-uiux-alignment/overview.md:3-15`). Yêu cầu hiện tại của PO xác nhận Pilot visuals chưa duyệt; giữ nguyên trạng thái đó và không đổi tokens.
- `docs/rbac/role-matrix.md` không có trong workspace; một số detail pages không gate feature trực tiếp. Cần xác minh API/resource boundary, không kết luận bảo mật từ UI.
- Map provider/API live, browser rendering, responsive/accessibility thực tế đều **NOT_VERIFIED**.
- Working tree có nhiều thay đổi có sẵn trước lượt tạo tài liệu này, bao gồm Land routes/components. Không quy các thay đổi đó cho báo cáo này.

### Quyết định cần PO

1. Xác nhận tài liệu nào là nguồn sự thật cho B8 visual approval toàn Web. Light/Blue token vẫn được giữ nguyên; riêng Pilot v2 đang chờ review.
2. Cung cấp/khôi phục nguồn RBAC chuẩn `docs/rbac/role-matrix.md`, hoặc chỉ định owner ban hành nguồn này.
3. Chốt các mapping/quyền còn mở trước khi duyệt role-specific UI: D-01 (Trưởng CA xã), D-02 (đơn vị cấp trên), D-04 (quyền reveal danh tính người tố giác), D-19 (cán bộ thôn). D-05 cần nếu mở rộng public citizen app; D-22/D-34 nếu scope sau này có Mobile write/offline (`docs/reset/decision-log.md:27-48,58-61`).
4. Nếu muốn đổi quyết định ẩn bảy feature khỏi navigation nhưng giữ direct route, mở change riêng; báo cáo này giữ nguyên kiến trúc đó.

## 9. Ghi nhận kiểm tra

- `find src/app -type f -name 'page.tsx' ! -path '*/api/*' | sort`: inventory 28 page routes; API route files: 62.
- `git status --short --branch`: working tree đã dirty trước khi tạo tài liệu; có modified và untracked files. Không reset/stash/clean/restore, không sửa source.
- Không chạy test/typecheck/lint/build/browser/API live/DB/Docker vì phạm vi là phân tích và chuẩn bị thiết kế.
- Không thấy `.scratch` migration-adapter, domain-map hoặc active lessons trong workspace đã kiểm tra. Có phối hợp Research read-only; không có `repo-architect` hoặc `ui-ux` agent trong danh sách khả dụng.
- Tài liệu này ở trạng thái `proposed`; chưa phải visual approval hoặc PO acceptance.

**Kết luận:** 28 route page khớp baseline; đã lập source-level crosswalk và phương án review Pilot bằng mô tả, không tạo mockup. Dừng tại PO Design Review Gate; chưa coding, chưa chạy runtime verification.
