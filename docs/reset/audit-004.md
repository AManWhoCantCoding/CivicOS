# Audit PS-E1-004 — Quản lý Cư dân Đặc biệt (Tạm trú, Người nước ngoài, Tái hòa nhập) — T1, Must Have

Nguồn yêu cầu: `docs/reset/requirements-baseline.md` (mục PS-E1-004).
Chỉ dùng code (`src/**`) và test (`tests/**`) làm bằng chứng. Không dùng design/SOW.
Trạng thái: **CÓ** = đầy đủ; **MỘT PHẦN** = một phần; **KHÔNG** = chưa có; **LỆCH** = khác ý nghĩa; **MƠ HỒ** = chưa rõ ai quyết; **PHASE 2** = baseline đưa vào Phase 2.

---

## Bảng kiểm tra từng yêu cầu

*Lưu ý: PS-E1-004 dùng chung code/domain với PS-E1-003 (module `residents`). Yêu cầu FR-004-xx map vào cùng entity Subject/ManagementRecord/Activity.*

| ID | Trạng thái | Bằng chứng code (file:line) | Test (tên test; CHƯA CHẠY) | Ghi chú |
|---|---|---|---|---|
| FR-004-01 | **MỘT PHẦN** | `src/modules/residents/commands.ts:100-129` (registerSubject) <br> `src/modules/residents/commands.ts:174-207` (createManagementRecord, có sourceOrganizationId) <br> `src/modules/residents/commands.ts:645-694` (transferRecord cập nhật đơn vị được giao của bản ghi hiện có) | `tests/residents/resident-workflow.postgres.test.ts:315-341` (tạo hồ sơ rồi chuyển bản ghi lên đơn vị khác) — **CHƯA CHẠY** | Có tạo Subject/ManagementRecord và chuyển bản ghi hiện có; bằng chứng này chưa chứng minh luồng tiếp nhận/import hồ sơ bàn giao từ CA huyện hoàn chỉnh. Không đồng nhất tạo hồ sơ mới hoặc chuyển hồ sơ đi với tiếp nhận hồ sơ bàn giao. |
| FR-004-02 | **MỘT PHẦN** | `src/modules/residents/commands.ts:92-128` (registerSubject nhận displayName, subjectType, sensitiveProfile tổng quát) <br> `src/modules/residents/commands.ts:174-207` (ManagementRecord có purpose, riskLevel) <br> `prisma/schema.prisma:455-480` (Subject chỉ có sensitiveProfile dạng chuỗi tổng quát; không có field ảnh/lý lịch/tội danh riêng) <br> `src/modules/identity/encryption.ts:18-46` (mã hóa sensitiveProfile) | `tests/residents/resident-workflow.postgres.test.ts:360-382` (chỉ kiểm tra sensitiveProfile tổng quát và audit đọc nhạy cảm) — **CHƯA CHẠY** | Có riskLevel và vùng text nhạy cảm tổng quát; chưa có bằng chứng lưu ảnh hoặc biểu diễn riêng các mục lý lịch/tội danh trong hồ sơ quản lý. Vì vậy chưa đủ căn cứ đánh giá đầy đủ yêu cầu lập hồ sơ gồm ảnh, lý lịch, tội danh và mức độ nguy hiểm. |
| FR-004-03 | **MỘT PHẦN** | `src/modules/residents/commands.ts:397-449` (recordActivity backend) <br> `src/app/api/residents/[subjectId]/management-records/[recordId]/activities/route.ts:29-69` (API POST) <br> `src/components/residents/ActivityForm.tsx:19-55` (Web form gọi API POST) <br> `src/modules/mobile-readonly/layers.ts:10-23` (RESIDENT layer Mobile là luồng đọc) | `tests/residents/resident-workflow.postgres.test.ts:233-278` (ghi checkup activity và idempotency) — **CHƯA CHẠY** | Backend command, API POST và Web form ghi activity đã có. Trong `mobile/src` chưa tìm thấy client gọi luồng này; vì baseline yêu cầu ghi trên app Mobile, không suy rộng Web/API thành Mobile đã tích hợp. Đây không phải trạng thái read-only của toàn hệ thống. |
| FR-004-04 | **MỘT PHẦN** | `src/modules/residents/commands.ts:182-270` (createManagementRecord: purpose=foreign_resident, same_day SLA = 1 ngày) <br> `src/modules/residents/contracts.ts:46-47` (foreign_same_day_report = 1 ngày) | `tests/residents/resident-workflow.postgres.test.ts` — **CHƯA CHẠY** | Đăng ký tạm trú người nước ngoài: purpose=foreign_resident, SLA same_day = 1 ngày. **Thiếu**: "tự động báo CA huyện" — không có notification gửi đơn vị cấp trên. |
| FR-004-05 | **CÓ** | `src/modules/residents/commands.ts:397-449` (recordActivity lưu activityType, content, evaluation, tọa độ và evidenceIds) <br> `src/modules/residents/commands.ts:510-546` (updateRecord cập nhật riskLevel/status) | `tests/residents/resident-workflow.postgres.test.ts:233-278` (ghi hoạt động checkup; không kiểm tra riêng các ví dụ di chuyển/việc làm/tái phạm) — **CHƯA CHẠY** | Có nhật ký hoạt động dạng activityType/content và cập nhật riskLevel/status; nội dung có thể ghi biến động. Bằng chứng test hiện có chỉ bao phủ checkup, không khẳng định đã chạy hoặc kiểm tra riêng từng ví dụ trong baseline. |
| FR-004-06 | **MỘT PHẦN** | `src/modules/platform/sla/index.ts:90-129` (markOverdue emit SlaOverdue) <br> `src/modules/platform/notifications/index.ts:64-86` (SlaOverdue consumer → in-app notification) | **KHÔNG CÓ TEST** cảnh báo bỏ trốn/vi phạm | Có SLA overdue detection chung. **Thiếu**: cảnh báo chuyên biệt "bỏ trốn/vi phạm" gửi CA huyện (cần notification gửi đơn vị cấp trên). |
| FR-004-07 | **MỘT PHẦN** | `src/modules/residents/commands.ts:701-800` (generateMonthlyReport lưu sourceRecordIds và aggregateCounts) <br> `src/modules/residents/commands.ts:802-871` (approveReport) <br> `src/modules/residents/commands.ts:873-930` (sendReport) | `tests/residents/resident-workflow.postgres.test.ts:343-358` (tạo/duyệt/gửi ResidentMonthlyReport; không kiểm tra danh sách chi tiết) — **CHƯA CHẠY** | Có ResidentMonthlyReport theo kỳ, aggregateCounts và workflow duyệt/gửi. **Thiếu**: bằng chứng báo cáo xuất danh sách chi tiết cư dân đặc biệt theo tháng; report hiện lưu ID nguồn và số liệu tổng hợp. |
| NFR-004-01 | **CÓ** | `src/modules/residents/contracts.ts:39-50` (SLA registration=24h, same_day=1 ngày) <br> `src/modules/residents/contracts.ts:68-77` (slaBadge trả due_soon khi còn ≤ 2 ngày, overdue khi đến hạn) <br> `src/modules/residents/projection.ts:157-167, 185-189` (đưa trạng thái SLA vào projection) | `tests/residents/resident-contracts.test.ts:60-74` — **CHƯA CHẠY** | Đã có trạng thái `due_soon` và `overdue`; test hiện có chỉ assert `overdue`, `on_time`, `unknown`, chưa kiểm tra trực tiếp ngưỡng `due_soon` hoặc biên 2 ngày. |
| NFR-004-02 | **MỘT PHẦN** | `src/modules/residents/commands.ts:107-130` (listSubjects) <br> `src/modules/residents/commands.ts:132-250` (listManagementRecords) | **KHÔNG CÓ TEST** 100% coverage | Có CRUD/list cho Subject/Record. **Thiếu**: mechanism đảm bảo 100% không bỏ sót (validation, required fields). |
| NFR-004-03 | **CÓ** | `src/modules/residents/contracts.ts:43-44` (reintegration checkup = 30 ngày) <br> `src/modules/residents/commands.ts:239` (createSla checkup) | `tests/residents/resident-workflow.postgres.test.ts` — **CHƯA CHẠY** | SLA checkup 30 ngày tự tạo khi tạo Record reintegration. Đảm bảo ≥ 1 lần/tháng. |
| NFR-004-04 | **MỘT PHẦN** | `src/modules/residents/commands.ts:701-800` (generateMonthlyReport nhận period YYYY-MM) <br> `src/app/api/residents/reports/monthly/route.ts:37-62` (POST gọi generateMonthlyReport theo request) | **KHÔNG CÓ TEST** tự động đúng kỳ | Có thao tác tạo ResidentMonthlyReport theo kỳ qua API; bằng chứng hiện có là endpoint được gọi theo request, chưa chứng minh scheduler/cron tự chạy đúng kỳ hàng tháng. |

