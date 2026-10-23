# CivicOS — Kịch bản demo end-to-end

> **Mục đích:** trình diễn codebase hiện tại bằng dữ liệu synthetic, từ bootstrap
> database đến web, worker, land projection và mobile read-only.
>
> **Không phải production runbook:** không dùng account/secret development cho
> môi trường thật; không đưa PII thật vào fixture; không coi polygon/lookup
> simulated là dữ liệu pháp lý hoặc kết nối CSDL quốc gia thật.

## 1. Kết quả cần đạt

Sau demo, người xem phải thấy được:

1. CivicOS là modular monolith gồm Next.js web/API, PostgreSQL/PostGIS và event
   worker.
2. Quyền hiển thị phụ thuộc role, OrganizationUnit và Assignment/task.
3. Một nghiệp vụ đi qua aggregate → DomainEvent/AuditEvent → outbox → projection,
   SLA hoặc notification.
4. Các surface chính đang có: Intake/Incident, Inspection, Vehicle, Resident,
   Map/Land và mobile read-only.
5. Các giới hạn được trình bày trung thực: land seed riêng, map tile asset
   optional, mobile không phải web-write parity, camera/LPR chỉ là adapter/mock.

## 2. Thời lượng và vai trò

- **Thời lượng chuẩn:** 35–50 phút; mobile native là phần optional thêm 10–15 phút.
- **Người trình bày:** đổi account khi cần để làm rõ boundary quyền.
- **Khán giả:** product/domain, techlead và người review UX.
- **Database:** chỉ sử dụng `civicos_demo`.

## 3. Preflight an toàn (Windows PowerShell)

Chạy từ repository root của CivicOS.

### 3.1. Chuẩn bị dependency và PostgreSQL

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm install
docker compose up -d postgres
docker compose exec -T postgres pg_isready -U civicos -d civicos
npm run prisma:generate
```

Docker Compose chỉ tạo database mặc định `civicos`. Tạo database demo một lần,
không dùng `docker compose down -v`:

```powershell
$exists = docker compose exec -T postgres psql -U civicos -d civicos -tAc "SELECT 1 FROM pg_database WHERE datname = 'civicos_demo'"
if ($exists.Trim() -ne "1") {
  docker compose exec -T postgres psql -U civicos -d civicos -c "CREATE DATABASE civicos_demo;"
}
```

### 3.2. Chọn target và fixed clock

`demo:bootstrap` chạy migration bằng `DATABASE_URL`, còn seed ưu tiên
`DEMO_DATABASE_URL`. Vì vậy, trong process bootstrap phải đặt **cả hai** về

```powershell
$demoDatabaseUrl = "postgresql://civicos:civicos@localhost:5432/civicos_demo?schema=public"
$env:DEMO_DATABASE_URL = $demoDatabaseUrl
$env:DATABASE_URL = $demoDatabaseUrl
$env:DEMO_NOW = "2026-09-28T08:00:00.000Z"
```

`DEMO_NOW` phải là ISO-8601 có timezone. Nếu thiếu hoặc sai format, command phải
fail với `DEMO_NOW_INVALID` trước khi seed/mutation.

### 3.3. Bootstrap core và land fixture

```powershell
npm run demo:bootstrap

