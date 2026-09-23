# Evidence — `01-map-workspace-provider` — vòng sửa lỗi 3

## Phạm vi, môi trường và recovery

- Đã đọc `Lesson-learned.md` trước mọi lệnh kiểm tra.
- Không sửa source/tests/package, không cài thêm package/tool/image, không migrate/reset/drop database, không commit.
- Mỗi lệnh được chạy riêng qua native Windows PowerShell với wrapper `Invoke-Safe`; lệnh sau vẫn chạy sau khi lệnh trước fail.
- `docker info`: **PASS**; Docker Desktop context `desktop-linux`, Server `29.6.2`.
- `docker compose up -d postgres`: **PASS**; PostgreSQL được giữ chạy cuối phiên.
- Không chạy `docker compose down`.
- Cuối phiên: `civicos-postgres-1` **Up**, `0.0.0.0:5432` và `[::]:5432` LISTENING; không còn listener LISTENING ở `3000`, `3001`, `8080`. Các dòng `TIME_WAIT` của `8080` là kết nối health-poll đã đóng, không phải tiến trình còn chạy.

## Lệnh bắt buộc

| Lệnh | Trạng thái | Kết quả |
|---|---|---|
| `npm run prisma:generate` | PASS | Prisma Client v6.19.3 generated |
| `npm run typecheck` | FAIL | 4 lỗi TypeScript, đều tại `scripts/demo/seed.ts`; không còn lỗi map trong output |
| `npm run lint` | PASS | ESLint exit 0 |
| `npm run format:check` | FAIL | 20 files có style issues |
| `npm test` | FAIL | 32 suites pass, 2 fail, 13 skipped; 133 pass, 2 fail, 155 skipped |
| `npx vitest run tests/map` | PASS | 5 files, 23 tests pass, 0 skip |
| `npm run test:e2e` | FAIL | 116 pass, 12 fail, 2 skipped; 15.0m, không timeout |
| `npm run build` | FAIL | Compile pass, TypeScript check fail với 4 lỗi `scripts/demo/seed.ts` |

### Typecheck output nguyên văn

```text
scripts/demo/seed.ts(29,9): error TS2451: Cannot redeclare block-scoped variable 'incidents'.
scripts/demo/seed.ts(30,9): error TS2451: Cannot redeclare block-scoped variable 'inspections'.
scripts/demo/seed.ts(161,17): error TS2451: Cannot redeclare block-scoped variable 'incidents'.
scripts/demo/seed.ts(161,28): error TS2451: Cannot redeclare block-scoped variable 'inspections'.
```

### Format-check output nguyên văn

```text
[warn] Lesson-learned.md
[warn] README.md
[warn] src/components/incidents/IncidentStatusActions.tsx
[warn] src/components/incidents/IntakeReportForm.tsx
[warn] src/components/incidents/useIncidentSession.ts
[warn] src/components/map/MapWorkspace.tsx
[warn] src/components/navigation/feature-registry.ts
[warn] src/modules/identity/assignments.ts
[warn] src/modules/identity/contracts.ts
[warn] src/modules/incidents/commands.ts
[warn] src/modules/incidents/domain.ts
[warn] src/modules/platform/map/index.ts
[warn] tests/demo/demo-bootstrap.test.ts
[warn] tests/e2e/ps005-incident.spec.ts
[warn] tests/identity/capability-policy.test.ts
[warn] tests/incidents/incident-approval.postgres.test.ts
[warn] tests/incidents/incident-authorization.postgres.test.ts
[warn] tests/integration/parallel-wave-replay.integration.test.ts
[warn] tests/map/map-permission-offline.test.ts
[warn] tests/map/map-provider.test.ts
[warn] Code style issues found in 20 files. Run Prettier with --write to fix.
```

### `npm test` lỗi nguyên văn và skip count

```text
FAIL tests/demo/demo-bootstrap.test.ts
Error: Transform failed with 2 errors:
D:/Project/CivicOS/scripts/demo/seed.ts:161:16: ERROR: The symbol "incidents" has already been declared
D:/Project/CivicOS/scripts/demo/seed.ts:161:27: ERROR: The symbol "inspections" has already been declared
Plugin: vite:esbuild
File: D:/Project/CivicOS/scripts/demo/seed.ts:161:16
```

```text
FAIL tests/integration/schema-and-migration.test.ts > database migration contract > applies Event kernel, Identity, platform, PS-E1-005, PS-E1-007 and PS-E1-009 migrations in dependency order
AssertionError: expected [ '0001_event_first', …(10) ] to deeply equal [ '0001_event_first', …(8) ]
```

```text
FAIL tests/integration/schema-and-migration.test.ts > database migration contract > keeps every migration additive with no destructive SQL
AssertionError: expected 'DROP INDEX "ChecklistTemplate_establi…' to match /IF\s+EXISTS/i
Received: "DROP INDEX \"ChecklistTemplate_establishmentType_version_active_idx\""
```

```text
Test Files  2 failed | 32 passed | 13 skipped (47)
Tests  2 failed | 133 passed | 155 skipped (290)
```

Phân loại theo phạm vi: `scripts/demo/seed.ts` là lỗi pre-existing ngoài scope map; hai lỗi migration contract là lỗi pre-existing ngoài scope map. Các test map trong full suite đều pass; không có skip trong `tests/map`.

## Map-focused result

Lệnh: `npx vitest run tests/map`

