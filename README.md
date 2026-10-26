# CivicOS — Nghĩa Trụ

CivicOS là không gian điều hành tác nghiệp, kết nối công việc trực ban, hiện trường và kiểm tra trong một lịch sử nghiệp vụ có thể truy vết. Màn hình và hồ sơ được giới hạn theo vai trò, đơn vị và nhiệm vụ được giao.

## Các phân hệ

- **Tin báo và Incident:** tiếp nhận thông tin, phân loại, phân công và theo dõi xử lý.
- **Kiểm tra:** quản lý danh mục cơ sở, lịch kiểm tra, checklist, phát hiện và kiến nghị.
- **Phương tiện:** registry phương tiện cần chú ý và ghi nhận quan sát hiện trường.
- **Cư dân đặc biệt:** theo dõi hồ sơ và báo cáo nghiệp vụ.
- **Đất đai:** tra cứu thửa đất, chủ thể và hàng đợi hồ sơ biến động trong phạm vi được cấp quyền.
- **Bản đồ và mobile:** bản đồ nghiệp vụ; ứng dụng mobile hiện tập trung vào đọc dữ liệu.

> CivicOS dùng PostgreSQL/PostGIS và event worker để xử lý các sự kiện nghiệp vụ, projection và một số trạng thái theo dõi. Bản đồ có thể cần tile asset local tùy nội dung trình diễn.

## Trạng thái và giới hạn

Đây là snapshot phát triển/demo local, không phải hướng dẫn triển khai production. Dữ liệu seed là synthetic: không đưa dữ liệu cá nhân thật vào demo và không xem dữ liệu bản đồ/lookup mô phỏng là dữ liệu pháp lý hay kết nối cơ sở dữ liệu quốc gia.

**UI Auto Demo là tính năng dự kiến và hiện chưa khả dụng.** Runbook tương ứng là tài liệu handoff cho tương lai, không phải hướng dẫn vận hành hiện tại.

## Chạy bản demo local (Windows PowerShell)

Cần có Node.js/npm và Docker Compose. Chạy các lệnh từ thư mục gốc repository:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm ci
docker compose up -d postgres
npm run prisma:generate

# Fixed clock cho dữ liệu demo; .env.example trỏ tới DB civicos local.
$env:DEMO_NOW = "2026-09-28T08:00:00.000Z"
npm run demo:bootstrap
npm run dev
```

Mở <http://localhost:3000>. `demo:bootstrap` kiểm tra target trước khi chạy migration và seed; target được giới hạn ở database `civicos` của Docker Compose local trên loopback port `5432`. Không trỏ demo tới shared, staging hoặc production. Database nằm trong volume Compose và tồn tại sau khi dừng container; không dùng `docker compose down -v` như bước dọn dẹp mặc định.

Để worker xử lý outbox/projection khi trình diễn, mở một PowerShell thứ hai và chạy:

```powershell
$demoDatabaseUrl = "postgresql://civicos:civicos@localhost:5432/civicos?schema=public"
$env:DATABASE_URL = $demoDatabaseUrl
$env:DEMO_DATABASE_URL = $demoDatabaseUrl
$env:DEMO_NOW = "2026-09-28T08:00:00.000Z"
npm run worker
```

Kịch bản demo đầy đủ, các giới hạn và hướng dẫn từng bước nằm trong [`docs/demo-script.md`](docs/demo-script.md).

## Kiểm tra khi phát triển

```powershell
npm run typecheck
npm test
npm run build
```
