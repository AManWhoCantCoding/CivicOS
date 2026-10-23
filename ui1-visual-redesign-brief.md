---
title: CivicOS UI-1 — Visual Redesign Brief & Design Direction
status: proposed
owner: research
created: 2026-10-18
updated: 2026-10-18
sources:
  - kiem-ke-ui-civicos.md
  - docs/UI-map.md
  - docs/reset/requirements-baseline.md
  - docs/reset/decision-log.md
  - docs/civicos-ui-design-system/overview.md
  - docs/civicos-uiux-alignment/overview.md
  - brain/adr/0003-shared-civicos-ui-design-tokens.md
  - brain/adr/0004-civicos-uiux-alignment.md
  - src/app/globals.css
  - src/components/
  - mobile/src/
---

# Six Thinking Hats Analysis — CivicOS UI-1

## Problem

Chuẩn bị Design Brief cho các màn hình Web/Mobile **đang tồn tại**, để PO chọn hướng thị giác trước khi đóng contract UI/UX. Phạm vi phân tích là đề xuất: không tạo prototype, không sửa production source, không triển khai UI. File brief này được tạo theo yêu cầu tiếp theo sau khi nội dung phân tích đã hoàn tất.

UI-1 chưa có migration adapter hoặc workflow status riêng; tôi xử lý đây là work item mới. **Chưa đóng route triển khai và chưa dispatch `ui-ux`**.

## ⚪ White Hat — Facts

### AS-IS → GAP → TO-BE

| AS-IS | GAP quan sát được | TO-BE đề xuất, chờ PO chọn hướng |
|---|---|---|
| UI-0 ghi nhận 28 Web routes, 8 Mobile tabs; Web có workspace theo session/Assignment và shell dùng ở một số khu vực, không phải mọi route. (`kiem-ke-ui-civicos.md:26-31,84-107`) | `docs/UI-map.md` còn mô tả trang chủ theo ba thẻ; UI-0 chưa thực hiện browser/visual validation. (`docs/UI-map.md:30-42`; `kiem-ke-ui-civicos.md:113-115,172-178`) | Hoàn thiện một ngôn ngữ thị giác cho các screen archetype, đồng thời giữ nguyên entry route, quyền và hành vi hiện tại. |
| Web có token về màu, spacing, radius, focus và kích thước control; Mobile có baseline tương tự. (`src/app/globals.css:3-40,69-114`; `mobile/src/components/States.tsx:9-56`) | UI-0 ghi nhận nhiều page/component còn style cục bộ; chưa xác minh bằng mắt độ nhất quán hoặc khả năng tiếp cận. (`kiem-ke-ui-civicos.md:126-128,174-175`) | Chuẩn hóa token roles và presentation states sau khi PO duyệt direction; không mặc định các giá trị hiện tại là hướng được chọn. |
| Mobile có 8 tab `Map`, `RelatedInfo`, `Alarms`, `Dispatches`, `Tasks`, `Incident`, `Land`, `Settings`; có các detail view nội bộ. (`mobile/src/navigation/AppNavigator.tsx:29-52`; `kiem-ke-ui-civicos.md:90-107`) | UI-0 không ghi nhận Mobile Residents/Intake/Inspection workflow tương ứng. (`kiem-ke-ui-civicos.md:130-136`) | Redesign các Mobile surface đang có; capability Mobile mới phải tách thành work item riêng. |
| UI-0 phân biệt feature bị ẩn khỏi workspace navigation với capability/backend bị thiếu. (`kiem-ke-ui-civicos.md:45-47`) | Không được biến prototype thành cách bật bảy feature đang bị ẩn. | Giữ nguyên navigation visibility và direct-route behavior hiện tại. |

### Bất nhất tài liệu

Tài liệu dự án đang ghi trạng thái Light/Blue khác nhau: design-system overview ghi B9 approved (`docs/civicos-ui-design-system/overview.md:3-18`), trong khi ADR-0003 ghi screen visual approval pending (`brain/adr/0003-shared-civicos-ui-design-tokens.md:3-4`). Alignment overview ghi B8 approved (`docs/civicos-uiux-alignment/overview.md:5-17`), còn ADR-0004 ghi chờ B8 (`brain/adr/0004-civicos-uiux-alignment.md:3`).

