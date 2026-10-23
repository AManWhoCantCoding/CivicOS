# Audit PS-E1-008 — Cập nhật Thông tin Tình huống từ Hiện trường (Field Update) — T1, Must Have

Nguồn yêu cầu: `docs/reset/requirements-baseline.md` (mục PS-E1-008).
Chỉ dùng code (`src/**`) và test (`tests/**`) làm bằng chứng. Không dùng design/SOW.
Trạng thái: **CÓ** = đầy đủ; **MỘT PHẦN** = một phần; **KHÔNG** = chưa có; **LỆCH** = khác ý nghĩa; **MƠ HỒ** = chưa rõ ai quyết; **PHASE 2** = baseline đưa vào Phase 2.

---

## Bảng kiểm tra từng yêu cầu

| ID | Trạng thái | Bằng chứng code (file:line) | Test (tên test; CHƯA CHẠY) | Ghi chú |
|---|---|---|---|---|
| FR-008-01 | **MỘT PHẦN** | `src/modules/mobile-readonly/contracts.ts:77-91` (Alarm/Dispatch/Task read items) <br> `src/modules/mobile-readonly/forces.ts:299-344, 348-402` (list/get các view đọc) | `tests/mobile-readonly/forces-read.contract.test.ts:22-118` (read-only list/detail) — **CHƯA CHẠY** <br> `tests/mobile-readonly/contract-matrix.contract.test.ts:44-64, 147-205` (forces views và GET shape) — **CHƯA CHẠY** | Có view Mobile đọc alarms/dispatches/tasks; chưa có bằng chứng đây là đúng entity “tình huống” của baseline (D-32 chưa trả lời) hoặc có luồng ghi cập nhật tình huống. Không dùng test read-only để kết luận có write flow. |
| FR-008-02 | **KHÔNG** | **KHÔNG CÓ BẰNG CHỨNG** | **KHÔNG CÓ TEST** | Không có field/status "Đang xử lý / Cần hỗ trợ / Đã kiểm soát" cho tình huống. |
| FR-008-03 | **MỘT PHẦN** | `src/modules/platform/evidence/evidence-service.ts` (createEvidence: latitude, longitude, capturedAt) <br> `src/modules/platform/geo/index.ts:12-20` (createGeoPoint validate) | `tests/platform/evidence.integration.test.ts:22-41` — **CHƯA CHẠY** | Platform evidence hỗ trợ GPS. Thiếu: field update command gắn GPS tự động (chỉ evidence có GPS). |
| FR-008-04 | **KHÔNG** | **KHÔNG CÓ BẰNG CHỨNG** | **KHÔNG CÓ TEST** | Không có field nhập mô tả ngắn (1-3 câu) cho cập nhật tình huống. |
| FR-008-05 | **MỘT PHẦN** | `src/modules/platform/notifications/index.ts:6-38` (createInAppNotification) <br> `src/modules/platform/notifications/index.ts:64-86` (SlaOverdue consumer → in-app) | **KHÔNG CÓ TEST** push notification realtime | Có in-app notification. Thiếu: push realtime (FCM/APNs) tới Trưởng CA xã. |
| FR-008-06 | **KHÔNG** | **KHÔNG CÓ BẰNG CHỨNG** | **KHÔNG CÓ TEST** | Không có "đóng tình huống khi cập nhật 'Đã xử lý xong'". |
| FR-008-07 | **MỘT PHẦN** | `src/modules/eventing/event-store.ts` (appendEvent, readAggregateEvents) <br> `src/modules/incidents/projection.ts` (incidentState projection) | `tests/eventing/event-durability.postgres.test.ts` — **CHƯA CHẠY** | Event sourcing lưu timeline. Thiếu: field update entity/timeline riêng cho FieldUpdate. |
| NFR-008-01 | **KHÔNG** | **KHÔNG CÓ BẰNG CHỨNG** | **KHÔNG CÓ TEST** | Không có benchmark thao tác < 1 phút. |
| NFR-008-02 | **MỘT PHẦN** | `src/modules/platform/evidence/evidence-service.ts:18-55` (createEvidence validate lat/lng) <br> `src/modules/platform/geo/index.ts:12-20` (createGeoPoint) | `tests/platform/evidence.integration.test.ts:22-41` — **CHƯA CHẠY** | GPS validate ở evidence. Thiếu: GPS tự động gắn cho field update. |
| NFR-008-03 | **MỘT PHẦN** | `src/modules/platform/notifications/index.ts:6-38` (createInAppNotification) | **KHÔNG CÓ TEST** realtime push | Chỉ in-app notification. Thiếu push realtime (FCM/APNs/Socket.IO). |
| NFR-008-04 | **CÓ** | `src/modules/platform/evidence/evidence-service.ts:55-80` (immutable=true, SHA-256, metadata) | `tests/platform/evidence.integration.test.ts:43-88` — **CHƯA CHẠY** | Evidence immutable, SHA-256 hash, metadata (capturedAt, actorId, lat, lng). |
| NFR-008-05 | **MƠ HỒ** | `src/modules/platform/field-sync/index.ts:20-31, 77-89` (trạng thái command và kiểm tra baseVersion) | `tests/platform/offline-sync.integration.test.ts:29-34` (freshness check) — **CHƯA CHẠY** <br> `tests/inspections/inspection-slices-4-6.postgres.test.ts:827-858` (offline command stale/idempotency) — **CHƯA CHẠY** | Framework offline command có kiểm tra version và idempotency; test hiện có là contract/framework, không chứng minh Mobile field-update đã tích hợp. Phạm vi áp dụng vẫn **MƠ HỒ** vì yêu cầu được đánh dấu [BỔ SUNG], cần xác nhận. |

