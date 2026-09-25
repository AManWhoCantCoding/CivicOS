# Review checkpoint cuối — 04-ps-e1007-inspection

## Kết luận

**PASS** — 15/15 Acceptance Criteria, 4 rubric bắt buộc và 6 bước thực hiện đều có đối chiếu với code/diff và evidence. Không có FAIL do bug; verification đầy đủ gần nhất là **Lần chạy 30**, `scope=full`, PASS, và Tree hiện tại khớp `ca44b228`.

## Verification bắt buộc

- Evidence được chọn: `.brain/evidence/04-ps-e1007-inspection/tests.md:1225-1238`, **Lần chạy 30**.
- Bảy bước đều PASS: `prisma:generate`, `typecheck`, `lint`, `format:check`, `test`, `test:e2e`, `build`.
- Tester ghi `Tree: ca44b228` tại `tests.md:1227`.
- Đã đối chiếu fingerprint cây hiện tại bằng ngoại lệ được phép: `node scripts/verify.mjs --tree` → `Tree: ca44b228`.
- Các lần chạy cũ có `FAIL`, `fast` hoặc `filter` không được dùng làm evidence verification đầy đủ.

## Đối chiếu 15 Acceptance Criteria

| AC | Kết quả | Bằng chứng code/diff và testcase |
|---|---|---|
| AC-01 CRUD/list/detail cơ sở với tên, chủ, địa chỉ, loại hình, giấy phép, tọa độ, risk, status | **PASS** | Route CRUD tại `src/app/api/establishments/route.ts:11-52` và `[establishmentId]/route.ts:12-81`; schema/migration thêm `risk`, `status`, `organizationId` tại `prisma/schema.prisma` diff và `prisma/migrations/20260925000000_ps_e1007_completion/migration.sql:1-20`; module persist/scope ở `src/modules/inspections/commands.ts:257-329,447-566`, list/detail/filter ở `projection.ts:257-348`. Test parser `tests/inspections/inspection-ps007-regression.test.ts:59-77`, E2E create/detail `tests/e2e/ps007-inspection.spec.ts:101-124`. |
| AC-02 cadence mặc định 6 tháng, tối thiểu 2 lần/năm, overdue view | **PASS** | `assertCadenceMonths` mặc định 6 và giới hạn policy tại `src/modules/inspections/commands.ts:49-57`; `scheduleNextInspection` cộng cadence và tạo kỳ kế tiếp tại `commands.ts:713-809`; UI overdue filter tại `src/components/inspections/InspectionScheduleBoard.tsx:35-51,138-191`. Test chứng minh kỳ 01/01 → 01/07, cadence 6 và overdue tại `tests/inspections/inspection-schedule.postgres.test.ts:151-217`; test due/overdue và SLA tại `inspection-slices-4-6.postgres.test.ts:468-533`. |
| AC-03 template/version theo loại hình, required trước complete | **PASS** | `ensureTemplate` có nhánh karaoke/bar, nhà nghỉ/khách sạn, cầm đồ, game và fallback tại `src/modules/inspections/commands.ts:97-205`; snapshot template/version khi schedule trong diff `commands.ts`. Test năm loại hình và snapshot version tại `tests/inspections/inspection-slices-4-6.postgres.test.ts:537-624`; required validation tại `626-658`. |
| AC-04 lifecycle scheduled → in_progress → completed, cấm skip/sửa completed | **PASS** | Guard `assertInspectionTransition` và `transitionInspection` tại `src/modules/inspections/domain.ts:45-64` và `src/modules/inspections/commands.ts:812-885`; complete gọi guard tại `commands.ts:647-710`; submit recommendation cũng chặn completed tại `commands.ts:1011-1015`. Test `tests/inspections/inspection-workflow.integration.test.ts:12-22` và E2E lifecycle `tests/e2e/ps007-inspection.spec.ts:157-167,220-243`. |
| AC-05 finding gắn checklist key, result, Evidence IDs | **PASS** | Payload canonical route truyền `checklistKey`, `result`, `evidenceIds`, `severity`, `category` tại `src/app/api/inspections/[inspectionId]/commands/route.ts:54-67`; persistence/event trace tại `src/modules/inspections/commands.ts:897-989`; contract `InspectionFindingRecord` tại `src/modules/inspections/contracts.ts:14-23`. Test `inspection-slices-4-6.postgres.test.ts:833-927` kiểm tra key/result, Evidence ID đúng resource và thứ tự event; parser regression tại `inspection-ps007-regression.test.ts:96-113`. |
| AC-06 Evidence ảnh/tài liệu, GPS capture/received metadata qua Evidence service | **PASS** | UI dùng shared `EvidenceCapture` với `resourceType="Inspection"`, `resourceId`, upload callback tại `src/components/inspections/InspectionFindingForm.tsx:200-211`; diff không sửa shared Evidence service/API. Test tạo ảnh JPEG với `capturedAt`, `latitude`, `longitude` tại `inspection-slices-4-6.postgres.test.ts:698-720,886-907`; E2E upload ảnh tại `tests/e2e/ps007-inspection.spec.ts:177-187`. |
| AC-07 InspectionResult pass/reminder/needs_action | **PASS** | Union kết quả tại `src/modules/inspections/contracts.ts:3-4,12`; `isInspectionResult` được dùng trong complete/finding tại `commands.ts:647-653,911-914`; stats trả ba nhóm tại `projection.ts:486-492`. Test contract `tests/inspections/inspection-contract.test.ts:33-40`, finding/result tại `inspection-slices-4-6.postgres.test.ts:833-969`, E2E xác nhận `needs_action` và không có kết luận pháp lý tại `ps007-inspection.spec.ts:220-243`. |
| AC-08 recommendation pending/approved/rejected/transferred, Approval, commander khác, không legal conclusion | **PASS** | Status union/domain tại `src/modules/inspections/contracts.ts:25-26` và `domain.ts:42-43`; approve/reject tạo Approval và chặn self-approval trong diff `commands.ts:1202-1248`; transfer độc lập tạo Approval, đổi status, event và audit tại `commands.ts:1112-1194`; canonical command route tại `commands.ts route.ts:69-115`. Test role/self-approval/approve/reject/transfer tại `inspection-slices-4-6.postgres.test.ts:626-772,971-1062`; E2E approval và không có sanction/legal conclusion tại `ps007-inspection.spec.ts:200-243`. |
| AC-09 SLA vi phạm 7 ngày, overdue event/notification/audit | **PASS** | Rule canonical `inspection_violation_resolution_7d` với 7×24 giờ tại `src/modules/inspections/config.ts:1-10`; submit recommendation tạo SLA và audit tại `src/modules/inspections/commands.ts:1056-1075`; platform worker phát `SlaOverdue` một lần theo cập nhật trạng thái tại `src/modules/platform/sla/index.ts:90-128`, notification consumer nhận `SlaOverdue` tại `src/modules/platform/notifications/index.ts:62-86`. Test SLA liên tục qua cuối tuần và hoàn tất/overdue tại `inspection-slices-4-6.postgres.test.ts:468-533`; Lần chạy 30 full PASS tại `tests.md:1225-1238`. |
| AC-10 thống kê tỷ lệ đạt/nhắc nhở/vi phạm theo loại hình | **PASS** | API stats tại `src/app/api/inspections/stats/route.ts:6-26`; `inspectionStats` lọc period/type, scope unit, đếm result/recommendation, rates và `generatedAt` tại `src/modules/inspections/projection.ts:442-546`. Test totals/status/rates/filter/generatedAt tại `tests/inspections/inspection-stats.postgres.test.ts:189-250` và exact OrganizationUnit exclusion tại `252-273`. |
| AC-11 đăng ký `EnforcementTransferred`, giữ semantics event cũ | **PASS** | Diff `src/modules/eventing/event-catalog.ts:91` chỉ thêm đúng `inspection('EnforcementTransferred')`; domain/projection/contract cùng khai báo event version 1 tại `src/modules/inspections/domain.ts:12-40`, `projection.ts:33-38`; test catalog/ownership cập nhật tại `tests/inspections/inspection-contract.test.ts:57-76` và diff event catalog test. Không có thay đổi semantics các event cũ trong diff. |
| AC-12 web write, mobile read-only | **PASS** | Các command write đi qua web API/canonical command route tại `src/app/api/inspections/[inspectionId]/commands/route.ts:25-121`; E2E web lifecycle/offline write tại `tests/e2e/ps007-inspection.spec.ts:91-244,271-316`. Diff không thêm mobile write flow; thay đổi UI/API nằm trong scope web và `src/app/api/sync/route.ts` được user chấp thuận mở rộng scope. |
| AC-13 loading/empty/error-retry/permission/offline/unsaved/approval states | **PASS** | Loading/error/retry/permission ở `src/components/inspections/EstablishmentDetail.tsx:24-119`, `EstablishmentList.tsx:26-107`, `InspectionDetail.tsx:92-224`; offline queue/guard và progress tại `ChecklistForm.tsx:57-79,100-125,167-205`; unsaved `beforeunload` tại `ChecklistForm.tsx:67-79`; finding offline/upload states tại `InspectionFindingForm.tsx:55-120,200-224`; approval/SLA/transfer states tại `EnforcementApprovalPanel.tsx:145-259`. E2E empty/approval/denied/offline tại `ps007-inspection.spec.ts:84-89,200-243,246-269,271-316`. |
| AC-14 cadence dưới policy chỉ khi có command capability phù hợp, test tối thiểu 2 lần/năm | **PASS** | `assertCadenceCapability` kiểm tra actor có OrganizationUnit và `assertAccess(..., 'mutate')` trước schedule tại `src/modules/inspections/commands.ts:60-78,333-357`; unauthorized cadence 3 bị reject trong `inspection-slices-4-6.postgres.test.ts:361-377`; default 6 và hai occurrence trong năm tại `inspection-schedule.postgres.test.ts:165-217`; parser regression tại `inspection-ps007-regression.test.ts:13-27`. |
| AC-15 required/evidence-required enforce domain/API, thiếu Evidence ID reject complete | **PASS** | Domain guard `assertChecklistComplete` và `assertChecklistEvidence` tại `src/modules/inspections/domain.ts:88-121`; API command `complete` gọi `completeInspection` tại `src/app/api/inspections/[inspectionId]/commands/route.ts:47-53`, còn module gọi cả hai guard tại `src/modules/inspections/commands.ts:664-678`. Test domain `inspection-workflow.integration.test.ts:24-80` và DB bypass UI reject `inspection-slices-4-6.postgres.test.ts:626-720`. |

