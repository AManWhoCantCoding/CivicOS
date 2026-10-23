# Audit PS-E1-003 — Quản lý Đối tượng cần Quản lý (Persons of Interest) — T1, Must Have

Nguồn yêu cầu: `docs/reset/requirements-baseline.md` (mục PS-E1-003).
Chỉ dùng code (`src/**`) và test (`tests/**`) làm bằng chứng. Không dùng design/SOW.
Trạng thái: **CÓ** = đầy đủ; **MỘT PHẦN** = một phần; **KHÔNG** = chưa có; **LỆCH** = khác ý nghĩa; **MƠ HỒ** = chưa rõ ai quyết; **PHASE 2** = baseline đưa vào Phase 2.

---

## Bảng kiểm tra từng yêu cầu

| ID | Trạng thái | Bằng chứng code (file:line) | Test (tên test; CHƯA CHẠY) | Ghi chú |
|---|---|---|---|---|
| FR-003-01 | **CÓ** | `src/modules/residents/contracts.ts:3-4` (ResidentSubjectType = temporary_resident\|foreign_resident\|reintegration) <br> `src/modules/residents/commands.ts:18-40` (registerSubject: referenceCode, partyType, displayName, identityNumber) <br> `src/modules/residents/commands.ts:72-105` (createManagementRecord: subjectId, purpose, riskLevel, assignedOrganizationId) | `tests/residents/identity-residents-seed.postgres.test.ts` (seed subject) — **CHƯA CHẠY** | Tạo hồ sơ Subject + ManagementRecord. Subject có subjectType (3 loại). ManagementRecord có purpose, riskLevel, assignedOrganizationId. |
| FR-003-02 | **MỘT PHẦN** | `src/modules/platform/evidence/evidence-service.ts` (createEvidence, uploadEvidence) <br> `src/modules/residents/commands.ts` (không có command upload tài liệu riêng cho Subject) | **KHÔNG CÓ TEST** upload tài liệu cho Subject | Có platform evidence module chung. Chưa có command upload "quyết định mãn hạn tù, cam kết tái hòa nhập" gắn với Subject/ManagementRecord. |
| FR-003-03 | **LỆCH** | `src/modules/residents/contracts.ts:42-49` (slaRuleForPurpose: checkup=30d cho reintegration, same_day=1d cho foreign_resident, registration=24h) <br> `src/modules/residents/commands.ts:239` (createSla với rule từ slaRuleForPurpose) | `tests/residents/resident-workflow.postgres.test.ts` (SLA checkup) — **CHƯA CHẠY** | Hardcode: reintegration checkup = 30 ngày, foreign same_day = 1 ngày, registration = 24h. Baseline yêu cầu "cấu hình được theo mức độ nguy cơ (tuần/2 tuần/tháng)" — code chỉ phân biệt theo purpose, không theo riskLevel. |
| FR-003-04 | **KHÔNG** | **KHÔNG CÓ BẰNG CHỨNG** | **KHÔNG CÓ TEST** | Không có cấu hình cảnh báo "nhắc sau 3 ngày, cảnh báo sau 7 ngày". SLA hiện chỉ có dueAt, không có warning threshold riêng cho no-show. |
| FR-003-05 | **CÓ** | `src/modules/residents/commands.ts:260-320` (recordActivity: activityType, occurredAt, content, evaluation, latitude, longitude, evidenceIds, idempotencyKey) <br> `src/modules/residents/commands.ts:239` (gán SLA checkup) | `tests/residents/resident-workflow.postgres.test.ts` (record activity) — **CHƯA CHẠY** | Ghi nhật ký hoạt động (checkup, visit, etc.) với GPS, evidence, evaluation. Có idempotencyKey. |
| FR-003-06 | **PHASE 2** | `src/modules/vehicles/mock-camera-adapter.ts` (MOCK_CAMERA_FIXTURES) | **KHÔNG CÓ TEST** LPR integration | Baseline mục 5: PS-003 FR-003-06 đưa vào Phase 2. Code chỉ có mock camera adapter cho vehicle, không tích hợp LPR cho Subject. |
| FR-003-07 | **KHÔNG** | **KHÔNG CÓ BẰNG CHỨNG** | **KHÔNG CÓ TEST** | Không có tự động liên kết Subject với vụ việc mới (cần cross-reference). |
| FR-003-08 | **MỘT PHẦN** | `src/modules/residents/commands.ts:400-500` (generateMonthlyReport, approveReport, sendReport) <br> `src/modules/residents/commands.ts:400-450` (aggregateCounts, snapshotPayload, snapshotHash) | `tests/residents/resident-workflow.postgres.test.ts` (monthly report) — **CHƯA CHẠY** | Có báo cáo tháng (ResidentMonthlyReport) với snapshot, approve, send. **Thiếu**: tự động tổng hợp từ SubjectManagementRecord theo tháng. |
| NFR-003-01 | **CÓ** | `src/modules/residents/contracts.ts:63-66` (maskDisplayName: chỉ hiện chữ cái đầu + ***) <br> `src/modules/identity/encryption.ts:18-46` (encryptSensitive/decryptSensitive AES-256-GCM) <br> `src/modules/identity/authorization.ts:194-205` (read_sensitive gate cho LandParty, tương tự cho Subject) | `tests/residents/resident-contracts.test.ts` (maskDisplayName) — **CHƯA CHẠY** | Mã hóa AES-256-GCM cho sensitive fields. Mask display name. Phân quyền qua Assignment + policy read_sensitive. |
| NFR-003-02 | **CÓ** | `src/modules/identity/audit.ts:24-77` (recordAudit cho mọi operation) <br> `src/modules/residents/commands.ts` (gọi recordAudit cho createSubject, createRecord, recordActivity, generateReport) | `tests/residents/resident-contracts.test.ts` (audit log) — **CHƯA CHẠY** | Audit log đầy đủ cho mọi thao tác trên Subject/Record/Activity/Report. |
| NFR-003-03 | **KHÔNG** | **KHÔNG CÓ BẰNG CHỨNG** | **KHÔNG CÓ TEST** | Không có gửi nhắc qua app + SMS trước 1 ngày. Chỉ có SLA dueAt. |
| NFR-003-04 | **MỘT PHẦN** | `src/modules/platform/sla/index.ts:90-129` (markOverdue emit SlaOverdue event) <br> `src/modules/platform/notifications/index.ts:64-86` (SlaOverdue consumer → in-app notification) | **KHÔNG CÓ TEST** cảnh báo quá hạn trình diện > 3 ngày | Có SLA overdue detection chung. **Thiếu**: cảnh báo riêng "quá hạn trình diện > 3 ngày" (khác SLA checkup 30 ngày). |

