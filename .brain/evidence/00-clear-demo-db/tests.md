# Evidence kiểm tra — 00-clear-demo-db

## Lần chạy 1 — 2026-09-28T06:25:27.229Z (scope=full)

- HEAD: 6b711ee | file chưa commit: 46 | Tree: fd88257c
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 3.2s |
| typecheck | `npm run typecheck` | FAIL | 9.7s |
| lint | `npm run lint` | NOT_RUN | - |
| format:check | `npm run format:check` | NOT_RUN | - |
| test | `npm run test` | NOT_RUN | - |
| test:e2e | `npm run test:e2e` | NOT_RUN | - |
| build | `npm run build` | NOT_RUN | - |

### Lỗi: typecheck

Log đầy đủ: `.brain/evidence/00-clear-demo-db/logs/run1-typecheck.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text

> civic-os@0.1.0 typecheck
> tsc --noEmit

tests/integration/demo-seed-reset.integration.test.ts(131,41): error TS2322: Type 'Promise<number>' is not assignable to type 'Promise<void>'.
  Type 'number' is not assignable to type 'void'.
````

## Lần chạy 2 — 2026-09-28T06:32:40.541Z (scope=fast)

- HEAD: 6b711ee | file chưa commit: 46 | Tree: bc35f9fa
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | SKIPPED | - |
| typecheck | `npm run typecheck` | PASS | 6.6s |
| lint | `npm run lint` | PASS | 23.0s |
| format:check | `npm run format:check` | FAIL | 23.6s |
| test | `npm run test` | NOT_RUN | - |

### Lỗi: format:check

Log đầy đủ: `.brain/evidence/00-clear-demo-db/logs/run2-format_check.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text

> civic-os@0.1.0 format:check
> prettier --check .

Checking formatting...

All matched files use Prettier code style!

--- stderr ---
[error] Unable to read file ".codegraph/codegraph.lock":
[error] ENOENT: no such file or directory, open 'D:\Project\CivicOS\.codegraph\codegraph.lock'
````

## Lần chạy 3 — 2026-09-28T06:47:20.680Z (only=format:check)

- HEAD: 6b711ee | file chưa commit: 57 | Tree: 1cd6ce7b
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| format:check | `npm run format:check` | PASS | 20.9s |

## Lần chạy 4 — 2026-09-28T06:51:40.300Z (scope=fast)

- HEAD: 6b711ee | file chưa commit: 57 | Tree: 1cd6ce7b
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | SKIPPED | - |
| typecheck | `npm run typecheck` | PASS | 6.6s |
| lint | `npm run lint` | PASS | 14.8s |
| format:check | `npm run format:check` | PASS | 19.1s |
| test | `npm run test` | FAIL | 98.6s |

### Lỗi: test

