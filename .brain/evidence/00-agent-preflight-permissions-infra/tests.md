# Tester evidence — `00-agent-preflight-permissions-infra`

- **Phạm vi:** preflight read-only theo ticket; không sửa source, không cài package, không khởi động service/container, không reset/migrate/drop database, không đọc/in secret.
- **Môi trường:** native Windows commands from repo root `D:\Project\CivicOS`; Docker context reported `desktop-linux`.
- **Acceptance Criteria mapping:** kết quả dưới đây cung cấp evidence cho AC 4 (Docker/database), AC 6 (tile), AC 7 (mobile), AC 8 (port/network/storage), và inventory/dependency evidence cho AC 1–3, 5, 9–10. Inventory file/folder dự kiến ticket 01–05 cần Planner hoàn thiện, trạng thái `pending`.

## Lệnh và kết quả

### Node/npm/Python

- **PASS** — `node --version`
  ```text
  v24.18.0
  ```
- **PASS** — `npm --version`
  ```text
  10.9.4
  ```
- **PASS** — `python --version`
  ```text
  Python 3.13.14
  ```

### Docker/PostgreSQL

- **PASS** — `docker info`
  ```text
  Client:
   Version:    29.6.2
   Context:    desktop-linux
  Server:
   Containers: 1
    Running: 1
    Paused: 0
    Stopped: 0
   Images: 6
   Server Version: 29.6.2
   Operating System: Docker Desktop
   OSType: linux
   Architecture: x86_64
   CPUs: 4
   Total Memory: 2.84GiB
  ```
- **PASS** — `docker compose config`
  ```text
  name: civicos
  services:
    postgres:
      environment:
        POSTGRES_DB: civicos
        POSTGRES_PASSWORD: [REDACTED: compose default credential]
        POSTGRES_USER: civicos
      image: postgres:16-alpine
      ports:
        - mode: ingress
          target: 5432
          published: "5432"
          protocol: tcp
      volumes:
        - type: volume
          source: civicos-postgres
          target: /var/lib/postgresql/data
          volume: {}
  networks:
    default:
      name: civicos_default
  volumes:
    civicos-postgres:
      name: civicos_civicos-postgres
  ```
- **PASS** — `docker compose ps`
  ```text
  NAME                 IMAGE                COMMAND                  SERVICE    CREATED        STATUS              PORTS
  civicos-postgres-1   postgres:16-alpine   "docker-entrypoint.s…"   postgres   10 hours ago   Up About a minute   0.0.0.0:5432->5432/tcp, [::]:5432->5432/tcp
  ```
  PostgreSQL service is running. No DB mutation command was run.

### Package inventory

