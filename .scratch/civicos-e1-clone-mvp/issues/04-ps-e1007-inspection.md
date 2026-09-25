# PS-E1-007 — Kiểm tra Cơ sở Kinh doanh Có Điều kiện

- **Status:** done
- **Blocked by:** 00, 01
- **Loại:** feature
- **Gate hướng:** có
- **File được phép sửa:**
  - `src/modules/inspections/**`
  - `src/modules/eventing/event-catalog.ts`
  - `src/app/inspections/**`
  - `src/app/api/establishments/**`
  - `src/app/api/inspections/**`
  - `src/app/api/sync/route.ts`
  - `src/app/api/evidence/**`
  - `src/components/inspections/**`
  - `src/components/navigation/feature-registry.ts`
  - `prisma/schema.prisma`
  - `prisma/migrations/**`
  - `tests/inspections/**`
  - `tests/**` khi cần sửa integration liên quan
- **File cấm sửa:**
  - `.env`, `.env.*`
  - `.brain/**` — ngoại trừ `.brain/evidence/04-ps-e1007-inspection/**` theo role
  - `node_modules/**`
  - `**/secrets/**`

## Quyết định nghiệp vụ đã xác nhận

- Người dùng chọn **“Mở rộng scope”**: cho phép sửa `src/modules/eventing/event-catalog.ts`, chỉ thêm `EnforcementTransferred` và giữ nguyên semantics của các event khác.
- Người dùng xác nhận **“Chấp thuận mở rộng scope”**: cho phép sửa `src/app/api/sync/route.ts` để giữ nguyên `severity`/`category`/`evidence` của `InspectionFinding` trong offline sync. Đây là boundary kỹ thuật có rủi ro ảnh hưởng shared sync; fallback không sửa file này sẽ không đạt AC traceability.

## Mô tả

Hoàn thiện module Inspection/Establishment đã có trong CivicOS để đạt đầy đủ PS-E1-007: danh mục cơ sở, lịch 6 tháng/lần, checklist theo loại hình, GPS/photo Evidence, finding/result, recommendation và Approval/transfer trong 7 ngày. Không tự động phát hành quyết định pháp lý.

## Acceptance Criteria (bắt buộc — chặn done, PASS 100%)

- [x] Có CRUD/list/detail cơ sở với tên, chủ, địa chỉ, loại hình, giấy phép, tọa độ, risk và trạng thái.
- [x] Có lịch kiểm tra mặc định 6 tháng/lần, bảo đảm mỗi cơ sở được lập tối thiểu 2 lần/năm; có overdue view.
- [x] Checklist template/version được chọn theo loại hình; item bắt buộc được validate trước complete.
- [x] `Inspection` có transition `scheduled → in_progress → completed`; không cho skip hoặc sửa completed trái phép.
- [x] Finding gắn với checklist key, result và Evidence IDs.
- [x] Evidence lưu ảnh/tài liệu cùng GPS capture/received metadata qua Evidence service hiện có.
- [x] Có `InspectionResult`: đạt, nhắc nhở hoặc cần xử lý.
- [x] Có `EnforcementRecommendation` pending/approved/rejected/transfer; Trưởng CA phê duyệt hoặc chuyển CA huyện, không tự động tạo kết luận pháp lý.
- [x] Vi phạm có SLA xử lý 7 ngày, overdue event/notification và audit.
- [x] Có thống kê tỷ lệ đạt/nhắc nhở/vi phạm theo loại hình.
- [x] Event catalog đăng ký `EnforcementTransferred`; semantics của các event hiện có không thay đổi.
- [x] Web là nơi ghi dữ liệu; mobile chỉ read-only theo ticket 05.
- [x] Có loading, empty, error/retry, permission-denied, offline-write guard, unsaved changes và approval states.
- [x] Lịch default 6 tháng/lần không cho cadence nhỏ hơn policy nếu không có quyền command phù hợp; phải có test chứng minh tối thiểu 2 lần/năm.
- [x] Evidence requirement được enforce ở domain/API và reject complete nếu checklist item yêu cầu evidence nhưng thiếu Evidence ID.

## Rubric (mức độ đạt)

### Bắt buộc (chặn done — phải PASS 100%, Reviewer chấm như Acceptance Criteria)

