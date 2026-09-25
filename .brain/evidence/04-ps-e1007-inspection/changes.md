Ticket mục tiêu: hoàn thiện Inspection/Establishment theo PS-E1-007, giữ phần đạt và sửa đúng gap đã audit.
File được phép sửa: module inspections, API/routes/components/pages, Prisma/migrations và tests trong allow-list; không sửa file cấm.
Acceptance Criteria chính: cadence 6 tháng/SLA 7 ngày, checklist/evidence GPS, lifecycle/result, approval/transfer, stats, scope authorization và UI states.

## Thay đổi lần thực thi này

- `src/app/api/sync/route.ts`: offline `inspection.finding` now forwards and returns `severity`, `category` and `evidenceIds` without changing shared sync state semantics.
- `src/components/inspections/InspectionDetail.tsx`, `InspectionFindingForm.tsx`, `EstablishmentDetail.tsx`, `EstablishmentForm.tsx`, `EstablishmentList.tsx`, `InspectionScheduleBoard.tsx`, `InspectionScheduleForm.tsx`, `EnforcementApprovalPanel.tsx`, `ChecklistForm.tsx`, `RecommendationForm.tsx`: replace remaining ad-hoc inspection palette classes with existing `civicos-*` design-token variables while retaining loading, empty, error/retry, permission, offline-write, unsaved and approval states.
- `Lesson-learned.md`: ghi mới bài học `Offline command metadata round-trip` về việc dispatcher phải giữ đầy đủ metadata domain khi đồng bộ offline.

- `src/modules/inspections/commands.ts`, `projection.ts`: fail-closed OrganizationUnit scope for establishment, fieldwork, approval/transfer and reads; cadence exceptions now use actual mutation capability rather than `assignedUserId`.
- `src/app/api/inspections/[inspectionId]/commands/route.ts`, `[inspectionId]/route.ts`, `schemas.ts`, `RecommendationForm.tsx`: canonical command dispatch and UI use `submit_recommendation`; legacy POST remains an adapter; finding route preserves severity/category/evidence IDs.
- `src/components/inspections/ChecklistForm.tsx`, `InspectionFindingForm.tsx`, `RecommendationForm.tsx`, `EstablishmentList.tsx`: replace new hard-coded inspection UI palette classes with existing design-token variables while retaining workflow states.
- `tests/inspections/inspection-ps007-regression.test.ts`: canonical parser expectation updated.

- `.brain/evidence/04-ps-e1007-inspection/audit-gap-matrix.md`: ghi audit theo từng AC 36–50, Rubric 56–59 và bước 71–76; chỉ các dòng GAP là phạm vi sửa.
- `.brain/evidence/04-ps-e1007-inspection/changes.md`: tạo evidence mapping với diễn đạt ticket ở đầu file.
- `src/modules/inspections/contracts.ts`, `domain.ts`, `schemas.ts`, `config.ts`: thêm risk/status, finding classification, canonical command parsing, five-type template branches và SLA `inspection_violation_resolution_7d`.
- `src/modules/inspections/commands.ts`, `projection.ts`: persist/scope establishment fields, cadence exception gate, completed immutability, finding metadata, transfer target/Approval validation, scoped statistics/rates/SLA readback.
- `prisma/schema.prisma`, `prisma/migrations/20260925000000_ps_e1007_completion/migration.sql`: additive establishment risk/status/OrganizationUnit and finding severity/category persistence; recommendation transfer constraint.
- `src/app/api/establishments/route.ts`, `src/app/api/inspections/[inspectionId]/commands/route.ts`, inspection APIs: establishment filters and canonical commands boundary; existing compatibility routes preserved.
- `src/components/inspections/EstablishmentForm.tsx`, `EstablishmentList.tsx`, `EstablishmentDetail.tsx`, `InspectionScheduleBoard.tsx`, `ChecklistForm.tsx`, `InspectionFindingForm.tsx`, `InspectionDetail.tsx`, `EnforcementApprovalPanel.tsx`: risk/status/filter/stats, retry/offline/unsaved/progress/evidence states, finding classification, SLA and transfer controls.
- `tests/inspections/inspection-ps007-regression.test.ts`, `inspection-slices-4-6.postgres.test.ts`: risk/canonical-command regression, cadence exception, five synthetic establishment types, Approval/transfer integration coverage.
- `Lesson-learned.md`: cập nhật `Tool path preflight` với biến thể không đoán tên file con module; ghi thêm bài học `Prisma query/schema relation alignment` sau khi thay nested relation filter bằng truy vấn ID đã khai báo.

## Đối chiếu thực tế

