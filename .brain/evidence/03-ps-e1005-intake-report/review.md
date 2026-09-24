# Reviewer checkpoint cuối — PS-E1-005

## Phạm vi và bằng chứng được dùng

- Đã đối chiếu ticket hiện tại, Rubric, `changes.md`, `plan.md`, `tests.md`, diff/code hiện tại và `CONTEXT.md`/`spec.md` liên quan.
- Không chạy test, lint, typecheck, format-check, build, Prisma hoặc E2E.
- Chỉ chạy ngoại lệ được phép `node scripts/verify.mjs --tree`; kết quả độc lập: `Tree: 9c2ac856`.
- `tests.md` — **Lần chạy 65**, `scope=full`, `Tree: 9c2ac856`, có đủ 7 bước PASS: `prisma:generate`, `typecheck`, `lint`, `format:check`, `test`, `test:e2e`, `build` (`tests.md:3334-3347`). Tree khớp fingerprint độc lập.
- Boundary E2E Chromium-only được chấp nhận theo quyết định user: `playwright.config.ts:22-25` chỉ còn project `chromium`; `changes.md:7-11` ghi rõ mobile deferred đến ticket 05. Không dùng mobile coverage để chặn ticket này.

## Đối chiếu Acceptance Criteria

| ID | Kết quả | Bằng chứng code/diff và test |
|---|---|---|
| AC-01 | PASS | Form có đủ canonical channel tại `src/components/incidents/IntakeReportForm.tsx:107-118`; boundary map tại `src/modules/incidents/domain.ts:65-81`; migration map `in_person`/`telephone` tại `prisma/migrations/20260924100000_ps_e1005_canonical_channel/migration.sql:1-13`; test `intake-report-lifecycle.test.ts:38-67` và separation `:395-405`; run 65 full PASS. |
| AC-02 | PASS | Create chỉ tạo `IntakeReport`/`RECEIVED`, không Incident tại `src/modules/incidents/commands.ts:464-606`; confirm/convert tách riêng tại `commands.ts:909-1008,1183-1351`; DB regression `intake-report-separation.postgres.test.ts:463-519`; E2E no-auto/convert `ps005-incident.spec.ts:153-216`. |
| AC-03 | PASS | Transition matrix intake và Incident tại `src/modules/incidents/domain.ts:43-63,96-117`; contract test `intake-report-lifecycle.test.ts:134-177`; invalid lifecycle regression `intake-report-separation.postgres.test.ts:758-780`. |
| AC-04 | PASS | Classification/note/result ở `IntakeReportDetail.tsx:500-584,805-826`. Evidence surface mới mount `EvidenceCapture` đúng `resourceType="IntakeReport"`, `resourceId={report.id}`, gọi `refresh` sau upload và render `EvidenceList` tại `IntakeReportDetail.tsx:783-803`; `EvidenceList.tsx:21-38` cung cấp xem/tải. `getIntakeReport` query Evidence đúng linkage tại `commands.ts:1537-1565`. Integration regression persistence/linkage/readback tại `intake-report-separation.postgres.test.ts:521-552`; change mapping tại `changes.md:232-236`; run 65 full PASS. |
| AC-05 | PASS | Continuous SLA và completion filtering tại `src/modules/incidents/commands.ts:686-724`; create ba SLA tại `commands.ts:555-593`; contract test 24h/48h/20d và overdue tại `intake-report-lifecycle.test.ts:216-274`; DB SLA assertions `intake-report-separation.postgres.test.ts:311-333`. |
| AC-06 | PASS | Transfer chỉ nhận OrganizationUnit active cấp district và tạo Approval tại `src/modules/incidents/commands.ts:1353-1393,1397-1463`; regression pending/self-approval/independent approval/Event/Audit tại `intake-report-separation.postgres.test.ts:782-824`. |
| AC-07 | PASS | Encryption/masking/reveal fail-closed tại `commands.ts:736-783,809-826`; masked/reveal contract `intake-report-lifecycle.test.ts:296-365`; API/domain/cross-unit regression `intake-report-separation.postgres.test.ts:826-897`. |
| AC-08 | PASS | Các command verify/process/reject/close đều append DomainEvent và record AuditEvent: `commands.ts:840-906,1011-1180`; create/convert/transfer tương ứng ở `commands.ts:497-606,1183-1351,1353-1463`. DB event/audit assertions tại `intake-report-separation.postgres.test.ts:303-343,504-518,805-820`; E2E lifecycle timeline `ps005-incident.spec.ts:371-457`. |
| AC-09 | PASS | Đủ 7 entry IntakeReport trong `src/modules/eventing/event-catalog.ts:51-72`; domain contract tại `src/modules/incidents/domain.ts:119-131`; test catalog/version/owner tại `intake-report-lifecycle.test.ts:180-214`. |
| AC-10 | PASS | Mock adapter có dispatch/retry/attempt tại `src/modules/incidents/notification-adapter.ts:1-28`; test retry, `availableAt` và không chứa PII tại `intake-report-lifecycle.test.ts:277-293`; create/close dùng notification tại `commands.ts:594-605,1162-1173`. |
| AC-11 | PASS | Intake queue có loading/empty/error-retry/permission-denied/filter/SLA tại `src/components/incidents/IntakeReportQueue.tsx:128-190,192-308`; detail có loading/error/retry/permission-denied/SLA/approval tại `IntakeReportDetail.tsx:269-369,403-416,472-487,748-803`; E2E form/verify/convert và UI states tại `ps005-incident.spec.ts:142-216,637-693`; run 65 Chromium full PASS. |
| AC-12 | PASS | `maskIntakeReport` không trả raw PII khi không reveal tại `commands.ts:736-783`; `canRevealIntakeRow` yêu cầu commander, đúng OrganizationUnit và `read_sensitive` tại `commands.ts:809-826`; API detail dùng policy tại `commands.ts:1516-1565`; regression JSON không chứa PII và cross-unit denial tại `intake-report-separation.postgres.test.ts:826-897`. |
| AC-13 | PASS | Register replay và unique-conflict replay tại `commands.ts:484-495,608-617`; convert/confirm ledger và transaction lock tại `commands.ts:909-1008,1183-1351`; DB retry/concurrency chứng minh một Incident, một event/audit và ledger authoritative tại `intake-report-separation.postgres.test.ts:554-728`; API idempotency tại `ps005-incident.spec.ts:543-574`. |

