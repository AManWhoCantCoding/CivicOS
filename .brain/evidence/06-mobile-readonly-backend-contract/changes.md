Ticket này xây backend contract mobile chỉ đọc, với session → OU → active Assignment → allow-list masking ở server.
Chỉ sửa các module mobile-readonly, route map/related-info/forces, additive identity và tests mobile-readonly; không chạm mobile client hay schema.
Acceptance chính: shape/envelope đúng, boundary OU + Assignment kể cả commander, detail 403/list empty, deep-link, không raw PII và GET-only.
Mapping giữ nguyên: HOTSPOT từ Incident + ProjectionRecord; VIOLATION từ InspectionFinding + Inspection + Establishment; alarm từ Notification/Incident; dispatch/task từ Assignment.
Tester sẽ chạy targeted verification; lần thực thi này không chạy test, lint, typecheck, format, build hay e2e.

## File đã sửa trong lần thực thi này

- `src/modules/identity/contracts.ts`: thêm task/capability/role mapping additive cho mobile read.
- `src/modules/identity/authorization.ts`: thêm `hasActiveAssignmentForRead` và `requireMobileReadAccess`, giữ nguyên semantics caller cũ.
- `src/modules/identity/index.ts`: công bố hai seam mobile.
- `src/modules/mobile-readonly/contracts.ts`: công bố entity, envelope, filter/pagination, deep-link và allow-list response types.
- `src/modules/mobile-readonly/index.ts`: public exports của module.
- `src/modules/mobile-readonly/http.ts`: map lỗi mobile thành status HTTP ổn định.
- `src/modules/mobile-readonly/layers.ts`: catalog và layer resolver với OU + active Assignment.
- `src/modules/mobile-readonly/related-info.ts`: parse/search/count/detail cho Resident, Business, Hotspot và Violation; server filter Assignment/OU và omit raw PII.
- `src/modules/mobile-readonly/forces.ts`: read views alarm/dispatch/task, deep-link fields và alias task-by-dispatch.
- `src/app/api/map/layers/route.ts`: GET layers.
- `src/app/api/related-info/search/route.ts`: GET search.
- `src/app/api/related-info/counts/route.ts`: GET counts.
- `src/app/api/related-info/[entityType]/[id]/route.ts`: GET detail.
- `src/app/api/forces/alarms/route.ts`: GET alarms.
- `src/app/api/forces/dispatches/route.ts`: GET dispatch list/detail routes.
- `src/app/api/forces/tasks/route.ts`: GET task list.
- `src/app/api/forces/tasks/[taskId]/route.ts`: GET task detail.
- `src/app/api/forces/tasksbydispatchid/route.ts`: source-compatible GET alias.
- `tests/mobile-readonly/fixtures.ts`, `helpers.ts`: user/resource fixtures và shape/no-PII helpers.
- `tests/mobile-readonly/map-layers.contract.test.ts`: AC-01 contract test.
- `tests/mobile-readonly/related-info-search.contract.test.ts`: AC-02 contract test.
- `tests/mobile-readonly/related-info-counts.contract.test.ts`: AC-03 contract test.
- `tests/mobile-readonly/related-info-detail.contract.test.ts`: AC-04 contract test.
- `tests/mobile-readonly/forces-read.contract.test.ts`: AC-05 contract test.
- `tests/mobile-readonly/tasks-by-dispatch.contract.test.ts`: AC-06 contract test.
- `tests/mobile-readonly/boundary.regression.test.ts`: AC-07 commander assignment regression.
- `tests/mobile-readonly/read-only-guard.regression.test.ts`: AC-08 GET-only regression.
- `tests/mobile-readonly/contract-matrix.contract.test.ts`: AC-09 contract matrix.
## Repair round 1