```text
✓ tests/map/map-provider.test.ts (6 tests)
✓ tests/map/map-geometry.test.ts (5 tests)
✓ tests/map/map-smoke.test.ts (4 tests)
✓ tests/map/map-polygon.test.ts (3 tests)
✓ tests/map/map-permission-offline.test.ts (5 tests)

Test Files  5 passed (5)
Tests  23 passed (23)
```

Map contract/test coverage:

| Nhóm | Kết quả | AC/rubric liên quan |
|---|---:|---|
| Provider adapter, endpoint replacement, fallback contract | 6/6 pass | AC2, AC8 |
| GeoPoint/GeoArea geometry validation | 5/5 pass | Rubric geometry, AC3 |
| Polygon projection | 3/3 pass | AC3, rubric không tạo generic Event |
| Permission/offline write guard | 5/5 pass | AC1, AC5, AC6 |
| Compose/attribution/provider smoke contract | 4/4 pass | AC2, AC4, AC6, AC8 |

## Map smoke runtime

- `docker compose config`: **PASS**.
- Image: `maptiler/tileserver-gl:v5.6.0`.
- Port: `8080:8080`.
- Volume: `D:\Project\CivicOS\storage\tiles\cadn` -> `/data`, `read_only: true`.
- `storage/tiles/cadn`: tồn tại nhưng rỗng, không có tile runtime data/fixture.
- Tool survey: `osmium`, `tippecanoe`, `pmtiles`, `tilemaker` đều `NOT FOUND`. Không cài hoặc tải bất kỳ tool/image/package nào.
- `docker compose up -d tileserver`: container dùng đúng image nhưng restart loop.
- Health-poll nguyên văn:

```text
The underlying connection was closed: The connection was closed unexpectedly.
The underlying connection was closed: The connection was closed unexpectedly.
The underlying connection was closed: The connection was closed unexpectedly.
The underlying connection was closed: The connection was closed unexpectedly.
The underlying connection was closed: The connection was closed unexpectedly.
The underlying connection was closed: The connection was closed unexpectedly.
The operation has timed out.
Unable to connect to the remote server.
The underlying connection was closed: The connection was closed unexpectedly.
The operation has timed out.
```

- Tile log nguyên văn:

```text
Starting tileserver-gl v5.6.0
No input file found
[DEMO] Downloading sample data (zurich_switzerland.mbtiles) from https://github.com/maptiler/tileserver-gl/releases/download/v1.3.0/zurich_switzerland.mbtiles
Uncaught Exception: [Error: EROFS: read-only file system, open 'zurich_switzerland.mbtiles'] {
  errno: -30,
  code: 'EROFS',
  syscall: 'open',
  path: 'zurich_switzerland.mbtiles'
}
Stack: Error: EROFS: read-only file system, open 'zurich_switzerland.mbtiles'
Error downloading file: Cannot pipe to a closed or destroyed stream
```

- Kết quả runtime: **BLOCKED/FAIL**. Không xác nhận được live CADN bbox, OSM attribution hoặc runtime provider fallback vì thiếu tile data và TileServer restart loop. Contract assertions tương ứng vẫn **PASS** ở Vitest.
- Đã `docker compose stop tileserver` riêng; PostgreSQL không bị stop.

## E2E result

- Lệnh: `npm run test:e2e`.
- Môi trường: Playwright `130 tests`, `1 worker`, Chromium và mobile.
- Kết quả: `116 passed`, `12 failed`, `2 skipped`, `15.0m`; không timeout ở cấp runner.
- 12 fail là 6 scenario lặp trên Chromium/mobile, đều là E2E ngoài map: evidence upload authorization (2), read-model wait (2), parallel-wave setup/overflow (1), authorization matrix setup (1).
- 2 skipped: Chromium mobile drawer; mobile desktop-sidebar.

Các lỗi nguyên văn đại diện cho từng nhóm:

```text
Error: expect(received).toBe(expected) // Object.is equality
Expected: 201
Received: 403
at tests/e2e/evidence-authorization.spec.ts:66:27
```

```text
Error: expect(received).toBe(expected) // Object.is equality
Expected: true
Call Log:
- Timeout 90000ms exceeded while waiting on the predicate
at tests/e2e/parallel-wave-read-model.spec.ts:36:6
at tests/e2e/parallel-wave-read-model.spec.ts:65:9
at tests/e2e/parallel-wave-read-model.spec.ts:125:9
```

```text
Error: expect(received).toBe(expected) // Object.is equality
Expected: true
at tests/e2e/parallel-wave.spec.ts:35:25
at tests/e2e/parallel-wave.spec.ts:207:22
at tests/e2e/parallel-wave.spec.ts:626:22
```

Phân loại: các fail này là unrelated E2E ngoài scope map; không có testcase map-specific fail trong run được giao.

## Build output nguyên văn

```text
✓ Compiled successfully in 1941ms
  Running TypeScript ...
scripts/demo/seed.ts(29,9): error TS2451: Cannot redeclare block-scoped variable 'incidents'.
scripts/demo/seed.ts(30,9): error TS2451: Cannot redeclare block-scoped variable 'inspections'.
scripts/demo/seed.ts(161,17): error TS2451: Cannot redeclare block-scoped variable 'incidents'.
scripts/demo/seed.ts(161,28): error TS2451: Cannot redeclare block-scoped variable 'inspections'.
Failed to type check.
```

## AC mapping

