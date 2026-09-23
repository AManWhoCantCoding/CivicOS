# Ticket 06 — Tester evidence

## Phạm vi và file

- Chỉ chạy các kiểm tra được Planner giao:
  - `tests/e2e/module-shell.spec.ts` trên `chromium` và `mobile`.
  - `tests/e2e/login-and-access.spec.ts` trên `chromium` và `mobile`.
  - Regression browser flows: `tests/e2e/ps005-incident.spec.ts`, `tests/e2e/ps007-inspection.spec.ts`, `tests/e2e/ps009-vehicle-watch.spec.ts` trên `chromium` và `mobile`.
  - Typecheck, lint, format-check.
- File evidence được tạo: `.brain/evidence/06-module-shell-sidebar/tests.md`.
- Không sửa source production hoặc file test.

## Reset database trước từng nhóm Playwright

Docker Desktop preflight:

```text
docker.exe info
Client: Version: 29.6.2
Context: desktop-linux
Server: Docker Desktop
```

Đã dùng disposable PostgreSQL bằng cách xoá volume Compose, tạo lại PostgreSQL, chờ `pg_isready`, rồi deploy toàn bộ migration:

```text
powershell.exe -NoProfile -Command '$ErrorActionPreference="Stop"; docker.exe compose down -v; docker.exe compose up -d postgres; $ready=$false; for($i=0;$i -lt 30;$i++){ docker.exe compose exec -T postgres pg_isready -U civicos -d civicos *> $null; if($LASTEXITCODE -eq 0){$ready=$true; break}; Start-Sleep -Seconds 1 }; if(-not $ready){ throw "PostgreSQL did not become ready" }; npx.cmd prisma migrate deploy'
```

Lệnh trên đã chạy riêng trước mỗi nhóm `module-shell`, `login-and-access`, và nhóm ba regression specs. Sau mỗi lần reset, bằng chứng database trống trước khi browser chạy:

```text
docker.exe compose exec -T postgres psql -U civicos -d civicos -c 'SELECT current_database(), count(*) FROM "User";'
 current_database | count
------------------+-------
 civicos          |     0
(1 row)
```

Development users được seed bởi `ensureDevelopmentUsers()` khi các login flow gọi route `/api/auth/session`; browser không dùng dữ liệu domain còn sót từ run trước. Migrations log ở cả ba lần reset đều kết thúc bằng:

```text
All migrations have been successfully applied.
```

## Playwright results

### `module-shell.spec.ts`

Lệnh cuối cùng:

```text
powershell.exe -NoProfile -Command 'npx.cmd playwright test tests/e2e/module-shell.spec.ts --project=chromium --project=mobile'
```

Kết quả: **FAIL** — `25 passed`, `1 failed`, `2 skipped` trên 28 tests; Chromium có 1 failure, mobile pass toàn bộ 12 test thực thi và 1 desktop-only skip.

Nguyên văn lỗi:

```text
Error: expect(locator).toBeVisible() failed

Locator: locator('nav[aria-label="Điều hướng Incident"]').visible()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('nav[aria-label="Điều hướng Incident"]').visible() with timeout 5000ms
  - waiting for locator('nav[aria-label="Điều hướng Incident"]').visible()

      236 |   await page.goto('/incidents');
      237 |   const sidebar = await visibleNav(page, 'Incident', testInfo);
    > 238 |   await expect(sidebar).toBeVisible();
          |                         ^
```

Tái hiện chính xác: project `chromium`; login bằng `hientruong@civicos.local` / `civicos-dev`; GET `/api/auth/session`; GET `/api/identity/assignments`; lọc assignment active của session theo `incident_verification` và `vehicle_verification`; GET `/incidents`; kiểm tra `nav[aria-label="Điều hướng Incident"]` visible. URL lỗi: `/incidents`. Kết quả thực tế trong error context: text `Chưa có Feature nào trong phạm vi của tài khoản.`, heading `Hàng đợi Incident`, heading `Không có quyền truy cập`, paragraph `Hàng đợi Incident không thuộc nhiệm vụ hoặc phạm vi của tài khoản hiện tại.`; navigation `Điều hướng Incident` không tồn tại. Kết quả mong đợi: sidebar Incident visible để tiếp tục assert Feature theo assignment.