- `tests/mobile-readonly/fixtures.ts`: thêm fixture DB backend deterministic với ID ngẫu nhiên, persisted role/user/OU, Resident/Business/Hotspot/Violation, active/revoked Assignment, commander Assignment, Notification và cleanup theo fixture.
- `tests/mobile-readonly/helpers.ts` và các contract test liên quan: đăng ký seed/cleanup DB thật trước/sau suite; alias dùng dispatch ID đã seed; boundary kiểm chứng commander active và revoked.
- `src/modules/mobile-readonly/related-info.ts`: dùng capability masking seam, fail-closed title, lọc VIOLATION theo OU ở query DB, đọc ProjectionRecord geometry và áp dụng các filter query đã công bố.
- `src/modules/mobile-readonly/forces.ts`: chỉ phát hành alarm chưa đọc, bỏ Notification title/body tự do và giữ assignment summary allow-list.
- `Lesson-learned.md`: không thuộc whitelist nên không đưa vào patch repair này.

Không chạy runtime test/lint/typecheck/format/build/e2e theo ràng buộc Developer.

## Repair round 2

- `tests/mobile-readonly/fixtures.ts`: thay `Subject.subjectType` và `SubjectManagementRecord.purpose` bằng canonical `temporary_resident`; rà các seed field cùng nhóm không còn giá trị `person`/`follow-up` ngoài schema/domain.
- `tests/mobile-readonly/fixtures.ts`: bọc seed bằng cleanup khi tạo fixture thất bại giữa chừng; cleanup vẫn chỉ nhắm các ID có suffix của fixture và có thể chạy lại qua `afterAll`.
- Nguyên nhân runtime: fixture seed dùng `subjectType: 'person'`, nhưng constraint `Subject_subjectType_allowed` chỉ cho phép `temporary_resident`, `foreign_resident`, `reintegration`; `purpose: 'follow-up'` cũng không thuộc allow-list tương ứng.

Không chạy runtime test/lint/typecheck/format/build/e2e theo ràng buộc Developer.

## Repair round 3

- `tests/mobile-readonly/related-info-detail.contract.test.ts`: thay resident fixture ID literal `'r1'` bằng `mobileEntityIds.residentId`, đồng bộ với resident ID ngẫu nhiên được seed trong `fixtures.ts`.
- Rà toàn bộ `tests/mobile-readonly/**`: các fixture resource/dispatch ID còn lại đã dùng export canonical từ `fixtures.ts`; không cần sửa `fixtures.ts` hoặc `helpers.ts` vì cleanup hiện tại vẫn giới hạn theo suffix fixture và các ID canonical.

 Không chạy runtime test/lint/typecheck/format/build/e2e/verify theo ràng buộc Developer.

## Repair round 4

- `tests/identity/session-seed-boundary.postgres.test.ts`: cập nhật exact public-surface allow-list để ghi nhận additive exports `hasActiveAssignmentForRead` và `requireMobileReadAccess`, giữ nguyên assertion không lộ `prisma` database internals.

Không chạy runtime test/lint/typecheck/format/build/e2e/verify theo ràng buộc Developer.

## Repair round 5 — developer-fallback sau FINAL_FAIL

- `src/modules/mobile-readonly/forces.ts`: bổ sung server-side alarm resource lookup để map `relatedInfo` và `coordinates` từ Incident/Establishment/SubjectManagementRecord/InspectionFinding; giữ unread filter, active Assignment boundary, fixed title và allow-list không raw Notification text.
- `tests/mobile-readonly/fixtures.ts`: export canonical dispatch/task IDs ngoài boundary và seed Assignment suffix-scoped ở OU khác để kiểm chứng d2/task detail.
- `tests/mobile-readonly/tasks-by-dispatch.contract.test.ts`: assert d1 in-scope envelope có data, d2 ngoài boundary trả envelope rỗng và task detail ngoài boundary ném `FORBIDDEN`.
- `tests/mobile-readonly/contract-matrix.contract.test.ts`: mở rộng matrix shape/403/filter/count keys/masking/deep-link/no-PII/GET-only cho layers, RelatedInfo và forces; thêm outside OU và missing Assignment assertions.

