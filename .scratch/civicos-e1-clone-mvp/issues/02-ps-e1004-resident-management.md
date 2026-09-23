# PS-E1-004 — Quản lý Cư dân Đặc biệt

- **Status:** ready-for-agent
- **Blocked by:** 00, 01
- **File được phép sửa:**
  - `src/modules/residents/**`
  - `src/app/residents/**`
  - `src/app/api/residents/**`
  - `src/app/api/reports/**`
  - `src/components/residents/**`
  - `src/components/navigation/feature-registry.ts`
  - `prisma/schema.prisma`
  - `prisma/migrations/**`
  - `tests/residents/**`
  - `tests/**` khi cần sửa integration liên quan
- **File cấm sửa:**
  - `.env`, `.env.*`
  - `.brain/**` — ngoại trừ `.brain/evidence/02-ps-e1004-resident-management/**` theo role
  - `node_modules/**`
  - `**/secrets/**`

## Mô tả

Thêm domain/module `Subject` và `SubjectManagementRecord` cho tạm trú dài hạn, người nước ngoài và tái hòa nhập. Một `Subject` được có nhiều record; mỗi record có vòng đời, Assignment, lịch gặp, activity/Evidence và báo cáo tháng tối giản bằng `PeriodicReport`/`ReportSnapshot`. Web là nơi ghi dữ liệu; mobile chỉ đọc theo ticket 05.

## Acceptance Criteria (bắt buộc — chặn done, PASS 100%)

- [x] Có CRUD/list/detail cho `Subject` và nhiều `SubjectManagementRecord` theo loại quản lý.
- [x] Có Assignment cho cán bộ phụ trách; người không thuộc Assignment/OrganizationUnit không xem được hồ sơ ngoài scope.
- [x] Có ghi nhận hoạt động theo dõi hàng tháng gồm Actor, thời điểm, nội dung, đánh giá, vị trí và Evidence nếu có.
- [x] `nextCheck`, overdue và cảnh báo được cập nhật sau hoạt động checkup.
- [x] Có luồng tiếp nhận hồ sơ từ CA huyện/cơ sở lưu trú; người nước ngoài được đánh dấu cần báo ngay trong ngày.
- [x] Có cảnh báo khi hồ sơ nguy cơ cao bỏ trốn/vi phạm và ghi nhận việc chuyển tới OrganizationUnit cấp trên.
- [x] Có PeriodicReport tháng gồm danh sách cư dân đặc biệt, trạng thái theo dõi, đúng hạn/quá hạn và snapshot bất biến khi phê duyệt/gửi.
- [x] Đáp ứng AC PS-E1-004: đăng ký trong 24 giờ, gặp tái hòa nhập ít nhất 1 lần/tháng, báo người nước ngoài trong ngày, không bỏ sót nguy cơ cao, báo cáo đúng hạn.
- [x] Có loading, empty, error/retry, permission-denied và masked-field state trên các màn web.
- [x] Không tạo write CTA E1-004 trên mobile.
- [x] Các loại record seed tối thiểu là `temporary_resident`, `foreign_resident`, `reintegration`; enum/contract không dùng tên địa danh làm type.
- [x] Có idempotency cho create activity/report và optimistic/version check khi cập nhật record.

## Rubric (mức độ đạt)

### Bắt buộc (chặn done — phải PASS 100%, Reviewer chấm như Acceptance Criteria)

- [x] `Subject` không bị dùng thay cho `User`/`Actor`; mỗi record có mục đích quản lý và quyền riêng, nguồn: `CONTEXT.md#35-subject` và `CONTEXT.md#39-subjectmanagementrecord`.
- [x] Assignment chỉ cấp quyền cần thiết, nguồn: `CONTEXT.md#43-assignment` và `spec.md#32-hồ-sơ-nghiệp-vụ`.
- [x] Report snapshot không đổi khi dữ liệu nguồn thay đổi sau phê duyệt, nguồn: `CONTEXT.md#65-reportsnapshot`.
- [x] PII/field nhạy cảm phải qua capability `read_sensitive` và có AuditEvent khi truy cập, nguồn: `spec.md#26-bảo-mật-và-tích-hợp`.

### Khuyến nghị (không chặn done, chỉ ghi nhận — trừ khi dưới ngưỡng tối thiểu)

| Trục | Mô tả kỳ vọng | Thang điểm | Ngưỡng tối thiểu |
|---|---|---|---|
| Thiết kế/UI | Bám screen-02, screen-03, screen-04 và screen-10; Stitch chưa khả dụng nên textual spec là baseline | 0–2 | 1 |
| Thao tác/UX | List → detail → activity → report không mất context, có cảnh báo SLA rõ | 0–2 | 1 |
| Quy trình | Đúng B1–B7 và AC PS-E1-004, không hard-code địa bàn | 0–2 | 1 |

## Các bước thực hiện

- [x] Thiết kế Prisma model/migration cho Subject, SubjectManagementRecord, activity và report snapshot.
- [x] Implement commands, transitions, DomainEvent, projection, SLA và authorization.
- [x] Implement API list/detail/create/update/activity/report/approval.
- [x] Implement web route/component theo screen-02 đến screen-04 và screen-10.
- [x] Thêm seed synthetic cho ba loại cư dân và các trạng thái đúng hạn/quá hạn.
- [x] Viết unit/integration/API/UI tests cho AC, masking, Assignment, SLA và snapshot.
- [x] Chạy migration trên database test được ticket 00 duyệt, rồi chạy `npm run prisma:generate`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run test:e2e` và `npm run build`.

## Hợp đồng triển khai

### Write model tối thiểu

- `Subject`: `id`, `displayName`, `subjectType`, `sensitiveProfile`, `status`, `latitude`, `longitude`, `createdAt`, `updatedAt`.
- `SubjectManagementRecord`: `id`, `subjectId`, `purpose`, `riskLevel`, `status`, `assignedOrganizationId`, `nextCheckAt`, `sourceOrganizationId`, `createdAt`, `updatedAt`, `version`.
- `SubjectManagementActivity`: `id`, `recordId`, `activityType`, `occurredAt`, `content`, `evaluation`, `latitude`, `longitude`, `actorId`, `assignmentId`, `evidenceIds`, `idempotencyKey`.
- `PeriodicReport`/`ReportSnapshot`: scope OrganizationUnit, period, source record IDs, aggregate counts, approval/send state và immutable payload.

### HTTP surface tối thiểu

- `GET /api/residents`, `POST /api/residents`, `GET/PATCH /api/residents/:subjectId`.
- `GET/POST /api/residents/:subjectId/management-records`.
- `GET/POST /api/residents/:subjectId/management-records/:recordId/activities`.
- `GET/POST /api/residents/reports/monthly`, `POST /api/residents/reports/:reportId/approve`, `POST /api/residents/reports/:reportId/send`.
- List/detail response phải áp dụng masking và scope trước khi serialize; không trả raw encrypted PII cho client không có capability.

### Domain events tối thiểu

`SubjectRegistered`, `SubjectManagementRecordCreated`, `SubjectAssigned`, `SubjectActivityRecorded`, `SubjectRiskRaised`, `SubjectTransferred`, `PeriodicReportGenerated`, `PeriodicReportApproved`.

## Đang chờ Research

Không.

## Trạng thái cuối

pending