- AC1 route/session/OrganizationUnit: map permission/offline contract PASS 5/5; full E2E có 116 pass nhưng 12 unrelated fail và 2 skip, nên không có full-suite sạch để xác nhận UI end-to-end.
- AC2 MapLibre/provider OSS/config/no credential: provider contract PASS 6/6; smoke config PASS; runtime tile BLOCKED/FAIL.
- AC3 marker/polygon/layer/legend/realtime: geometry 5/5 và polygon 3/3 PASS; không có map-specific E2E runtime pass.
- AC4 OSM/CADN: compose image/port/volume PASS; OSM/CADN live runtime BLOCKED/FAIL vì tile data thiếu.
- AC5 offline read-only/write guard: permission/offline 5/5 PASS.
- AC6 loading/empty/error/retry/permission/masked: map smoke contract 4/4 và permission/offline PASS; unrelated full E2E fail.
- AC7 không hard-code tên địa danh cấm: không chạy lệnh riêng trong phạm vi được giao; không suy diễn từ các lệnh khác.
- AC8 provider adapter contract: 6/6 PASS.
- AC9 dependency approval: `maplibre-gl@6.11.1` đã có; không install lại.
- AC10 không sửa `.env.example`: không sửa.
- Rubric geometry validation: PASS 5/5.
- Rubric không tạo generic `Event`: map contract PASS theo targeted suite.
- Rubric không ghi tile credential/secret: không có lệnh riêng trong phạm vi được giao; không sửa source/.env.

## Trục trặc gặp phải

- TileServer restart loop do input directory rỗng/read-only; đã retry health poll, thu thập log nguyên văn, rồi stop riêng `tileserver`. Không tải fixture và không cài tool/image/package.
- Một lần đọc file đầu phiên dùng path Windows malformed với control character; đã retry bằng verified forward-slash path và đọc thành công. Đã thử cập nhật mục bài học tương ứng nhưng harness từ chối edit `Lesson-learned.md` ngoài allow-list; không bypass. Mục tương tự đã tồn tại ở `Lesson-learned.md` mục 38 và được viện dẫn, không tạo mục trùng.
- Không có tiến trình app/tile còn sót cuối phiên; PostgreSQL vẫn chạy theo yêu cầu.

## Runtime tile data và tile smoke — lần thực thi tiếp theo

- Đã đọc toàn bộ ticket `01-map-workspace-provider.md`, ticket-00 approval trong `00-agent-preflight-permissions-infra.md` và `Lesson-learned.md` trước khi chạy lệnh.
- Không sửa source/tests/package/docker-compose, không cài dependency host, không commit; chỉ ghi evidence này. Dữ liệu tile là runtime artifact trong `storage/tiles/cadn` và không đưa vào git.
- Disk preflight: `D:` còn `210173947904` bytes trống; vượt yêu cầu tối thiểu 10 GB.
- Network preflight: `HEAD https://download.geofabrik.de/asia/vietnam-latest.osm.pbf` trả `Content-Length: 329120265`, `Content-Type: application/octet-stream`, `Accept-Ranges: bytes`.
- Nguồn OSM: `https://download.geofabrik.de/asia/vietnam-latest.osm.pbf`.
- PBF đã tải: `storage/tiles/cadn/vietnam-latest.osm.pbf`, size `329120265` bytes, SHA-256 `3B03E0DE5ADD781BB3B68C71FBF651D432C88C534CDA600BEE50C95A3AB5627A`.
- Bbox build: `105.93,20.91,106.03,20.99` (CADN).
- Tool path: ephemeral locally-built OSS Tilemaker image `civicos-tilemaker:v3.2.0`, source tag `systemed/tilemaker v3.2.0`, resolved source commit `c7d1dbfaf87baa9e0bc9b2e984e0dae90dcf00c5`, image ID/digest `sha256:dfd8c910c224b06ef67ad22901109ede3b2b15037fc69a476488cfc1842446d0`.
- Build base: `ubuntu:24.04`; Dockerfile installed build dependencies inside the ephemeral image and built Tilemaker; no host package was installed. Registry probes for `ghcr.io/systemed/tilemaker:2.4.0` and `:2.0.0` returned `manifest unknown`; `stefanpoehler/tilemaker:2.4.0` returned `unauthorized`, so the pinned source-build path was used.
- Exact build command:

```text
docker run --rm --mount type=bind,source=D:/Project/CivicOS/storage/tiles/cadn,target=/data --mount type=bind,source=C:/Users/GODxDE~1/AppData/Local/Temp/opencode/cadn-tilemaker,target=/cfg,readonly civicos-tilemaker:v3.2.0 /usr/local/bin/tilemaker --input /data/vietnam-latest.osm.pbf --output /data/cadn.mbtiles --config /cfg/config-openmaptiles.json --process /cfg/process-openmaptiles.lua --bbox 105.93,20.91,106.03,20.99 --threads 2
```

- Tile output: `storage/tiles/cadn/cadn.mbtiles`, size `2752512` bytes, final SHA-256 `255D4CAC93D46CA1A48B71FCC48992C2832180E70BF5875AEFDA18013DAC55F0`.
- MBTiles metadata raw verification:

```text
[('attribution', '© OpenStreetMap contributors'), ('bounds', '105.930000,20.910000,106.030000,20.990000'), ('license', 'https://www.openstreetmap.org/copyright'), ('maxzoom', '14'), ('minzoom', '0'), ('name', 'Tilemaker to OpenMapTiles schema')]
```

- `docker compose config`: PASS; effective TileServer image `maptiler/tileserver-gl:v5.6.0`, image digest `sha256:3a9ccdb24820b6814c8119bcc8a4376c39867cb0ffe69d62919ef898b90c2427`, host port `8080:8080`, bind `storage/tiles/cadn` to `/data` read-only.
- TileServer smoke raw result:

