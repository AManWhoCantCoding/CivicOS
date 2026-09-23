# Evidence — 01-map-workspace-provider (Developer)

## File đã sửa/thêm

- `src/modules/platform/map/index.ts` (mới): adapter provider OSS
  (`resolveMapProvider`, `mapTileHealthUrl`), projection
  (`toMapMarker`, `projectToMapMarkers`), phân quyền
  (`resolveMapPermission`, `maskMapMarker`), chặn ghi offline
  (`assertMapWriteAllowed`), mã lỗi `MAP_*`, bbox CADN và OSM
  attribution. Không tạo entity generic `Event`.
- `src/modules/platform/index.ts` (sửa): re-export contract map.
- `src/components/navigation/feature-registry.ts` (sửa): thêm module
  `map` và feature `map-workspace` cho role nghiệp vụ.
- `src/components/map/MapWorkspace.tsx` (mới): workspace client với
  layer toggle, legend, realtime 30s, attribution OSM, loading/empty/
  error-retry/denied/masked/offline banner và write guard.
- `src/components/map/index.ts` (mới): public contract map.
- `src/components/map/maplibre-gl.d.ts` (mới): shim kiểu tối thiểu để
  typecheck trước khi `maplibre-gl` được cài vào `node_modules`.
- `src/app/map/layout.tsx` (mới): bọc `ModuleShell module="map"`.
- `src/app/map/page.tsx` (mới): cổng `map-workspace` theo session.
- `src/app/api/map/config/route.ts` (mới): cấu hình provider runtime.
- `src/app/api/map/markers/route.ts` (mới): marker theo session/
  OrganizationUnit, mask khi thiếu `read_sensitive`.
- `src/app/api/map/health/route.ts` (mới): sức khỏe tile, `official`
  luôn `false` cho OSS.
- `docker-compose.yml` (sửa): thêm service `tileserver`
  `maptiler/tileserver-gl:v5.6.0`, port host `8080`, volume
  `./storage/tiles/cadn:/data:ro`.
- `package.json` (sửa): thêm `maplibre-gl@6.11.1` (BSD-3-Clause).
- `tests/map/map-geometry.test.ts` (mới): geometry và projection.
- `tests/map/map-provider.test.ts` (mới): contract đổi endpoint.
- `tests/map/map-permission-offline.test.ts` (mới): quyền và guard.
- `tests/map/map-smoke.test.ts` (mới): tile health, attribution,
  fallback không thay thế E1-001 chính thức.

## Patch Reviewer 2026-09-23 (polygon GeoArea + lockfile)

- `src/modules/platform/map/index.ts` (sửa): thêm
  `MapAreaFeatureCollection` + `toMapAreaGeoJson` chuyển marker có
  `GeoArea` thật thành GeoJSON Polygon `[lng, lat]`; marker point
  không geometry bị loại, không suy diễn polygon từ point.
- `src/components/map/MapWorkspace.tsx` (sửa): mở rộng
  `MapMarkerView` với `geometry?: { points }`, giữ marker/layer
  toggle/legend/realtime/offline/permission; sau khi dựng marker,
  vẽ polygon/fill qua GeoJSON source `map-areas` + layer
  `map-areas-fill`/`map-areas-line` trên sự kiện `load` của MapLibre.
- `src/components/map/maplibre-gl.d.ts` (sửa): bổ sung shim
  `on`/`addSource`/`getSource`/`addLayer` cho seam MapLibre mới.
- `tests/map/map-polygon.test.ts` (mới): chứng minh GeoArea thành
  polygon/fill khép kín, GeoPoint không vào layer polygon, không
  suy diễn polygon từ point lẻ.

## Package/install

- Không chạy `npm install` (Developer không chạy lệnh). Đã khai báo
  `maplibre-gl@6.11.1` trong `package.json` theo đúng package/version/
  command đã duyệt; `package-lock.json` chưa tái sinh.
