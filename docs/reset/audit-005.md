# Audit PS-E1-005 — Ghi nhận và Theo dõi Tố giác Tội phạm từ Dân

Nguồn yêu cầu: `docs/reset/requirements-baseline.md` (mục PS-E1-005).
Chỉ dùng code (`src/**`) và test (`tests/**`) làm bằng chứng. Không dùng design/SOW.
Trạng thái: **CÓ** = đầy đủ; **MỘT PHẦN** = một phần; **KHÔNG** = chưa có; **LỆCH** = khác ý nghĩa; **MƠ HỒ** = chưa rõ ai quyết.

---

## Bảng kiểm tra từng yêu cầu

| ID | Trạng thái | Bằng chứng code (file:line) | Test (tên test; CHƯA CHẠY) | Ghi chú |
|---|---|---|---|---|
| FR-005-01 | **CÓ** | `src/modules/incidents/contracts.ts:14-19` (IntakeSourceChannel = direct\|phone\|app\|district_transfer; IntakeLegacyChannel = in_person\|telephone) <br> `src/modules/incidents/domain.ts:74-82` (normalizeSourceChannel mapping legacy→canonical) <br> `src/modules/incidents/commands.ts:488-490` (registerIntakeReport normalizes channel) | `tests/incidents/intake-report-separation.postgres.test.ts:403-413` "maps legacy channel input at the boundary without persisting legacy values" — **CHƯA CHẠY** | Hỗ trợ 4 kênh chuẩn + 2 legacy; legacy không lưu vào DB. |
| FR-005-02 | **MƠ HỒ** | `src/modules/incidents/commands.ts:525-539` (encryptSensitive cho sourceName, sourceContact, sensitiveRef) <br> `src/modules/incidents/commands.ts:754-801` (maskIntakeReport) <br> `src/modules/incidents/commands.ts:828-845` (canRevealIntakeRow: commander cùng đơn vị và policy `read_sensitive`) <br> `src/modules/identity/encryption.ts:18-46` (AES-256-GCM) | `tests/incidents/intake-report-separation.postgres.test.ts:834-898` (kiểm tra masking/reveal theo grant và audit) — **CHƯA CHẠY** | Mã hóa, che danh tính và gate kỹ thuật đã có. Chưa thể kết luận phù hợp yêu cầu “chỉ Trưởng CA xã” vì D-01 (role tương ứng) và D-04 (có cần grant/Assignment hay không) vẫn chưa được trả lời; không tự chốt quy tắc nghiệp vụ. |
| FR-005-03 | **CÓ** | `src/modules/incidents/contracts.ts:21` (IntakeClassification = sufficient\|needs_verification) <br> `src/modules/incidents/commands.ts:858-925` (verifyIntakeReport bắt buộc classification) <br> `src/modules/incidents/commands.ts:864-868` (validate enum) | `tests/incidents/intake-report-separation.postgres.test.ts:476-479` (verifyIntakeReport với classification) — **CHƯA CHẠY** | Phân loại 2 giá trị chuẩn; validate ở command. |
| FR-005-04 | **MỘT PHẦN** | `src/modules/incidents/contracts.ts:50-54` (IntakeVerifyInput) <br> `src/modules/incidents/commands.ts:858-880` (verifyIntakeReport chỉ cho duty_officer/commander) <br> `src/modules/incidents/commands.ts:1781-1788` (startVerification cho field_officer nhưng nhận incidentId và cập nhật Incident) | `tests/incidents/intake-report-separation.postgres.test.ts:471-479` (xác minh IntakeReport bằng duty_officer) — **CHƯA CHẠY** | Có lưu kết quả ở IntakeReport và có xác minh Incident cho field_officer; hai luồng khác entity/phạm vi. Chưa có bằng chứng field_officer trên Mobile ghi kết quả xác minh ban đầu trực tiếp vào IntakeReport. |
| FR-005-05 | **LỆCH** | `src/modules/incidents/contracts.ts:69-72` (IntakeTransferInput: organizationId, reason) <br> `src/modules/incidents/commands.ts:1371-1481` (transferIntakeReport tạo approval, yêu cầu commander/superior_commander) <br> `src/modules/incidents/commands.ts:1378-1389` (validate receiving org level === 'district') <br> `src/modules/incidents/commands.ts:1415-1481` (approveIntakeTransfer bởi approver độc lập) | `tests/incidents/intake-report-separation.postgres.test.ts:790-832` "keeps transfer pending until an independent approver decides" — **CHƯA CHẠY** | Code hard-code `receiving.level !== 'district'` (line 1384). Baseline Gap 2: tổ chức bỏ cấp huyện từ 01/3/2025, đơn vị cấp trên phải **cấu hình được** (province/district tuỳ địa phương). Xung đột Gap 2 → **D-02**. |
| FR-005-06 | **CÓ** | `src/modules/incidents/domain.ts:98-113` (IntakeReportStatus transitions: RECEIVED→VERIFIED→PROCESSED→CLOSED\|REJECTED) <br> `src/modules/incidents/commands.ts:927-1199` (confirmIntakeReport, processIntakeReport, rejectIntakeReport, closeIntakeReport) <br> `src/modules/incidents/projection.ts:151-227` (intake projection đọc status từ event) | `tests/incidents/intake-report-separation.postgres.test.ts:766-788` "rejects invalid lifecycle moves with stable error codes" — **CHƯA CHẠY** | State machine đầy đủ; projection real-time từ event. |
| FR-005-07 | **MƠ HỒ** | `src/modules/incidents/commands.ts:482-524` (`createdById: actor.id`, actor có role duty_officer/commander) <br> `src/modules/incidents/commands.ts:1139-1191` (closeIntakeReport gửi in-app notification tới `report.createdById`) <br> `src/modules/incidents/notification-adapter.ts:13-28` (adapter kết quả là mock) | **KHÔNG CÓ TEST** chứng minh thông báo đến người tố giác | `createdById` là tài khoản cán bộ tạo IntakeReport, không phải bằng chứng về danh tính người tố giác. Luồng đóng hiện gửi in-app cho tài khoản đó; người nhận/kênh theo yêu cầu vẫn chưa rõ (**D-03**). |
| NFR-005-01 | **CÓ** | `src/modules/incidents/domain.ts:135-137` (INTAKE_SLA.recording = 24h) <br> `src/modules/incidents/commands.ts:573-585` (createSla recording khi registerIntakeReport) | `tests/incidents/intake-report-separation.postgres.test.ts:319-341` (SLA recording dueAt = receivedAt + 24h) — **CHƯA CHẠY** | SLA 24h tự tạo khi ghi nhận. |
| NFR-005-02 | **MƠ HỒ** | Giống FR-005-02: `encryptSensitive`, `maskIntakeReport`, `canRevealIntakeRow` (gate `read_sensitive`) | Giống FR-005-02 — **CHƯA CHẠY** | Biện pháp kỹ thuật bảo vệ dữ liệu có; mức phân quyền có phù hợp yêu cầu nghiệp vụ hay không phụ thuộc D-01 và D-04, hiện vẫn chưa được quyết định. |
| NFR-005-03 | **CÓ** | `src/modules/incidents/domain.ts:139-141` (INTAKE_SLA.verification = 48h) <br> `src/modules/incidents/commands.ts:586-598` (createSla verification khi registerIntakeReport) | `tests/incidents/intake-report-separation.postgres.test.ts:319-341` (SLA verification dueAt = receivedAt + 48h) — **CHƯA CHẠY** | SLA 48h tự tạo khi ghi nhận. |
| NFR-005-04 | **MƠ HỒ** | `src/modules/incidents/domain.ts:143-146` (INTAKE_SLA.result = 20 ngày) <br> `src/modules/incidents/commands.ts:599-611` (tạo SLA kết quả) <br> `src/modules/incidents/commands.ts:1180-1191` (in-app notification tới `report.createdById`) <br> `src/modules/incidents/notification-adapter.ts:1-28` (mock adapter) | **KHÔNG CÓ TEST** chứng minh thông báo tới người tố giác trong 20 ngày | SLA 20 ngày tồn tại; notification hiện nhắm tới tài khoản tạo bản ghi, không chứng minh người nhận là người tố giác hoặc kết quả được gửi trong hạn. Kênh/đích nhận vẫn phụ thuộc D-03. |
| NFR-005-05 | **MỘT PHẦN** | `src/modules/incidents/commands.ts:704-743` (intakeSlaSummary tính overdue/warning) <br> `src/modules/platform/sla/index.ts:90-129` (markOverdue xử lý SLA quá hạn, emit SlaOverdue event) <br> `src/modules/platform/notifications/index.ts:64-86` (SlaOverdue consumer tạo in-app notification) | **KHÔNG CÓ TEST** chuyên biệt cho cảnh báo intake quá hạn chưa verify/transfer | Cơ chế SLA overdue + notification chung có; chưa có test/intake-specific query cho "chưa phân loại/chuyển tiếp". |