Log đầy đủ: `.brain/evidence/00-clear-demo-db/logs/run4-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
warning: in the working copy of 'tests/tooling/mobile-build-boundary.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/annotations/markerview/': Filename too long
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/annotations/pointannotation/': Filename too long
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/sources/tilesources/rasterdemsource/': Filename too long
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/sources/tilesources/rastersource/': Filename too long
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/sources/tilesources/vectorsource/': Filename too long
warning: in the working copy of '.brain/evidence/02-ps-e1004-resident-management/review.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/03-ps-e1005-intake-report/changes.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/03-ps-e1005-intake-report/logs/e2e-read-model-http.jsonl', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/03-ps-e1005-intake-report/logs/e2e-read-model-trace.jsonl', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/03-ps-e1005-intake-report/plan.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05-mobile-readonly-client/review.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05a-mobile-build-boundary-fix/review.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05a-mobile-build-boundary-fix/tests.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05b-mobile-gradle-repository-mode-fix/review.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05d-verifier-tree-fingerprint-generated-artifacts/review.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05e-verifier-tree-fingerprint-build-checkpoint/review.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05e-verifier-tree-fingerprint-build-checkpoint/tests.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.prettierignore', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.scratch/civicos-e1-clone-mvp/issues/05d-verifier-tree-fingerprint-generated-artifacts.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'Lesson-learned.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'next-env.d.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'scripts/demo/demo-db.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'scripts/demo/reset.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'scripts/demo/seed.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'scripts/verify.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/modules/incidents/commands.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/modules/incidents/contracts.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/modules/incidents/index.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/modules/incidents/projection.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/modules/platform/evidence/storage-adapter.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/modules/residents/commands.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/modules/residents/contracts.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/modules/residents/index.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/modules/residents/projection.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/modules/residents/seed.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'tests/demo/demo-bootstrap.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'tests/tooling/mobile-build-boundary.test.ts', LF will be replaced by CRLF the next time Git touches it

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/demo/demo-bootstrap.test.ts > demo target binding > tu choi raw DEMO_DATABASE_URL sai du DATABASE_URL dung
AssertionError: expected [Function] to throw an error

- Expected: 
null

+ Received: 
undefined

 ❯ tests/demo/demo-bootstrap.test.ts:83:7
     81|         'postgresql://civicos:civicos@localhost:5432/civicos?schema=pu…
     82|       ),
     83|     ).toThrow('DEMO_RESET_REFUSED');
       |       ^
     84|   });
     85| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯
````

## Lần chạy 5 — 2026-09-28T06:59:29.994Z (scope=fast)

- HEAD: 6b711ee | file chưa commit: 57 | Tree: 4fe60e70
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | SKIPPED | - |
| typecheck | `npm run typecheck` | PASS | 3.7s |
| lint | `npm run lint` | PASS | 17.2s |
| format:check | `npm run format:check` | PASS | 23.6s |
| test | `npm run test` | PASS | 83.3s |

## Lần chạy 6 — 2026-09-28T07:07:04.059Z (scope=full)

- HEAD: 6b711ee | file chưa commit: 57 | Tree: 77b2d001
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | SKIPPED | - |
| typecheck | `npm run typecheck` | PASS | 3.4s |
| lint | `npm run lint` | PASS | 16.8s |
| format:check | `npm run format:check` | PASS | 23.5s |
| test | `npm run test` | PASS | 88.8s |
| test:e2e | `npm run test:e2e` | PASS | 171.6s |
| build | `npm run build` | PASS | 19.8s |

## Lần chạy 7 — 2026-09-28T07:36:48.721Z (scope=fast)

- HEAD: 6b711ee | file chưa commit: 56 | Tree: d664c35f
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | SKIPPED | - |
| typecheck | `npm run typecheck` | PASS | 5.5s |
| lint | `npm run lint` | PASS | 20.6s |
| format:check | `npm run format:check` | PASS | 23.2s |
| test | `npm run test` | FAIL | 64.5s |

### Lỗi: test

Log đầy đủ: `.brain/evidence/00-clear-demo-db/logs/run7-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
warning: in the working copy of '.brain/evidence/05e-verifier-tree-fingerprint-build-checkpoint/tests.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.prettierignore', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.scratch/civicos-e1-clone-mvp/issues/05d-verifier-tree-fingerprint-generated-artifacts.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'Lesson-learned.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'next-env.d.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'scripts/demo/demo-db.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'scripts/demo/reset.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'scripts/demo/seed.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'scripts/verify.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/modules/incidents/commands.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/modules/incidents/contracts.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/modules/incidents/index.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/modules/incidents/projection.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/modules/platform/evidence/storage-adapter.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/modules/residents/commands.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/modules/residents/contracts.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/modules/residents/index.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/modules/residents/projection.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/modules/residents/seed.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'tests/demo/demo-bootstrap.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'tests/tooling/mobile-build-boundary.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/annotations/markerview/': Filename too long
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/annotations/pointannotation/': Filename too long
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/sources/tilesources/rasterdemsource/': Filename too long
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/sources/tilesources/rastersource/': Filename too long
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/sources/tilesources/vectorsource/': Filename too long
warning: in the working copy of '.brain/evidence/02-ps-e1004-resident-management/review.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/03-ps-e1005-intake-report/changes.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/03-ps-e1005-intake-report/logs/e2e-read-model-http.jsonl', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/03-ps-e1005-intake-report/logs/e2e-read-model-trace.jsonl', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/03-ps-e1005-intake-report/plan.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05-mobile-readonly-client/review.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05a-mobile-build-boundary-fix/review.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05a-mobile-build-boundary-fix/tests.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05b-mobile-gradle-repository-mode-fix/review.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05d-verifier-tree-fingerprint-generated-artifacts/review.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05e-verifier-tree-fingerprint-build-checkpoint/review.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05e-verifier-tree-fingerprint-build-checkpoint/tests.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.prettierignore', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.scratch/civicos-e1-clone-mvp/issues/05d-verifier-tree-fingerprint-generated-artifacts.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'Lesson-learned.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'next-env.d.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'scripts/demo/demo-db.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'scripts/demo/reset.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'scripts/demo/seed.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'scripts/verify.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/modules/incidents/commands.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/modules/incidents/contracts.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/modules/incidents/index.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/modules/incidents/projection.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/modules/platform/evidence/storage-adapter.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/modules/residents/commands.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/modules/residents/contracts.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/modules/residents/index.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/modules/residents/projection.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/modules/residents/seed.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'tests/demo/demo-bootstrap.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'tests/tooling/mobile-build-boundary.test.ts', LF will be replaced by CRLF the next time Git touches it
````

