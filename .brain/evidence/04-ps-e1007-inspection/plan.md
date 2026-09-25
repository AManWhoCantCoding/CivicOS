# Kế hoạch PS-E1-007 — Inspection/Establishment

## Baseline và nguyên tắc giữ nguyên

- Đã đọc toàn bộ ticket, `CONTEXT.md`, `spec.md`, textual spec screen-07/08/09 và đã kiểm tra `docs/adr/` hiện đang rỗng trên đĩa.
- Baseline UI cụ thể là `ui/screen-07-danh-sach-co-so-kinh-doanh.md`, `ui/screen-08-inspection-workspace.md`, `ui/screen-09-enforcement-recommendation-approval.md` và `ui/design-tokens.md`; mọi map UI dưới đây dùng đúng các tài liệu này làm baseline.
- Working tree đang có nhiều thay đổi/untracked thuộc các ticket khác; không reset, xóa hoặc đưa chúng vào scope. Baseline liên quan hiện có gồm các file inspection/API/schema/migration/test đã modified hoặc untracked; `src/modules/eventing/event-catalog.ts` đã có `EnforcementTransferred` và `tests/inspections/inspection-ps007-regression.test.ts` đã có regression contract.
- Giữ các phần hiện đạt: lifecycle guard, checklist required/evidence guard hiện có, transaction/event/audit pattern, shared Evidence service, offline queue, assignment/authorization kernel và các route/UI state đã có; chỉ sửa gap sau audit.
- `src/modules/eventing/event-catalog.ts` là scope mở rộng đã được quyết định ở ticket line 28. Chỉ thêm đúng `EnforcementTransferred` nếu baseline audit thực tế thiếu hoặc metadata sai; hiện tại không dự kiến thay đổi semantics/event khác.

## 1. Các file dự định sửa/tạo

### Chắc chắn cần audit và có thể sửa trong allow-list

- `src/modules/inspections/contracts.ts`
- `src/modules/inspections/domain.ts`
- `src/modules/inspections/config.ts`
- `src/modules/inspections/schemas.ts`
- `src/modules/inspections/commands.ts`
- `src/modules/inspections/projection.ts`
- `src/modules/inspections/index.ts`
- `src/app/api/establishments/route.ts`
- `src/app/api/establishments/[establishmentId]/route.ts`
- `src/app/api/inspections/route.ts`
- `src/app/api/inspections/[inspectionId]/route.ts`
- `src/app/api/inspections/stats/route.ts`
- `src/components/inspections/EstablishmentForm.tsx`
- `src/components/inspections/EstablishmentList.tsx`
- `src/components/inspections/EstablishmentDetail.tsx`
- `src/components/inspections/InspectionScheduleForm.tsx`
- `src/components/inspections/InspectionScheduleBoard.tsx`
- `src/components/inspections/InspectionDetail.tsx`
- `src/components/inspections/ChecklistForm.tsx`
- `src/components/inspections/InspectionFindingForm.tsx`
- `src/components/inspections/RecommendationForm.tsx`
- `src/components/inspections/EnforcementApprovalPanel.tsx`
- `src/app/inspections/establishments/page.tsx`
- `src/app/inspections/establishments/[establishmentId]/page.tsx`
- `src/app/inspections/[inspectionId]/page.tsx`
- `prisma/schema.prisma`
- `tests/inspections/inspection-contract.test.ts`
- `tests/inspections/inspection-ps007-regression.test.ts`
- `tests/inspections/inspection-workflow.integration.test.ts`
- `tests/inspections/inspection-schedule.postgres.test.ts`
- `tests/inspections/inspection-slices-4-6.postgres.test.ts`
- `tests/inspections/inspection-slice-7-8.test.ts`
- `tests/e2e/inspection-ps007.spec.ts` (chỉ tạo nếu audit xác nhận chưa có; không mở rộng sang mobile write)

