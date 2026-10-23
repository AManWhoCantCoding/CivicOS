# Thuật ngữ B6 — CivicOS E1 Business Parity

| Thuật ngữ | Định nghĩa chuẩn | Tránh gọi nhầm là | Nguồn |
|---|---|---|---|
| **Mobile parity** | Khả năng mobile thực hiện đúng capability nghiệp vụ được duyệt cho actor, không chỉ render một read projection và không có nghĩa mọi action offline. | Clone UI web; full parity mọi module | `mobile-capability-matrix.md` |
| **Capability** | Action/read scope mà server cho phép trong context role, OU, Assignment, resource state và policy. | Nút đang hiển thị; role label | DR-P-01 |
| **Assignment** | Phân công cụ thể cấp quyền tối thiểu cho nhiệm vụ/resource trong một OU và thời hạn/state xác định. | Phân vai chung; membership | `CONTEXT.md` |
| **OrganizationUnit (OU)** | Đơn vị tiếp nhận/thực hiện nghiệp vụ dùng để giới hạn scope và routing. | Tên xã hard-code; role | `CONTEXT.md` |
| **IntakeReport** | Tin được tiếp nhận từ người dân hoặc kênh đầu vào khác trước khi được xử lý thành Incident. | Incident; FieldUpdate; báo cáo định kỳ | `CONTEXT.md` |
| **Incident** | Vụ việc nội bộ cần phân loại, xác minh, chuyển tiếp hoặc kết thúc xử lý. | IntakeReport; tình huống chỉ là note hiện trường | `CONTEXT.md` |
| **FieldUpdate** | Cập nhật diễn biến Incident từ hiện trường, có thể gồm mô tả, thời điểm, vị trí và Evidence. | IncidentStatus; system event | `CONTEXT.md` |
| **Subject** | Người/tổ chức là đối tượng hồ sơ nghiệp vụ, không mặc nhiên có tài khoản. | User; Actor | `CONTEXT.md` |
| **SubjectManagementRecord** | Hồ sơ theo một purpose quản lý cụ thể của Subject, có vòng đời và quyền riêng. | Hồ sơ cá nhân chung | `civicos-e1-clone-mvp/glossary.md` |
| **Activity / checkup** | Ghi nhận một lần theo dõi/tác nghiệp trên ManagementRecord; checkup tái hòa nhập phải đáp ứng cadence tháng. | AuditEvent; comment UI | B6 DR-P-21 |
| **Establishment** | Cơ sở kinh doanh có điều kiện thuộc scope PS-E1-007. | Parcel Land; Incident | Business source E1-007 |
| **Inspection** | Một lần kiểm tra Establishment với lịch, template/version, checklist, finding và Evidence. | Checklist template; recommendation | B6 DR-P-40/41 |
| **Finding** | Kết quả/vi phạm/quan sát ghi nhận trong Inspection, có thể tạo EnforcementRecommendation. | Quyết định xử phạt | `civicos-e1-clone-mvp/glossary.md` |
| **EnforcementRecommendation** | Đề xuất xử lý từ Finding, chờ Approval và không tự kết luận pháp lý. | Sanction; quyết định hành chính | `civicos-e1-clone-mvp/glossary.md` |
| **Evidence** | Tài liệu, ảnh hoặc dữ liệu vị trí gắn với hoạt động nghiệp vụ và được bảo toàn nguồn gốc. | Attachment không provenance | `CONTEXT.md` |
| **Evidence provenance** | Metadata cho biết actor, resource, thời điểm, nguồn capture, hash/immutable và GPS nếu có. | Tên file; storage path | B6 DR-P-22/43 |
| **Protected identity** | Danh tính/contact nhạy cảm của người tố giác hoặc Subject cần policy reveal riêng. | Field có thể ẩn bằng CSS | B6 DR-P-32 |
| **Masking** | Projection che dữ liệu nhạy cảm theo role/policy ở server, áp dụng cả list/detail/notification/cache. | Ẩn cột chỉ ở UI | `civicos-e1-clone-mvp/glossary.md` |
| **Sensitive reveal** | Request online được policy cho phép để xem protected identity; phải re-authorize và audit. | Mở khóa local/offline | B6 DR-P-32 |
| **Source channel `app`** | Giá trị canonical của IntakeReport biểu thị kênh app; trong tranche này có thể được internal officer nhập khi có capability. | Public citizen app; public auth | B6 API §3 |
| **Local draft** | Dữ liệu người dùng đang soạn trên thiết bị, chưa được server chấp nhận và không được hiển thị như đã gửi. | Offline command đã commit | B6 DR-P-35 |
| **Offline command** | Command thuộc allowlist được lưu an toàn để gửi sau khi mất mạng. | Mọi POST khi offline | B6 API §5 |
| **Sync item** | Một offline command có clientCommandId, resource, version, payload policy và trạng thái đồng bộ. | Row domain đã commit | B6 API §5 |
| **`baseVersion`** | Phiên bản aggregate mà client đã đọc trước khi mutation; lệch phiên bản trả conflict. | Timestamp; optimistic UI flag | DR-P-03 |
| **`clientCommandId`** | Định danh ổn định của command phía client dùng cho idempotency qua retry/app restart. | Random request log ID | DR-P-03 |
| **Conflict** | Kết quả server từ chối ghi vì state/version/scope không còn khớp, cần refresh và quyết định lại. | Validation error; silent merge | DR-P-51 |
| **Rejected** | Sync/command bị từ chối dứt khoát do forbidden, invalid, revoked hoặc unsupported; không tự retry. | Failed network retryable | B6 NFR §4 |
| **ReportSnapshot** | Phiên bản bất biến của báo cáo tại thời điểm approve/send. | Draft report có thể sửa | `civicos-e1-clone-mvp/glossary.md` |
| **GPS capture theo action** | Lấy vị trí khi activity/verification/inspection yêu cầu, kèm provenance; không phải tracking liên tục. | PS-E3-003 continuous tracking | B6 DR-P-22/50 |
| **State grammar** | Bộ trạng thái trình bày chung: loading, empty, forbidden, masked, offline, stale, conflict, rejected, provider-error, success. | Một state machine dùng chung cho mọi domain | B5 council |
| **Land bounded context** | Boundary nghiệp vụ riêng của Land với internal/public/mobile projection và contract riêng. | Extension của Residents/Inspection | `docs/land-module/**` |
| **Structural removal** | Workstream xóa toàn bộ capability PS-E1-009/Vehicle và reference liên quan, bao gồm data/migration/history. | Ẩn menu; archive một bảng | `change-contract.md` |