Theo yêu cầu hiện tại, **không coi Light/Blue là hướng đã được PO phê duyệt cho UI-1**. Cần PO xác nhận direction mới hoặc xác nhận rõ việc sử dụng lại một baseline trước khi handoff.

### Giới hạn bằng chứng

UI-0 là static inspection, không có browser/visual validation. Phần nghiên cứu UI-1 cũng chỉ kiểm tra source và tài liệu; không chạy browser, test, Stitch, Docker, migration hoặc MCP. Brief được lưu thành file riêng theo yêu cầu sau khi nghiên cứu hoàn tất. Vì vậy đây là đề xuất thiết kế, **không phải đánh giá trực quan về UI hiện tại**. (`kiem-ke-ui-civicos.md:172-178`)

## 🔴 Red Hat — Emotion and Intuition

Không có ý kiến cảm xúc trực tiếp của cán bộ sử dụng, PO ngoài các quyết định được nêu, hoặc người dân được cung cấp trong phạm vi này. Không suy diễn phản ứng của họ. Cần kiểm chứng direction đã chọn với người dùng ở giai đoạn visual review.

## ⚫ Black Hat — Constructive Caution and Risk

| Rủi ro | Cơ sở | Kiểm soát cần giữ |
|---|---|---|
| Prototype vô tình làm feature ẩn trông như đã được bật | UI-0 ghi nhận bảy feature bị loại khỏi workspace navigation. (`kiem-ke-ui-civicos.md:45-47`) | Không thêm chúng vào navigation hoặc thay đổi route eligibility. |
| Mockup gợi ý capability chưa có, nhất là lớp bản đồ, workflow Mobile hoặc tích hợp | UI-0 chỉ xác nhận một số nguồn map hiện có; nhiều yêu cầu baseline chưa được kiểm chứng ở runtime. (`kiem-ke-ui-civicos.md:118-124,130-136`) | Chỉ mô tả dữ liệu/controls đã có; ghi rõ mọi nội dung mô phỏng. |
| Redesign làm đổi nghĩa màu/trạng thái hoặc khiến dữ liệu nhạy cảm dễ lộ hơn | Baseline yêu cầu giữ masking, quyền và nhãn simulated; semantic states đã tồn tại ở Mobile. (`docs/civicos-uiux-alignment/overview.md:48-56`; `mobile/src/components/States.tsx:58-123`) | Duyệt state semantics cùng palette; dùng dữ liệu giả; không thay masking hoặc authorization. |
| Thực hiện theo baseline Light/Blue trong khi trạng thái tài liệu mâu thuẫn | Các nguồn phê duyệt được ghi khác nhau ở trên. | Chờ PO xác nhận; không tự chọn tài liệu thắng. |

## 🟡 Yellow Hat — Logical Optimism and Value

Đã có những điểm tựa có thể giảm công thiết kế lặp: shell/navigation và state components ở Web (`src/components/shell/ModuleShell.tsx:7-25`; `src/components/navigation/ModuleSidebar.tsx:7-65`; `src/components/shell/ModuleStatus.tsx:70-103,150-187`), cùng token/state baseline ở Web và Mobile (`src/app/globals.css:3-40`; `mobile/src/components/States.tsx:9-123`).

Nếu được chuẩn hóa, các component này **có thể** giúp giảm khác biệt presentation và làm prototype tập trung vào các mẫu dùng chung thay vì vẽ đủ 28 route. Đây là lợi ích dự kiến, chưa được đo lường hoặc kiểm chứng với người dùng.

## 🟢 Green Hat — Creative Movement and Alternatives

### 1. Ba hướng thị giác ứng viên

Cả ba đều là **đề xuất chưa được duyệt**. Màu trạng thái nghiệp vụ phải giữ nghĩa nhất quán, độc lập với màu thương hiệu.

