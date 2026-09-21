# 05: PS-E1-007 Inspection cơ sở kinh doanh

**What to build:** Cung cấp vertical slice quản lý cơ sở kinh doanh có điều kiện từ catalog, lịch kiểm tra, checklist theo loại hình, Inspection thực địa, InspectionFinding, Evidence, EnforcementRecommendation và Approval.

**Blocked by:** 01: Event kernel và transactional outbox; 02: Identity, Assignment và quyền truy cập; 03: Năng lực dùng chung cho vertical slice

**Status:** done

## Files in scope

- `prisma/schema.prisma`: thêm Establishment, EstablishmentType, ChecklistTemplate, Inspection, InspectionFinding và EnforcementRecommendation; chỉ tham chiếu shared Evidence/Assignment.
- `prisma/migrations/<timestamp>_ps007_inspection/migration.sql`: migration PS-E1-007.
- `src/modules/inspections/index.ts`: public entry point.
- `src/modules/inspections/contracts.ts`: establishment, checklist, inspection and finding contracts.
- `src/modules/inspections/domain.ts`: Inspection lifecycle and result rules.
- `src/modules/inspections/commands.ts`: register, schedule, start, complete, record finding and submit recommendation.
- `src/modules/inspections/repository.ts`: aggregate persistence through shared event boundary.
- `src/modules/inspections/projection.ts`: catalog, schedule, detail and due-inspection projections.
- `src/modules/inspections/schemas.ts`: REST input validation.
- `src/app/api/establishments/route.ts`: catalog endpoint.
- `src/app/api/establishments/[establishmentId]/route.ts`: establishment detail/update endpoint.
- `src/app/api/inspections/route.ts`: schedule/list endpoint.
- `src/app/api/inspections/[inspectionId]/route.ts`: inspection detail/command endpoint.
- `src/app/inspections/establishments/page.tsx`: establishment catalog.
- `src/app/inspections/establishments/[establishmentId]/page.tsx`: establishment detail and schedule.
- `src/app/inspections/[inspectionId]/page.tsx`: checklist, Evidence and result workflow.
- `src/components/inspections/EstablishmentForm.tsx`: accessible catalog form.
- `src/components/inspections/InspectionSchedule.tsx`: due/upcoming/overdue schedule view.
- `src/components/inspections/ChecklistForm.tsx`: type-specific checklist form.
- `src/components/inspections/InspectionFindingPanel.tsx`: finding and Evidence capture.
- `src/components/inspections/EnforcementApprovalPanel.tsx`: recommendation and Approval states.
- `tests/inspections/inspection-workflow.integration.test.ts`: schedule/checklist/finding/approval tests.
- `tests/e2e/ps007-inspection.spec.ts`: catalog-to-approval browser flow.

## Implementation steps

- [x] 1. **Define Inspection domain vocabulary and lifecycle.** Chốt EstablishmentType, checklist version, Inspection status, InspectionResult, InspectionFinding và EnforcementRecommendation; không dùng “violation” như một kết luận pháp lý tự động.
- [x] 2. **Define event/command ownership.** Chốt `EstablishmentRegistered`, `InspectionScheduled`, `InspectionStarted`, `InspectionCompleted`, `InspectionFindingRecorded`, `EnforcementRecommendationSubmitted` và `EnforcementApproved`; mỗi event có version/owner trước khi coding.
- [x] 3. **Create schema/migration.** Add Establishment, EstablishmentType, ChecklistTemplate/Item, Inspection, ChecklistResponse, InspectionFinding và EnforcementRecommendation; lưu checklist version used by each Inspection để template thay đổi không sửa lịch sử.
- [x] 4. **Implement catalog and scheduling.** Validate establishment fields/GeoPoint, prevent duplicate active records, create periodic schedule, detect due/overdue and emit `InspectionScheduled` once per schedule occurrence.
- [x] 5. **Implement checklist workflow.** Select template by EstablishmentType, start Inspection, save responses, require mandatory items, attach Evidence where required and complete only when checklist validation passes.
- [x] 6. **Implement Finding and Approval rules.** Record Finding with checklist reference/Evidence, derive only `InspectionResult`, submit EnforcementRecommendation, require Trưởng Công an xã Approval and preserve rejected/revised history.
- [x] 7. **Implement projections and APIs.** Provide catalog, schedule, detail and due-inspection projections; add server-validated endpoints for establishment, inspection and Approval commands.
- [x] 8. **Build Web/PWA UI.** Create catalog/detail, schedule, checklist, Evidence and Approval surfaces. Apply trust-first regulated-operations design, mobile one-hand checklist, visible save/sync state, full loading/empty/error/offline/denied states and reduced motion.
- [x] 9. **Test domain and access behavior.** Cover type-specific checklist, template versioning, mandatory fields, Evidence immutability, Assignment scope, Approval rejection, seven-day SLA and duplicate commands.
- [x] 10. **Run end-to-end gate.** Browser test creates Establishment, schedules inspection, completes checklist, records Finding, submits and approves recommendation; run lint/typecheck/build/format and verify no automatic legal conclusion is produced.

## Explicitly out of scope

- Không tự kết luận vi phạm pháp lý hoặc tự động quyết định xử phạt.
- Không triển khai thống kê tỷ lệ đạt đầy đủ của PS-E1-007.
- Không gửi báo cáo định kỳ PS-E1-010.
- Không thêm Camera/LPR.

## UI requirements

Áp dụng `design-taste-frontend` với design read: **trust-first field inspection workspace for regulated public-sector operations**; `DESIGN_VARIANCE=3`, `MOTION_INTENSITY=2`, `VISUAL_DENSITY=5`. Checklist ưu tiên thứ bậc và thao tác một tay trên mobile, label trên input, trạng thái đã lưu/chưa đồng bộ rõ ràng, WCAG AA, reduced motion, không dùng card grid trang trí hoặc gradient/glass.

## Acceptance criteria

- [x] Cán bộ văn phòng tạo/sửa Establishment với loại hình, chủ, địa chỉ, giấy phép và GeoPoint hợp lệ.
- [x] Lịch kiểm tra được tạo theo kỳ cấu hình; hệ thống hiển thị upcoming/overdue và không tạo lịch trùng.
- [x] Checklist template khác nhau theo EstablishmentType; không dùng một checklist chung cho mọi loại hình.
- [x] Cán bộ hiện trường chỉ thao tác Inspection được phân công và có thể lưu từng mục checklist an toàn khi mạng chập chờn.
- [x] Inspection ghi `InspectionStarted`, `InspectionFindingRecorded` và `InspectionCompleted` đúng thứ tự; mỗi finding liên kết Evidence nếu có yêu cầu chứng cứ.
- [x] `InspectionResult` chỉ là đạt/nhắc nhở/có dấu hiệu không đạt; `EnforcementRecommendation` cần Approval trước khi hoàn tất.
- [x] Evidence ảnh có hash, capture time và GPS; original không bị sửa/xóa.
- [x] SLA xử lý recommendation/violation theo threshold cấu hình, bao gồm cuối tuần và ngày lễ.
- [x] User không được phân công không đọc được hồ sơ Inspection nhạy cảm hoặc download Evidence.
- [x] E2E test chạy từ tạo Establishment đến Approval recommendation và kiểm tra denied/retry states.
- [x] UI có loading, empty, error, offline/pending-save, success và validation states ở desktop/mobile.
- [x] `npm run lint`, `npm run build` và PS-E1-007 tests pass.