- Vòng patch 2026-09-23: Planner cho phép chạy
  `npm install maplibre-gl@6.11.1` nhưng harness chặn mọi lệnh bash
  (kể cả `npm install` trần); lockfile vẫn chưa đồng bộ, cần
  Tester/hạ tầng chạy lại.

## Vòng sửa Tester fail 2026-09-23 (targeted, không redo)

- `src/components/map/MapWorkspace.tsx` (sửa):
  - narrowing `provider` possibly null: effect render chụp
    `const activeProvider = provider` rồi guard `!activeProvider`
    return sớm; closure async dùng `activeProvider` (const nên
    narrowing giữ nguyên), không dùng non-null assertion. Hiển thị
    khi provider unavailable giữ nguyên (loading/error + attribution
    fallback `© OpenStreetMap contributors`).
  - `react-hooks/set-state-in-effect`: tách `load` (chỉ fetch, mọi
    setState sau `await`, theo đúng pattern `useModuleSession`) khỏi
    `refresh` (reset loading/error/denied/masked + `void load()`,
    chỉ gọi từ handler nút). Effect mount giữ nguyên hình
    `void load()`. `online` khởi tạo lazy
    (`typeof window === 'undefined' || navigator.onLine`), effect chỉ
    đăng ký listener, không còn setState đồng bộ. Giữ nguyên offline
    banner, write guard, realtime 30s (interval refresh êm, không còn
    flash loading toàn màn hình mỗi chu kỳ).
  - Hai nút tải lại/làm mới chuyển `onClick={() => void load()}`
    thành `onClick={refresh}`.
- `tests/map/map-geometry.test.ts` (sửa): import `createGeoPoint`/
  `createGeoArea` từ seam canonical `@/modules/platform/geo` (đúng
  precedent `map-polygon.test.ts`), chỉ giữ `toMapMarker`/
  `projectToMapMarkers` từ `@/modules/platform/map`. Không duplicate
  geometry logic, không mở rộng public surface của map module.
- `src/modules/platform/map/index.ts` (sửa format): gộp 2 dòng còn
  vừa khổ 80 (`const attribution = ...`, `const http = ...`) theo
  Prettier canon (đo thủ công từng dòng, không chạy Prettier).
- `src/components/navigation/feature-registry.ts`,
  `tests/map/map-provider.test.ts`,
  `tests/map/map-permission-offline.test.ts`: rà soát thủ công toàn
  file (quotes/semicolons/trailing commas/arrow parens/ghép-tách
  dòng theo khổ 80) — không phát hiện lệch cấu trúc, giữ nguyên byte
  để tránh phá vỡ canon. Nghi ngờ flag Prettier đến từ yếu tố không
  nhìn được khi review tay (CRLF/tailwind class order); cần Tester
  rerun `format:check` để xác nhận.
- Không đụng `package.json`/`package-lock.json` (giữ lockfile Tester
  đã đồng bộ `maplibre-gl@6.11.1`), không sửa `scripts/demo/seed.ts`,
  migration tests, docs, file ngoài scope. Không chạy bất kỳ lệnh
  test/lint/typecheck/prettier/build/e2e nào.

## Vòng sửa Tester fail 2 2026-09-23 (targeted, 2 lỗi map)

- `src/components/map/MapWorkspace.tsx` (sửa):
  - TypeScript `activeProvider possibly null` (180,183): đổi
    `async function render()` thành
    `render(providerConfig: MapProviderView)`, dùng
    `providerConfig.bounds`/`styleUrl`, gọi
    `void render(activeProvider)` sau guard provider
    unavailable; không dùng non-null assertion.
  - ESLint `react-hooks/set-state-in-effect` (143): effect mount
    chuyển `void load()` trực tiếp thành schedule qua
    `window.setTimeout(..., 0)` có cleanup `clearTimeout`;
    effect chỉ subscribe/schedule. Giữ `refresh`/realtime 30s/
    offline guard nguyên trạng.
