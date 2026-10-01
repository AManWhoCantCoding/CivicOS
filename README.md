# CivicOS

CivicOS là nền tảng điều hành nghiệp vụ hướng sự kiện cho **Công an xã Nghĩa Trụ**. Repo hiện là một **modular monolith**: Next.js xử lý web/API, PostgreSQL lưu dữ liệu và một process worker xử lý outbox, projection, SLA và notification.

> **Trạng thái:** MVP đang mở rộng theo các tranche thiết kế PS-E1 và LND. Repo có các module `identity`, `incidents`, `inspections`, `vehicles`, `residents`, `land`, `map` và mobile read-only; chưa phải bản triển khai đầy đủ mọi yêu cầu production.

## Mục lục

- [Phạm vi và boundary](#phạm-vi-và-boundary)
- [Thuật ngữ domain](#thuật-ngữ-domain)
- [Kiến trúc](#kiến-trúc)
- [Công nghệ và yêu cầu môi trường](#công-nghệ-và-yêu-cầu-môi-trường)
- [Quick Start](#quick-start)
- [Chạy web local](#chạy-web-local)
- [Chạy bản build production local](#chạy-bản-build-production-local)
- [Cấu hình môi trường](#cấu-hình-môi-trường)
- [PostgreSQL, TileServer và Docker](#postgresql-tileserver-và-docker)
- [Bản đồ local](#bản-đồ-local)
- [Demo database và dữ liệu hiện có](#demo-database-và-dữ-liệu-hiện-có)
- [Mock/seed data theo tài liệu thiết kế](#mockseed-data-theo-tài-liệu-thiết-kế)
- [Ứng dụng mobile](#ứng-dụng-mobile-android)
- [Routes chính](#routes-chính)
- [Kiểm thử](#kiểm-thử)
- [Troubleshooting](#troubleshooting)
- [Cấu trúc repo](#cấu-trúc-repo)
- [Tài liệu liên quan](#tài-liệu-liên-quan)

## Phạm vi và boundary

### Đã có trong code

| Module                | Phạm vi hiện tại                                                                                                        |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `identity`            | Local auth, session, `Role`, capability, `OrganizationUnit`, `Assignment`, audit và masking.                            |
| `incidents`           | `IntakeReport`, phân loại/xác minh/chuyển tiếp/kết thúc `Incident`, `Approval` và SLA.                                  |
| `inspections`         | `Establishment`, lịch `Inspection`, checklist, `InspectionFinding`, `Evidence` và `EnforcementRecommendation`.          |
| `vehicles`            | `SuspiciousVehicleRegistry`, `VehicleObservation`, match, verification và escalation.                                   |
| `residents`           | `Subject`, `SubjectManagementRecord`, activity theo dõi và `ResidentMonthlyReport`.                                     |
| `land`                | Parcel/party, hồ sơ biến động, review/approval, sync adapter và public lookup projection.                               |
| `map`                 | MapLibre/TileServer GL OSS, projection marker từ `Incident`/`Inspection`, masking và giới hạn ghi khi offline.          |
| `platform`/`eventing` | `Evidence`, `SlaInstance`, `Notification`, `OfflineCommand`, `DomainEvent`, transactional outbox, projection và worker. |
| `mobile-readonly`     | API read-only cho `RelatedInfo`, alarm, dispatch và task; quyền đọc dựa trên `Assignment`.                              |

### Tranche thiết kế

Tài liệu thiết kế `.scratch/civicos-e1-clone-mvp/spec.md` chọn nền tảng tối thiểu và ba story:

- PS-E1-004 — quản lý cư dân đặc biệt.
- PS-E1-005 — ghi nhận và theo dõi tố giác qua `IntakeReport`.
- PS-E1-007 — quản lý cơ sở kinh doanh có điều kiện và `Inspection`.
- Mobile dùng backend chung nhưng chỉ read-only cho E1-004/E1-007; E1-005 là web-only.
- Không có public citizen app, tích hợp thật LPR/SMS/FCM/VietGeoX/VBDLIS hoặc ký số trong MVP; các nguồn này dùng adapter/mock boundary.

PS-E1-001 đến PS-E1-010 là phạm vi yêu cầu tổng thể, không đồng nghĩa mọi story đã hoàn tất trong repo hiện tại.

### Quy tắc domain quan trọng

- `IntakeReport` là tin đầu vào trước xử lý; không dùng `Incident` để gọi một tin chưa được convert.
- `Incident` là vụ việc nội bộ sau khi cán bộ xác nhận/convert.
- `Subject` là đối tượng dữ liệu, không phải `User`/`Actor`.
- `SubjectManagementRecord` là hồ sơ quản lý theo một mục đích cụ thể của một `Subject`.
- `Assignment` cấp quyền tối thiểu cho một nhiệm vụ, không cấp quyền xem toàn bộ dữ liệu của đơn vị.
- `Evidence` là ảnh/tài liệu/vị trí có metadata và nguồn gốc; không coi tệp có giá trị nghiệp vụ chỉ là `Attachment`.
- `DomainEvent` mô tả thay đổi nghiệp vụ; `AuditEvent` ghi nhận việc đọc/thay đổi để truy vết.
- `Approval` dành cho bước có thẩm quyền cao, không phải một cập nhật trạng thái thông thường.

Các vòng đời tiêu biểu:

```text
IntakeReport
  → RECEIVED → VERIFIED → PROCESSED → CLOSED
                └──────→ REJECTED
  → convert ──→ Incident(received)
                  → classified → verifying
                  → resolved → closed
```

```text
Establishment
  → Inspection(scheduled) → in_progress → completed
  → checklist/finding/Evidence
  → EnforcementRecommendation(pending_approval)
  → approved | rejected | transferred
```

```text
SuspiciousVehicleRegistry
  → VehicleObservation(recorded)
  → match_suggested → match_confirmed
  → verification → escalated (nếu cần)
```

## Kiến trúc

```text
Browser / mobile app
        │
        ▼
Next.js App Router + API Route Handlers
        │
        ▼
Domain modules
  ├─ identity
  ├─ incidents
  ├─ inspections
  ├─ vehicles
  ├─ residents
  ├─ land
  ├─ platform / mobile-readonly
  └─ eventing
        │
        ├─ Prisma transaction ──► PostgreSQL
        └─ EventRecord + OutboxMessage
                                      │
                                      ▼
                              src/worker.ts
                              ├─ projections
                              ├─ event history
                              ├─ SLA overdue checks
                              └─ notifications
```

Mutation nghiệp vụ quan trọng phải đi qua domain command để transaction ghi dữ liệu, `DomainEvent` và `AuditEvent`. Worker xử lý `OutboxMessage`; không cần message broker trong MVP.

## Công nghệ và yêu cầu môi trường

| Lớp                | Công nghệ                                                |
| ------------------ | -------------------------------------------------------- |
| Web/full-stack     | Next.js `16.3.5`, React `19.2.8`, TypeScript `5`         |
| UI                 | Tailwind CSS `4`, MapLibre GL JS                         |
| Backend            | Node.js, `tsx`, Prisma `6.19`                            |
| Database           | PostgreSQL/PostGIS `16` qua `postgis/postgis:16-3.4`     |
| Web tests          | Vitest, `@playwright/test`                               |
| Browser acceptance | Python `3.13+`, `pytest`, `pytest-playwright`, `psycopg` |
| Mobile             | React Native `0.85.3`, MapLibre React Native `11.4.0`    |

Cần có:

- Node.js và npm tương thích với Next.js `16.3.5`; kiểm tra bằng `node --version` và `npm --version`.
- Docker Desktop hoặc Docker Engine có Docker Compose; host cần mở được PostgreSQL ở port `5432`.
- Python `3.13+` và CPython native trên Windows nếu chạy bộ test trong `playwright/`. Bộ này không có đường chạy chuẩn từ WSL/Linux.
- Android SDK có platform/Build Tools API `35`, `adb`, một emulator hoặc thiết bị Android (min SDK `24`), và JDK khả dụng qua `JAVA_HOME` hoặc `PATH` nếu build mobile. Repo dùng React Native `0.85.3`, Android Gradle Plugin `8.7.3` và Gradle wrapper `8.13`.
- Tile asset local tại `storage/tiles/cadn/` nếu cần xem basemap; thư mục này bị gitignore và không được repo cung cấp.

## Quick Start

Các lệnh dưới đây chạy từ thư mục gốc repository. Giữ Next.js và worker ở hai terminal riêng; worker là process bắt buộc nếu muốn outbox, projection, SLA và notification được xử lý liên tục.

### Linux/macOS/Git Bash

```bash
test -f .env || cp .env.example .env
npm install
docker compose up -d postgres
npm run prisma:generate
npm run prisma:migrate

# Tuỳ chọn nếu cần bản đồ local
docker compose up -d tileserver

# Terminal 1
npm run dev

# Terminal 2
npm run worker
```

Mở <http://localhost:3000>. Đọc [Cấu hình môi trường](#cấu-hình-môi-trường) và [Demo database](#demo-database-và-dữ-liệu-hiện-có) trước khi chạy seed/reset.

### Windows PowerShell

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm install
docker compose up -d postgres
npm run prisma:generate
npm run prisma:migrate

# Tuỳ chọn nếu cần bản đồ local
docker compose up -d tileserver

# Terminal 1
npm run dev

# Terminal 2
npm run worker
```

Mở <http://localhost:3000>. Docker Desktop phải đang chạy và PowerShell phải nhìn thấy lệnh `docker compose`.

## Chạy web local

### 1. Tạo và kiểm tra `.env`

Linux/macOS/Git Bash:

```bash
test -f .env || cp .env.example .env
```

PowerShell:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Sau đó mở `.env` và kiểm tra `DATABASE_URL` đang trỏ tới database development `civicos`, không phải `civicos_demo` nếu đang chạy web local thông thường. Không dán password, token, `SESSION_SECRET` thật hoặc PII vào README hay commit chúng.

### 2. Khởi động PostgreSQL

```bash
docker compose up -d postgres
```

Nếu đang dùng WSL và `docker` không khả dụng, dùng `docker.exe compose ...` hoặc bật WSL integration trong Docker Desktop.

Kiểm tra service đã sẵn sàng:

```bash
docker compose ps postgres
docker compose exec postgres pg_isready -U civicos -d civicos
```

### 3. Cài dependency, Prisma Client và migration

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
```

`npm run prisma:generate` sinh Prisma Client từ `prisma/schema.prisma`. `npm run prisma:migrate` gọi `prisma migrate dev`, dành cho development và có thể yêu cầu đặt tên migration khi schema thay đổi. Khi chỉ muốn áp dụng các migration đã commit (staging/production hoặc một database đã có migration), dùng `npm run prisma:migrate:deploy`; lệnh này không tạo migration mới.

### 4. Chạy Next.js và worker

Mở hai terminal:

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run worker
```

Mở <http://localhost:3000>. Trong development, luồng auth có thể tạo các tài khoản local mẫu; đây là fixture synthetic và mật khẩu mặc định là `civicos-dev`. Xem [Tài khoản development](#tài-khoản-development-synthetic) để biết boundary của các tài khoản này.

## Chạy bản build production local

Đây chỉ là cách kiểm tra bản build production trên máy local, không phải hướng dẫn triển khai hạ tầng. Dùng `SESSION_SECRET` đủ mạnh và không dùng tài khoản/secret development khi chạy với `NODE_ENV=production`.

Linux/macOS/Git Bash:

```bash
export NODE_ENV=production
npm run prisma:generate
npm run prisma:migrate:deploy
npm run build

# Terminal 1
npm run start

# Terminal 2
npm run worker
```

PowerShell:

```powershell
$env:NODE_ENV = "production"
npm run prisma:generate
npm run prisma:migrate:deploy
npm run build

# Terminal 1
npm run start

# Terminal 2
npm run worker
```

`npm run start` dùng port `3000` mặc định. Có thể truyền port cho Next bằng `npm run start -- --port 3000`; worker không mở HTTP port riêng và phải dùng cùng `DATABASE_URL`, `SESSION_SECRET` và worker settings với web process.

## Cấu hình môi trường

`.env.example` cung cấp các giá trị local không nhạy cảm cho database/worker. `DEMO_NOW` và các map override có thể được thêm vào `.env` local hoặc truyền theo từng process; không commit `.env` (file này và `.env*.local` đã bị gitignore).

| Biến                       | Ý nghĩa                                                                                   | Giá trị local minh hoạ                                                   |
| -------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `DATABASE_URL`             | Database mà Prisma/web/worker đang dùng.                                                  | `postgresql://civicos:civicos@localhost:5432/civicos?schema=public`      |
| `DEMO_DATABASE_URL`        | Target ưu tiên cho `demo:seed` và `demo:reset`; database name phải là `civicos_demo`.     | `postgresql://civicos:civicos@localhost:5432/civicos_demo?schema=public` |
| `DEMO_NOW`                 | Canonical timestamp bắt buộc cho demo seed/bootstrap; phải là ISO-8601 có timezone.       | `2026-09-28T08:00:00.000Z`                                               |
| `EVENT_WORKER_INTERVAL_MS` | Khoảng thời gian giữa các tick worker, tính bằng milliseconds.                            | `1000`                                                                   |
| `EVENT_MAX_ATTEMPTS`       | Số lần retry tối đa cho outbox message trước khi dead-letter.                             | `5`                                                                      |
| `SESSION_SECRET`           | Key dẫn xuất cho session và mã hoá dữ liệu nhạy cảm. Production bắt buộc phải có giá trị. | `<secret-ngau-nhien-chi-dung-local>`                                     |
| `DEMO_RESET_CONFIRM`       | Cho phép thao tác reset demo phá huỷ; chỉ giá trị đúng `1` mới được tính là xác nhận.     | `0`                                                                      |
| `MAP_TILE_BASE_URL`        | Base URL của TileServer/provider bản đồ.                                                  | `http://localhost:8080`                                                  |
| `MAP_TILE_STYLE_URL`       | URL style JSON; mặc định ghép từ tile base URL.                                           | `http://localhost:8080/styles/basic-preview/style.json`                  |
| `MAP_TILE_ATTRIBUTION`     | Attribution hiển thị cho bản đồ; phải chứa chuỗi `OpenStreetMap`.                         | `© OpenStreetMap contributors`                                           |

`DEMO_NOW` không được bỏ trống khi chạy `npm run demo:seed` hoặc `npm run demo:bootstrap`. Parser chấp nhận timestamp có dạng ISO-8601 với `Z` hoặc offset timezone, ví dụ `2026-09-28T08:00:00.000Z`; giá trị thiếu, sai format hoặc không có timezone trả `DEMO_NOW_INVALID` trước khi seed làm thay đổi dữ liệu. Runtime thông thường không bị ép dùng demo clock.

Trong demo command, `DEMO_DATABASE_URL` được ưu tiên hơn `DATABASE_URL` và không tự sửa database name. Vì `demo:bootstrap` chạy `prisma migrate deploy` trước khi gọi seed, hãy đặt `DATABASE_URL` và `DEMO_DATABASE_URL` cùng trỏ tới `civicos_demo` trong chính process bootstrap. `SESSION_SECRET` trong ví dụ chỉ là placeholder; không dùng giá trị placeholder hoặc secret development khi triển khai production.

## PostgreSQL, TileServer và Docker

`docker-compose.yml` có hai service:

- `postgres`: image `postgis/postgis:16-3.4`, host port `5432`, named volume `civicos-postgres`.
- `tileserver`: image `maptiler/tileserver-gl:v5.6.0`, host port `8080`, đọc `storage/tiles/cadn/` ở chế độ read-only.

Lệnh thường dùng:

```bash
docker compose up -d postgres
docker compose up -d postgres tileserver
docker compose ps
docker compose logs -f postgres
docker compose logs -f tileserver
docker compose exec postgres pg_isready -U civicos -d civicos
docker compose stop
docker compose down
```

`docker compose stop` dừng service nhưng giữ container/volume; `docker compose down` xoá container và network nhưng giữ named volume. Không dùng `docker compose down -v` như cách reset thông thường: `-v` xoá volume `civicos-postgres`, có thể làm mất cả `civicos` và `civicos_demo`. Reset demo an toàn hơn phải đi qua `npm run demo:reset` với guard ở phần dưới.

Khi kết thúc local run, nhấn `Ctrl+C` trong terminal của Next.js và worker, sau đó dùng `docker compose stop` nếu muốn dừng PostgreSQL/TileServer mà vẫn giữ dữ liệu.

## Bản đồ local

`docker-compose.yml` cung cấp TileServer GL:

```bash
docker compose up -d postgres tileserver
```

Tile data được mount read-only từ `storage/tiles/cadn/`. Thư mục `storage/` bị ignore trong git, vì vậy tile asset phải được cung cấp riêng trên máy chạy app. Nếu chỉ cần chạy domain/API, có thể khởi động riêng `postgres` và bỏ qua `tileserver`.

Kiểm tra TileServer trước khi mở map:

```bash
curl http://localhost:8080/health
```

PowerShell:

```powershell
Invoke-WebRequest http://localhost:8080/health
```

Runtime map hiện dùng:

- Tile base URL mặc định: `http://localhost:8080`.
- Style mặc định: `${MAP_TILE_BASE_URL}/styles/basic-preview/style.json`.
- Attribution: `© OpenStreetMap contributors`.
- `MAP_TILE_ATTRIBUTION` phải có `OpenStreetMap`, nếu không provider bị từ chối.
- CADN bounds: longitude `105.93..106.03`, latitude `20.91..20.99`.
- Projection marker hiện đọc aggregate `Incident` và `Inspection`; không tự suy diễn polygon từ một point.
- Basemap có thể xem offline; mutation nghiệp vụ yêu cầu online trong MVP.

## Demo database và dữ liệu hiện có

Demo dùng database riêng `civicos_demo`, không dùng trực tiếp database `civicos`.

### Bootstrap

Bash/Git Bash:

```bash
export DEMO_DATABASE_URL="postgresql://civicos:civicos@localhost:5432/civicos_demo?schema=public"
export DATABASE_URL="$DEMO_DATABASE_URL"
export DEMO_NOW="2026-09-28T08:00:00.000Z"
npm run demo:bootstrap
```

PowerShell:

```powershell
$env:DEMO_DATABASE_URL = "postgresql://civicos:civicos@localhost:5432/civicos_demo?schema=public"
$env:DATABASE_URL = $env:DEMO_DATABASE_URL
$env:DEMO_NOW = "2026-09-28T08:00:00.000Z"
npm run demo:bootstrap
```

`demo:bootstrap` chạy `prisma migrate deploy` trên `DATABASE_URL`, sau đó chạy `scripts/demo/seed.ts`. Seed validate `DEMO_NOW` trước target/mutation; các fixture hiện tại vẫn khai báo timestamp canonical trong seed và có thể chạy lại; cuối seed đã drain outbox hiện có, nhưng vẫn có thể chạy `npm run worker` để xử lý event mới.

Sau khi bootstrap trong một shell, hãy mở shell mới hoặc trả `DATABASE_URL` về database development `civicos` trước khi chạy web local thông thường; tránh vô tình cho web/worker dùng `civicos_demo`.

Guard demo chỉ chấp nhận database có tên **chính xác** `civicos_demo`. `DEMO_DATABASE_URL` được ưu tiên trước `DATABASE_URL`, không tự đổi tên URL. Reset là thao tác phá hủy:

```bash
export DEMO_DATABASE_URL="postgresql://civicos:civicos@localhost:5432/civicos_demo?schema=public"
export DATABASE_URL="$DEMO_DATABASE_URL"
export DEMO_RESET_CONFIRM=1
npm run demo:reset

# Hoặc xác nhận bằng flag, không cần DEMO_RESET_CONFIRM=1
unset DEMO_RESET_CONFIRM
npm run demo:reset -- --confirm
```

PowerShell:

```powershell
$env:DEMO_DATABASE_URL = "postgresql://civicos:civicos@localhost:5432/civicos_demo?schema=public"
$env:DATABASE_URL = $env:DEMO_DATABASE_URL
$env:DEMO_RESET_CONFIRM = "1"
npm run demo:reset

# Hoặc xác nhận bằng flag, không cần DEMO_RESET_CONFIRM=1
Remove-Item Env:DEMO_RESET_CONFIRM -ErrorAction SilentlyContinue
npm run demo:reset -- --confirm
```

Lệnh reset chỉ chạy khi đồng thời thỏa hai điều kiện: URL đã chọn có database name chính xác là `civicos_demo`, và có `DEMO_RESET_CONFIRM=1` hoặc `--confirm`. Guard chạy trước khi import Prisma/ mở connection. Target sai trả `DEMO_RESET_REFUSED`; thiếu xác nhận trả `DEMO_RESET_CONFIRM_REQUIRED`; cả hai trường hợp đều không truncate database nào. Nếu không có URL, command trả `DEMO_DATABASE_URL_REQUIRED`.

Reset truncate toàn bộ application model được liệt kê trong `scripts/demo/reset.ts` bằng `RESTART IDENTITY CASCADE`, giữ `_prisma_migrations`, schema và mọi dữ liệu trong database `civicos`. Chỉ Evidence có `metadata.demoNamespace="civicos-demo"` được dọn file vật lý trước khi xoá row; Evidence ngoài namespace và toàn bộ `storage/tiles/**` được giữ nguyên. Đây vẫn là thao tác destructive trên `civicos_demo`, nên kiểm tra URL đã sanitize và database đích trước khi xác nhận.

### Tài khoản development (synthetic)

Các tài khoản dưới đây chỉ là fixture development synthetic do `ensureDevelopmentUsers()`/demo seed tạo trong môi trường không phải production. Email dùng miền `.local`, không phải danh tính thật; không dùng các tài khoản này cho production. Mật khẩu development mặc định của toàn bộ tài khoản là `civicos-dev`.

| Email                             | Role                 | OrganizationUnit     |
| --------------------------------- | -------------------- | -------------------- |
| `truong@civicos.local`            | `commander`          | Công an xã Nghĩa Trụ |
| `trucban@civicos.local`           | `duty_officer`       | Công an xã Nghĩa Trụ |
| `hientruong@civicos.local`        | `field_officer`      | Công an xã Nghĩa Trụ |
| `vanphong@civicos.local`          | `office_officer`     | Công an xã Nghĩa Trụ |
| `thon@civicos.local`              | `village_officer`    | Công an xã Nghĩa Trụ |
| `khongduocphancong@civicos.local` | `field_officer`      | Công an xã Nghĩa Trụ |
| `captren@civicos.local`           | `superior_officer`   | Công an cấp trên     |
| `captren-chihuy@civicos.local`    | `superior_commander` | Công an cấp trên     |
| `system-operator@civicos.local`   | `system_operator`    | Công an xã Nghĩa Trụ |
| `commander@civicos.local`         | `commander`          | Công an xã Nghĩa Trụ |
| `field@civicos.local`             | `field_officer`      | Công an xã Nghĩa Trụ |

### Scenario hiện có sau `demo:bootstrap`

| Nhãn                                      | Dữ liệu                                                                                                                                                              |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[DEMO-INCIDENT-01]` / `demo-incident-01` | Một `IntakeReport` `direct` được verify/convert, một `Incident` được phân loại `an_ninh_trat_tu`/`trung_binh` và phân công cho `hientruong@civicos.local`.           |
| `[DEMO] Quan karaoke Sao Dem`             | Một `Establishment` loại `Karaoke` và một `Inspection` `scheduled` vào `2026-03-10T08:00:00.000Z`, phân công fieldwork. Checklist template được tạo theo loại cơ sở. |
| `43DEMO01` / `demo-observation-01`        | Một registry active và một `VehicleObservation` synthetic tại `20.98, 106.05`; observation được gợi ý match với registry.                                            |

Worker được drain ở cuối `seedDemo`, nhưng có thể chạy lại `npm run worker` để tiếp tục xử lý các event mới.

## Mock/seed data theo tài liệu thiết kế

Phần này là checklist dữ liệu cần có để demo các màn hình trong `.scratch/civicos-e1-clone-mvp/ui/brief.md` và các AC trong `Requirement.md`. Dữ liệu demo phải synthetic. Khi tạo dữ liệu có event/audit/SLA/projection, ưu tiên gọi domain command thay vì insert trực tiếp vào bảng dẫn xuất.

| Nhóm                     | Dữ liệu tối thiểu cần seed để phủ thiết kế                                                                                                                                                                                                                                                                                                            | Hiện trạng                                                                                                                                                                                                                                             |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Identity/reference       | Hai `OrganizationUnit` có quan hệ cấp trên; các role; user commander/duty/field/office/village/superior; active `Assignment` cho từng resource và task.                                                                                                                                                                                               | `ensureDevelopmentUsers()` đã tạo unit, role và user. `demo:seed` có Assignment cho Incident; Inspection schedule tự tạo Assignment fieldwork. Cần thêm `resident_followup`, `mobile_read` và các assignment cho business/finding nếu muốn phủ mobile. |
| PS-E1-004 residents      | Ba `subjectType`: `temporary_resident`, `foreign_resident`, `reintegration`; record `open` có risk `normal`/`high`; tọa độ; một hồ sơ quá hạn, một sắp hạn, một đúng hạn; activity `checkup` có Actor/thời gian/Assignment và Evidence; monthly report ở `draft`, `approved`, `sent`.                                                                 | `src/modules/residents/seed.ts` chỉ có helper tạo 3 Subject/record, trong đó `reintegration` quá hạn. Helper không tạo tọa độ, Assignment, activity, Evidence hoặc report và hiện không được gọi từ `scripts/demo/seed.ts`.                            |
| PS-E1-005 intake         | `sourceChannel`: `direct`, `phone`, `app`, `district_transfer`; các status `RECEIVED`, `VERIFIED`, `PROCESSED`, `CLOSED`, `REJECTED`; nội dung/tọa độ; sourceName/sourceContact/sensitiveRef được mã hóa và mask; SLA recording 24h, verification 48h, result 20 ngày; ít nhất một case convert thành Incident và một case transfer pending Approval. | Demo chỉ tạo một report `direct` rồi verify/convert. Chưa có ma trận status/channel/masking/transfer đủ để trình diễn toàn bộ queue/detail.                                                                                                            |
| Incident/map             | Incident ở các status `received`, `classified`, `verifying`, `resolved`, `closed`, `transferred`; category/severity khác nhau; tọa độ trong CADN bounds; Assignment `incident_verification`; projection/audit/event tương ứng.                                                                                                                        | Demo có một Incident `classified` và một Assignment. Map projection hiện chỉ lấy `Incident`/`Inspection`; chưa có aggregate `Hotspot` độc lập.                                                                                                         |
| PS-E1-007 establishments | Cơ sở loại `Karaoke`, `Bar`, `Cầm đồ`, `Game`, `Nhà nghỉ`/`Khách sạn`; risk `low`, `medium`, `high`; status `active`/`archived`; license, owner, address và tọa độ.                                                                                                                                                                                   | Demo chỉ có một `Karaoke` active. `ensureTemplate()` đã có nhánh checklist cho karaoke/bar, nhà nghỉ/khách sạn, cầm đồ và game.                                                                                                                        |
| Inspection               | Inspection `scheduled`, `in_progress`, `completed`; checklist response đầy đủ; result `pass`, `reminder`, `needs_action`; finding có severity/category; Evidence ảnh có GPS; recommendation `pending_approval`, `approved`, `rejected`, `transferred`; SLA xử lý 7 ngày.                                                                              | Demo chỉ tạo Inspection `scheduled`; chưa tạo finding, Evidence, recommendation hoặc đủ ba result.                                                                                                                                                     |
| Vehicle/LPR              | Registry `active`, `expired`, `revoked`; observation `recorded`, `match_suggested`, `match_confirmed`, verification và `escalated`; tọa độ, thời gian, ảnh Evidence và Assignment `vehicle_verification`.                                                                                                                                             | Demo có một registry active và một observation có match suggestion. Camera adapter chưa ghi DB.                                                                                                                                                        |
| Mobile read-only         | Resource có Assignment `mobile_read` cho actor đúng OU: `RESIDENT` từ `SubjectManagementRecord`, `BUSINESS` từ `Establishment`, `HOTSPOT` hiện được chiếu từ `Incident`, `VIOLATION` từ `InspectionFinding`; thêm unread `Notification` để hiện alarm và active Assignment để hiện dispatch/task.                                                     | Mobile surface lấy dữ liệu từ domain hiện có, không có mobile seed model riêng. Nếu thiếu Assignment thì API trả empty/forbidden dù bản ghi gốc tồn tại.                                                                                               |
| Shared kernel            | `Evidence`, `SlaInstance`, `Notification`, `DomainEvent`, `EventRecord`, `OutboxMessage`, `ProjectionRecord`, `AuditEvent`; cần cả trạng thái bình thường, warning/overdue, unread/read và permission/masking.                                                                                                                                        | Các bảng và worker đã có. Nên tạo qua command rồi chạy `processOutboxUntilIdle`/worker, không seed thủ công projection/outbox nếu không phải test fixture.                                                                                             |

### Camera mock cố định

`MOCK_CAMERA_FIXTURES` trong `src/modules/vehicles/mock-camera-adapter.ts` hiện có ba observation in-memory:

| Plate      | ObservedAt                 | Latitude | Longitude |
| ---------- | -------------------------- | -------: | --------: |
| `89A12345` | `2026-09-19T01:00:00.000Z` | `20.960` | `105.930` |
| `29B67890` | `2026-09-19T01:05:00.000Z` | `20.961` | `105.931` |
| `89C11223` | `2026-09-19T01:10:00.000Z` | `20.962` | `105.932` |

Đây là adapter fixture, không phải bản ghi `VehicleObservation` trong PostgreSQL. Khi camera không khả dụng, luồng nhập biển số thủ công vẫn phải hoạt động. Lưu ý observation demo `43DEMO01` dùng longitude `106.05`, nằm ngoài CADN bounds hiện tại; không dùng bản ghi này để kiểm tra marker map trong bounds.

### Thứ tự seed được khuyến nghị

1. Gọi `ensureDevelopmentUsers()` và xác định actor/OU.
2. Tạo Subject, IntakeReport, Incident, Establishment, Inspection và Vehicle bằng domain commands.
3. Tạo Assignment cho đúng `task` và `organizationId`.
4. Tạo activity/finding/verification, gắn Evidence synthetic và tạo Approval khi flow yêu cầu.
5. Tạo report/notification qua command; không đưa dữ liệu nhạy cảm plaintext vào fixture.
6. Chạy worker hoặc `processOutboxUntilIdle`, sau đó kiểm tra `/api/health/worker`.

## Ứng dụng mobile (Android)

Mobile nằm trong `mobile/`, dùng backend/API của CivicOS và giữ boundary read-only cho E1-004/E1-007. Repo hiện có Android project; không có hướng dẫn iOS trong phạm vi này.

Cài dependency, chạy Metro, typecheck, test và build debug:

```bash
npm --prefix mobile install

# Terminal 1: Metro
npm --prefix mobile start

# Terminal 2: checks/build
npm run mobile:typecheck
npm run mobile:test
npm run mobile:build
```

`npm --prefix mobile start` giữ Metro ở một terminal. Trên Windows, `npm run mobile:build` gọi `mobile/android/gradlew.bat assembleDebug`. Trên Linux/macOS, dùng wrapper tương ứng nếu cần build trực tiếp:

```bash
./mobile/android/gradlew -p mobile/android assembleDebug
```

### API base URL cho Android

Mobile chỉ nhận base URL `http://` hoặc `https://` qua runtime/build-time injection. Android đọc Gradle property `CIVICOS_API_BASE_URL` trong `mobile/android/app/build.gradle`; không hard-code URL production vào source. Với Android Emulator, host machine được map qua `http://10.0.2.2:3000` (không dùng `localhost` trong app emulator).

Windows PowerShell, cài APK debug và inject URL:

```powershell
.\mobile\android\gradlew.bat -p .\mobile\android installDebug -PCIVICOS_API_BASE_URL=http://10.0.2.2:3000
```

Linux/macOS:

```bash
./mobile/android/gradlew -p mobile/android installDebug -PCIVICOS_API_BASE_URL=http://10.0.2.2:3000
```

Nếu URL không có hoặc không hợp lệ, app báo `CIVICOS_API_BASE_URL_REQUIRED`; sau khi đổi URL cần build/install lại APK. Các surface mobile hiện có gồm auth/main/map, `RelatedInfo` read-only, alarms, dispatches, tasks và settings. `WriteGuard` chặn HTTP write; không thêm CTA tạo/cập nhật cư dân hoặc cơ sở từ mobile trong tranche này.

## Routes chính

### Web pages

| Route                                               | Mục đích                                |
| --------------------------------------------------- | --------------------------------------- |
| `/`                                                 | Trung tâm điều hành và navigation shell |
| `/login`                                            | Đăng nhập                               |
| `/map`                                              | Workspace bản đồ                        |
| `/incidents`, `/incidents/:incidentId`              | Queue và chi tiết Incident              |
| `/intake`, `/intake/:reportId`                      | Queue và chi tiết IntakeReport          |
| `/residents`, `/residents/:subjectId`               | Danh sách/chi tiết Subject              |
| `/residents/:subjectId/records/:recordId`           | Hồ sơ quản lý và activity               |
| `/residents/reports`                                | Preview/approval/send báo cáo tháng     |
| `/land`, `/land/parcels`                            | Workspace land và danh sách thửa        |
| `/land/parcels/:parcelId`                           | Chi tiết thửa                           |
| `/land/applications`                                | Queue hồ sơ biến động                   |
| `/land/applications/new`                            | Tạo hồ sơ biến động                     |
| `/land/applications/:applicationId`                 | Chi tiết, review, sync và approval      |
| `/public/land/lookup`                               | Public lookup projection                |
| `/inspections/establishments`                       | Danh sách cơ sở                         |
| `/inspections/establishments/:establishmentId`      | Chi tiết cơ sở                          |
| `/inspections/:inspectionId`                        | Checklist, finding, recommendation      |
| `/vehicles/registry`                                | Registry phương tiện                    |
| `/field/vehicles`, `/field/vehicles/:observationId` | Observation và verification             |
| `/field/offline`                                    | Offline queue/sync                      |
| `/identity`, `/assignments`, `/users`               | Identity, Assignment và User            |

### API groups

- `/api/auth/session`
- `/api/incidents`, `/api/incidents/:incidentId/commands`
- `/api/intake-reports`, `/api/intake-reports/:reportId/commands`
- `/api/establishments`, `/api/inspections`, `/api/inspections/:inspectionId/commands`
- `/api/vehicles/registry`, `/api/vehicles/observations`
- `/api/residents`, `/api/residents/:subjectId/management-records`, `/api/residents/reports`
- `/api/land/parcels`, `/api/land/parties`, `/api/land/applications`
- `/api/public/land/lookup`
- `/api/related-info/*`, `/api/forces/*`
- `/api/map/config`, `/api/map/health`, `/api/map/layers`, `/api/map/markers`
- `/api/evidence`, `/api/notifications`, `/api/sync`
- `/api/identity/users`, `/api/identity/organization-units`, `/api/identity/assignments`
- `/api/health/worker`

## Kiểm thử

### Web/unit/integration

Kiểm tra thông thường không cần PostgreSQL cho các test thuần unit/contract, nhưng Prisma Client vẫn nên được sinh trước. Bộ kiểm tra nhanh tương ứng với cấu hình `package.json`:

```bash
npm run prisma:generate
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

`npm test` chạy Vitest một lần; dùng `npm run test:watch` khi phát triển. Các file có hậu tố/logic PostgreSQL được gate bằng `RUN_DB_TESTS=1`, nên nếu không bật biến này chúng sẽ bị skip chứ không chứng minh database path đã pass.

Các test cần PostgreSQL phải có Docker service `postgres` đang ready, `DATABASE_URL` trỏ tới một database disposable đã chạy migration, và Prisma Client đã được generate:

```bash
docker compose up -d postgres
npm run prisma:generate
npm run prisma:migrate:deploy
RUN_DB_TESTS=1 npm test
```

PowerShell:

```powershell
docker compose up -d postgres
npm run prisma:generate
npm run prisma:migrate:deploy
$env:RUN_DB_TESTS = "1"
npm test
```

Không chạy DB test trên database production hoặc database có dữ liệu cần giữ. Integration `tests/integration/demo-seed-reset.integration.test.ts` có thêm các biến tùy chọn theo đúng code hiện tại: `DEMO_DATABASE_URL` hoặc `DATABASE_URL` cho target demo, `CIVICOS_TEST_DATABASE_URL` hoặc `CIVICOS_E2E_DATABASE_URL` cho một database test không phải `civicos_demo`, và `CIVICOS_DATABASE_URL` cho database non-demo dùng làm snapshot đối chiếu. Test này có destructive reset fixture, chỉ dùng với database disposable.

### TypeScript Playwright E2E

```bash
npm run test:e2e
```

Bộ này dùng `playwright.config.ts`, test trong `tests/e2e/` và `scripts/e2e/playwright-services.mjs`. Service script deploy migration trên `DATABASE_URL`, build app, khởi động Next production ở port `3001` cùng worker rồi mới chạy Chromium E2E; không cần tự mở `npm run dev`/`npm run worker` trước khi gọi lệnh này. Dùng một database test/disposable và để port `3001` trống. Nó khác với browser acceptance suite Python.

### Python browser acceptance suite

Suite chuẩn được hỗ trợ trên **Windows native PowerShell** với CPython `3.13+`; không chạy từ WSL/Linux path và không phải mobile native/iOS test. Xem [`playwright/README.md`](playwright/README.md) để biết canonical setup, fixture và lifecycle. Lệnh cơ bản:

```powershell
Set-Location playwright
py -3.13 -m venv .venv
.venv\Scripts\python.exe -m pip install -e .
.venv\Scripts\python.exe -m playwright install chromium
.venv\Scripts\python.exe -m pytest --browser chromium
```

Harness dùng database riêng `civicos_e2e`, tự generate/migrate và seed reference identity/configuration; business records được tạo qua UI trong test. Mặc định chạy Chromium desktop và touch viewport; `CIVICOS_E2E_DATABASE_URL` chọn host/credential nhưng path được đổi thành `civicos_e2e`, `CIVICOS_E2E_APP_PORT` mặc định `4317`, `CIVICOS_E2E_TIMEOUT` mặc định `90`, và `CIVICOS_E2E_PROJECT=desktop|mobile|all` chọn viewport. Harness hỗ trợ `--recreate-e2e-db` để drop/recreate trước run, `--drop-e2e-db` để xoá sau run và `--keep-e2e-db` để giữ database khi debug. Không nhầm viewport `mobile` của Chromium với ứng dụng React Native.

## Các lệnh thường dùng

| Lệnh                                 | Mục đích                       |
| ------------------------------------ | ------------------------------ |
| `npm run dev`                        | Next.js development server     |
| `npm run build` / `npm run start`    | Build/chạy production server   |
| `npm run worker`                     | Event/SLA worker               |
| `docker compose up -d postgres`      | Khởi động PostgreSQL           |
| `docker compose up -d tileserver`    | Khởi động TileServer GL        |
| `docker compose ps`                  | Xem trạng thái service         |
| `docker compose logs -f postgres`    | Theo dõi log PostgreSQL        |
| `docker compose stop`                | Dừng service, giữ volume       |
| `npm run prisma:generate`            | Sinh Prisma Client             |
| `npm run prisma:migrate`             | Migration development          |
| `npm run prisma:migrate:deploy`      | Apply migration deployment     |
| `npm run demo:bootstrap`             | Migrate và seed `civicos_demo` |
| `npm run demo:seed`                  | Seed demo idempotent           |
| `npm run demo:reset`                 | Reset demo sau khi xác nhận    |
| `npm run lint` / `npm run typecheck` | Lint/typecheck                 |
| `npm test` / `npm run test:watch`    | Vitest một lần/watch mode      |
| `npm run mobile:typecheck`           | Typecheck mobile               |
| `npm run mobile:test`                | Jest mobile                    |
| `npm run mobile:build`               | Android debug build            |

## Cấu trúc repo

```text
src/
├─ app/                 # App Router pages và API route handlers
├─ components/          # UI theo module/capability
├─ lib/                 # Prisma và adapter dùng chung
├─ modules/
│  ├─ identity/         # User, role, authorization, Assignment, audit
│  ├─ incidents/        # IntakeReport, Incident và lifecycle commands
│  ├─ inspections/      # Establishment, Inspection, checklist, finding
│  ├─ vehicles/         # Registry, observation, verification
│  ├─ residents/        # Subject, management record, report
│  ├─ land/             # Parcel, party, application và public lookup
│  ├─ platform/         # GeoPoint, Evidence, SLA, notification, map
│  ├─ mobile-readonly/  # RelatedInfo, alarm, dispatch, task read models
│  └─ eventing/         # Event store, outbox, projection, worker
└─ worker.ts            # Worker entry point

prisma/
├─ schema.prisma
└─ migrations/

mobile/                 # React Native app
tests/                  # Vitest và TypeScript Playwright tests
playwright/             # Python browser acceptance suite
scripts/demo/           # Demo seed/reset/database guard
storage/                # Local tile data, bị gitignore
.scratch/               # Spec/UI design artifacts local
```

## Troubleshooting

### Port 3000 hoặc 3001 đã được sử dụng

- `3000` là port mặc định của `npm run dev`/`npm run start` và cũng là URL thường dùng của Android Emulator qua `10.0.2.2`.
- `3001` là port do TypeScript Playwright service dùng; không chạy một server khác ở đó khi chạy `npm run test:e2e`.
- `4317` là port mặc định của Python Playwright harness; có thể đổi bằng `CIVICOS_E2E_APP_PORT`.

Kiểm tra process đang giữ port rồi dừng đúng process trước khi chạy lại. Bash/Git Bash:

```bash
lsof -i :3000
lsof -i :3001
```

PowerShell:

```powershell
Get-NetTCPConnection -LocalPort 3000,3001 -ErrorAction SilentlyContinue
```

Nếu cần chạy web ở port khác, truyền `npm run dev -- --port 3010` hoặc `npm run start -- --port 3010`, rồi đổi `CIVICOS_API_BASE_URL` tương ứng cho mobile (`http://10.0.2.2:3010` trên emulator).

### Port 5432 hoặc PostgreSQL chưa sẵn sàng

```bash
docker compose ps postgres
docker compose logs --tail=100 postgres
docker compose up -d postgres
docker compose exec postgres pg_isready -U civicos -d civicos
```

PowerShell dùng cùng lệnh `docker compose`. Nếu `pg_isready` chưa báo accepting connections, không chạy migration/DB test vội; kiểm tra Docker Desktop, port host và `DATABASE_URL` đang trỏ đúng host/port.

### Prisma Client hoặc migration lỗi

1. Chạy `npm install` và `npm run prisma:generate` từ repository root.
2. Xác nhận PostgreSQL ready và `DATABASE_URL` có database/schema đúng.
3. Development dùng `npm run prisma:migrate`; database đã có migration dùng `npm run prisma:migrate:deploy`.
4. Nếu `.next` chứa build cũ, dừng Next/worker rồi xoá riêng `.next` trước khi build lại; không xoá `prisma/migrations/`.

Không dùng `docker compose down -v` để chữa lỗi Prisma trừ khi đã chấp nhận xoá toàn bộ dữ liệu trong named volume. `DATABASE_URL` của `civicos` và `DEMO_DATABASE_URL` của `civicos_demo` là hai target khác nhau.

### `DEMO_NOW_INVALID`

`demo:seed`/`demo:bootstrap` yêu cầu `DEMO_NOW` là ISO-8601 có timezone, ví dụ `2026-09-28T08:00:00.000Z` hoặc timestamp có offset. Set lại trong process hiện tại rồi chạy lại; đừng dùng ngày giờ dạng local không có timezone. Parser fail trước khi seed/mutation.

### `DEMO_RESET_REFUSED` hoặc `DEMO_RESET_CONFIRM_REQUIRED`

`DEMO_RESET_REFUSED` nghĩa là URL được chọn không có database name chính xác `civicos_demo`; `DEMO_DATABASE_URL` có ưu tiên nên một giá trị sai ở biến này vẫn bị từ chối dù `DATABASE_URL` đúng. `DEMO_RESET_CONFIRM_REQUIRED` nghĩa là chưa có `DEMO_RESET_CONFIRM=1` hoặc `--confirm`. Không đổi tên database bằng cách đoán; sửa đúng URL, xem lại target đã sanitize, rồi xác nhận destructive reset theo [phần demo](#demo-database-và-dữ-liệu-hiện-có).

### `CIVICOS_API_BASE_URL_REQUIRED`

App mobile không tìm thấy base URL `http/https` hợp lệ. Với Android Emulator, build lại bằng `-PCIVICOS_API_BASE_URL=http://10.0.2.2:3000`; với server chạy port khác, thay port tương ứng. Không dùng `localhost` để trỏ về máy host từ emulator.

### Map không có tile hoặc provider bị từ chối

1. Cung cấp asset dưới `storage/tiles/cadn/` (thư mục bị gitignore).
2. Chạy `docker compose up -d tileserver` và kiểm tra `http://localhost:8080/health`.
3. Kiểm tra `MAP_TILE_BASE_URL`, `MAP_TILE_STYLE_URL`; style URL phải là `http/https`.
4. Kiểm tra `MAP_TILE_ATTRIBUTION` có chứa `OpenStreetMap`.

Nếu chỉ cần chạy API/domain, có thể bỏ qua TileServer; lỗi tile không phải lỗi PostgreSQL. Khi đổi map provider, vẫn phải giữ attribution hợp lệ theo guard hiện tại.

## Tài liệu liên quan

- [`CONTEXT.md`](CONTEXT.md): ubiquitous language và domain boundary.
- [`Requirement.md`](Requirement.md): yêu cầu chức năng/phi chức năng PS-E1-001 đến PS-E1-010.
- [MVP spec](.scratch/civicos-e1-clone-mvp/spec.md): phạm vi tranche, decision và boundary mobile/web.
- [UI brief](.scratch/civicos-e1-clone-mvp/ui/brief.md): 13 màn hình và trạng thái UI cần phủ.
- [`playwright/README.md`](playwright/README.md): Windows-native Python acceptance suite.
- [`docs/Unit-test-using-playwright-rules.md`](docs/Unit-test-using-playwright-rules.md): quy tắc test Playwright.
- [`docs/agents/domain.md`](docs/agents/domain.md): tài liệu domain cho agent.

README này mô tả trạng thái hiện tại của code và dữ liệu demo; khi mở rộng domain, cập nhật đồng thời `CONTEXT.md`, spec/UI tương ứng và seed checklist ở trên.