- **PASS** — `npm ls --depth=0`
  ```text
  civic-os@0.1.0 D:\Project\CivicOS
  +-- @emnapi/core@1.10.0 extraneous
  +-- @emnapi/runtime@1.11.3 extraneous
  +-- @emnapi/wasi-threads@1.2.1 extraneous
  +-- @img/sharp-wasm32@0.35.4 extraneous
  +-- @napi-rs/wasm-runtime@1.2.4 extraneous
  +-- @playwright/test@1.63.0
  +-- @prisma/client@6.19.3
  +-- @tailwindcss/postcss@4.3.3
  +-- @types/node@20.19.43
  +-- @types/react-dom@19.3.0
  +-- @types/react@19.3.0
  +-- eslint-config-next@16.3.5
  +-- eslint-config-prettier@10.1.8
  +-- eslint@9.39.5
  +-- next@16.3.5
  +-- prettier-plugin-tailwindcss@0.6.14
  +-- prettier@3.9.8
  +-- prisma@6.19.3
  +-- react-dom@19.2.8
  +-- react@19.2.8
  +-- tailwindcss@4.3.3
  +-- tsx@4.23.13
  +-- typescript@5.9.3
  `-- vitest@3.2.7
  ```
  Ghi nhận các package `extraneous` theo output npm; không tự sửa/cài.

### Android native/mobile boundary

- **PASS** — `adb version`
  ```text
  Android Debug Bridge version 1.0.41
  Version 37.0.1-15733141
  Installed as C:\Users\GODXDEMON\AppData\Local\Android\Sdk\platform-tools\adb.exe
  Running on Windows 10.0.26200
  ```
- **PASS** — `java -version`
  ```text
  openjdk version "17.0.20.1" 2026-08-18 LTS
  OpenJDK Runtime Environment Microsoft-14940689 (build 17.0.20.1+1-LTS) (build 17.0.20.1+1-LTS)
  OpenJDK 64-Bit Server VM Microsoft-14940689 (build 17.0.20.1+1-LTS, mixed mode, sharing)
  ```
- **PASS** — `adb devices`
  ```text
  * daemon not running; starting now at tcp:5037
  * daemon started successList of devices attached
  ```
  No device was listed. `adb kill-server` was run afterward to stop the read-only probe daemon.
- **PASS** — `emulator -version`
  ```text
  Android emulator version 37.1.11.0 (build_id 15917651) (CL:N/A)
  ```
- **PASS** — `emulator -list-avds`
  ```text
  Pixel_7
  ```
- **PASS** — `sdkmanager.bat --version` through native PowerShell
  ```text
  Warning: This version only understands SDK XML versions up to 3 but an SDK XML file of version 4 was encountered. This can happen if you use versions of Android Studio and the command-line tools that were released at different times.
  Warning: package.xml parsing problem. unexpected element (uri:"", local:"abis"). Expected elements are <{}vendor>,<{}codename>,<{}base-extension>,<{}abi>,<{}api-level>,<{}extension-level>,<{}tag>
  Warning: package.xml parsing problem. unexpected element (uri:"", local:"translatedAbis"). Expected elements are <{}vendor>,<{}codename>,<{}base-extension>,<{}abi>,<{}api-level>,<{}extension-level>,<{}tag>
  12.0
  ```
- **BLOCKED** — `gradle --version`
  ```text
  & : The term 'gradle' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the 
  spelling of the name, or if a path was included, verify that the path is correct and try again.
  At line:1 char:3
  + & gradle --version; exit $LASTEXITCODE
  +   ~~~~~~
      + CategoryInfo          : ObjectNotFound: (gradle:String) [], CommandNotFoundException
      + FullyQualifiedErrorId : CommandNotFoundException
  ```
  No `gradlew`/Android project folder was present in the repository glob scan. Native Android build remains blocked pending the mobile build boundary decision and/or approved Gradle availability.

### Tile stack

- **PASS (inventory only)** — `docker compose config` and root `docker-compose.yml` show only service `postgres`; no TileServer or PMTiles service, volume, or tile port is configured.
- **PASS (package inventory)** — root `package.json`/`npm ls --depth=0` contain no `maplibre-gl`, React Native, TileServer, or PMTiles package.
- **BLOCKED/pending** — no tile data was downloaded and no tile health/smoke request was made because the compose tile service does not exist. Ticket's OSS self-hosted OSM/OpenMapTiles/PMTiles + TileServer choice is recorded, but concrete service/port/disk readiness still requires Planner/Research decision.

### Port, storage, network

- **PASS** — read-only TCP port inspection:
  ```text
  LocalAddress LocalPort OwningProcess
  ------------ --------- -------------
  ::1               5432         11084
  ::                5432         12596
  ```
  Port `3000` had no listening endpoint. PID lookup:
  ```text
     Id ProcessName        Path
     -- -----------        ----
  12596 com.docker.backend C:\Users\GODXDEMON\AppData\Local\Programs\DockerDesktop\resources\com.docker.backend.exe
  11084 wslrelay C:\Program Files\WSL\wslrelay.exe
  ```
- **PASS** — read-only disk availability:
  ```text
  Name         Used         Free
  ----         ----         ----
  C    168791920640  94406942720
  D     36611473408 210348093440
  ```
- **PASS** — `npm ping --registry=https://registry.npmjs.org/`
  ```text
  npm notice PING https://registry.npmjs.org/
  npm notice PONG 376ms
  ```
- **PASS** — read-only TCP network checks:
  ```text
  registry.npmjs.org:443 TcpTestSucceeded=True
  services.gradle.org:443 TcpTestSucceeded=True
  ```
  No tile-data download or tile endpoint request was made.

## Kết luận theo hạng mục

