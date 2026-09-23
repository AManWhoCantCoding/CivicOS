# Reviewer checkpoint cuối lần 2 — `01-map-workspace-provider`

## Phạm vi và phương pháp

- Đã đọc lại toàn bộ ticket hiện tại, `CONTEXT.md`, `spec.md`, UI
  `screen-01-civic-os-workspace-map.md`, UI brief/design tokens, ADR liên
  quan, diff/source hiện tại và ba evidence mới nhất.
- Chỉ đọc/review; không chạy test, lint, typecheck, format-check, build,
  E2E, Docker, npm hoặc smoke command; không sửa source/ticket; không commit.
- Kết luận chỉ dựa trên code/diff và evidence Tester/Developer đã ghi.

## 1. Acceptance Criteria

| AC | Kết quả | Bằng chứng đối chiếu |
|---|---|---|
| AC1 route, shell/navigation, session/OrganizationUnit | **PASS** | `src/app/map/page.tsx:6-29` kiểm tra session và `canEnterEntry`; `src/app/map/layout.tsx:6-26` nối `ModuleShell`; `feature-registry.ts` khai báo module/feature map; `markers/route.ts:15-40,62-65` yêu cầu session, lọc `organizationUnitId`; `tests.md:595-608` ghi map suite 23/23 PASS. |
| AC2 MapLibre, provider OSS cấu hình được, không credential `.env` | **PASS** | `MapWorkspace.tsx:177-196` import/render MapLibre; `map/index.ts:78-108` inject style/base URL/attribution và `official:false`; `map-provider.test.ts:40-49,68-74` chứng minh đổi endpoint giữ marker và config không chứa token/secret/credential/password; `tests.md:595-608` ghi provider tests PASS. |
| AC3 GeoPoint, GeoArea polygon, layer toggle, legend, realtime | **PASS** | `map/index.ts:117-220` validate point/area và chỉ chuyển area thật thành GeoJSON; `MapWorkspace.tsx` dựng marker, polygon fill/line, toggle, legend và refresh 30 giây; `tests.md:595-608` ghi geometry 5/5 và polygon 3/3 PASS. |
| AC4 OSM attribution, tile subset CADN | **PASS** | `map/index.ts:5-9,99-107` có OSM attribution và CADN bounds; `docker-compose.yml` dùng TileServer GL, port 8080 và volume CADN read-only; `tests.md:655-700` ghi Geofabrik PBF/MBTiles thật, bbox, OSM attribution/license, health/style/TileJSON/PBF HTTP 200 và 6 probe `restarts=0`. |
| AC5 offline chỉ đọc basemap/cache, chặn write và giải thích | **PASS** | `MapWorkspace.tsx` hiển thị offline banner và khóa CTA ghi; `map/index.ts:233-236` ném `MAP_OFFLINE_WRITE_BLOCKED`; `map-permission-offline.test.ts:44-49` và `tests.md:595-608` xác nhận guard 5/5 nhóm permission/offline PASS. |
| AC6 loading/empty/error-retry/permission/masked | **PASS** | `MapWorkspace.tsx:260-315,380-413` có loading, retry/error, denied, masked, empty và trạng thái thao tác; `tests.md:608,710` ghi map smoke contract 4/4 và permission/offline PASS. |
| AC7 không hard-code Ba Đình, Nghĩa Trụ, Xuân Hòa, CA huyện | **PASS** | Đối chiếu diff/source map, API và tests: không có các chuỗi địa danh bị cấm; provider dùng bounds số CADN, marker dùng `organizationUnitId` runtime. Đây là kết luận từ diff thực tế. |
| AC8 provider contract thay tile endpoint không đổi domain/UI contract | **PASS** | `map-provider.test.ts:40-49` thay `tileBaseUrl`/`styleUrl` rồi so sánh marker trước/sau; `tests.md:595-608,706-712` ghi provider contract 6/6 PASS. |
| AC9 dependency sau approval ticket 00 | **PASS** | Ticket 00 đã approval image `maptiler/tileserver-gl:v5.6.0` và `maplibre-gl@6.11.1`; `package.json`/`package-lock.json` cùng có MapLibre 6.11.1; `tests.md:514,658-659` ghi generate và compose PASS. |
| AC10 không yêu cầu sửa `.env.example` | **PASS** | `changes.md:100-103,139-141` và `tests.md:504-505` ghi không sửa `.env`/`.env.example`; diff ticket không có thay đổi file này. |

## 2. Rubric bắt buộc

| Rubric | Kết quả | Bằng chứng |
|---|---|---|
| Geometry validation dùng contract `GeoPoint`/`GeoArea` | **PASS** | `map/index.ts:2-3,127-152` gọi contract canonical `createGeoPoint`/`createGeoArea`; `map-geometry.test.ts` 5/5 và `map-polygon.test.ts` 3/3; `tests.md:595-608`. |
| Không tạo generic `Event`; marker/polygon là projection domain | **PASS** | `map/index.ts:41-50,158-220` dùng `MapProjectionRow`, aggregate `Incident`/`Inspection` và projection GeoPoint/GeoArea; `markers/route.ts:26-53` đọc projection record; `changes.md:5-10` và `tests.md:608,714` xác nhận không tạo generic Event. |
| Không ghi tile credential/secret | **PASS** | `resolveMapProvider` chỉ nhận URL/attribution runtime; `map-provider.test.ts:68-74` kiểm tra không có token/secret/credential/password; không có `.env` trong changeset map. |

