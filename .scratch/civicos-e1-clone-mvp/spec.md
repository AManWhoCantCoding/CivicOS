# Spec: CivicOS clone PS-E1 — MVP nền tảng và ba nghiệp vụ

- **Trạng thái quyết định:** Đã chốt nghiệp vụ và UI textual baseline, chờ Planner
- **Ngày:** 2026-09-23
- **Phạm vi tổng thể:** PS-E1-001 đến PS-E1-010
- **Tranche triển khai:** nền tảng tối thiểu + PS-E1-004, PS-E1-005, PS-E1-007
- **Mobile delivery:** app React Native riêng trong `mobile/`, dùng backend/API chung

## 1. Mục tiêu

Xây bản clone trong CivicOS của hai dự án nguồn:

- Web: `D:\Project\news-map-main\news-map-main`
- Mobile: `D:\Project\force-app-main\force-app-main`

Clone dùng backend chung cho web/mobile. PS-E1 là nguồn sự thật về nghiệp vụ và Acceptance Criteria. Hai folder nguồn là reference cho route, flow, permission, API shape và dữ liệu đang có; không phải giới hạn của domain model mới.

UI phải có design system riêng, khác màu sắc, typography và component styling của nguồn, nhưng giữ navigation/route/flow quen thuộc để người dùng nguồn không bị mất ngữ cảnh.

## 2. Quyết định đã chốt

### 2.1. Phạm vi MVP

- Nền tảng tối thiểu: auth/RBAC, `OrganizationUnit`, `Assignment`, `Evidence`, `SLA`, `DomainEvent`, `AuditEvent`, map projection và realtime.
- Nền tảng tạo được từng hồ sơ bằng command riêng; không coi nền tảng tối thiểu là hoàn tất đầy đủ PS-E1-001.
- Ba story MVP triển khai đủ Acceptance Criteria:
  - PS-E1-004 — Quản lý Cư dân Đặc biệt.
  - PS-E1-005 — Ghi nhận và Theo dõi Tố giác Tội phạm từ Dân.
  - PS-E1-007 — Quản lý Cơ sở Kinh doanh Có Điều kiện.
- Các story E1 còn lại giữ trong kiến trúc và dữ liệu nền, nhưng chưa nằm trong tranche này.

### 2.2. Source of truth và allocation

- PS-E1 quyết định nghiệp vụ, boundary và AC.
- Web source hiện ghi dữ liệu nghiệp vụ qua các VDMS layer; clone có thể dùng model riêng nhưng phải giữ semantics tương đương.
- Mobile source hiện chủ yếu tra cứu `RelatedInfo`, map, alarm/dispatch/task; MVP giữ mobile read-only cho dữ liệu E1-004/E1-007 và không tạo mobile write flow mới cho hai story này.
- E1-005 chỉ nhận nhập liệu từ cán bộ trực ban trên web; chưa xây public citizen app.
- `sourceChannel` vẫn hỗ trợ `direct`, `phone`, `app`, `district_transfer` để mở rộng sau.

### 2.3. Địa bàn và tenant

- Seed identity: tenant `civis`, system `CADN`.
- `OrganizationUnit` và tên đơn vị cấp trên phải cấu hình được; không hard-code Ba Đình, Nghĩa Trụ, Xuân Hòa hoặc CA huyện.
- Seed map mặc định bám source quanh HCMC/CADN; dữ liệu nghiệp vụ có thể dùng các địa bàn synthetic.

### 2.4. Event model

- Không tạo entity generic `Event` để gom mọi nghiệp vụ.
- Mỗi aggregate có command riêng: tạo `Hotspot`, tạo `IntakeReport`, tạo `Incident`, tạo `Inspection`, ghi `FieldUpdate`...
- `DomainEvent` là bản ghi bất biến của thay đổi nghiệp vụ, dùng cho projection, notification và realtime.
- `AuditEvent` riêng cho truy cập/thay đổi dữ liệu phục vụ tuân thủ.
- `Incident` chỉ được tạo khi cán bộ xác nhận/convert hồ sơ theo semantics source; không tự động tạo Incident cho mọi bản ghi.

### 2.5. Bản đồ và tích hợp

