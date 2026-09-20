# 01: Event kernel và transactional outbox

**What to build:** Xây nền tảng ghi nhận và phát hành DomainEvent bất biến để một thay đổi nghiệp vụ và lịch sử của nó được lưu bền vững, worker có thể xử lý outbox an toàn, projection có thể replay, và người vận hành nhìn thấy lỗi hoặc độ trễ. Đây là nền tảng dùng chung, chưa triển khai một phân hệ nghiệp vụ cụ thể.

**Blocked by:** None (can start immediately)

**Status:** done

## Files in scope

- `.env.example`: chuyển cấu hình phát triển sang PostgreSQL và khai báo các biến worker/test cần thiết.
- `docker-compose.yml`: cung cấp PostgreSQL cục bộ cho development và integration test.
- `package.json`: thêm script worker/test và dependency tối thiểu cho TypeScript worker, Vitest và Playwright.
- `package-lock.json`: lock các dependency đã thêm.
- `prisma/schema.prisma`: thêm EventRecord, OutboxMessage, ProjectionCheckpoint và các unique/index cần thiết; datasource dùng PostgreSQL.
- `prisma/migrations/<timestamp>_event_kernel/migration.sql`: migration tạo schema event kernel.
- `src/lib/prisma.ts`: giữ singleton hiện tại và bổ sung cấu hình phù hợp cho worker/test nếu cần.
- `src/modules/eventing/index.ts`: public entry point duy nhất của Event kernel.
- `src/modules/eventing/contracts.ts`: envelope, aggregate version, event type/version và append/publish contracts.
- `src/modules/eventing/event-store.ts`: append bất biến, optimistic concurrency và truy vấn stream/global index.
- `src/modules/eventing/outbox.ts`: claim, retry, backoff, dead-letter và idempotency.
- `src/modules/eventing/worker.ts`: vòng xử lý outbox và consumer dispatch.
- `src/modules/eventing/replay.ts`: rebuild projection từ event history.
- `src/worker.ts`: process entry point để chạy worker riêng.
- `vitest.config.ts`: cấu hình unit/integration test.
- `playwright.config.ts`: cấu hình e2e test tối thiểu cho các ticket full-stack sau.
- `tests/eventing/event-kernel.integration.test.ts`: transaction, ordering, retry, idempotency và replay tests.
- `tests/support/database.ts`: lifecycle database test PostgreSQL.

## Implementation steps

- [x] 1. **Chốt và kiểm tra runtime baseline có thể tái lập trước verification.** PostgreSQL phải khởi động được, Prisma Client phải generate được, migration phải chạy được trên database tạm sạch và lần chạy thứ hai phải là no-op. Ghi lại command, exit code và môi trường chạy; không dùng database/mock thay cho PostgreSQL thật.
- [x] 2. **Chốt event envelope và persistence contract qua public Event kernel API.** Contract test phải kiểm tra đầy đủ field, Actor snapshot, correlation/causation IDs, payload, metadata, duplicate/version behavior và round-trip persistence; test phải đi qua public entry point, không import implementation nội bộ.

> **Change rationale:** S1 và S2 được chuyển từ yêu cầu chứng minh thứ tự lịch sử sang yêu cầu verification có thể tái lập, vì Git history không thể chứng minh thứ tự cũ.
- [x] 3. **Tạo schema và migration.** Thêm EventRecord, OutboxMessage và ProjectionCheckpoint với unique constraint cho `eventId` và `(aggregateType, aggregateId, aggregateVersion)`, index cho stream, event type, pending outbox và occurred time. Chạy migration trên database sạch và kiểm tra migration không dựa vào dữ liệu thủ công.
- [x] 4. **Implement public Event kernel API.** Chỉ export contract cần cho module nghiệp vụ: append transaction, read stream, publish outbox, register consumer và replay projection. Không export Prisma model hoặc repository implementation ra ngoài public entry point.
- [x] 5. **Implement atomic append và optimistic concurrency.** Trong cùng transaction, ghi aggregate state change reference, EventRecord và OutboxMessage; từ chối version cũ hoặc version trùng; không dùng last-write-wins.
- [x] 6. **Implement outbox lifecycle.** Worker claim message bằng locking an toàn, ghi attempt count/last error/next retry, retry exponential backoff, chuyển dead-letter sau threshold và không tạo side effect trùng khi message được giao lại.
- [x] 7. **Implement consumer dispatch và replay.** Consumer cập nhật ProjectionCheckpoint sau khi xử lý thành công; replay có thể chạy từ sequence/event time, xóa hoặc rebuild projection theo policy và không thay đổi EventRecord gốc.
- [x] 8. **Implement worker health và lag signal.** Expose trạng thái worker, pending count, oldest pending age, failed/dead-letter count và projection lag để ticket 07 có thể kiểm tra p95 10 giây.
- [x] 9. **Viết integration tests bằng PostgreSQL thật.** Bao phủ rollback atomicity, concurrent append, duplicate event, outbox claim/retry/dead-letter, idempotent consumer và replay equivalence; không mock transaction/locking.
- [x] 10. **Chạy verification gate.** Chạy lint, typecheck/build, migration trên database sạch, worker process và toàn bộ eventing tests. Chỉ đánh dấu ticket hoàn thành khi public entry point không để lộ internals và tất cả acceptance criteria đều có test hoặc signal kiểm chứng.

## Explicitly out of scope

- Không tạo aggregate nghiệp vụ của PS-E1-005, PS-E1-007 hoặc PS-E1-009.
- Không xây UI nghiệp vụ; đây là ticket hạ tầng không có màn hình người dùng.
- Không dùng Kafka, RabbitMQ hoặc full event sourcing.
- Không cho phép module khác import internals dưới `src/modules/eventing`.

## Acceptance criteria

- [x] Mỗi event lưu được `eventId`, `eventType`, `eventVersion`, `aggregateType`, `aggregateId`, `aggregateVersion`, `occurredAt`, `recordedAt`, Actor snapshot, `correlationId`, `causationId`, payload và metadata.
- [x] Một event có cùng `eventId` hoặc cùng `(aggregateId, aggregateVersion)` không thể được ghi thành bản sao thứ hai.
- [x] Domain state và event record được commit hoặc rollback cùng transaction.
- [x] Append sai aggregate version bị từ chối, không âm thầm ghi đè event trước đó.
- [x] Outbox worker claim message an toàn khi có nhiều worker; một message thành công chỉ được dispatch một lần về mặt hiệu ứng nhờ idempotency.
- [x] Lỗi consumer được retry với backoff, ghi số lần thử, và chuyển dead-letter sau ngưỡng cấu hình.
- [x] Projection có thể bị xóa/rebuild từ event stream mà cho ra cùng kết quả với xử lý trực tiếp.
- [x] Worker có health/lag signal đủ để phát hiện projection quá 10 giây trong điều kiện test bình thường.
- [x] Integration test chạy với PostgreSQL thật, không thay bằng mock Prisma cho transaction, locking hoặc uniqueness.
- [x] `npm run lint`, `npm run build` và test command mới đều chạy được trên database sạch.
- [x] Không có event consumer nào import implementation nội bộ của consumer khác.
