# Audit PS-E1-006 — Phân tích Xu hướng ANTT theo Thời gian (Trend Analysis) — T2, Should Have

Nguồn yêu cầu: `docs/reset/requirements-baseline.md` (mục PS-E1-006).
Chỉ dùng code (`src/**`) và test (`tests/**`) làm bằng chứng. Không dùng design/SOW.
Trạng thái: **CÓ** = đầy đủ; **MỘT PHẦN** = một phần; **KHÔNG** = chưa có; **LỆCH** = khác ý nghĩa; **MƠ HỒ** = chưa rõ ai quyết; **PHASE 2** = baseline đưa vào Phase 2.

---

## Bảng kiểm tra từng yêu cầu

| ID | Trạng thái | Bằng chứng code (file:line) | Test (tên test; CHƯA CHẠY) | Ghi chú |
|---|---|---|---|---|
| FR-006-01 | **KHÔNG** | **KHÔNG CÓ BẰNG CHỨNG** | **KHÔNG CÓ TEST** | Không có module tổng hợp tự động vụ việc theo loại, địa điểm, thời gian. |
| FR-006-02 | **KHÔNG** | **KHÔNG CÓ BẰNG CHỨNG** | **KHÔNG CÓ TEST** | Không có biểu đồ xu hướng so sánh tháng/năm. |
| FR-006-03 | **MỘT PHẦN** | `src/components/map/MapWorkspace.tsx:791-838` (marker + polygon layer cho Incident/Inspection) <br> `src/modules/platform/map/index.ts:161-189` (projectToMapMarkers) <br> `src/modules/platform/map/index.ts:203-224` (toMapAreaGeoJson) | `tests/map/map-smoke.test.ts:32-48` — **CHƯA CHẠY** | Có marker/polygon trên bản đồ từ Incident/Inspection projection. **Thiếu**: heat map chuyên dụng (chỉ có marker point, không có density/heat rendering). |
| FR-006-04 | **KHÔNG** | **KHÔNG CÓ BẰNG CHỨNG** | **KHÔNG CÓ TEST** | Không có phân tích phân bố loại tội phạm theo khung giờ. |
| FR-006-05 | **KHÔNG** | `src/components/map/MapWorkspace.tsx` — không có logic cảnh báo xu hướng | **KHÔNG CÓ TEST** | FR-006-05 yêu cầu cảnh báo tự động khi xu hướng tăng trên 30% so với kỳ trước. Chưa có chức năng cảnh báo này nên phân loại KHÔNG; yêu cầu cấu hình ngưỡng thuộc NFR-006-03 cũng chưa đáp ứng. |
| FR-006-06 | **KHÔNG** | **KHÔNG CÓ BẰNG CHỨNG** | **KHÔNG CÓ TEST** | Không có gợi ý điều chỉnh kế hoạch tuần tra. |
| FR-006-07 | **KHÔNG** | **KHÔNG CÓ BẰNG CHỨNG** | **KHÔNG CÓ TEST** | Không có xuất báo cáo phân tích gửi CA huyện. |
| NFR-006-01 | **KHÔNG** | **KHÔNG CÓ BẰNG CHỨNG** | **KHÔNG CÓ TEST** | Không có cập nhật biểu đồ hàng ngày. |
| NFR-006-02 | **MỘT PHẦN** | `src/modules/platform/map/index.ts:161-189` (projectToMapMarkers dùng latitude/longitude từ state) <br> `src/modules/platform/geo/index.ts:12-20` (createGeoPoint validate WGS84) | `tests/map/map-geometry.test.ts` — **CHƯA CHẠY** | Marker dùng GPS thực tế từ Incident/Inspection state. **Thiếu**: heat map density rendering. |
| NFR-006-03 | **KHÔNG** | Chưa có feature → không có hard-code 30% | **KHÔNG CÓ TEST** | Chưa có cơ chế cấu hình ngưỡng cảnh báo 30% theo loại vụ việc. Phân loại KHÔNG vì chức năng chưa triển khai, không phải triển khai sai. |
| NFR-006-04 | **KHÔNG** | **KHÔNG CÓ BẰNG CHỨNG** | **KHÔNG CÓ TEST** | Không có cơ chế đo tỷ lệ giảm tội phạm (hậu kiểm). |

---

## Trích nguyên văn code (≤15 dòng) — không có hard-code do feature chưa triển khai

*Feature PS-E1-006 chưa có implementation nên không có hard-code trái ngược "cấu hình được". Khi triển khai, cần tránh hard-code ngưỡng 30% và danh mục loại vụ việc.*

---

## Chức năng ngoài yêu cầu — tối đa 10 dòng

| Nhóm | Chức năng | Vị trí code | Mô tả | Ghi chú / liên quan yêu cầu |
|---|---|---|---|---|
| (a) | Map marker/polygon projection (Incident, Inspection) | `src/modules/platform/map/index.ts:161-224` | Chiếu projection rows thành marker/polygon | FR-006-03 (hỗ trợ một phần) |
| (a) | MapLibre GL rendering | `src/components/map/MapWorkspace.tsx:757-950` | Render bản đồ, marker, polygon | FR-006-03 |
| (a) | GeoPoint/GeoArea validation (WGS84) | `src/modules/platform/geo/index.ts:12-110` | Validate coordinate, polygon closed, non-self-intersect | NFR-006-02 |
| (b) | Mock camera adapter | `src/modules/vehicles/mock-camera-adapter.ts` | Không liên quan trend | PS-E1-003/009 |
| (b) | Direct Incident creation | `src/modules/incidents/commands.ts:1588-1661` | Không liên quan trend | PS-E1-005 |

---

## Câu hỏi mở → thêm vào decision-log.md

- D-23 (PS-E1-006): "vụ việc ANTT" trong FR-006-01 — tập hợp entity nào (IntakeReport, Incident, Hotspot, Vehicle...)?
- D-24 (PS-E1-006): "loại vụ việc" để cấu hình ngưỡng 30% — danh mục từ đâu (PS-E1-001..010)?
- D-25 (PS-E1-006): "cơ chế đo tỷ lệ giảm tội phạm" (NFR-006-04) — chỉ hiển thị hay cần workflow hậu kiểm?
- D-26 (PS-E1-006): "CA huyện" trong FR-006-07 — xem Gap 2 (cấu hình được đơn vị cấp trên).
- D-27 (PS-E1-006): Heat map — dùng library nào (maplibre-gl heatmap layer, deck.gl, custom)?