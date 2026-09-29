# CivicOS

CivicOS là nền tảng điều hành nghiệp vụ hướng sự kiện cho **Công an xã Nghĩa Trụ**. Repo hiện là một **modular monolith**: Next.js xử lý web/API, PostgreSQL lưu dữ liệu và một process worker xử lý outbox, projection, SLA và notification.

> **Trạng thái:** MVP đang mở rộng theo tranche thiết kế PS-E1. Repo có các module `identity`, `incidents`, `inspections`, `vehicles`, `residents`, `map` và mobile read-only; chưa phải bản triển khai đầy đủ PS-E1-001 đến PS-E1-010.

## Mục lục

- [Phạm vi và boundary](#phạm-vi-và-boundary)
- [Thuật ngữ domain](#thuật-ngữ-domain)
- [Kiến trúc](#kiến-trúc)
- [Công nghệ và yêu cầu môi trường](#công-nghệ-và-yêu-cầu-môi-trường)
- [Chạy web local](#chạy-web-local)
- [Cấu hình môi trường](#cấu-hình-môi-trường)
- [Bản đồ local](#bản-đồ-local)
- [Demo database và dữ liệu hiện có](#demo-database-và-dữ-liệu-hiện-có)
- [Mock/seed data theo tài liệu thiết kế](#mockseed-data-theo-tài-liệu-thiết-kế)
- [Ứng dụng mobile](#ứng-dụng-mobile)
- [Routes chính](#routes-chính)
- [Kiểm thử](#kiểm-thử)
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
| Database           | PostgreSQL `16-alpine`                                   |
| Web tests          | Vitest, `@playwright/test`                               |
| Browser acceptance | Python `3.13+`, `pytest`, `pytest-playwright`, `psycopg` |
| Mobile             | React Native `0.85.3`, MapLibre React Native `11.4.0`    |

Cần có:

- Node.js/npm tương thích với Next.js `16.3.5`.
- Docker Desktop hoặc Docker Engine có Docker Compose.
- Python `3.13+` nếu chạy bộ test trong `playwright/`.
- Android SDK/Java phù hợp nếu build mobile Android.

## Chạy web local

### 1. Tạo `.env`

Linux/macOS/Git Bash:

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

### 2. Khởi động PostgreSQL

```bash
docker compose up -d postgres
```

Nếu đang dùng WSL và `docker` không khả dụng, dùng `docker.exe compose ...` hoặc bật WSL integration trong Docker Desktop.

### 3. Cài dependency, Prisma Client và migration

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
```

`prisma:migrate` dành cho development. Khi triển khai theo migration đã commit, dùng `npm run prisma:migrate:deploy`.

### 4. Chạy Next.js và worker

Mở hai terminal:

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run worker
```

Mở <http://localhost:3000>. Trong development, luồng auth có thể tạo các tài khoản local mẫu; mật khẩu mặc định là `civicos-dev`.

## Cấu hình môi trường

Các biến chuẩn nằm trong `.env.example`:

| Biến                       | Ý nghĩa                                    | Giá trị mẫu                                                              |
| -------------------------- | ------------------------------------------ | ------------------------------------------------------------------------ |
| `DATABASE_URL`             | PostgreSQL database development            | `postgresql://civicos:civicos@localhost:5432/civicos?schema=public`      |
| `EVENT_WORKER_INTERVAL_MS` | Chu kỳ worker                              | `1000`                                                                   |
| `EVENT_MAX_ATTEMPTS`       | Số lần retry outbox tối đa                 | `5`                                                                      |
| `SESSION_SECRET`           | Secret cho session và dữ liệu nhạy cảm     | `replace-in-development`                                                 |
| `DEMO_DATABASE_URL`        | Database riêng cho demo                    | `postgresql://civicos:civicos@localhost:5432/civicos_demo?schema=public` |
| `DEMO_RESET_CONFIRM`       | Cho phép reset demo phá hủy (`1` mới chạy) | `0`                                                                      |

Có thể override map provider bằng `MAP_TILE_BASE_URL`, `MAP_TILE_STYLE_URL` và `MAP_TILE_ATTRIBUTION`. Attribution phải chứa `OpenStreetMap`; provider mặc định là TileServer GL OSS local.

Không commit `.env`, credential, token hoặc PII thật.

## Bản đồ local

`docker-compose.yml` cung cấp TileServer GL:

```bash
docker compose up -d postgres tileserver
```

Tile data được mount read-only từ `storage/tiles/cadn/`. Thư mục `storage/` bị ignore trong git, vì vậy tile asset phải được cung cấp riêng trên máy chạy app. Nếu chỉ cần chạy domain/API, có thể khởi động riêng `postgres` và bỏ qua `tileserver`.

Runtime map hiện dùng:

- Tile base URL mặc định: `http://localhost:8080`.
- Attribution: `© OpenStreetMap contributors`.
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
npm run demo:bootstrap
```

PowerShell:

```powershell
$env:DEMO_DATABASE_URL = "postgresql://civicos:civicos@localhost:5432/civicos_demo?schema=public"
$env:DATABASE_URL = $env:DEMO_DATABASE_URL
npm run demo:bootstrap
```

`demo:bootstrap` chạy migration rồi `scripts/demo/seed.ts`. Seed idempotent, nhưng vẫn cần chạy worker nếu muốn xem projection/SLA/notification cập nhật đầy đủ.

Guard demo chỉ chấp nhận database có tên `civicos_demo`. Reset là thao tác phá hủy:

```bash
DEMO_RESET_CONFIRM=1 npm run demo:reset
# hoặc PowerShell:
$env:DEMO_RESET_CONFIRM = "1"; npm run demo:reset
```

Reset chỉ chạy khi URL đã chọn có database name chính xác là `civicos_demo`; `DEMO_DATABASE_URL` được ưu tiên trước `DATABASE_URL`, không tự đổi tên database. Lệnh yêu cầu `DEMO_RESET_CONFIRM=1` hoặc `--confirm`, và trả `DEMO_RESET_REFUSED`/`DEMO_RESET_CONFIRM_REQUIRED` trước khi mở Prisma khi guard thất bại.

Reset truncate toàn bộ 31 model application trong `scripts/demo/reset.ts` bằng `RESTART IDENTITY CASCADE`, giữ `_prisma_migrations`, schema và mọi dữ liệu trong database `civicos`. Chỉ Evidence có `metadata.demoNamespace="civicos-demo"` được dọn file vật lý trước khi xóa row; Evidence ngoài namespace và toàn bộ `storage/tiles/**` được giữ nguyên.

### Tài khoản demo

Mật khẩu của toàn bộ tài khoản dưới đây là `civicos-dev`.

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

## Ứng dụng mobile

Mobile nằm trong `mobile/`, dùng backend/API của CivicOS và giữ boundary read-only cho E1-004/E1-007.

```bash
npm --prefix mobile install
npm run mobile:typecheck
npm run mobile:test
npm run mobile:build
```

Mobile yêu cầu API base URL hợp lệ. Android nhận build property `CIVICOS_API_BASE_URL` trong `mobile/android/app/build.gradle`; emulator Android thường truy cập host machine qua `http://10.0.2.2:3000`. Nếu không có runtime/build-time URL, app báo `CIVICOS_API_BASE_URL_REQUIRED`.

Các surface mobile hiện có gồm auth/main/map, `RelatedInfo` read-only, alarms, dispatches, tasks và settings. `WriteGuard` chặn HTTP write; không thêm CTA tạo/cập nhật cư dân hoặc cơ sở từ mobile trong tranche này.

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
- `/api/related-info/*`, `/api/forces/*`
- `/api/map/config`, `/api/map/health`, `/api/map/layers`, `/api/map/markers`
- `/api/evidence`, `/api/notifications`, `/api/sync`
- `/api/identity/users`, `/api/identity/organization-units`, `/api/identity/assignments`
- `/api/health/worker`

## Kiểm thử

### Web/unit/integration

```bash
npm run prisma:generate
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

Các test cần PostgreSQL:

```bash
RUN_DB_TESTS=1 npm test
```

PowerShell:

```powershell
$env:RUN_DB_TESTS = "1"; npm test
```

### TypeScript Playwright E2E

```bash
npm run test:e2e
```

Bộ này dùng `playwright.config.ts`, test trong `tests/e2e/` và service script riêng. Nó khác với browser acceptance suite Python.

### Python browser acceptance suite

Suite chuẩn được hỗ trợ trên Windows native PowerShell; không chạy từ WSL. Xem [`playwright/README.md`](playwright/README.md) để biết đầy đủ setup. Lệnh cơ bản:

```powershell
cd playwright
python -m venv .venv
.venv\Scripts\python.exe -m pip install -e .
.venv\Scripts\python.exe -m playwright install chromium
.venv\Scripts\python.exe -m pytest --browser chromium
```

Harness dùng database cô lập `civicos_e2e`, migrate và seed reference identity/configuration; business records được tạo qua UI trong test.

## Các lệnh thường dùng

| Lệnh                                 | Mục đích                       |
| ------------------------------------ | ------------------------------ |
| `npm run dev`                        | Next.js development server     |
| `npm run build` / `npm run start`    | Build/chạy production server   |
| `npm run worker`                     | Event/SLA worker               |
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

## Tài liệu liên quan

- [`CONTEXT.md`](CONTEXT.md): ubiquitous language và domain boundary.
- [`Requirement.md`](Requirement.md): yêu cầu chức năng/phi chức năng PS-E1-001 đến PS-E1-010.
- [MVP spec](.scratch/civicos-e1-clone-mvp/spec.md): phạm vi tranche, decision và boundary mobile/web.
- [UI brief](.scratch/civicos-e1-clone-mvp/ui/brief.md): 13 màn hình và trạng thái UI cần phủ.
- [`playwright/README.md`](playwright/README.md): Windows-native Python acceptance suite.
- [`docs/Unit-test-using-playwright-rules.md`](docs/Unit-test-using-playwright-rules.md): quy tắc test Playwright.
- [`docs/agents/domain.md`](docs/agents/domain.md): tài liệu domain cho agent.

README này mô tả trạng thái hiện tại của code và dữ liệu demo; khi mở rộng domain, cập nhật đồng thời `CONTEXT.md`, spec/UI tương ứng và seed checklist ở trên.
