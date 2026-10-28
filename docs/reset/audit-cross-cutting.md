# Audit Cross-cutting — NFR-X-01..05 & NFR-CAM-01..04

Nguồn yêu cầu: `docs/reset/requirements-baseline.md` (mục 5, 6).
Chỉ dùng code (`src/**`) và test (`tests/**`) làm bằng chứng. Không dùng design/SOW.
Trạng thái: **CÓ** = đầy đủ; **MỘT PHẦN** = một phần; **KHÔNG** = chưa có; **LỆCH** = khác ý nghĩa; **MƠ HỒ** = chưa rõ ai quyết; **PHASE 2** = baseline đưa vào Phase 2.

---

## NFR-X-01 — Bảo mật & phân quyền: RBAC theo cấp độ bí mật dữ liệu (PS-003, PS-005), NĐ 13/2023/NĐ-CP

| ID con | Trạng thái | Bằng chứng code (file:line) | Test / kết quả | Ghi chú |
|---|---|---|---|---|
| NFR-X-01a | **CÓ** | `src/modules/identity/contracts.ts:73-86` (ROLE_BASE_CAPABILITIES per role) <br> `src/modules/identity/authorization.ts:134-234` (evaluatePolicy: ROLE_CAPABILITY_DENIED, ASSIGNMENT_REQUIRED, TASK_CAPABILITY_DENIED, ORGANIZATION_SCOPE_DENIED) | `tests/identity/capability-policy.test.ts` — 32/32 passed locally (policy unit contract); PostgreSQL authorization seam not run. | RBAC: role capabilities + assignment-based access. Policy evaluation có 5 denial reasons. |
| NFR-X-01b | **CÓ** | `src/modules/identity/encryption.ts:18-46` (encryptSensitive/decryptSensitive AES-256-GCM) <br> `src/modules/identity/encryption.ts:48-52` (blindIndex) <br> `src/modules/incidents/commands.ts:525-539` (encryptSensitive sourceName, sourceContact, sensitiveRef) | `tests/identity/encryption.integration.test.ts` — 4 passed, 1 DB-gated skipped (`RUN_DB_TESTS=0`); persisted sensitive-field assertion not run. | Mã hóa AES-256-GCM cho sensitive fields (sourceName, sourceContact, sensitiveRef, identityNumber). blindIndex cho tìm kiếm. |
| NFR-X-01c | **CÓ** | `src/modules/identity/authorization.ts:194-205` (read_sensitive gate cho LandParty) <br> `src/modules/incidents/commands.ts:828-845` (canRevealIntakeRow: commander + Assignment + read_sensitive) <br> `src/modules/residents/contracts.ts:63-66` (maskDisplayName) | `tests/residents/resident-contracts.test.ts` — 11/11 (mask helper); `tests/residents/resident-sensitive-access.test.ts` — 8/8 (access helper). Intake reveal/persistence seam remains DB-unverified. | Reveal chỉ commander có Assignment `incident_verification` + policy grant. Mask display name (chữ cái đầu + ***). |
| NFR-X-01d | **CÓ** | `src/modules/identity/audit.ts:24-77` (recordAudit cho mọi operation) <br> `src/modules/incidents/commands.ts` (gọi recordAudit: intake.created, intake.verified, intake.sensitive_reveal) | `tests/identity/audit.integration.test.ts` — 1 passed, 2 DB-gated skipped (`RUN_DB_TESTS=0`); persistence/outbox assertions remain unrun. | Audit log đầy đủ: intake.created, intake.verified, intake.sensitive_reveal, intake.read. |
| NFR-X-01e | **MỘT PHẦN** | `src/modules/identity/contracts.ts:88-95` (ASSIGNMENT_TASKS bao gồm resident_followup, vehicle_verification, land_review) | `tests/identity/lnd04-land-assignment-policy.test.ts` — 15/15; `tests/identity/capability-policy.test.ts` — 32/32 passed locally. | Assignment task mapping cho PS-003 (resident_followup), PS-005 (vehicle_verification). **Thiếu**: task chuyên biệt cho PS-003 sensitive data (hiện dùng resident_followup chung); policy test không chứng minh tách biệt quyền sensitive. |

