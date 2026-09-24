# Chẩn đoán độc lập read-model — Ticket 03

## 1. Timeline các run và failure

| Run | Kết quả liên quan | Ý nghĩa chẩn đoán |
|---|---|---|
| `run36-test_e2e.log` | Ba test read-model thất bại. Test Incident list dừng sớm ở `GET /api/incidents/:incidentId` trả non-2xx; test Incident detail và establishment/inspection timeout `waitForReadModel` 90 giây. | Run này còn có lỗi actor/scope ở direct Incident GET, nên chưa cô lập được read-model cho test đầu. |
| `run41-test_e2e.log` | Sau khi đổi actor cho direct GET, ba test read-model vẫn timeout đúng tại predicate của `waitForReadModel` ở 90 giây; không còn lỗi direct GET trong ba test này. | Đã loại khả năng chính là direct Incident authorization của test đầu; lỗi còn nằm ở read-model/API/worker path. |
| `run43-test_e2e.log` | Ba test đầu (`Incident list`, `Incident detail`, `establishment and inspection`) vẫn timeout 90 giây. Test vehicle read-model cũng timeout trong run này. `87 passed, 4 failed, 1 skipped`. | Bỏ global backlog gate chưa đủ; run này chưa chứng minh vehicle path tốt hơn. |
| `run45-test_e2e.log` | Ba test đầu vẫn timeout 90 giây; không còn failure vehicle. `88 passed, 3 failed, 1 skipped`. | Worker có khả năng phục vụ ít nhất vehicle projection trong cùng full run, nhưng chưa chứng minh event của ba resource kia được append/dispatch/project đúng. |

Các thay đổi trước đó đã được ghi nhận trong `changes.md`: wrapper khởi động app và worker, worker interval E2E mặc định 100 ms, rồi bỏ global `pending/processing/dead-letter` gate nhưng giữ nguyên endpoint/predicate và timeout 90 giây. Không có bằng chứng trong bốn log cho thấy migration/PostgreSQL là nguyên nhân của ba timeout này.

## 2. Call path và source evidence

### 2.1. Write → event/outbox

- Intake: `createConvertedIncidentViaApi` thực hiện `POST /api/intake-reports`, `verify`, `confirm`, `convert_to_incident` và kiểm tra response thành công trước khi polling. `convertIntakeToIncident` tạo `Incident`, cập nhật `IntakeReport`, append `IntakeReportConvertedToIncident` và append `IncidentRegistered` trong cùng transaction (`src/modules/incidents/commands.ts:1183-1285`).
- Establishment: `POST /api/establishments` gọi `registerEstablishment`; command tạo row rồi append `EstablishmentRegistered` (`src/app/api/establishments/route.ts:28-49`, `src/modules/inspections/commands.ts:187-248`).
- Inspection: `POST /api/inspections` gọi `scheduleInspection`; command append `InspectionScheduled` (`src/app/api/inspections/route.ts:43-63`, `src/modules/inspections/commands.ts:252-340`).
- Mọi `appendEvent` được event store ghi `EventRecord` và outbox theo transaction hiện hữu; tuy nhiên bốn log được yêu cầu không ghi event ID/outbox ID/status của từng resource. Vì vậy response `201/200` trong test chỉ chứng minh write command đã trả thành công, chưa chứng minh event đã được append hay outbox đã được xử lý.

### 2.2. Worker → consumer → projection

- `scripts/e2e/playwright-services.mjs` chạy migration, build, app và worker; `src/worker.ts` đăng ký event-history, incident, inspection, notification và vehicle projections rồi gọi `worker.tick()`.
- `createEventWorker` mỗi tick tuần tự gọi `markOverdue()` rồi `processOneOutboxMessage()`; `tickInFlight` ngăn overlap (`src/modules/eventing/worker.ts:4-31`). Interval 100 ms không đồng nghĩa mỗi 100 ms xử lý xong một message, vì `markOverdue`, Prisma và tất cả consumers đều nằm trong cùng tick.
- `processOneOutboxMessage` lấy một message pending đã đến `availableAt`, claim, lấy `EventRecord`, gọi tuần tự mọi consumer, đánh dấu processed; nếu consumer throw thì tăng attempts, backoff hoặc dead-letter (`src/modules/eventing/outbox.ts:126-181`). Một consumer throw sẽ làm message đó chưa processed và không tạo projection cho consumer đang xử lý.
- `getEventConsumers` chỉ trả consumer đăng ký đúng event type cộng wildcard (`src/modules/eventing/event-store.ts:40-44`). Incident, inspection và vehicle projection đều tự register lúc module load; worker gọi register lại nhưng dùng cờ `globalThis` để tránh đăng ký kép (`src/modules/incidents/projection.ts:136-148`, `src/modules/inspections/projection.ts:200-217`, `src/modules/vehicles/projection.ts:188-205`). Source cho thấy registration path tồn tại; log không chứng minh process worker đã đăng ký đủ consumer hoặc consumer có throw.
- Projection path: `IncidentRegistered` → `projectIncidentEvent` → `reduceReadModel` → `upsertReadModel`; `EstablishmentRegistered`/`InspectionScheduled` → `projectInspectionEvent` → cùng read-model writer. `reduceReadModel` bỏ qua event nếu projection đã có `aggregateVersion >= event.aggregateVersion`, và thêm `event.actor.organizationId` vào state nếu state chưa có (`src/modules/eventing/read-model.ts:81-117`).

