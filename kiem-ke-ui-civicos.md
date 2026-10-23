---
title: Kiểm kê tĩnh UI CivicOS
status: proposed
owner: research
created: 2026-10-18
updated: 2026-10-18
sources:
  - docs/UI-map.md
  - docs/reset/requirements-baseline.md
  - docs/reset/decision-log.md
  - src/app/
  - src/components/
  - mobile/src/
  - docs/design/
  - docs/adr/
---

# Báo cáo kiểm kê tĩnh UI CivicOS

**Phạm vi:** Web và Mobile hiện có; đối chiếu `docs/UI-map.md` với source. Kiểm tra tĩnh — không sửa production source, gọi Stitch, mở browser, chạy test, truy cập DB/Docker hay kiểm tra tích hợp đang chạy. File báo cáo này được tạo theo yêu cầu tiếp theo của người dùng sau khi hoàn tất kiểm kê.

> **Lưu ý phạm vi quan trọng:** Một truy vấn CodeGraph trả kèm các chuỗi thông tin đăng nhập demo/test trong source đăng nhập và fixture kiểm thử. Tôi không sử dụng, sao chép lại hay kiểm tra thêm chúng. Đây là sai lệch so với yêu cầu không đọc credential; vì vậy không thể xác nhận kiểm kê tuân thủ tuyệt đối điều kiện đó. Không truy cập `.env` hay kho credential.

## Tóm tắt

- **Web:** 28 route màn hình `page.tsx`, không tính API route.
- **Mobile:** 8 tab chính; có thêm đích chi tiết quan sát phương tiện và màn hình chi tiết lồng trong RelatedInfo.
- **Điều hướng Web:** registry khai báo 7 module và 17 feature; 7 feature bị loại khỏi workspace navigation. Loại khỏi menu **không** đồng nghĩa route hoặc khả năng backend đã bị xóa.
- `docs/UI-map.md` chưa khớp một số phần runtime: trang chủ hiện là workspace theo session/Assignment, không còn ba thẻ module mô tả trong tài liệu.
- Light/Blue token đã có ở Web và Mobile, nhưng trạng thái phê duyệt visual trong các tài liệu đang mâu thuẫn.
- PS-E1-004/005/007 có các luồng Web, nhưng không có các màn hình Mobile nghiệp vụ tương ứng trong 8 tab hiện tại. Đây là **khoảng trống capability**, không thể lấp bằng redesign UI-only.
- Không có visual validation, test hay kiểm tra provider/API đang chạy.

## 1. Cách đếm và quyền điều hướng

Các lệnh chỉ đọc dùng để đếm:

```text
find src/app -type f -name page.tsx ! -path '*/api/*' | wc -l  → 28
find src/app/api -type f -name route.ts | wc -l                → 62
find mobile/src/features -type f -name '*Screen.tsx' ! -path '*/__tests__/*' | wc -l → 8
grep -c "^  '" mobile/src/navigation/AppNavigator.tsx             → 8
```

Web có **7 module ID** trong registry (`src/components/navigation/feature-registry.ts:3-10,46-89`). Quyền điều hướng phụ thuộc role và, với feature tương ứng, task cùng Assignment đang hoạt động, người được giao và phạm vi tổ chức (`feature-registry.ts:296-334`).

Bảy feature bị loại khỏi navigation là `resident-list`, `resident-reports`, `incident-queue`, `incident-intake`, `inspection-catalogue`, `inspection-schedule`, `inspection-workqueue` (`feature-registry.ts:359-387`). Source ghi rõ đây là phép chiếu navigation; direct-route authorization không bị thay đổi tại seam này. Vì vậy, danh sách dưới đây bao gồm cả route bị ẩn khỏi menu.

## 2. Ma trận 28 route Web

Các màn hình nghiệp vụ thường dùng custom page markup kết hợp shared shell hoặc component riêng. Ma trận nêu luồng chính, không phải kết quả chạy tương tác.