---

## NFR-X-02 — Định vị & bản đồ: chung 1 hệ tọa độ/nền bản đồ (VietGeoX/VBDLIS) cho PS-001

| ID con | Trạng thái | Bằng chứng code (file:line) | Test / kết quả | Ghi chú |
|---|---|---|---|---|
| NFR-X-02a | **CÓ** | `src/modules/platform/geo/index.ts:1-10` (GeoPoint, GeoArea: coordinateReference: 'WGS84') <br> `src/modules/platform/geo/index.ts:12-110` (createGeoPoint, createGeoArea validate WGS84) | `tests/map/map-geometry.test.ts` — 5/5 passed locally (non-DB). | Hệ tọa độ WGS84 chuẩn. GeoPoint validate -90..90, -180..180. GeoArea validate polygon closed, non-self-intersect, area > 0. |
| NFR-X-02b | **MỘT PHẦN** | `src/modules/platform/map/index.ts:7, 108-109` (CADN_BOUNDS = [105.93, 20.91, 106.03, 20.99]) <br> `src/components/map/MapWorkspace.tsx:176-188` (bbox validation trong CADN_BOUNDS) | `tests/map/map-provider.test.ts` — 6/6 passed locally (non-DB). | Bounds CADN hardcode. **Thiếu**: tích hợp VietGeoX/VBDLIS thật (hiện dùng OSS TileServer GL). Baseline mục 5: camera/VietGeoX/VBDLIS là external dependency. |
| NFR-X-02c | **CÓ** | `src/modules/platform/map/index.ts:161-189` (projectToMapMarkers cho Incident, Inspection) <br> `src/components/map/MapWorkspace.tsx:791-838` (render marker + polygon) <br> `src/modules/mobile-readonly/layers.ts:37-38` (HOTSPOT map sang Incident) | `tests/map/map-smoke.test.ts` — 4/4 passed locally (non-DB). | Marker/polygon dùng chung projection từ Incident, Inspection, LandParcel. HOTSPOT map sang Incident. |

---

## NFR-X-03 — Mobile-first cho hiện trường: PS-005, 008, 009 cần app mobile ổn định, tối ưu thao tác nhanh

| ID con | Trạng thái | Bằng chứng code (file:line) | Test / kết quả | Ghi chú |
|---|---|---|---|---|
| NFR-X-03a | **MỘT PHẦN** | `src/modules/mobile-readonly/contracts.ts` (MobileActor, MobileListQuery, AlarmReadItem, DispatchReadItem, TaskReadItem) <br> `src/modules/mobile-readonly/forces.ts` (listAlarms, listDispatches, listTasks, listTasksByDispatchId) | `tests/mobile-readonly/alarm-dispatch-contract.test.ts` — **CHƯA CHẠY** | Mobile-readonly API cho alarms, dispatches, tasks. **Thiếu**: write flow (ADR-0005 cho phép mobile write cho PS-004/007, nhưng code hiện chỉ read-only). |
| NFR-X-03b | **MỘT PHẦN** | `src/modules/platform/evidence/evidence-service.ts` (createEvidence: latitude, longitude, capturedAt) <br> `src/modules/platform/geo/index.ts:12-20` (createGeoPoint) | `tests/platform/evidence.integration.test.ts:22-41` — **CHƯA CHẠY** | GPS capture cho evidence. **Thiếu**: mobile write flow ghi activity/verification với GPS tự động (PS-005, 008, 009). |
| NFR-X-03c | **MƠ HỒ** | `src/modules/platform/field-sync/index.ts` (OfflineCommand queue) | **CHƯA CHẠY** | Offline sync framework có. **MƠ HỒ**: baseline NFR-008-05 `[BỔ SUNG]` "cần xác nhận". Không rõ mobile write có dùng framework này không. |

---

## NFR-X-04 — Báo cáo tự động lên CA huyện: PS-002, 004, 005(gián tiếp), 006, 010 dùng chung 1 engine