- Renderer web: MapLibre GL JS.
- Renderer mobile: MapLibre React Native/Native.
- Tile stack bản clone: OSM extract → OpenMapTiles → TileServer GL/PMTiles.
- Dùng tile subset quanh CADN để giảm dung lượng và hỗ trợ offline basemap.
- User đã xác nhận dùng OSS tự host cho MVP; không cần map credential/provider token.
- Basemap được cache/offline; thao tác ghi dữ liệu yêu cầu online trong MVP.
- Provider map phải nằm sau adapter để thay bằng VietGeoX/VBDLIS sau này.
- PS-E1-001 chỉ được coi là hoàn tất đầy đủ khi provider chính thức đáp ứng yêu cầu độ chính xác; MVP OSS không được tuyên bố tương đương VietGeoX/VBDLIS.
- Luôn có attribution OSM và tuân thủ license của nguồn tile/data.

### 2.6. Bảo mật và tích hợp

- Auth dùng local adapter nhưng giữ contract role/permission, `Assignment`, masking và audit.
- Danh tính tố giác được mask theo role; chỉ Trưởng CA xem dữ liệu thật.
- Không dùng credential, token hoặc PII thật từ source; seed/demo dùng dữ liệu synthetic.
- Realtime dùng Socket.IO hoặc adapter tương đương.
- SMS, FCM, LPR và ký số dùng adapter mock trong môi trường không có hệ thống thật.

### 2.7. Đích triển khai mobile

- Tạo `mobile/` trong repo CivicOS, độc lập package với Next.js nhưng dùng backend/API và domain contracts chung.
- Stack mobile bám source: React Native + MapLibre React Native.
- Tranche MVP chỉ có auth/main/map, `RelatedInfo` read-only và các alarm/dispatch/task surface source cần thiết.
- Không thêm mobile write flow mới cho E1-004/E1-007; E1-005 web-only.

## 3. Domain model

### 3.1. Shared kernel

- `User`: tài khoản đăng nhập.
- `Actor`: người/hệ thống thực hiện hành động.
- `OrganizationUnit`: đơn vị thực hiện/tiếp nhận nghiệp vụ.
- `Assignment`: phân công cụ thể, cấp quyền tối thiểu cho nhiệm vụ.
- `Evidence`: ảnh/tài liệu/vị trí có nguồn gốc và metadata.
- `DomainEvent`: thay đổi nghiệp vụ bất biến.
- `AuditEvent`: truy vết đọc/thay đổi dữ liệu.
- `SLA`: deadline tính liên tục theo ngưỡng cấu hình.
- `Approval`: quyết định của Trưởng Công an xã cho bước có thẩm quyền cao.

### 3.2. Hồ sơ nghiệp vụ

- `Subject`: người/tổ chức là đối tượng hồ sơ.
- `SubjectManagementRecord`: một mục đích quản lý cụ thể của `Subject`; một `Subject` được có nhiều record.
- `IntakeReport`: tin đầu vào trước xử lý nội bộ.
- `Incident`: vụ việc nội bộ cần xác minh/chuyển tiếp/kết thúc.
- `RegulatedBusiness`: cơ sở kinh doanh có điều kiện.
- `Inspection`: một lần kiểm tra cơ sở, gồm checklist, kết quả và Evidence.
- `InspectionFinding`: phát hiện cụ thể gắn với checklist/Evidence.
- `InspectionResult`: đạt, nhắc nhở hoặc không đạt.
- `EnforcementRecommendation`: đề xuất xử lý từ finding, chờ `Approval`; không tự động kết luận pháp lý.
- `PeriodicReport`: báo cáo tổng hợp gửi `OrganizationUnit` cấp trên.
- `ReportSnapshot`: phiên bản bất biến khi phê duyệt/gửi.

## 3.3. Baseline hiện có trong CivicOS

Không xây lại các module đã có; ticket phải mở rộng hoặc sửa behavior hiện hữu:

- Event kernel, outbox, projection, audit và SLA đã có trong `src/modules/eventing/` và `src/modules/platform/`.
- Identity local provider, role/capability, `OrganizationUnit` và `Assignment` đã có trong `src/modules/identity/`.
- Incident/intake đã có trong `src/modules/incidents/`, nhưng hiện `registerIntakeReport` tạo `Incident` ngay khi nhập và channel chưa đủ `app`/`district_transfer`; cần điều chỉnh theo mục 4.2.
- Inspection/Establishment/checklist/recommendation đã có trong `src/modules/inspections/` và Prisma; cần đóng các gap của PS-E1-007, UI mới và adapter map/evidence.
- CivicOS hiện chưa có module `Subject`/`SubjectManagementRecord` và chưa có MapLibre workspace; đây là phần mới của tranche.

## 4. Luồng và AC theo story

### 4.1. PS-E1-004 — Quản lý Cư dân Đặc biệt

#### Luồng