Các kiểm tra direct-link denial trong cùng spec đã pass, gồm server-render denied state cho `/vehicles/registry`, `/field/vehicles`, `/inspections/establishments`, `/incidents`, `/identity`, và `/users`; logged-out `/incidents` render queue không có sidebar và `GET /api/incidents` trả `401`.

### `login-and-access.spec.ts`

Lệnh:

```text
powershell.exe -NoProfile -Command 'npx.cmd playwright test tests/e2e/login-and-access.spec.ts --project=chromium --project=mobile'
```

Kết quả: **PASS** — `18 passed` trong `57.7s`.

### Regression browser flows

Lệnh:

```text
powershell.exe -NoProfile -Command 'npx.cmd playwright test tests/e2e/ps005-incident.spec.ts tests/e2e/ps007-inspection.spec.ts tests/e2e/ps009-vehicle-watch.spec.ts --project=chromium --project=mobile'
```

Kết quả: **PASS** — `32 passed` trong `4.7m`.

## Đối chiếu Acceptance Criteria

- AC1: Covered by `dashboard preserves module cards and open-module behavior` — PASS trên desktop/mobile.
- AC2: Covered by Incident, Inspection, Vehicle, Identity shell tests — PASS trong các ca tương ứng; module-shell có 1 FAIL riêng nêu trên.
- AC3: Covered by sidebar feature assertions cho bốn module — các ca tương ứng PASS.
- AC4: Covered by role-filtered sidebar tests và own-assignment visibility test — desktop own-assignment test FAIL như log trên; mobile PASS.
- AC5: Covered by `feature entry routes deny unauthorized direct links from the server`, `direct links without permission return server denied states`, cùng login/access server-denied tests — PASS cho các route `/identity`, `/users`, `/assignments`, `/incidents`, `/inspections/establishments`, `/vehicles/registry`, `/field/vehicles` theo contract hiện có.
- AC6: Covered by active state, breadcrumb, accessible name, keyboard focus tests — PASS ở các ca thực thi.
- AC7: Covered by desktop collapse/expand và mobile drawer/focus/escape/navigation tests — PASS; desktop-only/mobile-only skips đúng điều kiện project.
- AC8: Covered by denied, empty, offline và loading/error/retry browser assertions trong module-shell/regression specs — các ca tương ứng PASS; module-shell tổng thể còn 1 FAIL đã nêu.
- AC9: Covered by role/assignment-filtered navigation và direct URL denial — PASS ở các ca direct denial; own-assignment desktop ca FAIL đã nêu.
- AC10: Direct server-render denial được kiểm tra qua heading `Không có quyền truy cập`, không chỉ sidebar client; PASS ở các direct-link cases đã nêu.

## Typecheck, lint, format-check

Typecheck:

```text
powershell.exe -NoProfile -Command 'npx.cmd tsc --noEmit'
```

Kết quả: **PASS**, không có output lỗi.

Lint:

```text
powershell.exe -NoProfile -Command 'npx.cmd eslint .'
```

Kết quả: **PASS**, không có output lỗi.

Format-check đúng toàn bộ nhóm file ticket 06 đã chạm:

```text
powershell.exe -NoProfile -Command 'npx.cmd prettier --check src/app/assignments/page.tsx src/app/field/vehicles/page.tsx src/app/incidents/page.tsx src/app/incidents/layout.tsx src/app/inspections/establishments/page.tsx src/app/inspections/layout.tsx src/app/vehicles/registry/page.tsx src/app/vehicles/layout.tsx src/app/identity src/app/users/page.tsx src/components/navigation src/components/shell tests/e2e/module-shell.spec.ts'
```