## 3. Rubric khuyến nghị

| Trục | Kết quả | Bằng chứng |
|---|---|---|
| Thiết kế/UI | **PASS — 2/2** | UI screen-01 yêu cầu shell, MapLibre, toggle, legend, point/polygon và các trạng thái; `MapWorkspace.tsx:260-413` triển khai các nhóm này. |
| Thao tác/UX | **PASS — 2/2** | Layer toggle, retry, offline banner và attribution hiện trong `MapWorkspace.tsx`; contract smoke/permission evidence tại `tests.md:608,710`. |
| Quy trình | **PASS — 2/2** | Các link E1-005 `/intake`, E1-005 queue `/incidents`, E1-007 `/inspections/establishments` trong `MapWorkspace.tsx`; API lọc OrganizationUnit tại `markers/route.ts:26-40`; phù hợp UI baseline screen-01. |

## 4. Đối chiếu từng bước thực hiện

| Bước | Kết quả | Bằng chứng |
|---|---|---|
| Provider adapter + tile OSS subset quanh CADN | **PASS** | Adapter tại `map/index.ts:78-113`; runtime artifact và metadata thật tại `tests.md:655-700`. |
| Workspace/map route, layer/legend/marker/polygon/trạng thái | **PASS** | `src/app/map/*`, `MapWorkspace.tsx`, và map-focused suite 5 files/23 tests PASS tại `tests.md:595-608`. |
| Nối map projection với event/read-model contract, không generic Event | **PASS** | `markers/route.ts:26-53`, `map/index.ts:158-220`; rubric projection PASS ở trên. |
| Thêm geometry/provider/permission/offline tests | **PASS** | `tests.md:595-608`: 5 files, 23 tests pass, 0 skip. Xác nhận riêng: **map-focused 23/23 PASS**. |
| Smoke tile health/OSM/fallback, không dùng fixture và không đánh dấu E1-001 pass | **PASS** | `tests.md:655-700`: PBF Geofabrik, MBTiles CADN thật, health/style/TileJSON/PBF HTTP 200, bbox/attribution/license, 6 probe `restarts=0`; API/provider giữ `official:false`. |
| Chạy bộ lệnh bắt buộc và ghi riêng kết quả map | **PASS trong phạm vi review map; toàn repo chưa sạch theo literal** | `tests.md:514-521,548-568,570-593,595-608,610-653`: các lệnh đã được Tester chạy và ghi; map suite PASS, lint PASS, và **format warnings in-scope đã hết, còn đúng 15 file ngoài scope**. Typecheck/build còn lỗi `scripts/demo/seed.ts`; `npm test` còn migration contract/seed; E2E còn unrelated failures/skips. |

## 5. Xác nhận runtime và phân loại lỗi còn lại

- **TileServer runtime thật: PASS.** Evidence `tests.md:655-700` xác nhận Geofabrik PBF → `cadn.mbtiles` thật, CADN bbox `105.93,20.91,106.03,20.99`, OSM attribution/license, health/style/TileJSON/PBF HTTP 200 và 6 stability probes với `restarts=0`.
- **Format in-scope: PASS.** `tests.md:546-568` ghi danh sách cuối còn 15 cảnh báo; không có file map/workspace trong danh sách. Vì vậy các cảnh báo format còn lại đều ngoài scope map.
- **Lỗi còn lại ngoài scope map:** `scripts/demo/seed.ts` (typecheck/build và một nhánh test), migration contract, và 12 unrelated E2E failures cùng 2 skips trong evidence authorization/read-model/parallel-wave. `tests.md:523-593,610-653` ghi rõ các lỗi này.
- Các lỗi trên vẫn khiến điều kiện **“done” của toàn repo theo literal** chưa sạch, nhưng không phải FAIL thực tế của AC/rubric map và không tạo căn cứ yêu cầu sửa file ngoài allow-list của ticket.

## 6. Kết luận bắt buộc

**PASS toàn bộ trong phạm vi ticket map:** AC1–AC10, 3 rubric bắt buộc, rubric khuyến nghị, từng bước triển khai map, map-focused 23/23 và TileServer runtime thật đều có evidence PASS. Không có lỗi thực tế trong scope map, không thiếu evidence cho các mục được giao, và không có dấu hiệu sai hướng tổng thể; **không REDO**.

**Caveat:** nếu “done” được hiểu là toàn bộ repository phải sạch tuyệt đối theo literal command matrix, trạng thái đó vẫn **chưa đạt** do các lỗi ngoài scope đã nêu ở mục 5. Reviewer không yêu cầu sửa các file ngoài allow-list; cần Planner quyết định cách xử lý baseline toàn repo riêng biệt.

## 7. Lesson learned và trục trặc

- Phiên review này không gặp trục trặc công cụ/hạ tầng cần tự xử lý.
- Không cập nhật `Lesson-learned.md` vì không phát sinh mục “Trục trặc gặp phải” mới; các lỗi verification còn lại là phát hiện trong evidence, không phải sự cố reviewer tự xử lý.

## Evidence đã đối chiếu

- Developer: `.brain/evidence/01-map-workspace-provider/changes.md`
- Tester: `.brain/evidence/01-map-workspace-provider/tests.md`
- Reviewer: `.brain/evidence/01-map-workspace-provider/review.md`