Không chạy runtime test/lint/typecheck/format/build/e2e/verify theo ràng buộc Developer; chưa ghi kết luận PASS.

## Repair round 7

- `src/modules/identity/authorization.ts` và `src/modules/mobile-readonly/forces.ts`: bổ sung resolver OU persisted riêng cho mobile boundary (Establishment, SubjectManagementRecord, Incident qua EventRecord, InspectionFinding qua Inspection → Establishment); forces không truyền OU từ session vào resource seam, còn `hasActiveAssignmentForRead` bỏ tin `resource.organizationId` do caller truyền và fail closed khi không resolve được.
- `tests/mobile-readonly/fixtures.ts`: thêm record persisted in-scope/cross-OU/missing-Assignment cho đủ RESIDENT/BUSINESS/HOTSPOT/VIOLATION; thêm forged force Assignment OU-A cho resource Incident OU-B, notification thiếu Assignment, ID suffix ngẫu nhiên và cleanup mở rộng.
- `tests/mobile-readonly/related-info-search.contract.test.ts`, `related-info-counts.contract.test.ts`, `forces-read.contract.test.ts`, `contract-matrix.contract.test.ts`: thêm assertion thật cho đủ bốn entity, counts, force cross-OU/missing-Assignment, detail 200 có deep-link và no-PII.
- Lý do repair: final review phát hiện forces chỉ đối chiếu OU của Assignment/session, nên resource OU thật có thể bị forged Assignment cùng OU session làm lọt; đồng thời ma trận contract còn thiếu các boundary/detail assertions.

Không chạy runtime test/lint/typecheck/format/build/e2e/verify theo ràng buộc Developer; Tester phụ trách xác nhận.

## Repair round 6 — developer-fallback sau FINAL_FAIL

- `src/modules/mobile-readonly/forces.ts`: đổi resource-link lookup thành server-side lookup dùng chung cho alarm/dispatch/task list/detail/alias; mọi Assignment read item lấy coordinates từ Incident, Establishment, SubjectManagementRecord→Subject hoặc InspectionFinding→Inspection→Establishment, đồng thời giữ relatedInfo/deep-link/assignmentSummary allow-list.
- `src/modules/mobile-readonly/related-info.ts` và `src/modules/mobile-readonly/contracts.ts`: VIOLATION giữ pipeline Establishment theo OU → Inspection → Finding, trả `status: finding.result` và metadata phi-PII gồm `result`, `checklistKey`, `evidenceIds`.
- `src/modules/mobile-readonly/layers.ts`: VIOLATION layer discovery lọc Establishment theo OU rồi Inspection trước khi đọc Finding, vẫn gate active Assignment cho mọi role.
- `tests/mobile-readonly/fixtures.ts`: thêm tọa độ persisted cho Establishment fixtures để assert deep-link coordinates.
- `tests/mobile-readonly/forces-read.contract.test.ts`, `related-info-detail.contract.test.ts`, `contract-matrix.contract.test.ts`: bổ sung assertions coordinates/relatedInfo/metadata/needs_action, exact counts, direct HTTP detail/layer/search boundary status và ngoài OU/missing Assignment.

Không chạy runtime test/lint/typecheck/format/build/e2e/verify theo ràng buộc Developer; chưa ghi kết luận PASS.

## Repair round 7 — typecheck tối thiểu

- `tests/mobile-readonly/contract-matrix.contract.test.ts`: chuyển tuple readonly `excludedIds` thành mutable array khi truyền vào `expect.arrayContaining`.
- `tests/mobile-readonly/related-info-search.contract.test.ts`: chuyển tuple readonly `outsideIds` thành mutable array khi truyền vào `expect.arrayContaining`.

Không chạy test/lint/typecheck/format/build/e2e/verify theo yêu cầu; Tester phụ trách xác nhận.