Kết quả: **PASS** — `All matched files use Prettier code style!`

Format-check toàn repo cũng đã chạy nhưng **FAIL** do 13 file ngoài nhóm ticket 06; đây là log nguyên văn của công cụ:

```text
[warn] Lesson-learned.md
[warn] src/components/incidents/IncidentStatusActions.tsx
[warn] src/components/incidents/IntakeReportForm.tsx
[warn] src/components/incidents/useIncidentSession.ts
[warn] src/modules/identity/assignments.ts
[warn] src/modules/identity/contracts.ts
[warn] src/modules/incidents/commands.ts
[warn] src/modules/incidents/domain.ts
[warn] tests/e2e/ps005-incident.spec.ts
[warn] tests/identity/capability-policy.test.ts
[warn] tests/incidents/incident-approval.postgres.test.ts
[warn] tests/incidents/incident-authorization.postgres.test.ts
[warn] tests/integration/parallel-wave-replay.integration.test.ts
Code style issues found in 13 files. Run Prettier with --write to fix.
```

## Cleanup / trục trặc

- Lần chạy đầu của module-shell bị tool timeout ở 120000 ms sau khi đã in đến test 19; đã reset disposable database lại và chạy lại toàn spec với timeout 300000 ms để thu đủ kết quả. Không dùng kết quả chạy dở làm kết quả cuối.
- Hai lệnh seed inline thất bại do quoting của PowerShell/tsx và tạo một file rác ở repo root; không dùng chúng làm test result. File rác không thể xoá bằng harness permission hiện tại. Việc ghi/cập nhật `Lesson-learned.md` cũng bị harness chặn quyền edit; đã có bài học tương ứng về tool path preflight trong file hiện hữu, nhưng không thể cập nhật mục đó trong lần chạy này.
- Sau khi hoàn tất, `docker.exe compose down` đã dừng PostgreSQL; kiểm tra cuối không còn listener ở `:3000` hoặc `:5432`.

## Retest sau khi chỉnh test theo server-denied behavior

Không sửa source production hoặc file test trong lần retest này. Trước từng nhóm Playwright, disposable PostgreSQL được xoá volume, tạo lại, chờ `pg_isready`, deploy 11 migration, kiểm tra số dòng trước seed, gọi POST login development để chạy seed harness `ensureDevelopmentUsers()`, rồi kiểm tra số dòng sau seed. Raw counts:

```text
Group module-shell before seed:
 current_database | users | roles | organization_units
------------------+-------+-------+--------------------
 civicos          |     0 |     8 |                  0
Group module-shell after seed:
 current_database | users | roles | organization_units
------------------+-------+-------+--------------------
 civicos          |    11 |     8 |                  2

Group login-and-access before seed:
 current_database | users | roles | organization_units
------------------+-------+-------+--------------------
 civicos          |     0 |     8 |                  0
Group login-and-access after seed:
 current_database | users | roles | organization_units
------------------+-------+-------+--------------------
 civicos          |    11 |     8 |                  2

Group regression before seed:
 current_database | users | roles | organization_units
------------------+-------+-------+--------------------
 civicos          |     0 |     8 |                  0
Group regression after seed:
 current_database | users | roles | organization_units
------------------+-------+-------+--------------------
 civicos          |    11 |     8 |                  2
```

Exact reset command used before each group:

```text
powershell.exe -NoProfile -Command '$ErrorActionPreference="Stop"; docker.exe compose down -v; docker.exe compose up -d postgres; $ready=$false; for($i=0;$i -lt 30;$i++){ docker.exe compose exec -T postgres pg_isready -U civicos -d civicos *> $null; if($LASTEXITCODE -eq 0){$ready=$true; break}; Start-Sleep -Seconds 1 }; if(-not $ready){throw "PostgreSQL did not become ready"}; npx.cmd prisma migrate deploy'
docker.exe compose exec -T postgres psql -U civicos -d civicos -c 'SELECT current_database(), (SELECT count(*) FROM "User") AS users, (SELECT count(*) FROM "Role") AS roles, (SELECT count(*) FROM "OrganizationUnit") AS organization_units;'
curl.exe -fsS -X POST http://127.0.0.1:3000/api/auth/session -H "Content-Type: application/json" -d "{\"email\":\"truong@civicos.local\",\"password\":\"civicos-dev\"}"
docker.exe compose exec -T postgres psql -U civicos -d civicos -c 'SELECT current_database(), (SELECT count(*) FROM "User") AS users, (SELECT count(*) FROM "Role") AS roles, (SELECT count(*) FROM "OrganizationUnit") AS organization_units;'
```

Migration raw result for each reset ended with:

```text
11 migrations found in prisma/migrations
All migrations have been successfully applied.
```

### Playwright

1. `npx.cmd playwright test tests/e2e/module-shell.spec.ts --project=chromium --project=mobile`
   - **FAIL:** `24 passed`, `2 failed`, `2 skipped` trên 28 tests.
   - Chromium và mobile đều fail cùng test `client visibility stays in sync with server-authorized session and own assignments`.
   - Nguyên văn lỗi Chromium:

```text
Error: expect(locator).toBeVisible() failed

Locator: locator('nav[aria-label="Điều hướng Phương tiện"]').visible()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('nav[aria-label="Điều hướng Phương tiện"]').visible() with timeout 5000ms
  - waiting for locator('nav[aria-label="Điều hướng Phương tiện"]').visible()


      260 |   await page.goto('/field/vehicles');
      261 |   const vehicleSidebar = await visibleNav(page, 'Phương tiện', testInfo);
    > 262 |   await expect(vehicleSidebar).toBeVisible();
          |                                ^
      263 |   await expect(
      264 |     vehicleSidebar.getByRole('link', { name: 'Registry xe cần chú ý' }),
      265 |   ).toHaveCount(0);
      266 |   await expect(
      267 |     vehicleSidebar.getByRole('link', { name: 'Quan sát hiện trường' }),
      268 |   ).toBeVisible();
```

   - Nguyên văn lỗi mobile:

```text
Test timeout of 30000ms exceeded.

Error: locator.click: Test timeout of 30000ms exceeded
Call log:
  - waiting for getByRole('button', { name: 'Mở điều hướng' })


      19 |   if (testInfo.project.name === 'mobile') {
      20 |     if (!(await drawer.isVisible())) {
    > 21 |       await page.getByRole('button', { name: 'Mở điều hướng' }).click();
         |                                                                 ^
      22 |     }
      23 |     await expect(drawer).toBeVisible();
      24 |     return drawer;
```

   - Tái hiện: đăng nhập `hientruong@civicos.local` bằng `civicos-dev`; GET `/api/auth/session`; GET `/api/identity/assignments`; GET `/incidents`; GET `/vehicles/registry`; GET `/field/vehicles`; lỗi xảy ra tại URL `/field/vehicles`. Mong đợi theo assertion: sidebar `Phương tiện` visible, `Registry xe cần chú ý` absent và `Quan sát hiện trường` visible. Thực tế: Chromium không có `nav[aria-label="Điều hướng Phương tiện"]`; mobile không có nút `Mở điều hướng` để click. Đây là toàn bộ raw failure output; không tự chẩn đoán nguyên nhân.

2. `npx.cmd playwright test tests/e2e/login-and-access.spec.ts --project=chromium --project=mobile`
   - **PASS:** `18 passed (49.1s)`.

3. `npx.cmd playwright test tests/e2e/ps005-incident.spec.ts tests/e2e/ps007-inspection.spec.ts tests/e2e/ps009-vehicle-watch.spec.ts --project=chromium --project=mobile`
   - **PASS:** `32 passed (4.1m)`.