```text
URL=http://localhost:8080/health STATUS=200 TYPE=text/html; charset=utf-8 BYTES=2
URL=http://localhost:8080/styles/basic-preview/style.json STATUS=200 TYPE=application/json; charset=utf-8 BYTES=14704
URL=http://localhost:8080/data/v3.json STATUS=200 TYPE=application/json; charset=utf-8 BYTES=2386
URL=http://localhost:8080/data/v3/14/13012/7214.pbf STATUS=200 TYPE=application/x-protobuf BYTES=94145
```

- `mapTileHealthUrl` dùng `/health`; endpoint đã trả HTTP 200. Style endpoint thực tế được TileServer tạo là `/styles/basic-preview/style.json`; vector TileJSON là `/data/v3.json`; tile endpoint là `/data/v3/{z}/{x}/{y}.pbf`.
- TileJSON raw assertions: `bounds:[105.93,20.91,106.03,20.99]`, `minzoom:0`, `maxzoom:14`, `attribution:"© OpenStreetMap contributors"`, `license:"https://www.openstreetmap.org/copyright"`, `basename:"cadn.mbtiles"`.
- Ổn định container: sau 6 probe cách nhau 5 giây, `status=running health=healthy restarts=0`; không còn restart loop ở lần chạy có MBTiles thật. Đã `docker compose stop tileserver` riêng sau smoke; không chạy `docker compose down`.
- Trạng thái cuối: `civicos-postgres-1` vẫn `Up`, port `5432` còn bind `0.0.0.0:5432` và `[::]:5432`; TileServer đã stopped riêng, không còn listener `8080`.

### Trục trặc công cụ/hạ tầng trong lần này

- Wrapper `Invoke-Safe` bản đầu đọc job sau khi job đã tự được dọn nên phát `Get-Job ... job ... was not found`; đã sửa wrapper cục bộ cho các lệnh sau bằng cách lưu state trước `Receive-Job` và cleanup có kiểm soát.
- Các action `Start-Job` đầu tiên không kế thừa working directory repo nên PowerShell tìm `C:\Users\GODxDEMON\Documents\storage`; đã thêm `Set-Location D:/Project/CivicOS` bên trong từng action.
- Build image lần đầu thiếu CA certificates nên `git clone` trả nguyên văn `fatal: unable to access 'https://github.com/systemed/tilemaker.git/': server certificate verification failed. CAfile: none CRLfile: none`; đã thêm `ca-certificates` vào ephemeral Dockerfile và build lại thành công, không tắt TLS verification.
- Đã thử cập nhật `Lesson-learned.md` theo quy định Tester nhưng permission policy từ chối edit ngoài allow-list; không bypass. Bài học tương tự về path/tool đã có ở các mục hiện hữu trong `Lesson-learned.md`.

## Vòng verification sau targeted format — 2026-09-24

### Phạm vi và môi trường

- Đã đọc toàn bộ ticket `01-map-workspace-provider.md`, `Lesson-learned.md` và evidence hiện có trước khi chạy.
- Không sửa source/tests/package/docker-compose, không cài package/tool/image, không tải lại PBF, không commit. Chỉ cập nhật file evidence này.
- Mỗi lệnh được chạy riêng qua native Windows PowerShell với wrapper `Invoke-Safe`, có timeout riêng; lệnh sau vẫn chạy sau khi lệnh trước fail.
- `docker.exe info`: PASS; context `desktop-linux`, Docker Desktop Server `29.6.2`.
- `docker.exe compose up -d postgres`: PASS; PostgreSQL được giữ Up.

### Kết quả từng lệnh

| Lệnh | Kết quả | Số liệu/skip |
|---|---|---|
| `npm run prisma:generate` | PASS | Prisma Client v6.19.3 generated |
| `npm run typecheck` | FAIL ngoài scope map | 4 lỗi tại `scripts/demo/seed.ts` |
| `npm run lint` | PASS | ESLint exit 0 |
| `npm run format:check` | FAIL | 20 files; trong đó 5 file map/workspace thuộc scope |
| `npm test` | FAIL ngoài scope map | 32 suites pass, 2 fail, 13 skipped; 133 pass, 2 fail, 155 skipped |
| `npx vitest run tests/map` | PASS | 5 files, 23 pass, 0 skip |
| `npm run test:e2e` | FAIL ngoài scope map | 116 pass, 12 fail, 2 skipped; 15.4m |
| `npm run build` | FAIL ngoài scope map | compile pass, TypeScript check fail với 4 lỗi seed |

### Raw output — typecheck/build

```text
scripts/demo/seed.ts(29,9): error TS2451: Cannot redeclare block-scoped variable 'incidents'.
scripts/demo/seed.ts(30,9): error TS2451: Cannot redeclare block-scoped variable 'inspections'.
scripts/demo/seed.ts(161,17): error TS2451: Cannot redeclare block-scoped variable 'incidents'.
scripts/demo/seed.ts(161,28): error TS2451: Cannot redeclare block-scoped variable 'inspections'.
```

Build cũng ghi nguyên văn:

```text
✓ Compiled successfully in 2.2s
  Running TypeScript ...
scripts/demo/seed.ts(29,9): error TS2451: Cannot redeclare block-scoped variable 'incidents'.
scripts/demo/seed.ts(30,9): error TS2451: Cannot redeclare block-scoped variable 'inspections'.
scripts/demo/seed.ts(161,17): error TS2451: Cannot redeclare block-scoped variable 'incidents'.
scripts/demo/seed.ts(161,28): error TS2451: Cannot redeclare block-scoped variable 'inspections'.
Failed to type check.
```