---

## Trích nguyên văn code (≤15 dòng) tại các vị trí hard-code

### 1. `src/modules/residents/contracts.ts:42-49` — SLA hardcode (giống PS-E1-003)

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

### 2. `src/modules/residents/commands.ts:239` — createSla dùng rule hardcode

```ts
const sla = await createSla(
  {
    resourceType: 'SubjectManagementRecord',
    resourceId: record.id,
    rule: slaRuleForPurpose(input.purpose, 'checkup'),
    assigneeUserId: actor.id,
  },
  tx,
);
```

---

## Chức năng ngoài yêu cầu — tối đa 10 dòng

| Nhóm | Chức năng | Vị trí code | Mô tả | Ghi chú / liên quan yêu cầu |
|---|---|---|---|---|
| (a) | Subject/Record/Activity CRUD (chung PS-E1-003) | `src/modules/residents/commands.ts` | Tạo/đọc Subject, Record, Activity | FR-004-01, 02, 05 |
| (a) | Assignment task resident_followup | `src/modules/identity/assignments.ts:22-104` | Gán task cho cán bộ thôn | FR-004-03 |
| (a) | SLA auto-create + overdue detection | `src/modules/platform/sla/index.ts` | Tự tạo SLA, markOverdue, notification | NFR-004-01, 03 |
| (a) | MonthlyReport aggregate + snapshot | `src/modules/residents/commands.ts:697-930` | Báo cáo tháng với hash, approve, send | FR-004-07 |
| (a) | Mask display name + encrypt identityNumber | `src/modules/residents/contracts.ts:63-66` + encryption | Bảo vệ dữ liệu nhạy cảm | NFR-X-01 |
| (a) | Mobile-readonly RESIDENT layer | `src/modules/mobile-readonly/layers.ts:10-23` | Layer đọc RESIDENT trên Mobile; riêng backend/API và Web có activity write | FR-004-03 (Mobile layer đọc) |
| (b) | Direct Incident creation | `src/modules/incidents/commands.ts:1588-1661` | Không liên quan cư dân | PS-E1-005 |
| (b) | Mock camera adapter | `src/modules/vehicles/mock-camera-adapter.ts` | Không liên quan | PS-E1-003/009 |
| (b) | ResidentMonthlyReport snapshot hash | `src/modules/residents/commands.ts:697-699, 813-829` | Hash snapshot được tạo và lưu khi approve | Mở rộng baseline |

---

## Câu hỏi mở → thêm vào decision-log.md

- D-19 (PS-E1-004): "Cán bộ thôn" — role `village_officer` hay role riêng?
- D-20 (PS-E1-004): "tự động báo CA huyện" (FR-004-04, FR-004-06) — đơn vị cấp trên cấu hình được không (Gap 2)?
- D-21 (PS-E1-004): "ảnh, lý lịch, tội danh" (FR-004-02) — có field này trong Subject/Record không? Cần mở rộng schema?
- D-22 (PS-E1-004): Mobile write flow cho cán bộ thôn ghi activity — backend/API/Web đã có, chưa tìm thấy Mobile client tích hợp; khi nào và theo luồng nào sẽ tích hợp?