| Hướng | Ngôn ngữ thị giác | Điểm mạnh có thể có | Đánh đổi cần cân nhắc |
|---|---|---|---|
| **A — Civic Atlas** | Nền sáng trung tính, mực đậm, điểm nhấn xanh có tiết chế; bố cục lấy bản đồ và cấu trúc địa bàn làm cảm hứng, dùng đường viền/phân cấp rõ thay cho card lặp lại. | Hỗ trợ màn hình dữ liệu, bản đồ và tài liệu; dễ duy trì tương phản cao. | Gần họ Light/Blue hiện có hơn hai hướng kia; cần tránh bị hiểu là tự động chọn baseline cũ. |
| **B — Command Console** | Nền graphite tối, các panel rõ ranh giới, điểm nhấn sáng dùng có chọn lọc; cảm giác điều hành tập trung. | Có thể tạo phân cấp rõ cho queue, trạng thái và bản đồ trên màn hình lớn. | Dữ liệu dày và form dài có thể mỏi mắt; phải kiểm tra ngoài môi trường tối và đảm bảo bản in/tra cứu không phụ thuộc theme tối. |
| **C — Field Ledger** | Nền giấy ấm, typography thiên về hồ sơ, đường kẻ và nhóm thông tin; accent xanh rừng/đất nung chỉ dùng làm nhận diện, không thay màu semantic. | Phù hợp các màn hình hồ sơ, checklist, tra cứu và đọc dài. | Có thể làm giảm cảm giác khẩn cấp của giao diện điều hành; accent không được lẫn với trạng thái success/warning. |

**Chưa chọn hoặc kết hợp hướng nào.** Các tên và mô tả chỉ là cách phân biệt concept, không phải thiết kế hoàn chỉnh.

### 2. Ma trận screen archetypes

| Archetype | Surface hiện có đại diện | Nội dung prototype cần bảo toàn |
|---|---|---|
| Workspace / Dashboard | `/` — RoleWorkspace theo session/Assignment (`src/components/workspace/RoleWorkspace.tsx:23-60,136-160`) | Chỉ trình bày module/feature vốn được phép; trạng thái session và Assignment. |
| Danh sách / bảng / hàng đợi | `/intake`, `/residents`, `/land`, `/land/parcels`, danh mục cơ sở; Mobile RelatedInfo/Alarms/Dispatches/Tasks (`kiem-ke-ui-civicos.md:53-82,94-103`) | Bộ lọc, phân trang, dữ liệu che và trạng thái tải/lỗi theo hiện trạng; không tự thêm mục menu. |
| Form và xử lý nghiệp vụ | Intake detail, land application form, inspection checklist, Assignment (`src/components/incidents/IntakeReportDetail.tsx:239-295`; `src/components/land/ApplicationForm.tsx:32-68`; `src/components/inspections/ChecklistForm.tsx:42-79`) | Giữ nguyên field, action, thứ tự nghiệp vụ và điều kiện trạng thái. |
| Chi tiết hồ sơ / timeline | Incident, resident, land application/parcel, establishment/inspection (`src/components/incidents/IncidentDetail.tsx:26-45,152-175`; `src/components/residents/ResidentDetail.tsx:26-82`; `src/components/land/ParcelDetail.tsx:27-60`) | Phân cấp thông tin và hành động đang có; giữ masking và quyền xem. |
| Bản đồ / panel dữ liệu | `/map` và Mobile Map/RelatedInfo (`src/components/map/MapWorkspace.tsx:104-142,204-227`; `mobile/src/navigation/AppNavigator.tsx:29-38`) | Chỉ dùng layer, focus và projection được source hiện có hỗ trợ; giữ nhãn simulated và giới hạn offline. |
| Identity / Assignment / Settings | `/identity`, `/users`, `/assignments`, Mobile Settings (`kiem-ke-ui-civicos.md:68-70,103`) | Giữ quyền và Assignment; không mở rộng role hoặc capability quản trị. |
| Login / Public Lookup / trạng thái | `/login`, `/public/land/lookup`, `/field/offline`, các trạng thái error/denied/masked (`kiem-ke-ui-civicos.md:56,67,82,172-178`) | Login và Public Lookup không mặc định dùng cùng internal shell; giữ wording public và states hiện có. |
| Mobile hiện hữu | 8 tab cùng detail/nested views (`mobile/src/navigation/AppNavigator.tsx:29-52`; `kiem-ke-ui-civicos.md:94-107`) | Giữ navigation, read-only boundary và cách hiển thị offline/masked/simulated; không tạo Mobile Residents/Intake/Inspection. |

### 3. Design System blueprint sơ bộ