Phân loại: `scripts/demo/seed.ts` là ngoài scope map.

### Raw output — format-check

```text
Checking formatting...
[warn] Lesson-learned.md
[warn] README.md
[warn] src/components/incidents/IncidentStatusActions.tsx
[warn] src/components/incidents/IntakeReportForm.tsx
[warn] src/components/incidents/useIncidentSession.ts
[warn] src/components/map/MapWorkspace.tsx
[warn] src/components/navigation/feature-registry.ts
[warn] src/modules/identity/assignments.ts
[warn] src/modules/identity/contracts.ts
[warn] src/modules/incidents/commands.ts
[warn] src/modules/incidents/domain.ts
[warn] src/modules/platform/map/index.ts
[warn] tests/demo/demo-bootstrap.test.ts
[warn] tests/e2e/ps005-incident.spec.ts
[warn] tests/identity/capability-policy.test.ts
[warn] tests/incidents/incident-approval.postgres.test.ts
[warn] tests/incidents/incident-authorization.postgres.test.ts
[warn] tests/integration/parallel-wave-replay.integration.test.ts
[warn] tests/map/map-permission-offline.test.ts
[warn] tests/map/map-provider.test.ts
[warn] Code style issues found in 20 files. Run Prettier with --write to fix.
```

Phân loại: 15 file ngoài scope; 5 file map/workspace trong scope là `MapWorkspace.tsx`, `feature-registry.ts`, `src/modules/platform/map/index.ts`, `tests/map/map-permission-offline.test.ts`, `tests/map/map-provider.test.ts`.

### Raw output — `npm test`

```text
FAIL tests/demo/demo-bootstrap.test.ts
Error: Transform failed with 2 errors:
D:/Project/CivicOS/scripts/demo/seed.ts:161:16: ERROR: The symbol "incidents" has already been declared
D:/Project/CivicOS/scripts/demo/seed.ts:161:27: ERROR: The symbol "inspections" has already been declared
Plugin: vite:esbuild
File: D:/Project/CivicOS/scripts/demo/seed.ts
```

```text
FAIL tests/integration/schema-and-migration.test.ts > database migration contract > applies Event kernel, Identity, platform, PS-E1-005, PS-E1-007 and PS-E1-009 migrations in dependency order
AssertionError: expected [ '0001_event_first', …(10) ] to deeply equal [ '0001_event_first', …(8) ]

FAIL tests/integration/schema-and-migration.test.ts > database migration contract > keeps every migration additive with no destructive SQL
AssertionError: expected 'DROP INDEX "ChecklistTemplate_establi…' to match /IF\s+EXISTS/i
Received: "DROP INDEX \"ChecklistTemplate_establishmentType_version_active_idx\""
```

```text
Test Files  2 failed | 32 passed | 13 skipped (47)
Tests  2 failed | 133 passed | 155 skipped (290)
```

Phân loại: seed và hai migration-contract assertion là ngoài scope map. Tất cả map test xuất hiện trong full suite đều pass.

### Raw output — map-focused

```text
✓ tests/map/map-geometry.test.ts (5 tests)
✓ tests/map/map-provider.test.ts (6 tests)
✓ tests/map/map-polygon.test.ts (3 tests)
✓ tests/map/map-permission-offline.test.ts (5 tests)
✓ tests/map/map-smoke.test.ts (4 tests)

Test Files  5 passed (5)
Tests  23 passed (23)
```

Coverage AC: provider adapter/endpoint replacement/fallback = AC2, AC8; geometry/polygon = AC3 và rubric; permission/offline write guard = AC1, AC5, AC6; compose/attribution/provider smoke contract = AC2, AC4, AC6, AC8.

### Raw output — E2E failures và skips

```text
12 failed
  [chromium] evidence-authorization.spec.ts:49 authorized upload persists hash, actor, capture time, and GPS, then downloads and dedupes
  [chromium] evidence-authorization.spec.ts:140 unassigned user cannot upload to or download another resource
  [chromium] parallel-wave-read-model.spec.ts:43 intake report created in UI appears in incident list and detail read model
  [chromium] parallel-wave-read-model.spec.ts:98 establishment and inspection created in UI appear in catalog and detail read model
  [chromium] parallel-wave.spec.ts:203 three operational surfaces have no horizontal overflow and no clipped actions
  [chromium] parallel-wave.spec.ts:605 401 and 403 authorization matrix covers five principals across three surfaces
  [mobile] evidence-authorization.spec.ts:49 authorized upload persists hash, actor, capture time, and GPS, then downloads and dedupes
  [mobile] evidence-authorization.spec.ts:140 unassigned user cannot upload to or download another resource
  [mobile] parallel-wave-read-model.spec.ts:43 intake report created in UI appears in incident list and detail read model
  [mobile] parallel-wave-read-model.spec.ts:98 establishment and inspection created in UI appear in catalog and detail read model
  [mobile] parallel-wave.spec.ts:203 three operational surfaces have no horizontal overflow and no clipped actions
  [mobile] parallel-wave.spec.ts:605 401 and 403 authorization matrix covers five principals across three surfaces
2 skipped
116 passed (15.4m)
```

Nguyên văn lỗi upload (4 ca chromium/mobile cùng dạng):

```text
Error: expect(received).toBe(expected) // Object.is equality
Expected: 201
Received: 403
at tests/e2e/evidence-authorization.spec.ts:66:27
```

