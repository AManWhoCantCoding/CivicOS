# Kế hoạch root-cause và sửa tối thiểu — PS-E1-005 read-model E2E

## 0. Ranh giới thực thi

- Đây chỉ là kế hoạch; chưa sửa source/test, chưa chạy test, lint, typecheck, format, build, Prisma, Docker hoặc verify.
- Planner override `Gate hướng: có` trong phiên này vì kế hoạch chạm đồng thời eventing/read-model, Incident projection/API và E2E service/test boundary (từ hai module trở lên); giá trị gốc của ticket không bị sửa.
- Không sửa `.scratch/**`; không đánh dấu/tick Acceptance Criteria hoặc Các bước thực hiện.
- Target hiện tại chỉ là hai lỗi Incident `list read model` và `detail` tại `waitForReadModel`. Failure Establishment/Inspection thuộc ticket 04, chỉ ghi nhận deferred, không sửa chéo module.
- Giữ nguyên timeout 90 giây, endpoint, predicate và assertion hiện tại; không thêm sleep/retry, không query DB từ E2E, không reset/drop/seed/xóa/skip pending message, không tăng timeout và không che assertion.
- Root-cause read-model giữ tối thiểu: chỉ nối bằng chứng theo cùng `incidentId` qua `appendEvent → OutboxMessage → consumer → upsertReadModel → GET /api/incidents`, rồi sửa đúng một seam nếu bằng chứng chứng minh. Không tiếp tục tăng worker batch/throughput mù.

## 1. Root cause hiện tại và cổng quyết định

### 1.1. Triệu chứng đã biết

- `run55-test_e2e.log` ghi hai test Incident cùng timeout tại `waitForReadModel` sau `90000ms`.
- HTTP snapshot cho thấy `GET /api/incidents` trả `200`, nhưng target Incident vắng khỏi list; backlog giảm nhưng không chứng minh target đã được xử lý.
- Trace hiện có trạng thái target `IncidentRegistered` nhưng chưa nối chắc chắn toàn bộ chuỗi tới cùng `incidentId` và kết quả API.

### 1.2. Cổng evidence trước production fix

- Nếu target event đã processed và projection đã upsert nhưng list thiếu: chỉ xem xét organization/filter/API boundary.
- Nếu target outbox pending/retry/dead-letter hoặc consumer throw: chỉ xem xét dispatch/consumer path, giữ lease/retry/dead-letter.
- Nếu API đã trả target mà predicate vẫn false: chỉ xem xét attachment/correlation của harness; không đổi predicate trước khi chứng minh.
- Nếu trace không nối được target end-to-end: chỉ bàn giao instrumentation/evidence, không sửa production.

## 2. File scope dự kiến — tất cả đều thuộc scope được phép

### 2.1. Instrumentation/evidence mới hoặc mở rộng tối thiểu

- `src/modules/eventing/e2e-trace.ts` — tracer no-op ngoài E2E, ghi metadata đã redact: run/aggregate/event/outbox/consumer/status/error rút gọn; không payload/PII/secret.
- `src/modules/eventing/event-store.ts` — trace append thành công, event registration/dispatch lookup và metadata outbox; không đổi event semantics.
- `src/modules/eventing/outbox.ts` — trace claim/process/retry/dead-letter và kết quả consumer theo target aggregate; không đổi retry/lease.
- `src/modules/eventing/read-model.ts` — trace reduce/upsert/stale-skip và list-query metadata gồm resource/organization/result; không ghi state đầy đủ.
- `scripts/e2e/playwright-services.mjs` — tạo/truncate trace theo run và truyền biến trace cho app/worker; không đổi lifecycle hoặc production default.
- `tests/e2e/parallel-wave-read-model.spec.ts` — attachment HTTP/worker tối thiểu theo target; giữ nguyên poll, endpoint, predicate, assertion và timeout.
- `playwright.config.ts` — chỉ kiểm tra/điều chỉnh truyền trace qua lifecycle E2E nếu cần để app và worker nhận cùng run marker; không thêm server cạnh tranh, không đổi verification contract.

### 2.2. Production/test chỉ được sửa sau khi trace chốt seam