---

## Trích nguyên văn code (≤15 dòng) tại các vị trí hard-code trái ngược "cấu hình được"

### 1. `src/modules/residents/contracts.ts:42-49` — SLA hardcode theo purpose, không theo riskLevel

```ts
export function slaRuleForPurpose(
  purpose: ResidentSubjectType,
  kind: ResidentSlaKind,
): { kind: string; durationMs: number } {
  if (kind === 'checkup' && purpose === 'reintegration') {
    return { kind: 'resident_monthly_checkup', durationMs: 30 * DAY_MS };
  }
  if (kind === 'same_day' && purpose === 'foreign_resident') {
    return { kind: 'foreign_same_day_report', durationMs: DAY_MS };
  }
  return { kind: 'resident_registration_24h', durationMs: DAY_MS };
}
```

### 2. `src/modules/residents/contracts.ts:52-60` — nextCheckForPurpose dùng SLA hardcode

```ts
export function nextCheckForPurpose(
  purpose: ResidentSubjectType,
  from: Date,
): Date {
  const rule = slaRuleForPurpose(
    purpose,
    purpose === 'reintegration' ? 'checkup' : 'registration',
  );
  return new Date(from.getTime() + rule.durationMs);
}
```

---

## Chức năng ngoài yêu cầu — tối đa 10 dòng

| Nhóm | Chức năng | Vị trí code | Mô tả | Ghi chú / liên quan yêu cầu |
|---|---|---|---|---|
| (a) | Subject CRUD (registerSubject, listSubjects, getSubjectDetail) | `src/modules/residents/commands.ts:72-105, 107-130` | Tạo/đọc Subject với encryption identityNumber | FR-003-01 |
| (a) | ManagementRecord CRUD (createManagementRecord, listManagementRecords, getRecord) | `src/modules/residents/commands.ts:72-250` | Tạo/đọc Record theo purpose, riskLevel, assignedOrganizationId | FR-003-01 |
| (a) | Activity recording (recordActivity) | `src/modules/residents/commands.ts:260-320` | Ghi checkup/visit với GPS, evidence, evaluation, idempotency | FR-003-05 |
| (a) | SLA integration (createSla, markOverdue) | `src/modules/platform/sla/index.ts` | Tự tạo SLA khi createRecord/recordActivity | FR-003-03, NFR-003-04 |
| (a) | MonthlyReport (generate, approve, send) | `src/modules/residents/commands.ts:400-500` | Báo cáo tháng với snapshot, hash, approve, send | FR-003-08 |
| (a) | Mask display name | `src/modules/residents/contracts.ts:63-66` | Chỉ hiện chữ cái đầu + *** | NFR-003-01 |
| (a) | Audit log cho mọi operation | `src/modules/identity/audit.ts` + commands | Tự động recordAudit | NFR-003-02 |
| (a) | Platform evidence attachment | `src/modules/platform/evidence/evidence-service.ts` | Gắn evidence cho Subject/Record/Activity | FR-003-02 (hỗ trợ) |
| (b) | Mock camera adapter (vehicle LPR) | `src/modules/vehicles/mock-camera-adapter.ts` | Không liên quan Subject | PS-E1-003/009, mục 5 baseline |
| (b) | ResidentMonthlyReport snapshot hash | `src/modules/residents/commands.ts:430-450` | Immutable snapshot khi approve | Mở rộng so với baseline |

---

## Câu hỏi mở → thêm vào decision-log.md

- D-15 (PS-E1-003): "Cán bộ phụ trách tái hòa nhập" — role cụ thể nào (`field_officer`, `village_officer`, role mới)?
- D-16 (PS-E1-003): FR-003-03 "tần suất cấu hình theo mức độ nguy cơ (tuần/2 tuần/tháng)" — riskLevel hiện có trong ManagementRecord nhưng không dùng cho SLA. Cách cấu hình: config table, env, hay SLA kind?
- D-17 (PS-E1-003): "phân loại (hình sự/ma túy/TNXH)" — danh sách này có mở rộng được không?
- D-18 (PS-E1-003): "CA huyện" trong FR-003-01, FR-003-08 — xem Gap 2 (cấu hình được đơn vị cấp trên).