Nguyên văn lỗi tạo resource (4 ca chromium/mobile cùng dạng):

```text
Error: expect(received).toBe(expected) // Object.is equality
Expected: true
at tests/e2e/parallel-wave.spec.ts:35:25
at tests/e2e/parallel-wave.spec.ts:207:22
at tests/e2e/parallel-wave.spec.ts:626:22
```

Nguyên văn lỗi read-model (4 ca chromium/mobile cùng dạng):

```text
Error: expect(received).toBe(expected) // Object.is equality
Expected: true
Call Log:
- Timeout 90000ms exceeded while waiting on the predicate
at tests/e2e/parallel-wave-read-model.spec.ts:36:6
at tests/e2e/parallel-wave-read-model.spec.ts:65:9
at tests/e2e/parallel-wave-read-model.spec.ts:125:9
```

Phân loại: 12 fail và 2 skip đều thuộc evidence authorization/read-model/parallel-wave, ngoài scope map; không có map-specific E2E case trong run này.

### Tile smoke runtime

- Runtime artifact `storage/tiles/cadn/cadn.mbtiles` đã tồn tại; không tải lại PBF.
- `docker compose config`: PASS; image `maptiler/tileserver-gl:v5.6.0`, port `8080:8080`, bind `storage/tiles/cadn` vào `/data` read-only.
- Start riêng `docker compose up -d tileserver`: PASS.

Raw poll/assertion output:

```text
probe=1 health_status=200
URL=http://localhost:8080/styles/basic-preview/style.json STATUS=200 TYPE=application/json; charset=utf-8 BYTES=14704
URL=http://localhost:8080/data/v3.json STATUS=200 TYPE=application/json; charset=utf-8 BYTES=2386
URL=http://localhost:8080/data/v3/14/13012/7214.pbf STATUS=200 TYPE=application/x-protobuf BYTES=44542
tilejson_bounds=105.93,20.91,106.03,20.99
tilejson_minzoom=0 maxzoom=14
tilejson_attribution=© OpenStreetMap contributors
tilejson_license=https://www.openstreetmap.org/copyright
tilejson_basename=cadn.mbtiles
stability_probe=1 status=running health=starting restarts=0
stability_probe=2 status=running health=starting restarts=0
stability_probe=3 status=running health=healthy restarts=0
stability_probe=4 status=running health=healthy restarts=0
stability_probe=5 status=running health=healthy restarts=0
stability_probe=6 status=running health=healthy restarts=0
```

Các assertion bbox/OSM attribution/license pass. TileServer được stop riêng bằng `docker compose stop tileserver`; không dùng `docker compose down`. PostgreSQL vẫn `Up`, port `5432` còn LISTENING; port `8080` đã được giải phóng. Không còn app listener `3000`/`3001`.

### AC mapping của vòng này

- AC1: targeted permission/offline 5/5 PASS; full E2E không có map-specific fail nhưng có 12 unrelated fail/2 skip.
- AC2: provider 6/6 PASS; compose và live style/TileJSON/PBF 200 PASS.
- AC3: geometry 5/5, polygon 3/3 PASS; không có map-specific E2E.
- AC4: live bbox `105.93,20.91,106.03,20.99`, OSM attribution và license PASS; 6 stability probes, restarts 0.
- AC5: permission/offline 5/5 PASS.
- AC6: map smoke contract 4/4 và permission/offline PASS; unrelated E2E failures được phân loại riêng.
- AC7: không có lệnh riêng phát hiện hard-code; không sửa source.
- AC8: provider contract 6/6 PASS.
- AC9/AC10: không install; không sửa `.env.example`.
- Rubric geometry: PASS 5/5; generic `Event`: map contract PASS; tile credential/secret: không có test failure hoặc thay đổi source trong vòng này.

### Tool/recovery table

| Bước | Tool/recovery | Kết quả |
|---|---|---|
| Docker preflight | native `docker.exe info` | PASS, `desktop-linux` |
| DB readiness | `docker.exe compose up -d postgres` | PostgreSQL giữ Up |
| Mỗi verification command | native PowerShell `Invoke-Safe`, timeout riêng | Không timeout; lệnh sau chạy tiếp sau FAIL |
| Runtime tile | dùng `storage/tiles/cadn/cadn.mbtiles` hiện có | Không download/retry PBF |
| Tile cleanup | `docker.exe compose stop tileserver` riêng | PASS; PostgreSQL không bị stop |

### Trục trặc gặp phải

- Không có recovery/retry bất thường, không có tiến trình app/tile hoặc listener bị bỏ sót cuối phiên. Không cập nhật `Lesson-learned.md` trong vòng này vì không phát sinh trục trặc công cụ/hạ tầng cần tự xử lý; các lỗi được nêu ở trên là kết quả verification, không phải recovery incident.

## Vòng verification sau canonical Prettier diff — 2026-09-24

### Phạm vi và môi trường

- Đã đọc toàn bộ ticket `01-map-workspace-provider.md`, `Lesson-learned.md` và evidence hiện có trước khi chạy.
- Không sửa source/tests/package/docker-compose, không cài package/tool/image, không tải lại tile/PBF, không commit. Chỉ cập nhật file evidence này.
- Mỗi lệnh được chạy riêng qua native Windows PowerShell với wrapper `Invoke-Safe`; lệnh sau vẫn chạy sau khi lệnh trước fail.
- `docker.exe info`: PASS; context `desktop-linux`, Docker Desktop Server `29.6.2`.
- `docker.exe compose up -d postgres`: PASS; PostgreSQL được giữ Up.

