---
title: CivicOS — Pilot 01 v2 và thiết kế bao phủ Web
status: proposed
owner: techlead
created: 2026-10-21
updated: 2026-10-21
sources:
  - AGENTS.md
  - CIVICOS-WEB-UIUX-DESIGN-PREPARATION.md
  - docs/reset/requirements-baseline.md
  - docs/reset/decision-log.md
  - docs/civicos-ui-design-system/overview.md
  - docs/civicos-ui-design-system/non-functional.md
  - docs/civicos-unified-web-workspace/overview.md
  - docs/civicos-uiux-alignment/overview.md
  - docs/land-module/overview.md
  - src/app/
  - src/components/
---

# CivicOS Web — Đề xuất thiết kế trực quan và bao phủ route

## Trạng thái và phạm vi

Tôi đã dùng `CIVICOS-WEB-UIUX-DESIGN-PREPARATION.md` làm baseline source-level cho 28 route. Con số 28 không phải bằng chứng runtime PASS. Trong lượt này tôi chỉ đọc và phân tích: **không sửa source hay tài liệu, không tạo mockup/artifact, không chạy test/build/browser, không stage/commit/push**. Worktree vốn đã dirty; giữ nguyên trạng thái đó.

Design System B9 và Light/Blue baseline được xem là có hiệu lực theo tài liệu. Giữ nguyên màu nền `#F8FAFC`, surface `#FFFFFF`, text `#172033` / `#475569`, action `#075985`, focus `#1D4ED8`; dùng system sans, monospace cho mã/thời điểm/version, trạng thái có chữ và biểu tượng, target tối thiểu 44px. Không thêm palette, gradient, KPI hay chart. (`docs/civicos-ui-design-system/overview.md:3-18`; `docs/civicos-ui-design-system/non-functional.md:7-28`; `brain/adr/0003-shared-civicos-ui-design-tokens.md:13-21`)

## 1. Pilot 01 v2 — hướng hình ảnh

### Shell, điều hướng và tài khoản

- Dùng nền sáng trung tính, bề mặt trắng, đường phân cách mảnh, tương phản chữ rõ; giữ thứ bậc gọn và ưu tiên nội dung nghiệp vụ.
- Desktop: điều hướng bên trái **mở rộng 240px hoặc thu gọn 64px**, theo kích thước hiện có; trạng thái thu gọn vẫn giữ tên truy cập được. Mobile: dùng nút `Menu` và drawer hiện có, rộng tối đa 85vw. (`ModuleShell.tsx:315-478`; `ModuleSidebar.tsx:20-63`)
- Chỉ hiện module/feature mà session và Assignment cho phép; không đưa bảy feature hiện bị ẩn khỏi navigation ra menu. Giữ direct routes và các gate hiện có. (`feature-registry.ts:296-387`)
- Breadcrumb giữ thứ bậc `Trung tâm / Phân hệ / Feature`; chi tiết thửa tiếp tục có link quay về danh sách.
- Topbar dùng danh tính, email và role từ session hiện có (`SessionControls.tsx:7-12,38-48,151-167`). Với scenario Pilot, hiển thị role key `land_officer` và ngữ cảnh Assignment `land_review` đang active nếu API xác nhận. **Không đổi role key thành chức danh chưa được xác nhận.** Session hiện có `organizationUnitId`, nhưng không có tên hiển thị đơn vị trong dữ liệu session; không tự điền tên đơn vị. Cũng không dùng chuỗi `Nghĩa Trụ` hard-code ở trang chủ như ngữ cảnh đã xác minh (`src/app/page.tsx:21-40`).

### Wireframe bằng chữ — chưa phải bản render

**Trang chủ `/`, desktop 1440×900, `land_officer` đủ điều kiện**

