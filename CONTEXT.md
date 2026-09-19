# CivicOS ANTT Domain

Ngữ cảnh nghiệp vụ của CivicOS cho Công an xã Nghĩa Trụ: tiếp nhận và xử lý vụ việc, quản lý các đối tượng cần theo dõi, tác nghiệp hiện trường, điều hành địa bàn và báo cáo lên đơn vị cấp trên.

## Language

### Tiếp nhận và xử lý vụ việc

**IntakeReport**:
Tin được tiếp nhận từ người dân hoặc một kênh đầu vào khác, trước khi được xử lý như một vụ việc nội bộ.
_Avoid_: Incident, PeriodicReport, báo cáo định kỳ.

**Incident**:
Vụ việc nội bộ cần được Công an xã phân loại, xác minh, chuyển tiếp hoặc kết thúc xử lý.
_Avoid_: IntakeReport, tình huống khi chỉ đang nói về một cập nhật hiện trường.

**FieldUpdate**:
Cập nhật diễn biến của một Incident từ hiện trường, có thể gồm mô tả, thời điểm, vị trí và bằng chứng.
_Avoid_: IncidentStatus, sự kiện hệ thống.

**Evidence**:
Tài liệu, ảnh hoặc dữ liệu vị trí gắn với một hoạt động nghiệp vụ và được bảo toàn nguồn gốc để phục vụ xác minh hoặc kiểm tra.
_Avoid_: Attachment khi tệp có giá trị chứng cứ.

### Chủ thể và quyền truy cập

**User**:
Tài khoản được xác thực để sử dụng hệ thống.
_Avoid_: Actor, Subject.

**Actor**:
Người hoặc hệ thống thực hiện một hành động nghiệp vụ; danh tính và vai trò của Actor được ghi lại trong sự kiện.
_Avoid_: User khi hành động do hệ thống hoặc nguồn dữ liệu tự động thực hiện.

**Subject**:
Người hoặc tổ chức là đối tượng của hồ sơ nghiệp vụ và không mặc nhiên có tài khoản truy cập hệ thống.
_Avoid_: User, Actor.

**SubjectManagementRecord**:
Hồ sơ nghiệp vụ theo một mục đích quản lý cụ thể của một Subject, có vòng đời và quyền truy cập riêng mà không làm thay đổi định danh Subject dùng chung.
_Avoid_: ManagedSubject, hồ sơ Subject dùng chung cho mọi mục đích.

**Assignment**:
Việc Trưởng Công an xã phân công một hoặc nhiều User thực hiện một nhiệm vụ cụ thể trên một hồ sơ; Assignment cấp quyền truy cập cần thiết cho nhiệm vụ đó, không cấp quyền xem toàn bộ dữ liệu của đơn vị.
_Avoid_: chia sẻ hồ sơ, quyền theo phòng ban.

**OrganizationUnit**:
Đơn vị trong cấu trúc tổ chức và là nơi thực hiện hoặc tiếp nhận nghiệp vụ; cấp và tên hiển thị của đơn vị cấp trên phải cấu hình được.
_Avoid_: hard-code CA huyện.

### Lịch sử nghiệp vụ

**DomainEvent**:
Sự kiện bất biến mô tả một thay đổi nghiệp vụ đã xảy ra, được phát hành để xây dựng các projection, thông báo và luồng xử lý tiếp theo.
_Avoid_: AuditEvent khi sự kiện chỉ ghi nhận truy cập hoặc thay đổi phục vụ tuân thủ.

**AuditEvent**:
Bản ghi bất biến về việc ai đã đọc hoặc thay đổi dữ liệu, đặc biệt là dữ liệu nhạy cảm, nhằm phục vụ truy vết và tuân thủ.
_Avoid_: DomainEvent.

**PeriodicReport**:
Báo cáo tuần, tháng hoặc quý được tổng hợp từ dữ liệu nghiệp vụ và gửi cho OrganizationUnit cấp trên.
_Avoid_: IntakeReport, Incident.

**ReportSnapshot**:
Phiên bản bất biến của PeriodicReport tại thời điểm được phê duyệt hoặc gửi đi; thay đổi dữ liệu nguồn sau đó không làm thay đổi snapshot.
_Avoid_: projection báo cáo, bản xem trước.

**VehicleObservation**:
Ghi nhận một phương tiện được quan sát tại một thời điểm và địa điểm cụ thể, có thể được liên kết với một Incident hoặc đối chiếu với SuspiciousVehicleRegistry.
_Avoid_: Incident khi chưa có vụ việc cần xử lý.

**SuspiciousVehicleRegistry**:
Danh mục các biển số hoặc phương tiện cần chú ý, mỗi mục có nguồn, lý do, thời hạn hiệu lực và trạng thái xác minh.
_Avoid_: VehicleObservation, kết luận phương tiện đang khả nghi.

**Inspection**:
Một lần kiểm tra nghiệp vụ đối với cơ sở kinh doanh có điều kiện, gồm checklist, kết quả và Evidence liên quan.
_Avoid_: FieldUpdate.

**InspectionResult**:
Kết quả tổng quát của một Inspection, gồm đạt, nhắc nhở hoặc có dấu hiệu không đạt.
_Avoid_: kết luận xử phạt.

**InspectionFinding**:
Phát hiện cụ thể trong một Inspection, được chứng minh bằng mục checklist và Evidence liên quan.
_Avoid_: EnforcementRecommendation.

**EnforcementRecommendation**:
Đề xuất xử lý phát sinh từ InspectionFinding, chờ Approval trước khi trở thành quyết định nghiệp vụ.
_Avoid_: kết luận pháp lý tự động, SanctionDecision.

**Hotspot**:
Một vùng địa lý được theo dõi vì có mức độ hoặc xu hướng vụ việc bất thường, có lịch sử và thời hạn riêng.
_Avoid_: GeoArea khi vùng chưa có ý nghĩa nghiệp vụ.

**GeoPoint**:
Vị trí điểm theo hệ tọa độ chuẩn của CivicOS.
_Avoid_: địa chỉ khi cần vị trí để phân tích không gian.

**GeoArea**:
Vùng địa lý dạng polygon theo hệ tọa độ chuẩn, thường dùng để biểu diễn phạm vi Hotspot.
_Avoid_: Hotspot khi chỉ mô tả hình học.

### Cam kết thời hạn

**SLA**:
Thời hạn xử lý nghiệp vụ bắt đầu từ DomainEvent kích hoạt và tiếp tục chạy liên tục, bao gồm cuối tuần và ngày lễ; ngưỡng thời hạn được cấu hình theo loại nghiệp vụ.
_Avoid_: hạn xử lý chỉ tính theo ngày làm việc.

**Approval**:
Quyết định của Trưởng Công an xã cho phép một bước nghiệp vụ có thẩm quyền cao, như chuyển Incident lên đơn vị cấp trên hoặc đóng kết quả xử lý.
_Avoid_: cập nhật trạng thái thông thường.
