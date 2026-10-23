# Audit PS-E1-009 — Quản lý Phương tiện Lạ / Khả nghi Lưu trú — T1, Must Have

Nguồn yêu cầu: `docs/reset/requirements-baseline.md` (mục PS-E1-009).
Chỉ dùng code (`src/**`) và test (`tests/**`) làm bằng chứng. Không dùng design/SOW.
Trạng thái: **CÓ** = đầy đủ; **MỘT PHẦN** = một phần; **KHÔNG** = chưa có; **LỆCH** = khác ý nghĩa; **MƠ HỒ** = chưa rõ ai quyết; **PHASE 2** = baseline đưa vào Phase 2.

---

## Bảng kiểm tra từng yêu cầu

| ID | Trạng thái | Bằng chứng code (file:line) | Test (tên test; CHƯA CHẠY) | Ghi chú |
|---|---|---|---|---|
| FR-009-01 | **MỘT PHẦN** | `src/modules/vehicles/contracts.ts:5-14` (VehicleObservationInput: plate, observedAt, lat, lng, description, evidenceIds, clientCommandId, baseVersion) <br> `src/modules/vehicles/commands.ts:39-55` (recordVehicleObservation) <br> `src/modules/vehicles/mock-camera-adapter.ts` (MOCK_CAMERA_FIXTURES) | `tests/vehicles/vehicle-watch-contract.test.ts` — **CHƯA CHẠY** | Tiếp nhận báo cáo: recordVehicleObservation (nhập tay biển số). Có mock camera adapter (MOCK_CAMERA_FIXTURES) cho LPR. **Thiếu**: tích hợp LPR thật (mục 5 baseline: Phase 2). |
| FR-009-02 | **CÓ** | `src/modules/vehicles/commands.ts:57-95` (confirmVehicleMatch: match registry) <br> `src/modules/vehicles/commands.ts:150-200` (verifyVehicleObservation) <br> `src/modules/vehicles/domain.ts:13-15` (SuspiciousVehicleMatched, SuspiciousVehicleMatchConfirmed events) | `tests/vehicles/vehicle-watch-contract.test.ts` — **CHƯA CHẠY** | Tra cứu biển số: confirmVehicleMatch đối chiếu với SuspiciousVehicleRegistry. Lịch sử camera: mock adapter. |
| FR-009-03 | **CÓ** | `src/modules/vehicles/commands.ts:794-890` (verifyVehicleObservation lưu result, notes, ownerLookup, tọa độ/evidence, event và audit) | `tests/vehicles/vehicle-watch-slices-4-7.postgres.test.ts:746-838` (xác minh và lưu các trường/evidence/audit/event) — **CHƯA CHẠY** | Ghi nhận kết quả xác minh thực địa. Test này thuộc bộ slices 4-7; chưa chạy trong đợt kiểm toán. |
| FR-009-04 | **MỘT PHẦN** | `src/modules/vehicles/commands.ts:150-200` (verifyVehicleObservation có ownerLookup) <br> `src/modules/residents/commands.ts` (tạm trú người nước ngoài) | **KHÔNG CÓ TEST** nhắc khai báo tạm trú | Có ownerLookup field trong verifyVehicleObservation. **Thiếu**: logic tự động "nhắc chủ xe khai báo tạm trú nếu xe hợp lệ" — không có automation này. |
| FR-009-05 | **MỘT PHẦN** | `src/modules/vehicles/commands.ts:100-150` (escalateVehicleObservation) <br> `src/modules/vehicles/domain.ts:17-18` (VehicleEscalated event) <br> `src/modules/vehicles/domain.ts:48-51` (VEHICLE_ESCALATION_SLA = 2h) | `tests/vehicles/vehicle-authorization.postgres.test.ts` — **CHƯA CHẠY** | Báo cáo CA huyện trong 2h: escalateVehicleObservation + VEHICLE_ESCALATION_SLA 2h. **Thiếu**: "không tự xử lý" — escalation chỉ tạo event, không có workflow chuyển đơn vị cấp trên (Gap 2: CA huyện → cấu hình được). |
| FR-009-06 | **CÓ** | `src/modules/vehicles/contracts.ts:5-14` (VehicleObservationInput: plate, observedAt, lat, lng, description, evidenceIds) <br> `src/modules/vehicles/commands.ts:39-55` (recordVehicleObservation validate lat/lng) | `tests/vehicles/vehicle-demo-seed.postgres.test.ts` — **CHƯA CHẠY** | Ghi nhận đầy đủ: biển số, thời gian, địa điểm (lat/lng), evidenceIds. Evidence gắn qua platform evidence. |
| FR-009-07 | **MỘT PHẦN** | `src/modules/vehicles/projection.ts:44-80` (listObservations, listRegistry, rebuildVehicleProjection) <br> `src/modules/vehicles/commands.ts:39-55` (recordVehicleObservation) | **KHÔNG CÓ TEST** thống kê theo tháng/điểm | Có listObservations, listRegistry. **Thiếu**: thống kê tháng và điểm hay xuất hiện (cần aggregate query). |
| NFR-009-01 | **MỘT PHẦN** | `src/modules/vehicles/domain.ts:48-51` (VEHICLE_ESCALATION_SLA = 2h) <br> `src/modules/vehicles/commands.ts:100-150` (escalateVehicleObservation) | **KHÔNG CÓ TEST** SLA 4h/48h | Có escalation SLA 2h. **Thiếu**: SLA "phương tiện dừng > 48h không khai báo → kiểm tra trong 4h" — không có logic detect xe dừng > 48h. |
| NFR-009-02 | **CÓ** | `src/modules/vehicles/commands.ts:57-95` (confirmVehicleMatch query registry) <br> `src/modules/vehicles/projection.ts` (listRegistry) | **CHƯA CHẠY** | Tra cứu biển số qua registry projection. Index trên plate + status. |
| NFR-009-03 | **MỘT PHẦN** | `src/modules/vehicles/domain.ts:48-51` (VEHICLE_ESCALATION_SLA = 2h) <br> `src/modules/vehicles/commands.ts:100-150` (escalateVehicleObservation) | **CHƯA CHẠY** | Escalation SLA 2h. **Thiếu**: Gap 2 — "CA huyện" cần cấu hình được (province/district). |
| NFR-009-04 | **CÓ** | `src/modules/vehicles/contracts.ts:5-14` (evidenceIds) <br> `src/modules/platform/evidence/evidence-service.ts` (createEvidence: immutable, GPS, hash) | `tests/vehicles/vehicle-demo-seed.postgres.test.ts` — **CHƯA CHẠY** | Mọi ghi nhận có evidenceIds, GPS (lat/lng), thời gian (observedAt). Evidence immutable. |