## Đối chiếu Rubric bắt buộc

| Rubric | Kết quả | Bằng chứng |
|---|---|---|
| R-01 — Không dùng Incident thay IntakeReport | PASS | Glossary phân biệt tại `CONTEXT.md:9-15`; canonical command/schema và test create-only tại `commands.ts:464-606` và `intake-report-separation.postgres.test.ts:287-301,407-435`. |
| R-02 — Incident chỉ explicit sau verify/confirm | PASS | Spec yêu cầu verify rồi confirm/convert tại `spec.md:146-153`; command precondition và UI boundary tại `commands.ts:909-1008,1183-1351` và `IntakeReportDetail.tsx:586-632`; no-auto/exactly-one regressions tại `intake-report-separation.postgres.test.ts:463-519` và `ps005-incident.spec.ts:170-216`. |
| R-03 — Secrecy boundary ở API/domain | PASS | `CONTEXT.md:21-23`; policy domain `commands.ts:786-826`, DTO mask `commands.ts:736-783`; DB/API-facing denial/reveal tests `intake-report-separation.postgres.test.ts:826-897`. |
| R-04 — Idempotency, không mất intake khi retry | PASS | Authoritative ledger/replay tại `commands.ts:484-495,608-617,909-1008,1183-1351`; retry/concurrency tests `intake-report-separation.postgres.test.ts:554-755`; run 65 full PASS. |

## Đối chiếu 8 bước thực hiện

| Bước | Kết quả | Bằng chứng |
|---|---|---|
| 1. Tách lifecycle, schema, projection, migration | PASS | Canonical model/migration và command separation tại `commands.ts:464-606`, `domain.ts:65-131`, migration `20260924100000.../migration.sql:1-13`; separation regression; run 65 PASS. |
| 2. Explicit confirm/convert và liên kết Incident | PASS | `commands.ts:909-1008,1183-1351`; DB/E2E exact-one regression `intake-report-separation.postgres.test.ts:463-519`, `ps005-incident.spec.ts:170-216`. |
| 3. Mask/encryption/reveal, AuditEvent, notification/SLA | PASS | `commands.ts:736-783,809-826,555-605`; notification adapter/test `notification-adapter.ts:1-28`, lifecycle test `:216-293`; full run 65 PASS. |
| 4. API/form/list/detail, route-compatible | PASS | Form/queue/detail `IntakeReportForm.tsx:96-118`, `IntakeReportQueue.tsx:128-308`, `IntakeReportDetail.tsx:239-308,371-832`; API route surface trong `src/app/api/intake-reports/**`; E2E intake form/actions `ps005-incident.spec.ts:142-216`. |
| 5. Đăng ký 7 event và giữ direct Incident route | PASS | Catalog `event-catalog.ts:51-72`; direct Incident regression `intake-report-separation.postgres.test.ts:407-435`; catalog contract test `intake-report-lifecycle.test.ts:180-214`. |
| 6. Regression no-auto và exactly-one | PASS | `intake-report-separation.postgres.test.ts:287-301,463-519`; E2E `ps005-incident.spec.ts:153-216`; run 65 `test`/`test:e2e` PASS. |
| 7. Integration SLA/transfer/masking/idempotency | PASS | `intake-report-separation.postgres.test.ts:311-333,521-552,554-728,782-897`; lifecycle SLA/secrecy tests `intake-report-lifecycle.test.ts:216-365`; run 65 full PASS. |
| 8. Chạy đủ 7 verification steps | PASS | `tests.md:3334-3347` ghi `scope=full`, cả 7 bước PASS; `tests.md:188-193,263-285` xác nhận incident test suites có trong evidence; Tree run 65 khớp `node scripts/verify.mjs --tree`. |