- Đã giữ nguyên `EnforcementTransferred` trong `src/modules/eventing/event-catalog.ts`; không thay semantics event hiện có.
- Đã giữ nguyên shared Evidence API/service, offline queue, identity authorization kernel và feature registry; chỉ tái sử dụng chúng từ module/UI.
- Chưa chạy Prisma generate, test, lint, typecheck, format-check, E2E hoặc build theo ràng buộc Developer; Tester phải xác nhận compile/migration/test discovery.
- Trong lúc triển khai, một lần đọc sai hai path module và một patch hunk dùng context cũ bị từ chối; đã enumerate/read-back rồi áp dụng lại bằng path/context đã xác nhận.

## Sửa cục bộ sau Gate HƯỚNG

- `src/components/inspections/RecommendationForm.tsx`: thay `accent-cyan-300` bằng `--civicos-accent`, giữ nguyên form và các trạng thái offline/permission/loading.
- `src/app/inspections/layout.tsx`: thay nền/chữ `slate` bằng `--civicos-canvas` và `--civicos-text`, giữ nguyên nhánh permission-denied.
- `src/app/inspections/establishments/page.tsx`: thay toàn bộ màu `slate/cyan/white` còn sót bằng các token canvas, text, text-muted và accent; giữ nguyên route, layout và các state hiện có.

## Sửa lỗi cú pháp lần thực thi này

- `src/components/inspections/ChecklistForm.tsx`: bọc callback `textarea.onChange` bằng block để giữ cùng lúc cập nhật response và trạng thái dirty; không thay đổi behavior, design token hoặc state flow.

## Sửa lỗi typecheck lần thực thi này

- `src/modules/inspections/schemas.ts`: giữ validation risk hiện có và chỉ trả về giá trị đã được narrow thành union `low | medium | high` trước khi tạo `EstablishmentInput`.
- `tests/inspections/inspection-ps007-regression.test.ts`: thêm import `parseEstablishmentInput` từ public API `@/modules/inspections`.

## Cập nhật lần thực thi này

- `tests/integration/schema-and-migration.test.ts`: thêm migration `20260925000000_ps_e1007_completion` vào `expectedMigrationChain`, giữ thứ tự migration và các assertion hiện có.

## Sửa fixture E2E sau lần chạy 13

- `tests/e2e/parallel-wave-read-model.spec.ts`, `tests/e2e/ps007-inspection.spec.ts`: dùng locator label exact cho trường `Loại hình`, tránh va chạm accessible-name với select `Lọc loại hình` mà không đổi UX.
- `tests/e2e/parallel-wave.spec.ts`, `tests/e2e/ps007-inspection.spec.ts`, `tests/e2e/parallel-wave-read-model.spec.ts`: bỏ cadence `3` khỏi fixture schedule để API áp dụng contract canonical default `6` tháng; cadence nhỏ hơn policy vẫn chỉ dành cho capability command phù hợp, không nới lỏng validation/authorization.
- Root cause lần 13: các fixture gửi `cadenceMonths: 3` nhưng actor không có capability/assignment hợp lệ cho cadence exception nên API trả `INSPECTION_CADENCE_PERMISSION_REQUIRED` (400); locator không exact khiến Playwright match cả input và filter select.

## Bổ sung evidence AC-10

- `tests/inspections/inspection-stats.postgres.test.ts`: thêm test DB-gated theo `RUN_DB_TESTS === '1'` với dữ liệu synthetic karaoke/bar, đủ pass/reminder/needs_action và bốn recommendation status; assert totals, rates theo loại hình, filter period/type, `generatedAt`, và loại trừ exact OrganizationUnit khác scope.

## Sửa fixture sau Lần chạy 18

- `tests/inspections/inspection-slices-4-6.postgres.test.ts`: thêm commander phê duyệt riêng; các flow required/evidence, finding/event order và rejected/revised recommendation submit bằng actor tác nghiệp nhưng reject/approve bằng actor khác, đồng thời giữ assertion self-approval bị từ chối.
- `tests/inspections/inspection-schedule.postgres.test.ts`: dùng loại hình/tên fixture riêng theo lượt chạy và bỏ drain outbox không cần thiết cho assertion schedule-next; kiểm tra occurrence kế tiếp trực tiếp sau transaction completion để tránh contention và trùng dữ liệu tồn từ lượt chạy trước.

## Sửa test sau run 19

- `tests/inspections/inspection-schedule.postgres.test.ts`: khôi phục `processOutboxUntilIdle()` ngay sau `completeInspection` trong test recurring schedule để cô lập bước projection tối thiểu trước khi giữ nguyên assertion `scheduleState: 'overdue'`; không sửa production và không thay đổi fixture unique.

## Sửa test sau run 20

