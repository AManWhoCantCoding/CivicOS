# Feature list — CivicOS clone PS-E1 MVP

## Tranche đã chốt

- Nền tảng tối thiểu: auth/RBAC, OrganizationUnit, Assignment, Evidence, SLA, DomainEvent, AuditEvent, map projection/realtime.
- PS-E1-004: quản lý Cư dân Đặc biệt.
- PS-E1-005: ghi nhận và theo dõi IntakeReport/Incident; cán bộ trực ban trên web.
- PS-E1-007: quản lý cơ sở kinh doanh có điều kiện, Inspection và Recommendation.
- Mobile: auth/main/map, RelatedInfo read-only và alarm/dispatch/task read-only; không có mobile write flow mới.

## Loại khỏi MVP

- Public citizen app, provider map chính thức, SMS/FCM/LPR thật, chữ ký số và dữ liệu/credential thật.
- Không tạo các aggregate POI/Hotspot/Violation/Dispatch/Task/Camera/Vehicle mới ngoài model hiện có.

## UI baseline

- Web flow dùng workspace/map → list → detail → create/edit → Evidence → approval/report.
- Mobile dùng textual handoff `ui/` và giữ masking/permission/offline state.
