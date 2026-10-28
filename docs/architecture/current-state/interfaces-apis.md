# Danh mục interface & API nội bộ (AS-IS)

Snapshot: baseline `567380b3c6fea42d359a99d41a8fe4e60134ffa9`, 2026-10-28. Số liệu: **64 file `src/app/api/**/route.ts` / 64 endpoint path**; mỗi file có thể export nhiều HTTP method (GET/POST/PUT/PATCH/DELETE). Đường dẫn đã chuẩn hoá: `[x]` = dynamic segment Next App Router. Bảng dưới ghi **63 endpoint path**; route công khai `/api/public/land/lookup` được trình bày riêng ở mục Land.

## Chú ý phân loại
- **Internal HTTP API** — Next Route Handler, cả web browser, mobile và demo runner đều gọi (mobile qua `CIVICOS_API_BASE_URL`, xem `ApiConfigModule.kt`). **Không có SDK public phát hành; mọi "API" đều là internal HTTP của app này.**
- **Outbound mock cục bộ (không mạng):** camera = `createMockCameraAdapter` (fixture, `src/modules/vehicles/mock-camera-adapter.ts`); CSDL quốc gia = `MockNationalLandAdapter` (không endpoint/mạng thật, `src/modules/land/national-land-adapter.ts`).
- **Biên dịch vụ bản đồ được cấu hình (chưa runtime-check):** provider mặc định là TileServer GL tại `http://localhost:8080` (`official:false`, `src/modules/platform/map/index.ts:9,78-98`); `/api/map/health` probe TileServer `/health`; `/api/maplibre-assets/[asset]` chỉ serve worker JS của maplibre-gl từ `node_modules/maplibre-gl/dist` theo allow-list — không phải sprite/glyph/tile của TileServer.
- Phân loại browser vs mobile: mobile API client có các luồng `auth/session`, `forces/*`, `related-info/*`, `map`, land read/public lookup, vehicle mobile detail; feature tác nghiệp hiện trường POST lệnh giới hạn qua `/api/sync` (`mobile/src/api/*`, `mobile/src/features/task/activitySync.ts`). Mobile không cần toàn bộ route; web dùng phần lớn còn lại.

## 1. Session / demo / nền tảng

| Route | Method | Mục đích | Ghi chú |
|---|---|---|---|
| `/api/auth/session` | GET, POST, DELETE | phiên đăng nhập | dùng cho web + mobile |
| `/api/demo/persona` | POST | đăng nhập persona demo | guard target-guard (local demo only) |
| `/api/health/worker` | GET | health worker | dùng khi kiểm tra worker |
| `/api/evidence` | POST, GET | evidence upload/list | storage-adapter platform |
| `/api/notifications` | GET, PATCH | thông báo | |

## 2. Incidents & intake

| Route | Method | Mục đích |
|---|---|---|
| `/api/intake-reports` | GET, POST | list/tạo tin báo |
| `/api/intake-reports/[reportId]` | GET | chi tiết tin báo |
| `/api/intake-reports/[reportId]/commands` | POST | lệnh verify/confirm/process/reject/close/convert_to_incident/transfer/approve_transfer |
| `/api/incidents` | GET, POST | list/tạo incident |
| `/api/incidents/[incidentId]` | GET | chi tiết incident |
| `/api/incidents/[incidentId]/commands` | POST | lệnh phân loại/phân công/phê duyệt/đóng |

## 3. Inspections

| Route | Method | Mục đích |
|---|---|---|
| `/api/establishments` | GET, POST | danh mục cơ sở |
| `/api/establishments/[establishmentId]` | GET, PATCH, DELETE | cập nhật cơ sở |
| `/api/inspections` | GET, POST | list/tạo kiểm tra |
| `/api/inspections/stats` | GET | dashboard |
| `/api/inspections/[inspectionId]` | GET, POST | chi tiết / fieldwork |
| `/api/inspections/[inspectionId]/commands` | POST | lệnh nghiệp vụ |

