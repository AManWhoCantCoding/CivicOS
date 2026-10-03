# Evidence kiểm tra — civicos-ui-design-system-phase-04

## Lần chạy 1 — 2026-10-03T09:49:52.440Z (only=prisma:generate,typecheck,lint,test,test:e2e,build)

- HEAD: bd73d49 | file chưa commit: 59 | Tree: b7546d9a
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | SKIPPED | - |
| typecheck | `npm run typecheck` | PASS | 4.7s |
| lint | `npm run lint` | PASS | 24.3s |
| test | `npm run test` | FAIL | - |
| test:e2e | `npm run test:e2e` | FAIL | - |
| build | `npm run build` | PASS | 17.5s |

### Lỗi: test

Log đầy đủ: `.brain/evidence/civicos-ui-design-system-phase-04/logs/run1-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
Không khởi động được backend (npm run dev) hoặc health-check http://localhost:3000/health không phản hồi trong 30000ms.
````

### Lỗi: test:e2e

Log đầy đủ: `.brain/evidence/civicos-ui-design-system-phase-04/logs/run1-test_e2e.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
Không khởi động được backend (npm run dev) hoặc health-check http://localhost:3000/health không phản hồi trong 30000ms.
````

## Lần chạy 2 — 2026-10-03T09:53:06.852Z (only=prisma:generate,typecheck,lint,test,test:e2e,build)

- HEAD: bd73d49 | file chưa commit: 61 | Tree: b7546d9a
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | SKIPPED | - |
| typecheck | `npm run typecheck` | PASS | 4.7s |
| lint | `npm run lint` | PASS | 24.1s |
| test | `npm run test` | PASS | 83.8s |
| test:e2e | `npm run test:e2e` | FAIL | 1.6s |
| build | `npm run build` | PASS | 15.8s |

### Lỗi: test:e2e

Log đầy đủ: `.brain/evidence/civicos-ui-design-system-phase-04/logs/run2-test_e2e.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text

> civic-os@0.1.0 test:e2e
> playwright test


Error: http://localhost:3001 is already used, make sure that nothing is running on the port/url or set reuseExistingServer:true in config.webServer.
````

## Lần chạy 3 — 2026-10-03T09:58:15.354Z (only=prisma:generate,typecheck,lint,test,test:e2e,build)

- HEAD: bd73d49 | file chưa commit: 61 | Tree: b7546d9a
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | SKIPPED | - |
| typecheck | `npm run typecheck` | PASS | 4.3s |
| lint | `npm run lint` | PASS | 23.3s |
| test | `npm run test` | PASS | 83.5s |
| test:e2e | `npm run test:e2e` | PASS | 147.4s |
| build | `npm run build` | PASS | 17.5s |

## Lần chạy 4 — 2026-10-03T09:58:44.731Z (scope=mobile)

- HEAD: bd73d49 | file chưa commit: 61 | Tree: b7546d9a
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| mobile:typecheck | `npm run mobile:typecheck` | PASS | 3.8s |
| mobile:test | `npm run mobile:test` | PASS | 3.7s |
| mobile:build | `npm run mobile:build` | PASS | 8.0s |

## Lần chạy 5 — 2026-10-03T10:08:05.956Z (only=prisma:generate,typecheck,lint,test,test:e2e,build)

- HEAD: 5878d6f | file chưa commit: 63 | Tree: b7546d9a
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | SKIPPED | - |
| typecheck | `npm run typecheck` | PASS | 4.5s |
| lint | `npm run lint` | PASS | 25.3s |
| test | `npm run test` | PASS | 85.3s |
| test:e2e | `npm run test:e2e` | PASS | 147.8s |
| build | `npm run build` | PASS | 17.6s |

## Lần chạy 6 — 2026-10-03T10:08:36.613Z (scope=mobile)

- HEAD: 5878d6f | file chưa commit: 65 | Tree: b7546d9a
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| mobile:typecheck | `npm run mobile:typecheck` | PASS | 3.9s |
| mobile:test | `npm run mobile:test` | PASS | 3.7s |
| mobile:build | `npm run mobile:build` | PASS | 7.7s |