Direct-link server denial/logged-out/mobile-desktop coverage: assertions passed for `/identity`, `/users`, `/assignments`, `/incidents`, `/inspections/establishments`, `/vehicles/registry`, `/field/vehicles`; logged-out `/incidents` rendered the queue without module sidebar and `GET /api/incidents` returned `401`. The module-shell run's two failures were only the own-assignment visibility test described above.

### Typecheck, lint, format-check

```text
npx.cmd tsc --noEmit
```

**PASS** — không có output.

```text
npx.cmd eslint .
```

**PASS** — không có output.

```text
npx.cmd prettier --check src/app/assignments/page.tsx src/app/field/vehicles/page.tsx src/app/incidents/page.tsx src/app/incidents/layout.tsx src/app/inspections/establishments/page.tsx src/app/inspections/layout.tsx src/app/vehicles/registry/page.tsx src/app/vehicles/layout.tsx src/app/identity src/app/users/page.tsx src/components/navigation src/components/shell tests/e2e/module-shell.spec.ts
```

**PASS:**

```text
Checking formatting...
All matched files use Prettier code style!
```

### Cleanup

`docker.exe compose down` đã chạy sau nhóm cuối. Ban đầu còn `node.exe` PID `19424` nghe cổng `3000`; đã dừng bằng `MSYS_NO_PATHCONV=1 taskkill.exe /PID 19424 /T /F`. Sau đó không còn listener `LISTENING` trên `3000` hoặc `5432`; các dòng còn lại chỉ là `TIME_WAIT`.

## Retest sau khi thêm `src/app/field/vehicles/layout.tsx` — 2026-09-23

- Không sửa source production hoặc file test. Không chạy code-review.
- Database được clean đúng **một lần ở đầu task**; không reset giữa các nhóm/file test.

### Database clean một lần và counts

Lệnh thực thi:

```text
docker info
docker compose down -v
docker compose up -d postgres
powershell.exe -NoProfile -Command '$ErrorActionPreference="Stop"; $ready=$false; for($i=0;$i -lt 30;$i++){ docker.exe compose exec -T postgres pg_isready -U civicos -d civicos *> $null; if($LASTEXITCODE -eq 0){$ready=$true; break}; Start-Sleep -Seconds 1 }; if(-not $ready){ throw "PostgreSQL did not become ready" }'
npx.cmd prisma migrate deploy
docker compose exec -T postgres psql -U civicos -d civicos -c 'SELECT current_database(), (SELECT count(*) FROM "User") AS users, (SELECT count(*) FROM "Role") AS roles, (SELECT count(*) FROM "OrganizationUnit") AS organization_units;'
```

Raw pre-seed count sau clean/migrate:

```text
 current_database | users | roles | organization_units
------------------+-------+-------+--------------------
 civicos          |     0 |     8 |                  0
(1 row)
```

`prisma migrate deploy` raw kết thúc bằng:

```text
11 migrations found in prisma/migrations
All migrations have been successfully applied.
```

Các test login đã kích hoạt development seed. Count xác nhận sau toàn bộ Playwright run (không clean/reset lại):

```text
 current_database | users | roles | organization_units
------------------+-------+-------+--------------------
 civicos          |    11 |     8 |                  2
(1 row)
```

### Kết quả kiểm tra

`module-shell.spec.ts` desktop + mobile:

```text
npx.cmd playwright test tests/e2e/module-shell.spec.ts --project=chromium --project=mobile
Running 28 tests using 1 worker
2 skipped
26 passed (2.2m)
```

PASS. Các assertion direct-link server denial cho `/identity`, `/users`, `/assignments`, `/incidents`, `/inspections/establishments`, `/vehicles/registry`, `/field/vehicles`; logged-out behavior; desktop/mobile shell, keyboard focus và mobile drawer focus đều nằm trong run và pass.

`login-and-access.spec.ts` desktop + mobile:

```text
npx.cmd playwright test tests/e2e/login-and-access.spec.ts --project=chromium --project=mobile
Running 18 tests using 1 worker
18 passed (49.0s)
```

PASS.

Regression trực tiếp + field-shell + parallel-wave:

```text
npx.cmd playwright test tests/e2e/ps005-incident.spec.ts tests/e2e/ps007-inspection.spec.ts tests/e2e/ps009-vehicle-watch.spec.ts tests/e2e/field-shell.spec.ts tests/e2e/parallel-wave.spec.ts tests/e2e/parallel-wave-read-model.spec.ts --project=chromium --project=mobile
Running 78 tests using 1 worker
8 failed
70 passed (12.1m)
```

PASS riêng: `field-shell.spec.ts` 14/14; các test trực tiếp `ps005`, `ps007`, `ps009` 32/32; registry read-model test 2/2; các test parallel-wave còn lại pass.

FAIL 8 ca, cùng lỗi raw:

```text
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

1. Chromium và mobile — `tests/e2e/parallel-wave-read-model.spec.ts:43:5`, `intake report created in UI appears in incident list and detail read model`:

```text
Call Log:
- Timeout 90000ms exceeded while waiting on the predicate
```

Tái hiện: project `chromium` hoặc `mobile`; đăng nhập `trucban@civicos.local` / `civicos-dev`; mở `/intake`; nhập `Nội dung tin báo` với `Read model intake <randomUUID>`; bấm `Tạo Incident`; chờ POST `/api/intake-reports` status 201 và điều hướng `/incidents/<incidentId>`; logout; đăng nhập `truong@civicos.local`; poll GET `/api/incidents` trong 90000ms để tìm đúng `incidentId`. Mong đợi: predicate tìm thấy ID trong `body.incidents`. Thực tế: predicate vẫn `false` sau 90000ms; error context hiển thị trang `/` của commander với heading `Một nơi để biết việc gì đang xảy ra.`.

2. Chromium và mobile — `tests/e2e/parallel-wave-read-model.spec.ts:98:5`, `establishment and inspection created in UI appear in catalog and detail read model`:

```text
Call Log:
- Timeout 90000ms exceeded while waiting on the predicate
```

Tái hiện: project `chromium` hoặc `mobile`; đăng nhập `truong@civicos.local` / `civicos-dev`; mở `/inspections/establishments`; nhập tên `Read model cơ sở <randomUUID>`, chủ, địa chỉ, `Karaoke`, mã giấy phép `GP-RM-<8 chars>`; bấm `Tạo cơ sở`; poll GET `/api/establishments` trong 90000ms để tìm establishment ID. Mong đợi: predicate tìm thấy ID. Thực tế: predicate vẫn `false` sau 90000ms; error context hiển thị `/inspections/establishments`, status `Đã tạo cơ sở.`, nhưng vẫn `Chưa có cơ sở kinh doanh trong danh mục.` và combobox `Cơ sở` chỉ có option `Chọn cơ sở`.

3. Chromium và mobile — `tests/e2e/parallel-wave.spec.ts:203:5`, `three operational surfaces have no horizontal overflow and no clipped actions`:

```text
Error: expect(received).toBe(expected) // Object.is equality
Expected: true
Received: false
```

Tái hiện: project `chromium` hoặc `mobile`; đăng nhập `truong@civicos.local` / `civicos-dev`; POST `/api/intake-reports` với `channel=in_person`, `receivedAt=<current ISO>`, content `Parallel wave layout <timestamp>`, header `Idempotency-Key=parallel-wave-<timestamp>-<random>`. Mong đợi: `response.ok()` là `true` để duyệt các URL `/intake`, `/incidents`, `/incidents/<id>`, `/inspections/establishments`, `/vehicles/registry`, `/field/vehicles`, `/field/offline` và kiểm tra overflow/clipped actions. Thực tế: `response.ok()` là `false` tại `tests/e2e/parallel-wave.spec.ts:35`; error context hiển thị trang `/` với trạng thái `Đang kiểm tra phiên…`.

4. Chromium và mobile — `tests/e2e/parallel-wave.spec.ts:605:5`, `401 and 403 authorization matrix covers five principals across three surfaces`:

```text
Error: expect(received).toBe(expected) // Object.is equality
Expected: true
Received: false
```

Tái hiện: project `chromium` hoặc `mobile`; đăng nhập `truong@civicos.local` / `civicos-dev`; POST `/api/intake-reports` với cùng shape `in_person`/`receivedAt`/content và idempotency key `parallel-wave-<timestamp>-<random>`. Mong đợi: `response.ok()` là `true` để tạo incident trước ma trận 401/403 cho năm principal trên ba surface. Thực tế: `response.ok()` là `false` tại `tests/e2e/parallel-wave.spec.ts:35`; error context hiển thị trang `/` với trạng thái `Đang kiểm tra phiên…`.

### Typecheck, lint, format-check

```text
npx.cmd tsc --noEmit
(no output; PASS)