### Chỉ tạo/sửa khi audit xác nhận gap tương ứng

- `src/app/api/inspections/[inspectionId]/commands/route.ts`: route canonical theo contract ticket line 86; giữ route POST hiện hữu làm compatibility boundary nếu còn caller.
- `prisma/migrations/20260925000000_ps_e1007_completion/migration.sql`: migration additive cho risk/status/OrganizationUnit hoặc index/constraint/SLA linkage còn thiếu; không sửa lịch sử migration, không reset/drop dữ liệu.
- `src/modules/eventing/event-catalog.ts`: chỉ thêm đúng `EnforcementTransferred` theo quyết định mở rộng line 28 nếu entry hiện tại không đạt contract.
- Một file test mới dưới `tests/inspections/` chỉ được tạo nếu các test hiện có không thể mở rộng mà vẫn giữ mỗi test một contract.

### Không sửa

- `src/app/api/evidence/route.ts`, `src/components/field/EvidenceCapture.tsx`, `src/components/field/EvidenceList.tsx`, offline queue, identity/authorization, assignment, event worker/outbox/SLA worker và `src/components/navigation/feature-registry.ts`: tái sử dụng sau khi audit, chỉ xin Planner mở scope nếu phát hiện thiếu contract thật sự.
- `.scratch/**`, `.env*`, secrets, source repo tham chiếu và mọi file ngoài allow-list.

## 2. Hàm/Interface sẽ đổi

### Domain/module

- Chuẩn hóa `InspectionStatus`, `InspectionResult`, `EnforcementRecommendationStatus`, `EstablishmentInput`, `InspectionStats`, `ChecklistItem`, `ChecklistResponse`, `ChecklistFindingEvidence` và các payload command để phản ánh risk/status/OrganizationUnit, template version, Evidence IDs, SLA và approval/transfer mà không dùng `Inspection` thay cho `FieldUpdate`.
- Audit/sửa `assertInspectionTransition`, `assertChecklistComplete`, `assertChecklistEvidence`, `isInspectionResult` và các ownership/event constants; giữ `scheduled → in_progress → completed`, cấm completed mutation và giữ trace Finding–checklist–Evidence.
- Audit/sửa `assertCadenceMonths`, `assertCadenceCapability`, `ensureTemplate`, `scheduleNextInspection`, `transitionInspection`, `scheduleInspection`, `completeInspection` để default 6 tháng, không làm mất cam kết tối thiểu 2 kỳ/năm và chỉ cho cadence nhỏ hơn policy khi capability phù hợp.
- Audit/sửa `registerEstablishment`, `updateEstablishment`, `archiveEstablishment`, `listEstablishments`, `getEstablishment` để có tên/chủ/địa chỉ/type/license/GPS/risk/status, archive bảo toàn lịch sử và exact OrganizationUnit scope.
- Audit/sửa `startInspection`, `saveChecklistResponses`, `recordFinding`, `completeInspection` để enforce required/evidence-required ở domain/API, Evidence resource scope và result `pass|reminder|needs_action`.
- Audit/sửa `submitRecommendation`, `approveRecommendation`, `rejectRecommendation`, `transferRecommendation` để tách pending khỏi Approval, cấm self-approval, enforce commander/cross-unit boundary và transfer độc lập tới OrganizationUnit.
- Audit/sửa `inspectionStats`, `listInspections`, `listDueInspections`, `getInspection` để filter period/type, overdue, result/recommendation counts, generatedAt và OrganizationUnit consistency.
- Dùng `INSPECTION_SLA` cho SLA `inspection_violation_resolution_7d` 7×24 giờ; nối overdue event/notification/audit hiện có và đóng SLA khi xử lý hợp lệ, không đổi result pháp lý.
- Cập nhật exports trong `src/modules/inspections/index.ts` chỉ cho symbol thực sự được dùng bởi route/test; không tạo public helper dư thừa.

### API/route