## Lần chạy 8 — 2026-09-28T07:53:00.246Z (scope=fast)

- HEAD: 6b711ee | file chưa commit: 57 | Tree: d664c35f
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | SKIPPED | - |
| typecheck | `npm run typecheck` | PASS | 5.2s |
| lint | `npm run lint` | PASS | 19.4s |
| format:check | `npm run format:check` | PASS | 24.2s |
| test | `npm run test` | PASS | 87.2s |

## Lần chạy 9 — 2026-09-28T08:01:12.653Z (scope=full)

- HEAD: 6b711ee | file chưa commit: 57 | Tree: 41f3a71b
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | SKIPPED | - |
| typecheck | `npm run typecheck` | PASS | 3.6s |
| lint | `npm run lint` | PASS | 17.7s |
| format:check | `npm run format:check` | PASS | 28.2s |
| test | `npm run test` | PASS | 88.2s |
| test:e2e | `npm run test:e2e` | PASS | 164.9s |
| build | `npm run build` | PASS | 42.2s |

## Lần chạy 10 — 2026-09-28T08:11:12.837Z (only=test filter="tests/integration/demo-seed-reset.integration.test.ts")

- HEAD: 6b711ee | file chưa commit: 56 | Tree: d664c35f
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| test | `npm run test` | PASS | 9.0s |

## Lần chạy 11 — 2026-09-28T08:20:45.074Z (scope=full)

- HEAD: 6b711ee | file chưa commit: 57 | Tree: d664c35f
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | SKIPPED | - |
| typecheck | `npm run typecheck` | PASS | 4.0s |
| lint | `npm run lint` | PASS | 71.5s |
| format:check | `npm run format:check` | PASS | 24.2s |
| test | `npm run test` | FAIL | 324.9s |
| test:e2e | `npm run test:e2e` | NOT_RUN | - |
| build | `npm run build` | NOT_RUN | - |

### Lỗi: test

