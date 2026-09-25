# CivicOS

CivicOS là nền tảng điều hành nghiệp vụ hướng sự kiện cho **Công an xã Nghĩa Trụ**. Dự án hiện tập trung vào các luồng tiếp nhận và xử lý `Incident`, quản lý cơ sở kinh doanh có điều kiện, `Inspection` tại hiện trường và theo dõi phương tiện cần chú ý.

> **Trạng thái:** MVP/first implementation wave. Đây là một **modular monolith** Next.js kèm một worker riêng trong cùng codebase; chưa phải hệ thống microservices.

## Mục lục

- [Phạm vi hiện tại](#phạm-vi-hiện-tại)
- [Chức năng chính](#chức-năng-chính)
- [Kiến trúc tổng quát](#kiến-trúc-tổng-quát)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Yêu cầu môi trường](#yêu-cầu-môi-trường)
- [Cài đặt và chạy local](#cài-đặt-và-chạy-local)
- [Cấu hình môi trường](#cấu-hình-môi-trường)
- [Các lệnh thường dùng](#các-lệnh-thường-dùng)
- [Các route chính](#các-route-chính)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Kiểm thử và xác minh](#kiểm-thử-và-xác-minh)
- [Tài liệu liên quan](#tài-liệu-liên-quan)

## Phạm vi hiện tại

Code hiện tại triển khai bốn module nghiệp vụ chính và các capability dùng chung:

- `incidents`: tiếp nhận tin báo, quản lý vòng đời `Incident`, phân công và Approval.
- `inspections`: danh mục `Establishment`, lập lịch và thực hiện `Inspection` tại hiện trường.
- `vehicles`: `SuspiciousVehicleRegistry`, `VehicleObservation`, xác nhận match, xác minh và chuyển đơn vị.
- `identity`: User, session, role, capability, `Assignment` và `OrganizationUnit`.
- `platform`: `Evidence`, `GeoPoint`, offline sync, SLA và in-app notification.
- `eventing`: `DomainEvent`, transactional outbox, worker và read-model projections.

`Requirement.md` mô tả phạm vi Epic PS-E1 rộng hơn. Những capability như bản đồ tổng hợp, `Hotspot`, `SubjectManagementRecord` và báo cáo định kỳ chưa nằm trong 11 chức năng đang được đăng ký ở navigation hiện tại.

## Chức năng chính

Theo `src/components/navigation/feature-registry.ts`, hệ thống hiện có **11 chức năng user-facing**:

| Module       | Chức năng                                                         |
| ------------ | ----------------------------------------------------------------- |
| `Incident`   | Hàng đợi Incident; ghi nhận tin báo; phân công Incident           |
| `Inspection` | Danh mục cơ sở; lịch kiểm tra; hàng đợi fieldwork                 |
| `Vehicle`    | Registry xe cần chú ý; quan sát hiện trường; xác minh phương tiện |
| `Identity`   | Quản lý Assignment; quản lý User                                  |

### Các vòng đời tiêu biểu

```text
IntakeReport
  → Incident(received)
  → classified
  → verifying
  → resolved
  → closed
```

```text
Establishment
  → Inspection(scheduled)
  → in_progress
  → checklist/finding/evidence
  → recommendation approval
  → completed
```

```text
SuspiciousVehicleRegistry
  → VehicleObservation(recorded)
  → match_suggested
  → match_confirmed
  → verified hoặc escalated
```

Luồng chi tiết, thuật ngữ nghiệp vụ và cơ chế runtime được mô tả tại [`docs/PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md).

## Kiến trúc tổng quát

CivicOS dùng một Next.js application, một PostgreSQL database và một worker process:

```text
Browser / mobile-first web UI
        │
        ▼
Next.js App Router
  ├─ Server pages/layouts
  └─ API Route Handlers (/api/**)
        │
        ▼
Domain modules
  ├─ identity
  ├─ incidents
  ├─ inspections
  ├─ vehicles
  ├─ platform
  └─ eventing
        │
        ├─ Prisma transaction ──► PostgreSQL
        └─ EventRecord + OutboxMessage
                                      │
                                      ▼
                              Event worker process
                              ├─ read-model projections
                              ├─ event history
                              ├─ SLA overdue checks
                              └─ notifications
```

Mỗi mutation nghiệp vụ quan trọng cập nhật dữ liệu domain, ghi `DomainEvent` và `AuditEvent` trong cùng transaction. `OutboxMessage` giúp worker xử lý bất đồng bộ, retry và replay projection mà không cần message broker trong giai đoạn MVP.

## Công nghệ sử dụng

### Ứng dụng

| Lớp                           | Công nghệ                                 |
| ----------------------------- | ----------------------------------------- |
| Frontend/full-stack framework | Next.js `16.3.5` với App Router           |
| UI                            | React `19.2.8`, React DOM                 |
| Ngôn ngữ                      | TypeScript `5`                            |
| CSS                           | Tailwind CSS `4`, PostCSS                 |
| Backend runtime               | Node.js thông qua Next.js và `tsx` worker |
| ORM                           | Prisma `6.19`                             |
| Cơ sở dữ liệu                 | PostgreSQL `16-alpine`                    |

### Kiểm thử và chất lượng

| Mục đích                         | Công nghệ                                       |
| -------------------------------- | ----------------------------------------------- |
| Unit/integration tests           | Vitest `3.2`                                    |
| End-to-end tests                 | `@playwright/test`                              |
| Browser acceptance tests bổ sung | Python `pytest`, `pytest-playwright`, `psycopg` |
| Lint/type/format                 | ESLint, TypeScript, Prettier                    |

## Yêu cầu môi trường

- Node.js và npm tương thích với Next.js `16.3.5`.
- Docker Desktop hoặc Docker Engine có Docker Compose.
- Python `3.13+` nếu chạy bộ acceptance tests trong `playwright/`.
- Playwright browsers nếu chạy `npm run test:e2e`.

## Cài đặt và chạy local

### 1. Tạo file môi trường

Linux/macOS/Git Bash:

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

Trong môi trường production, bắt buộc thay `SESSION_SECRET` bằng giá trị bí mật mạnh và không commit file `.env`.

### 2. Khởi động PostgreSQL

```bash
docker compose up -d postgres
```

Nếu WSL không nhận lệnh `docker`, dùng `docker.exe compose up -d postgres` hoặc bật WSL integration trong Docker Desktop.

### 3. Cài dependency, tạo Prisma Client và migrate

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
```

### 4. Chạy ứng dụng và worker

Mở hai terminal:

Terminal 1 — Next.js:

```bash
npm run dev
```

Terminal 2 — worker:

```bash
npm run worker
```

Mở <http://localhost:3000>.

Trong development, hệ thống có thể tạo các tài khoản mẫu khi khởi tạo luồng đăng nhập. Mật khẩu mặc định là `civicos-dev`; chỉ sử dụng giá trị này cho local development.

## Chạy demo nội bộ

Môi trường demo dùng database riêng `civicos_demo`, tách khỏi database development `civicos`.

### 1. Chuẩn bị database demo trống

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

`demo:bootstrap` áp dụng migration hiện có rồi seed dữ liệu hư cấu. Chạy lại nhiều lần không tạo bản ghi trùng.

### 2. Khởi động app và worker

```bash
npm run dev
npm run worker
```

Mở <http://localhost:3000>, đăng nhập bằng một tài khoản demo bên dưới, mở dashboard rồi mở từng Module `Incident`, `Inspection`, `Vehicle`. Endpoint `/api/health/worker` báo `pendingCount`, `processingCount` và `deadLetterCount` đều bằng `0`.

### 3. Tài khoản demo (mật khẩu: `civicos-dev`, chỉ dùng cho demo)

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

### 4. Ba kịch bản demo (nhãn ổn định để chọn đúng hồ sơ)

- `Incident`: `[DEMO-INCIDENT-01]` — tin báo hư cấu đã phân loại, đã phân công `field_officer`, có thể tiếp tục xác minh.
- `Inspection`: `[DEMO] Quan karaoke Sao Dem` — lịch kiểm tra `2026-03-10` đã phân công fieldwork.
- `Vehicle`: biển số `43DEMO01` — quan sát hư cấu đã gợi ý match với registry, có thể tiếp tục xác nhận.

### 5. Dọn môi trường sau demo

```bash
export DATABASE_URL="$DEMO_DATABASE_URL"
DEMO_RESET_CONFIRM=1 npm run demo:reset
```

Command reset in target database trước thao tác phá hủy và từ chối mọi database ngoài `civicos_demo`; không bao giờ mặc định xóa `DATABASE_URL` của môi trường khác.

## Cấu hình môi trường

Các biến được khai báo trong `.env.example`:

| Biến                       | Ý nghĩa                                            | Giá trị mẫu                                                              |
| -------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------ |
| `DATABASE_URL`             | Connection string tới PostgreSQL                   | `postgresql://civicos:civicos@localhost:5432/civicos?schema=public`      |
| `EVENT_WORKER_INTERVAL_MS` | Chu kỳ worker kiểm tra outbox/SLA                  | `1000`                                                                   |
| `EVENT_MAX_ATTEMPTS`       | Số lần retry tối đa của outbox                     | `5`                                                                      |
| `SESSION_SECRET`           | Secret dùng cho session và dữ liệu nhạy cảm        | `replace-in-development`                                                 |
| `DEMO_DATABASE_URL`        | Connection string tới database demo `civicos_demo` | `postgresql://civicos:civicos@localhost:5432/civicos_demo?schema=public` |
| `DEMO_RESET_CONFIRM`       | Xác nhận thao tác reset phá hủy (`1` mới cho chạy) | `0`                                                                      |

## Các lệnh thường dùng

| Lệnh                            | Mục đích                                |
| ------------------------------- | --------------------------------------- |
| `npm run dev`                   | Chạy Next.js development server         |
| `npm run build`                 | Build production                        |
| `npm run start`                 | Chạy production server sau build        |
| `npm run worker`                | Chạy event/SLA worker                   |
| `npm run lint`                  | Chạy ESLint                             |
| `npm run typecheck`             | Kiểm tra TypeScript không emit          |
| `npm run format`                | Format toàn repository bằng Prettier    |
| `npm run format:check`          | Kiểm tra format mà không ghi file       |
| `npm test`                      | Chạy Vitest                             |
| `npm run test:watch`            | Chạy Vitest ở watch mode                |
| `npm run test:e2e`              | Chạy Playwright E2E                     |
| `npm run prisma:generate`       | Tạo Prisma Client                       |
| `npm run prisma:migrate`        | Tạo/applied migration trong development |
| `npm run prisma:migrate:deploy` | Apply migration theo kiểu deployment    |

## Các route chính

### Giao diện

| Route                            | Mục đích                                  |
| -------------------------------- | ----------------------------------------- |
| `/`                              | Màn hình vào trung tâm điều hành          |
| `/login`                         | Đăng nhập/đăng xuất và tạo session        |
| `/incidents`                     | Hàng đợi và chi tiết Incident             |
| `/intake`                        | Nhập `IntakeReport` thủ công              |
| `/inspections/establishments`    | Danh mục cơ sở và lịch kiểm tra           |
| `/inspections/:inspectionId`     | Chi tiết và tác nghiệp Inspection         |
| `/vehicles/registry`             | Quản lý `SuspiciousVehicleRegistry`       |
| `/field/vehicles`                | Ghi nhận `VehicleObservation`             |
| `/field/vehicles/:observationId` | Xác nhận match, xác minh và chuyển đơn vị |
| `/field/offline`                 | Trạng thái hàng đợi đồng bộ offline       |
| `/identity`                      | Màn hình identity/Assignment              |
| `/assignments`                   | Quản lý Assignment                        |
| `/users`                         | Quản lý User                              |

### API

Các nhóm API chính nằm dưới `src/app/api/`:

- `/api/auth/session`: tạo, đọc và xóa session.
- `/api/incidents`, `/api/incidents/:incidentId/commands`: đọc Incident và gửi command vòng đời.
- `/api/intake-reports`: tạo `IntakeReport` và Incident ban đầu.
- `/api/establishments`: quản lý danh mục cơ sở.
- `/api/inspections`, `/api/inspections/:inspectionId`: lập lịch và gửi command Inspection.
- `/api/vehicles/registry`: đọc, tạo và cập nhật registry.
- `/api/vehicles/observations`, `/api/vehicles/observations/:observationId`: ghi nhận, match, xác minh và escalate quan sát.
- `/api/evidence`: upload, đọc và tải `Evidence`.
- `/api/identity/users`, `/api/identity/organization-units`, `/api/identity/assignments`: identity directory và Assignment.
- `/api/sync`: nhận và đồng bộ offline commands.
- `/api/notifications`: đọc và đánh dấu notification.
- `/api/health/worker`: kiểm tra trạng thái worker.

## Cấu trúc thư mục

```text
src/
├─ app/                 # App Router, pages, layouts và API route handlers
├─ components/          # UI components theo module và capability dùng chung
├─ lib/                 # Adapter dùng chung, gồm Prisma client
├─ modules/
│  ├─ identity/         # User, session, role, authorization, Assignment, audit
│  ├─ incidents/        # Incident commands, domain rules và projections
│  ├─ inspections/      # Establishment/Inspection commands và projections
│  ├─ vehicles/         # Registry/Observation commands và projections
│  ├─ platform/         # Evidence, GeoPoint, SLA, notification, offline sync
│  └─ eventing/         # Event store, outbox, worker, replay, read models
└─ worker.ts            # Entry point của process worker

prisma/
├─ schema.prisma        # Mô hình dữ liệu và datasource PostgreSQL
└─ migrations/          # Lịch sử database migrations

tests/                  # Unit, integration, PostgreSQL và E2E TypeScript tests
playwright/             # Browser acceptance tests Python
docs/                   # ADR và tài liệu dự án
```

## Kiểm thử và xác minh

Bộ kiểm tra cơ bản:

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:e2e
npm run build
```

Các test cần PostgreSQL được tách khỏi unit suite mặc định. Sau khi PostgreSQL chạy và migration đã được áp dụng:

```bash
RUN_DB_TESTS=1 npm test
```

PowerShell:

```powershell
$env:RUN_DB_TESTS = "1"; npm test
```

### Acceptance tests Python

```bash
cd playwright
python -m venv .venv
python -m pip install -e .
pytest
```

Bộ test này sử dụng Python `3.13+`, PostgreSQL và các browser dependency của Playwright.

### Lưu ý khi xác minh runtime

- PostgreSQL phải chạy trước khi migrate hoặc chạy các test tích hợp.
- Ứng dụng và worker là hai process riêng; cần chạy worker để projections, SLA timer, outbox retry và notifications được xử lý.
- Nếu worker dừng, domain write vẫn được lưu trong outbox nhưng read model và notification có thể bị trễ.
- E2E cần cài browser của Playwright và có thể cần chạy worker nếu kịch bản kiểm tra luồng bất đồng bộ.

## Tài liệu liên quan

- [`docs/PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md): báo cáo tổng quan về phạm vi, kiến trúc, công nghệ và cơ chế hoạt động.
- [`CONTEXT.md`](CONTEXT.md): từ điển thuật ngữ và domain model của CivicOS.
- [`Requirement.md`](Requirement.md): yêu cầu chức năng và phi chức năng của Epic PS-E1.
- [`docs/adr/0001-domain-events-and-projections.md`](docs/adr/0001-domain-events-and-projections.md): DomainEvent, transactional outbox và projections.
- [`docs/adr/0002-modular-monolith-and-worker.md`](docs/adr/0002-modular-monolith-and-worker.md): quyết định dùng modular monolith và worker.
- [`docs/adr/0003-shared-subject-identity.md`](docs/adr/0003-shared-subject-identity.md): quyết định về Subject identity dùng chung.
- [`docs/adr/0004-role-capability-and-sensitive-access.md`](docs/adr/0004-role-capability-and-sensitive-access.md): role, capability, AssignmentTask và dữ liệu nhạy cảm.