## Rubric bắt buộc

| Rubric | Kết quả | Đối chiếu |
|---|---|---|
| R1 — Inspection không thay cho FieldUpdate; finding/Evidence có trace | **PASS** | `InspectionDomainEventOwnership` chỉ dùng aggregate `Establishment`/`Inspection` tại `domain.ts:7-10`; finding có `inspectionId`, `checklistKey`, `evidenceIds` tại `contracts.ts:14-23`; `recordFinding` kiểm tra inspection/key/Evidence và ghi event tại `commands.ts:906-989`; test trace tại `inspection-slices-4-6.postgres.test.ts:833-927`. Context định nghĩa Inspection/InspectionFinding ở `CONTEXT.md:77-87`. |
| R2 — Recommendation chỉ thành kết quả được chấp thuận sau Approval | **PASS** | `submitRecommendation` tạo `pending_approval` mặc định và tạo SLA/audit tại `commands.ts:1017-1077`; approve/reject/transfer tạo Approval trước quyết định trong diff `commands.ts`; test pending/self-approval/commander khác tại `inspection-slices-4-6.postgres.test.ts:721-764,971-1062`. |
| R3 — required/evidence-required ở domain/API, không chỉ form | **PASS** | Hai guard domain tại `domain.ts:88-121` được gọi từ `saveChecklistResponses`/`completeInspection` tại `commands.ts:617-678`; test integration `inspection-workflow.integration.test.ts:24-80` và DB test `inspection-slices-4-6.postgres.test.ts:626-720`. |
| R4 — fieldwork/approve/OrganizationUnit scope ở API/module boundary | **PASS** | Route là adapter gọi module canonical tại `src/app/api/inspections/[inspectionId]/commands/route.ts:25-121`; `assertInspectionAccess` kiểm tra OrganizationUnit exact rồi `assertAccess` tại `commands.ts:207-233`; test assigned/unassigned/cross-unit/commander/transfer tại `inspection-slices-4-6.postgres.test.ts:971-1062` và E2E API 403 tại `ps007-inspection.spec.ts:246-269`. |