### 2.3. Projection → API predicate

- Polling của test chỉ GET API và trả `false` cho response non-2xx hoặc predicate không khớp (`tests/e2e/parallel-wave-read-model.spec.ts:61-76`). Nó không phân biệt `401/403/500`, empty list, projection thiếu row hay row có nhưng bị filter.
- Incident list gọi `listIncidents`; với actor có `organizationUnitId`, `readModels` lọc JSON `state.organizationId` (`src/modules/incidents/projection.ts:273-331`, `src/modules/eventing/read-model.ts:120-145`). Nếu không có projection phù hợp, commander có unit sẽ trả `[]` theo nhánh fallback.
- Establishment list cũng lọc `state.organizationId`, và khi projection query trả rỗng nhưng actor có unit thì trả `[]` thay vì source fallback (`src/modules/inspections/projection.ts:236-265`). Inspection list áp dụng đồng thời `organizationId` và assignment/resource filter (`src/modules/inspections/projection.ts:314-389`).
- Vehicle list khác về mặt chẩn đoán: `listRegistry` và `listObservations` merge projected entries với source rows (`src/modules/vehicles/projection.ts:224-332`). Vì vậy vehicle pass ở run45 chỉ chứng minh vehicle API có thể thấy source fallback hoặc projection; không chứng minh projection Incident/Establishment/Inspection đã hội tụ.

## 3. Giả thuyết đã loại trừ/chưa chứng minh

### Đã loại trừ một phần

- **Direct Incident API/actor scope là nguyên nhân duy nhất:** không còn phù hợp với run41/43/45; run41 đã đi qua direct GET trước khi polling và vẫn timeout read-model.
- **Global queue-health gate là nguyên nhân duy nhất:** run43/45 đã dùng polling resource-specific sau khi bỏ gate, nhưng ba timeout giữ nguyên.
- **Worker hoàn toàn không chạy:** không phù hợp hoàn toàn với run45 vì vehicle read-model test không nằm trong danh sách failure; source wrapper cũng khởi động worker riêng. Tuy vậy chưa chứng minh worker chạy đúng consumer cho từng event.
- **Database không sẵn sàng:** evidence `tests.md` ghi PostgreSQL đã accepting connections và full run tiến được tới các test; không có log DB connection failure trong bốn log.

### Chưa đủ bằng chứng để kết luận

- **Event chưa được append:** chưa có event ID/timestamp từ response hoặc observable API evidence để kiểm tra `IncidentRegistered`, `EstablishmentRegistered`, `InspectionScheduled` có tồn tại.
- **Outbox chưa được xử lý / backlog throughput:** source chỉ xử lý một outbox message mỗi tick sau `markOverdue`; có thể chậm dưới tải, backoff hoặc bị một message cũ chiếm throughput. Nhưng `run45` không có snapshot queue theo thời điểm target resource timeout, nên chưa phân biệt được backlog với consumer failure.
- **Consumer không đăng ký hoặc throw:** registration source tồn tại, nhưng worker stderr trong log không có lỗi consumer được gắn event/resource. `processOneOutboxMessage` nuốt lỗi vào `lastError` và chỉ `console.error` ở outer worker tick; log hiện có không cho biết message nào dead-letter.
- **Projection có nhưng API filter sai:** đây là giả thuyết đáng chú ý vì các list API lọc `state.organizationId`, còn test predicate chỉ thấy empty/false. `reduceReadModel` có fallback từ `event.actor.organizationId`, và các command actor snapshot có organization, nên source chưa đủ để kết luận filter sai; cần quan sát state/filter kết quả cho chính resource.
- **Organization scope sai:** có thể làm projection tồn tại nhưng bị `readModels` loại, hoặc actor test khác unit. Tuy nhiên test đã dùng commander cùng flow và direct detail chạy trước ở run41; chưa có response body `organizationUnitId`/target ID để chứng minh mismatch.
- **Worker throughput/backlog:** có căn cứ cơ chế (`một message/tick`, `markOverdue` trước dispatch, retry backoff) nhưng chưa có số liệu hàng đợi, tuổi oldest pending, attempts hoặc thời điểm từng resource được dispatch; chưa được kết luận là root cause.

