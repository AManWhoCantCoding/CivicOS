# Thuật ngữ: civicos-e1-clone-mvp

> Nguồn chính: `CONTEXT.md` (ngôn ngữ nghiệp vụ chuẩn của repo). Bổ sung thuật ngữ mới khi grilling.

| Thuật ngữ                         | Định nghĩa                                                                                                          | Tránh gọi nhầm là                                       | Nguồn      |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ---------- |
| IntakeReport                      | Tin được tiếp nhận từ người dân hoặc kênh đầu vào khác, trước khi xử lý thành vụ việc nội bộ                        | Incident, PeriodicReport, báo cáo định kỳ               | CONTEXT.md |
| Incident                          | Vụ việc nội bộ cần Công an xã phân loại, xác minh, chuyển tiếp hoặc kết thúc xử lý                                  | IntakeReport; "tình huống" khi nói cập nhật hiện trường | CONTEXT.md |
| FieldUpdate                       | Cập nhật diễn biến của Incident từ hiện trường (mô tả, thời điểm, vị trí, bằng chứng)                               | IncidentStatus, sự kiện hệ thống                        | CONTEXT.md |
| Evidence                          | Tài liệu/ảnh/dữ liệu vị trí gắn hoạt động nghiệp vụ, bảo toàn nguồn gốc để xác minh                                 | "Attachment" khi tệp có giá trị chứng cứ                | CONTEXT.md |
| User                              | Tài khoản được xác thực để sử dụng hệ thống                                                                         | Actor, Subject                                          | CONTEXT.md |
| Actor                             | Người hoặc hệ thống thực hiện hành động nghiệp vụ; danh tính + vai trò ghi trong sự kiện                            | User khi hành động do hệ thống tự động thực hiện        | CONTEXT.md |
| Subject                           | Người/tổ chức là đối tượng hồ sơ nghiệp vụ, không mặc nhiên có tài khoản                                            | User, Actor                                             | CONTEXT.md |
| SubjectManagementRecord           | Hồ sơ theo một mục đích quản lý cụ thể của Subject; có vòng đời + quyền truy cập riêng, không đổi định danh Subject | hồ sơ "cá nhân" chung chung                             | CONTEXT.md |
| Assignment                        | Phân công cụ thể, cấp quyền tối thiểu cho nhiệm vụ                                                                  | "phân vai" chung                                        | CONTEXT.md |
| OrganizationUnit                  | Đơn vị thực hiện/tiếp nhận nghiệp vụ (cấu hình được, không hard-code tên)                                           | "phòng ban" cứng                                        | spec 2.3   |
| DomainEvent                       | Bản ghi bất biến của thay đổi nghiệp vụ (projection, notification, realtime)                                        | entity `Event` generic gom mọi nghiệp vụ                | spec 2.4   |
| AuditEvent                        | Bản ghi truy vết đọc/thay đổi dữ liệu phục vụ tuân thủ                                                              | DomainEvent                                             | spec 2.4   |
| SLA                               | Deadline tính liên tục theo ngưỡng cấu hình (24h/48h/7 ngày/20 ngày...)                                             | "hạn chế" cố định                                       | spec 3.1   |
| EnforcementRecommendation         | Đề xuất xử lý từ finding, chờ Approval; không tự động kết luận pháp lý                                              | "quyết định xử phạt"                                    | spec 3.2   |
| ReportSnapshot                    | Phiên bản bất biến của báo cáo khi phê duyệt/gửi                                                                    | bản nháp có thể sửa                                     | spec 3.2   |
| Masking                           | Che dữ liệu nhạy cảm theo role; mặc định list/detail chỉ trả mã masked                                              | "ẩn cột" ở UI                                           | spec 2.6   |
| convert (IntakeReport → Incident) | Hành động cán bộ xác nhận đủ cơ sở điều tra, tạo Incident từ report (semantics source: detected → open)             | việc tự động khi nhập                                   | spec 4.2   |