## Các bước thực hiện

| Bước | Kết quả | Bằng chứng |
|---|---|---|
| 1. Audit module/tests, chỉ sửa gap | **PASS** | `changes.md:16-24` ghi audit matrix và các nhóm GAP được sửa; diff tập trung module/routes/schema/tests inspection. |
| 2. Transfer, SLA, statistics, Evidence GPS/photo | **PASS** | `changes.md:11-23,58-60`; code transfer `commands.ts:1112-1194`, SLA `config.ts:7-10`/`commands.ts:1056-1075`, stats `projection.ts:442-546`, Evidence test `inspection-slices-4-6.postgres.test.ts:698-720`. |
| 3. Route/component theo screen-07–09 và design tokens | **PASS** | `changes.md:8,13,21-22,35-37`; diff route canonical và các component inspection dùng `civicos-*` variables. |
| 4. Synthetic establishments/checklists cho karaoke, bar, cầm đồ, game, khách sạn | **PASS** | `inspection-slices-4-6.postgres.test.ts:537-624` tạo/đối chiếu các nhánh template; Lần chạy 30 full PASS `tests.md:1225-1238`. |
| 5. Regression/integration cho cadence, transition, evidence, approval/transfer, SLA | **PASS** | Test names và assertions tại `inspection-ps007-regression.test.ts:13-113`, `inspection-workflow.integration.test.ts:12-96`, `inspection-slices-4-6.postgres.test.ts:361-1062`; Lần chạy 30 full PASS. |
| 6. Verification đầy đủ và inspection tests được discover/executed | **PASS** | `tests.md:1225-1238` ghi `scope=full`, cả bảy lệnh PASS; Tree khớp `ca44b228` tại `tests.md:1227` và verify hiện tại. Test source dưới `tests/inspections/**` nằm trong diff/evidence mapping và được bao phủ bởi bước `test` của run full. |