- `src/modules/eventing/read-model.ts` — chỉ sửa filter/fallback nếu target đã upsert nhưng list loại sai.
- `src/modules/incidents/projection.ts` — chỉ sửa propagation/version/upsert nếu consumer đã chạy nhưng projection không ghi đúng target.
- `src/modules/eventing/outbox.ts` hoặc `src/modules/eventing/event-store.ts` — chỉ sửa dispatch/replay nếu target message tồn tại nhưng không được xử lý đúng; giữ claim/lease/retry/dead-letter.
- `src/modules/eventing/worker.ts`, `src/worker.ts`, `scripts/e2e/playwright-services.mjs` — chỉ sửa scheduling nếu target-specific evidence chứng minh còn lỗi ordering/throughput; production mặc định vẫn `batchSize=1`, không tăng timeout.
- `tests/incidents/**`, `tests/integration/**` — chỉ thêm regression tối thiểu đúng seam đã chốt, không đổi assertion để làm xanh.
- `tests/e2e/parallel-wave-read-model.spec.ts` — chỉ chỉnh correlation/attachment nếu evidence chứng minh lỗi harness; không đổi predicate/assertion/timeout.

### 2.3. File đúng sẽ giữ nguyên, không nằm trong production-fix scope

- `prisma/schema.prisma`, `prisma/migrations/**` của IntakeReport/canonical channel.
- `src/modules/incidents/commands.ts`, `contracts.ts`, `domain.ts`, `index.ts`, `schemas.ts`.
- `src/app/api/intake-reports/**`, `src/app/api/incidents/**`, `src/app/intake/**`, `src/app/incidents/**`, `src/components/incidents/**`.
- `src/modules/eventing/event-catalog.ts` và đủ bảy event IntakeReport.
- `scripts/demo/seed.ts`, `tests/demo/demo-bootstrap.test.ts` sau các sửa tương thích nullable linkage.
- `tests/incidents/intake-report-lifecycle.test.ts`, `tests/incidents/intake-report-separation.postgres.test.ts` và regression PS-E1-005 hiện hữu đang PASS riêng.
- Không sửa `src/modules/inspections/**`, `/api/establishments`, `/api/inspections` hoặc read-model Establishment/Inspection.
- Không thêm `package.json`: không cần focused script mới; lệnh E2E hiện hữu và title/spec filter đủ để chạy verification. Không có dependency mới.

## 3. Instrumentation, regression hiện hữu và invariant — tách biệt

### 3.1. Instrumentation có thể chứng minh

- Trace chứng minh đường đi và trạng thái của **target read-model**: append, outbox, consumer, projection, list-query; chỉ metadata đã redact.
- HTTP snapshot chỉ chứng minh status, keys/counts, target presence, organization/filter metadata và health metadata tối thiểu. Nó **không** chứng minh raw PII không lộ, UI state, explicit convert trước/sau, idempotency hoặc toàn bộ event/audit contract.
- Playwright attachment chỉ là evidence, không là điều kiện pass/fail mới; không thay predicate/assertion.

### 3.2. Regression hiện hữu phải giữ và dùng làm evidence

- `tests/incidents/intake-report-lifecycle.test.ts`: channel/status/transition/SLA/masking và contract domain.
- `tests/incidents/intake-report-separation.postgres.test.ts`: create-only, confirm/convert, transfer/approval, event/audit và idempotency.
- Các test authorization/notification/integration/E2E PS-E1-005 hiện hữu: secrecy API/domain, notification mock, UI states, route compatibility và explicit workflow.
- Chỉ thêm regression read-model cùng-unit/cross-unit hoặc event-to-read-model sau khi trace chốt seam.

### 3.3. Invariant giữ nguyên, không gán trace quá mức

- IntakeReport và Incident là hai lifecycle; create/verify/confirm không tự tạo Incident, chỉ convert explicit sau confirm.
- PII vẫn mã hóa/mask, reveal cần role/capability/đúng OrganizationUnit; list/map/notification/export không lộ raw PII.
- Event catalog bảy event IntakeReport, status transition, SLA liên tục, Approval/Audit, notification adapter, idempotency và route source-compatible không đổi.
- Giữ claim/lease/retry/dead-letter, tenant scope, versioning và read-model predicate; không dùng trace để thay regression contract.

## 4. Hàm/interface/route sẽ đổi hoặc kiểm tra