---

## Trích nguyên văn code (≤15 dòng) — hard-code / cấu hình

### 1. `src/modules/platform/field-sync/index.ts:20-31` — OfflineCommandStatus enum

```ts
export type OfflineCommandStatus =
  'pending' | 'syncing' | 'synced' | 'failed' | 'rejected';
```

### 2. `src/modules/platform/field-sync/index.ts:77-89` — assertOfflineCommandFresh

```ts
export function assertOfflineCommandFresh(
  expectedVersion: number | undefined,
  currentVersion: number | undefined,
): void {
  if (
    expectedVersion !== undefined &&
    currentVersion !== undefined &&
    expectedVersion !== currentVersion
  ) {
    throw new Error('STALE_OFFLINE_COMMAND');
  }
}
```

---

## Chức năng ngoài yêu cầu — tối đa 10 dòng

| Nhóm | Chức năng | Vị trí code | Mô tả | Ghi chú / liên quan yêu cầu |
|---|---|---|---|---|
| (a) | Platform evidence (immutable, GPS, hash) | `src/modules/platform/evidence/evidence-service.ts` | Tạo evidence với GPS, SHA-256, immutable metadata | NFR-008-04, FR-008-03 |
| (a) | Platform offline command queue | `src/modules/platform/field-sync/index.ts` | Accept/sync/complete/fail/reject offline command, baseVersion, idempotency | NFR-008-05 (framework chung) |
| (a) | Platform notification (in-app) | `src/modules/platform/notifications/index.ts` | createInAppNotification, SlaOverdue consumer | NFR-008-03, FR-008-05 |
| (a) | Mobile-readonly alarms/dispatches/tasks | `src/modules/mobile-readonly/forces.ts` | List/get alarms, dispatches, tasks cho mobile | FR-008-01 (read-only) |
| (a) | Event sourcing timeline | `src/modules/eventing/event-store.ts` | DomainEvent append/read, projection | FR-008-07 (timeline) |
| (a) | GeoPoint/GeoArea validation | `src/modules/platform/geo/index.ts` | WGS84 coordinate validate, polygon closed/non-intersect | NFR-008-02 |
| (b) | Mock camera adapter | `src/modules/vehicles/mock-camera-adapter.ts` | Không liên quan field update | PS-E1-003/009 |
| (b) | Direct Incident creation | `src/modules/incidents/commands.ts:1588-1661` | Không liên quan field update | PS-E1-005 |
| (b) | Vehicle observation/verification | `src/modules/vehicles/commands.ts` | Không liên quan field update | PS-E1-009 |

---

## Câu hỏi mở → thêm vào decision-log.md

- D-32 (PS-E1-008): "tình huống" — là `Incident` hay entity riêng `FieldUpdate`? (CONTEXT.md có FieldUpdate nhưng code chưa thấy).
- D-33 (PS-E1-008): "app mobile" — mobile internal (cán bộ) hay public citizen app?
- D-34 (PS-E1-008): NFR-008-05 `[BỔ SUNG]` "cần xác nhận với đơn vị nghiệp vụ" — offline sync cho field update có áp dụng framework `platform/field-sync` không?
- D-35 (PS-E1-008): "push notification realtime" — dùng FCM/APNs hay Socket.IO? Có infrastructure không?
- D-36 (PS-E1-008): "Trưởng CA xã" nhận push — role `commander` hay `commune_leader`? (D-01).