> **Lưu ý test**: Các test được dẫn trong bảng đều ghi **CHƯA CHẠY** trong lượt này. Trạng thái chỉ phản ánh chưa có kết quả thực thi; không kết luận nguyên nhân là Docker, shell hay điều kiện môi trường nào khác.

---

## Trích nguyên văn code (≤15 dòng) tại các vị trí yêu cầu

### 1. `src/modules/incidents/commands.ts:1371-1389` — transferIntakeReport, kiểm tra `level === 'district'`

```ts
export async function transferIntakeReport(
  reportId: string,
  actor: IncidentActor,
  input: IntakeTransferInput,
) {
  requireRole(actor, 'commander', 'superior_commander');
  if (!input.organizationId.trim()) throw new Error('ORGANIZATION_REQUIRED');
  const receiving = await prisma.organizationUnit.findUnique({
    where: { id: input.organizationId },
  });
  if (!receiving || !receiving.active) {
    throw new Error('RECEIVING_ORGANIZATION_INVALID');
  }
  if (receiving.level !== 'district') {
    throw new Error('RECEIVING_ORGANIZATION_INVALID');
  }
  if (actor.organizationUnitId && receiving.id === actor.organizationUnitId) {
    throw new Error('RECEIVING_ORGANIZATION_INVALID');
  }
```