| Hạng mục | Kết quả |
|---|---|
| Node/npm | PASS — Node 24.18.0, npm 10.9.4 |
| Python | PASS — Python 3.13.14 |
| Docker/PostgreSQL | PASS — Docker Desktop/context available; compose PostgreSQL up on 5432 |
| Package hiện có | PASS inventory; có các package `extraneous`, không tự xử lý |
| Tile stack | BLOCKED/pending — không có TileServer/PMTiles trong compose, chưa có tile service/port/data |
| Android native build | BLOCKED — JDK/ADB/emulator/SDK available, nhưng `gradle` unavailable và repo chưa có `gradlew`/mobile project |
| Port/network/storage | PASS cho 5432, network npm/Gradle và storage; port 3000 đang rảnh |

## Dependencies/infra còn thiếu và quyết định cần user

- `pending`: ticket 01–05 file/folder inventory và approval matrix do Planner cập nhật.
- `pending`: concrete OSS tile service/PMTiles build path, service/port, tile-data storage budget, và quyền outbound tile-data network; không suy diễn approval.
- `pending`: ticket 05 native Android build boundary: cấp/chuẩn bị Gradle hoặc chốt chỉ API/JS contract; emulator AVD có nhưng hiện không có device đang chạy.
- Không có package install request được tự thực hiện.

## Evidence trực tiếp — TileServer fallback pin

- **Phạm vi:** chỉ ghi nhận lại kết quả probe read-only đã có; không chạy test sản phẩm, không pull image/layer, không tải tile/PBF, không mutate DB, không sửa source/compose/ticket.
- **Command/probe:** `curl.exe` tới Docker Hub Tags API và tag metadata; `docker.exe manifest inspect maptiler/tileserver-gl:v5.6.0`; đối chiếu probe trước đó của tag `v5.6.1`.
- **PASS — fallback `maptiler/tileserver-gl:v5.6.0`:** Docker Hub tag metadata trả **HTTP 200**, `tag_status="active"`, `v2=true`, `media_type="application/vnd.oci.image.index.v1+json"`; `docker.exe manifest inspect` trả OCI index `schemaVersion: 2` với manifest `linux/amd64` và `linux/arm64` hợp lệ.
- **Raw metadata chính:** digest tag `sha256:3a9ccdb24820b6814c8119bcc8a4376c39867cb0ffe69d62919ef898b90c2427`; `full_size=381303802`; amd64 digest `sha256:f5f954587478ca6be606f834fba1880b5ddd9c958132ded79a573bc1790a8bf0`; arm64 digest `sha256:2bee34c072c07d694f6fac75e17d2feb6227eaab007177179e9740822ab89cc6`.
- **Raw probe đối chiếu — tag lỗi `v5.6.1`:** `curl.exe` tới `https://hub.docker.com/v2/repositories/maptiler/tileserver-gl/tags/v5.6.1` trả `HTTP=404 SIZE=0`; `docker manifest inspect maptiler/tileserver-gl:v5.6.1` trả `docker : no such manifest: docker.io/maptiler/tileserver-gl:v5.6.1`.
- **Lý do chọn tag:** `v5.6.0` là exact tag gần nhất còn tồn tại/active, có HTTP 200 và OCI manifest hợp lệ; `v5.6.1` không tồn tại trên registry (HTTP 404), nên không thể dùng làm image pin.
- **Ranh giới ticket:** evidence này chỉ xác nhận tồn tại/khả dụng read-only của image manifest. TileServer runtime smoke và tile-data runtime smoke vẫn thuộc **ticket 01**, chưa thực hiện ở ticket 00.

## Trục trặc công cụ/hạ tầng

- `sdkmanager` được `where` định vị nhưng bare invocation từ Git Bash không cho output hữu ích; đã xử lý bằng native PowerShell invocation và thu được version `12.0` cùng warnings nguyên văn.
- **Lesson-learned update blocked:** bắt buộc ghi Lesson-learned nhưng permission policy từ chối edit `Lesson-learned.md` (chỉ cho phép evidence path). Chưa ghi được mục mới; cần Planner/authorized role cập nhật mục tổng quát về khác biệt PATH Git Bash/PowerShell.

## Tiếp tục preflight — 2026-09-23

