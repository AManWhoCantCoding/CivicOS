# Audit PS-E1-007 — Quản lý Cơ sở Kinh doanh Có Điều kiện — T1, Must Have

Nguồn yêu cầu: `docs/reset/requirements-baseline.md` (mục PS-E1-007).
Chỉ dùng code (`src/**`) và test (`tests/**`) làm bằng chứng. Không dùng design/SOW.
Trạng thái: **CÓ** = đầy đủ; **MỘT PHẦN** = một phần; **KHÔNG** = chưa có; **LỆCH** = khác ý nghĩa; **MƠ HỒ** = chưa rõ ai quyết; **PHASE 2** = baseline đưa vào Phase 2.

---

## Bảng kiểm tra từng yêu cầu

| ID | Trạng thái | Bằng chứng code (file:line) | Test (tên test; CHƯA CHẠY) | Ghi chú |
|---|---|---|---|---|
| FR-007-01 | **CÓ** | `src/modules/inspections/contracts.ts:57-67` (EstablishmentInput: name, ownerName, address, type, licenseRef, latitude, longitude, risk, status) <br> `src/modules/inspections/commands.ts:18-55` (registerEstablishment) <br> `src/modules/inspections/commands.ts:180-220` (updateEstablishment) | `tests/inspections/inspection-stats.postgres.test.ts` — **CHƯA CHẠY** | Lập danh mục cơ sở KDCĐK với đầy đủ field yêu cầu. Có risk (low/medium/high), status (active/archived). |
| FR-007-02 | **CÓ** | `src/modules/inspections/commands.ts:80-130` (scheduleInspection: cadenceMonths mặc định 6) <br> `src/modules/inspections/projection.ts:150-158` (inspectionEventTypes bao gồm InspectionScheduled) | `tests/inspections/inspections-seed.postgres.test.ts` — **CHƯA CHẠY** | Lập lịch kiểm tra định kỳ 6 tháng/lần (cadenceMonths=6). Có scheduledAt. |
| FR-007-03 | **CÓ** | `src/modules/inspections/contracts.ts:63-68` (ChecklistItem: key, label, required, evidenceRequired) <br> `src/modules/inspections/commands.ts:132-180` (saveChecklistResponses) <br> `src/modules/inspections/domain.ts:88-126` (assertChecklistComplete, assertChecklistEvidence) | `tests/inspections/inspections-seed.postgres.test.ts` — **CHƯA CHẠY** | Checklist chuẩn hóa: ChecklistItem có key, label, required, evidenceRequired. assertChecklistComplete validate required items. assertChecklistEvidence validate evidence cho items yêu cầu. |
| FR-007-04 | **CÓ** | `src/modules/inspections/commands.ts:132-180` (saveChecklistResponses: ChecklistResponse[], ChecklistFindingEvidence[]) <br> `src/modules/inspections/commands.ts:220-280` (recordFinding: description, result, severity, category, evidenceIds) <br> `src/modules/platform/evidence/evidence-service.ts` (createEvidence) | `tests/inspections/inspections-seed.postgres.test.ts` — **CHƯA CHẠY** | Ghi nhận kết quả: checklist responses + finding với evidenceIds. Evidence gắn GPS qua platform evidence (latitude, longitude). |
| FR-007-05 | **MỘT PHẦN** | `src/modules/inspections/contracts.ts:4` (InspectionResult: pass\|reminder\|needs_action) <br> `src/components/inspections/ChecklistForm.tsx:24-28` (nhãn UI: Đạt/Nhắc nhở/Cần xử lý) <br> `src/modules/inspections/commands.ts:647-654, 685-705` (validate kết quả; needs_action cần recommendation) | `tests/inspections/inspection-slices-4-6.postgres.test.ts:991-996` (từ chối result `sanction`) — **CHƯA CHẠY** | Baseline yêu cầu “Đạt / Nhắc nhở / Xử phạt”; code/UI dùng `needs_action` / “Cần xử lý”. Chưa có bằng chứng hai khái niệm này tương đương; luồng recommendation riêng không tự chứng minh đã xử phạt. |
| FR-007-06 | **CÓ** | `src/modules/inspections/commands.ts:380-450` (submitRecommendation, approveRecommendation, rejectRecommendation, transferRecommendation) <br> `src/modules/inspections/contracts.ts:25-26` (EnforcementRecommendationStatus = pending_approval\|approved\|rejected\|transferred) <br> `src/modules/inspections/commands.ts:400-450` (approveRecommendation yêu cầu commander, rejectRecommendation, transferRecommendation) | `tests/inspections/inspections-seed.postgres.test.ts` — **CHƯA CHẠY** | Biên bản vi phạm → EnforcementRecommendation. Luồng: submit → pending_approval → commander approve/reject/transfer. Không tự phát hành quyết định pháp lý. |
| FR-007-07 | **MỘT PHẦN** | `src/modules/inspections/projection.ts:442-546` (inspectionStats: kết quả và tỷ lệ theo loại, lọc from/to/type) <br> `src/app/api/inspections/stats/route.ts:6-18` (API endpoint) | `tests/inspections/inspection-stats.postgres.test.ts:189-249` (assert type rates, period/type filters and totals) — **CHƯA CHẠY** | Backend, endpoint và test assertion cho thống kê theo loại/kỳ đã có; không còn đúng nhận định thiếu API/test. Chưa thấy bằng chứng trang Web tiêu thụ endpoint để hiển thị cho cán bộ, nên giữ **MỘT PHẦN** thay vì suy ra API đồng nghĩa UI hoàn chỉnh. |
| NFR-007-01 | **MỘT PHẦN** | `src/modules/inspections/commands.ts:80-130` (scheduleInspection cadenceMonths=6) <br> `src/modules/inspections/projection.ts:150-158` (InspectionScheduled event) | **KHÔNG CÓ TEST** 100% cơ sở ≥ 2 lần/năm | Lịch định kỳ 6 tháng (2 lần/năm) tự tạo. **Thiếu**: mechanism đảm bảo 100% coverage (report missing inspections). |
| NFR-007-02 | **CÓ** | `src/modules/inspections/commands.ts:132-180` (saveChecklistResponses + ChecklistFindingEvidence) <br> `src/modules/platform/evidence/evidence-service.ts` (createEvidence: latitude, longitude, capturedAt, actorId, immutable) | `tests/inspections/inspections-seed.postgres.test.ts` — **CHƯA CHẠY** | Biên bản có checklist, finding, evidence ảnh + GPS (latitude, longitude, capturedAt, actorId). Evidence immutable. |
| NFR-007-03 | **MỘT PHẦN** | `src/modules/inspections/config.ts:7-10` (recommendation SLA 7 ngày) <br> `src/modules/inspections/commands.ts:992-1079` (submitRecommendation tạo SLA) <br> `src/modules/inspections/commands.ts:1112-1213` (luồng transfer) <br> `src/modules/inspections/commands.ts:1215-1307` (approve/reject hoàn tất SLA đang active/overdue) | `tests/inspections/inspection-slices-4-6.postgres.test.ts:1119-1162` (SLA completed sau reject; không assert dueAt 7 ngày/quá hạn) — **CHƯA CHẠY** | SLA 7 ngày đã được tạo; approve/reject đóng SLA, nhưng đường transfer không có thao tác hoàn tất SLA trong đoạn code này. Test hiện có không chứng minh mọi nhánh xử lý đúng hạn hoặc hành vi quá hạn, nên chưa đủ căn cứ nâng thành **CÓ**. |
| NFR-007-04 | **CÓ** | `src/modules/inspections/contracts.ts:63-68` (ChecklistItem: key, label, required, evidenceRequired) <br> `src/modules/inspections/commands.ts:132-180` (saveChecklistResponses) <br> `src/modules/inspections/domain.ts:88-126` (assertChecklistComplete/assertChecklistEvidence) | `tests/inspections/inspections-seed.postgres.test.ts` — **CHƯA CHẠY** | Checklist chuẩn hóa per loại hình: ChecklistItem template per establishmentType (versioned). assertChecklistComplete validate required. assertChecklistEvidence validate evidence cho items yêu cầu. |