Log đầy đủ: `.brain/evidence/00-clear-demo-db/logs/run11-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
    2768|         );

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[25/29]⎯

 FAIL  tests/integration/parallel-wave.integration.test.ts > PS-E1-009 VehicleObservation and registry integration > projects and replays the vehicle read models deterministically
Error: Test timed out in 60000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
 ❯ tests/integration/parallel-wave.integration.test.ts:2830:5
    2828|     );
    2829| 
    2830|     it(
       |     ^
    2831|       'projects and replays the vehicle read models deterministically',
    2832|       { timeout: 60000 },

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[26/29]⎯

 FAIL  tests/platform/sla.integration.test.ts > continuous SLA clock > persists one overdue transition and emits notification only after outbox processing
Error: Test timed out in 5000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
 ❯ tests/platform/sla.integration.test.ts:65:29
     63|   });
     64| 
     65|   it.skipIf(!postgresEnabled)(
       |                             ^
     66|     'persists one overdue transition and emits notification only after…
     67|     async () => {

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[27/29]⎯

 FAIL  tests/platform/sla.integration.test.ts > continuous SLA clock > retries a failed outbox consumer exactly once and exposes lag/error health
AssertionError: expected +0 to be 1 // Object.is equality

- Expected
+ Received

- 1
+ 0

 ❯ tests/platform/sla.integration.test.ts:149:33
    147|         });
    148|         expect(failed.status).toBe('pending');
    149|         expect(failed.attempts).toBe(1);
       |                                 ^
    150|         expect(failed.lastError).toBe('PROBE_CONSUMER_FAILURE');
    151|         expect(successes).toBe(0);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[28/29]⎯

 FAIL  tests/vehicles/vehicle-authorization.postgres.test.ts > ticket 05 vehicle authorization matrix > denies commander fieldwork while keeping assignment-free command-scope read
AssertionError: expected [ 'cmug2w5m700wxwi9024vstbpd', …(192) ] to include 'cmukz8eka004zwinspoldz5q5'
 ❯ tests/vehicles/vehicle-authorization.postgres.test.ts:667:9
    665|       expect(
    666|         listed.map((item) => String((item as { id: string }).id)),
    667|       ).toContain(observation.id);
       |         ^
    668|     },
    669|   );

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[29/29]⎯
````

## Lần chạy 12 — 2026-09-28T08:29:57.824Z (scope=full)

- HEAD: 6b711ee | file chưa commit: 57 | Tree: 41f3a71b
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | SKIPPED | - |
| typecheck | `npm run typecheck` | PASS | 4.4s |
| lint | `npm run lint` | PASS | 18.5s |
| format:check | `npm run format:check` | PASS | 24.4s |
| test | `npm run test` | PASS | 86.5s |
| test:e2e | `npm run test:e2e` | FAIL | 177.6s |
| build | `npm run build` | NOT_RUN | - |

### Lỗi: test:e2e

Log đầy đủ: `.brain/evidence/00-clear-demo-db/logs/run12-test_e2e.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
        at D:\Project\CivicOS\tests\e2e\ps009-vehicle-watch.spec.ts:345:22

    Error Context: test-results\ps009-vehicle-watch-PS-009-a903e-ication-and-escalation-flow-chromium\error-context.md

  4 failed
    [chromium] › tests\e2e\ps005-incident.spec.ts:250:5 › [Web] field officer verifies and requests a transfer 
    [chromium] › tests\e2e\ps005-incident.spec.ts:274:5 › [Web] commander approves a transfer request 
    [chromium] › tests\e2e\ps005-incident.spec.ts:371:5 › [Web] closed incident timeline lists every lifecycle event 
    [chromium] › tests\e2e\ps009-vehicle-watch.spec.ts:98:5 › PS-009 registry, observation, confirmation, verification and escalation flow 
  1 skipped
  87 passed (2.9m)

--- stderr ---
[WebServer] (node:19620) [DEP0190] DeprecationWarning: Passing args to a child process with shell option true can lead to security vulnerabilities, as the arguments are not escaped, only concatenated.
[WebServer] (Use `node --trace-deprecation ...` to show where the warning was created)
[WebServer] Environment variables loaded from .env
[WebServer] (node:25500) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:25500) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:17944) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:16656) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:23908) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:24216) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:21004) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:23520) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:25432) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:24552) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:23788) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:344) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:21960) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:24436) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:13488) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:7756) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:21304) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
(node:428) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:22732) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:24308) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:17060) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:24108) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
````

## Lần chạy 13 — 2026-09-28T08:36:48.963Z (scope=full)

- HEAD: 6b711ee | file chưa commit: 56 | Tree: 41f3a71b
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | SKIPPED | - |
| typecheck | `npm run typecheck` | PASS | 4.2s |
| lint | `npm run lint` | PASS | 19.7s |
| format:check | `npm run format:check` | PASS | 30.5s |
| test | `npm run test` | PASS | 81.8s |
| test:e2e | `npm run test:e2e` | FAIL | 170.5s |
| build | `npm run build` | NOT_RUN | - |

### Lỗi: test:e2e