- `GET/POST` establishments: list/filter và register trong scope; `GET/PATCH/DELETE` detail: read/update/archive, không hard-delete lịch sử.
- `GET/POST /api/inspections`: list/schedule/overdue và default cadence; không để nhánh stats cũ tạo semantics khác với `/stats` canonical.
- `POST /api/inspections` và command schedule phải thực hiện capability/authorization check tại API trước khi chấp nhận cadence nhỏ hơn 6 tháng: actor phải có capability command được cấu hình cho exception, đúng `OrganizationUnit` và `Assignment` nếu workflow yêu cầu; thiếu capability, sai role, sai unit hoặc không có assignment phải bị reject ở API với negative test, không được chỉ dựa vào UI hay `assertCadenceCapability` nội bộ.
- `GET /api/inspections/stats`: query `from`, `to`, `establishmentType`, trả contract stats line 99–100.
- `GET/POST /api/inspections/:inspectionId` và route commands canonical: detail + template/findings/recommendations; command `start`, `save_checklist`, `finding`, `complete`, `submit_recommendation`, `approve`, `reject`, `transfer`.
- Mọi route chỉ là adapter; authorization, OrganizationUnit, Assignment và checklist/evidence invariant vẫn ở domain/API module, không chỉ ở UI.

### UI

- `EstablishmentList`/page: filter type/risk/status, schedule/overdue/latest/violation summary, statistics và loading/empty/error-retry/permission state theo screen-07.
- `InspectionScheduleBoard`/form/detail: hiển thị default cadence, due/overdue, minimum-two-per-year signal và retry/online guard.
- `ChecklistForm`/`InspectionFindingForm`/`InspectionDetail`: checklist version/section progress, finding `severity` và `category`, required/evidence-required feedback, result summary, GPS/photo Evidence qua component dùng chung, unsaved/submit confirmation và online-required write theo `screen-08-inspection-workspace.md:9-13`.
- `RecommendationForm`/`EnforcementApprovalPanel`/`InspectionDetail`: hiển thị finding/Evidence, SLA 7 ngày, pending/approved/rejected/transferred, approve/reject/transfer với target unit, offline guard và permission state theo screen-09.
- Không thêm mobile write flow; chỉ bảo toàn web write boundary và route/page contract hiện có.

## 3. Luồng xử lý chi tiết

### A. Establishment/catalogue

1. Web gửi register/update với tên, chủ, địa chỉ, loại hình, license, GPS, risk/status; parser và domain validate, gắn OrganizationUnit, chống duplicate active, ghi event/audit.
2. Detail/list lọc đúng scope; archive/deactivate thay hard-delete và không làm mất Inspection/Finding/Evidence/Recommendation history.
3. Screen-07 gọi list, overdue và stats; hiển thị filter, latest inspection, violations, tỷ lệ result và mọi state loading/empty/error/retry/denied.

### B. Scheduling/cadence

1. Schedule nhận establishment, thời điểm, optional assignee và cadence; thiếu cadence là 6 tháng.
2. API authorization boundary và domain cùng reject cadence ngoài policy; cadence nhỏ hơn 6 chỉ qua command capability được cấp cho actor đúng role trong đúng OrganizationUnit, có Assignment nếu policy yêu cầu, và mọi denial đều được trả về từ API trước khi tạo lịch; assignment creation vẫn tách khỏi scheduling.
3. Khi complete, transaction tạo kỳ kế tiếp cùng cadence/template snapshot, chống duplicate; test chứng minh ít nhất 2 kỳ/năm và list có overdue.

### C. Checklist/finding/Evidence