```text
┌───────────────────────────────┬──────────────────────────────────────────┐
│ Điều hướng đủ quyền           │ Topbar: tài khoản · land_officer         │
│                               │ Ngữ cảnh: land_review · active           │
│ Phân hệ Land                  ├──────────────────────────────────────────┤
│  Thửa đất · Chủ thể           │ Trung tâm / Land                         │
│  Hồ sơ biến động              │ Trung tâm điều hành                      │
│  Tạo hồ sơ biến động          │                                          │
│                               │ Các lối vào được phép từ registry:        │
│ [Thu gọn]                     │ Thửa đất · Chủ thể                       │
│                               │ Hồ sơ biến động                          │
│                               │ Tạo hồ sơ biến động                      │
└───────────────────────────────┴──────────────────────────────────────────┘
```

Danh sách trên lấy đúng tên feature từ registry; không thêm số liệu, “việc gần đây” hay nội dung demo. Cả ba feature chỉ xuất hiện theo eligibility thực tế; `land-parcel-workspace` và queue cần `land_review` active/in-scope, còn feature tạo hồ sơ có role gate riêng. (`feature-registry.ts:255-283,296-334`; `workspace-registry.ts:23-50`)

**`/land/parcels` — danh sách**

- Header: `Thửa đất · Chủ thể`; giữ mô tả về phạm vi đơn vị và việc che số định danh hiện có.
- Bộ lọc đúng các trường hiện có: trạng thái, mã xã, mã thửa.
- Bảng giữ cột mã thửa, tờ bản đồ/thửa, diện tích, trạng thái, bản đồ; bên dưới là danh sách chủ thể với định danh đã che.
- Trên mobile, bộ lọc xếp dọc; bảng giữ đủ cột trong vùng cuộn ngang có tên truy cập được, không âm thầm bỏ cột hay biến thành một layout làm mất dữ liệu. Giữ link xem chi tiết và bản đồ. (`src/app/land/parcels/page.tsx:15-55`; `ParcelList.tsx:20-32,217-270`; `ParcelPilotUI.tsx:35-76`)

**`/land/parcels/[parcelId]` — chi tiết chỉ đọc**

- Giữ link `← Danh sách thửa đất`, tiêu đề `Chi tiết thửa đất`, và các phần thửa, quyền sử dụng, ràng buộc, Evidence và map boundary đang có.
- Trình bày trạng thái, phiên bản và ngày hiệu lực cùng nội dung tương ứng; thời điểm không tự đổi timezone/legal meaning. Danh tính chủ thể vẫn masked; không đưa polygon/Evidence vượt phạm vi.
- Loading, denied, not-found, offline và error là state riêng; không hiển thị dữ liệu cũ để vượt denied. Khi offline/error, giữ đúng hành vi hiện có và không giả success. (`src/app/land/parcels/[parcelId]/page.tsx:21-40`; `ParcelDetail.tsx:33-59,68-120`; `workspace-view.ts:74-85,110-135`; `docs/land-module/overview.md:65-67`)

**Sidebar và responsive**

Bản review nên có sidebar desktop mở rộng/thu gọn; ở 390×844, dùng drawer, giữ breadcrumb và thứ tự heading. Nội dung detail xếp dọc; bảng vẫn giữ đủ nội dung qua cuộn ngang. Focus-visible, tên truy cập được, trạng thái có chữ/icon và target 44px áp dụng xuyên suốt. Hai viewport đối chiếu là 1440×900 và 390×844 theo NFR. (`docs/civicos-ui-design-system/non-functional.md:19-28`)

## 2. Phương án preview cụ thể

Phần trên là **wireframe trong chat**, không phải preview render và không đủ để xác nhận PO Visual Acceptance.

Nếu PO muốn artifact để review, phạm vi đề xuất là **một file tĩnh** `docs/previews/pilot-01-v2-visual-review.html`, HTML/CSS không gọi API/DB, không sửa production source. Tám khung:

1. Trang chủ desktop, sidebar mở rộng.
2. Trang chủ desktop, sidebar thu gọn.
3. Danh sách thửa desktop.
4. Chi tiết thửa desktop.
5. Trang chủ mobile, drawer đóng.
6. Trang chủ mobile, drawer mở.
7. Danh sách thửa mobile.
8. Chi tiết thửa mobile.

