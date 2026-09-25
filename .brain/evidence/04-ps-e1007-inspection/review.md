# Review checkpoint cuối — 04-ps-e1007-inspection

## Kết luận

**PASS** — 15/15 Acceptance Criteria, 4 rubric bắt buộc và 3 trục khuyến nghị đều đạt theo diff/code và evidence hiện tại. Cho phép Planner chuyển sang **round-trip check**. Không commit và không sửa source.

## Verification bắt buộc

| Hạng mục | Kết quả | Bằng chứng |
|---|---|---|
| Chọn đúng evidence | **PASS** | Chỉ dùng `tests.md:1306-1319`, Lần chạy 34, `scope=full`, `HEAD: 22b3765`, không có `filter`, đủ 7 bước PASS. Các lần cũ/`fast`/có filter không được dùng. |
| Tree checkpoint | **PASS** | Tester ghi `Tree: a88d1cfb` tại `tests.md:1308`; output đối chiếu `node scripts/verify.mjs --tree` là `Tree: a88d1cfb`. |
| Evidence metadata phụ | **PASS** | `files-changed.md:11,61` còn ghi Lần chạy 30/Tree cũ `ca44b228`; đây là metadata stale, không thay thế mục full gần nhất trong `tests.md`. |

## Đối chiếu Acceptance Criteria

AC được đánh số theo thứ tự 15 dòng tại ticket `:38-52`.