## Scope và direction gate

- **PASS — scope ticket:** Các thay đổi product phục vụ ticket nằm trong allow-list tại ticket `:7-20`: `src/modules/inspections/**`, establishment/inspection routes, `src/app/inspections/**`, `src/components/inspections/**`, `src/app/api/sync/route.ts`, `prisma/schema.prisma`, migration, `tests/inspections/**` và integration/E2E liên quan.
- **PASS — scope mở rộng được duyệt:** `src/modules/eventing/event-catalog.ts` chỉ thêm `EnforcementTransferred`, đúng quyết định ticket `:27-30` và `scope-change.md:3-6`; không thấy thay đổi semantics event cũ.
- **Baseline ngoài ticket được phân biệt và không tính lỗi:** diff còn có nhóm Identity/Incident/Vehicle/parallel-wave và migration Identity, ví dụ `src/modules/identity/contracts.ts`, `tests/identity/**`, `tests/incidents/incident-ticket04.postgres.test.ts`, `tests/e2e/ps009-vehicle-watch.spec.ts`, `prisma/migrations/20260922_identity_role_catalog/migration.sql`. Các hunks này là thay đổi baseline của ticket khác, không được map vào AC-01..15; `plan.md`/`changes.md` cũng tách baseline và ticket-owned change. Không có bằng chứng cho thấy chúng là logic tự ý của ticket 04.
- **Process artifact:** `Lesson-learned.md` được cập nhật theo quy định agent; không phải product logic của ticket.
- **PASS — direction gate:** Ticket ghi `Gate hướng: có` tại ticket `:5-6`; `changes.md:33-37` ghi rõ các sửa cục bộ sau Gate HƯỚNG. Boundary hiện tại không vi phạm: Inspection vẫn là aggregate riêng, Approval tách khỏi submit, transfer là command độc lập, Evidence/offline/identity kernel được tái sử dụng, exact OrganizationUnit được kiểm tra tại module trước mutation/read. `docs/adr/` hiện không có ADR trên đĩa; không có ADR liên quan để đối chiếu thêm.