Không thêm nút/chức năng, dữ liệu cá nhân hay nghiệp vụ giả; chỉ dùng nội dung và state có căn cứ, nhãn mô phỏng đúng contract. **Tôi chưa tạo file này**: cần PO duyệt riêng việc tạo artifact theo giới hạn ở mục 6 của yêu cầu.

## 3. Bao phủ 28 Web routes

`R1` = list/table: lọc xếp dọc, bảng có vùng cuộn truy cập được. `R2` = form/detail: xếp một cột, giữ nhãn và thứ tự. `R3` = map: control/state có nhãn, không phụ thuộc màu/bản đồ đơn thuần. `R4` = offline queue: trạng thái từng mục bằng chữ. Tất cả dùng semantic heading/label, focus và target ≥44px.

State viết dưới đây là **coverage để thiết kế/đối chiếu**, không xác nhận runtime. `L` loading, `0` empty, `E` error/conflict, `D` denied/forbidden/masked, `O` offline, `S` stale/simulated. Chỉ dùng state đúng với contract/component hiện có; không tạo state machine mới. Vai trò là role ID từ registry, không phải mapping chức danh đã được RBAC chuẩn xác nhận.

| Route | Role / Assignment và mục đích, thao tác hiện có | Bố cục, shared/domain UI; responsive/state và điểm cần giữ |
|---|---|---|
| `/` | Session + role + Assignment; scenario là `land_officer` đủ điều kiện. Hiện chiếu module/feature được phép; Demo Center chỉ khi gate cho phép. | Workspace launcher; SessionControls, nav, trạng thái `L/E/D/O`. R1 cho danh sách feature. Soát keyboard: tablist trang chủ có semantics tab nhưng chưa có xử lý phím như `ModuleTabs`. |
| `/login` | Public; đăng nhập nội bộ. | Form đăng nhập, không shell nghiệp vụ. R2; loading/validation/auth error. Không đưa development credentials hiện có vào preview. |
| `/identity` | Feature Assignment có bảy role trong registry; Users theo feature riêng của `commander`. | Landing/link theo feature; shell chung. R2; loading/error/denied. Không chuyển thành dashboard. |
| `/assignments` | Bảy role qua `identity-assignments`; route cũng là href của `incident-assignment` cho `commander`/`superior_commander`. Xem, tạo, thu hồi Assignment. | List/form và UserPicker; R1/R2; `L/0/E/D`. Trình bày route một lần, không tạo hai màn hình trùng. |
| `/users` | `commander`; quản lý và tạo User. | List + CreateUserForm; R1/R2; `L/0/E/D`, validation hiện có. |
| `/incidents` | `commander`/`superior_commander` bypass; các role khác cần Assignment `incident_verification`. Feature đang ẩn khỏi navigation. | Queue/IncidentTable; R1; `L/0/E/D`. Giữ link detail/intake, không đưa feature ẩn ra menu. |
| `/incidents/[incidentId]` | Detail gắn với queue nhưng page không có gate feature riêng; quyền resource/API chưa xác minh ở route. | Detail, timeline, action theo state và Assignment; R2; `L/E/D`. Không suy diễn role/action; đây không phải kết luận lỗi bảo mật. |
| `/intake` | Registry: `duty_officer`, `commander`, `superior_commander`; feature ẩn. Page không có gate tường minh trong baseline. | Form + queue; R1/R2; `L/0/E/D` theo state hiện có. Giữ IntakeReport khác Incident và masking; boundary quyền cần xác minh. |
| `/intake/[reportId]` | Cùng feature Intake; page không có gate route tường minh. | Detail và thao tác chuyển Incident khi workflow cho phép; R2; `L/E/D`. Không thiết kế nút reveal; D-04 còn mở. |
| `/inspections/establishments` | Một route cho catalogue/schedule (`commander`, `office_officer`) và workqueue (`commander` bypass hoặc role/task `inspection_fieldwork`). Ba feature đang ẩn khỏi navigation. | Giữ `EstablishmentList`, form, schedule và workqueue trên route hiện có; R1/R2; `L/0/E/D`. Không tạo các menu entry đang ẩn. |
| `/inspections/establishments/[establishmentId]` | Catalogue role hiện có là `commander`/`office_officer`; detail page không thể hiện gate riêng. | Detail/form; R2; `L/E/D`. Xác minh quyền resource trước khi chốt role-specific actions. |
| `/inspections/[inspectionId]` | `inspection-workqueue`: `commander` bypass; `field_officer`/`office_officer` cần `inspection_fieldwork`. | Detail, checklist, finding, recommendation, Evidence; R2/R4; giữ offline-command state ở đúng workflow kiểm tra, không áp thành offline chung. |
| `/vehicles/registry` | `commander`, `superior_commander`; quản lý registry. | List/form; R1/R2; `L/0/E/D`. Giữ nguồn/lý do/thời hạn; không mô tả như camera live. |
| `/field/vehicles` | `vehicle-observation` cho role trong registry hoặc `field_officer` với task `vehicle_verification`. Ghi nhận/xem quan sát. | Workspace form/list, location/Evidence và offline flow hiện có; R1/R2/R4; `L/0/E/D/O` theo hỗ trợ hiện tại. |
| `/field/vehicles/[observationId]` | Detail prefix gắn với `vehicle-verification`; page không có gate riêng, API/resource quyết định. | Detail/xác minh/chuyển tiếp/Evidence; R2; `L/E/D`, offline chỉ nếu state hiện hữu hỗ trợ. |
| `/field/offline` | Không có feature ID riêng; direct URL eligibility chưa rõ. | Status queue cục bộ; R4; pending/failed/rejected/synced theo source. Không biến thành dashboard; xác minh direct-route access. |
| `/residents` | `commander`/`superior_commander` bypass; các role khác cần `resident_followup`. Feature ẩn khỏi navigation. | List/filter cư dân; R1; `L/0/E/D`; che PII. |
| `/residents/[subjectId]` | Candidate theo resident feature/Assignment; page detail không có gate tường minh. | Detail, records, link report; R2; `L/E/D` và masked. Không tự thêm reveal. |
| `/residents/[subjectId]/records/[recordId]` | Page không có gate rõ; API/resource cần quyết định quyền. | Activity form Web hiện có; R2; `L/E/D` và submit error. Không suy ra Mobile write từ route Web. |
| `/residents/reports` | `commander`, `office_officer`; feature ẩn khỏi navigation. | Preview/approve/send báo cáo tháng; report layout, không thêm chart/export; R2; `L/0/E/D`. |
| `/map` | Bảy role trong registry, không khai báo task; gate feature `map-workspace`. | MapWorkspace hiện có config/markers và Land focus/discovery; R3. **Baseline PS-E1-001 FR-001-01..06** còn nêu lớp, severity, popup, filter, time slider, snapshot export; không thấy đủ các control này trong source route. Đây là gap requirement-to-source, không được mô tả như tính năng đang chạy. D-06..08 ảnh hưởng scope/provider. |
| `/land` | `land_officer` với `land_review` active/in-scope hoặc `commune_leader` bypass; queue gate. | `ApplicationQueue`; R1; `L/0/E/D/S` theo state Land. Cùng composition với `/land/applications`. |
| `/land/applications` | Như `/land`. | Alias route cùng `ApplicationQueue`; không tạo thiết kế queue thứ hai. |
| `/land/applications/new` | `land_officer`; feature registry không yêu cầu task riêng cho feature tạo. | Form chọn party/parcel và tạo application; R2; `L/E/D/S` theo contract. API/resource vẫn có thẩm quyền cuối. |
| `/land/applications/[applicationId]` | `land_officer` với `land_review` hoặc `commune_leader` theo gate; actions theo role/state. | Detail/timeline, sync/retry/approve/reject chỉ khi hiện có và được phép; R2; `L/E/D/S`. Không thêm transition. |
| `/land/parcels` | `land_officer` với `land_review` hoặc `commune_leader` bypass. | Danh sách parcel/party, filter/cursor pagination; R1; `L/0/E/D/O` theo hiện trạng. Masking bắt buộc. |
| `/land/parcels/[parcelId]` | Như list; API kiểm tra quyền resource. | Detail sections, quyền/ràng buộc/Evidence/map link; R2; `L/E/D/O`, not-found. Chỉ đọc; giữ effective dates/version, masking và boundary geometry. |
| `/public/land/lookup` | Public, không cần session; chỉ lookup bằng một applicationCode hoặc parcelCode. | Form + kết quả tối thiểu; R2; `L/0/E/S`. Giữ `simulated`; không đưa polygon, Evidence hoặc PII vào public response. |