| ID | Kết quả | File & dòng code xử lý | Test case/evidence |
|---|---|---|---|
| AC-01 — CRUD/list/detail cơ sở, đủ thông tin và trạng thái | **PASS** | `src/modules/inspections/commands.ts:257-329,447-566`; `src/modules/inspections/projection.ts:257-347`; route establishment trong `src/app/api/establishments/**` | `tests/inspections/inspection-ps007-regression.test.ts`; `tests/e2e/ps007-inspection.spec.ts`; run 34 full PASS tại `tests.md:1306-1319` |
| AC-02 — cadence mặc định 6 tháng, tối thiểu 2 lần/năm, overdue | **PASS** | `src/modules/inspections/commands.ts:49-78,333-443,713-809`; `src/components/inspections/InspectionScheduleBoard.tsx` | `tests/inspections/inspection-schedule.postgres.test.ts:151-217`; `tests/inspections/inspection-slices-4-6.postgres.test.ts:496-563`; run 34 full PASS |
| AC-03 — template/version theo loại hình, required item | **PASS** | `src/modules/inspections/commands.ts:97-205,357-377` | `tests/inspections/inspection-slices-4-6.postgres.test.ts:565-652`; run 34 full PASS |
| AC-04 — lifecycle không skip, completed không sửa trái phép | **PASS** | `src/modules/inspections/domain.ts:45-64`; `src/modules/inspections/commands.ts:647-710,812-886` | `tests/inspections/inspection-workflow.integration.test.ts`; `tests/e2e/ps007-inspection.spec.ts`; run 34 full PASS |
| AC-05 — finding có checklist key, result, Evidence IDs | **PASS** | `src/app/api/inspections/[inspectionId]/commands/route.ts:54-67`; `src/modules/inspections/commands.ts:897-989` | `tests/inspections/inspection-slices-4-6.postgres.test.ts:861-997`; `tests/inspections/inspection-ps007-regression.test.ts`; run 34 full PASS |
| AC-06 — Evidence ảnh/tài liệu, GPS/captured/received metadata | **PASS** | `src/components/inspections/InspectionFindingForm.tsx`; shared Evidence service/API được tái sử dụng, không bị thay semantics | `tests/inspections/inspection-slices-4-6.postgres.test.ts:914-937`; `tests/e2e/ps007-inspection.spec.ts`; run 34 full PASS |
| AC-07 — kết quả `pass`, `reminder`, `needs_action` | **PASS** | `src/modules/inspections/contracts.ts`; `src/modules/inspections/commands.ts:647-710`; `src/modules/inspections/projection.ts:442-546` | `tests/inspections/inspection-contract.test.ts`; finding/result assertions trong `inspection-slices-4-6.postgres.test.ts`; run 34 full PASS |
| AC-08 — recommendation pending/approved/rejected/transferred, Approval, không legal conclusion tự động | **PASS** | `src/modules/inspections/commands.ts:992-1077,1081-1212`; canonical command route `src/app/api/inspections/[inspectionId]/commands/route.ts:69-115` | `tests/inspections/inspection-slices-4-6.postgres.test.ts:654-801,999-1091,1093-1193`; `tests/e2e/ps007-inspection.spec.ts`; run 34 full PASS |
| AC-09 — SLA 7 ngày, overdue event/notification/audit | **PASS** | `src/modules/inspections/config.ts:1-10`; `src/modules/inspections/commands.ts:1017-1077`; platform SLA/notification path hiện có | `tests/inspections/inspection-slices-4-6.postgres.test.ts:496-563`; run 34 full PASS |
| AC-10 — thống kê theo loại hình và tỷ lệ | **PASS** | `src/app/api/inspections/stats/route.ts`; `src/modules/inspections/projection.ts:442-546` | `tests/inspections/inspection-stats.postgres.test.ts:189-273`; run 34 full PASS |
| AC-11 — catalog có `EnforcementTransferred`, event cũ giữ semantics | **PASS** | `src/modules/eventing/event-catalog.ts:91`; `src/modules/inspections/domain.ts:12-40`; `src/modules/inspections/projection.ts:33-38` | `tests/inspections/inspection-contract.test.ts:57-76`; event-catalog contract trong run 34 full PASS |
| AC-12 — Web ghi dữ liệu, mobile read-only | **PASS** | Write boundary nằm ở web API/canonical command route `src/app/api/inspections/[inspectionId]/commands/route.ts:25-121`; không có mobile write trong diff ticket | `tests/e2e/ps007-inspection.spec.ts:91-244,271-316`; run 34 full PASS |
| AC-13 — loading/empty/error-retry/permission/offline/unsaved/approval states | **PASS** | `src/components/inspections/EstablishmentList.tsx`, `EstablishmentDetail.tsx`, `InspectionDetail.tsx`, `ChecklistForm.tsx`, `InspectionFindingForm.tsx`, `EnforcementApprovalPanel.tsx:168-323` | `tests/e2e/ps007-inspection.spec.ts:84-89,200-316`; run 34 full PASS |
| AC-14 — cadence dưới policy cần command capability và tối thiểu 2 kỳ/năm | **PASS** | `src/modules/inspections/commands.ts:49-78,333-357`; API gọi module canonical trước mutation | `tests/inspections/inspection-slices-4-6.postgres.test.ts:371-387`; `tests/inspections/inspection-schedule.postgres.test.ts:151-217`; run 34 full PASS |
| AC-15 — required/evidence-required enforce ở domain/API | **PASS** | `src/modules/inspections/domain.ts:88-121`; `src/modules/inspections/commands.ts:647-684`; canonical complete route | `tests/inspections/inspection-slices-4-6.postgres.test.ts:654-801`; `tests/inspections/inspection-workflow.integration.test.ts`; run 34 full PASS |

## Rubric bắt buộc

| Rubric | Kết quả | Bằng chứng |
|---|---|---|
| R1 — `Inspection` không thay cho `FieldUpdate`; finding/Evidence có truy vết | **PASS** | `CONTEXT.md:77-87` định nghĩa riêng `Inspection`/`InspectionFinding`; `src/modules/inspections/contracts.ts` giữ `inspectionId`, `checklistKey`, `evidenceIds`; `recordFinding` kiểm tra liên kết và phát event. Test trace trong `inspection-slices-4-6.postgres.test.ts:861-997`. |
| R2 — recommendation chỉ thành kết quả được chấp thuận sau Approval | **PASS** | `CONTEXT.md:89-91`; submit tạo `pending_approval`, các lệnh approve/reject/transfer tạo Approval và chặn self-approval trong `commands.ts:992-1212`. Test pending/self-approval/commander khác tại `inspection-slices-4-6.postgres.test.ts:654-801,999-1091`. |
| R3 — required/evidence-required ở domain/API, không chỉ form | **PASS** | Guard tại `domain.ts:88-121` được gọi từ `commands.ts:667-684`; test bypass UI thiếu item/evidence tại `inspection-slices-4-6.postgres.test.ts:654-801`. |
| R4 — fieldwork/approve và OrganizationUnit scope ở API/module boundary | **PASS** | `assertInspectionAccess` tại `commands.ts:207-233` kiểm tra exact `organizationUnitId` trước `assertAccess`; `listEstablishments` gọi `readModels(..., { organizationId: actor.organizationUnitId })` tại `projection.ts:257-267`; `readModels` lọc JSON `state.organizationId` tại `src/modules/eventing/read-model.ts:192-213`. |