- Hand-format đúng Prettier canon cho dòng thay đổi, không chạy
  Prettier. Không đụng `scripts/demo/seed.ts`, migration tests,
  E2E fixtures, Lesson-learned, README/docs, file ngoài scope.
  Giữ nguyên `tests/map/**`, `package-lock.json`. Không chạy bất
  kỳ lệnh test/lint/typecheck/prettier/build/e2e nào.

## Vòng sửa Reviewer format:check 2026-09-24 (format-only, 2 file)

- `src/components/map/MapWorkspace.tsx` (sửa format, không đổi logic):
  tách tag JSX viết liền quá khổ 80 thành mỗi prop một dòng
  (`AccessDenied` denied, `fieldset` lớp dữ liệu, `span` legend emerald,
  `div` empty viewport). Giữ nguyên thứ tự class tailwind, text, handler.
- `src/modules/platform/map/index.ts` (sửa format, không đổi logic):
  tách `const http = ... || ...` (81 ký tự) thành break sau `=`.
- `src/components/navigation/feature-registry.ts`,
  `tests/map/map-permission-offline.test.ts`,
  `tests/map/map-provider.test.ts`: rà soát thủ công toàn file theo
  Prettier canon (khổ 80, quotes/semicolons/trailing commas/arrow parens,
  break `expect(`/member-chain/arrow-call theo repo precedent) — mọi cấu
  trúc đã khớp canon, giữ nguyên byte để tránh tạo lệch mới.
- Không đụng `Lesson-learned.md`, `scripts/demo/seed.ts`, migration tests,
  E2E, `.env*`, docs, file ngoài scope. Không chạy bất kỳ lệnh
  test/lint/typecheck/prettier/build/e2e nào. Không commit.

## Vòng áp canonical format Tester 2026-09-24 (format-only, 5 file)

- Nguồn canonical read-only: `format-canon-01-map/` (temp opencode,
  không sửa). Áp dụng byte-chính xác từng vùng, không đổi logic/chuỗi/
  class/behavior. Không chạy bất kỳ lệnh test/lint/typecheck/prettier/
  build/e2e nào. Không commit. Không đụng `Lesson-learned.md`.
- `src/components/map/MapWorkspace.tsx` (sửa format): gộp điều kiện
  `reason instanceof Error && reason.message === ...` một dòng; gộp
  `<AccessDenied ... />` một dòng; gộp `fieldset` + `legend` ("Lớp dữ
  liệu" một dòng); gộp `span` legend emerald (mở tag một dòng); gộp
  `div` empty viewport (mở tag một dòng).
- `src/components/navigation/feature-registry.ts` (sửa format): union
  `ModuleId` gộp một dòng sau `=` theo canonical.
- `src/modules/platform/map/index.ts` (sửa format): gộp `const allowed
  = session.roles.some((role) => MAP_VIEWER_ROLES.includes(role));`
  một dòng.
- `tests/map/map-permission-offline.test.ts` (sửa format): hai expect
  `user-2/commander` và `user-3/supervisor` theo canonical (gộp
  `expect(...)`, tách `.toBe(` xuống dòng).
- `tests/map/map-provider.test.ts` (sửa format): gộp
  `expect(() => resolveMapProvider({ attribution: 'Nguồn nội bộ' }))`
  rồi tách `.toThrow(` xuống dòng theo canonical.

## Điểm cần Tester xác minh (vòng này)

- Chạy `npm install` rồi `npm run prisma:generate`, `typecheck`,
  `lint`, `format:check`, `npm test`, `test:e2e`, `build`.
- `storage/tiles/cadn` chưa có tile data runtime (dữ liệu runtime, không
  commit); Tester build MBTiles từ Geofabrik theo batch đã duyệt rồi
  chạy map smoke/health thật. Không dùng fixture giả pass.
- Kiểm tra `/api/map/health` với TileServer đang chạy và OSM
  attribution hiển thị trên UI.
- Không sửa `.env`/`.env.example`, secrets, docs, `.scratch/**`.
