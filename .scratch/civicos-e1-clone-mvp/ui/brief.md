# UI Brief: CivicOS clone PS-E1 MVP

## Danh sách màn hình

### Web

1. **CivicOS workspace/map** — shell chung, map OSS và lớp marker/geometry nghiệp vụ.
2. **Danh sách Cư dân đặc biệt** — tìm kiếm, lọc theo loại/trạng thái, lịch `nextCheck` và cảnh báo quá hạn.
3. **Chi tiết Subject và hồ sơ quản lý** — thông tin định danh được mask theo role, Assignment, activity log và Evidence.
4. **Tạo/cập nhật hoạt động theo dõi** — ghi nhận gặp hàng tháng, biến động, đánh giá, ảnh/tài liệu và vị trí.
5. **Hàng đợi IntakeReport** — tiếp nhận, lọc SLA, source channel, trạng thái và mức độ nhạy cảm.
6. **Chi tiết IntakeReport** — phân loại, xác minh, Evidence, chuyển đơn vị và hành động tạo Incident.
7. **Danh sách cơ sở kinh doanh** — loại hình, risk, lịch kiểm tra, lần kiểm tra gần nhất và vi phạm.
8. **Inspection workspace** — checklist theo loại hình, kết quả, ảnh/GPS, Evidence và findings.
9. **Enforcement recommendation/approval** — đề xuất xử lý, phê duyệt, trả lại hoặc chuyển CA huyện.
10. **PeriodicReport preview** — báo cáo tháng E1-004, snapshot, phê duyệt và gửi OrganizationUnit cấp trên.

### Mobile

11. **Mobile auth/main/map** — giữ navigation source, map và trạng thái định vị.
12. **RelatedInfo read-only** — tra cứu Resident/Business/Hotspot/Violation trên map và list/detail sheet.
13. **Alarm/dispatch/task surface** — chỉ giữ các surface source cần cho Incident/field context; không thêm write flow E1-004/E1-007.

## Luồng chuyển màn hình

### Web

```text
Workspace/map
  → Cư dân đặc biệt
  → Chi tiết Subject
  → Tạo hoạt động theo dõi
  → Gắn Evidence
  → PeriodicReport preview
  → Approval/gửi OrganizationUnit
```

```text
Workspace/map
  → IntakeReport queue
  → IntakeReport detail
  → Verify/reject/process
  → Create Incident hoặc transfer
  → Theo dõi SLA/notification
```

```text
Workspace/map
  → Business list
  → Inspection schedule
  → Inspection workspace
  → Finding/Evidence
  → Enforcement recommendation
  → Approval/transfer
```

### Mobile

```text
Login
  → Main tabs
  → Map hoặc RelatedInfo
  → Filter lớp dữ liệu
  → List/detail read-only
```

## Component bắt buộc theo từng màn

### CivicOS workspace/map

- Navigation shell và `OrganizationUnit` context.
- MapLibre map, layer toggle, legend, marker point và polygon.
- Search/filter bar, realtime update indicator.
- Attribution OSM và trạng thái offline basemap.

### Danh sách/chi tiết Cư dân đặc biệt

- Search, filter loại cư dân, trạng thái, cán bộ phụ trách.
- Calendar/schedule theo `nextCheck` và overdue indicator.
- Masked identity, permission-aware fields.
- Assignment summary, activity timeline, Evidence preview.
- CTA tạo hoạt động theo dõi và tạo báo cáo tháng.

### Hoạt động theo dõi

- Form nội dung, tình hình, đánh giá, ngày/giờ.
- Auto location/GPS nếu được cấp quyền.
- Upload ảnh/tài liệu với Evidence metadata.
- Chọn Assignment/SubjectManagementRecord.
- Save draft/submit và confirmation.

### IntakeReport queue/detail

- SLA timer, sourceChannel, severity và status chip.
- Masked reporter identity; reveal action chỉ khi role được phép.
- Classification, verification notes, Evidence.
- CTA create Incident, reject, process, close, transfer.
- Audit history và notification result.

### Business/Inspection

- Business type/risk/status filters.
- Schedule calendar 6 tháng/lần và overdue state.
- Checklist version rõ ràng, section progress.
- Finding severity/category, ảnh/GPS Evidence.
- Result summary, recommendation status và approval actions.

### PeriodicReport

- Snapshot preview, số liệu nguồn và danh sách đối tượng.
- Validation thiếu dữ liệu trước khi submit.
- Approval state, send target OrganizationUnit và immutable snapshot notice.

### Mobile RelatedInfo

- Search debounce, layer tabs, filter sheet.
- Map/list bottom sheet và detail sheet.
- Read-only masking theo quyền.
- Polygon Hotspot và point markers.
- Không hiển thị CTA tạo/cập nhật E1-004/E1-007.

## Trạng thái bắt buộc thể hiện

- [x] Loading
- [x] Empty (không có dữ liệu)
- [x] Error/retry
- [x] Success/mặc định
- [x] Permission denied/masked data
- [x] Offline basemap / online-required write
- [x] SLA warning/overdue
- [x] Unsaved changes/submit confirmation
- [x] Approval pending/approved/rejected/transferred

## Tham chiếu nghiệp vụ

- Phạm vi và quyết định chung: `../spec.md#2-quyết-định-đã-chốt`.
- Domain model: `../spec.md#3-domain-model`.
- E1-004: `../spec.md#41-ps-e1-004--quản-lý-cư-dân-đặc-biệt`.
- E1-005: `../spec.md#42-ps-e1-005--ghi-nhận-và-theo-dõi-tố-giác`.
- E1-007: `../spec.md#43-ps-e1-007--quản-lý-cơ-sở-kinh-doanh-có-điều-kiện`.
- UI boundary: `../spec.md#5-uiux-boundary`.