### Xác nhận finding cũ về projected read-model là false positive

- Review cũ cho rằng nhánh projection của `listEstablishments` map toàn bộ projection và chỉ filter status/type/risk nên có thể lộ chéo.
- Code hiện tại truyền `organizationId` vào `readModels` (`projection.ts:263-267`); `readModels` áp điều kiện `state: { path: ['organizationId'], equals: options.organizationId }` (`read-model.ts:202-213`) trước khi trả projection.
- Nhánh fallback DB cũng lọc `organizationId` (`projection.ts:272-281`), nên không có nhánh đọc nào bỏ qua scope.
- Regression test tạo establishment ở unit actor và unit cấp trên, rebuild projection, rồi assert local có mặt và `upperId` không có mặt (`tests/inspections/inspection-slices-4-6.postgres.test.ts:441-457`). Vì vậy finding cũ là **false positive sau repair**, không phải bug còn tồn tại.

## Blocker standards đã sửa

| Tiêu chí | Kết quả | Bằng chứng |
|---|---|---|
| UI không hard-code tên/cấp CA huyện | **PASS** | `EnforcementApprovalPanel.tsx:11-16,49-60,252-295` tải OrganizationUnit cấu hình; option dùng `unit.name`/`unit.level`, fallback và thông báo đều dùng “OrganizationUnit đích”. Search source `src/components/inspections/**` không còn `CA huyện`, `cấp huyện`, `district`, `huyen` hoặc `huyện`. |
| Transfer không dùng alias nghiệp vụ cố định | **PASS** | `commands.ts:1132-1159` chỉ yêu cầu target active và target nằm trong chuỗi `parentId` của actor; không còn allow-list `district/huyen/huyện`. Test fixture cấu hình `name`, `level`, `parentId` tại `inspection-slices-4-6.postgres.test.ts:149-163`, transfer kiểm chứng tại `:1067-1091`. |
| UI dùng dữ liệu OrganizationUnit thật | **PASS** | `EnforcementApprovalPanel.tsx:51-58,268-271` đọc `/api/identity/organization-units` và hiển thị dữ liệu `name`/`level`; `commands.ts:1147-1152` duyệt `parentId`. |

## Rubric khuyến nghị

| Trục | Kết quả | Bằng chứng |
|---|---|---|
| Thiết kế/UI | **PASS** (đạt ngưỡng) | Các component inspection dùng `civicos-*` design tokens, approval/transfer bám workflow; E2E run 34 PASS. |
| Thao tác/UX | **PASS** (đạt ngưỡng) | `ChecklistForm` có progress, required/evidence feedback, dirty/unsaved và offline guard; `InspectionFindingForm` dùng Evidence/GPS; E2E run 34 PASS. |
| Quy trình | **PASS** (đạt ngưỡng) | Lifecycle, recommendation Approval/reject/transfer và SLA được tách command; test inspection slices và E2E nằm trong run 34 full PASS. |

## Traceability Matrix tổng hợp

Ma trận đầy đủ nằm trong bảng AC ở trên; không có dòng code mới của repair bị bỏ ngoài AC/rubric:

| Thay đổi repair | AC/rubric phục vụ | Kết quả |
|---|---|---|
| OrganizationUnit picker trong `EnforcementApprovalPanel` | AC-08, AC-13, R4, CONTEXT OrganizationUnit | PASS |
| Transfer hierarchy traversal bằng `parentId` | AC-08, R2, R4, boundary ADR-0004 | PASS |
| `readModels` truyền/lọc `organizationId` ở projected list | AC-01, R4, ADR-0001 | PASS |
| Regression hai OrganizationUnit trên projected path | AC-01, R4 | PASS |
| Type annotation cho hierarchy query | Hỗ trợ compile của AC-08/R4 | PASS; run 34 typecheck PASS |

## Boundary module và direction gate

**PASS.** Ticket ghi `Gate hướng: có` tại `:5-6`; gate không bị bỏ qua.

- `CONTEXT.md:77-91` giữ `Inspection`, `InspectionFinding` và `EnforcementRecommendation` là các khái niệm riêng; implementation không dùng `FieldUpdate` thay thế và không tự phát hành kết luận pháp lý.
- `CONTEXT.md:47-49` yêu cầu OrganizationUnit có tên/cấp cấu hình được; UI/backend hiện dùng dữ liệu OrganizationUnit và hierarchy `parentId`, không cố định “CA huyện”.
- ADR-0001 (baseline `22b3765`) yêu cầu domain event + transactional outbox + replayable projection; module vẫn ghi event qua boundary hiện có và đọc qua projection có scope.
- ADR-0002 yêu cầu modular monolith, explicit module/adapters và worker dùng outbox; route là adapter, logic inspection nằm trong `src/modules/inspections`, shared Evidence/SLA/worker được tái sử dụng.
- ADR-0004 yêu cầu capability/Assignment/exact OrganizationUnit scope và cấm cross-unit; `assertInspectionAccess`, `assertAccess`, `readModels(organizationId)` và transfer ancestor check giữ đúng boundary.
- `docs/adr/` trên working tree hiện rỗng do thay đổi baseline khác; ADR được đối chiếu từ nội dung tại commit `22b3765`, không suy đoán từ file đã bị xóa.

## Round-trip handoff

Phần handoff trước đây ghi checkpoint **chưa thực hiện round-trip check**; mục `Round-trip check bắt buộc` dưới đây là kết quả thực thi bổ sung theo đúng thứ tự suy ngược trước, rồi mới mở ticket gốc.

## Round-trip check bắt buộc

### Bước 1–2: Suy ngược trước khi đọc ticket gốc

Phần dưới đây được suy ngược **chỉ từ diff/code hiện tại và các test/evidence PASS**; ticket gốc chưa được mở ở bước này.

> Implementation này đang đáp ứng một workflow Inspection/Establishment cho cơ sở kinh doanh có điều kiện: người có quyền tạo/cập nhật/lưu trữ cơ sở trong đúng OrganizationUnit, lập lịch kiểm tra mặc định 6 tháng và hiển thị lịch quá hạn; hệ thống chọn checklist/version theo loại hình và tạo SLA 7 ngày. Field officer thực hiện lifecycle `scheduled → in_progress → completed`, lưu checklist, finding và Evidence có liên kết/GPS; kết quả bị giới hạn ở `pass | reminder | needs_action` và inspection đã hoàn tất không được sửa trái phép. Finding cần checklist key, result và Evidence IDs; recommendation được gửi ở trạng thái chờ, sau đó commander khác mới được approve/reject hoặc chuyển tới OrganizationUnit cha, không tự động tạo kết luận pháp lý. Các API command, event/projection, audit, offline sync và thống kê phải giữ các dữ liệu này, lọc đúng scope; UI web phải có các trạng thái loading/empty/error-retry/permission/offline/unsaved/approval, trong khi mobile chỉ đọc.

Bằng chứng đã dùng ở bước suy ngược:

- Diff/code: `src/modules/inspections/commands.ts:257-443,570-1307`, `src/modules/inspections/domain.ts:12-121`, `src/modules/inspections/projection.ts:226-628`, `src/app/api/inspections/[inspectionId]/commands/route.ts:25-121`, `src/app/api/sync/route.ts:87-153`.
- Test liên quan: `tests/inspections/inspection-ps007-regression.test.ts:12-114`, `tests/inspections/inspection-schedule.postgres.test.ts:151-252`, `tests/inspections/inspection-slices-4-6.postgres.test.ts:371-1193`, `tests/inspections/inspection-stats.postgres.test.ts:189-273`, `tests/e2e/ps007-inspection.spec.ts:91-340`.
- Evidence PASS gần nhất đầy đủ: `tests.md:1306-1319`, Lần chạy 34 (`scope=full`, không có `filter`), tất cả 7 bước PASS.

### Bước 3: Đối chiếu suy ngược với ticket gốc

Sau khi hoàn tất phần suy ngược, ticket gốc mới được mở và đối chiếu theo từng Acceptance Criteria và rubric bắt buộc.

| ID | Kết luận | Đối chiếu với ticket và bằng chứng |
|---|---|---|
| AC-01 | **PASS** | Ticket yêu cầu CRUD/list/detail cơ sở với thông tin, risk, trạng thái; code có register/update/archive, route GET/POST/PATCH/DELETE và scope (`commands.ts:257-329,447-567`; `establishments/[establishmentId]/route.ts:12-81`), test E2E tạo và mở detail (`ps007-inspection.spec.ts:91-155`). |
| AC-02 | **PASS** | Ticket yêu cầu cadence 6 tháng và overdue; code mặc định/kiểm tra cadence, tạo occurrence kế tiếp và tính `scheduleState` (`commands.ts:49-57,713-809`; `projection.ts:407-417`), test schedule/SLA (`inspection-schedule.postgres.test.ts:151-217`, `inspection-slices-4-6.postgres.test.ts:496-563`). |
| AC-03 | **PASS** | Ticket yêu cầu template/version theo loại hình và required item; code `ensureTemplate` + snapshot version (`commands.ts:97-204,357-377`), test sáu loại template/version (`inspection-slices-4-6.postgres.test.ts:565-652`). |
| AC-04 | **PASS** | Ticket yêu cầu lifecycle không skip và không sửa completed; domain transition (`domain.ts:45-57`) và command transition/immutability (`commands.ts:647-710,812-886,1014-1015`), test contract/E2E (`inspection-contract.test.ts:42-55`, `ps007-inspection.spec.ts:157-236`). |
| AC-05 | **PASS** | Ticket yêu cầu finding gắn checklist key, result, Evidence IDs; parser/route/command truyền và lưu đủ trường (`schemas.ts:182-201`, `commands/route.ts:54-67`, `commands.ts:889-989`), test finding/order/evidence (`inspection-slices-4-6.postgres.test.ts:861-997`). |
| AC-06 | **PASS** | Ticket yêu cầu Evidence ảnh/tài liệu cùng GPS/captured/received metadata qua service hiện có; UI dùng upload Evidence và test tạo ảnh với `capturedAt`, GPS (`ps007-inspection.spec.ts:177-187`, `inspection-slices-4-6.postgres.test.ts:914-937`). |
| AC-07 | **PASS** | Ticket giới hạn result ở đạt/nhắc nhở/cần xử lý; type/parser/domain/command dùng đúng union (`contracts.ts:3-4`, `domain.ts:59-61`, `schemas.ts:176-180`), test loại hợp lệ và loại `sanction` (`inspection-contract.test.ts:32-40`, `inspection-slices-4-6.postgres.test.ts:991-997`). |
| AC-08 | **PASS** | Ticket yêu cầu recommendation pending/approved/rejected/transferred, Approval, không tự động kết luận pháp lý; code tách submit/approve/reject/transfer, chặn self-approval và ghi Approval/event (`commands.ts:992-1212`), test lịch sử và transfer (`inspection-slices-4-6.postgres.test.ts:654-801,999-1193`, `ps007-inspection.spec.ts:200-243`). |
| AC-09 | **PASS** | Ticket yêu cầu SLA vi phạm 7 ngày, overdue event/notification/audit; code tạo SLA `inspection_violation_resolution_7d` khi submit và audit (`config.ts:1-10`, `commands.ts:1017-1077`), shared path tạo `SlaOverdue`/notification (`src/modules/platform/sla/index.ts:90-128`, `src/modules/platform/notifications/index.ts:62-86`), test SLA overdue/completion (`inspection-slices-4-6.postgres.test.ts:496-563`). |
| AC-10 | **PASS** | Ticket yêu cầu thống kê theo loại hình/tỷ lệ; code/API có filter period/type, totals/results/recommendation/rates (`projection.ts:442-546`, `stats/route.ts:6-26`), test synthetic và exact scope (`inspection-stats.postgres.test.ts:189-273`). |
| AC-11 | **PASS** | Ticket yêu cầu đăng ký `EnforcementTransferred` và giữ event cũ; catalog/domain/projection đều thêm đúng event, event cũ giữ nguyên (`event-catalog.ts:84-108`, `domain.ts:12-40`, `projection.ts:26-38`), contract/catalog tests PASS (`inspection-contract.test.ts:57-115`, `event-catalog.test.ts:37-109`). |
| AC-12 | **PASS** | Ticket yêu cầu web ghi dữ liệu, mobile read-only; write boundary nằm ở web API/canonical command và offline sync (`commands/route.ts:25-121`, `sync/route.ts:87-153`), E2E thực hiện toàn bộ lifecycle trên web (`ps007-inspection.spec.ts:91-244,271-340`); diff ticket không thêm mobile write. |
| AC-13 | **PASS** | Ticket yêu cầu loading/empty/error-retry/permission/offline/unsaved/approval; các component có các nhánh state và dirty guard (`EstablishmentList.tsx:80-115`, `EstablishmentDetail.tsx:73-121`, `ChecklistForm.tsx:67-79,167-279`, `InspectionScheduleBoard.tsx:154-183`), E2E PASS trong Lần chạy 34 (`tests.md:1306-1319`). |
| AC-14 | **PASS** | Ticket yêu cầu cadence nhỏ hơn policy phải có command capability và tối thiểu 2 lần/năm; `assertCadenceCapability` kiểm tra `mutate`, default là 6 (`commands.ts:49-78,333-357`), regression test xác nhận shorter cadence bị từ chối và recurring occurrence (`inspection-slices-4-6.postgres.test.ts:371-387`, `inspection-schedule.postgres.test.ts:151-217`). |
| AC-15 | **PASS** | Ticket yêu cầu required/evidence-required enforce ở domain/API; `assertChecklistComplete`/`assertChecklistEvidence` được gọi trong complete command (`domain.ts:88-121`, `commands.ts:647-684`), test bypass form thiếu item/evidence bị reject (`inspection-slices-4-6.postgres.test.ts:654-801`). |