1. Chọn template version theo karaoke, bar, cầm đồ, game, khách sạn và snapshot vào Inspection.
2. Chỉ cho `scheduled → in_progress → completed`; save chỉ ở in-progress; completed và skip/replay bị reject.
3. `save_checklist` và `complete` đều validate required item; item `evidenceRequired` thiếu Evidence ID thì reject complete dù bypass UI.
4. Finding phải có checklist key tồn tại, result hợp lệ, description và Evidence IDs thuộc đúng Inspection; Evidence service hiện có lưu hash/mime/file/capturedAt/receivedAt/GPS.
5. UI giữ form khi upload/network lỗi, hiển thị upload/GPS state và không gửi write mù khi offline.

### D. Result/recommendation/approval/transfer

1. Complete chỉ tạo `InspectionResult` pass/reminder/needs_action; không tạo sanction/legal conclusion.
2. Finding cần xử lý có thể submit recommendation ở pending; submission không tự approve.
3. Commander khác requester approve/reject; Approval record và actor/event/audit phải tồn tại trước/đồng thời với quyết định hợp lệ; self-approval, sai role, sai resource, cross-unit bị reject.
4. Transfer là command độc lập tới OrganizationUnit cấp huyện; status transferred, Approval/event/audit; không tự tạo quyết định pháp lý.
5. Screen-09 đọc và hiển thị toàn bộ approval/SLA states, chỉ gửi write khi online và có quyền.

### E. SLA/statistics/authorization

1. Submit recommendation tạo SLA `inspection_violation_resolution_7d`; worker hiện có tạo overdue event/notification/audit một lần; không sửa result pháp lý.
2. Stats dùng cùng OrganizationUnit scope với detail/list, filter period/type, đếm establishment/inspection/result/recommendation và trả filter + generatedAt.
3. API enforce fieldwork role + Assignment, commander approval/transfer, cadence-exception command capability và exact OrganizationUnit; UI chỉ phản ánh permission. Test phải chứng minh actor thiếu capability/sai role/sai unit/thiếu Assignment không thể dùng cadence exception.
4. Test contract/integration/E2E phủ cadence, lifecycle, evidence, approval/transfer, SLA, stats, scope và web-only write; Tester mới chạy các lệnh verification của ticket.

## 4. Bảng map thay đổi dự kiến với Acceptance Criteria và Rubric/contract