Log đầy đủ: `.brain/evidence/00-clear-demo-db/logs/run13-test_e2e.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
        at D:\Project\CivicOS\tests\e2e\ps009-vehicle-watch.spec.ts:345:22

    Error Context: test-results\ps009-vehicle-watch-PS-009-a903e-ication-and-escalation-flow-chromium\error-context.md

  4 failed
    [chromium] › tests\e2e\ps005-incident.spec.ts:250:5 › [Web] field officer verifies and requests a transfer 
    [chromium] › tests\e2e\ps005-incident.spec.ts:274:5 › [Web] commander approves a transfer request 
    [chromium] › tests\e2e\ps005-incident.spec.ts:371:5 › [Web] closed incident timeline lists every lifecycle event 
    [chromium] › tests\e2e\ps009-vehicle-watch.spec.ts:98:5 › PS-009 registry, observation, confirmation, verification and escalation flow 
  1 skipped
  87 passed (2.8m)

--- stderr ---
[WebServer] (node:7444) [DEP0190] DeprecationWarning: Passing args to a child process with shell option true can lead to security vulnerabilities, as the arguments are not escaped, only concatenated.
[WebServer] (Use `node --trace-deprecation ...` to show where the warning was created)
[WebServer] Environment variables loaded from .env
[WebServer] (node:19620) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:19620) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:14316) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:22692) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:1656) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:4928) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:20248) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:23548) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:1804) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:20888) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:24740) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:10272) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:4664) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:19116) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:23288) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:25464) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:4924) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
(node:25404) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:14448) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:23840) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:10096) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:25128) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
````

## Lần chạy 14 — 2026-09-28T08:45:13.299Z (only=test:e2e filter="tests/e2e/ps005-incident.spec.ts")

- HEAD: 6b711ee | file chưa commit: 56 | Tree: 41f3a71b
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| test:e2e | `npm run test:e2e` | FAIL | 98.5s |

### Lỗi: test:e2e

Log đầy đủ: `.brain/evidence/00-clear-demo-db/logs/run14-test_e2e.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
          |                                                            ^
      401 |     timeout: 15000,
      402 |   });
      403 |   await logout(page);
        at D:\Project\CivicOS\tests\e2e\ps005-incident.spec.ts:400:60

    Error Context: test-results\ps005-incident--Web-closed-c73a8-lists-every-lifecycle-event-chromium\error-context.md

  3 failed
    [chromium] › tests\e2e\ps005-incident.spec.ts:250:5 › [Web] field officer verifies and requests a transfer 
    [chromium] › tests\e2e\ps005-incident.spec.ts:274:5 › [Web] commander approves a transfer request 
    [chromium] › tests\e2e\ps005-incident.spec.ts:371:5 › [Web] closed incident timeline lists every lifecycle event 
  24 passed (1.6m)

--- stderr ---
[WebServer] (node:3424) [DEP0190] DeprecationWarning: Passing args to a child process with shell option true can lead to security vulnerabilities, as the arguments are not escaped, only concatenated.
[WebServer] (Use `node --trace-deprecation ...` to show where the warning was created)
[WebServer] Environment variables loaded from .env
[WebServer] (node:25020) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:25020) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:20424) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:5528) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:21700) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:13592) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:5940) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:7336) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:2640) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:20776) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:22224) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:24824) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:24136) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:22700) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:19712) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:2128) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:14772) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
(node:20168) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:5132) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:14516) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:8820) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
````

## Lần chạy 15 — 2026-09-28T08:55:08.647Z (scope=full)

- HEAD: 6b711ee | file chưa commit: 56 | Tree: 41f3a71b
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | SKIPPED | - |
| typecheck | `npm run typecheck` | PASS | 3.9s |
| lint | `npm run lint` | PASS | 15.2s |
| format:check | `npm run format:check` | PASS | 20.2s |
| test | `npm run test` | PASS | 84.1s |
| test:e2e | `npm run test:e2e` | FAIL | 169.7s |
| build | `npm run build` | NOT_RUN | - |

### Lỗi: test:e2e