- **Phạm vi giữ nguyên:** read-only; không sửa source, không cài package, không tải PBF/tile data, không thêm service vào compose, không reset/migrate/drop DB, không ghi secret.
- **Wrapper:** `Invoke-Safe` được định nghĩa một lần ở đầu phiên; mỗi probe chạy riêng qua wrapper, timeout theo loại lệnh, tối đa hai attempt và có recovery bằng executable/path hoặc phương án non-interactive.

### Probe và output thô

#### TileServer image manifest

- **BLOCKED** — `docker manifest inspect maptiler/tileserver-gl:v5.6.1`
  ```text
  docker : no such manifest: docker.io/maptiler/tileserver-gl:v5.6.1
      + CategoryInfo          : NotSpecified: (no such manif...erver-gl:v5.6.1:String) [], RemoteException
      + FullyQualifiedErrorId : NativeCommandError
  ```
  Recovery `docker.exe manifest inspect` không cho thấy manifest hợp lệ. Tag đã approval trong ticket nhưng không tồn tại trên registry tại thời điểm probe.

#### npm metadata

- **APPROVED** — `npm view maplibre-gl@6.11.1 version license dist.integrity --json`
  ```text
  {
    "version": "6.11.1",
    "license": "BSD-3-Clause",
    "dist.integrity": "sha512-PaWLwfxWs6EddrPEsncrnPAyHNN0vm7KpQtoPWN1AQimJ7qwY/7GrwBeI+cB+YlSrw5sCyVKc2ZAbTwJ4MHUdA=="
  }
  ```
- **APPROVED** — `npm view @maplibre/maplibre-react-native@11.4.0 version license dist.integrity --json`
  ```text
  {
    "version": "11.4.0",
    "license": "MIT",
    "dist.integrity": "sha512-jCXpIz+yjI70jyitBfvtApN7CU9l7IDorNgWO4Vm8FVnDSQ9fYikpSvZPTgPDk9vqmC770UlunTU/pm+eAVEsw=="
  }
  ```

#### Outbound HTTPS

- **PASS** — Geofabrik, không tải body/PBF:
  ```text
  HTTP=200 SIZE=0 URL=https://download.geofabrik.de/asia/vietnam-260922.osm.pbf
  ```
- **PASS** — npm registry:
  ```text
  HTTP=200 SIZE=0 URL=https://registry.npmjs.org/maplibre-gl/6.11.1
  ```
- **BLOCKED** — Docker Hub endpoint cho tag đã chọn:
  ```text
  HTTP=404 SIZE=0 URL=https://hub.docker.com/v2/repositories/maptiler/tileserver-gl/tags/v5.6.1
  ```

#### Storage/disk/port

- **BLOCKED** — `Test-Path .\storage\tiles\cadn`: `False`; chưa có tile runtime directory/data.
- **PASS** — D: free bytes: `210348077056` (vượt mức tối thiểu 10 GB đã chốt).
- **PASS** — port `8080`: `False` (đang rảnh).
- **PASS** — port `5432`: `True` (PostgreSQL đang listen).
- Probe dùng `Get-ChildItem -Depth 2`; loại trừ `node_modules`, `.gradle`, `build`, `.git`. Không in nội dung secret.

#### Docker/Compose/PostgreSQL

- **PASS** — Docker Desktop native:
  ```text
  Client Version: 29.6.2
  Context: desktop-linux
  Server Version: 29.6.2
  Operating System: Docker Desktop
  OSType: linux
  Architecture: x86_64
  ```
- **PASS** — `docker compose config --services`:
  ```text
  postgres
  ```
- **PASS** — `docker compose ps`:
  ```text
  NAME                 IMAGE                STATE     <no value>
  civicos-postgres-1   postgres:16-alpine   running   [{0.0.0.0 5432 5432 tcp} {:: 5432 5432 tcp}]
  ```
- **PASS** — read-only database listing:
  ```text
  civicos
  civicos_demo
  postgres
  template0
  template1
  ```
  Không chạy query mutation, migration, reset hoặc drop.

#### Android preflight

- **PASS** — JDK:
  ```text
  openjdk version "17.0.20.1" 2026-08-18 LTS
  OpenJDK Runtime Environment Microsoft-14940689
  OpenJDK 64-Bit Server VM Microsoft-14940689
  ```