| ID con | Trạng thái | Bằng chứng code (file:line) | Test (CHƯA CHẠY) | Ghi chú |
|---|---|---|---|---|
| NFR-X-04a | **MỘT PHẦN** | `src/modules/residents/commands.ts:400-500` (generateMonthlyReport → sendReport) <br> `src/modules/inspections/commands.ts:450-520` (inspectionStats) <br> `src/modules/vehicles/projection.ts` (listObservations, listRegistry) | **CHƯA CHẠY** | Có report resident (monthly), inspection (stats), vehicle (projection). **Thiếu**: chung 1 engine tổng hợp báo cáo (hiện tách biệt per module). |
| NFR-X-04b | **MƠ HỒ** | `src/modules/residents/commands.ts:450-500` (sendReport có sendTargetId) | **CHƯA CHẠY** | sendReport có sendTargetId. **Thiếu**: "CA huyện" cấu hình được (Gap 2: đã bỏ cấp huyện, đơn vị cấp trên phải cấu hình được). |

---

## NFR-X-05 — Audit log: mọi thao tác trên dữ liệu nhạy cảm (PS-003, 004, 005) có nhật ký truy cập

| ID con | Trạng thái | Bằng chứng code (file:line) | Test (CHƯA CHẠY) | Ghi chú |
|---|---|---|---|---|
| NFR-X-05a | **CÓ** | `src/modules/identity/audit.ts:24-77` (recordAudit) <br> `src/modules/incidents/commands.ts` (intake.created, intake.verified, intake.sensitive_reveal, intake.read, incident.read, incident.sensitive_read) <br> `src/modules/residents/commands.ts` (Subject/Record/Activity/Report mutations) <br> `src/modules/residents/projection.ts` (subject.sensitive_read, subject_record.read) | `tests/incidents/intake-report-separation.postgres.test.ts` — 17/17 (2026-10-27; actual IntakeReport GET reveal/masking/audit, previously recorded) <br> `tests/incidents/incident-authorization.postgres.test.ts` — 12/12 (2026-10-27; actual Incident GET plus sensitive-read audit) <br> `tests/residents/resident-workflow.postgres.test.ts` — 11/11 (2026-10-27; actual subject/management-record GET audit, previously recorded) | Audit log for IntakeReport, Incident sensitive reveal, and Resident detail reads is evidenced at these exact routes/fixtures; not a claim that every endpoint/path has been exercised. |
| NFR-X-05b | **CÓ** | `src/modules/inspections/commands.ts` (recordAudit cho Establishment, Inspection, Finding, Recommendation) <br> `src/modules/vehicles/commands.ts` (recordAudit cho Observation, Verification, Escalation) | **CHƯA CHẠY** | Audit log cho Inspections và Vehicles. |

**Ngoài phạm vi NFR-X-05 (D-81):** `inspection.stats.read` được giữ như audit truy cập phục vụ trách nhiệm giải trình cho thống kê Inspection tổng hợp đã được phân quyền; đây không phải yêu cầu nhạy cảm NFR-X-05, nghĩa vụ pháp lý hay chứng nhận.

---

## Mục 5 — Phụ thuộc Camera/LPR (NFR-CAM-01..04)