## 4. Hướng xử lý tối thiểu / kế hoạch instrumentation hợp lệ

Chưa đủ căn cứ để chọn một source fix cụ thể. Sửa filter, đổi worker throughput hoặc sửa consumer lúc này đều là vá mù. Tester cần thu thập một trace theo resource mà không query DB trực tiếp từ test, không reset/drop/seed, không nới timeout và không bỏ predicate:

1. **Giữ nguyên test production predicate.** Trong một lần chạy được Planner duyệt, thêm chỉ quan sát ở harness/worker log (không sửa test assertion): log event type, event ID, aggregate type/ID, consumer name, success/throw, outbox message ID/attempt/status và projection upsert result. Nếu không muốn sửa source, chạy worker/app với logging đã có và dùng health endpoint; nhưng hiện health endpoint chỉ có counter tổng nên sẽ không đủ để phân biệt theo resource.
2. **Chụp API evidence ngoài predicate:** với cùng session/actor, ghi status và body rút gọn của `GET /api/incidents`, `GET /api/establishments`, `GET /api/inspections` tại lúc bắt đầu polling, giữa khoảng chờ và timeout; chỉ qua HTTP API, không truy cập Prisma/DB từ test. Ghi rõ `organizationUnitId` nếu API trả, số phần tử và có/không target ID.
3. **Chụp health snapshots:** gọi `/api/health/worker` bằng actor được phép ở các mốc trên, ghi `pendingCount`, `processingCount`, `deadLetterCount`, `oldestPendingAgeMs`, `projectionLagMs`, `projectionStatus`. Đây là evidence backlog toàn cục, không dùng làm điều kiện pass/fail.
4. **Đối chiếu kết quả:**
   - Không có event trace → lỗi append/transaction hoặc capture boundary.
   - Có event + outbox pending/attempt tăng → lỗi throughput/backoff/backlog.
   - Có event + consumer throw/dead-letter → lỗi registration/consumer/projection; dùng `lastError` trong worker observability để xác định đoạn throw.
   - Có projection upsert thành công nhưng API empty → filter/organization scope/API read-model query.
   - API trả target nhưng predicate vẫn false → lỗi response shape/predicate; không được sửa predicate trước khi chứng minh.
5. **Nếu trace chứng minh projection tồn tại nhưng filter loại sai**, hướng sửa tối thiểu là sửa đúng seam `readModels`/projection state organization propagation hoặc API scope, kèm regression cho cùng-unit và cross-unit; không thay worker và không nới poll. Nếu trace chứng minh consumer throw, sửa đúng consumer/projection handler và thêm regression event → read-model. Nếu chỉ chứng minh throughput, Planner mới cân nhắc thay đổi worker scheduling/batch, sau khi có số liệu target-specific.

## 5. Mapping với AC và bước ticket

- AC 34/35 và bước explicit convert/confirm: run41 đã loại được lỗi direct GET duy nhất ở test đầu, nhưng chưa chứng minh read-model Incident sau convert; cần event/outbox/projection trace.
- AC 41 và bước đăng ký 7 event IntakeReport: source catalog có đủ các event IntakeReport; ba timeout này chủ yếu xảy ra ở `IncidentRegistered` và inspection events, nên không được suy diễn rằng catalog IntakeReport là nguyên nhân nếu chưa có event trace.
- AC 43/44 và bước API/list/detail: các endpoint có filter OrganizationUnit và masked boundary; response status/body tại polling là evidence còn thiếu để kiểm tra scope/filter mà không bỏ predicate.
- AC 45 và bước idempotency: helper đã kiểm tra command response và `incidentId`, nhưng timeout không cung cấp evidence duplicate hay mất event; chưa có căn cứ gán lỗi cho idempotency.
- Bước worker/outbox/projection trong plan: worker/consumer/read-model call path hiện có đầy đủ trên source, nhưng full-run logs thiếu correlation theo resource. Vì vậy ticket vẫn ở trạng thái cần chẩn đoán, chưa đánh dấu AC/bước nào hoàn tất.

## Kết luận chẩn đoán

Bằng chứng chắc chắn hiện tại là: ba read-model API predicates không quan sát thấy resource trong 90 giây ở run41/43/45; direct Incident authorization và global backlog gate không còn giải thích đầy đủ; vehicle pass ở run45 không phải bằng chứng cùng projection path vì vehicle list có source fallback/merge. Chưa có evidence đủ để kết luận event append, outbox, consumer, projection hay API filter là root cause. Cần trace per-resource qua HTTP/API và worker observability theo kế hoạch trên trước khi sửa source/harness.