| Thay đổi/luồng dự kiến | Acceptance Criteria/đoạn ticket phục vụ | Rubric/contract phục vụ | Lý do kỹ thuật hoặc giới hạn map |
|---|---|---|---|
| Establishment fields, CRUD/list/detail, filter, archive và scope | AC line 36 | Rubric bắt buộc line 59; contract lines 82–83 | `Establishment` hiện chưa có risk/status/OrganizationUnit trong schema/state; API hiện chưa có filter tương ứng. |
| Cadence default 6, policy gate, next schedule, overdue, minimum 2 kỳ/năm | AC lines 37, 49 | Contract lines 84–85, 91; Rubric bắt buộc line 59; bước ticket lines 71, 75 | API phải authorize capability command cho cadence exception theo actor/role, OrganizationUnit và Assignment; reject denial ở API và test minimum 2 kỳ/năm, không để capability gate là conditional hay chỉ ở domain/UI. |
| Template/version cho 5 loại hình và snapshot Inspection | AC line 38 | `spec.md` lines 174–177; ticket lines 38, 84–85; bước ticket lines 73–75 | Rubric bắt buộc không có dòng riêng cho template; map vào nghiệp vụ chọn checklist theo loại hình và snapshot khi schedule/detail, không dùng ticket line 91 làm citation template/version. |
| Transition guard và completed immutable | AC line 39 | Rubric bắt buộc line 56; contract line 91 | Giữ Inspection là aggregate riêng, không dùng FieldUpdate. |
| Finding checklist key/result/Evidence IDs, severity/category | AC line 40; UI screen-08 lines 9–13 | Rubric bắt buộc line 56; contract lines 86, 94; `screen-08-inspection-workspace.md:9-13` | Map R1 chỉ ở traceability Finding–Evidence; `severity` và `category` phải có trong payload/domain/UI nếu audit xác nhận còn thiếu, hoặc matrix phải ghi rõ baseline đã đáp ứng. |
| Shared Evidence upload/readback với GPS/photo metadata | AC line 41 | Contract line 87; bước ticket line 72 | Reuse Evidence service hiện có; không tạo helper/storage mới. |
| InspectionResult và cấm legal conclusion tự động | AC line 42 | `CONTEXT.md` lines 77–91; `spec.md` lines 178–180 | Đây là domain semantics; không map R2 trừ invariant approval của recommendation. |
| Recommendation pending → approved/rejected/transferred, Approval, self-approval/transfer | AC line 43 | Rubric bắt buộc line 57 chỉ cho `pending_approval → approved` qua Approval hợp lệ; line 59 cho role/scope; contract lines 86, 93–94 | Reject/transfer map AC + R4, không gán chúng vào R2. |
| SLA 7 ngày, overdue event/notification/audit, không đổi result | AC line 44 | Contract line 95; `CONTEXT.md` lines 105–109 | SLA worker/platform đã có; Inspection chỉ tạo rule/linkage và dùng overdue path hiện có. Không map R2/R4 nếu thay đổi không phải authorization/approval. |
| Stats theo period/type, result/recommendation counts, tỷ lệ và scope | AC line 45 | Contract lines 99–100; UI screen-07 lines 9–12 | `inspectionStats` hiện lọc scope qua event records nhưng cần bảo đảm cùng boundary với aggregate/API. |
| `EnforcementTransferred` catalog entry và semantics event cũ | AC line 46; ticket line 28 | Contract line 94; bước ticket line 72 | Chỉ sửa `event-catalog.ts` nếu audit thấy thiếu/sai entry; không thay semantics event khác. |
| Web write, mobile read-only boundary | AC line 47 | `spec.md` lines 35–37, 74–79; bước ticket line 73 | Không sửa mobile trong allow-list ticket 04; không tạo test/mobile write mới. |
| Loading/empty/error/retry/permission/offline/unsaved/approval states | AC line 48 | Rubric khuyến nghị ticket lines 65–67; UI screen-07 lines 14–20, screen-08 lines 15–22, screen-09 lines 14–21 | UI rubric là khuyến nghị, nhưng ticket yêu cầu các state trong AC; shared client/Evidence/offline infrastructure giữ nguyên. |
| Cadence < policy cần capability API và test minimum 2/năm | AC line 49 | Contract line 84; Rubric bắt buộc line 59; bước ticket lines 71, 75 | Map vào API authorization boundary + `assertCadenceCapability`: kiểm tra capability command, actor role, OrganizationUnit và Assignment trước mutation; test positive exception, denial và minimum 2 kỳ/năm. Đây là R4/authorization bắt buộc, không phải điều kiện tùy chọn. |
| Required/evidence-required ở domain/API, reject complete thiếu Evidence ID | AC line 50 | Rubric bắt buộc line 58; contract line 86 | R3 chỉ map đúng enforcement domain/API và test; không coi UI `required` là bằng chứng. |
| Inspection-vs-FieldUpdate boundary và Finding–Evidence trace | Không có AC riêng | Rubric bắt buộc line 56; `CONTEXT.md` lines 77–87 | Đây là hai invariant rubric duy nhất; không gán R1 cho stats/SLA/UI chung. |
| Approval ordering `pending_approval → approved` | Không có AC riêng ngoài AC line 43 | Rubric bắt buộc line 57; contract lines 86, 93 | Chỉ test `submit pending → approve` có Approval record/approver hợp lệ; reject/transfer không map R2. |
| API fieldwork/approve/cadence-exception và OrganizationUnit authorization | AC lines 36, 43, 48–50 | Rubric bắt buộc line 59; `spec.md` lines 40–44, 66–70 | Enforcement phải ở route/module/domain, không chỉ session-role check trong component; OrganizationUnit cấp và tên hiển thị phải configurable, không hard-code. |
| Audit module/tests, giữ phần đạt, chỉ sửa gap | Bước ticket line 71 | Tất cả map trên theo gap matrix | Trước khi sửa source, phải tạo audit gap matrix trong `.brain/evidence/04-ps-e1007-inspection/audit-gap-matrix.md` với một dòng cho từng AC 36–50, Rubric 56–59 và bước 71–76; cột bắt buộc: invariant, file/hàm hiện hữu, test hiện hữu, trạng thái PASS/GAP, gap tối thiểu, file/test dự kiến sửa, kết quả mong đợi và citation. Không được coi “đã audit” nếu thiếu dòng hoặc thiếu kết quả mong đợi; chỉ sửa các dòng GAP. |
| Transfer, SLA, stats, Evidence GPS/photo | Bước ticket line 72; AC lines 41, 43–45 | Contract lines 87, 93–100 | Chỉ bổ sung phần audit chứng minh còn thiếu, không xây lại shared services. |
| Route/component screen-07–09 và design tokens | Bước ticket line 73; AC lines 36–48 | Rubric khuyến nghị lines 65–67; `screen-07-danh-sach-co-so-kinh-doanh.md`, `screen-08-inspection-workspace.md:9–22`, `screen-09-enforcement-recommendation-approval.md`; `design-tokens.md` | Chỉ component/route trong allow-list; screen-08 phải map rõ finding `severity/category` cùng checklist/evidence/result states; không sửa docs/UI spec và không dùng Stitch visual pass. |
| Synthetic establishments/checklists cho 5 types | Bước ticket line 74; AC line 38 | Contract line 91 | Fixture chỉ chứng minh type/template; không dùng fixture để giả đạt AC khác hoặc map Rubric bắt buộc. |
| Regression/integration tests cho cadence, transition, evidence, approval/transfer, SLA | Bước ticket line 75; AC lines 37–46, 49–50 | Rubric lines 56–59 tại đúng invariant tương ứng | Tách test theo contract; không tự chạy trong bước Developer theo ràng buộc phiên này. |
| Verification đầy đủ và log inspection tests | Bước ticket line 76 | `spec.md` lines 208–211, 228–238 | Tester phải chạy đúng thứ tự và ghi trong `tests.md` lệnh/kết quả của toàn bộ: `npm run prisma:generate`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run test:e2e`, `npm run build`; log phải chỉ rõ các test dưới `tests/inspections/**` đã được discover/executed, không chỉ ghi aggregate suite pass. Developer không chạy các lệnh này trong bước lập kế hoạch/triển khai. |
| Prisma field/index/constraint/migration additive | Cơ chế phục vụ AC lines 36–45, 49–50 | Rubric line 59 khi field/scope authorization liên quan | Migration không phải hành vi độc lập; chỉ map vào invariant cần persistence và không sửa lịch sử. |
| `index.ts` export wiring | Các AC/contract của symbol được route/test sử dụng | Rubric tương ứng với symbol được export | Không map độc lập; chỉ là public-surface wiring, tránh thêm export không cần thiết. |

### Thay đổi chưa map được và lý do

- Không dự kiến thay đổi product nào ngoài các dòng trên. Nếu audit phát hiện cần sửa shared Evidence/offline/identity/event worker/feature registry, đó là ngoài file được phép sửa và phải dừng xin Planner duyệt lại; không tự map vào AC để hợp thức hóa mở rộng scope.
- `src/modules/eventing/event-catalog.ts` chỉ là conditional audit candidate: nếu entry `EnforcementTransferred` hiện tại đúng contract thì không có diff product và không cần map thêm.
- Test/E2E và migration là phương tiện chứng minh hoặc persistence mechanism; không tự được coi là AC mới, nên chỉ map tới behavior/invariant mà chúng kiểm chứng.
