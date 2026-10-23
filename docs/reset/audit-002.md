# Audit PS-E1-002 — Quản lý Điểm nóng ANTT (Hot Spot Management) — T1, Must Have

Nguồn yêu cầu: `docs/reset/requirements-baseline.md` (mục PS-E1-002).
Chỉ dùng code (`src/**`) và test (`tests/**`) làm bằng chứng. Không dùng design/SOW.
Trạng thái: **CÓ** = đầy đủ; **MỘT PHẦN** = một phần; **KHÔNG** = chưa có; **LỆCH** = khác ý nghĩa; **MƠ HỒ** = chưa rõ ai quyết; **PHASE 2** = baseline đưa vào Phase 2.

---

## Bảng kiểm tra từng yêu cầu

| ID | Trạng thái | Bằng chứng code (file:line) | Test (tên test; CHƯA CHẠY) | Ghi chú |
|---|---|---|---|---|
| FR-002-01 | **KHÔNG** | **KHÔNG CÓ BẰNG CHỨNG** | **KHÔNG CÓ TEST** | Không có entity/table Hotspot, không có command tạo điểm nóng bằng vẽ polygon. |
| FR-002-02 | **KHÔNG** | **KHÔNG CÓ BẰNG CHỨNG** | **KHÔNG CÓ TEST** | Không có thuộc tính tên, loại (Trộm cắp/Ma túy/TNXH/Khiếu kiện/Khác), mức độ (Thấp/TB/Cao). |
| FR-002-03 | **KHÔNG** | **KHÔNG CÓ BẰNG CHỨNG** | **KHÔNG CÓ TEST** | Không có auto-link vụ việc vào điểm nóng (cần spatial query). |
| FR-002-04 | **KHÔNG** | **KHÔNG CÓ BẰNG CHỨNG** | **KHÔNG CÓ TEST** | Không có ghi nhận phân tích nguyên nhân/biện pháp. |
| FR-002-05 | **KHÔNG** | **KHÔNG CÓ BẰNG CHỨNG** | **KHÔNG CÓ TEST** | Không có tự động tăng tần suất nhắc tuần tra theo mức độ Cao. |
| FR-002-06 | **KHÔNG** | **KHÔNG CÓ BẰNG CHỨNG** | **KHÔNG CÓ TEST** | Không có theo dõi trend số vụ việc theo tuần tại điểm nóng. |
| FR-002-07 | **KHÔNG** | **KHÔNG CÓ BẰNG CHỨNG** | **KHÔNG CÓ TEST** | Không có đề xuất đóng điểm nóng khi Thấp 4 tuần liên tục. |
| FR-002-08 | **KHÔNG** | **KHÔNG CÓ BẰNG CHỨNG** | **KHÔNG CÓ TEST** | Không có tự động tổng hợp báo cáo tuần gửi CA huyện. |
| NFR-002-01 | **KHÔNG** | **KHÔNG CÓ BẰNG CHỨNG** | **KHÔNG CÓ TEST** | Không có màu sắc điểm nóng trên bản đồ. |
| NFR-002-02 | **KHÔNG** | **KHÔNG CÓ BẰNG CHỨNG** | **KHÔNG CÓ TEST** | Không có lưu trữ lịch sử điểm nóng vĩnh viễn. |
| NFR-002-03 | **KHÔNG** | **KHÔNG CÓ BẰNG CHỨNG** | **KHÔNG CÓ TEST** | Không có gửi nhắc tăng cường tuần tra tới cán bộ phụ trách. |
| NFR-002-04 | **KHÔNG** | `src/modules/mobile-readonly/layers.ts:15` (entityTypes: ['RESIDENT', 'BUSINESS', 'HOTSPOT', 'VIOLATION']) <br> `src/modules/mobile-readonly/contracts.ts:3-8` (MOBILE_READ_ENTITY_TYPES bao gồm 'HOTSPOT') | **KHÔNG CÓ TEST** cho Hotspot layer | Code có entity type 'HOTSPOT' trong mobile-readonly layer catalog, map sang `Incident` (line 37-38). **Nhưng**: không có Hotspot table/entity riêng, chỉ dùng Incident làm proxy. Baseline NFR-002-04 yêu cầu ngưỡng 4 tuần cấu hình được; chưa có chức năng/ngưỡng này. HOTSPOT trong mobile-readonly chỉ là lớp proxy, không đáp ứng NFR-002-04. Phân loại KHÔNG, không phải LỆCH. |

---

## Trích nguyên văn code (≤15 dòng) tại các vị trí liên quan "cấu hình được" / hard-code

### 1. `src/modules/mobile-readonly/layers.ts:37-38` — HOTSPOT map sang Incident

```ts
          : entityType === 'HOTSPOT'
            ? 'Incident'
```

### 2. `src/modules/mobile-readonly/contracts.ts:3-8` — MOBILE_READ_ENTITY_TYPES có HOTSPOT

```ts
export const MOBILE_READ_ENTITY_TYPES = [
  'RESIDENT',
  'BUSINESS',
  'HOTSPOT',
  'VIOLATION',
] as const;
```

---

## Chức năng ngoài yêu cầu — tối đa 10 dòng

| Nhóm | Chức năng | Vị trí code | Mô tả | Ghi chú / liên quan yêu cầu |
|---|---|---|---|---|
| (a) | Mobile-readonly HOTSPOT layer | `src/modules/mobile-readonly/layers.ts:10-23` | Layer catalog có HOTSPOT entity type, map sang Incident | FR-002-03 (auto-link) dùng Incident làm proxy |
| (a) | Mobile-readonly HOTSPOT permission | `src/modules/mobile-readonly/layers.ts:25-96` | Kiểm tra Assignment cho Incident khi HOTSPOT | NFR-002-03 (nhắc cán bộ phụ trách) |
| (b) | Không có Hotspot domain module | — | Chưa có Hotspot aggregate, table, command, state machine | Toàn bộ PS-E1-002 chưa triển khai |

---

## Câu hỏi mở → thêm vào decision-log.md

- D-10 (PS-E1-002): "Cán bộ An ninh xã Nghĩa Trụ" — có phải role `village_officer` hoặc role riêng không?
- D-11 (PS-E1-002): "phụ trách khu vực" trong NFR-002-03 — xác định bằng Assignment hay OrganizationUnit?
- D-12 (PS-E1-002): "CA huyện" trong FR-002-08 — xem Gap 2 (đã bỏ cấp huyện, cần cấu hình được đơn vị cấp trên).
- D-13 (PS-E1-002): Baseline NFR-002-04 "ngưỡng 4 tuần phải cấu hình được" — khi triển khai Hotspot, cấu hình ở đâu (config table, env, SLA kind)?
- D-14 (PS-E1-002): "loại (Trộm cắp/Ma túy/TNXH/Khiếu kiện/Khác)" — danh sách này có mở rộng được không?