npx.cmd eslint .
(no output; PASS)

npx.cmd prettier --check src/app/assignments/page.tsx src/app/field/vehicles/page.tsx src/app/field/vehicles/layout.tsx src/app/incidents/page.tsx src/app/incidents/layout.tsx src/app/inspections/establishments/page.tsx src/app/inspections/layout.tsx src/app/vehicles/registry/page.tsx src/app/vehicles/layout.tsx src/app/identity src/app/users/page.tsx src/components/navigation src/components/shell tests/e2e/module-shell.spec.ts
Checking formatting...
All matched files use Prettier code style!
```

PASS cả ba loại kiểm tra.

### Cleanup / trục trặc

- Sau khi kiểm tra, `docker compose down` đã dừng PostgreSQL. Kiểm tra cổng cuối: không còn `LISTENING` trên `3000` hoặc `5432`; chỉ còn các dòng `TIME_WAIT` của cổng 3000.
- Trong lần gọi này có một lỗi tooling khi đọc file do cung cấp path malformed; đã đọc lại bằng workspace root chính xác, không ảnh hưởng kiểm tra. Việc cập nhật `Lesson-learned.md` bị harness permission chặn; mục tương tự **Tool path preflight** đã tồn tại sẵn trong file.
## Verification cuối phiên — 2026-09-23

- Không sửa source production hoặc file test; không chạy code-review.
- Database được clean đúng **một lần ở đầu task**, không reset giữa các lệnh test.

### Database clean một lần

Lệnh: `docker.exe info`; `docker.exe compose down -v`; `docker.exe compose up -d postgres`; chờ `pg_isready -U civicos -d civicos`; `npx.cmd prisma migrate deploy`.

Docker preflight xác nhận `Context: desktop-linux`, `Server: Docker Desktop`.

Migration raw result: `11 migrations found in prisma/migrations`; `All migrations have been successfully applied.`

Raw counts sau clean/migrate: tất cả 27 bảng có `n_live_tup = 0`, ngoại trừ `Role = 8` (migration seed) và `_prisma_migrations = 11`; `User = 0`, `UserRole = 0`, `OrganizationUnit = 0`, cùng toàn bộ bảng domain/test đều `0`.

### Unit/integration — `npm test`

```text
Test Files 1 failed | 27 passed | 13 skipped (41)
Tests 2 failed | 110 passed | 155 skipped (267)
```

Raw failures:

```text
FAIL tests/integration/schema-and-migration.test.ts > database migration contract > applies Event kernel, Identity, platform, PS-E1-005, PS-E1-007 and PS-E1-009 migrations in dependency order
AssertionError: expected [ '0001_event_first', …(10) ] to deeply equal [ '0001_event_first', …(8) ]
Received extra migrations: "20260922092751_civicos", "20260922_identity_role_catalog"