Danh sách và các source anchors theo từng route nằm trong crosswalk `CIVICOS-WEB-UIUX-DESIGN-PREPARATION.md:52-106`. Feature registry giữ các feature ẩn ở direct-route authorization nhưng loại khỏi navigation (`feature-registry.ts:359-387`).

## 4. Design direction theo phân hệ và shared UI

| Nhóm | Định hướng |
|---|---|
| Shared Admin Shell / Navigation | Dùng chung shell, sidebar, module tabs, drawer, focus và status. Topbar hiện chưa là phần của `ModuleShell`; dùng dữ liệu SessionControls/Assignment hiện có, không thêm quyền hoặc API. |
| Page header / breadcrumb | Thống nhất thứ bậc và typography; giữ tiêu đề, nhãn và back link theo route. Không thay destination. |
| Tables / filters | Chia sẻ vỏ trình bày khi thao tác giống nhau; giữ columns, filter và pagination riêng domain. |
| Forms | Chia sẻ spacing, label, error/focus; validation, fields và action giữ theo form hiện có. Không áp workflow Land sang module khác. |
| Detail sections | Có thể chia sẻ section wrapper; không gom meaning/status/domain rules vào một mapping chung. |
| Workflow / timeline | Dùng cùng thứ bậc đọc nếu hợp semantics; giữ event, transitions và action riêng từng domain. |
| Maps | Thành phần đặc thù. Tách Map workspace khỏi Land parcel preview; giữ projection/privacy/offline/provider boundary. |
| Reports | Layout riêng cho preview và action approve/send; không thêm biểu đồ hay export chưa có căn cứ. |
| Status / feedback | State có text/icon; retry và safe error chỉ ở boundary hiện có. Không fake success hoặc hiển thị stale/geometry vượt quyền. |
| Responsive / accessibility | 1440×900 và 390×844; cuộn bảng có nhãn, focus-visible, keyboard order, drawer focus và target ≥44px. Các điểm này là yêu cầu design review, không phải kết quả kiểm thử. |