# Tuỳ chọn: thêm role land + party/parcel/right synthetic.
# Lệnh này không nằm trong demo:bootstrap.
npx tsx scripts/demo/seed-land.ts
```

`demo:bootstrap` hiện gọi các seed module sau:

| Nhóm        | Trạng thái cần quan sát                                                                             |
| ----------- | --------------------------------------------------------------------------------------------------- |
| Intake      | `RECEIVED`, `REJECTED`, `PROCESSED`, `CLOSED`                                                       |
| Incident    | một Incident core `classified` và một linked Incident đã đi qua flow command/approval               |
| Inspection  | `scheduled`, `in_progress`, `completed`; checklist, finding, Evidence, recommendation và recurrence |
| Vehicle     | `recorded`, `match_suggested`, `escalated`                                                          |
| Resident    | ba subject type, activity checkup, một SLA overdue, report `sent/approved/draft`                    |
| Mobile read | Assignment `mobile_read` cho resident/business/Incident/finding/vehicle observation                 |

Các dòng log quan trọng thường có dạng:

```text
seeded intakes received=RECEIVED rejected=REJECTED processed=PROCESSED closed=CLOSED ...
seeded inspections scheduled=scheduled in_progress=in_progress completed=completed ...
seeded vehicles recorded=recorded match_suggested=match_suggested escalated=escalated ...
seeded residents subjects=3 records=3 reports=sent/approved/draft ...
```

Không cần copy database IDs từ log vào kịch bản. Hãy tìm theo label/status ổn định
ở các bảng dưới đây.

Bootstrap cũng giữ các fixture nền tương thích: `[DEMO-INCIDENT-01]`,
`[DEMO] Quan karaoke Sao Dem`, `43DEMO01` và `demo-observation-01`. Khi cần
walkthrough mới dùng các nhãn `[DEMO-RESTART]`/`51DEMO01–03` ở các scene sau;
không trộn hai bộ fixture để suy luận sai state.

## 4. Chạy web và worker

Mở hai PowerShell riêng. Đặt target demo trong **mỗi** terminal.

### Terminal A — worker

```powershell
$env:DEMO_DATABASE_URL = "postgresql://civicos:civicos@localhost:5432/civicos_demo?schema=public"
$env:DATABASE_URL = $env:DEMO_DATABASE_URL
$env:DEMO_NOW = "2026-09-28T08:00:00.000Z"
$env:EVENT_WORKER_INTERVAL_MS = "500"
npm run worker
```

### Terminal B — Next.js

```powershell
$env:DEMO_DATABASE_URL = "postgresql://civicos:civicos@localhost:5432/civicos_demo?schema=public"
$env:DATABASE_URL = $env:DEMO_DATABASE_URL
$env:DEMO_NOW = "2026-09-28T08:00:00.000Z"
npm run dev
```

Mở <http://localhost:3000/login>. Sau khi đăng nhập bằng commander, mở
<http://localhost:3000/api/health/worker> trong cùng browser session. Expected:

- response HTTP `200`;
- `deadLetterCount` bằng `0`;
- sau vài giây, `pendingCount`/`processingCount` về `0` hoặc trở về `0` sau khi
  một thao tác mới được projection xử lý.

Endpoint health yêu cầu role chỉ huy/vận hành; không phải public health endpoint.

## 5. Account card

Tất cả account dưới đây dùng password development `civicos-dev` và chỉ hợp lệ cho
local/demo.

| Account                           | Role             | Dùng trong demo                                                             |
| --------------------------------- | ---------------- | --------------------------------------------------------------------------- |
| `truong@civicos.local`            | `commander`      | Home, Assignment, approval, health, mọi core web surface                    |
| `trucban@civicos.local`           | `duty_officer`   | Intake queue và các bước tiếp nhận/xác minh                                 |
| `hientruong@civicos.local`        | `field_officer`  | Inspection fieldwork, vehicle verification, resident follow-up, mobile read |
| `vanphong@civicos.local`          | `office_officer` | Establishment catalogue và resident report surface                          |
| `khongduocphancong@civicos.local` | `field_officer`  | Negative case: không có Assignment phù hợp                                  |
| `lanhdao-xa-demo@civicos.local`   | `commune_leader` | Land parcel/map sau khi chạy `seed-land.ts`                                 |
| `datdai-demo@civicos.local`       | `land_officer`   | Land persona; chỉ dùng khi có đúng `land_review` scope                      |

`lanhdao-xa-demo` và `datdai-demo` được tạo bởi core demo seed; `seed-land.ts`
chỉ thêm role/data land, không tự tạo user.

## 6. Kịch bản trình diễn web

### Scene 0 — Đăng nhập và phạm vi được giao (3 phút)

1. Đăng nhập `truong@civicos.local` tại `/login`.
2. Ở `/`, chỉ ra ba thẻ `01 / Incident`, `02 / Inspection`, `03 / Field` và khu
   vực `Identity / Assignment`.
3. Mở `/assignments` để cho thấy Assignment là resource/task cụ thể, không phải
   quyền xem toàn bộ đơn vị.
4. Mở `/api/health/worker` để nối UI với worker/eventing evidence.

**Thông điệp:** menu và action được lọc ở UI, nhưng API vẫn là security boundary;
không nên diễn giải việc một nút biến mất là một permission mới.

### Scene 1 — IntakeReport → Incident (7–10 phút)

1. Đăng xuất và đăng nhập `trucban@civicos.local`.
2. Mở `/intake`.
3. Tìm các nội dung có tiền tố `[DEMO-RESTART]` và đối chiếu bốn status:
   `RECEIVED`, `REJECTED`, `PROCESSED`, `CLOSED`.
4. Mở report `PROCESSED`; chỉ ra link Incident, SLA và timeline/audit nếu có.
5. Đăng nhập lại commander, mở `/incidents`, mở linked Incident hoặc
   `[DEMO-INCIDENT-01]`.
6. Chỉ ra category/severity, Assignment, timeline và Approval history.

**Live mutation tuỳ chọn:** dùng `[DEMO-INCIDENT-01]` để đi theo đường dẫn trong
[`docs/UI-map.md`](UI-map.md): `Lưu phân loại` → `Bắt đầu xác minh` → field user
`Gửi đề xuất kết quả` → commander `Phê duyệt` yêu cầu resolve →
`Gửi yêu cầu đóng Incident` → commander `Phê duyệt` yêu cầu close.
Đây là thao tác thay đổi database demo; nếu muốn giữ state ban đầu, bỏ qua bước
này và chỉ trình diễn timeline đã seed.

**Điểm cần nói:** `IntakeReport` là tin đầu vào; không gọi report chưa convert là
`Incident`. Approval là bước thẩm quyền cao, khác một status update thông thường.

### Scene 2 — Establishment và Inspection lifecycle (7–8 phút)

1. Dùng commander hoặc `vanphong@civicos.local` mở
   `/inspections/establishments`.
2. Hiển thị ba fixture có tiền tố `[DEMO-RESTART] Co so karaoke`:
   - `lich dinh ky` — `scheduled`;
   - `dang kiem tra` — `in_progress`;
   - `da hoan tat` — `completed`.
3. Mở scenario `in_progress`: cho xem checklist, Evidence, finding và
   recommendation đã bị reject.
4. Mở scenario `completed`: cho xem checklist, finding, Evidence và
   recommendation đã approve; chỉ ra inspection recurrence nếu hiện trên lịch.
5. Mở `/api/inspections/stats` nếu cần chứng minh aggregate/reporting surface.

**Thông điệp:** checklist phụ thuộc loại cơ sở; recommendation không tự trở
thành quyết định nếu chưa qua Approval.

### Scene 3 — Vehicle registry → match → verification → escalation (5–7 phút)

1. Với commander mở `/vehicles/registry`, tìm `51DEMO02` và `51DEMO03` để cho
   xem registry source/reason/validity.
2. Đăng nhập `hientruong@civicos.local`, mở `/field/vehicles`.
3. Mở lần lượt:
   - `51DEMO01` — `recorded`, không match;
   - `51DEMO02` — `match_suggested`, chờ xác nhận;
   - `51DEMO03` — `escalated`, đã có verification và Evidence synthetic.
4. Ở detail `51DEMO03`, chỉ ra kết quả xác minh, tọa độ và evidence metadata; không
   đọc synthetic text như dữ liệu thật.

**Cảnh báo map:** fixture vehicle restart dùng tọa độ `20.98, 106.05`, trong khi
CADN bounds hiện là `105.93..106.03 / 20.91..20.99`. Không dùng fixture này để
khẳng định marker nằm trong extent CADN.

### Scene 4 — Resident scope, masking và report (5–7 phút)

1. Với commander hoặc field user mở `/residents`.
2. Tìm ba subject type: `temporary_resident`, `foreign_resident`,
   `reintegration`.
3. Mở record `reintegration` để chỉ ra SLA `overdue`, activity `checkup` và
   Assignment `resident_followup`.
4. Mở `/residents/reports`; với fixed clock `2026-09-28`, ba report liên tiếp có
   trạng thái `sent`, `approved`, `draft`.
5. Nếu cần minh hoạ scope, logout rồi đăng nhập
   `khongduocphancong@civicos.local`; thử vào resource được giao cho field user
   và ghi nhận safe denied/empty state thay vì vượt quyền bằng URL.

**Thông điệp:** Subject không phải User; hồ sơ quản lý là scope riêng; tên/profile
nhạy cảm phải theo masking và audit.

### Scene 5 — Map và LandParcel projection (5–8 phút)

#### Map nghiệp vụ

1. Đăng nhập commander và mở `/map`.
2. Bật/tắt các lớp `Vụ việc`, `Kiểm tra`, `Vùng polygon`.
3. Chỉ ra `OpenStreetMap` attribution, CADN bounds và safe state khi provider
   hoặc layer không khả dụng.
4. Nếu không có `storage/tiles/cadn/`, không cố biến lỗi tile thành lỗi domain;
   ghi nhận limitation và tiếp tục phần queue/detail.

TileServer chỉ nên chạy khi tile asset local đã được cung cấp:

```powershell
if (Test-Path .\storage\tiles\cadn) {
  docker compose up -d tileserver
  Invoke-WebRequest http://localhost:8080/health
}
```

#### Land parcel

1. Đảm bảo đã chạy `npx tsx scripts/demo/seed-land.ts`.
2. Đăng nhập `lanhdao-xa-demo@civicos.local`, mở `/land/parcels`.
3. Tìm `DEMO-PARCEL-001`, mở detail rồi chọn `Xem trên bản đồ`.
4. Chỉ ra nhãn `internal / simulated`, allowlist `mã thửa/tờ/số thửa/status` và
   không có party/right/evidence trong map payload.
5. Nếu offline, xác nhận polygon không được render từ cache; nếu provider lỗi,
   giữ safe state `Bản đồ nền hiện không khả dụng`.

`DEMO-PARCEL-001` nằm ở khoảng `105.0,20.0`, ngoài CADN bounds; đây là fixture
để kiểm tra land projection/focus, không phải marker trong bản đồ CADN. `seed-land.ts`
không tạo `LandChangeApplication`, vì vậy không dùng mã thửa này để tuyên bố rằng
public land lookup đã có hồ sơ application demo.

### Scene 6 — Worker và event evidence (2–3 phút)

1. Thực hiện một thao tác nhẹ hoặc chỉ dùng các event đã seed.
2. Refresh `/api/health/worker` trong session commander.
3. Chờ `pendingCount`, `processingCount` và `deadLetterCount` về trạng thái an
   toàn.
4. Giải thích worker đăng ký event-history, incident/inspection/vehicle
   projections, notification consumer và SLA overdue; không có broker riêng trong
   MVP.

## 7. Mobile native segment (optional, 10–15 phút)

Phần này cần Android SDK/API 35, `adb`, emulator/device và JDK. Chỉ demo
React Native Android; Chromium mobile trong Python Playwright không phải native
mobile test.

### 7.1. Start Metro và cài debug APK

Giữ Next.js ở port `3000`. Terminal Metro:

```powershell
npm --prefix mobile install
npm --prefix mobile start
```

Terminal build/install:

```powershell
.\mobile\android\gradlew.bat -p .\mobile\android installDebug -PCIVICOS_API_BASE_URL=http://10.0.2.2:3000
```

Không dùng `localhost` từ Android Emulator để trỏ về host machine. Nếu web chạy
port khác, thay port trong `CIVICOS_API_BASE_URL` rồi build/install lại.

### 7.2. Walkthrough

1. Login bằng `hientruong@civicos.local` / `civicos-dev`.
2. Mở `RelatedInfo`; thử `Tìm kiếm`, `Bộ lọc`, `ALL`, `RESIDENT`, `BUSINESS`,
   `HOTSPOT`, `VIOLATION`, mở một detail và `Mở bản đồ`.
3. Mở `Dispatches` và `Tasks`; chọn một dòng, xem detail rồi dùng
   `Mở bản đồ/RelatedInfo`. Nếu không có dòng, ghi nhận empty state là kết quả
   hợp lệ của Assignment scope.
4. Mở `Alarms`; nếu worker đã phát hiện SLA overdue, mở cảnh báo và
   `Mở liên kết tài nguyên`. Nếu danh sách empty, không tự tạo notification để
   làm đẹp demo.
5. Mở `Map`, thử layer visibility và `Tải basemap để xem ngoại tuyến` nếu provider
   /asset cho phép.
6. Thử tắt mạng để trình diễn `OfflineBanner`. Với LandParcel focus, xác nhận
   polygon bị bỏ và hiện `Polygon thửa đất không được lưu trong bộ nhớ offline`;
   không coi basemap cache là polygon cache.
7. Nêu rõ `WriteGuard`: mobile chỉ read-only ngoài `POST/DELETE /api/auth/session`
   phục vụ login/logout; không có CTA tạo/sửa resident, establishment hay land
   record trong tranche này.

## 8. Acceptance checklist cho người review

- [ ] Mọi terminal demo dùng `civicos_demo`, không dùng `civicos`.
- [ ] `DEMO_NOW` có timezone và log seed cho thấy bốn intake, ba inspection và
      ba vehicle states.
- [ ] Worker chạy riêng; health không có dead letter.
- [ ] UI hiển thị role/task/Assignment boundary; không bỏ qua login.
- [ ] IntakeReport và Incident được gọi đúng tên.
- [ ] Recommendation/Approval được phân biệt với status update.
- [ ] Dữ liệu resident/vehicle/informant được coi là synthetic hoặc masked.
- [ ] Land projection được gắn `internal / simulated`; không gọi là ranh giới pháp
      lý chính thức.
- [ ] Map tile/provider limitation được nói rõ nếu asset không có.
- [ ] Mobile không bị trình diễn như write-capable web app.

## 9. Reset và kết thúc

### Evidence an toàn và bàn giao dọn dẹp

Demo Center chỉ hiển thị evidence cục bộ gồm `runId`, `sceneId`, `stepId`,
`status`, `durationMs` và `reason`. Evidence này không thay thế AuditEvent hoặc
DomainEvent và không chứa payload, credential, PII, giá trị masked hay geometry.
Run đọc-only kết thúc với reason không mutation; run đã commit mutation hoặc
dừng khi cleanup chưa hoàn tất kết thúc ở `completed-with-cleanup-pending`.
Operator phải bàn giao và xác nhận cleanup thủ công; UI không tự reset dữ liệu.

### Dừng phiên demo nhưng giữ volume

Nhấn `Ctrl+C` ở terminal Next/worker/Metro, sau đó:

```powershell
docker compose stop
```

`stop` giữ dữ liệu. Khi cần chạy lại, mở terminal mới và lặp preflight/target
setup để tránh dùng nhầm `civicos_demo` cho web local thông thường.

### Reset sạch database demo

Đây là destructive reset. Kiểm tra URL trước; lệnh hiện tại truncate các
application models, **bao gồm land models**, nhưng không đụng database `civicos`.

```powershell
$env:DEMO_DATABASE_URL = "postgresql://civicos:civicos@localhost:5432/civicos_demo?schema=public"
$env:DATABASE_URL = $env:DEMO_DATABASE_URL
$env:DEMO_RESET_CONFIRM = "1"
npm run demo:reset
```

Hoặc dùng flag xác nhận:

```powershell
Remove-Item Env:DEMO_RESET_CONFIRM -ErrorAction SilentlyContinue
npm run demo:reset -- --confirm
```

Kết thúc bằng terminal mới hoặc bỏ các biến target demo trước khi chạy web thông
thường. Không dùng `docker compose down -v` như thao tác cleanup mặc định vì nó
có thể xoá named volume chứa cả hai database.

## 10. Các lỗi thường gặp khi demo

| Hiện tượng                             | Cách xử lý                                                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `DEMO_DATABASE_URL_REQUIRED`           | Đặt `DEMO_DATABASE_URL` trong terminal hiện tại.                                                                          |
| `DEMO_RESET_REFUSED`                   | URL được chọn không có database name chính xác `civicos_demo`.                                                            |
| `DEMO_RESET_CONFIRM_REQUIRED`          | Dùng `DEMO_RESET_CONFIRM=1` hoặc `--confirm`.                                                                             |
| `DEMO_NOW_INVALID`                     | Dùng timestamp ISO-8601 có `Z` hoặc offset, ví dụ `2026-09-28T08:00:00.000Z`.                                             |
| Login thất bại                         | Đảm bảo seed đã chạy, account `.local` và password `civicos-dev`; không dùng account production.                          |
| Menu/record trống                      | Đang dùng role thiếu Assignment/task; thử account đúng scene, không bypass bằng API.                                      |
| Map provider/tile lỗi                  | Kiểm tra `storage/tiles/cadn/`, TileServer `:8080`, style URL và attribution; tiếp tục demo queue/detail bằng safe state. |
| Health 401/403                         | Đăng nhập cùng browser bằng commander/system operator; health route không public.                                         |
| Mobile `CIVICOS_API_BASE_URL_REQUIRED` | Build lại với `-PCIVICOS_API_BASE_URL=http://10.0.2.2:3000`.                                                              |

Đối chiếu click path chi tiết tại [`docs/UI-map.md`](UI-map.md) và setup/test
boundary tại [`README.md`](../README.md).