| Route | Màn hình và tương tác chính | Quyền / tích hợp / trạng thái đáng lưu ý |
|---|---|---|
| `/` | Trung tâm workspace; chọn module được phép, mở feature, SessionControls; Demo Center chỉ mount khi điều kiện demo cho phép. (`src/app/page.tsx:42-77`, `RoleWorkspace.tsx:128-160,183-238`) | Session, Assignment, role; có trạng thái loading/error/offline/AccessDenied. |
| `/login` | Form đăng nhập nội bộ. (`src/app/login/page.tsx:3-20`) | Dùng auth API; chưa visual-validate. |
| `/incidents` | Hàng đợi Incident; link sang Assignment và Intake. (`src/app/incidents/page.tsx:9-57`) | `incident-queue`; layout Incident dùng `ModuleShell`. |
| `/incidents/:incidentId` | Chi tiết Incident, timeline và thao tác theo hồ sơ. (`src/app/incidents/[incidentId]/page.tsx:3-10`; `IncidentDetail.tsx:152-176`) | Page chuyển ID cho component; dữ liệu lấy từ API chi tiết. |
| `/intake` | Form tiếp nhận và hàng đợi IntakeReport. (`src/app/intake/page.tsx:7-45`) | Feature `incident-intake` bị ẩn khỏi navigation. Page không có route gate trong phần thân; form/queue nhận trạng thái từ API, gồm 403. Không kết luận đây là lỗi bảo mật. |
| `/intake/:reportId` | Chi tiết IntakeReport, xử lý/refresh; có thể tạo Incident từ tin báo. (`src/app/intake/[reportId]/page.tsx:3-10`; `IntakeReportDetail.tsx:239-317`) | API command; có trạng thái loading, denied/error và thông báo SLA. |
| `/inspections/establishments` | Danh mục cơ sở: tạo/sửa cơ sở, danh sách và lịch kiểm tra. (`src/app/inspections/establishments/page.tsx:10-54`) | Ba feature inspection tương ứng đều bị ẩn khỏi navigation; page có `canEnterEntry`. |
| `/inspections/establishments/:establishmentId` | Chi tiết cơ sở và form chỉnh sửa. (`src/app/inspections/establishments/[establishmentId]/page.tsx:3-11`; `EstablishmentDetail.tsx:17-71`) | Đọc API khi online; có lỗi, denied và offline state. |
| `/inspections/:inspectionId` | Chi tiết Inspection: checklist, finding, recommendation. (`src/app/inspections/[inspectionId]/page.tsx:3-9`; `ChecklistForm.tsx:42-113`) | Checklist/finding dùng offline-command queue; thao tác phụ thuộc trạng thái Inspection. |
| `/vehicles/registry` | Form và danh sách registry phương tiện. (`src/app/vehicles/registry/page.tsx:9-49`) | `vehicle-registry`; yêu cầu online để lưu registry (`RegistryForm.tsx:40-95`). |
| `/field/vehicles` | Form ghi nhận hiện trường và danh sách quan sát. (`src/app/field/vehicles/page.tsx:8-43`; `VehicleObservationWorkspace.tsx:8-18`) | Có quyền theo feature; list cần mạng, form hiện trường có offline flow. |
| `/field/vehicles/:observationId` | Chi tiết quan sát, xác nhận match, xác minh/chuyển đơn vị và evidence. (`VehicleObservationDetail.tsx:72-90,128-180`) | API quan sát; quyền thao tác được trả theo resource. |
| `/field/offline` | Trạng thái hàng đợi đồng bộ, retry. (`src/app/field/offline/page.tsx:1-18`; `OfflineQueueStatus.tsx:12-53`) | Trạng thái pending/syncing/failed/rejected/synced. |
| `/identity` | Identity landing; mở Assignment hoặc Quản lý User. (`src/app/identity/page.tsx:9-55,69-93`) | Có `canEnterEntry`; link users chỉ khi feature được phép. |
| `/users` | Danh sách và tạo User. (`src/app/users/page.tsx:14-65,77-100`; `CreateUserForm.tsx:17-74`) | `identity-users`; page gate theo feature. |
| `/assignments` | Quản lý và thu hồi Assignment. (`src/app/assignments/page.tsx:10-55,68-83`; `AssignmentWorkspace.tsx:89-106,241-329`) | `identity-assignments`; form chọn resource, task, người nhận và lý do thu hồi. |
| `/residents` | Danh sách cư dân đặc biệt và trạng thái SLA. (`src/app/residents/page.tsx:9-42`; `ResidentList.tsx:15-38,180-200`) | `resident-list` bị ẩn khỏi navigation; page gate theo feature. |
| `/residents/:subjectId` | Hồ sơ cư dân, hiển thị nội dung đã che khi cần; link record và báo cáo. (`ResidentDetail.tsx:26-58,102-142`) | API trả 403/denied; không suy quyền từ UI. |
| `/residents/:subjectId/records/:recordId` | Ghi hoạt động theo dõi trên Web. (`src/app/residents/[subjectId]/records/[recordId]/page.tsx:5-28`; `ActivityForm.tsx:5-55`) | POST activity; giao diện Web hiện có, không phải Mobile flow. |
| `/residents/reports` | Báo cáo tháng, approve/send và retry. (`src/app/residents/reports/page.tsx:8-33`; `ReportPreview.tsx:15-81`) | `resident-reports` bị ẩn khỏi navigation; cần đơn vị nhận khi gửi. |
| `/map` | Workspace bản đồ, focus thửa đất, discovery/filter. (`src/app/map/page.tsx:6-43`; `MapWorkspace.tsx:242-296,310-380`) | `map-workspace`; lấy provider từ `/api/map/config`, marker từ `/api/map/markers`. |
| `/land` | Hàng đợi hồ sơ biến động. (`src/app/land/page.tsx:9-50`) | Dùng `ApplicationQueue`; hiển thị nhãn mô phỏng. |
| `/land/parcels` | Danh sách thửa đất và chủ thể. (`src/app/land/parcels/page.tsx:8-61`) | `land-parcel-workspace`; định danh chủ thể được che theo copy của page. |
| `/land/parcels/:parcelId` | Chi tiết thửa đất và link quay danh sách. (`src/app/land/parcels/[parcelId]/page.tsx:9-42`) | Kiểm tra feature; dùng `ParcelDetail`. |
| `/land/applications` | Cùng hàng đợi và component `ApplicationQueue` với `/land`. (`src/app/land/applications/page.tsx:9-50`) | Hai route là alias giao diện thực tế, không phải hai queue riêng. |
| `/land/applications/new` | Tạo hồ sơ biến động. (`src/app/land/applications/new/page.tsx:9-50`) | Page buộc role `land_officer` và feature gate; dữ liệu được gắn nhãn mô phỏng. |
| `/land/applications/:applicationId` | Chi tiết hồ sơ và thao tác xử lý. (`src/app/land/applications/[applicationId]/page.tsx:10-54`) | Có trạng thái loading; giữ nhãn simulated; dùng API land. |
| `/public/land/lookup` | Tra cứu công khai theo mã hồ sơ/thửa. (`src/app/public/land/lookup/page.tsx:5-45`) | Không dùng internal shell; dữ liệu hiển thị ghi rõ mô phỏng, không có giá trị pháp lý. |