- **PASS** — SDK: `sdkmanager.bat --version` → `12.0`; command phát warnings SDK XML/package.xml như output lần chạy trước, không timeout.
- **PASS** — ADB:
  ```text
  Android Debug Bridge version 1.0.41
  Version 37.0.1-15733141
  List of devices attached
  emulator-5554\tdevice
  ```
- **PASS** — emulator: `37.1.11.0`; AVD: `Pixel_7`.
- **BLOCKED** — Gradle wrapper/project: chưa có `mobile/gradlew`/Android project; `gradle --version` trước đó trả `CommandNotFoundException`. Theo boundary, Gradle wrapper/project do Developer tạo.

### Bảng kết quả

| Hạng mục | Trạng thái | Phiên bản/giá trị | Ghi chú |
|---|---|---|---|
| TileServer manifest | BLOCKED | `maptiler/tileserver-gl:v5.6.1` | Registry trả `no such manifest` |
| `maplibre-gl` metadata | APPROVED | `6.11.1`, BSD-3-Clause | npm metadata và integrity khớp |
| MapLibre RN metadata | APPROVED | `11.4.0`, MIT | npm metadata và integrity khớp |
| Geofabrik HTTPS | PASS | HTTP 200 | Không tải PBF |
| npm HTTPS | PASS | HTTP 200 | Read-only metadata endpoint |
| Docker Hub HTTPS | BLOCKED | HTTP 404 | Tag image không tồn tại |
| Storage | BLOCKED | `storage/tiles/cadn` absent | Chưa tải/tạo dữ liệu theo phạm vi |
| Disk/port | PASS | D free 210348077056; 8080 free; 5432 listening | Đủ 10 GB |
| Docker/Compose/PostgreSQL | PASS | Docker 29.6.2; PostgreSQL 16-alpine | Có DB `civicos_demo`; compose service chỉ `postgres` |
| JDK/SDK/ADB/emulator | PASS | JDK 17; SDK 12.0; ADB 37.0.1; Pixel_7 | Có emulator đang `device` |
| Gradle wrapper/project | BLOCKED | Chưa có | Thuộc Developer trong `mobile/` |

### Recovery đã thực hiện

1. Probe inventory ban đầu lỗi regex PowerShell:
   ```text
   parsing "\(node_modules|\.gradle|build|\.git)(\|$)" - Too many )'s.
       + CategoryInfo          : OperationStopped: (:) [], ArgumentException
       + FullyQualifiedErrorId : System.ArgumentException
   ```
   Chạy lại với bộ lọc path đơn giản và loại trừ đúng các thư mục yêu cầu.
2. Probe HTTPS đầu tiên gặp lỗi wrapper nguyên văn:
   ```text
   Wait-Job : The Wait-Job cmdlet cannot finish working, because one or more jobs are blocked waiting for user
   interaction. Process interactive job output by using the Receive-Job cmdlet, and then try again.
   ```
   Chạy lại bằng `curl.exe` non-interactive với timeout riêng từng endpoint.
3. Child job không kế thừa working directory nên `docker compose` ban đầu báo:
   ```text
   docker : no configuration file provided: not found
   ```
   Chạy lại với `Set-Location "D:\Project\CivicOS"` bên trong probe và xác nhận compose/PostgreSQL.
4. SDK/ADB/emulator dùng executable/path native Windows; không dùng WSL/Podman và không khởi động thêm service.

### Giả định

- `civicos_demo` tồn tại trong PostgreSQL nhưng compose environment hiện hiển thị DB mặc định `civicos`; probe chỉ liệt kê database, không đổi target.
- `maptiler/tileserver-gl:v5.6.1` được giữ là giá trị đã user chốt trong ticket; do manifest/HTTP 404, chưa thay tag và chưa đánh dấu TileServer runtime PASS.
- `storage/tiles/cadn` absent là BLOCKED theo preflight; đúng phạm vi vì không được tạo directory hoặc tải dữ liệu ở lần này.
- Android native approval vẫn giữ nguyên; thiếu Gradle wrapper/project là boundary Developer, không tự cài hoặc scaffold.

## Tiếp tục preflight image fallback — 2026-09-23

- **Phạm vi:** chỉ probe read-only Docker Hub/manifest, image local inspect không pull, storage/disk/8080/5432; không sửa source/compose/ticket, không tải layer/tile/PBF, không mutate DB.
- **Wrapper:** mỗi lệnh chạy qua `Invoke-Safe` với timeout riêng; manifest `v5.5.0` được thử tối đa 2 lần, không lặp `v5.6.1`.