## Spec-to-Code Traceability Matrix

| ID Yêu cầu (AC) | Mức độ đáp ứng | File & Dòng Code xử lý | Test Case chứng minh |
| :--- | :--- | :--- | :--- |
| AC-01 | PASS | `src/modules/incidents/domain.ts:65-81`; `src/components/incidents/IntakeReportForm.tsx:107-118`; `prisma/migrations/20260924100000_ps_e1005_canonical_channel/migration.sql:9-13` | `tests/incidents/intake-report-lifecycle.test.ts:38-67`; `tests/incidents/intake-report-separation.postgres.test.ts:395-405`; run 65 `test` PASS (`tests.md:3345`) |
| AC-02 | PASS | `src/modules/incidents/commands.ts:464-606,909-1008,1183-1351` | `tests/incidents/intake-report-separation.postgres.test.ts:463-519`; `tests/e2e/ps005-incident.spec.ts:153-216`; run 65 `test:e2e` PASS (`tests.md:3346`) |
| AC-03 | PASS | `src/modules/incidents/domain.ts:43-63,96-117` | `tests/incidents/intake-report-lifecycle.test.ts:134-177`; `tests/incidents/intake-report-separation.postgres.test.ts:758-780` |
| AC-04 | PASS | `src/components/incidents/IntakeReportDetail.tsx:783-803`; `src/components/field/EvidenceList.tsx:21-38`; `src/modules/incidents/commands.ts:1537-1565` | `tests/incidents/intake-report-separation.postgres.test.ts:521-552`; `changes.md:232-236`; run 65 `test` PASS (`tests.md:3345`) |
| AC-05 | PASS | `src/modules/incidents/commands.ts:555-593,686-724` | `tests/incidents/intake-report-lifecycle.test.ts:216-274`; `tests/incidents/intake-report-separation.postgres.test.ts:311-333` |
| AC-06 | PASS | `src/modules/incidents/commands.ts:1353-1463` | `tests/incidents/intake-report-separation.postgres.test.ts:782-824` |
| AC-07 | PASS | `src/modules/incidents/commands.ts:736-783,809-826` | `tests/incidents/intake-report-lifecycle.test.ts:296-365`; `tests/incidents/intake-report-separation.postgres.test.ts:826-897` |
| AC-08 | PASS | `src/modules/incidents/commands.ts:840-906,1011-1180,1183-1351,1353-1463` | `tests/incidents/intake-report-separation.postgres.test.ts:303-343,504-518,805-820`; `tests/e2e/ps005-incident.spec.ts:371-457` |
| AC-09 | PASS | `src/modules/eventing/event-catalog.ts:51-72`; `src/modules/incidents/domain.ts:119-131` | `tests/incidents/intake-report-lifecycle.test.ts:180-214`; run 65 `test` PASS (`tests.md:3345`) |
| AC-10 | PASS | `src/modules/incidents/notification-adapter.ts:1-28`; `src/modules/incidents/commands.ts:594-605,1162-1173` | `tests/incidents/intake-report-lifecycle.test.ts:277-293` |
| AC-11 | PASS | `src/components/incidents/IntakeReportQueue.tsx:128-308`; `src/components/incidents/IntakeReportDetail.tsx:269-369,403-416,472-487,748-803` | `tests/e2e/ps005-incident.spec.ts:142-216,637-693`; run 65 Chromium-only `test:e2e` PASS (`tests.md:3346`) |
| AC-12 | PASS | `src/modules/incidents/commands.ts:736-783,809-826,1516-1565` | `tests/incidents/intake-report-separation.postgres.test.ts:826-897`; run 65 `test`/`test:e2e` PASS |
| AC-13 | PASS | `src/modules/incidents/commands.ts:484-495,608-617,909-1008,1183-1351` | `tests/incidents/intake-report-separation.postgres.test.ts:554-755`; `tests/e2e/ps005-incident.spec.ts:543-574`; run 65 full PASS |