### Kết quả từng lệnh

| Lệnh | Kết quả | Số liệu/skip |
|---|---|---|
| `npm run prisma:generate` | PASS | Prisma Client v6.19.3 generated |
| `npm run typecheck` | FAIL ngoài scope map | 4 lỗi tại `scripts/demo/seed.ts` |
| `npm run lint` | PASS | ESLint exit 0 |
| `npm run format:check` | FAIL ngoài scope map | 15 file còn cảnh báo; không còn file map/workspace trong danh sách cảnh báo |
| `npm test` | FAIL ngoài scope map | 32 suites pass, 2 fail, 13 skipped; 133 pass, 2 fail, 155 skipped |
| `npx vitest run tests/map` | PASS | 5 files, 23 pass, 0 skip |
| `npm run test:e2e` | FAIL ngoài scope map | 116 pass, 12 fail, 2 skipped; 15.4m |
| `npm run build` | FAIL ngoài scope map | Compile pass, TypeScript check fail với 4 lỗi seed |

### Raw output — typecheck/build

```text
scripts/demo/seed.ts(29,9): error TS2451: Cannot redeclare block-scoped variable 'incidents'.
scripts/demo/seed.ts(30,9): error TS2451: Cannot redeclare block-scoped variable 'inspections'.
scripts/demo/seed.ts(161,17): error TS2451: Cannot redeclare block-scoped variable 'incidents'.
scripts/demo/seed.ts(161,28): error TS2451: Cannot redeclare block-scoped variable 'inspections'.
```

Build cũng ghi:

```text
✓ Compiled successfully in 2.1s
  Running TypeScript ...
scripts/demo/seed.ts(29,9): error TS2451: Cannot redeclare block-scoped variable 'incidents'.
scripts/demo/seed.ts(30,9): error TS2451: Cannot redeclare block-scoped variable 'inspections'.
scripts/demo/seed.ts(161,17): error TS2451: Cannot redeclare block-scoped variable 'incidents'.
scripts/demo/seed.ts(161,28): error TS2451: Cannot redeclare block-scoped variable 'inspections'.
Failed to type check.
```

Phân loại: toàn bộ 4 lỗi là ngoài scope map, tại `scripts/demo/seed.ts`.

### Raw output — format-check

```text
Checking formatting...
[warn] Lesson-learned.md
[warn] README.md
[warn] src/components/incidents/IncidentStatusActions.tsx
[warn] src/components/incidents/IntakeReportForm.tsx
[warn] src/components/incidents/useIncidentSession.ts
[warn] src/modules/identity/assignments.ts
[warn] src/modules/identity/contracts.ts
[warn] src/modules/incidents/commands.ts
[warn] src/modules/incidents/domain.ts
[warn] tests/demo/demo-bootstrap.test.ts
[warn] tests/e2e/ps005-incident.spec.ts
[warn] tests/identity/capability-policy.test.ts
[warn] tests/incidents/incident-approval.postgres.test.ts
[warn] tests/incidents/incident-authorization.postgres.test.ts
[warn] tests/integration/parallel-wave-replay.integration.test.ts
Code style issues found in 15 files. Run Prettier with --write to fix.
```

Phân loại: 15 cảnh báo đều ngoài scope map; các file map/workspace từng cảnh báo ở vòng trước đã không còn trong output hiện tại.

### Raw output — `npm test`

```text
FAIL tests/demo/demo-bootstrap.test.ts
Error: Transform failed with 2 errors:
D:/Project/CivicOS/scripts/demo/seed.ts:161:16: ERROR: The symbol "incidents" has already been declared
D:/Project/CivicOS/scripts/demo/seed.ts:161:27: ERROR: The symbol "inspections" has already been declared
Plugin: vite:esbuild
File: D:/Project/CivicOS/scripts/demo/seed.ts
```

```text
FAIL tests/integration/schema-and-migration.test.ts > database migration contract > applies Event kernel, Identity, platform, PS-E1-005, PS-E1-007 and PS-E1-009 migrations in dependency order
AssertionError: expected [ '0001_event_first', …(10) ] to deeply equal [ '0001_event_first', …(8) ]

FAIL tests/integration/schema-and-migration.test.ts > database migration contract > keeps every migration additive with no destructive SQL
AssertionError: expected 'DROP INDEX "ChecklistTemplate_establi…' to match /IF\s+EXISTS/i
Received: "DROP INDEX \"ChecklistTemplate_establishmentType_version_active_idx\""

Test Files  2 failed | 32 passed | 13 skipped (47)
Tests  2 failed | 133 passed | 155 skipped (290)
```

Phân loại: `tests/demo/demo-bootstrap.test.ts` lỗi do `scripts/demo/seed.ts`; hai assertion migration là ngoài scope map. Các test map trong full suite đều pass.

### Raw output — map-focused

```text
✓ tests/map/map-provider.test.ts (6 tests)
✓ tests/map/map-geometry.test.ts (5 tests)
✓ tests/map/map-smoke.test.ts (4 tests)
✓ tests/map/map-polygon.test.ts (3 tests)
✓ tests/map/map-permission-offline.test.ts (5 tests)

Test Files  5 passed (5)
Tests  23 passed (23)
```

Coverage: provider adapter/endpoint replacement/fallback = AC2, AC8; geometry/polygon = AC3 và rubric; permission/offline write guard = AC1, AC5, AC6; compose/attribution/provider smoke contract = AC2, AC4, AC6, AC8.