## 4. Vehicles

| Route | Method | Mục đích |
|---|---|---|
| `/api/vehicles/registry` | GET, PATCH, POST | registry xe cần chú ý |
| `/api/vehicles/statistics` | GET | thống kê |
| `/api/vehicles/observations` | GET, POST | quan sát hiện trường |
| `/api/vehicles/observations/[observationId]` | GET, POST | chi tiết + cập nhật |

Ghi chú giới hạn: `POST /api/vehicles/observations` nhận quan sát nhập tay; source cũng có fixture camera cục bộ (`src/modules/vehicles/mock-camera-adapter.ts`) nhưng fixture không tự cấp dữ liệu cho endpoint và không có camera thật.

## 5. Residents

| Route | Method | Mục đích |
|---|---|---|
| `/api/residents` | GET, POST | list/tạo subject |
| `/api/residents/[subjectId]` | GET, PATCH | chi tiết/cập nhật |
| `/api/residents/[subjectId]/management-records` | GET, POST | hồ sơ quản lý |
| `/api/residents/[subjectId]/management-records/[recordId]` | GET, PATCH, POST | chi tiết/lệnh |
| `/api/residents/[subjectId]/management-records/[recordId]/activities` | GET, POST | hoạt động |
| `/api/residents/reports/monthly` | GET, POST | báo cáo tháng |
| `/api/residents/reports/[reportId]/approve` | POST | phê duyệt |
| `/api/residents/reports/[reportId]/send` | POST | gửi |

## 6. Land (chi tiết nhất)

| Route | Method | Mục đích | Trạng thái |
|---|---|---|---|
| `/api/land/parcels` | GET, POST | list/tạo thửa | PostGIS geometry 4326 |
| `/api/land/parcels/[parcelId]` | GET | chi tiết thửa | |
| `/api/land/parcels/[parcelId]/evidence` | POST, GET | evidence thửa | |
| `/api/land/parties` | GET | list chủ thể đất | |
| `/api/land/parties/[partyId]/evidence` | POST, GET | evidence chủ thể | |
| `/api/land/applications` | GET, POST | list/tạo đơn biến động | |
| `/api/land/applications/[applicationId]` | GET | chi tiết | |
| `/api/land/applications/[applicationId]/review` | POST | review → in_review | |
| `/api/land/applications/[applicationId]/evidence` | POST, GET | evidence đơn | |
| `/api/land/applications/[applicationId]/sync` | POST | đẩy đơn biến động ra CSDL quốc gia | **mock adapter** |
| `/api/land/applications/[applicationId]/sync/retry` | POST | retry khi sync_failed | cùng adapter mock |
| `/api/land/applications/[applicationId]/approve` | POST | phê duyệt hồ sơ | |
| `/api/land/applications/[applicationId]/reject` | POST | từ chối | |
| `/api/land/applications/[applicationId]/timeline` | GET | timeline | |

**Public stream** (người dân tra cứu không cần đăng nhập): `GET /api/public/land/lookup` — trả `simulated: true`, chỉ đọc, không cần quyền.

## 7. Map (bản đồ)

| Route | Method | Mục đích | Trạng thái |
|---|---|---|---|
| `/api/map/config` | GET | cấu hình layer/tileserver | |
| `/api/map/health` | GET | health môi trường bản đồ | |
| `/api/map/layers` | GET | danh sách layer overlay | |
| `/api/map/markers` | GET | marker nghiệp vụ | |
| `/api/map/land-parcels` | GET | footprints thửa | trả `simulated: true`, client filter bắt buộc (`MapWorkspace.tsx:212`) |
| `/api/map/land-parcels/[parcelId]` | GET | chi tiết geometry | |
| `/api/maplibre-assets/[asset]` | GET | worker JS của maplibre-gl (allow-list, đọc từ `node_modules/maplibre-gl/dist`) | không phải sprite/glyph/tile của TileServer |

## 8. Identity