Log đầy đủ: `.brain/evidence/00-clear-demo-db/logs/run15-test_e2e.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
        at D:\Project\CivicOS\tests\e2e\ps009-vehicle-watch.spec.ts:345:22

    Error Context: test-results\ps009-vehicle-watch-PS-009-a903e-ication-and-escalation-flow-chromium\error-context.md

  4 failed
    [chromium] › tests\e2e\ps005-incident.spec.ts:250:5 › [Web] field officer verifies and requests a transfer 
    [chromium] › tests\e2e\ps005-incident.spec.ts:274:5 › [Web] commander approves a transfer request 
    [chromium] › tests\e2e\ps005-incident.spec.ts:371:5 › [Web] closed incident timeline lists every lifecycle event 
    [chromium] › tests\e2e\ps009-vehicle-watch.spec.ts:98:5 › PS-009 registry, observation, confirmation, verification and escalation flow 
  1 skipped
  87 passed (2.8m)

--- stderr ---
[WebServer] (node:17944) [DEP0190] DeprecationWarning: Passing args to a child process with shell option true can lead to security vulnerabilities, as the arguments are not escaped, only concatenated.
[WebServer] (Use `node --trace-deprecation ...` to show where the warning was created)
[WebServer] Environment variables loaded from .env
[WebServer] (node:25192) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:25192) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:21004) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:24084) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:6704) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:25032) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:16392) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:7536) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:23876) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:2772) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:6492) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:4420) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:19620) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:22536) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:3208) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:23056) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:23648) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
(node:18756) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:25044) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:14724) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:25436) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:22532) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
````

## Lần chạy 16 — 2026-09-28T09:27:21.699Z (scope=full)

- HEAD: 6b711ee | file chưa commit: 56 | Tree: 41f3a71b
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | SKIPPED | - |
| typecheck | `npm run typecheck` | PASS | 4.6s |
| lint | `npm run lint` | PASS | 18.6s |
| format:check | `npm run format:check` | PASS | 24.3s |
| test | `npm run test` | PASS | 87.2s |
| test:e2e | `npm run test:e2e` | FAIL | 130.7s |
| build | `npm run build` | NOT_RUN | - |

### Lỗi: test:e2e

Log đầy đủ: `.brain/evidence/00-clear-demo-db/logs/run16-test_e2e.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
    Received: false

      228 |   await page.getByRole('button', { name: 'Hoàn tất' }).click();
      229 |   const completeResponse = await completeResponsePromise;
    > 230 |   expect(completeResponse.ok()).toBe(true);
          |                                 ^
      231 |   const completeBody = (await completeResponse.json()) as {
      232 |     command?: { status?: string };
      233 |   };
        at D:\Project\CivicOS\tests\e2e\ps007-inspection.spec.ts:230:33

    Error Context: test-results\ps007-inspection-establish-cdf43--without-automatic-sanction-chromium\error-context.md

  1 failed
    [chromium] › tests\e2e\ps007-inspection.spec.ts:91:5 › establishment-to-approval lifecycle runs through the browser without automatic sanction 
  1 skipped
  90 passed (2.2m)

--- stderr ---
[WebServer] (node:24472) [DEP0190] DeprecationWarning: Passing args to a child process with shell option true can lead to security vulnerabilities, as the arguments are not escaped, only concatenated.
[WebServer] (Use `node --trace-deprecation ...` to show where the warning was created)
[WebServer] Environment variables loaded from .env
[WebServer] (node:17204) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:17204) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:24292) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:23668) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:5140) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:25532) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:18592) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:22448) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:8004) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:22608) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:24348) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:20048) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:24112) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:16688) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:24124) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:22976) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:22868) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
(node:2100) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:420) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
````

## Lần chạy 17 — 2026-09-28T09:49:31.143Z (scope=full)

- HEAD: 6b711ee | file chưa commit: 58 | Tree: a1c37038
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | SKIPPED | - |
| typecheck | `npm run typecheck` | PASS | 6.2s |
| lint | `npm run lint` | PASS | 72.1s |
| format:check | `npm run format:check` | FAIL | 30.6s |
| test | `npm run test` | NOT_RUN | - |
| test:e2e | `npm run test:e2e` | NOT_RUN | - |
| build | `npm run build` | NOT_RUN | - |

### Lỗi: format:check