---

## Trích nguyên văn code (≤15 dòng) — hard-code trái ngược "cấu hình được"

### 1. `src/modules/vehicles/domain.ts:48-51` — VEHICLE_ESCALATION_SLA hardcode 2h

```ts
export const VEHICLE_ESCALATION_SLA = {
  kind: 'vehicle_escalation_2h',
  durationMs: 2 * 60 * 60 * 1000,
};
```

### 2. `src/modules/vehicles/domain.ts:53-57` — VEHICLE_REGISTRY_STATUSES hardcode

```ts
export const VEHICLE_REGISTRY_STATUSES = [
  'active',
  'expired',
  'revoked',
] as const;
```

### 3. `src/modules/vehicles/mock-camera-adapter.ts:1-30` — MOCK_CAMERA_FIXTURES hardcode (Phase 2)

```ts
export const MOCK_CAMERA_FIXTURES = [
  { plate: '89A12345', observedAt: '2026-09-19T01:00:00.000Z', latitude: 20.960, longitude: 105.930 },
  { plate: '29B67890', observedAt: '2026-09-19T01:05:00.000Z', latitude: 20.961, longitude: 105.931 },
  { plate: '89C11223', observedAt: '2026-09-19T01:10:00.000Z', latitude: 20.962, longitude: 105.932 },
];
```

---

## Chức năng ngoài yêu cầu — tối đa 10 dòng

| Nhóm | Chức năng | Vị trí code | Mô tả | Ghi chú / liên quan yêu cầu |
|---|---|---|---|---|
| (a) | VehicleObservation CRUD | `src/modules/vehicles/commands.ts:39-200` | Record, match, verify, escalate observation | FR-009-01, 02, 03, 05 |
| (a) | SuspiciousVehicleRegistry CRUD | `src/modules/vehicles/commands.ts` (createRegistryEntry, updateRegistryEntry) | Registry xe nghi: plate, source, reason, validFrom/Until, status | FR-009-02 |
| (a) | Vehicle match/verify workflow | `src/modules/vehicles/commands.ts:57-200` | Match registry → confirm → verify → escalate | FR-009-02, 03, 05 |
| (a) | Vehicle projection (listObservations, listRegistry) | `src/modules/vehicles/projection.ts:44-80` | Read model cho observation & registry | FR-009-07 |
| (a) | Mock camera adapter (LPR) | `src/modules/vehicles/mock-camera-adapter.ts` | MOCK_CAMERA_FIXTURES 3 observation | Mục 5 baseline (Phase 2) |
| (a) | Vehicle SLA escalation 2h | `src/modules/vehicles/domain.ts:48-51` | VEHICLE_ESCALATION_SLA auto-create khi escalate | NFR-009-03 |
| (b) | Direct Incident creation | `src/modules/incidents/commands.ts:1588-1661` | Không liên quan vehicle | PS-E1-005 |
| (b) | Mock camera adapter (vehicle) | `src/modules/vehicles/mock-camera-adapter.ts` | Giả lập LPR | Mục 5 baseline |

---

## Câu hỏi mở → thêm vào decision-log.md

- D-37 (PS-E1-009): "CSDL xe nghi vấn" — là `SuspiciousVehicleRegistry` hay CSDL riêng?
- D-38 (PS-E1-009): "CA huyện" trong FR-009-05, NFR-009-03 — xem Gap 2 (cấu hình được đơn vị cấp trên).
- D-39 (PS-E1-009): "tổ tự quản thôn" — role `village_officer` hay role riêng?
- D-40 (PS-E1-009): "app công dân" cho Người dân — public citizen app có trong phạm vi không?
- D-41 (PS-E1-009): SLA "phương tiện dừng > 48h → kiểm tra 4h" — logic detect như thế nào (parking detection, camera, manual report)?