## Spec-to-Code Traceability Matrix

| ID Yêu cầu (AC) | Mức độ đáp ứng | File & Dòng Code xử lý | Test Case chứng minh |
| :--- | :--- | :--- | :--- |
| AC-01 | PASS | `src/app/api/establishments/route.ts:11-52`; `src/app/api/establishments/[establishmentId]/route.ts:12-81`; `src/modules/inspections/commands.ts:257-329,447-566`; `src/modules/inspections/projection.ts:257-348` | `tests/inspections/inspection-ps007-regression.test.ts:59-77`; `tests/e2e/ps007-inspection.spec.ts:101-124` |
| AC-02 | PASS | `src/modules/inspections/commands.ts:49-57,713-809`; `src/components/inspections/InspectionScheduleBoard.tsx:35-51,138-191` | `tests/inspections/inspection-schedule.postgres.test.ts:151-217`; `tests/inspections/inspection-slices-4-6.postgres.test.ts:468-533` |
| AC-03 | PASS | `src/modules/inspections/commands.ts:97-205,713-809` | `tests/inspections/inspection-slices-4-6.postgres.test.ts:537-624` |
| AC-04 | PASS | `src/modules/inspections/domain.ts:45-64`; `src/modules/inspections/commands.ts:647-710,812-885` | `tests/inspections/inspection-workflow.integration.test.ts:12-22`; `tests/e2e/ps007-inspection.spec.ts:157-167,220-243` |
| AC-05 | PASS | `src/app/api/inspections/[inspectionId]/commands/route.ts:54-67`; `src/modules/inspections/commands.ts:897-989`; `src/modules/inspections/contracts.ts:14-23` | `tests/inspections/inspection-slices-4-6.postgres.test.ts:833-927`; `tests/inspections/inspection-ps007-regression.test.ts:96-113` |
| AC-06 | PASS | `src/components/inspections/InspectionFindingForm.tsx:200-211`; shared Evidence API/service unchanged and reused | `tests/inspections/inspection-slices-4-6.postgres.test.ts:698-720,886-907`; `tests/e2e/ps007-inspection.spec.ts:177-187` |
| AC-07 | PASS | `src/modules/inspections/contracts.ts:3-4,12`; `src/modules/inspections/commands.ts:647-653,911-914` | `tests/inspections/inspection-contract.test.ts:33-40`; `tests/e2e/ps007-inspection.spec.ts:220-243` |
| AC-08 | PASS | `src/modules/inspections/commands.ts:992-1077,1112-1194,1202-1248`; canonical route `src/app/api/inspections/[inspectionId]/commands/route.ts:69-115` | `tests/inspections/inspection-slices-4-6.postgres.test.ts:721-764,971-1062`; `tests/e2e/ps007-inspection.spec.ts:200-243` |
| AC-09 | PASS | `src/modules/inspections/config.ts:7-10`; `src/modules/inspections/commands.ts:1056-1075`; platform `markOverdue`/notification consumer | `tests/inspections/inspection-slices-4-6.postgres.test.ts:468-533`; `tests.md:1225-1238` (`test`/full suite PASS) |
| AC-10 | PASS | `src/app/api/inspections/stats/route.ts:6-26`; `src/modules/inspections/projection.ts:442-546` | `tests/inspections/inspection-stats.postgres.test.ts:189-273` |
| AC-11 | PASS | `src/modules/eventing/event-catalog.ts:91`; `src/modules/inspections/domain.ts:12-40`; `src/modules/inspections/projection.ts:33-38` | `tests/inspections/inspection-contract.test.ts:57-76`; `tests.md:1225-1238` |
| AC-12 | PASS | `src/app/api/inspections/[inspectionId]/commands/route.ts:25-121`; no mobile write file added/changed | `tests/e2e/ps007-inspection.spec.ts:91-244,271-316` |
| AC-13 | PASS | `src/components/inspections/ChecklistForm.tsx:67-79,167-205`; `InspectionFindingForm.tsx:55-120,200-224`; `EnforcementApprovalPanel.tsx:145-259`; detail/list state branches | `tests/e2e/ps007-inspection.spec.ts:84-89,200-243,246-316` |
| AC-14 | PASS | `src/modules/inspections/commands.ts:60-78,333-357`; parser `src/modules/inspections/schemas.ts:49-80` | `tests/inspections/inspection-slices-4-6.postgres.test.ts:361-377`; `tests/inspections/inspection-schedule.postgres.test.ts:165-217` |
| AC-15 | PASS | `src/modules/inspections/domain.ts:88-121`; `src/modules/inspections/commands.ts:617-678`; canonical complete route `src/app/api/inspections/[inspectionId]/commands/route.ts:47-53` | `tests/inspections/inspection-workflow.integration.test.ts:24-80`; `tests/inspections/inspection-slices-4-6.postgres.test.ts:626-720` |