Log đầy đủ: `.brain/evidence/00-clear-demo-db/logs/run17-format_check.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text

> civic-os@0.1.0 format:check
> prettier --check .

Checking formatting...

--- stderr ---
[warn] mobile/android/app/.cxx/Debug/6r3s5s1q/arm64-v8a/.cmake/api/v1/reply/index-2026-09-28T09-23-58-0498.json
[warn] mobile/android/app/.cxx/Debug/6r3s5s1q/arm64-v8a/android_gradle_build_mini.json
[warn] mobile/android/app/.cxx/Debug/6r3s5s1q/arm64-v8a/android_gradle_build.json
[warn] mobile/android/app/.cxx/Debug/6r3s5s1q/arm64-v8a/compile_commands.json
[warn] mobile/android/app/.cxx/Debug/6r3s5s1q/arm64-v8a/prefab_config.json
[warn] mobile/android/app/.cxx/Debug/6r3s5s1q/armeabi-v7a/.cmake/api/v1/reply/index-2026-09-28T09-24-01-0667.json
[warn] mobile/android/app/.cxx/Debug/6r3s5s1q/armeabi-v7a/android_gradle_build_mini.json
[warn] mobile/android/app/.cxx/Debug/6r3s5s1q/armeabi-v7a/android_gradle_build.json
[warn] mobile/android/app/.cxx/Debug/6r3s5s1q/armeabi-v7a/compile_commands.json
[warn] mobile/android/app/.cxx/Debug/6r3s5s1q/armeabi-v7a/prefab_config.json
[warn] mobile/android/app/.cxx/Debug/6r3s5s1q/x86_64/.cmake/api/v1/reply/index-2026-09-28T09-24-07-0323.json
[warn] mobile/android/app/.cxx/Debug/6r3s5s1q/x86_64/android_gradle_build_mini.json
[warn] mobile/android/app/.cxx/Debug/6r3s5s1q/x86_64/android_gradle_build.json
[warn] mobile/android/app/.cxx/Debug/6r3s5s1q/x86_64/compile_commands.json
[warn] mobile/android/app/.cxx/Debug/6r3s5s1q/x86_64/prefab_config.json
[warn] mobile/android/app/.cxx/Debug/6r3s5s1q/x86/.cmake/api/v1/reply/index-2026-09-28T09-24-04-0402.json
[warn] mobile/android/app/.cxx/Debug/6r3s5s1q/x86/android_gradle_build_mini.json
[warn] mobile/android/app/.cxx/Debug/6r3s5s1q/x86/android_gradle_build.json
[warn] mobile/android/app/.cxx/Debug/6r3s5s1q/x86/compile_commands.json
[warn] mobile/android/app/.cxx/Debug/6r3s5s1q/x86/prefab_config.json
[warn] mobile/android/app/.cxx/tools/debug/arm64-v8a/compile_commands.json
[warn] mobile/android/app/.cxx/tools/debug/armeabi-v7a/compile_commands.json
[warn] mobile/android/app/.cxx/tools/debug/x86_64/compile_commands.json
[warn] mobile/android/app/.cxx/tools/debug/x86/compile_commands.json
[warn] mobile/android/app/build/intermediates/annotation_processor_list/debug/javaPreCompileDebug/annotationProcessors.json
[warn] mobile/android/app/build/intermediates/compatible_screen_manifest/debug/createDebugCompatibleScreenManifests/output-metadata.json
[warn] mobile/android/app/build/intermediates/cxx/Debug/6r3s5s1q/logs/arm64-v8a/build_model.json
[warn] mobile/android/app/build/intermediates/cxx/Debug/6r3s5s1q/logs/arm64-v8a/metadata_generation_record.json
[warn] mobile/android/app/build/intermediates/cxx/Debug/6r3s5s1q/logs/armeabi-v7a/build_model.json
[warn] mobile/android/app/build/intermediates/cxx/Debug/6r3s5s1q/logs/armeabi-v7a/metadata_generation_record.json
[warn] mobile/android/app/build/intermediates/cxx/Debug/6r3s5s1q/logs/x86_64/build_model.json
[warn] mobile/android/app/build/intermediates/cxx/Debug/6r3s5s1q/logs/x86_64/metadata_generation_record.json
[warn] mobile/android/app/build/intermediates/cxx/Debug/6r3s5s1q/logs/x86/build_model.json
[warn] mobile/android/app/build/intermediates/cxx/Debug/6r3s5s1q/logs/x86/metadata_generation_record.json
[warn] mobile/android/app/build/intermediates/linked_resources_binary_format/debug/processDebugResources/output-metadata.json
[warn] mobile/android/app/build/intermediates/merged_manifests/debug/processDebugManifest/output-metadata.json
[warn] mobile/android/app/build/intermediates/navigation_json/debug/extractDeepLinksDebug/navigation.json
[warn] mobile/android/app/build/intermediates/packaged_manifests/debug/processDebugManifestForPackage/output-metadata.json
[warn] mobile/android/app/build/intermediates/signing_config_versions/debug/writeDebugSigningConfigVersions/signing-config-versions.json
[warn] mobile/android/app/build/outputs/apk/debug/output-metadata.json
[warn] mobile/android/build/reports/problems/problems-report.html
[warn] scripts/oc.mjs
[warn] scripts/verify.mjs
[warn] Code style issues found in 43 files. Run Prettier with --write to fix.
````

## Lần chạy 18 — 2026-09-28T11:57:34.733Z (only=format:check)

- HEAD: 6b711ee | file chưa commit: 59 | Tree: eacaa061
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| format:check | `npm run format:check` | PASS | 20.3s |

## Lần chạy 19 — 2026-09-28T12:06:38.022Z (scope=full)

- HEAD: 6b711ee | file chưa commit: 59 | Tree: eacaa061
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | SKIPPED | - |
| typecheck | `npm run typecheck` | PASS | 5.6s |
| lint | `npm run lint` | PASS | 72.8s |
| format:check | `npm run format:check` | PASS | 24.0s |
| test | `npm run test` | PASS | 125.9s |
| test:e2e | `npm run test:e2e` | FAIL | 162.9s |
| build | `npm run build` | NOT_RUN | - |

### Lỗi: test:e2e

Log đầy đủ: `.brain/evidence/00-clear-demo-db/logs/run19-test_e2e.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text

    Error Context: test-results\ps007-inspection-establish-cdf43--without-automatic-sanction-chromium\error-context.md

  1 failed
    [chromium] › tests\e2e\ps007-inspection.spec.ts:91:5 › establishment-to-approval lifecycle runs through the browser without automatic sanction 
  1 skipped
  90 passed (2.7m)

