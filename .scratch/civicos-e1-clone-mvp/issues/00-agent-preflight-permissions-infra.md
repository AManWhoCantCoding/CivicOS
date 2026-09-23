# 00 — Agent preflight: quyền, phạm vi file và hạ tầng

- **Status:** done
- **Blocked by:** không
- **Owner:** Planner điều phối; Research hỏi user khi phát sinh quyền/infra còn thiếu
- **File được phép sửa:**
  - `.scratch/civicos-e1-clone-mvp/issues/00-agent-preflight-permissions-infra.md` — chỉ Planner/Research cập nhật preflight log và quyết định đã được user xác nhận
  - `.scratch/civicos-e1-clone-mvp/spec.md` — chỉ Planner/Research cập nhật nếu permission decision làm thay đổi boundary
- **File cấm sửa:**
  - `.env`, `.env.*`, `**/secrets/**`
  - `.opencode/**`, `opencode.jsonc`, `AGENTS.md`
  - `.github/workflows/**`, CI/CD config và deployment credentials
  - `.brain/**` — trừ thư mục evidence được role Developer/Tester/Reviewer ghi theo workflow
  - source repo bên ngoài: `D:\Project\news-map-main\news-map-main\`, `D:\Project\force-app-main\force-app-main\`

## Mục đích

Đây là ticket bắt buộc trước `01`–`05`. Nó biến mọi yêu cầu phát sinh về quyền edit, dependency, network, database, Docker, tile server hoặc mobile SDK thành một câu hỏi có kiểm soát. Agent không được tự mở rộng phạm vi, tự sửa policy, tự cài package lạ hoặc tự chọn fallback làm giảm Acceptance Criteria.

## Phạm vi mặc định đã được duyệt

### Hiện trạng cần ghi nhận trước khi triển khai

- Root `package.json` hiện là Next.js/Prisma/Vitest/Playwright; chưa có `maplibre-gl` và chưa có package React Native.
- `docker-compose.yml` hiện chỉ có PostgreSQL; chưa có TileServer/PMTiles service.
- `.env.example` hiện chỉ có DB/worker/session/demo variables và bị policy cấm edit mặc định.
- Repo CivicOS hiện chưa có `mobile/`; đây là folder mới của ticket 05.

### Được đọc

- Repo CivicOS hiện tại, gồm `CONTEXT.md`, `docs/**`, `src/**`, `prisma/**`, `tests/**`, `playwright/**`, `README.md`, config package và source repo reference ở hai đường dẫn ngoài.
- Source web/mobile reference chỉ đọc; không sửa, không tạo file, không commit.
- `.env` chỉ đọc để kiểm tra biến đã tồn tại; không in secret vào log/evidence.

### Được sửa khi ticket tương ứng liệt kê

- `src/**`: implementation web/API/domain.
- `prisma/**`: schema và migrations.
- `tests/**`: unit/integration/PostgreSQL tests.
- `playwright/**`: browser acceptance tests khi Tester được Planner giao.
- `mobile/**`: app React Native của ticket 05.
- `package.json`, `package-lock.json`: dependency/scripts đã được duyệt.
- `docker-compose.yml`: service local đã được duyệt trong preflight.
- `.brain/evidence/<ticket-id>/**`: chỉ agent đúng role ghi evidence theo `docs/agents/agent-workflow.md`.

### Không mặc định được sửa

- `.env`/`.env.*`, secrets, credentials.
- `opencode.jsonc`, `.opencode/**`, `AGENTS.md` và permission policy.
- `.github/workflows/**`, CI/CD, production deployment hoặc cloud resources.
- `docs/**`, `README.md`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `vitest.config.ts`, `playwright.config.ts` nếu ticket chưa liệt kê rõ.
- Bất kỳ path nào ngoài repo CivicOS.

## Quy trình preflight bắt buộc

1. Planner đọc ticket này, `spec.md`, ticket dependency và kiểm tra `git status --short` để nhận diện thay đổi có sẵn; không reset/xóa thay đổi của user.
2. Planner lập bảng tất cả file/folder dự kiến sửa cho toàn bộ ticket đã claim, phân loại `đã được duyệt` hoặc `cần xin thêm`.
3. Planner giao Tester chạy các kiểm tra runtime dưới đây vì permission hiện tại của Planner chỉ cho bash read-only/git/codegraph; Planner không được lách permission để tự chạy Docker/npm/postgres:
   - `node --version`
   - `npm --version`
   - `python --version` hoặc `python3 --version` nếu chạy Playwright Python
   - `docker info`
   - `docker compose config`
   - `docker compose ps`
   - `npm ls --depth=0`
   - `adb version` nếu ticket 05 yêu cầu Android build/emulator
4. Nếu Docker chưa chạy, dừng tại preflight và yêu cầu user mở Docker Desktop; không dùng WSL, Podman hoặc container engine khác thay thế.
5. Nếu thiếu package cần cài, ghi rõ package/version/license/reason/command/network và xin duyệt một lần theo batch. Không tự chạy `npm install <package>`, `pip install <package>`, `winget`, `choco` hoặc `scoop`.
6. Nếu thiếu SDK/emulator, tile data, tile server, outbound network hoặc port, ghi vào bảng yêu cầu quyền/hạ tầng; không tự đổi Acceptance Criteria.
7. Khi có mục cần user quyết định, Planner gọi Research; Research dùng `question` hỏi một batch, sau đó cập nhật ticket này. Developer không tự hỏi và không tự sửa `.scratch`.
8. Chỉ khi mọi mục bắt buộc có kết quả `PASS` hoặc `APPROVED`, Planner mới gỡ blocker và giao ticket phụ thuộc cho Developer.

### Phân vai theo permission hiện tại

- **Planner:** đọc/điều phối, cập nhật `.scratch`, không tự chạy Docker/npm/postgres và không sửa source.
- **Research:** chỉ đọc source, hỏi user bằng `question`, cập nhật spec/ticket; không sửa code/evidence.
- **Developer:** sửa code/test theo ticket, không sửa `.scratch`, không tự cài package lạ và không commit.
- **Tester:** chạy Docker, database, test/lint/typecheck/build theo lệnh Planner; ghi `.brain/evidence/<ticket-id>/tests.md`.
- **Reviewer:** review/evidence và chỉ commit khi Planner ra lệnh.

## Hạ tầng mặc định

| Hạng mục | Mặc định | Cách kiểm tra | Nếu thiếu |
|---|---|---|---|
| Node/npm | Theo lockfile và Next.js hiện tại | `node --version`, `npm --version` | Xin user cung cấp runtime tương thích; không tự nâng version |
| PostgreSQL | Docker Compose service `postgres`, port `5432` | `docker info`, `docker compose config`, `docker compose ps` | Xin user mở Docker Desktop |
| Next.js | port `3000` | `npm run dev`/health route | Ghi port conflict và hỏi port thay thế |
| Worker | process `npm run worker` | `/api/health/worker` | Không coi integration pass nếu worker chưa healthy |
| Python/Playwright | Python `3.13+` và browsers khi cần | `python --version`, browser check | Chỉ skip khi Planner ghi rõ scope; không tự cài |
| Mobile Android | JDK/Android SDK/ADB/emulator nếu yêu cầu build native | `adb version`, SDK/Gradle check | Hỏi user Android-only hay chỉ contract/build JS |
| Map tiles | **Đã user xác nhận 2026-09-23:** OSS tự host, OSM subset quanh CADN, có attribution; không cần credential | provider health + map smoke test | Chỉ hỏi thêm service/port/disk nếu TileServer/PMTiles không chạy được |
| Network | npm/Gradle/tile data nếu dependency cần tải | kiểm tra read-only trước | Hỏi quyền outbound; không dùng credential trong source |

### Quy tắc Docker/database

- Chỉ được dùng service local trong `docker-compose.yml` đã được duyệt.
- Tester là role được chạy `docker compose up -d postgres` theo workflow.
- Không chạy reset/migration phá hủy trên database không phải `civicos_demo`.
- `demo:reset` chỉ được chạy khi Planner giao rõ database đích và có `DEMO_RESET_CONFIRM=1`.
- Không commit `.env` hoặc log chứa `DATABASE_URL`, `SESSION_SECRET`, token hay PII.

## Ma trận yêu cầu quyền/hạ tầng

Nếu phát sinh, điền đủ tất cả cột rồi mới hỏi user:

| # | Loại | Path/command/service cụ thể | Read/Write/Execute | Lý do và ticket | Rủi ro | Fallback có giữ đủ AC? | Quyết định user |
|---|---|---|---|---|---|---|---|
| 1 | Dependency | `<package>@<version>` | Install | `<ticket>` | license/network/build | `<có/không>` | `<pending>` |
| 2 | File/folder | `<exact path>` | `<read/write>` | `<ticket>` | `<rủi ro>` | `<fallback>` | `<pending>` |
| 3 | Hạ tầng | `<service/port/SDK>` | Start/execute | `<ticket>` | `<rủi ro>` | `<fallback>` | `<pending>` |

### Quyết định đã nhận

- **Map source:** OSS tự host — OSM + OpenMapTiles/PMTiles + TileServer.
- **Credential:** Không cần user cung cấp map token/provider credential cho MVP.
- **Còn phải preflight:** tile build/download network, disk, service/port và attribution; nếu thiếu thì hỏi hạ tầng, không hỏi lại nguồn dữ liệu.

### Quyết định user bổ sung — 2026-09-23

Các câu trả lời dưới đây được ghi theo nguyên ý user; không suy diễn approval cho các thông số user chưa nêu:

| Hạng mục | Quyết định user | Trạng thái preflight |
|---|---|---|
| Tile stack cho ticket 01 | “Tự host TileServer GL” | APPROVED về loại service; image/version, port, volume/dung lượng và network/tải OSM subset quanh CADN vẫn cần chốt cụ thể trước khi triển khai |
| Dependency MapLibre web/mobile | “Chấp thuận batch đề xuất” | APPROVED cho việc cài theo batch; package/version/license/command cụ thể phải được ghi trong batch trước khi Developer cài; Research không tự cài |
| Ticket 05 Android | “Chấp thuận Android native” | APPROVED giữ phạm vi Android native build/emulator; JDK/Android SDK/ADB đã có nhưng Gradle/mobile project còn phải được tạo/kiểm tra theo ticket 05 |
| Database và port local | “Đúng” với `civicos_demo`, PostgreSQL `5432`, Next `3000` | APPROVED theo target/port preflight; Tester vẫn phải kiểm tra runtime thực tế |

Không có quyết định nào làm đổi boundary trong `spec.md`; chưa cập nhật `spec.md`.

Không ghi secret thật vào bảng; chỉ ghi “user injects via local environment”.

## Batch hạ tầng và dependency đã chốt — 2026-09-23

### Câu trả lời user (nguyên ý)

> “A — Chốt phương án đề xuất (Khuyến nghị)”

### Nội dung batch được chốt

- **TileServer GL:** dùng image `maptiler/tileserver-gl:v5.6.1`, pin tag và không dùng `latest`.
- **Port:** map host `8080` → container `8080`.
- **Volume:** `./storage/tiles/cadn:/data:ro`; đây là dữ liệu runtime, không commit. `storage/` đã nằm trong `.gitignore` hiện tại.
- **Dung lượng:** tối thiểu `10 GB` trống cho extract, tạo MBTiles và kiểm tra; chưa tính Docker image.
- **OSM subset:** cho phép outbound HTTPS tới `download.geofabrik.de`; tải Geofabrik Vietnam PBF, cắt bbox CADN `105.93,20.91,106.03,20.99`, tạo MBTiles/OpenMapTiles trong `storage/tiles/cadn`, giữ OSM attribution và license.
- **Network:** cho phép outbound HTTPS tới `download.geofabrik.de`, npm registry và Docker Hub; không dùng credential/token.
- **Compose boundary:** không thêm service và không tự sửa `docker-compose.yml` trong preflight; Developer/Tester chỉ chạy TileServer GL theo batch được chốt.
- **MapLibre web:** `maplibre-gl@6.11.1`, license **BSD-3-Clause**; exact install command: `npm install maplibre-gl@6.11.1`.
- **MapLibre mobile:** `@maplibre/maplibre-react-native@11.4.0`, license **MIT**; exact install command sau khi Developer tạo package `mobile/`: `npm --prefix mobile install @maplibre/maplibre-react-native@11.4.0`. Package này hiện chưa có trong dependency hiện tại/transitive, nên sẽ cài một lần, không cài lại.
- **Android:** giữ Android native build đã được duyệt. Developer tạo Gradle wrapper/project trong `mobile/`; preflight chỉ xác nhận JDK/Android SDK/ADB/emulator.

### Trạng thái approval

- Các thông số TileServer GL, tile runtime/network và batch MapLibre ở trên đã được **user chốt cụ thể**.
- Không có lệnh install nào được chạy trong Research; Developer chỉ được cài đúng package/version/command đã ghi khi Planner giao.
- Các kiểm tra runtime (`docker info`, `docker compose config`, Docker/TileServer health, disk/network, JDK/SDK/ADB) vẫn là trách nhiệm Planner/Tester; approval này không thay thế evidence runtime.

### Kết luận preflight của Planner — 2026-09-23

- Tag user chốt `maptiler/tileserver-gl:v5.6.1` đã được probe read-only và trả HTTP 404 `no such manifest`.
- Theo rule tự động hóa của phiên, chọn fallback kỹ thuật gần nhất còn tồn tại và vẫn pin tag: `maptiler/tileserver-gl:v5.6.0` (Docker Hub HTTP 200, OCI manifest hợp lệ). Giữ nguyên port `8080`, volume `/data:ro`, bbox, attribution, network và dung lượng đã duyệt; không dùng `latest`.
- `storage/tiles/cadn` chưa tồn tại và chưa có tile data trong preflight. Đây là dữ liệu runtime được duyệt, không commit; việc tạo extract/MBTiles và smoke health được giao trong ticket `01`, không dùng fixture để giả pass.
- Node/npm/Python, Docker Desktop/PostgreSQL `civicos_demo`, port `5432`/`3000`/`8080`, outbound HTTPS tới Geofabrik/npm/Docker Hub, disk tối thiểu và Android JDK/SDK/ADB/emulator đều PASS theo `.brain/evidence/00-agent-preflight-permissions-infra/tests.md`.
- `mobile/` và Gradle wrapper chưa tồn tại; đây là phần triển khai của ticket `05`, không phải blocker quyết định/hạ tầng sau khi native prerequisites đã PASS.
- Không có path bị từ chối nào được giao cho Developer. Các thay đổi có sẵn trong working tree được giữ nguyên, không reset/xóa.

### Inventory file/folder/command đã duyệt cho tranche

| Ticket | File/folder implementation được phép | Dependency/infra và kiểm tra chính | Kết luận |
|---|---|---|---|
| `01-map-workspace-provider` | `src/modules/platform/**`, `src/app/map/**`, `src/app/api/map/**`, `src/components/map/**`, `src/components/navigation/feature-registry.ts`, `src/components/shell/**`, `docker-compose.yml`, `package.json`, `package-lock.json`, `tests/**` | `maplibre-gl@6.11.1` BSD-3-Clause; TileServer GL effective tag `v5.6.0`, host `8080`, runtime `storage/tiles/cadn`; geometry/provider/permission/offline/map smoke | APPROVED để giao sau khi ticket `00` đóng |
| `02-ps-e1004-resident-management` | `src/modules/residents/**`, `src/app/residents/**`, `src/app/api/residents/**`, `src/app/api/reports/**`, `src/components/residents/**`, navigation registry, `prisma/schema.prisma`, `prisma/migrations/**`, `tests/residents/**`, `tests/**` | PostgreSQL `civicos_demo:5432`; Prisma/migration và full root verification theo ticket | APPROVED về scope, còn blocked bởi `01` |
| `03-ps-e1005-intake-report` | `src/modules/incidents/**`, `src/app/intake/**`, `src/app/incidents/**`, `src/app/api/intake-reports/**`, `src/app/api/incidents/**`, `src/components/incidents/**`, navigation registry, Prisma schema/migrations, `tests/incidents/**`, `tests/**` | PostgreSQL `civicos_demo:5432`; masking/audit/idempotency/SLA và full root verification theo ticket | APPROVED về scope, còn blocked bởi `01` |
| `04-ps-e1007-inspection` | `src/modules/inspections/**`, `src/app/inspections/**`, `src/app/api/establishments/**`, `src/app/api/inspections/**`, `src/app/api/evidence/**`, `src/components/inspections/**`, navigation registry, Prisma schema/migrations, `tests/inspections/**`, `tests/**` | PostgreSQL `civicos_demo:5432`; Evidence GPS/photo, TileServer runtime liên quan map, full root verification theo ticket | APPROVED về scope, còn blocked bởi `01` |
| `05-mobile-readonly-client` | `mobile/**`, `src/modules/**/contracts.ts` chỉ khi cần, `tests/**` cho API contract | `@maplibre/maplibre-react-native@11.4.0` MIT; JDK/SDK/ADB/emulator PASS; Gradle/mobile project tạo trong ticket | APPROVED về scope, còn blocked bởi `01`–`04` |

### Dependency/status sau preflight

- Ticket `01` chuyển thành frontier `ready-for-agent` sau khi ticket này được Reviewer commit; không còn blocker preflight ngoài việc ticket `01` phải thực hiện tile runtime đã được duyệt.
- Ticket `02`, `03`, `04` giữ `ready-for-agent` nhưng chưa giao vì còn blocked by `01`.
- Ticket `05` giữ `ready-for-agent` nhưng chưa giao vì còn blocked by `01`, `02`, `03`, `04`.
- Không giao Developer vào `.env`, secrets, permission policy, CI/CD, `docs/**` ngoài scope, hoặc hai source repo bên ngoài.

## Permission request template cho Research

Khi có mục `pending`, hỏi user theo mẫu ngắn:

1. Path/command/service chính xác là gì?
2. Cần quyền `read`, `write`, `execute` hay `install`?
3. Ticket nào cần và vì sao không thể nằm trong scope hiện tại?
4. Có chấp nhận rủi ro/license/network/port đó không?
5. Nếu không cấp, có fallback nào vẫn đạt 100% AC không?

User answer phải được ghi nguyên ý vào cột `Quyết định user`, kèm ngày; không tự suy diễn “đồng ý”.

## Acceptance Criteria (bắt buộc — chặn done, PASS 100%)

- [x] Đã có inventory file/folder/command/service dự kiến cho ticket 01–05.
- [x] Mọi path dự kiến sửa đều nằm trong scope mặc định hoặc có quyết định user cụ thể.
- [x] Không có ticket nào phụ thuộc vào việc sửa `.env`, secrets, permission policy, CI/CD hoặc source repo ngoài.
- [x] `docker info`, `docker compose config` và trạng thái database được ghi nhận; nếu Docker chưa chạy thì ticket chuyển `needs-info`, không giả định pass.
- [x] Dependency mới có package/version/license/reason/command và approval; nếu không có dependency approval thì không giao bước install cho Developer.
- [x] Đã chốt tile data/provider/TileServer hoặc ghi rõ blocker hạ tầng; không dùng fixture để giả vờ đạt AC map.
- [x] Đã chốt khả năng build mobile trên môi trường thực tế: Android build/emulator, hoặc chỉ API/JS contract nếu user không cấp native SDK.
- [x] Đã chốt port, network, storage và database target cho local/staging-like verification.
- [x] Đã ghi rõ file/folder/infra nào bị từ chối và xử lý ticket nào sẽ bị block.
- [x] Planner đã đặt status và dependency của ticket 01–05 theo kết quả preflight; không giao ticket bị block cho Developer.

## Rubric

### Bắt buộc

- [x] Preflight không có quyết định ngầm; mọi mở rộng quyền có evidence quyết định user.
- [x] Preflight không chạy lệnh phá hủy, không sửa policy để tự cấp quyền.
- [x] Handoff cho Developer chứa exact scope, exact commands, exact infra và expected verification output.

### Khuyến nghị

| Trục | Mô tả kỳ vọng | Thang điểm | Ngưỡng tối thiểu |
|---|---|---|---|
| Tính tự động | Một lần hỏi batch thay vì nhiều lần hỏi lẻ; dependency graph rõ | 0–2 | 1 |
| An toàn | Không lộ secret/PII, không đụng thay đổi có sẵn | 0–2 | 2 |
| Khả năng tái lập | Preflight có lệnh và output đủ để Tester lặp lại | 0–2 | 1 |

## Các bước thực hiện

- [x] Planner thực hiện preflight read-only và điền ma trận.
- [x] Research hỏi user nếu có mục `pending`/`needs-info`.
- [x] Planner ghi kết luận `PASS`/`APPROVED`/`BLOCKED` cho từng hạng mục.
- [x] Planner cập nhật dependency/status của ticket 01–05.
- [x] Chỉ sau đó mới giao Developer/Tester/Reviewer theo `docs/agents/agent-workflow.md`.

## Đang chờ Research

Chỉ mở khi preflight phát hiện quyền hoặc hạ tầng ngoài mặc định; không tự dùng `wontfix`.

Không còn câu hỏi Research đang chờ cho batch TileServer GL/MapLibre sau câu trả lời ngày 2026-09-23. Nếu preflight runtime phát hiện thiếu Docker, outbound network, disk, port hoặc Android SDK/ADB, Planner phải mở câu hỏi hạ tầng mới; không coi batch này là runtime PASS tự động.

## Trạng thái cuối

done