- `waitForReadModel`, `createConvertedIncidentViaApi` — `tests/e2e/parallel-wave-read-model.spec.ts`; chỉ thêm attachment/correlation ngoài assertion.
- `appendEvent`, `getAggregateVersion`, `getEventConsumers` — `src/modules/eventing/event-store.ts`; kiểm tra correlation/version/consumer lookup, chỉ sửa khi trace chỉ rõ.
- `processOneOutboxMessage`, `dispatchConsumer` — `src/modules/eventing/outbox.ts`; kiểm tra claim/process/retry/dead-letter và consumer throw.
- `createEventWorker`, `tick` — `src/modules/eventing/worker.ts`; kiểm tra ordering/tick overlap/batch, không mặc định thay đổi.
- `reduceReadModel`, `upsertReadModel`, `readModels` — `src/modules/eventing/read-model.ts`; kiểm tra stale/version gate, organization/filter và fallback.
- `projectIncidentEvent`, `listIncidents`, `getIncidentReadModel`, `registerIncidentProjections` — `src/modules/incidents/projection.ts`; kiểm tra registration/upsert/scope.
- `GET /api/incidents`, `GET /api/incidents/:incidentId` — route/API Incident; chỉ kiểm tra list/detail boundary sau khi target projection evidence đã có.
- `persistHttpSnapshot`/attachment helpers — metadata tối thiểu, không đọc Prisma/DB trực tiếp từ test.

## 5. Ma trận Acceptance Criteria AC-01 đến AC-13

| AC | Thay đổi dự kiến | Test/regression phủ tới | Evidence và giới hạn chứng minh |
|---|---|---|---|
| AC-01 channel canonical/legacy | Giữ implementation schema/boundary; không sửa nếu không liên quan seam | `tests/incidents/intake-report-lifecycle.test.ts` channel canonical + alias | Test contract và migration hiện hữu; instrumentation read-model không chứng minh channel mapping |
| AC-02 không auto-Incident, convert explicit | Giữ command; trace chỉ nối event sau convert | separation + E2E no-auto/convert regression | Trace chứng minh target event/read-model sau convert; regression mới chứng minh trước convert không có Incident |
| AC-03 status/transition | Không sửa domain transition | lifecycle transition/status tests | Regression domain là bằng chứng; HTTP snapshot không thay thế |
| AC-04 classification/verification/Evidence/result | Không sửa flow đúng hiện hữu | lifecycle/integration + E2E verify/result | Existing test/UI evidence; trace không chứng minh UI classification hay Evidence |
| AC-05 SLA 24h/48h/20d liên tục | Không sửa SLA nếu trace read-model không liên quan | lifecycle fake-clock/SLA + notification tests | Regression hiện hữu; không gán HTTP snapshot cho deadline |
| AC-06 transfer/Approval/Audit | Không sửa transfer đúng hiện hữu | separation/approval integration regression | Regression chứng minh Approval/Audit; trace chỉ có thể bổ sung target projection metadata |
| AC-07 masking/encryption/reveal | Không sửa secrecy boundary trong vòng read-model nếu chưa có evidence | authorization/secrecy E2E và integration | Regression API/domain là evidence; HTTP snapshot không ghi response body nên không chứng minh raw PII |
| AC-08 DomainEvent/AuditEvent cho commands | Giữ event/audit semantics; chỉ trace target event path | incident lifecycle/separation event-audit assertions | Regression chứng minh command contract; trace không đại diện cho mọi command |
| AC-09 đủ 7 event catalog | Giữ `event-catalog.ts` | event catalog/contract tests | Catalog + contract evidence; read-model trace không chứng minh catalog đầy đủ |
| AC-10 notification mock | Giữ notification adapter | notification adapter/dispatch tests | Regression notification; không dùng HTTP snapshot |
| AC-11 UI loading/empty/error/retry/masked/SLA/approval | Giữ UI đúng hiện hữu | PS-E1-005 E2E UI state tests | E2E assertions là evidence; HTTP snapshot không chứng minh UI state |
| AC-12 API không lộ raw PII | Không sửa API khi chưa có evidence secrecy lỗi | API authorization/secrecy regression | Response assertions/domain policy là evidence; HTTP attachment chỉ metadata, không chứng minh nội dung response |
| AC-13 idempotency không duplicate | Giữ ledger/transaction; trace chỉ quan sát duplicate target side effects | separation PostgreSQL idempotency/concurrency tests | Regression authoritative là evidence; trace không tự chứng minh cùng-key/different-key replay |

## 6. Ma trận Rubric bắt buộc R-01 đến R-04