--- stderr ---
[WebServer] (node:16572) [DEP0190] DeprecationWarning: Passing args to a child process with shell option true can lead to security vulnerabilities, as the arguments are not escaped, only concatenated.
[WebServer] (Use `node --trace-deprecation ...` to show where the warning was created)
[WebServer] Environment variables loaded from .env
[WebServer] ┌─────────────────────────────────────────────────────────┐
[WebServer] │  Update available 6.19.3 -> 8.0.0-rc.17                 │
[WebServer] │                                                         │
[WebServer] │  This is a major update - please follow the guide at    │
[WebServer] │  https://pris.ly/d/major-version-upgrade                │
[WebServer] │                                                         │
[WebServer] │  Run the following to update                            │
[WebServer] │    npm i --save-dev prisma@latest                       │
[WebServer] │    npm i @prisma/client@latest                          │
[WebServer] └─────────────────────────────────────────────────────────┘
[WebServer] (node:3860) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:3860) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:15044) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:7716) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:1864) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:10628) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:14068) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:1856) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:6384) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:10480) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:15852) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:1344) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:2116) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:9628) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:18908) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:18888) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:19012) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
(node:19292) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:7188) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
````

## Lần chạy 20 — 2026-09-28T12:34:12.003Z (only=test filter="tests/demo/demo-bootstrap.test.ts --testTimeout 30000 --hookTimeout 30000")

- HEAD: 6b711ee | file chưa commit: 61 | Tree: 6ffd8357
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| test | `npm run test` | PASS | 1.7s |

## Lần chạy 21 — 2026-09-28T12:34:50.471Z (only=test filter="tests/integration/demo-seed-reset.integration.test.ts --testTimeout 30000 --hookTimeout 30000")

- HEAD: 6b711ee | file chưa commit: 62 | Tree: 6ffd8357
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| test | `npm run test` | PASS | 4.0s |