### Shell và trạng thái Web

Root layout chỉ bọc HTML, body và CSS; shell được gắn theo một số layout/page, không phải global navigation bắt buộc (`src/app/layout.tsx:9-17`). Incident, Inspection, Vehicles, Field, Map và một số trang Identity/Land dùng `ModuleShell`; `/intake` và `/residents` có page header riêng. ModuleShell có sidebar/drawer, focus handling, trạng thái phiên/Assignment và thông báo offline (`ModuleShell.tsx:112-178,180-247,250-312`).

Trang chủ hiện là workspace có module tabs và feature list theo scope; không phải ba thẻ tĩnh (`RoleWorkspace.tsx:47-60,141-238`). Demo Center nằm trong workspace nhưng chỉ mount sau khi session/Assignment đạt điều kiện và khi demo mode không bị tắt (`RoleWorkspace.tsx:106-143,234-238`).

## 3. Ma trận Mobile

8 tab khai báo trong `mobile/src/navigation/AppNavigator.tsx:29-38`; cùng số lượng file `*Screen.tsx` trong `mobile/src/features/`.

| Tab / surface | Màn hình, luồng chính |
|---|---|
| `Map` | Map, marker/layer, mở RelatedInfo và focus thửa đất; parcel polygon không được render khi offline (`MapScreen.tsx:76-118`). |
| `RelatedInfo` | Tìm kiếm, lọc loại/trạng thái, phân trang và mở detail; detail là view lồng trong screen, không phải tab thứ chín (`RelatedInfoScreen.tsx:35-79`; `RelatedInfoDetail.tsx:16`). |
| `Alarms` | Danh sách và chọn alarm; có loading/empty/error/forbidden/masked/offline (`AlarmScreen.tsx:16-62`). |
| `Dispatches` | Danh sách/chi tiết và link theo resource; đọc từ API force (`DispatchScreen.tsx:25-60`). |
| `Tasks` | Danh sách/chi tiết nhiệm vụ, cùng nhóm trạng thái với Dispatches (`TaskScreen.tsx:25-60`). |
| `Incident` | Incident summary chỉ đọc, có link bản đồ (`IncidentScreen.tsx:72-109`). |
| `Land` | Tra cứu và tóm tắt hồ sơ/thửa, timeline, link bản đồ (`LandScreen.tsx:182-219`). |
| `Settings` | Hiển thị API runtime URL; không phải màn hình quản lý cấu hình nghiệp vụ (`SettingsScreen.tsx:5-39`). |
| Đích nội bộ `VehicleObservationDetail` | Mở từ deep link; chỉ đọc, có back và mở bản đồ (`AppNavigator.tsx:230-250`; mobile detail `:70-177`). |
| Auth screen | `AppNavigator` import `LoginScreen` (`AppNavigator.tsx:3-5`); không tính là tab. |