### Docker Hub tag discovery

- **PASS — Tags API:** `https://hub.docker.com/v2/repositories/maptiler/tileserver-gl/tags?page_size=100` trả các exact pin gần nhất:
  ```text
  v5.6.0
  v5.5.0
  v5.4.0
  v5.3.1
  ```
- **PASS — Tag metadata v5.6.0:** HTTP 200; `tag_status="active"`, `v2=true`, `media_type="application/vnd.oci.image.index.v1+json"`, `full_size=381303802`, digest `sha256:3a9ccdb24820b6814c8119bcc8a4376c39867cb0ffe69d62919ef898b90c2427`.
- **PASS — Tag metadata v5.5.0:** HTTP 200; `tag_status="active"`, `v2=true`, `media_type="application/vnd.oci.image.index.v1+json"`, `full_size=379972290`, digest `sha256:0472aa881c9965bcd578cbaaeeaf5ab86d5d92e10c64c48c6856a6b1b7beb13f`.

### Candidate manifest/pullability probes

- **APPROVED fallback pin — `maptiler/tileserver-gl:v5.6.0`:** `docker.exe manifest inspect` returned OCI index (`schemaVersion: 2`) with active `linux/amd64` digest `sha256:f5f954587478ca6be606f834fba1880b5ddd9c958132ded79a573bc1790a8bf0` and `linux/arm64` digest `sha256:2bee34c072c07d694f6fac75e17d2feb6227eaab007177179e9740822ab89cc6`.
- **APPROVED backup pin — `maptiler/tileserver-gl:v5.5.0`:** Docker Hub tag metadata returned HTTP 200 and active amd64/arm64 images; `docker manifest inspect` timed out on both allowed attempts, so no successful local manifest output is claimed for this tag.
- **PASS — no-pull local check:** `docker image inspect maptiler/tileserver-gl:v5.6.0` returned:
  ```text
  Error response from daemon: No such image: maptiler/tileserver-gl:v5.6.0
  IMAGE_NOT_PRESENT_NO_PULL
  ```
  Không pull image/layer; remote manifest/metadata là bằng chứng pullability an toàn trong phạm vi preflight.

### Storage/disk/ports

- **BLOCKED —** `storage_exists=False` for `storage/tiles/cadn`; không tạo thư mục/tải dữ liệu.
- **PASS —** `D_free_bytes=210348072960`.
- **PASS —** `port_8080=False`; **PASS —** `port_5432=True`.

### Kết luận fallback

| Hạng mục | Trạng thái | Phiên bản | Ghi chú |
|---|---|---|---|
| Chosen replacement pin | APPROVED | `maptiler/tileserver-gl:v5.6.0` | Exact tag tồn tại; metadata HTTP 200; manifest OCI hợp lệ |
| Backup replacement pin | APPROVED | `maptiler/tileserver-gl:v5.5.0` | Metadata HTTP 200; manifest probe timeout sau 2 lần |
| Original `v5.6.1` | BLOCKED | `maptiler/tileserver-gl:v5.6.1` | Không probe lại; evidence trước ghi HTTP 404/no such manifest |
| Image local pullability | BLOCKED/pending runtime pull | — | Không pull theo phạm vi; image chưa có local |
| Tile storage | BLOCKED | `storage/tiles/cadn` absent | Chưa tải/tạo dữ liệu |
| Disk | PASS | `D_free_bytes=210348072960` | Vượt ngưỡng 10 GB |
| Port 8080 | PASS | free | Không có listener |
| Port 5432 | PASS | listening | PostgreSQL hiện hữu |

### Recovery và giả định

- **Recovery:** lần probe manifest `v5.5.0` đầu timeout; wrapper recovery ban đầu ghi nguyên văn `Stop-Job : A parameter cannot be found that matches parameter name 'Force'.` và retry lần hai bằng cleanup tương thích (`Stop-Job` không `-Force`) vẫn timeout có kiểm soát. Không có retry thứ ba.
- **Lesson-learned:** đã thử cập nhật `Lesson-learned.md` mục về PowerShell timeout recovery compatibility nhưng permission policy từ chối edit (chỉ evidence path được phép); chưa ghi được bài học, cần authorized role cập nhật.
- **Giả định:** `v5.6.0` là fallback pin đề xuất gần nhất với tag lỗi; việc thay tag trong compose/ticket không thuộc phạm vi Tester và chưa thực hiện. `APPROVED` ở đây chỉ áp dụng cho tồn tại/manifest metadata read-only, chưa phải runtime service approval.