**Đặc thù:** Incidents/Intake và Residents cần giữ ranh giới PII/masking; Inspections và Vehicles/Field giữ checklist/Evidence/offline semantics riêng; Land giữ state và giả lập nội bộ; Map cần xử lý provider/geometry riêng; public lookup là trang public tối giản, không dùng authenticated shell. Login và offline queue là các route hỗ trợ riêng, không biến thành dashboard.

## 5. Triển khai song song sau khi PO duyệt thiết kế

1. **Nền tảng nối tiếp trước:** chốt shell/topbar/navigation/breadcrumb/state presentation; tránh để các nhánh cùng sửa shared files.
2. **Sau shell, chia các lane độc lập:** Identity/Assignment; Incidents/Intake; Residents; Inspections; Vehicles/Field; Land applications/parcels; Map riêng; Login/Public lookup.
3. Chỉ chia song song khi file ownership và shared-component boundary đã rõ; review privacy/resource gate riêng cho Residents/Intake và projection/provider riêng cho Map.
4. Trước implementation, mỗi ticket cần phạm vi/path/acceptance rõ, role-resource boundary đủ căn cứ và design được PO duyệt. **Chưa dispatch Developer và chưa coding.**

## 6. Blocking thực sự và quyết định cần PO

### Không chặn việc trình bày đề xuất này

