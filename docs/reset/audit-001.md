# Audit PS-E1-001 — Bản đồ Địa bàn Số Tổng hợp (ANTT Dashboard Map) — T1, Must Have

Nguồn yêu cầu: `docs/reset/requirements-baseline.md` (mục PS-E1-001).
Chỉ dùng code (`src/**`) và test (`tests/**`) làm bằng chứng. Không dùng design/SOW.
Trạng thái: **CÓ** = đầy đủ; **MỘT PHẦN** = một phần; **KHÔNG** = chưa có; **LỆCH** = khác ý nghĩa; **MƠ HỒ** = chưa rõ ai quyết; **PHASE 2** = baseline đưa vào Phase 2.

---

## Bảng kiểm tra từng yêu cầu

| ID | Trạng thái | Bằng chứng code (file:line) | Test (tên test; CHƯA CHẠY) | Ghi chú |
|---|---|---|---|---|
| FR-001-01 | **MỘT PHẦN** | `src/components/map/MapWorkspace.tsx:1099-1129` (checkbox layer: Vụ việc, Kiểm tra, Vùng polygon) <br> `src/modules/platform/map/index.ts:47-50` (MAP_PROJECTION_SOURCE_AGGREGATES = Incident, Inspection) <br> `src/modules/mobile-readonly/layers.ts:10-23` (LAYER_CATALOG: related-info, incidents — có HOTSPOT) | `tests/map/map-smoke.test.ts:32-48` (projectToMapMarkers cho Incident) — **CHƯA CHẠY** | Có layer Vụ việc, Kiểm tra, Vùng polygon. **Thiếu**: layer Camera (chưa có camera adapter), layer Lực lượng, layer Cơ sở KD, layer Đối tượng quản lý. Layer HOTSPOT chỉ có trong mobile-readonly (map sang Incident). |
| FR-001-02 | **MỘT PHẦN** | `src/components/map/MapWorkspace.tsx:791-795` (marker cho Incident/Inspection) <br> `src/modules/platform/map/index.ts:169-189` (projectToMapMarkers dùng status từ state) | **KHÔNG CÓ TEST** cho icon phân màu theo mức độ | Marker hiển thị title, status; chưa có logic phân màu đỏ/vàng/xanh theo mức độ. |
| FR-001-03 | **MỘT PHẦN** | `src/components/map/MapWorkspace.tsx:791-795` (marker có title, latitude, longitude) <br> `src/components/map/MapWorkspace.tsx:1131-1392` (focus parcel detail panel) | **KHÔNG CÓ TEST** cho popup/click marker | Click marker hiện không có popup; focus parcel có detail panel riêng. |
| FR-001-04 | **MỘT PHẦN** | `src/components/map/MapWorkspace.tsx:1099-1129` (checkbox layer filter) <br> `src/components/map/MapWorkspace.tsx:89-202` (discovery filters: parcelCode, mapSheetNumber, parcelNumber, communeCode, status, bbox) | `tests/map/map-permission-offline.test.ts` (permission) — **CHƯA CHẠY** | Có filter layer cơ bản + discovery filter (parcel). **Thiếu**: filter theo thời gian, loại sự việc, mức độ, đơn vị xử lý. |
| FR-001-05 | **KHÔNG** | **KHÔNG CÓ BẰNG CHỨNG** | **KHÔNG CÓ TEST** | Không có time slider / temporal navigation trong code. |
| FR-001-06 | **KHÔNG** | **KHÔNG CÓ BẰNG CHỨNG** | **KHÔNG CÓ TEST** | Không có export snapshot/PDF trong code. |
| NFR-001-01 | **KHÔNG** | **KHÔNG CÓ BẰNG CHỨNG** | **KHÔNG CÓ TEST** | Không có benchmark load < 3s / update < 30s trong code/test. |
| NFR-001-02 | **MỘT PHẦN** | `src/modules/platform/map/index.ts:7, 108-109` (CADN_BOUNDS = [105.93, 20.91, 106.03, 20.99]; provider.bounds = CADN_BOUNDS) | `tests/map/map-provider.test.ts:31-38` (resolves CADN bounds) — **CHƯA CHẠY** | Bounds khớp CADN. **Thiếu**: xác nhận độ chính xác cấp đường/ngõ hẻm, hợp đồng VietGeoX/VBDLIS. |
| NFR-001-03 | **MỘT PHẦN** | `src/components/map/MapWorkspace.tsx:1099-1129` (3 layer checkbox) <br> `src/modules/platform/map/index.ts:47-50` (2 aggregates) <br> `src/modules/mobile-readonly/layers.ts:10-23` (2 layers catalog) | **KHÔNG CÓ TEST** cho ≥ 5 layer đồng thời | Hiện có 3 layer web + 2 layer mobile = không đạt ≥ 5 layer độc lập đồng thời. |
| NFR-001-04 | **MỘT PHẦN** | `mobile/src/features/map/MapScreen.tsx:200-225, 446-485` (đọc pack đã lưu và cung cấp thao tác tải pack basemap trên Mobile) <br> `src/components/map/MapWorkspace.tsx:310-337` (nhánh offline của Web kết thúc trước khi tải provider config; không thấy fallback cached tiles trong luồng này) | `mobile/src/features/__tests__/land-parcel-map-offline.test.tsx:136-156` (kiểm tra ranh giới pack chỉ dành cho basemap, không lưu geometry thửa đất) — **CHƯA CHẠY** <br> `tests/map/map-permission-offline.test.ts:44-49` (kiểm tra chặn ghi khi offline, không kiểm tra hiển thị cached tiles trên Web) — **CHƯA CHẠY** | Có triển khai tải/đọc pack basemap trên Mobile; chưa có bằng chứng Web hiển thị tiles đã cache. Test hiện có kiểm tra source/ranh giới lưu trữ, không xác nhận render tile khi mất mạng trên thiết bị hay trình duyệt. Không coi việc có test là kết quả PASS; yêu cầu bao phủ một phần. |
| NFR-001-05 | **KHÔNG** | **KHÔNG CÓ BẰNG CHỨNG** | **KHÔNG CÓ TEST** | Không có export A3/A4 trong code. |