| Route | Method | Mục đích |
|---|---|---|
| `/api/identity/users` | GET, POST | quản lý user |
| `/api/identity/organization-units` | GET | đơn vị tổ chức |
| `/api/identity/assignments` | GET, POST, DELETE | phân công nhiệm vụ |

## 9. Nhóm mobile: forces / related-info / sync

| Route | Method | Mục đích | Client |
|---|---|---|---|
| `/api/forces/alarms` | GET | cảnh báo cho mobile | mobile |
| `/api/forces/dispatches` | GET | danh sách điều phối | mobile |
| `/api/forces/dispatches/[dispatchId]` | GET | chi tiết | mobile |
| `/api/forces/tasks` | GET | nhiệm vụ hiện trường | mobile |
| `/api/forces/tasks/[taskId]` | GET | chi tiết nhiệm vụ | mobile |
| `/api/forces/tasksbydispatchid` | GET | nhiệm vụ theo dispatch | mobile |
| `/api/related-info/counts` | GET | đếm related info | mobile |
| `/api/related-info/search` | GET | tìm kiếm | mobile |
| `/api/related-info/[entityType]/[id]` | GET | chi tiết liên quan | mobile |
| `/api/sync` | GET, POST | hàng đợi offline command | mobile (`OfflineCommand`, `activitySync.ts`) |

## 10. Seam nội bộ (không phải HTTP API)

Các seam nội bộ, dùng giữa các module, **không** đại diện public SDK:
- **Command services** mỗi module: ví dụ `src/modules/incidents/commands.ts` (registerIncident, registerIntakeReport, requestIncidentApproval...), `src/modules/land/application-service.ts` (createApplication, reviewApplication) và `sync-service.ts` (syncApplication, retryApplicationSync).
- **Eventing seam:** `appendEvent` + `registerEventConsumer` trong `src/modules/eventing/event-store.ts`; mỗi module đăng ký consumer (projection) tự khai báo; outbox để worker đồng bộ bất đồng bộ.
- **Read-model seam:** `reduceReadModel` / `upsertReadModel` với idempotent check trên `aggregateVersion` (`src/modules/eventing/read-model.ts:26-59`).
- **Platform seam:** SLA (`createSla`, `markOverdue`), evidence (storage-adapter), geo, map, notifications, field-sync (`src/modules/platform/*`).
- **Outbound (mock cục bộ):** camera là fixture (`createMockCameraAdapter`, `src/modules/vehicles/mock-camera-adapter.ts`), CSDL quốc gia là `MockNationalLandAdapter` không mạng (`src/modules/land/national-land-adapter.ts`); **riêng provider bản đồ** là biên dịch vụ thật được cấu hình (TileServer GL mặc định `http://localhost:8080`, `official:false` — `src/modules/platform/map/index.ts`), không được runtime check trong snapshot này.
- `/api/maplibre-assets/[asset]` **không phải proxy sprite/glyph/tile của TileServer**: nó đọc JS worker của thư viện maplibre-gl từ `node_modules/maplibre-gl/dist` theo allow-list (`src/app/api/maplibre-assets/[asset]/route.ts:1-47`), còn style/tiles thì MapLibre lấy trực tiếp từ provider TileServer.
- **Mock adapter seams:** `NationalLandAdapter` interface và `createMockCameraAdapter` factory là điểm tiêm adapter; việc thay adapter thật có thể yêu cầu điều chỉnh thêm ở command service/mapper — source hiện tại không chứng minh mọi lệnh gọi đều tương thích một adapter thật.
- **Chiều cần nhớ:** không có SDK public; chỉ HTTP nội bộ của app.

## Không tồn tại trong snapshot này

- **Không có** REST API public chuẩn hoá (không có OpenAPI/GraphQL schema đóng gói), không có API gateway, không có webhook outbound thật.
- **Không có** UI documentation tự sinh từ OpenAPI/GraphQL — chỉ các file Route Handler.
- **Không có** tài liệu endpoint mobile SDK ngoài code (`mobile/src/api/*`) được viết tay.