### 2. `src/modules/incidents/commands.ts:1180-1191` — closeIntakeReport, `createdById` là ai

```ts
    await createInAppNotification(
      {
        userId: report.createdById,
        type: 'intake_result',
        title: 'Kết quả xử lý tin báo',
        body: `IntakeReport ${reportId.slice(0, 8)} đã kết thúc xử lý.`,
        resourceType: 'IntakeReport',
        resourceId: reportId,
        sourceEventId: closedEvent.eventId,
      },
      tx,
    );
```
> `report.createdById` được gán tại `src/modules/incidents/commands.ts:523` (`createdById: actor.id`) — tức là **cán bộ trực ban (duty_officer/commander) người ghi nhận tin báo**, **không phải người tố giác**. Người tố giác không có tài khoản hệ thống (xem Actor table: "Người dân — Không truy cập hệ thống").

### 3. `src/modules/incidents/commands.ts:828-845` — canRevealIntakeRow

```ts
/** Reveal iff the shared policy seam grants read_sensitive, fail-closed. */
async function canRevealIntakeRow(
  row: { id: string; organizationId: string | null },
  actor: IncidentActor,
): Promise<boolean> {
  if (!actor.roles.includes('commander')) return false;
  if (!row.organizationId || actor.organizationUnitId !== row.organizationId) {
    return false;
  }
  try {
    return await canViewSensitive(actor, {
      resourceType: 'IntakeReport',
      resourceId: row.id,
      ...(row.organizationId ? { organizationId: row.organizationId } : {}),
    });
  } catch {
    return false;
  }
}
```

---

## Chức năng ngoài yêu cầu — tối đa 10 dòng

