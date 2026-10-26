# Runbook vận hành UI Auto Demo

> **Trạng thái: CHƯA KHẢ DỤNG.** UI Auto Demo là tính năng dự kiến, chưa được xác nhận sẵn sàng để operator sử dụng. Tài liệu này là handoff/prerequisite cho tương lai, không phải bằng chứng tính năng đã hoàn tất; không khởi chạy hoặc vận hành UI Auto Demo theo các bước bên dưới. Để chạy demo thông thường hiện có, dùng [`docs/demo-script.md`](../../demo-script.md). D-80 chỉ quyết định target cho demo Compose thông thường và không thay thế các SOW/contract locked của UI Auto Demo.

Runbook này dành cho operator của môi trường local/demo. Runner chỉ kiểm tra readiness và báo `blocked` hoặc `deferred`; operator sở hữu việc khởi động và dừng PostgreSQL, Next.js, worker, TileServer, Metro và emulator/device.

## 1. Preflight và target

Chạy từ repository root. Chuẩn bị `.env` theo `.env.example`, cài dependency, sau đó operator khởi động PostgreSQL và kiểm tra readiness:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm install
docker compose up -d postgres
docker compose exec -T postgres pg_isready -U civicos -d civicos
npm run prisma:generate
```

Target duy nhất là `civicos` của Docker Compose local, PostgreSQL loopback port `5432` (D-80). Compose chỉ publish cổng trên loopback; target guard từ chối remote host hoặc port khác, kể cả khi database trùng tên. Prisma runtime đọc `DATABASE_URL`; đây là biến quyết định target demo. `DEMO_DATABASE_URL` chỉ là alias tùy chọn và chỉ được chấp nhận khi trùng database với `DATABASE_URL` — nếu khác, mọi demo action bị chặn trước side effect. Giá trị chuẩn khớp Compose/.env.example là `postgresql://civicos:civicos@localhost:5432/civicos?schema=public`. Đặt fixed clock bằng ISO-8601 có timezone:

```powershell
$env:DATABASE_URL = "<DATABASE_URL>"   # database name chính xác: civicos
$env:DEMO_DATABASE_URL = $env:DATABASE_URL   # alias tùy chọn, phải khớp
$env:DEMO_NOW = "<ISO_8601_WITH_TIMEZONE>"
```

Nếu target không đúng `civicos`, sai/khác giữa `DEMO_DATABASE_URL` và `DATABASE_URL`, thiếu provider hoặc readiness chưa đạt, runner phải dừng ở `blocked`; không đăng nhập persona và không mutation.

## 2. Bootstrap và readiness

Operator chạy seed trước khi yêu cầu runner `Start`. Trên máy mới: copy `.env`, cài dependency, start PostgreSQL (`docker compose up -d postgres`), generate Prisma client, rồi áp migrations trước khi seed. `npm run demo:bootstrap` tự chạy `predemo:bootstrap` để kiểm tra target và fixed clock trước; chỉ sau khi preflight pass mới chạy `prisma migrate deploy` rồi `node --env-file=.env --import=tsx scripts/demo/seed.ts`. Runbook này vẫn chỉ là handoff cho UI Auto Demo chưa khả dụng, không phải hướng dẫn operator chạy tính năng ngay:

```powershell
npm run prisma:generate
npm run demo:bootstrap
npx tsx scripts/demo/seed-land.ts
```

`seed-land.ts` chỉ chạy khi cần land fixture. Xác nhận log seed, target, `DEMO_NOW`, worker health và assignment scope. Provider persona phải là `LIVE_DEMO`, local/demo allowlist; scope được reload sau khi đổi persona. Không đưa thông tin xác thực vào log, tài liệu hoặc evidence.

Runner kiểm tra các dependency sau và chỉ báo kết quả:

| Dependency      | Readiness cần operator xác nhận                          |
| --------------- | -------------------------------------------------------- |
| PostgreSQL      | kết nối được tới `civicos`                               |
| Next.js         | web sẵn sàng trên cổng local đã cấu hình                 |
| worker          | health không có dead letter và queue ổn định             |
| TileServer      | chỉ khi asset CADN qua metadata gate                     |
| Metro           | sẵn sàng cho native segment nếu operator chọn chạy       |
| emulator/device | `adb` thấy thiết bị và app native đã cài nếu chạy native |