- Có thể review hướng Pilot và tạo source-level coverage cho 28 route ngay bây giờ.
- Chưa có runtime, browser, responsive hay accessibility verification; không gọi đây là PASS.
- Research đã được giao kiểm tra read-only; hiện chưa có kết quả trả về. Không có agent `ui-ux` hoặc `repo-architect` trong roster khả dụng.
- `docs/civicos-ui-design-system/overview.md` tham chiếu Stitch/prototype trong `.scratch`; các artifact đó không tìm thấy trong workspace đã kiểm tra. Vì vậy wireframe này dựa trên token/docs/source, chưa thể đối chiếu pixel với catalog canonical.

### Chặn việc chốt một số chi tiết hoặc gọi là acceptance

- **B8 visual status có mâu thuẫn tài liệu:** ADR-0003 ghi token baseline đã duyệt nhưng B8 screen visual còn pending (`brain/adr/0003-shared-civicos-ui-design-tokens.md:3,30-34`); overview alignment lại ghi B8 `APPROVED` (`docs/civicos-uiux-alignment/overview.md:8-15`), còn ADR-0004 ghi `PROPOSED`, chờ B8 (`brain/adr/0004-civicos-uiux-alignment.md:3`). Tôi không coi nhãn Proposed là vô hiệu; với **Pilot 01 v2 trong yêu cầu hiện tại**, vẫn dừng ở cổng PO visual review bạn vừa đặt, không tuyên bố đã accepted.
- `docs/rbac/role-matrix.md` không tìm thấy. Dùng role ID từ registry làm bằng chứng UI hiện trạng, không thay RBAC chuẩn. D-01, D-02, D-04 và D-19 vẫn “Chưa trả lời” trong decision log (`docs/reset/decision-log.md:27-30,45`): ảnh hưởng mapping chức danh, đơn vị nhận, reveal danh tính và role cán bộ thôn. Vì vậy preview không dịch role key thành chức danh, không thêm nút reveal, và không hard-code đơn vị nhận.
- D-06..08 còn mở cho phạm vi hành chính, đơn vị xử lý và nguồn bản đồ (`docs/reset/decision-log.md:32-34`). Map FR-001-01..06 là yêu cầu trong baseline (`docs/reset/requirements-baseline.md:27-37`) nhưng source route chưa thể hiện đầy đủ; phải phân biệt rõ target design với UI hiện có.
- Có mâu thuẫn scope public citizen app: D-05 còn mở (`decision-log.md:31`), trong khi ADR-0005 nêu không tạo public citizen app (`brain/adr/0005-e1-mobile-parity-boundaries.md:32-34,61-62`). Không thiết kế app đó trong 28 route; `/public/land/lookup` vẫn được bao phủ theo contract Land riêng.
- Ngữ cảnh topbar đề xuất an toàn cho Pilot là `land_officer · land_review active`; tên OrganizationUnit chưa có nguồn hiển thị trong session hiện đọc. Nếu PO muốn tên đơn vị ở topbar, cần chỉ định nguồn label đã xác minh; không dùng tên hard-code.

**PO Visual Design Review Gate:** Xin review wireframe và hướng thiết kế trên. Nếu muốn xem artifact render, hãy duyệt riêng đúng phạm vi file `docs/previews/pilot-01-v2-visual-review.html` và tám khung đã liệt kê. Chưa có file/artifact nào được tạo; chưa có PO Visual Acceptance PASS.

Kiểm tra thực hiện: `git status --short --branch` — exit code `0`, nhánh `reset/baseline`, output có nhiều file modified/untracked từ trước; không có thao tác ghi trong lượt này. `npm test`, typecheck, lint, build và browser **CHƯA CHẠY** vì đây là lượt phân tích thiết kế, chưa được duyệt tạo artifact.
