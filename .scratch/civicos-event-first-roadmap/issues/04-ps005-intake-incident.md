# 04: PS-E1-005 IntakeReport đến Incident

**What to build:** Cung cấp vertical slice Web cho cán bộ trực ban nhập tin thủ công, tạo Incident, phân loại, phân công, xác minh, xem timeline, xin Approval chuyển cấp trên, đề xuất kết quả và đóng Incident theo đúng quyền, audit và SLA.

**Blocked by:** 01: Event kernel và transactional outbox; 02: Identity, Assignment và quyền truy cập; 03: Năng lực dùng chung cho vertical slice

**Status:** ready-for-agent

## Files in scope

- `prisma/schema.prisma`: thêm IntakeReport, Incident, IncidentAssignment reference, IncidentProjection và SLA reference; không sở hữu bảng Assignment dùng chung.
- `prisma/migrations/<timestamp>_ps005_incident/migration.sql`: migration PS-E1-005.
- `src/modules/incidents/index.ts`: public entry point.
- `src/modules/incidents/contracts.ts`: IntakeReport/Incident command, status và event contracts.
- `src/modules/incidents/domain.ts`: aggregate lifecycle và transition/Approval rules.
- `src/modules/incidents/commands.ts`: register, classify, assign, verify, transfer, resolve, close commands.
- `src/modules/incidents/repository.ts`: aggregate persistence through shared event boundary.
- `src/modules/incidents/projection.ts`: Incident list/detail/timeline projection.
- `src/modules/incidents/schemas.ts`: REST input validation.
- `src/app/api/intake-reports/route.ts`: manual intake endpoint.
- `src/app/api/incidents/route.ts`: Incident list/create endpoint.
- `src/app/api/incidents/[incidentId]/route.ts`: Incident detail endpoint.
- `src/app/api/incidents/[incidentId]/commands/route.ts`: typed lifecycle command endpoint.
- `src/app/intake/page.tsx`: manual IntakeReport form.
- `src/app/incidents/page.tsx`: filtered Incident work queue.
- `src/app/incidents/[incidentId]/page.tsx`: Incident detail, timeline and actions.
- `src/components/incidents/IntakeReportForm.tsx`: accessible intake form.
- `src/components/incidents/IncidentTable.tsx`: loading/empty/error/pagination states.
- `src/components/incidents/IncidentTimeline.tsx`: event/timeline presentation.
- `src/components/incidents/IncidentAssignmentPanel.tsx`: Assignment UI.
- `src/components/incidents/IncidentStatusActions.tsx`: permitted transition/Approval actions.
- `tests/incidents/incident-workflow.integration.test.ts`: aggregate/event/projection/SLA/authorization tests.
- `tests/e2e/ps005-incident.spec.ts`: intake-to-close browser flow and denied actions.

## Implementation steps

- [x] 1. **Freeze PS-E1-005 state machine and commands.** Encode only `received`, `classified`, `verifying`, `transferred`, `resolved` and `closed`; list actor/role required for every transition and reject unknown transitions before persistence.
- [x] 2. **Define aggregate/event contracts.** Implement IntakeReport and Incident commands plus the agreed event types; define idempotency key behavior and correlation IDs before adding routes.
- [x] 3. **Create schema/migration.** Add IntakeReport, Incident and read-model tables with source IDs, status, location, channel, timestamps and sensitive informant reference; reference shared Assignment/SLA/Evidence rather than duplicating them.
- [x] 4. **Implement register command.** Validate manual intake, create one IntakeReport and one Incident in the MVP, append `IntakeReportReceived` and `IncidentRegistered` atomically, and return a stable Incident ID.
- [x] 5. **Implement lifecycle commands.** Add classify, assign, verify, transfer request, resolve and close; each command checks current version, authorization, required fields and Approval rule before emitting its event.
- [x] 6. **Implement projection and timeline query.** Build list/detail/timeline projections only from DomainEvent; include filter/status/SLA fields without exposing informant identity to unauthorized readers.
- [x] 7. **Implement REST boundary.** Add intake/list/detail/command routes with schema validation, consistent error codes, idempotency headers and server authorization on every route.
- [x] 8. **Build the Web UI.** Implement intake form, work queue, detail/timeline, Assignment panel and status actions. Apply the ticket’s trust-first design read, clear status hierarchy, responsive layout, loading skeleton, empty/error/denied states, keyboard focus and reduced motion.
- [x] 9. **Add event, authorization, audit and SLA tests.** Test valid/invalid transitions, duplicate commands, missing Approval, assignment scope, informant redaction, overdue event and projection rebuild.
- [x] 10. **Run end-to-end gate.** Use browser test to submit intake, classify, assign, verify, request transfer, approve, resolve and close; verify read model and denied access. Run lint/typecheck/build/format and record no PS-E1-008, citizen app or Camera/LPR work.

## Explicitly out of scope

- Không xây app công dân.
- Không xây PS-E1-008 mobile FieldUpdate hoàn chỉnh; chỉ giữ extension point cho timeline.
- Không tích hợp Camera/LPR.
- Không xây báo cáo định kỳ hoặc analytics.

## UI requirements

Áp dụng `design-taste-frontend` với design read: **trust-first public-sector casework interface for duty officers and command staff**; `DESIGN_VARIANCE=3`, `MOTION_INTENSITY=2`, `VISUAL_DENSITY=5`. Dùng bố cục công cụ nghiệp vụ rõ ràng, không dashboard-card slop, không gradient/glass/neon, không hero marketing. Table/detail/form phải responsive, keyboard accessible, WCAG AA, có loading skeleton, empty state, inline errors, denied state và reduced-motion fallback.

## Acceptance criteria

- [x] Cán bộ trực ban nhập được kênh, thời điểm, nội dung, địa điểm và thông tin nguồn của IntakeReport với validation server-side.
- [x] Mỗi IntakeReport tạo đúng một Incident trong MVP và ghi `IntakeReportReceived` cùng `IncidentRegistered` trong cùng business operation.
- [x] Incident chỉ đi qua các transition hợp lệ: `received → classified → verifying → transferred/resolved → closed`.
- [x] User được phân công mới ghi được verification; User không được phân công không ghi hoặc đọc được dữ liệu ngoài scope.
- [x] Chuyển cấp trên và resolve/close đều yêu cầu Approval của Trưởng Công an xã; thiếu Approval bị từ chối và không tạo event thành công.
- [x] Timeline lấy từ projection/event history, không dựng từ client state hoặc hard-coded status.
- [x] SLA reminder/overdue event được tạo cho Incident chưa phân loại/xác minh/chuyển tiếp theo threshold cấu hình.
- [x] Sensitive data read và mutation tạo AuditEvent; informant identity không lộ trong list/projection không có quyền.
- [x] Retry command có idempotency key và không tạo Incident/Assignment/event trùng.
- [x] E2E test chạy từ form intake đến close bằng UI và kiểm tra permission denial cho User không được phân công.
- [x] UI có đầy đủ loading, empty, error, denied, focus và mobile responsive states; không có text bị cắt trên desktop/mobile.
- [x] `npm run lint`, `npm run build` và PS-E1-005 tests pass.