| Lớp | Đề xuất |
|---|---|
| **Color tokens** | Định nghĩa bằng vai trò, chưa chốt giá trị: `canvas`, `surface`, `surface-raised`, `border`, `text-primary`, `text-secondary`, `action-primary`, `focus`, `disabled`; semantic `success`, `info`, `warning`, `danger`, `stale`, `offline`, `forbidden`, `masked`, `simulated`. Các token Light/Blue đang có chỉ là AS-IS, không phải lựa chọn UI-1. (`src/app/globals.css:3-24`) |
| **Semantic states** | Chuẩn hóa cách trình bày `loading`, `empty`, `ready`, `warning`, `stale`, `error`, `forbidden`, `masked`, `offline`, `simulated`. Dùng nhãn/icon và màu; không truyền tải state bằng màu đơn lẻ. (`mobile/src/components/States.tsx:58-123`; `src/components/shell/ModuleStatus.tsx:70-103,150-187`) |
| **Typography / spacing / shape** | Dùng thang chữ rõ cho heading, body, label và metadata; monospace chỉ cho mã/thời gian khi hữu ích. Spacing theo thang nhỏ nhất quán; radius và elevation tiết chế, không lồng nhiều lớp card. Hiện source có spacing 4–48 px, radius 6/10/16 px và system sans. (`src/app/globals.css:25-39,69-82`) |
| **Layout / navigation** | Thống nhất page header, content width, breadcrumb/context và responsive transitions; giữ destinations, tab/module projection, sidebar/drawer hiện có. Không biến feature ẩn thành mục hiển thị. |
| **Components** | Bộ quy tắc cho button, input, table/queue, card, tabs, drawer, dialog, timeline, map panel và feedback. Tách visual pattern khỏi business state; chưa giả định mọi component hiện có đủ tổng quát để dùng chung. |
| **Accessibility / responsive** | Ưu tiên tương phản đủ, focus-visible, keyboard, nhãn form, lỗi gắn với field, status announcements, reduced motion và touch target tối thiểu 44 px. Web và Mobile dùng cùng semantic vocabulary nhưng giữ cách tương tác phù hợp nền tảng. Hiện Web đã có focus/reduced-motion rules; Mobile baseline đặt `controlMin: 44`. (`src/app/globals.css:35-39,100-114`; `mobile/src/components/States.tsx:55`) |

### 4. Prototype đại diện đề xuất — chưa tạo

**Lượt đầu: 8 composition, không phải 28 route:**

1. Workspace và shell Web.
2. PS-E1-005: hàng đợi Intake và chi tiết xử lý.
3. PS-E1-004: danh sách và chi tiết Resident, gồm masked state.
4. PS-E1-007: danh mục cơ sở và checklist Inspection.
5. Đất đai: queue, form tạo và chi tiết hồ sơ.
6. Bản đồ Web: lớp/marker hiện có, focus thửa và panel dữ liệu.
7. Assignment: form/phần hiển thị đại diện cho pattern Identity.
8. Mobile: Map/RelatedInfo và Land/Incident read-only cùng state variants.

Login, Public Lookup và Mobile Settings vẫn nằm trong screen inventory để thiết kế bao phủ toàn hệ thống; có thể đưa vào lượt prototype sau để kiểm tra shell công khai và các surface ngoài workspace. `offline`, `error`, `denied`, `masked`, `stale`, `simulated` được thể hiện khi phù hợp với screen, không dùng để tạo behavior mới.

Prototype chỉ dùng dữ liệu tổng hợp không nhạy cảm và các route/permission hiện có. Những feature ẩn chỉ xuất hiện theo direct route nếu UI hiện tại cho phép; prototype không thay đổi navigation.

### 5. Thành phần hiện tại có thể tái sử dụng

Đây là **ứng viên để đánh giá lại**, không phải xác nhận đã đạt visual/accessibility review:

- Shell, sidebar, module tabs và workspace projection: `ModuleShell`, `ModuleSidebar`, `ModuleTabs`, `RoleWorkspace` (`src/components/shell/ModuleShell.tsx:7-25`; `src/components/navigation/ModuleSidebar.tsx:7-65`; `src/components/navigation/ModuleTabs.tsx:12-74`; `src/components/workspace/RoleWorkspace.tsx:23-60`).
- Trạng thái/feedback: `ModuleStatus`, `AccessDenied`, `FeedbackMessage`, `OfflineQueueStatus` (`src/components/shell/ModuleStatus.tsx:70-103,150-187`; `src/components/identity/AccessDenied.tsx:1-20`; `src/components/field/client-state.tsx:32-71`; `src/components/field/OfflineQueueStatus.tsx:12-53`).
- Identity/Assignment: `SessionControls`, `UserPicker`, `AssignmentWorkspace` (`src/components/identity/SessionControls.tsx:51-74,88-105`; `src/components/identity/UserPicker.tsx:68-80,133-180`; `src/components/identity/AssignmentWorkspace.tsx:89-106`).
- Domain patterns: `ApplicationQueue`, `ApplicationForm`, `ParcelDetail`, `MapWorkspace`, `ChecklistForm` (`src/components/land/ApplicationQueue.tsx:24-48`; `src/components/land/ApplicationForm.tsx:32-68`; `src/components/land/ParcelDetail.tsx:27-60`; `src/components/map/MapWorkspace.tsx:104-142`; `src/components/inspections/ChecklistForm.tsx:42-79`).
- Mobile tokens/states và navigation: `States`, `AppNavigator` (`mobile/src/components/States.tsx:9-123`; `mobile/src/navigation/AppNavigator.tsx:29-52`).

## 🔵 Blue Hat — Process Control and Synthesis

### Tổng hợp và ranh giới

UI-0 cùng source cung cấp cơ sở để xác định screen archetypes và các component có thể tái sử dụng. Chúng **không đủ để đánh giá chất lượng trực quan** hoặc xác nhận rằng Light/Blue là baseline của UI-1. Hướng thiết kế, mật độ màn hình và cách áp dụng visual language cho Public Lookup vẫn thuộc PO.

**Giữ nguyên trong mọi direction:** routes, quyền, dữ liệu nhạy cảm/masking, API contracts, state machine, Assignment, offline policy, navigation visibility và nhãn simulated.

**Ngoài phạm vi redesign:** capability Mobile mới; thay đổi nghiệp vụ/RBAC; bổ sung map layer, data provider hay workflow chưa được xác nhận. PS-E1-004/005/007 có yêu cầu Mobile trong baseline nhưng UI-0 không tìm thấy các workflow tương ứng đang tồn tại; decision log còn các câu hỏi như D-01, D-02, D-04, D-05, D-19 và D-22. (`docs/reset/requirements-baseline.md:123-157,161-196,235-258`; `docs/reset/decision-log.md:5-9,23-26`)

### PO cần duyệt

1. Chọn A, B, C hoặc yêu cầu phối hợp các đặc tính; **chưa có phương án được chọn**.
2. Xác nhận lựa chọn đó có thay thế, dùng lại hay không liên quan tới các ghi nhận Light/Blue hiện có; trạng thái tài liệu đang mâu thuẫn.
3. Duyệt 8 composition đầu tiên và việc để Login/Public Lookup/Mobile Settings sang lượt prototype tiếp theo.
4. Chốt hướng visual riêng hay chung cho Public Lookup, nhưng giữ nguyên route và wording “mô phỏng/không có giá trị pháp lý” hiện có.

### Handoff đề xuất sau khi PO duyệt

Đóng contract cho `ui-ux` với: direction được chọn; screen set và viewport; ma trận state cho từng screen; dữ liệu tổng hợp an toàn; references tới surface hiện có; cùng boundary preserve nêu trên. Sau đó mới dispatch UI/UX để tạo Stitch artifact/prototype cho screen set đại diện, chưa tạo production code.

Giao `repo-architect` **đánh giá kỹ thuật** nếu direction được duyệt đòi hỏi thay đổi cấu trúc ownership của token, shell hoặc shared primitives. Hiện chưa có structural change được duyệt nên chưa handoff.

### Khuyến nghị

**DEFER prototype và implementation cho đến khi PO chọn direction và duyệt screen set.** Câu hỏi PO được ghi trong brief này; không cập nhật `decision-log.md` vì phạm vi lưu kết quả chỉ cho phép tạo file brief mới.

**Phạm vi phiên phân tích:** không sửa production source/config hoặc tài liệu hiện có; không tạo prototype, không chạy test/browser, không gọi Stitch/MCP/Docker/migration; không truy cập credential values hoặc raw MCP config. File brief mới ở root được tạo theo yêu cầu lưu kết quả.