### Raw output — E2E

```text
12 failed
  [chromium] evidence-authorization.spec.ts:49 authorized upload persists hash, actor, capture time, and GPS, then downloads and dedupes
  [chromium] evidence-authorization.spec.ts:140 unassigned user cannot upload to or download another resource
  [chromium] parallel-wave-read-model.spec.ts:43 intake report created in UI appears in incident list and detail read model
  [chromium] parallel-wave-read-model.spec.ts:98 establishment and inspection created in UI appear in catalog and detail read model
  [chromium] parallel-wave.spec.ts:203 three operational surfaces have no horizontal overflow and no clipped actions
  [chromium] parallel-wave.spec.ts:605 401 and 403 authorization matrix covers five principals across three surfaces
  [mobile] evidence-authorization.spec.ts:49 authorized upload persists hash, actor, capture time, and GPS, then downloads and dedupes
  [mobile] evidence-authorization.spec.ts:140 unassigned user cannot upload to or download another resource
  [mobile] parallel-wave-read-model.spec.ts:43 intake report created in UI appears in incident list and detail read model
  [mobile] parallel-wave-read-model.spec.ts:98 establishment and inspection created in UI appear in catalog and detail read model
  [mobile] parallel-wave.spec.ts:203 three operational surfaces have no horizontal overflow and no clipped actions
  [mobile] parallel-wave.spec.ts:605 401 and 403 authorization matrix covers five principals across three surfaces
2 skipped
116 passed (15.4m)
```

Nguyên văn lỗi đại diện:

```text
Error: expect(received).toBe(expected) // Object.is equality
Expected: 201
Received: 403
at D:\Project\CivicOS\tests\e2e\evidence-authorization.spec.ts:66:27
```

```text
Error: expect(received).toBe(expected) // Object.is equality
Expected: true
Call Log:
- Timeout 90000ms exceeded while waiting on the predicate
at D:\Project\CivicOS\tests\e2e\parallel-wave-read-model.spec.ts:36:6
```

```text
Error: expect(received).toBe(expected) // Object.is equality
Expected: true
at D:\Project\CivicOS\tests\e2e\parallel-wave.spec.ts:35:25
```

Phân loại: 12 fail và 2 skip đều thuộc evidence authorization/read-model/parallel-wave, ngoài scope map; không có map-specific E2E case trong run này.

### Tile smoke runtime

- Không tải lại `storage/tiles/cadn/cadn.mbtiles`.
- `docker compose config`: PASS; image `maptiler/tileserver-gl:v5.6.0`, port `8080:8080`, bind `storage/tiles/cadn` vào `/data` read-only.
- `docker compose up -d tileserver`: PASS.
- Health poll:

```text
probe=1 health_status=200
```

- Style:

```text
URL=http://localhost:8080/styles/basic-preview/style.json STATUS=200 TYPE=application/json; charset=utf-8 BYTES=14704
```

- TileJSON và metadata assertions:

```text
URL=http://localhost:8080/data/v3.json STATUS=200 TYPE=application/json
bounds=105.93,20.91,106.03,20.99
minzoom=0 maxzoom=14
attribution=© OpenStreetMap contributors
license=https://www.openstreetmap.org/copyright
basename=cadn.mbtiles
```

- PBF:

```text
URL=http://localhost:8080/data/v3/14/13012/7214.pbf STATUS=200 TYPE=application/x-protobuf BYTES=44542
```

- Stability/restarts:

```text
stability_probe=1 status=running health=healthy restarts=0
stability_probe=2 status=running health=healthy restarts=0
stability_probe=3 status=running health=healthy restarts=0
stability_probe=4 status=running health=healthy restarts=0
stability_probe=5 status=running health=healthy restarts=0
stability_probe=6 status=running health=healthy restarts=0
```

- Đã `docker compose stop tileserver` riêng; PostgreSQL không bị stop.
- Kiểm tra cuối: `civicos-postgres-1` Up, port `5432` LISTENING; không còn listener LISTENING ở `8080`, `3000`, `3001`. Chỉ còn các dòng `TIME_WAIT` tới `8080` từ health-poll.

### AC mapping của vòng này

- AC1: targeted permission/offline 5/5 PASS; không có map-specific E2E fail, nhưng full E2E có 12 fail/2 skip ngoài scope.
- AC2: provider 6/6 PASS; compose và live style/TileJSON/PBF HTTP 200 PASS.
- AC3: geometry 5/5, polygon 3/3 PASS; không có map-specific E2E.
- AC4: live bbox `105.93,20.91,106.03,20.99`, OSM attribution/license PASS; 6 stability probes, restarts 0.
- AC5: permission/offline 5/5 PASS.
- AC6: map smoke contract 4/4 và permission/offline PASS; unrelated E2E failures được phân loại riêng.
- AC7: không có lệnh kiểm tra riêng trong phạm vi verification này; không sửa source.
- AC8: provider contract 6/6 PASS.
- AC9/AC10: không install; không sửa `.env.example`.
- Rubric geometry: PASS 5/5; generic `Event`: map contract PASS; tile credential/secret: không có test failure hoặc thay đổi source trong vòng này.

### Trục trặc gặp phải

- Không phát sinh trục trặc công cụ/hạ tầng cần tự xử lý; không retry lệnh, không có tiến trình app/tile hoặc listener bị bỏ sót cuối phiên.
- Không cập nhật `Lesson-learned.md` vì không có mục trục trặc mới; các lỗi verification được ghi ở trên không phải recovery incident.
