# Audit PS-E1-010 — Báo cáo Tình hình ANTT Định kỳ (Tự động Tổng hợp) — T2, Should Have

Nguồn yêu cầu: `docs/reset/requirements-baseline.md` (mục PS-E1-010).
Chỉ dùng code (`src/**`) và test (`tests/**`) làm bằng chứng. Không dùng design/SOW.
Trạng thái: **CÓ** = đầy đủ; **MỘT PHẦN** = một phần; **KHÔNG** = chưa có; **LỆCH** = khác ý nghĩa; **MƠ HỒ** = chưa rõ ai quyết; **PHASE 2** = baseline đưa vào Phase 2.

---

## Bảng kiểm tra từng yêu cầu

| ID | Trạng thái | Bằng chứng code (file:line) | Test (tên test; CHƯA CHẠY) | Ghi chú |
|---|---|---|---|---|
| FR-010-01 | **KHÔNG** | **KHÔNG CÓ BẰNG CHỨNG** | **KHÔNG CÓ TEST** | Không có UI chọn kỳ báo cáo (tuần/tháng/quý). |
| FR-010-02 | **MỘT PHẦN** | `src/modules/residents/commands.ts:701-800` (generateMonthlyReport: aggregateCounts/snapshot) <br> `src/modules/inspections/projection.ts:442-546` (inspectionStats) <br> `src/app/api/inspections/stats/route.ts:6-18` (API thống kê inspection) <br> `src/modules/vehicles/projection.ts:228-337` (listRegistry, listObservations) | `tests/inspections/inspection-stats.postgres.test.ts:189-249` (test thống kê inspection theo loại/kỳ, không phải báo cáo tổng hợp liên phân hệ) — **CHƯA CHẠY** <br> **KHÔNG CÓ TEST** cho báo cáo tự động thống nhất | Có report resident, stats inspection (kèm endpoint/test) và vehicle projections riêng. **Thiếu**: tổng hợp thống nhất "số vụ việc, loại, trạng thái, dữ liệu đối tượng quản lý" trong một report; không suy từ test inspection riêng thành test báo cáo liên phân hệ. |
| FR-010-03 | **KHÔNG** | **KHÔNG CÓ BẰNG CHỨNG** | **KHÔNG CÓ TEST** | Không có so sánh số liệu với kỳ trước (tăng/giảm). |
| FR-010-04 | **KHÔNG** | **KHÔNG CÓ BẰNG CHỨNG** | **KHÔNG CÓ TEST** | Không có xuất báo cáo đúng mẫu CA huyện, không hỗ trợ upload mẫu tùy chỉnh. |
| FR-010-05 | **MỘT PHẦN** | `src/modules/residents/commands.ts:701-800` (generateMonthlyReport) <br> `src/modules/residents/commands.ts:802-871` (approveReport) <br> `src/modules/residents/commands.ts:873-930` (sendReport) | **KHÔNG CÓ TEST** xem lại/bổ sung nhận xét | ResidentMonthlyReport có workflow tạo/duyệt/gửi. **Thiếu**: bằng chứng Trưởng CA xã xem lại, bổ sung nhận xét trước khi gửi; các hàm hiện có không lưu nhận xét. |
| FR-010-06 | **MỘT PHẦN** | `src/modules/residents/commands.ts:873-899` (sendReport kiểm tra trạng thái và cập nhật sentAt/sendTargetId) | **KHÔNG CÓ TEST** ký số/gửi báo cáo ANTT | Có workflow đánh dấu gửi và lưu đơn vị đích cho ResidentMonthlyReport. **Thiếu**: bằng chứng ký số và gửi báo cáo ANTT liên phân hệ; sendReport không thể hiện thao tác ký số. |
| FR-010-07 | **MỘT PHẦN** | `src/modules/residents/commands.ts:701-800` (generateMonthlyReport tạo ResidentMonthlyReport theo period) <br> `prisma/schema.prisma:509-529` (ResidentMonthlyReport lưu period, aggregateCounts, snapshot và unique organizationId+period) | `tests/residents/resident-workflow.postgres.test.ts:343-358` (workflow ResidentMonthlyReport) — **CHƯA CHẠY** | Có lưu báo cáo ResidentMonthlyReport theo kỳ và ràng buộc duy nhất organizationId+period. Đây là báo cáo tổng hợp dữ liệu hồ sơ cư dân; chưa có bằng chứng lưu trữ báo cáo ANTT tổng hợp liên phân hệ như baseline PS-E1-010, nên chỉ đáp ứng một phần. |
| NFR-010-01 | **MỘT PHẦN** | `src/modules/residents/commands.ts:732-775` (generateMonthlyReport tổng hợp SubjectManagementRecord) | **KHÔNG CÓ TEST** ≥ 90% tự động | Có tổng hợp tự động dữ liệu hồ sơ cư dân. **Thiếu**: bằng chứng tỷ lệ ≥90% số liệu toàn báo cáo ANTT được lấy tự động từ các phân hệ; hiện chưa thấy report tổng hợp incident/inspection/vehicle/hotspot. |
| NFR-010-02 | **MƠ HỒ** | **KHÔNG CÓ BẰNG CHỨNG** | **KHÔNG CÓ TEST** | "Đúng mẫu CA huyện quy định (tuần thứ 6, tháng ngày 25, quý ngày 20)" — không có template/model mẫu. |
| NFR-010-03 | **MỘT PHẦN** | `src/modules/platform/sla/index.ts:90-129` (markOverdue) <br> `src/modules/platform/notifications/index.ts:64-86` (SlaOverdue consumer) | **KHÔNG CÓ TEST** gửi đúng kỳ | Có SLA overdue detection. **Thiếu**: scheduler chạy đúng kỳ (tuần 6, tháng 25, quý 20), cảnh báo trước hạn. |
| NFR-010-04 | **MỘT PHẦN** | `src/modules/residents/commands.ts:891-899` (sendReport chỉ cập nhật trạng thái sent, sentAt, sendTargetId) | **KHÔNG CÓ TEST** ký số | Có cập nhật trạng thái gửi ResidentMonthlyReport; chưa có bằng chứng triển khai chữ ký số để đảm bảo tính pháp lý của báo cáo. Mã hóa dữ liệu không được xem là bằng chứng ký số. |