- `tests/inspections/inspection-schedule.postgres.test.ts`: thay drain outbox toàn cục bằng `rebuildInspectionProjection()` hiện có để replay projection deterministic sau transaction completion; giữ assertion source row, `scheduleState: 'overdue'`, fixture unique và OrganizationUnit/authorization scope. Không sửa production.
- Nguyên nhân: `processOutboxUntilIdle()` quét backlog/reactor dùng chung nên không có thời điểm kết thúc deterministic cho một aggregate duy nhất; đây không phải lỗi tạo occurrence trong transaction.
- Chưa chạy test/lint/typecheck/format/build/prisma generate/code-review theo yêu cầu Planner.

## Sửa timeout/reactor trong SLA path

- `tests/inspections/inspection-slices-4-6.postgres.test.ts`: thay `processOutboxUntilIdle()` bằng `rebuildInspectionProjection()` hiện có trước khi kiểm tra `upcoming/overdue`, tránh drain backlog outbox dùng chung trong test SLA và giữ nguyên các assertion SLA/overdue.
- Nguyên nhân: test SLA cần đồng bộ inspection read model nhưng drain toàn bộ outbox có thể gặp message retry/backoff hoặc consumer lỗi trong backlog dùng chung; vòng drain kéo dài đến timeout và log lỗi reactor từ query engine. Replay projection trực tiếp chỉ xử lý nguồn event cần cho read model, không thay đổi production SLA.

## Sửa lỗi timeout projection replay lần này

- `src/modules/inspections/projection.ts`: thêm replay theo danh sách `Inspection` aggregate IDs, chỉ xóa/rebuild projection rows mục tiêu; giữ nguyên đường full replay cho caller hiện hữu.
- `tests/inspections/inspection-slices-4-6.postgres.test.ts`: SLA test truyền đúng ba inspection IDs (`inspection`, `future`, `past`) vào replay bounded trước khi gọi `listInspections`.
- Nguyên nhân gốc: `rebuildInspectionProjection()` trước đó replay toàn bộ event history dùng chung trong DB, khiến await trước `listInspections` không bounded và test timeout; log reactor là hậu quả khi Prisma còn xử lý sau timeout, không phải SLA/completion assertion.
- `Lesson-learned.md`: ghi mới mục `Scoped projection replay in DB tests`.

## Sửa lỗi E2E stale offline command

- `src/modules/inspections/projection.ts`: `getInspection` đọc state/version từ bản ghi `Inspection` authoritative thay vì trả projection có thể lag; giữ nguyên `baseVersion` và stale-version protection trong command.
- Nguyên nhân gốc: approval tăng `prisma.inspection.version`, nhưng endpoint detail ưu tiên `inspection-read-model` chưa kịp cập nhật, nên Field officer nhận version cũ và `inspection.complete` bị từ chối với `STALE_OFFLINE_COMMAND`.
- `Lesson-learned.md`: ghi mới mục `Authoritative aggregate version at command boundaries`.

## Sửa blocker code-review lần này

- `src/components/inspections/EnforcementApprovalPanel.tsx`: tải danh sách OrganizationUnit cấu hình được và hiển thị tên/cấp dữ liệu thật; bỏ các nhãn, placeholder và thông báo cố định cho một cấp hành chính.
- `src/modules/inspections/commands.ts`: xác thực target transfer là OrganizationUnit active trong chuỗi parentId của actor, không dùng alias level cố định.
- `src/modules/inspections/projection.ts`: giữ nguyên implementation vì `readModels` đã lọc JSON state theo `organizationId`; không thêm điều kiện scope trùng lặp.
- `tests/inspections/inspection-slices-4-6.postgres.test.ts`: thêm regression projected-path với hai OrganizationUnit và fixture hierarchy cấu hình bằng parentId.
- Chưa chạy verification theo yêu cầu Developer; không ghi nhận PASS.

## Sửa lỗi typecheck lần này

- `src/modules/inspections/commands.ts`: khởi tạo duyệt hierarchy transfer bằng giá trị `assertOrganizationUnit(actor)` đã được narrow thành `string`, giữ nguyên kiểm tra `parentId`, target active và configurable `name/level`.
- Chưa chạy test/lint/typecheck/format/build theo yêu cầu Developer.

## Sửa lỗi type inference lần thực thi này

- `src/modules/inspections/commands.ts`: thêm annotation tường minh `{ parentId: string | null } | null` cho kết quả truy vấn `current` trong vòng duyệt OrganizationUnit hierarchy; giữ nguyên kiểm tra target là ancestor, active và configurable.
- Chưa chạy test/lint/typecheck/format/build theo yêu cầu Developer.