| ID | Trạng thái | Bằng chứng code (file:line) | Test / kết quả | Ghi chú |
|---|---|---|---|---|
| NFR-CAM-01 (Adapter pattern) | **MỘT PHẦN** | `src/modules/vehicles/mock-camera-adapter.ts` (MOCK_CAMERA_FIXTURES, createMockCameraAdapter) | `tests/vehicles/vehicle-watch-slices-8-9.test.ts` — 5/5 passed locally for the vehicle mock adapter contract (non-DB). | Có mock adapter interface. **Thiếu**: interface chung `CameraDataSource` cho PS-001/003/009 (hiện chỉ vehicle mock). |
| NFR-CAM-02 (Mock data) | **CÓ** | `src/modules/vehicles/mock-camera-adapter.ts:1-30` (MOCK_CAMERA_FIXTURES 3 observation) | `tests/vehicles/vehicle-watch-slices-8-9.test.ts` — 5/5 passed locally, including deterministic three-observation fixtures (non-DB). | Có mock data 3 observation in-memory. |
| NFR-CAM-03 (Fallback nhập tay) | **CÓ** | `src/modules/vehicles/contracts.ts:5-14` (VehicleObservationInput: plate, observedAt, lat, lng) <br> `src/modules/vehicles/commands.ts:39-55` (recordVehicleObservation validate lat/lng) | `tests/vehicles/vehicle-watch-slices-8-9.test.ts` — 5/5 passed locally for `manualInputAvailable` when the adapter is unavailable; this does not exercise persisted manual entry. | recordVehicleObservation cho phép nhập tay biển số, lat, lng. Không bắt buộc camera. |
| NFR-CAM-04 (Phân kỳ Phase 2) | **PHASE 2** | `src/modules/vehicles/mock-camera-adapter.ts` (vehicle mock) <br> `src/components/map/MapWorkspace.tsx:1173-1196` (Phase 1 Camera unavailable UI only) <br> `docs/reset/requirements-baseline.md` mục 5: camera data-source dependencies → Phase 2 | `tests/uiux-alignment/map-safe-states.test.tsx` — 18/18 passed locally for the Camera fallback contract; no source integration tested. | Camera fallback UI is implemented; no CameraDataSource, real camera/LPR data, or mock camera layer was added to the map. Camera-dependent integrations remain Phase 2. |

---

## Hard-code / cấu hình cần lưu ý (cross-cutting)

| Vị trí | Giá trị | Mô tả |
|---|---|---|
| `src/modules/platform/map/index.ts:7` | CADN_BOUNDS = [105.93, 20.91, 106.03, 20.99] | Bbox hardcode cho CADN. |
| `src/modules/platform/map/index.ts:52-60` | MAP_VIEWER_ROLES = [commander, superior_commander, duty_officer, field_officer, office_officer, village_officer, superior_officer] | Role được xem map hardcode. |
| `src/modules/vehicles/domain.ts:48-51` | VEHICLE_ESCALATION_SLA = 2h | Escalation SLA hardcode 2h. |
| `src/modules/incidents/domain.ts:135-146` | INTAKE_SLA recording=24h, verification=48h, result=20d | Intake SLA hardcode. |
| `src/modules/residents/contracts.ts:42-49` | SLA: reintegration checkup=30d, foreign same_day=1d, registration=24h | Resident SLA hardcode theo purpose. |
| `src/modules/inspections/commands.ts:80-130` | cadenceMonths default = 6 | Inspection cadence default 6 tháng. |
| `src/modules/vehicles/domain.ts:53-57` | VEHICLE_REGISTRY_STATUSES = [active, expired, revoked] | Registry status hardcode. |
| `src/modules/incidents/domain.ts:43-50` | Incident transitions: received→classified→verifying→transferred→resolved→closed | Incident state machine hardcode. |
| `src/modules/incidents/domain.ts:98-113` | Intake transitions: RECEIVED→VERIFIED→PROCESSED→CLOSED/REJECTED | Intake state machine hardcode. |

---

## Cross-cutting decision status

- **D-47 — CLOSED by D-76 (2026-10-24):** no VietGeoX/VBDLIS integration without an access/license agreement. The demo reuses the configured map/tile provider and attribution; that provider is not a source of authoritative LandParcel geometry.
- **D-48 — CLOSED by D-22/D-65 (2026-10-24):** internal offline writes are limited to the approved E1-004 and E1-007 allowlists. E1-005 mutations/authority actions remain online-only; E1-008 and E1-009 mobile work is outside current scope.
- **D-49 — CLOSED by D-76 (2026-10-24):** keep reports per domain; no shared report engine/aggregation service is required or authorized by this work item.
- **D-50/D-51 — OUT OF SCOPE by D-65:** Camera/LPR interface and Phase 2 schedule remain unresolved for a future explicitly authorized scope; they do not block current acceptance.