- [x] `Inspection` không bị dùng thay cho `FieldUpdate`; Evidence và finding giữ quan hệ truy vết, nguồn: `CONTEXT.md#77-inspection` và `CONTEXT.md#85-inspectionfinding`.
- [x] `EnforcementRecommendation` chỉ trở thành kết quả được chấp thuận sau Approval, nguồn: `CONTEXT.md#89-enforcementrecommendation` và `spec.md#43-ps-e1-007--quản-lý-cơ-sở-kinh-doanh-có-điều-kiện`.
- [x] Checklist required/evidence-required được enforce ở domain/API, không chỉ ở form, nguồn: `src/modules/inspections/domain.ts`.
- [x] Quyền fieldwork/approve và OrganizationUnit scope được enforce ở API, nguồn: `src/modules/identity/authorization.ts` và `spec.md#26-bảo-mật-và-tích-hợp`.

### Khuyến nghị (không chặn done, chỉ ghi nhận — trừ khi dưới ngưỡng tối thiểu)

| Trục | Mô tả kỳ vọng | Thang điểm | Ngưỡng tối thiểu |
|---|---|---|---|
| Thiết kế/UI | Bám screen-07, screen-08 và screen-09; Stitch chưa khả dụng nên textual spec là baseline | 0–2 | 1 |
| Thao tác/UX | Checklist có progress, evidence requirement và không mất form khi lỗi mạng | 0–2 | 1 |
| Quy trình | Đúng B1–B7 và AC PS-E1-007, có transfer/approval rõ | 0–2 | 1 |

## Các bước thực hiện

- [x] Audit current inspection module/tests theo AC PS-E1-007; giữ phần đã đạt, chỉ sửa gap.
- [x] Bổ sung transfer recommendation, 7-day SLA, statistics và Evidence GPS/photo nếu còn thiếu.
- [x] Hoàn thiện route/component theo screen-07 đến screen-09 và design tokens mới.
- [x] Thêm synthetic establishments/checklists cho karaoke, bar, cầm đồ, game, khách sạn.
- [x] Viết regression/integration tests cho cadence, transitions, required evidence, approval/transfer và SLA.
- [x] Chạy `npm run prisma:generate`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run test:e2e` và `npm run build`; inspection tests phải có trong log.

## Hợp đồng triển khai

### Canonical commands

- `POST /api/establishments`: register.
- `GET/PATCH /api/establishments/:establishmentId`: read/update trong OrganizationUnit scope.
- `POST /api/inspections`: schedule với `establishmentId`, `scheduledAt`, `cadenceMonths`, optional `assignedUserId`.
- `GET /api/inspections`: list/schedule/overdue; `GET /api/inspections/:inspectionId`: detail + template + findings + recommendations.
- `POST /api/inspections/:inspectionId/commands` với `start`, `save_checklist`, `finding`, `complete`, `submit_recommendation`, `approve`, `reject`, `transfer`.
- `POST /api/evidence`: Evidence phải gắn `resourceType/resourceId`, hash, mime/file metadata, capturedAt và GPS nếu có.

### State/event contract

- Inspection: `scheduled → in_progress → completed`.
- Result: `pass | reminder | needs_action`.
- Recommendation: `pending_approval → approved | rejected | transferred`.
- Event tối thiểu: `EstablishmentRegistered`, `EstablishmentUpdated`, `InspectionScheduled`, `InspectionStarted`, `InspectionChecklistSaved`, `InspectionFindingRecorded`, `InspectionCompleted`, `EnforcementRecommendationSubmitted`, `EnforcementApproved`, `EnforcementRejected`, `EnforcementTransferred`.
- SLA: `inspection_violation_resolution_7d`; overdue phải tạo event/notification và không được tự động đổi result pháp lý.

### Dữ liệu thống kê

- `GET /api/inspections/stats?from=&to=&establishmentType=` trả tổng cơ sở, số inspection, pass/reminder/needs_action, số recommendation theo status và tỷ lệ theo loại hình.
- Chỉ dữ liệu trong OrganizationUnit scope được tính; response có `generatedAt` và filter period để tái lập test.

## Đang chờ Research

Không.

## Trạng thái cuối

done

## Comments

- 2026-09-25 — Research hỏi một câu hỏi batch về boundary kỹ thuật của offline sync. Quyết định nguyên ý của người dùng: **“Chấp thuận mở rộng scope”**. Scope ticket được mở rộng để bao gồm `src/app/api/sync/route.ts`, với mục tiêu giữ nguyên `severity`/`category`/`evidence` của `InspectionFinding` trong offline sync.