FAIL tests/integration/schema-and-migration.test.ts > database migration contract > keeps every migration additive with no destructive SQL
AssertionError: expected 'DROP INDEX "ChecklistTemplate_establi…' to match /IF\s+EXISTS/i
Received: "DROP INDEX \"ChecklistTemplate_establishmentType_version_active_idx\""
```

### E2E — `npm run test:e2e -- --project=chromium --project=mobile`

```text
Running 130 tests using 1 worker
12 failed
2 skipped
116 passed (15.2m)
```

Ticket 06 module-shell coverage passed trên Chromium và mobile; desktop-only test skip đúng project.

Raw failure groups, mỗi nhóm trên cả `chromium` và `mobile`:

1. `tests/e2e/evidence-authorization.spec.ts:49` và `:140`: login `/login` bằng `truong@civicos.local`/`civicos-dev`, multipart POST `/api/evidence`; mong đợi `201`, thực tế `403`.
2. `tests/e2e/parallel-wave-read-model.spec.ts:43` và `:98`: tạo dữ liệu qua UI rồi poll GET list endpoint trong 90 giây; mong đợi tìm thấy ID mới, thực tế predicate vẫn `false`.
3. `tests/e2e/parallel-wave.spec.ts:203` và `:605`: login `truong@civicos.local`, POST `/api/intake-reports` với `channel: 'in_person'`, `receivedAt` ISO và idempotency key; mong đợi `response.ok()` true, thực tế false.

Nguyên văn lỗi:

```text
Error: expect(received).toBe(expected) // Object.is equality
Expected: 201
Received: 403
      64 |     }),
      65 |   });
    > 66 |   expect(upload.status()).toBe(201);
      66 |                           ^

Error: expect(received).toBe(expected) // Object.is equality
Expected: true
Received: false

Call Log:
- Timeout 90000ms exceeded while waiting on the predicate

Error: expect(received).toBe(expected) // Object.is equality
Expected: true
Received: false
      33 |     },
      34 |   });
    > 35 |   expect(response.ok()).toBe(true);
      35 |                         ^
```

### Typecheck / lint

- `npm run typecheck` — **PASS**, không có output lỗi.
- `npm run lint` — **PASS**, không có output lỗi.

### Format-check

`npm run format:check` — **FAIL**, 13 file ngoài phạm vi ticket 06:

```text
[warn] Lesson-learned.md
[warn] src/components/incidents/IncidentStatusActions.tsx
[warn] src/components/incidents/IntakeReportForm.tsx
[warn] src/components/incidents/useIncidentSession.ts
[warn] src/modules/identity/assignments.ts
[warn] src/modules/identity/contracts.ts
[warn] src/modules/incidents/commands.ts
[warn] src/modules/incidents/domain.ts
[warn] tests/e2e/ps005-incident.spec.ts
[warn] tests/identity/capability-policy.test.ts
[warn] tests/incidents/incident-approval.postgres.test.ts
[warn] tests/incidents/incident-authorization.postgres.test.ts
[warn] tests/integration/parallel-wave-replay.integration.test.ts
[warn] Code style issues found in 13 files. Run Prettier with --write to fix.
```

### Cleanup / trục trặc

- Cuối task đã chạy `docker.exe compose down`; không còn listener `LISTENING` trên `:3000` hoặc `:5432` sau khi relay thoát; chỉ còn `TIME_WAIT` trên `:3000` ở lần kiểm tra đầu.
- Một truy vấn count PostgreSQL đầu tiên bị shell quote tách sai, sinh `psql: warning: extra command-line argument ...` và `ERROR: unterminated quoted identifier`; không dùng kết quả đó. Đã chạy lại bằng truy vấn quote-safe.
- Đã đọc `Lesson-learned.md`; mục **Native Windows env propagation** đã có bài học tương tự. Không thể cập nhật mục này vì harness chặn edit ngoài `.brain/evidence/**`.
