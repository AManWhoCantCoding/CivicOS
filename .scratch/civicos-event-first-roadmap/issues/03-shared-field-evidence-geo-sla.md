# 03: Năng lực dùng chung cho vertical slice

**What to build:** Cung cấp Evidence bất biến, GeoPoint/GeoArea, SLA timer 24/7, in-app notification, responsive/PWA field shell và offline command synchronization để ba module nghiệp vụ dùng chung một contract thay vì tự xây lại.

**Blocked by:** 01: Event kernel và transactional outbox; 02: Identity, Assignment và quyền truy cập

**Status:** done

## Files in scope

- `prisma/schema.prisma`: thêm Evidence, EvidenceHash, GeoReference, SlaClock, Notification và OfflineCommand tables.
- `prisma/migrations/<timestamp>_shared_field_capabilities/migration.sql`: migration shared capabilities.
- `src/modules/platform/index.ts`: public entry point.
- `src/modules/platform/evidence/index.ts`: Evidence contract.
- `src/modules/platform/evidence/evidence-service.ts`: immutable metadata/hash/access checks.
- `src/modules/platform/evidence/storage-adapter.ts`: storage adapter và local development implementation.
- `src/modules/platform/geo/index.ts`: GeoPoint/GeoArea validation và coordinate contract.
- `src/modules/platform/sla/index.ts`: configurable continuous clock, weekend/holiday handling và overdue events.
- `src/modules/platform/notifications/index.ts`: in-app notification contract and projection.
- `src/modules/platform/field-sync/index.ts`: client command ID, offline queue, sync/retry/conflict handling.
- `src/app/api/evidence/route.ts`: upload metadata/hash and read authorization boundary.
- `src/app/api/sync/route.ts`: idempotent offline command synchronization.
- `src/app/api/notifications/route.ts`: notification list/read endpoint.
- `src/app/field/layout.tsx`: shared field shell.
- `src/app/field/offline/page.tsx`: offline/sync status surface.
- `src/components/field/FieldShell.tsx`: responsive field navigation and safe action layout.
- `src/components/field/EvidenceCapture.tsx`: camera/file/GPS capture contract UI.
- `src/components/field/OfflineQueueStatus.tsx`: pending/failed/synced command states.
- `src/app/globals.css`: shared tokens, focus, reduced-motion and responsive foundations only.
- `tests/platform/evidence.integration.test.ts`: hash, immutability and access tests.
- `tests/platform/geo.integration.test.ts`: coordinate and polygon validation tests.
- `tests/platform/sla.integration.test.ts`: continuous clock including weekends/holidays.
- `tests/platform/offline-sync.integration.test.ts`: duplicate ID, stale command and retry tests.
- `tests/e2e/field-shell.spec.ts`: responsive field and offline state browser test.

## Implementation steps

- [x] 1. **Chốt ownership và shared contracts.** Xác định module platform chỉ cung cấp Evidence, Geo, SLA, Notification và sync primitives; không chứa Incident/Inspection/VehicleObservation state. Mọi public type đi qua `src/modules/platform/index.ts`.
- [x] 2. **Tạo shared migration.** Thêm Evidence metadata/hash, storage reference, GeoReference, SLA rule/clock state, Notification và OfflineCommand; thêm index cho resource owner, pending notification và sync status.
- [x] 3. **Implement Evidence adapter.** Tạo storage interface, local development adapter, hash-at-write, immutable original metadata và authorization callback. Không cho update/delete original; replacement tạo record mới.
- [x] 4. **Implement Geo value objects.** Validate coordinate range, coordinate reference, polygon closure/validity và serialization; test invalid input trước khi cho module nghiệp vụ sử dụng.
- [x] 5. **Implement SLA engine.** Dùng clock liên tục theo `Asia/Ho_Chi_Minh`, bao gồm cuối tuần/ngày lễ; tạo một overdue event mỗi SLA instance, support configurable thresholds, retry và idempotency.
- [x] 6. **Implement notification projection.** Nhận event qua outbox, tạo in-app notification, đánh dấu read, retry delivery và expose lag/error; không gọi SMS/push provider thật trong ticket.
- [x] 7. **Implement offline sync contract.** Lưu client command ID, occurred/received timestamps, payload version và sync state; duplicate ID trả kết quả cũ, stale transition bị server từ chối, append-only update không ghi đè.
- [x] 8. **Build shared field shell.** Dùng responsive/PWA shell, EvidenceCapture và OfflineQueueStatus; UI phải hiển thị rõ local pending, syncing, failed và server accepted. Không giả lập trạng thái synced chỉ từ client.
- [x] 9. **Áp dụng design preflight cho UI.** Giữ `DESIGN_VARIANCE=3`, `MOTION_INTENSITY=2`, `VISUAL_DENSITY=5`; kiểm tra label/error/focus, touch target, keyboard, mobile single-column, contrast và reduced motion.
- [x] 10. **Viết tests và verification.** Integration test hash/access/geo/SLA/sync, browser test online/offline/resume flow, lint/typecheck/build và kiểm tra worker phát notification từ outbox chứ không từ transaction side effect.

## Explicitly out of scope

- Không triển khai native iOS/Android.
- Không gửi SMS/push provider thật; in-app notification và adapter contract là đủ.
- Không kết nối Camera/LPR thật.
- Không cho phép sửa/xóa Evidence gốc.

## UI requirements

Áp dụng `design-taste-frontend` theo hướng trust-first public-sector field operations: `DESIGN_VARIANCE=3`, `MOTION_INTENSITY=2`, `VISUAL_DENSITY=5`. Mobile-first, thao tác dưới một phút, một cột dưới 768px, nút hành động rõ, không glassmorphism/gradient/neon, không animation gây chậm thao tác. Mọi form phải có label trên input, helper/error inline, focus ring và loading/empty/offline/error states.

## Acceptance criteria

- [x] Evidence được lưu với hash, Actor, capture time, GPS metadata và immutable original reference.
- [x] Upload lại cùng nội dung không tạo bản sao ngoài quy tắc idempotency đã định; thay thế tạo Evidence mới.
- [x] User không có quyền không thể đọc metadata hoặc tải Evidence chỉ bằng cách đổi ID.
- [x] GeoPoint và GeoArea dùng cùng coordinate contract; polygon không hợp lệ bị từ chối.
- [x] SLA chạy liên tục qua thứ bảy, chủ nhật và ngày lễ; threshold có thể cấu hình và event overdue được tạo đúng một lần.
- [x] Notification phát sinh từ outbox event, không gửi side effect trực tiếp trong domain transaction.
- [x] Offline command có client ID, `occurredAt`, `receivedAt`, retry state và xử lý idempotent.
- [x] Stale status transition bị server từ chối; append-only FieldUpdate không bị ghi đè.
- [x] Field shell hiển thị rõ online/offline/syncing/failed/synced và không làm mất dữ liệu khi reload.
- [x] Browser test bao phủ viewport desktop và mobile, keyboard focus, reduced motion và các trạng thái lỗi chính.
- [x] `npm run lint`, `npm run build` và toàn bộ shared-capability tests pass.