## Trục trặc gặp phải

- Diff toàn repo vượt giới hạn hiển thị của tool; đã xử lý bằng cách đọc `status/name-status/stat` và chia diff theo nhóm file, không chạy lại kiểm tra. Đã cập nhật biến thể tổng quát **Portable diff-output paging** trong `Lesson-learned.md` để ghi nhận trường hợp diff chứa baseline nhiều ticket.
- Không có retry model, dialog quyền, hoặc git identity/commit trong vòng review này.

## Round-trip check bắt buộc

### Bước 1 — Suy ngược trước khi đọc ticket gốc

Phần này được suy ngược chỉ từ implementation diff/evidence và các test PASS; nguồn test PASS đầy đủ được đối chiếu là **Lần chạy 30** tại `tests.md:1225-1238` (`scope=full`, không có `filter`). Ticket gốc chưa được mở ở bước này.

Yêu cầu nghiệp vụ mà implementation/test đang cố đáp ứng:

1. Quản lý danh mục cơ sở kinh doanh có điều kiện: tạo/cập nhật/xem cơ sở với thông tin chủ, địa chỉ, loại hình, giấy phép, tọa độ, risk/status; dữ liệu phải bị giới hạn theo OrganizationUnit.
2. Lập lịch kiểm tra theo chu kỳ mặc định 6 tháng, tạo kỳ kế tiếp sau khi hoàn tất, hiển thị kỳ upcoming/overdue; cadence ngắn hơn chỉ được dùng khi actor có quyền phù hợp.
3. Chọn checklist/template theo loại hình và snapshot version; bắt buộc lifecycle `scheduled → in_progress → completed`, không bỏ qua bước, và không hoàn tất khi thiếu item bắt buộc.
4. Ghi finding gắn với checklist key, result, phân loại và Evidence IDs; Evidence là ảnh/tài liệu có metadata capture GPS và phải được kiểm tra ở boundary domain/API.
5. Hỗ trợ kết quả `pass`, `reminder`, `needs_action`; nếu cần xử lý thì phải có recommendation riêng, chờ phê duyệt của commander khác, có reject/revise và transfer độc lập, không tự động tạo kết luận pháp lý.
6. Theo dõi SLA liên tục 7 ngày cho xử lý vi phạm, trạng thái overdue/completed, audit và các event/notification liên quan.
7. Cung cấp thống kê theo period/loại hình gồm tổng cơ sở, tổng inspection, các nhóm kết quả, trạng thái recommendation và tỷ lệ theo loại hình, chỉ trong đúng OrganizationUnit.
8. Công bố đầy đủ event lifecycle, đặc biệt `EnforcementTransferred`, đồng thời giữ semantics event hiện hữu; command/API canonical phải hỗ trợ online/offline versioning, deduplication và truyền nguyên metadata finding.
9. Web là bề mặt ghi dữ liệu; UI phải thể hiện permission, loading/empty/error-retry, offline-write, unsaved, progress và approval states; actor fieldwork chỉ thao tác resource được giao và đúng scope.