| Nhóm | Chức năng | Vị trí code | Mô tả | Ghi chú / liên quan yêu cầu |
|---|---|---|---|---|
| (a) | IntakeReport idempotency key & command deduplication | `src/modules/incidents/commands.ts:503-513` (register), `src/modules/incidents/commands.ts:931-1027` (confirm), `src/modules/incidents/commands.ts:1201-1369` (convert) | Dedupe register/confirm/convert bằng idempotencyKey + IntakeCommand table | NFR-005-01, FR-005-01 |
| (a) | IntakeCommand table (audit command history) | `prisma/schema.prisma:270-280` (model) <br> `src/modules/incidents/commands.ts:938-948, 999-1008, 1213-1224, 1356-1366` | Lưu lịch sử command confirm/convert với response để replay idempotent | FR-005-01, FR-005-03, FR-005-05 |
| (a) | Generic platform evidence linked to IntakeReport | `src/modules/platform/evidence/evidence-service.ts:10-30, 32-80` (generic resourceType/resourceId) <br> `src/modules/incidents/commands.ts:1555-1585` (detail query trả evidence) <br> `tests/incidents/intake-report-separation.postgres.test.ts:529-560` (test gắn evidence qua createEvidence và xác nhận linkage) | Có thể liên kết evidence với IntakeReport qua platform evidence service chung; test không chứng minh có command attachment chuyên biệt | FR-005-04 |
| (a) | IntakeReport listing with SLA filter | `src/modules/incidents/commands.ts:1483-1532` (listIntakeReports: filter status, sourceChannel, sla overdue/warning) | API list intake có filter SLA overdue/warning | NFR-005-05, FR-005-06 |
| (a) | IntakeReport full detail (events, approvals, evidence, audits, SLAs) | `src/modules/incidents/commands.ts:1534-1585` (getIntakeReport trả về đầy đủ) | Detail view bao gồm timeline event, approval history, evidence, audit log, SLA | FR-005-06 |
| (a) | Cross-unit intake read denial | `src/modules/incidents/commands.ts:804-825` (assertIntakeReadScope: organizationId match) <br> `tests/incidents/intake-report-separation.postgres.test.ts:900-905` | Chỉ đọc intake trong cùng OrganizationUnit | NFR-X-01, NFR-005-02 |
| (a) | SLA warning threshold (6h trước hạn) | `src/modules/incidents/commands.ts:722-735` (warningMs = 6h) | intakeSlaSummary tính warning khi còn ≤ 6h trước dueAt | NFR-005-05 |
| (a) | Platform SLA markOverdue job | `src/modules/platform/sla/index.ts:90-129` (markOverdue cron-like) | Worker định kỳ kiểm tra SLA overdue, emit SlaOverdue event | NFR-005-05 |
| (a) | Platform notification consumer (SlaOverdue) | `src/modules/platform/notifications/index.ts:64-86` | SlaOverdue consumer tạo in-app notification | NFR-005-04, NFR-005-05 |
| (b) | Direct Incident creation (bỏ qua IntakeReport) | `src/modules/incidents/commands.ts:1588-1661` (`registerIncident`) | Tạo Incident trực tiếp không qua IntakeReport; dùng cho vụ việc nội bộ | FR-005-01 chỉ nói IntakeReport |
| (b) | Incident classification/category/severity | `src/modules/incidents/contracts.ts:3-9` (IncidentStatus) <br> `src/modules/incidents/commands.ts:1663-1716` (classifyIncident) | Phân loại Incident (category, severity) sau khi convert | Scope mở rộng sau convert |
| (b) | Incident assignment (task incident_verification) | `src/modules/incidents/commands.ts:1718-1779` (assignIncident) | Gán Incident cho field_officer để xác minh | Cơ chế chung identity |
| (b) | Incident state machine (received→classified→verifying→transferred→resolved→closed) | `src/modules/incidents/domain.ts:43-50` (allowedTransitions) <br> `src/modules/incidents/commands.ts:171-186` (updateIncidentStatus) <br> `src/modules/incidents/commands.ts:358-480` (approveIncident/rejectIncidentApproval) | Luồng xử lý Incident sau convert với approval | Mở rộng so với IntakeReport lifecycle |
| (b) | Incident transfer approval (commander/superior_commander, cross-unit) | `src/modules/incidents/commands.ts:287-356` (assertApprovalDecisionScope, canReadTransferredIncident) | Phê duyệt chuyển Incident lên đơn vị cấp trên | FR-005-05 chỉ nói chuyển hồ sơ |
| (b) | Mock camera adapter (vehicle) | `src/modules/vehicles/mock-camera-adapter.ts:1-54` | Giả lập LPR cho vehicle — không liên quan intake | PS-E1-003/009 |