| Rubric | Kết luận | Đối chiếu |
|---|---|---|
| R1 | **PASS** | `Inspection`, finding và Evidence là các boundary riêng; finding giữ `inspectionId`, `checklistKey`, `evidenceIds` (`contracts.ts:14-23`, `commands.ts:946-975`). |
| R2 | **PASS** | Recommendation được tạo pending, chỉ command quyết định mới tạo Approval và đổi trạng thái; self-approval bị chặn (`commands.ts:1028-1066,1227-1260`). |
| R3 | **PASS** | Required/evidence-required được enforce trong domain/API, không phụ thuộc form (`domain.ts:88-121`, `commands.ts:667-684`). |
| R4 | **PASS** | Fieldwork/approve và exact OrganizationUnit được kiểm tra ở module boundary (`commands.ts:207-233,235-250`, `projection.ts:257-267,548-571`); test cross-unit/assignment denial (`inspection-slices-4-6.postgres.test.ts:999-1091`). |

### Kết luận round-trip

**PASS.** Phần suy ngược trước khi đọc ticket khớp với toàn bộ 15 AC và 4 rubric bắt buộc; không phát hiện yêu cầu nghiệp vụ nào bị code/test diễn giải lệch. Không chạy test, lint, typecheck, format-check, build, verify và không commit theo đúng yêu cầu.

## Commit

- Commit: `6783f46745f3864b34c07e1949bb21128d831edf`