| Rubric | Thay đổi dự kiến | Test/regression phủ tới | Evidence và giới hạn chứng minh |
|---|---|---|---|
| R-01 Không dùng Incident thay IntakeReport | Không đổi model/command đúng hiện hữu; chỉ trace aggregate type/id | lifecycle/separation contract và API route tests | CONTEXT glossary + test model separation; read-model trace không chứng minh toàn domain vocabulary |
| R-02 Incident chỉ explicit sau verify/confirm | Không đổi command nếu chưa có seam evidence | no-auto + confirm/convert exactly-one regression | E2E/unit/DB regression là bằng chứng; append trace chỉ bổ trợ convert path |
| R-03 Secrecy boundary ở API/domain | Không sửa UI-only masking; giữ policy domain/API | authorization/secrecy integration/E2E | API/domain assertions là bằng chứng; HTTP snapshot không chứa body nên không gán quá mức |
| R-04 Idempotency và không mất intake khi retry | Không nới retry/timeout; chỉ sửa read seam nếu target trace chứng minh | separation idempotency/concurrency/replay tests | authoritative ledger/event/Incident assertions; read-model trace chỉ chứng minh projection side effect |

## 7. Map từng dòng Các bước thực hiện 1–8

| Bước | Nội dung ticket | Kế hoạch, file và evidence |
|---|---|---|
| 1 | Tách lifecycle IntakeReport khỏi Incident trong command, schema, projection; migration status/sourceChannel nếu cần | Giữ schema/command/migration đã đúng; kiểm tra projection bằng `src/modules/incidents/projection.ts` và event trace. Chỉ sửa projection nếu target-specific evidence chốt lỗi. Regression separation phủ lifecycle; không dùng read-model trace để kết luận domain separation. |
| 2 | Thêm explicit convert/confirm command và liên kết Incident | Giữ `create → verify → confirm → convert`; regression no-auto/exactly-one phủ trước và sau convert. Trace chỉ nối event/outbox/read-model sau convert, không thay regression. |
| 3 | Bổ sung masking/encryption/reveal authorization, AuditEvent, notification/SLA | Giữ implementation đúng và các regression secrecy, audit, notification, SLA. Không sửa/không gán HTTP snapshot hoặc read-model trace để chứng minh các phần này. |
| 4 | Cập nhật API/form/list/detail, giữ route/navigation source-compatible | Chỉ xem xét `GET /api/incidents` list/filter hoặc projection khi target đã upsert mà bị loại; giữ route, response contract, detail boundary, UI assertions và timeout. |
| 5 | Đăng ký 7 event IntakeReport; giữ `POST /api/incidents` source-compatible | Giữ event catalog và route. Dùng catalog/contract tests cho bảy event; instrumentation chỉ kiểm tra dispatch correlation của target Incident, không sửa event contract. |
| 6 | Viết regression nhập tin không tạo Incident và confirm tạo đúng một Incident | Giữ/bổ sung `tests/incidents/**` hoặc E2E regression đúng seam; assertion phải kiểm tra zero trước convert và exactly-one sau convert/link/event, không làm xanh bằng cách bỏ assertion. |
| 7 | Viết integration tests 24h/48h/20 ngày, transfer, masking, idempotency | Giữ các integration tests đang PASS; chỉ thêm event→read-model cùng-unit/cross-unit hoặc replay nếu trace chốt seam. Không nới assertion SLA/transfer/masking/idempotency. |
| 8 | Chạy toàn bộ generate/typecheck/lint/format/unit/E2E/build; incident tests có trong log | Đây là bước Tester sau Developer; kế hoạch không chạy kiểm tra. Tester giữ đúng thứ tự ticket, ghi incident tests và phân loại failure ticket 04 riêng, không dùng deferred failure để sửa chéo. |

## 8. File không map vào production fix và lý do

- `package.json`: loại khỏi scope; không cần script focused mới vì lệnh hiện hữu đã đủ và việc thêm script không giúp nối root cause.
- `prisma/schema.prisma`, `prisma/migrations/**`, IntakeReport command/API/UI, event catalog: implementation đúng và có regression riêng; không có evidence timeout bắt nguồn từ đây.
- `src/modules/inspections/**`, Establishment/Inspection routes/projections: failure thuộc ticket 04, không map vào PS-E1-005.
- Tăng timeout, sleep/retry, bỏ predicate/assertion, global backlog gate, tiếp tục tăng batch vô hạn: không phải thay đổi hợp lệ; chỉ che hoặc trì hoãn root cause.

## 9. Điều kiện bàn giao

- Chờ Reviewer duyệt plan và direction gate trước khi Developer sửa code.
- Nếu trace chưa nối đủ target ID, chỉ bàn giao instrumentation/evidence, không bàn giao production fix.
- Nếu trace chốt một seam, Developer chỉ sửa file/function thuộc danh sách scope ở mục 2 và ghi evidence mapping; không tự mở rộng file.
- Developer không chạy test/lint/typecheck/format/build/Prisma/Docker/verify; Tester chịu trách nhiệm toàn bộ verification sau đó.
