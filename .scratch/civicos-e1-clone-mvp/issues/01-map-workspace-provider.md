# Nền tảng MapLibre và workspace PS-E1

- **Status:** ready-for-agent
- **Blocked by:** 00
- **File được phép sửa:**
  - `src/modules/platform/**`
  - `src/app/map/**`
  - `src/app/api/map/**`
  - `src/components/map/**`
  - `src/components/navigation/feature-registry.ts`
  - `src/components/shell/**` nếu cần nối workspace
  - `docker-compose.yml`
  - `package.json`
  - `package-lock.json`
  - `tests/**`
- **File cấm sửa:**
  - `.env`, `.env.*`
  - `.brain/**` — ngoại trừ `.brain/evidence/01-map-workspace-provider/**` theo role
  - `node_modules/**`
  - `**/secrets/**`

## Mô tả

Thêm workspace/map dùng MapLibre và adapter provider cho nền tảng chung của PS-E1. MVP dùng tile OSS subset quanh CADN, hiển thị `GeoPoint`/`GeoArea`, attribution OSM và trạng thái offline basemap. Adapter phải cho phép thay provider chính thức sau này; không tuyên bố hoàn tất AC độ chính xác chính thức của E1-001.

## Acceptance Criteria (bắt buộc — chặn done, PASS 100%)

- [x] Có route workspace/map được tích hợp vào shell/navigation hiện có và kiểm soát theo session/OrganizationUnit.
- [x] Map render được bằng MapLibre với provider OSS cấu hình được qua adapter, không đọc credential từ `.env` commit vào repo.
- [x] Hiển thị marker `GeoPoint`, polygon `GeoArea`, layer toggle, legend và trạng thái realtime update.
- [x] Có attribution OSM; tile subset quanh CADN được cấu hình cho môi trường clone.
- [x] Khi offline chỉ cho xem basemap/cache; mọi command ghi dữ liệu bị chặn và giải thích rõ lý do.
- [x] Có loading, empty viewport, provider/layer error + retry và permission-denied/masked state.
- [x] Không hard-code Ba Đình, Nghĩa Trụ, Xuân Hòa hoặc CA huyện trong map/workspace.
- [x] Provider adapter có contract test chứng minh có thể thay tile endpoint mà không đổi domain/UI contract.
- [x] Dependency `maplibre-gl` và tile-server/client dependency (nếu cần) chỉ được thêm sau khi ticket 00 ghi approval; nếu package đã có thì không cài lại.
- [x] Không yêu cầu sửa `.env.example`; cấu hình runtime dùng biến đã có hoặc ticket 00 phải xin quyền riêng.

## Rubric (mức độ đạt)

### Bắt buộc (chặn done — phải PASS 100%, Reviewer chấm như Acceptance Criteria)

- [x] Geometry validation dùng contract `GeoPoint`/`GeoArea` trong `src/modules/platform/`, nguồn: `spec.md#32-hồ-sơ-nghiệp-vụ` và `spec.md#25-bản-đồ-và-tích-hợp`.
- [x] Map không tạo entity generic `Event`; marker/polygon chỉ là projection của aggregate/domain data, nguồn: `spec.md#24-event-model`.
- [x] Không ghi tile credential/secret vào source hoặc `.env`, nguồn: `spec.md#26-bảo-mật-và-tích-hợp`.

### Khuyến nghị (không chặn done, chỉ ghi nhận — trừ khi dưới ngưỡng tối thiểu)

| Trục | Mô tả kỳ vọng | Thang điểm | Ngưỡng tối thiểu |
|---|---|---|---|
| Thiết kế/UI | Bám `.scratch/civicos-e1-clone-mvp/ui/screen-01-civic-os-workspace-map.md`; Stitch chưa khả dụng nên textual spec là baseline | 0–2 | 1 |
| Thao tác/UX | Layer toggle, retry, offline banner và attribution không che thao tác chính | 0–2 | 1 |
| Quy trình | Workspace dẫn được tới E1-004/E1-005/E1-007 và tôn trọng OrganizationUnit | 0–2 | 1 |

## Các bước thực hiện

- [x] Tạo provider adapter và cấu hình tile OSS subset quanh CADN.
- [x] Tạo workspace/map route, layer/legend/marker/polygon và các trạng thái UI.
- [x] Nối map projection với event/read-model contract hiện có mà không tạo generic Event.
- [x] Thêm test geometry, provider contract, permission và offline write guard.
- [x] Ghi smoke test map với tile health, OSM attribution và provider fallback; không dùng fallback để đánh dấu E1-001 pass.
- [x] Chạy `npm run prisma:generate`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run test:e2e` và `npm run build`; ghi riêng map smoke/contract test.

## Hợp đồng triển khai

- Input provider: endpoint/style/attribution được inject từ runtime; không hard-code secret hoặc source-specific token.
- Output read-model tối thiểu: `{ id, aggregateType, title, latitude, longitude, geometry?, status, updatedAt }`.
- `GeoPoint` là point marker; `GeoArea` là polygon đóng hợp lệ; không suy diễn polygon từ point.
- Error code tối thiểu: `MAP_PROVIDER_UNAVAILABLE`, `MAP_LAYER_FAILED`, `MAP_PERMISSION_DENIED`, `MAP_OFFLINE_WRITE_BLOCKED`.
- Ticket chỉ hoàn tất khi UI và API contract test chạy được trong local/staging-like environment đã được ticket 00 duyệt.

## Đang chờ Research

Không.

## Trạng thái cuối

pending