Mobile dùng shared token/state module với các trạng thái loading, empty, ready, warning, stale, error, forbidden, masked, offline và simulated (`mobile/src/components/States.tsx:9-56,58-82`). Điều đó không đồng nghĩa Mobile có capability nghiệp vụ giống Web.

## 4. Đối chiếu, bất nhất và phân biệt loại khoảng trống

### UI map và runtime

- `docs/UI-map.md:30-42` mô tả trang chủ có ba thẻ Incident/Inspection/Field. Runtime hiện là RoleWorkspace lấy module/feature từ session, role và Assignment (`src/app/page.tsx:42-77`; `RoleWorkspace.tsx:56-60,141-230`).
- Tài liệu mô tả navigation như một trải nghiệm thống nhất; source có các route tự dựng page header riêng, còn shell chỉ phủ một số khu vực.
- `/land` và `/land/applications` cùng render `ApplicationQueue`; nên khi lên screen set cần xác định một mẫu queue, hai entry route (`src/app/land/page.tsx:4,43-47`; `src/app/land/applications/page.tsx:4-5,43-47`).
- Seven feature bị ẩn khỏi navigation là quyết định điều hướng, không phải bằng chứng backend/capability thiếu (`feature-registry.ts:359-387`).

### Bản đồ

Yêu cầu baseline PS-E1-001 mô tả nhiều lớp như Camera, Điểm nóng, Lực lượng, Cơ sở KD, đối tượng; đồng thời có time slider và export (`docs/reset/requirements-baseline.md:27-37`). Runtime marker API hiện chỉ khai báo aggregate nguồn `Incident` và `Inspection` (`src/modules/platform/map/index.ts:47-50`); thửa đất dùng projection riêng, đánh dấu `simulated` (`parcel-map-projection.ts:58-82`). Vì thế:

- Lớp, filter, time slider, export hay tích hợp ngoài baseline **không được xem là đã có chỉ vì tài liệu yêu cầu**.
- Đây là GAP nghiệp vụ/tích hợp cần quyết định riêng, không phải tác vụ redesign để tự thêm.
- Source khai báo provider OSS TileServer GL và `official: false`; runtime/provider thực tế không được kiểm tra (`src/modules/platform/map/index.ts:5-10,78-110`).

### Giao diện và token

