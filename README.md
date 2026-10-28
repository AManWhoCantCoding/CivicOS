# CivicOS — Nghĩa Trụ

CivicOS là ứng dụng điều hành nghiệp vụ cho Công an xã Nghĩa Trụ, kết nối công việc trực ban, hiện trường và kiểm tra trong một lịch sử có thể truy vết. Ứng dụng gồm web/API Next.js, PostgreSQL/PostGIS, worker xử lý sự kiện và ứng dụng Android React Native.

## Phạm vi hiện tại

- **Tin báo và Incident:** tiếp nhận, phân loại, phân công và theo dõi xử lý.
- **Kiểm tra:** danh mục cơ sở, lịch kiểm tra, checklist, phát hiện và kiến nghị.
- **Phương tiện:** registry phương tiện cần chú ý và quan sát hiện trường.
- **Cư dân đặc biệt:** hồ sơ theo dõi và báo cáo nghiệp vụ.
- **Đất đai và bản đồ:** tra cứu thửa đất, chủ thể và hồ sơ biến động trong phạm vi được cấp quyền.
- **Mobile:** ứng dụng Android cho một số luồng đọc dữ liệu; không phải web-write parity.

Đây là snapshot phát triển/demo local, **không phải hướng dẫn production**. Seed dùng dữ liệu synthetic. Không đưa dữ liệu cá nhân thật vào demo; bản đồ/lookup mô phỏng không phải dữ liệu pháp lý hay kết nối cơ sở dữ liệu quốc gia.

**UI Auto Demo chưa khả dụng.** Runbook tương ứng là tài liệu handoff cho tương lai, không phải hướng dẫn vận hành hiện tại.

## Cài đặt công cụ trên Windows 10/11

Các lệnh trong README dùng PowerShell. Cài theo mục tiêu: chỉ chạy web thì bỏ qua phần Android. Git chỉ cần nếu bạn cần clone repository.

### 1. Git (chỉ cần để clone repo)