## Kết luận checkpoint

- **PASS — AC-01..AC-13.** AC-04 đã có Evidence surface hoàn chỉnh và regression persistence/linkage/readback; gap được nêu ở review trước đã được xử lý.
- **PASS — R-01..R-04.**
- **PASS — 8/8 bước thực hiện.**
- Không phát hiện code mới không map vào AC trong phạm vi ticket-owned diff; instrumentation/read-model là phần được plan map cho E2E boundary, còn thay đổi sibling ticket được phân loại riêng trong `plan.md:8,136` và `changes.md:545-552`.
- Mobile được **defer đến ticket 05** theo quyết định user; không coi đây là thiếu sót của ticket 03.
- Không commit và không thay đổi trạng thái ticket.

## Trục trặc gặp phải

- Hai lần đọc đầu tiên dùng đường dẫn Windows sai, nên tool trả `File not found`; sau đó đã enumerate `.scratch` và đọc lại bằng đường dẫn slash đã xác nhận.
- Đã cập nhật mục **“Verified-path reads”** trong `Lesson-learned.md` để hợp nhất biến thể candidate path sai; không tạo mục trùng.

## Round-trip check lặp lại — 2026-09-25

### Bước 1 — Suy ngược trước khi mở ticket gốc

> Hệ thống cần một quy trình tiếp nhận tố giác độc lập với Incident: cán bộ trực ban tạo một IntakeReport với kênh tiếp nhận chuẩn, việc nhập/verify không được tự tạo Incident, và chỉ thao tác confirm/convert chủ động sau xác minh mới tạo tối đa một Incident liên kết. Hồ sơ phải giữ được lifecycle, phân loại, ghi chú/kết quả, SLA, event/audit, notification, transfer approval, masking/reveal theo quyền và idempotency.
>
> Trên màn hình chi tiết IntakeReport, người dùng được xem trạng thái/lịch sử phù hợp quyền, tải Evidence lên đúng hồ sơ bằng `resourceType=IntakeReport` và `resourceId` của report; sau upload màn hình phải refresh để Evidence đã lưu xuất hiện, có liên kết xem/tải. Persistence phải giữ đúng linkage và API detail phải đọc lại đúng Evidence.

### Bước 2 — Đối chiếu sau khi mở ticket gốc

| Phần suy ngược | Đối chiếu ticket/AC | Kết quả |
|---|---|---|
| IntakeReport độc lập; create không tạo Incident; confirm/convert explicit và liên kết duy nhất | AC-02, Rubric R-01/R-02; ticket:31-35,51-52; code/test: `src/components/incidents/IntakeReportForm.tsx:77-80`, `tests/e2e/ps005-incident.spec.ts:153-216`, `tests/incidents/intake-report-separation.postgres.test.ts:463-519` | PASS |
| Kênh canonical và đọc legacy | AC-01; ticket:33,77-82; code/test: `IntakeReportForm.tsx:107-118`, lifecycle/separation regression đã PASS (`tests.md:265-285`) | PASS |
| Lifecycle, classification, verification note/result và UI detail | AC-03, AC-04, AC-11; ticket:35-36,43; code: `src/components/incidents/IntakeReportDetail.tsx:371-376,805-826`; E2E verify/convert PASS được ghi tại `tests.md:3345-3346` | PASS |
| Evidence gắn đúng IntakeReport, persistence/readback, refresh và view/download | AC-04; ticket:36,84-90; code: `IntakeReportDetail.tsx:783-803`; regression mới `tests/incidents/intake-report-separation.postgres.test.ts:521-552`; `EvidenceList.tsx:21-38` | PASS |
| SLA, transfer/Approval, PII masking/reveal, event/audit, notification và idempotency | AC-05..AC-10, AC-12..AC-13; ticket:37-45; các regression lifecycle/separation đã PASS (`tests.md:265-285`) | PASS |

### Kết luận round-trip

- **PASS — không phát hiện lệch nghiệp vụ cụ thể** giữa yêu cầu suy ngược từ diff + test PASS và ticket/Acceptance Criteria.
- Regression Evidence mới khớp trực tiếp yêu cầu Evidence persistence/linkage/readback; `IntakeReportDetail` hiện mount capture/list đúng resource và refresh sau upload.
- Không dùng round-trip này để thay thế kiểm tra verification của cây mã hiện tại; không chạy lệnh kiểm tra và không commit.