Web đã có Light/Blue token, spacing, radius, semantic colors, focus ring và control baseline (`src/app/globals.css:3-39`). Mobile có bộ giá trị tương ứng (`mobile/src/components/States.tsx:9-56`). Tuy vậy, nhiều screen dùng markup/style cục bộ; public land lookup còn dùng màu teal và hex riêng (`src/app/public/land/lookup/page.tsx:7-34`). Package manifests không khai báo UI component library tổng quát; hiện nền tảng chủ yếu là React, Tailwind, custom components và MapLibre (`package.json:49-71`; `mobile/package.json:12-26`).

### Khoảng trống capability, không phải UI

PS-E1-004/005/007 có các surface Web hiện hữu, nhưng Mobile hiện không có tab Residents, Intake/field verification hoặc Inspection. Mobile có RelatedInfo và Incident summary chỉ đọc. Do đó:

- Redesign những màn hình đang tồn tại có thể chuẩn hóa presentation.
- Tạo workflow Mobile mới, thêm quyền, ghi dữ liệu hay đổi offline policy cần contract/decision nghiệp vụ riêng; không nên “làm cho đủ UI” trong work item này.
- Cũng không nên kết luận rằng capability bị thiếu chỉ vì một feature không xuất hiện trong menu.

### RBAC evidence

`AGENTS.md` trỏ tới `docs/rbac/role-matrix.md` làm nguồn role × chức năng, nhưng đường dẫn này không tồn tại trong workspace khi kiểm tra. Vì vậy, kiểm kê quyền ở trên phản ánh registry và page gate hiện có, **không phải xác nhận đầy đủ RBAC theo tài liệu chuẩn**. Một số route detail để API trả 403/denied; đây là quan sát UI, không phải kết luận về bảo mật backend.

## 5. AS-IS → GAP → TO-BE đề xuất

| Concern | AS-IS | GAP | TO-BE nếu PO duyệt |
|---|---|---|---|
| Information architecture | 7 module ID; workspace và shell có navigation theo role/Assignment; một số feature bị ẩn khỏi menu. | `UI-map.md` còn mô tả ba thẻ cũ và không đại diện đầy đủ các entry route/detail/offline. | Một route/screen inventory chuẩn; giữ eligibility, các route ẩn và destination hiện tại. Cập nhật UI map sau khi chốt. |
| Shared visual language | Web CSS token và Mobile baseline đã có; có shared shell/state primitives. | Public lookup và nhiều component còn style cục bộ; shell không phủ mọi route. | Chuẩn hóa tokens/primitives, page header, surface, field, status, error/empty/access-denied và responsive/focus pattern. Không đổi business behavior. |
| Screen coverage | 28 Web routes và 8 Mobile tabs; nhiều detail là state nội bộ. | Dễ bỏ sót hidden routes, public/login, Demo Center, offline view hoặc màn hình nested khi thiết kế. | Screen set có owner/source/route, state matrix và phân loại visible/hidden/alias/internal detail. |
| Mobile business parity | Mobile đọc map, RelatedInfo, Alarms, Dispatches, Tasks, Incident, Land, Settings. | Chưa có Mobile Residents/Intake/Inspection workflow. | Giữ read-only hiện tại cho redesign. Nếu cần capability mới, mở quyết định và contract riêng. |
| Map | Marker Incident/Inspection; Land parcel projection/focus và discovery riêng; nhãn simulated. | Một số yêu cầu map của baseline chưa được chứng minh trong UI/runtime. | Thiết kế theo capability thực tế; không dựng mockup như thể lớp/nguồn/API chưa có đã hoạt động. |

## 6. Roadmap và phân công đề xuất