### Bước 2 — Đối chiếu sau khi mở ticket gốc

| ID suy ngược | Đối chiếu với ticket gốc | Kết quả | Bằng chứng |
|---|---|---|---|
| RT-01 | Khớp với AC CRUD/list/detail cơ sở và các canonical route register/read/update trong ticket. | **PASS** | Ticket `:38`, `:84-85`. Implementation/evidence: `changes.md:18-23`; test parser `inspection-ps007-regression.test.ts:59-77`. |
| RT-02 | Khớp với AC cadence 6 tháng, overdue và cadence dưới policy cần capability; mô tả ticket cũng yêu cầu lịch 6 tháng/lần. | **PASS** | Ticket `:39`, `:51`; test recurring/overdue `inspection-schedule.postgres.test.ts:151-217`, `inspection-slices-4-6.postgres.test.ts:468-533`. |
| RT-03 | Khớp với AC template/version theo loại hình, required item và state transition. | **PASS** | Ticket `:40-41`, `:93`; test template/version `inspection-slices-4-6.postgres.test.ts:537-624` và required validation `:626-658`. |
| RT-04 | Khớp với AC finding/Evidence/result và canonical Evidence metadata/GPS. | **PASS** | Ticket `:42-44`, `:89`, `:52`; test finding/Evidence `inspection-slices-4-6.postgres.test.ts:833-927` và GPS Evidence `:698-720`. |
| RT-05 | Khớp với recommendation pending/approved/rejected/transfer, commander approval/transfer và không tự động kết luận pháp lý. | **PASS** | Ticket `:45`, `:95`; test approval/reject/transfer/self-approval `inspection-slices-4-6.postgres.test.ts:721-772,971-1062`; E2E evidence tại `tests.md:1225-1238`. |
| RT-06 | Khớp với SLA vi phạm 7 ngày, overdue event/notification và audit; không có lệch nghiệp vụ trong phần suy ngược. | **PASS** | Ticket `:46`, `:97`; implementation/evidence `changes.md:18-23`; test SLA `inspection-slices-4-6.postgres.test.ts:468-533`. |
| RT-07 | Khớp với thống kê theo loại hình, period/filter, recommendation status và OrganizationUnit scope. | **PASS** | Ticket `:47`, `:101-102`; test stats `inspection-stats.postgres.test.ts:189-273`. |
| RT-08 | Khớp với yêu cầu đăng ký `EnforcementTransferred` và giữ semantics event hiện hữu. | **PASS** | Ticket `:48`, `:96`; `changes.md:28-29`; test contract/event catalog nằm trong full PASS Lần 30 `tests.md:1236-1238`. |
| RT-09 | Khớp với web write/mobile read-only và các UI state bắt buộc. | **PASS** | Ticket `:49-50`; `changes.md:8,13,21-22,35-37`; full E2E PASS tại `tests.md:1237`. |
| RT-10 | Khớp với rubric yêu cầu fieldwork/approve và OrganizationUnit scope ở API/domain, không chỉ ở UI. | **PASS** | Ticket `:58-62`; test assigned/unassigned/cross-unit/approval `inspection-slices-4-6.postgres.test.ts:971-1062`. |

### Kết luận round-trip

**PASS** — 10/10 nhóm yêu cầu suy ngược khớp với yêu cầu nghiệp vụ trong ticket gốc; không phát hiện lệch hướng giữa code/test PASS và ticket. Đây là kết luận riêng của round-trip check, không thay thế việc Tester chạy lại verification trên cây mã mới.