---

## Trích nguyên văn code (≤15 dòng) — không có hard-code trái ngược "cấu hình được" rõ ràng

*Feature PS-E1-007 đã triển khai khá đầy đủ. Không thấy hard-code rõ ràng trái ngược "cấu hình được". Cadence 6 tháng là default có thể override qua input.*

### `src/modules/inspections/commands.ts:80-130` — cadenceMonths default 6 (có thể override)

```ts
export async function scheduleInspection(
  input: {
    establishmentId: string;
    templateId: string;
    scheduledAt: Date;
    cadenceMonths?: number;
    assignedUserId?: string;
  },
  actor: InspectionActor,
) {
  const cadence = input.cadenceMonths ?? 6;
  // ...
}
```

---

## Chức năng ngoài yêu cầu — tối đa 10 dòng

| Nhóm | Chức năng | Vị trí code | Mô tả | Ghi chú / liên quan yêu cầu |
|---|---|---|---|---|
| (a) | Establishment CRUD | `src/modules/inspections/commands.ts:18-220` | Tạo/đọc/sửa/cập nhật cơ sở KDCĐK | FR-007-01 |
| (a) | Inspection scheduling + cadence | `src/modules/inspections/commands.ts:80-130` | Lịch định kỳ cadenceMonths (default 6) | FR-007-02 |
| (a) | Checklist template versioning | `prisma/schema.prisma:340-350` (ChecklistTemplate) | Template per establishmentType + version | FR-007-03, NFR-007-04 |
| (a) | Checklist response + evidence | `src/modules/inspections/commands.ts:132-180` | Save responses + evidenceIds per finding | FR-007-04 |
| (a) | Finding recording | `src/modules/inspections/commands.ts:220-280` | Record finding với severity, category, evidenceIds | FR-007-04 |
| (a) | EnforcementRecommendation workflow | `src/modules/inspections/commands.ts:380-450` | Submit/approve/reject/transfer recommendation | FR-007-06 |
| (a) | Inspection stats aggregation | `src/modules/inspections/commands.ts:450-520` | Stats per type, pass/reminder/needs_action rates | FR-007-07 |
| (a) | Inspection recurrence (auto-schedule next) | `src/modules/inspections/commands.ts:340-380` | completeInspection tạo next scheduled inspection | FR-007-02 (recurrence) |
| (b) | Mock camera adapter | `src/modules/vehicles/mock-camera-adapter.ts` | Không liên quan inspection | PS-E1-003/009 |
| (b) | Direct Incident creation | `src/modules/incidents/commands.ts:1588-1661` | Không liên quan inspection | PS-E1-005 |

---

## Câu hỏi mở → thêm vào decision-log.md

- D-28 (PS-E1-007): "Phòng CSKT huyện" — role `superior_officer`/`superior_commander` hay role riêng?
- D-29 (PS-E1-007): NFR-007-03 "vi phạm xử lý trong 7 ngày" — SLA 7 ngày cho recommendation đã có; xác nhận tiêu chí xử lý và cách áp dụng khi chuyển/để quá hạn có đáp ứng yêu cầu không?
- D-30 (PS-E1-007): "chuyển huyện" trong FR-007-06 — xem Gap 2 (cấu hình được đơn vị cấp trên).
- D-31 (PS-E1-007): Checklist template versioning — ai quản lý template (cấp tỉnh/cấp xã)? Có sync từ cấp trên không?