---

## Trích nguyên văn code (≤15 dòng) tại các vị trí liên quan "cấu hình được" / hard-code

### 1. `src/modules/platform/map/index.ts:7, 108-109` — CADN_BOUNDS hard-code

```ts
export const CADN_BOUNDS = [105.93, 20.91, 106.03, 20.99] as const;
// ...
bounds: CADN_BOUNDS,
```

### 2. `src/components/map/MapWorkspace.tsx:176-188` — bbox validation hard-code CADN_BOUNDS

```ts
    const [boundMinLng, boundMinLat, boundMaxLng, boundMaxLat] = CADN_BOUNDS;
    if (
      minLng < boundMinLng ||
      minLat < boundMinLat ||
      maxLng > boundMaxLng ||
      maxLat > boundMaxLat
    ) {
      return {
        error:
          'Vùng tìm kiếm không hợp lệ hoặc quá rộng. Hãy thu hẹp vùng bản đồ.',
      };
    }
```

### 3. `src/modules/platform/map/index.ts:52-60` — MAP_VIEWER_ROLES hard-code

```ts
const MAP_VIEWER_ROLES: readonly string[] = [
  'commander',
  'superior_commander',
  'duty_officer',
  'field_officer',
  'office_officer',
  'village_officer',
  'superior_officer',
];
```

---

## Chức năng ngoài yêu cầu — tối đa 10 dòng

| Nhóm | Chức năng | Vị trí code | Mô tả | Ghi chú / liên quan yêu cầu |
|---|---|---|---|---|
| (a) | MapLibre GL rendering, marker, polygon layer | `src/components/map/MapWorkspace.tsx:757-950` | Render map, marker, polygon (fill/line), focus parcel, discovery | FR-001-01, FR-001-03, FR-001-04 |
| (a) | Map provider resolution (OSS TileServer GL) | `src/modules/platform/map/index.ts:78-111` | Resolve provider từ env, validate OSM attribution | NFR-001-02, NFR-001-04 |
| (a) | Map permission (resolveMapPermission) | `src/modules/platform/map/index.ts:227-233` | ok/denied/masked theo role | FR-001-01 (phân quyền) |
| (a) | Offline guard (assertMapWriteAllowed) | `src/modules/platform/map/index.ts:236-238` | Chặn write khi offline | NFR-001-04 |
| (a) | Mask marker title (maskMapMarker) | `src/modules/platform/map/index.ts:241-247` | Che title khi thiếu read_sensitive | NFR-X-01 |
| (a) | Focus parcel projection (land-parcel-focus) | `src/components/map/MapWorkspace.tsx:386-464` | Load focused parcel từ `/api/map/land-parcels` | Land parcel map (P0) |
| (a) | Scoped parcel discovery (P1) | `src/components/map/MapWorkspace.tsx:89-202, 492-587` | Filter/bbox, cursor pagination, idle/invalid/overflow states | FR-001-04 (mở rộng) |
| (a) | Map config API (/api/map/config) | `src/app/api/map/config/route.ts` (không đọc được) | Trả provider config cho client | FR-001-01 |
| (a) | Map markers API (/api/map/markers) | `src/app/api/map/markers/route.ts` (không đọc được) | Trả marker từ projection Incident/Inspection | FR-001-01 |
| (b) | Mock camera adapter (vehicle) | `src/modules/vehicles/mock-camera-adapter.ts` | Giả lập LPR cho vehicle | PS-E1-003/009, mục 5 baseline |

---

## Câu hỏi mở → thêm vào decision-log.md

- D-06 (PS-E1-001): "cấp xã/phường" trong FR-001-01 — xác nhận đơn vị hành chính chính xác (xã Nghĩa Trụ hay cấp xã chung)?
- D-07 (PS-E1-001): "đơn vị xử lý" trong FR-001-04 — tham chiếu OrganizationUnit nào (cấp xã, cấp huyện)?
- D-08 (PS-E1-001): NFR-001-02 yêu cầu "nguồn VietGeoX/VBDLIS" — có hợp đồng/cấp phép truy cập không?
- D-09 (PS-E1-001): "Cán bộ An ninh xã" / "Cán bộ trực ban" — map sang role nào trong catalog?