1. **PO chốt visual baseline và phạm vi màn hình.** Giữ nguyên route, quyền, masking, assignment, API, state machine, offline và nhãn simulated.
2. **Research** duy trì route/state/permission crosswalk và ghi decision log; chỉ đóng contract UI/UX sau khi quyết định nền tảng visual và phạm vi màn hình.
3. **UI/UX agent** — sau khi contract được duyệt — tạo prototype cho screen set hiện hữu theo quyền truy cập đã chốt. Google Stitch là provider chính theo harness, nhưng **chưa được gọi** trong lần kiểm kê này.
4. **repo-architect** chỉ nhận handoff nếu quyết định dẫn tới thay đổi cấu trúc shell/layout hoặc shared UI ownership. Chưa có handoff vì chưa có structural change được duyệt.
5. **Developer** triển khai sau PO gate; ưu tiên các surface Web hiện có của PS-E1-004/005/007, Đất đai và Bản đồ. Không tạo Mobile workflow mới hoặc Phase 2 trong redesign này.
6. Browser visual/accessibility review và test được để cho giai đoạn sau; không chạy trong kiểm kê read-only.

Runtime agent registry/session readiness hiện **NOT_VERIFIED**; vì vậy đây là phân công theo vai trò, không phải xác nhận agent đã được dispatch.

## 7. Quyết định PO còn cần chốt

1. **Light/Blue có phải visual baseline chính thức cho lần redesign này không?** Tài liệu không đồng nhất: design-system overview ghi B9 approved (`docs/civicos-ui-design-system/overview.md:3-5`), ADR-0003 ghi visual approval còn pending (`brain/adr/0003-shared-civicos-ui-design-tokens.md:3-4`). Tương tự, alignment overview ghi B8 approved (`docs/civicos-uiux-alignment/overview.md:5-15`) nhưng ADR-0004 vẫn ghi B8 pending (`brain/adr/0004-civicos-uiux-alignment.md:3`).
2. Giữ nguyên quyết định navigation ẩn bảy feature và direct-route behavior hiện có hay có ý định đổi? Nếu đổi, cần decision nghiệp vụ/phân quyền riêng.
3. “Redesign mọi màn hình hiện tồn tại” gồm cả Login, Public Land Lookup, Demo Center, offline queue, hidden route và detail state. Có cần loại trừ surface nào không? Theo xác nhận trước đó, mặc định kiểm kê đã tính cả các surface này.
4. Mobile parity PS-E1-004/005/007 có nằm ngoài redesign UI-only như hiện trạng hay cần work item capability riêng? Những màn hình này chưa tồn tại trên Mobile.
5. Các quyết định đang mở ảnh hưởng trực tiếp đến copy/quyền gồm D-01 (role của Trưởng CA xã), D-02 (đơn vị cấp trên), D-04 (quyền reveal danh tính), D-05 (app công dân), D-19 (cán bộ thôn), D-22 (Mobile write cư dân) và D-34 (offline sync). Decision log ghi chúng là “Chưa trả lời” (`docs/reset/decision-log.md:5-9,23-26,36-40`).
6. Cần khôi phục/tạo đúng canonical `docs/rbac/role-matrix.md` theo quy trình dự án trước khi xác nhận toàn bộ role/action coverage.

## 8. Phần chưa kiểm và Git fingerprint

- **Không có browser visual validation**; đây là static source inspection.
- **Không chạy test, typecheck, lint, build hoặc E2E**.
- Không kiểm tra live API, DB, provider map, demo target readiness hay dữ liệu runtime.
- Không gọi Stitch, PostgreSQL MCP, Docker, migration, AgriOS hoặc đọc file cấu hình/credential store.
- Không tạo `source-assessment.md` riêng; nội dung AS-IS → GAP → TO-BE nằm trong báo cáo này. File này được tạo theo yêu cầu người dùng sau khi kết thúc kiểm kê tĩnh.

Fingerprint dưới đây là fingerprint của đợt kiểm kê **trước khi tạo file báo cáo này**. Khi chụp fingerprint đó, tree đã dirty trước kiểm kê; giá trị không chứng minh working tree sạch.

```text
git rev-parse HEAD
136197c82c47d60400ce373c7f261f1cc7589ef3

git status --porcelain=v1 -uall | sha256sum
c86937eddd9cfffcdf0dc22b6a31553763bf21d8bd1dd5652f3b8fec8e09883a *-
```

**Ngoài file báo cáo mới này, kiểm kê không sửa production source. Test: CHƯA CHẠY. Visual validation: CHƯA THỰC HIỆN.**