1. Nhận hồ sơ từ CA huyện, cơ sở lưu trú hoặc nguồn nghiệp vụ khác.
2. Tạo/cập nhật `Subject` và `SubjectManagementRecord` theo loại: tạm trú dài hạn, người nước ngoài, tái hòa nhập.
3. Trưởng CA xã tạo `Assignment` cho cán bộ phụ trách.
4. Cán bộ ghi nhận hoạt động theo dõi hàng tháng trên web; `nextCheck` và cảnh báo được cập nhật.
5. Biến động, nguy cơ bỏ trốn hoặc vi phạm tạo `DomainEvent` và thông báo CA huyện theo quyền.
6. Cuối tháng tạo `PeriodicReport` tối giản, đóng băng thành `ReportSnapshot` khi phê duyệt/gửi.

#### Acceptance Criteria

- 100% cư dân đặc biệt được đăng ký trong 24 giờ.
- Đối tượng tái hòa nhập có ít nhất một lần gặp/tháng.
- Người nước ngoài lưu trú được báo CA huyện ngay ngày đến.
- Không để đối tượng nguy hiểm cư trú mà không biết.
- Báo cáo CA huyện đúng hạn mỗi tháng.
- Mọi hoạt động theo dõi có Actor, thời gian, Assignment và Evidence nếu có.
- Mobile chỉ tra cứu bản ghi, hoạt động và map; không tạo write flow mới.

### 4.2. PS-E1-005 — Ghi nhận và Theo dõi Tố giác

#### Luồng

1. Cán bộ trực ban nhập `IntakeReport` trên web, bắt buộc `sourceChannel`.
2. Hệ thống lưu danh tính ở vùng bảo vệ; list/detail mặc định chỉ hiển thị mã đã mask.
3. Cán bộ phân loại: đủ cơ sở điều tra hoặc cần xác minh thêm.
4. Xác minh ban đầu trong 48 giờ, cập nhật Evidence và kết quả.
5. Giữ semantics source cho status `RECEIVED`, `VERIFIED`, `PROCESSED`, `CLOSED`, `REJECTED`.
6. Khi cán bộ xác nhận/convert, tạo `Incident` từ event/report tương ứng; không tạo tự động ngay khi nhập.
7. Nếu vượt thẩm quyền, tạo transfer tới `OrganizationUnit` cấp huyện.
8. Gửi kết quả cho người tố giác trong 20 ngày qua adapter notification.

#### Acceptance Criteria

- Ghi nhận 100% tin tố giác trong 24 giờ.
- Danh tính người tố giác được bảo vệ tuyệt đối theo role/masking/audit.
- Xác minh ban đầu trong 48 giờ.
- Thông báo kết quả trong 20 ngày.
- Không bỏ sót tin có cơ sở.
- Chỉ thao tác web cán bộ trong MVP; chưa có public citizen app.

#### Semantics source cần giữ

- Source lưu report trong event/report data và có các thao tác verify/process/close/reject.
- `POST /api/incidents` của source xác nhận event `detected → open`, gọi tạo/ghép case và phát thông báo `incident created`.
- Clone giữ semantics này, nhưng dùng `IntakeReport`/`Incident` rõ ràng theo glossary CivicOS.

### 4.3. PS-E1-007 — Quản lý Cơ sở Kinh doanh Có Điều kiện

#### Luồng

1. Quản lý `RegulatedBusiness`: tên, chủ, địa chỉ, loại hình, giấy phép, risk và cán bộ phụ trách.
2. Tạo lịch kiểm tra định kỳ 6 tháng/lần; hỗ trợ kiểm tra đột xuất khi có dấu hiệu.
3. Chọn checklist version theo loại hình karaoke/bar/cầm đồ/game/khách sạn.
4. Tạo `Inspection`, ghi kết quả, GPS, ảnh và Evidence.
5. Tạo `InspectionFinding` cho từng vi phạm; tổng hợp `InspectionResult`.
6. Sinh `EnforcementRecommendation`; Trưởng CA phê duyệt, trả lại hoặc chuyển CA huyện.
7. Mọi vi phạm phải có trạng thái xử lý trong 7 ngày; không tự động phát hành quyết định pháp lý.
8. Hiển thị thống kê tỷ lệ đạt/nhắc nhở/vi phạm theo loại hình.

#### Acceptance Criteria