---

## Trích nguyên văn code (≤15 dòng) — hard-code / cấu hình

### 1. `prisma/schema.prisma:527` — ResidentMonthlyReport unique constraint (period)

```prisma
@@unique([organizationId, period])
```

### 2. `src/modules/residents/commands.ts:891-899` — sendReport cập nhật trạng thái gửi

```ts
    const updated = await tx.residentMonthlyReport.update({
      where: { id: report.id, status: 'approved' },
      data: {
        status: 'sent',
        sentAt: new Date(),
        sendTargetId: targetOrganizationId,
        version: report.version + 1,
      },
    });
```
Đoạn cập nhật này không có thao tác ký số.

---

## Chức năng ngoài yêu cầu — tối đa 10 dòng

| Nhóm | Chức năng | Vị trí code | Mô tả | Ghi chú / liên quan yêu cầu |
|---|---|---|---|---|
| (a) | ResidentMonthlyReport workflow | `src/modules/residents/commands.ts:701-930` | generate/approve/send monthly report cho resident | FR-010-07 (resident only) |
| (a) | Inspection stats aggregation | `src/modules/inspections/projection.ts:442-546` <br> `src/app/api/inspections/stats/route.ts:6-18` | Stats per type, pass/reminder/needs_action rates, có API | FR-010-02 (inspection only) |
| (a) | Vehicle projection stats | `src/modules/vehicles/projection.ts:228-337` | List observations, registry | FR-010-02 (vehicle only) |
| (a) | SLA overdue detection + notification | `src/modules/platform/sla/index.ts:90-129` + `src/modules/platform/notifications/index.ts:62-86` | Mark overdue, emit SlaOverdue, in-app notification | NFR-010-03 |
| (a) | Encryption (AES-256-GCM) | `src/modules/identity/encryption.ts:18-46` | Mã hóa dữ liệu nhạy cảm; không phải ký số | Không chứng minh NFR-010-04 |
| (b) | Mock camera adapter | `src/modules/vehicles/mock-camera-adapter.ts:1-54` | Không liên quan report | PS-E1-003/009 |
| (b) | Direct Incident creation | `src/modules/incidents/commands.ts:1588-1661` | Không liên quan report | PS-E1-005 |
| (b) | PeriodicReport domain term | `CONTEXT.md:61-63` | Term định nghĩa PeriodicReport | Baseline definition |

---

## Câu hỏi mở → thêm vào decision-log.md

- D-42 (PS-E1-010): "Báo cáo ANTT định kỳ" — có phải merge resident/incident/inspection/vehicle/hotspot vào một report không? Hay tách riêng?
- D-43 (PS-E1-010): "Mẫu CA huyện" — có file mẫu tham chiếu không? (NFR-010-02).
- D-44 (PS-E1-010): "Ký số" — chuẩn/chứng thư nào (CA Việt Nam, VNeID, tự ký)? (NFR-010-04).
- D-45 (PS-E1-010): "CA huyện" nhận báo cáo — xem Gap 2 (cấu hình được đơn vị cấp trên).
- D-46 (PS-E1-010): Scheduler chạy đúng kỳ (tuần 6, tháng 25, quý 20) — dùng cron, pg_cron, hay application scheduler?