Operator tự start các process này. Runner không tự start, không bypass authorization và không biến readiness thiếu thành thành công.

## 3. CADN map (optional)

Chỉ dùng `storage/tiles/cadn/cadn.mbtiles` sau khi metadata gate hiện có đã pass. TileServer dùng read-only mount; map phải giữ attribution OpenStreetMap và bbox chính xác `[105.93,20.91,106.03,20.99]`. Không dùng Zurich, sample hoặc global fallback. Nếu asset hoặc TileServer chưa sẵn sàng, đánh dấu `deferred` hoặc `blocked` và tiếp tục queue/detail với safe state. Đối chiếu evidence và runbook CADN đã commit; ticket này không thêm hạ tầng tile.

## 4. Start, pacing và surface

Sau khi mọi readiness check pass, operator yêu cầu runner `Start`. Runner phải giữ mode `LIVE_DEMO`, target `civicos`, local/demo persona provider và nhịp 3 giây giữa các action.

- Live mutation chỉ chạy trên web qua authorization, Assignment và masking hiện có.
- Mobile giữ read-only qua `WriteGuard`; UAD-14 mobile write là forbidden, không có CTA hoặc fake success.
- Native segment cần Metro và emulator/device; Chromium mobile không thay thế native runtime.
- Evidence chỉ gồm sáu trường an toàn: `runId`, `sceneId`, `stepId`, `status`, `durationMs`, `reason`; không ghi payload, geometry hay dữ liệu định danh.

## 5. Stop, Replay và recovery

Khi lỗi, mất dependency hoặc gặp expected negative state:

1. **Stop:** dừng action mới và giữ nguyên trạng thái `blocked`/`deferred`.
2. **Replay:** chỉ thực hiện sau khi operator sửa dependency, target, fixture, idempotency và cleanup readiness; không retry mù mutation.
3. **Escalate (escalate):** ghi reason/evidence an toàn và chuyển cho Techlead/operator owner khi dependency vẫn chưa sẵn sàng.

Runner không tự khởi động hạ tầng, không bypass authorization, không giả thành công và không tự đổi target. Stop không rollback mutation đã commit.

## 6. Kết thúc, cleanup và reset

Run read-only kết thúc là `completed` với reason không mutation. Run đã commit mutation hoặc bị stop khi cleanup chưa xong phải là `completed-with-cleanup-pending`; operator nhận cleanup thủ công. Không rollback ngầm và UI/runner không gọi reset.

Dừng process bằng `Ctrl+C`, sau đó operator có thể giữ volume bằng:

```powershell
docker compose stop
```

Destructive reset chỉ được operator thực hiện sau khi xác nhận đúng target `civicos`, dùng guard hiện có:

```powershell
$env:DATABASE_URL = "<DATABASE_URL>"
$env:DEMO_DATABASE_URL = $env:DATABASE_URL
$env:DEMO_RESET_CONFIRM = "1"
npm run demo:reset
```

Hoặc dùng confirmation flag hiện có:

```powershell
Remove-Item Env:DEMO_RESET_CONFIRM -ErrorAction SilentlyContinue
npm run demo:reset -- --confirm
```

Sau reset, chạy lại `demo:bootstrap` (và `seed-land.ts` nếu cần) theo đúng thứ tự. Không tạo lệnh reset mới và không dùng `docker compose down -v` làm cleanup mặc định.

## 7. Operator handoff

Coverage chi tiết và giới hạn nằm tại [`coverage.md`](coverage.md). T-012 đã hoàn tất; gate kế tiếp là `gov-phase-verify` cho PH-06.

Phạm vi được phép của handoff: `docs/demo-script.md`, `docs/runbooks/ui-auto-demo/**`, `brain/domains/demo-runner/research/**`, `.scratch/ui-auto-demo/**`, `tests/demo-ui/**`, `tests/integration/**`. Locked refs gồm `docs/ui-auto-demo/LOCK.json` và các locked design files `overview.md`, `non-functional.md`, `edge-cases.md`, `integration-contracts.md`, `data-model.md` dưới `docs/ui-auto-demo/`; approved SOW là `.scratch/ui-auto-demo/sow.md`. Handoff cũng giữ danh sách **operator prerequisites**: target, provider, database, readiness và các process optional.