- 100% cơ sở được kiểm tra ít nhất 2 lần/năm.
- Có checklist chuẩn theo từng loại cơ sở.
- Biên bản có ảnh và GPS làm Evidence.
- Vi phạm được xử lý trong 7 ngày qua recommendation + approval/transfer.
- Có thống kê tỷ lệ đạt và vi phạm theo loại hình.
- Web là nơi tạo/cập nhật; mobile chỉ tra cứu dữ liệu liên quan trong MVP.

## 5. UI/UX boundary

- Web giữ flow source: map/workspace → list → detail → create/edit → activity/evidence → approval/report.
- Web dùng design system mới, không sao chép màu, typography hoặc styling source.
- Mobile giữ navigation và surface source cần thiết: auth, map, `RelatedInfo`, alarm/dispatch/task surfaces phù hợp; không thêm mobile write flow cho E1-004/E1-007.
- Loading, empty, error, success và permission-denied phải được thiết kế cho mọi màn có dữ liệu động.
- UI rubric trỏ tới `.scratch/civicos-e1-clone-mvp/ui/screen-XX.md`; Stitch visual validation chưa chạy được.

## 6. Ngoài phạm vi tranche này

- Public citizen app để tạo tố giác.
- Mobile write workflow mới cho E1-004/E1-007.
- Tích hợp thật VietGeoX/VBDLIS, LPR, SMS, FCM hoặc ký số; chỉ tạo adapter/mock contract.
- Full implementation của PS-E1-001, E1-002, E1-003, E1-006, E1-008, E1-009, E1-010; chỉ xây shared kernel/projection không khóa các story này.
- Quyết định xử phạt tự động hoặc kết luận pháp lý tự động.

## 7. Verification boundary

- UI textual specs đã được tạo trong `ui/screen-01` đến `ui/screen-13`.
- Google Stitch MCP không khả dụng trong phiên thiết kế nên chưa có visual link/design-viewer pass. Chấp nhận textual UI specs làm baseline của ticket; khi MCP khả dụng, Reviewer có thể yêu cầu đối chiếu visual trước khi chấm rubric UI.

## 8. Tài liệu/source tham chiếu

- Nghiệp vụ/AC: `D:\Project\news-map-main\news-map-main\PS-E1-001_to_010_DayDu.md#PS-E1-004`, `#PS-E1-005`, `#PS-E1-007`.
- Domain vocabulary: `CONTEXT.md`.
- Resident source API/data: `backend/src/routes/forces/layer/residents.ts`, `backend/src/data/force/residentData/residentData.ts`.
- Business source API/data: `backend/src/routes/forces/layer/businesses.ts`, `backend/src/types/record.types.ts`.
- Report/Incident source flow: `backend/src/services/reports/reports.service.ts`, `backend/src/routes/case/incidents.ts`.
- Mobile read-only source: `mobile/src/features/related-info/relatedInfoApi.ts`, `mobile/src/features/related-info/types.ts`, `mobile/src/navigation/AppNavigator.tsx`.

## 9. Hợp đồng triển khai tự động

- Planner bắt buộc chạy ticket `00-agent-preflight-permissions-infra` trước các ticket còn lại.
- Developer chỉ sửa đúng file/folder được ticket cụ thể liệt kê; không tự mở rộng sang `.env`, secrets, CI/CD, permission policy, `.scratch` hoặc source repo bên ngoài.
- Mọi dependency mới phải có package/version/license/reason/command và approval trước khi cài. Không tự dùng `npm install <package>`, `pip install <package>`, `winget`, `choco` hoặc `scoop`.
- Mọi thiếu hụt Docker/DB/SDK/network/tile data/port phải trở thành `needs-info` và được hỏi theo batch; không tự thay đổi AC hoặc dùng fixture để giả đạt AC.
- Tester chạy theo thứ tự tối thiểu:
  1. `npm run prisma:generate`
  2. `npm run typecheck`
  3. `npm run lint`
  4. `npm run format:check`
  5. `npm test`
  6. `npm run test:e2e`
  7. `npm run build`
  8. mobile build/test nếu ticket 05 được cấp native SDK.
- Integration cần Docker PostgreSQL và worker healthy; không coi pass nếu `/api/health/worker` chưa healthy.
- Mỗi ticket phải có regression/integration test cho AC của mình, `.brain/evidence/<ticket-id>/changes.md`, `tests.md`, `review.md` và `files-changed.md` theo workflow.
- “Không cần con người can thiệp” chỉ được tuyên bố sau khi ticket 00 kết luận mọi quyền/hạ tầng/dependency cần thiết đã `PASS` hoặc `APPROVED`; trước thời điểm đó agent phải dừng đúng boundary và hỏi, không tự quyết định.