## Scope disposition

- **AC “Đã chốt tile data/provider/TileServer” — PASS/APPROVED tại ticket 00:** user đã chốt OSS tự host TileServer GL, OSM/OpenMapTiles/PMTiles, bbox `105.93,20.91,106.03,20.99`, OSM attribution/license, volume `./storage/tiles/cadn:/data:ro`, host port `8080`, outbound network tới Geofabrik/npm/Docker Hub, tối thiểu `10 GB` disk, network local, và exact effective fallback tag `maptiler/tileserver-gl:v5.6.0`; manifest evidence của tag `v5.6.0` đã có ở trên. TileServer live smoke và tile-data smoke là deliverable được ghi rõ của ticket `01`, không phải runtime bắt buộc của preflight ticket `00`. Đây là evidence phạm vi/traceability; không tuyên bố TileServer live hoặc tile-data smoke đã pass.
- **AC “Đã chốt khả năng build mobile” — PASS/APPROVED tại ticket 00:** user đã chốt Android native; JDK/Android SDK/ADB/emulator đã PASS theo evidence ở trên. Gradle wrapper và mobile project là deliverable của ticket `05`, không được tạo trong preflight ticket `00`; việc chưa có các artifact đó không chuyển AC này thành blocker của ticket `00`.
- **AC status/dependency:** chỉ ticket `01` được mở sau khi ticket `00` đóng. Ticket `02`–`05` vẫn blocked theo dependency graph tương ứng và không giao Developer bị block. Đây là evidence phạm vi/traceability, không phải kết quả triển khai downstream.

## Kiểm tra lại theo yêu cầu Planner — native Windows PowerShell, read-only

- **Phạm vi:** chỉ kiểm tra Docker Desktop, compose PostgreSQL đang chạy, PostgreSQL readiness và read-only connectivity tới database target đã duyệt `civicos_demo`; không chạy `up`, migration, reset, drop, source tests hoặc npm.
- **Wrapper:** các lệnh chạy qua native `powershell.exe` với wrapper `Invoke-Safe` inline. Không sửa compose và không dừng PostgreSQL.

### Kết quả thô

- **PASS** — `docker.exe info`
  ```text
  Client:
   Version:    29.6.2
   Context:    desktop-linux
  Server:
   Containers: 2
    Running: 1
    Paused: 0
    Stopped: 1
   Server Version: 29.6.2
   Operating System: Docker Desktop
   OSType: linux
   Architecture: x86_64
  EXIT_CODE=0
  ```

- **PASS** — `docker.exe compose -f D:/Project/CivicOS/docker-compose.yml ps`
  ```text
  NAME                 IMAGE                COMMAND                  SERVICE    CREATED       STATUS       PORTS
  civicos-postgres-1   postgres:16-alpine   "docker-entrypoint.s…"   postgres   3 hours ago   Up 3 hours   0.0.0.0:5432->5432/tcp, [::]:5432->5432/tcp
  EXIT_CODE=0
  ```

- **PASS** — PostgreSQL readiness
  ```text
  /var/run/postgresql:5432 - accepting connections
  EXIT_CODE=0
  ```

- **PASS** — read-only connectivity tới `civicos_demo`
  ```text
  BEGIN
  civicos_demo|civicos|f
  ROLLBACK
  EXIT_CODE=0
  ```
  Query chỉ dùng `BEGIN READ ONLY`, `SELECT current_database(), current_user, pg_is_in_recovery()` và `ROLLBACK`.

### Trục trặc trong lần chạy

- Lần probe connectivity đầu tiên lỗi do quoting PowerShell lồng nhau; PostgreSQL vẫn reachable nhưng `psql` trả `ERROR:  syntax error at or near "primary"`. Đã không retry bằng lệnh mutation; đã chạy lại riêng probe read-only với câu SQL không cần nested string literal và nhận kết quả PASS ở trên.