Cài [Git for Windows](https://git-scm.com/download/win), sau đó mở PowerShell mới và xác minh:

```powershell
git --version
```

### 2. Node.js và npm (web + mobile)

Cài [Node.js LTS](https://nodejs.org/en/download). Chọn Node 24 LTS từ phiên bản `24.3.0` trở lên; phiên bản này đáp ứng engine của mobile và web. npm được cài kèm Node.js. Không cần cài Next.js hoặc React Native CLI toàn cục; project gọi các bản local qua npm scripts.

```powershell
node --version
npm --version
```

### 3. Docker Desktop (web demo và database)

`docker-compose.yml` chạy PostgreSQL/PostGIS bằng image `postgis/postgis:16-3.4`; **không cần cài PostgreSQL/PostGIS riêng** và không cần cài Docker Compose riêng.

1. Docker Desktop dùng backend WSL 2 trên Windows. Nếu máy chưa có WSL, mở PowerShell bằng quyền Administrator và chạy:

   ```powershell
   wsl --install
   ```

   Khởi động lại máy nếu Windows yêu cầu; kiểm tra `wsl --version`. Docker yêu cầu WSL 2 được hỗ trợ và hardware virtualization đang bật trong BIOS/UEFI; xem [điều kiện hiện hành của Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/).

2. Tải và cài [Docker Desktop for Windows](https://docs.docker.com/desktop/setup/install/windows-install/). Chọn backend WSL 2, mở Docker Desktop và đợi trạng thái engine sẵn sàng.
3. Xác minh trong PowerShell:

   ```powershell
   docker version
   docker compose version
   ```

Docker Desktop có điều khoản cấp phép riêng; kiểm tra điều khoản hiện hành nếu sử dụng cho cơ quan nhà nước hoặc mục đích thương mại.

### 4. Android Studio và Android SDK (chỉ cần để chạy mobile)

Mobile là React Native CLI `0.85.3`; cấu hình hiện tại chỉ có Android. Hướng dẫn nền tảng chính thức: [React Native 0.85 — Set Up Your Environment](https://reactnative.dev/docs/0.85/set-up-your-environment).

1. Cài [JDK 17](https://adoptium.net/temurin/releases/?version=17) và đặt `JAVA_HOME` trỏ tới JDK 17; thêm `%JAVA_HOME%\bin` vào `Path`. React Native khuyến nghị JDK 17.
2. Tải [Android Studio](https://developer.android.com/studio). Trong setup wizard, cài Android SDK và Android Virtual Device.
3. Mở **Android Studio → More Actions → SDK Manager** (hoặc **Settings → Languages & Frameworks → Android SDK**) và cài:
   - **Android SDK Platform 35** (project compile với SDK 35).
   - **Android SDK Build-Tools 36.0.0** và **Android SDK Command-line Tools (latest)**.
   - **Android SDK Platform-Tools** (có `adb`) và **Android Emulator**.
   - Trong **SDK Tools → Show Package Details → NDK (Side by side)**, cài `27.1.12297006`.
4. Trong **Android Studio → More Actions → Virtual Device Manager**, tạo AVD dùng system image Android 15 / API 35 rồi khởi động emulator. Có thể dùng thiết bị Android API 24 trở lên thay emulator; bật Developer options và USB debugging.
5. Từ **Android SDK Location** trong SDK Manager, lấy đường dẫn SDK, đặt `ANDROID_HOME` thành đường dẫn đó và thêm `%ANDROID_HOME%\platform-tools` cùng `%ANDROID_HOME%\emulator` vào `Path`. Mở PowerShell mới rồi kiểm tra:

   ```powershell
   java -version
   $env:ANDROID_HOME
   adb version
   adb devices
   ```

Chỉ chạy web/API thì không cần Android Studio, JDK hay emulator. Repo chưa có iOS project/script; không cần cài Xcode cho các lệnh hiện tại.

### Công cụ được project quản lý

Sau khi cài các công cụ nền tảng ở trên, `npm ci` tại root cài dependency web; `npm ci` trong `mobile/` cài dependency mobile. Không cần cài Gradle riêng vì Android project có Gradle Wrapper.

Các bước chạy web yêu cầu cổng `5432` cho PostgreSQL Compose và `3000` cho web. Emulator Android API 35 hoặc thiết bị thật chỉ cần thiết nếu chạy ứng dụng mobile.

## Chạy web demo local

Chạy từ thư mục gốc repository. Bản demo chỉ được phép dùng PostgreSQL `civicos` của Docker Compose local trên loopback `localhost:5432`; không trỏ tới shared, staging hoặc production.

### 1. Cài dependency và khởi động PostgreSQL

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm ci
docker compose up -d postgres
docker compose exec -T postgres pg_isready -U civicos -d civicos
npm run prisma:generate
```

`.env.example` đặt sẵn URL mẫu cho database local. Trước bootstrap, đặt cả hai biến về cùng target và dùng fixed clock:

```powershell
$demoDatabaseUrl = "postgresql://civicos:civicos@localhost:5432/civicos?schema=public"
$env:DATABASE_URL = $demoDatabaseUrl
$env:DEMO_DATABASE_URL = $demoDatabaseUrl
$env:DEMO_NOW = "2026-09-28T08:00:00.000Z"
npm run demo:bootstrap
```

`demo:bootstrap` chạy preflight target/clock trước, sau đó mới deploy migration và seed dữ liệu demo. Bootstrap có thay đổi schema và dữ liệu trong database đã chọn; chỉ chạy trên target local nêu trên.

`npm run demo:reset` đã được retire và luôn từ chối với `DEMO_RESET_RETIRED_USE_E2E_LIFECYCLE`; lệnh này không import Prisma, kết nối hoặc truncate `civicos`. Điều này không tắt demo seed thường dùng cho dữ liệu local.

### 2. Chạy worker và web

Mở hai cửa sổ PowerShell riêng. Đặt target trong từng cửa sổ.

**Terminal A — event worker:**

```powershell
$demoDatabaseUrl = "postgresql://civicos:civicos@localhost:5432/civicos?schema=public"
$env:DATABASE_URL = $demoDatabaseUrl
$env:DEMO_DATABASE_URL = $demoDatabaseUrl
$env:DEMO_NOW = "2026-09-28T08:00:00.000Z"
$env:EVENT_WORKER_INTERVAL_MS = "500"
npm run worker
```

**Terminal B — web/API:**

```powershell
$demoDatabaseUrl = "postgresql://civicos:civicos@localhost:5432/civicos?schema=public"
$env:DATABASE_URL = $demoDatabaseUrl
$env:DEMO_DATABASE_URL = $demoDatabaseUrl
$env:DEMO_NOW = "2026-09-28T08:00:00.000Z"
npm run dev
```

Mở <http://localhost:3000> hoặc <http://localhost:3000/login>. Đăng nhập demo, account và kịch bản thao tác được ghi trong [`docs/demo-script.md`](docs/demo-script.md).

### 3. Dừng demo

Dừng web và worker bằng `Ctrl+C`. Khi muốn dừng PostgreSQL:

```powershell
docker compose stop postgres
```

Database nằm trong volume Compose và còn nguyên sau khi dừng container. Không dùng `docker compose down -v` như bước dọn dẹp mặc định.

## Database-backed tests

`civicos` là database cho ứng dụng và demo local. Tất cả test cần database chỉ được dùng target tách biệt `postgresql://...@127.0.0.1:5432/civicos_e2e`; không đổi `DATABASE_URL` để chuyển target và không dùng `civicos_test`/`civicos_demo` thay cho E2E target. `civicos_test` được giữ nguyên vì inventory read-only đã tìm migration/PostGIS data.

Trước mỗi lần chạy test có database, xác minh lại PostgreSQL endpoint, container và volume sở hữu `127.0.0.1:5432`, đồng thời bảo đảm không có container khác dùng chung volume. Nếu cổng đang bị chiếm, xác định owner trước khi cân nhắc giải phóng cổng. URL allowlist không thay thế kiểm tra quyền sở hữu volume; không reset/xóa database hoặc volume thủ công.

Vitest DB-backed dùng lifecycle runner (không gọi Vitest DB phase trực tiếp):

```powershell
$env:CIVICOS_E2E_DATABASE_URL = "postgresql://civicos:civicos@127.0.0.1:5432/civicos_e2e?schema=public"
node scripts/e2e/run-vitest-db.mjs
```

Runner yêu cầu target tường minh, giữ advisory lock toàn run, deploy migration, seed Identity fixtures, chạy Vitest rồi xóa application rows trong `civicos_e2e`, giữ nguyên schema, `_prisma_migrations` và PostGIS reference data. `npm test` giữ các DB-backed suites ở trạng thái tắt; không tự đặt `RUN_DB_TESTS=1`. Xem [`playwright/README.md`](playwright/README.md) trước khi chạy Python browser suite.

## Chạy ứng dụng mobile Android

Mobile là React Native CLI (không dùng Expo). Cần chạy web/API ở trên vì ứng dụng mobile gọi API của CivicOS; điện thoại không kết nối trực tiếp tới PostgreSQL.

### 1. Cài dependency và cấu hình địa chỉ API

Từ root:

```powershell
Push-Location mobile
npm ci
Pop-Location
```

Android cần biết URL của web/API tại thời điểm build. Gradle đọc project property `CIVICOS_API_BASE_URL`; cách dưới đây đặt property theo từng terminal, không cần sửa `mobile/android/gradle.properties`.

- Android Emulator: dùng `http://10.0.2.2:3000` để emulator truy cập web server trên máy host.
- Thiết bị thật qua USB: chạy `adb reverse tcp:3000 tcp:3000`, sau đó dùng `http://127.0.0.1:3000`.
- Thiết bị qua Wi-Fi: dùng IP LAN của máy phát triển, ví dụ `http://192.168.1.20:3000`. Nếu cần, chạy Next.js với `npm run dev -- --hostname 0.0.0.0` và chỉ mở cổng trong mạng tin cậy; không expose dev server ra Internet.

### 2. Khởi động Metro và cài/chạy app

Mở hai cửa sổ PowerShell từ thư mục gốc repository.

**Terminal A — Metro bundler:**

```powershell
Set-Location mobile
npm start
```

**Terminal B — Android Emulator:**

```powershell
Set-Location mobile
$env:ORG_GRADLE_PROJECT_CIVICOS_API_BASE_URL = "http://10.0.2.2:3000"
npm run android
```

Với thiết bị thật qua USB, trước khi chạy lệnh Android hãy dùng `adb devices` để xác nhận thiết bị, rồi:

```powershell
adb reverse tcp:3000 tcp:3000
$env:ORG_GRADLE_PROJECT_CIVICOS_API_BASE_URL = "http://127.0.0.1:3000"
npm run android
```

Với thiết bị qua Wi-Fi, trong Terminal B thay URL trong `ORG_GRADLE_PROJECT_CIVICOS_API_BASE_URL` bằng IP LAN của máy phát triển; tại terminal web dùng `npm run dev -- --hostname 0.0.0.0` nếu server chưa nhận kết nối mạng LAN.

Sau khi build, cài và mở app, có thể xóa biến môi trường khỏi terminal bằng:

```powershell
Remove-Item Env:ORG_GRADLE_PROJECT_CIVICOS_API_BASE_URL
```

Để tạo APK debug mà không cài lên thiết bị, chạy từ root và đặt API URL cho emulator (hoặc thay bằng URL theo thiết bị ở trên):

```powershell
$env:ORG_GRADLE_PROJECT_CIVICOS_API_BASE_URL = "http://10.0.2.2:3000"
npm run mobile:build
Remove-Item Env:ORG_GRADLE_PROJECT_CIVICOS_API_BASE_URL
```

Đây chỉ là build Android; repo hiện chưa có hướng dẫn build/run iOS.

## Kiểm tra khi phát triển

Chạy các lệnh từ root:

```powershell
npm run typecheck
npm test
npm run build
npm run mobile:typecheck
npm run mobile:test
npm run mobile:build
```

Một số test cần PostgreSQL hoặc cấu hình môi trường riêng; xem thông báo của test và hướng dẫn trong `docs/` nếu một lệnh cần điều kiện bổ sung.

## Tài liệu liên quan

- [`docs/demo-script.md`](docs/demo-script.md): preflight, accounts và kịch bản demo đầy đủ.
- [`docs/runbooks/`](docs/runbooks/): operator runbooks và trạng thái handoff.
- [`CONTEXT.md`](CONTEXT.md): ngôn ngữ/domain context.
- [`Requirement.md`](Requirement.md): yêu cầu gốc Epic PS-E1.
