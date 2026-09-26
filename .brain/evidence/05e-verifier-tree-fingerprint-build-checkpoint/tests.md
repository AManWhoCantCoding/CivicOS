# Evidence kiểm tra — 05e-verifier-tree-fingerprint-build-checkpoint

## Lần chạy 1 — 2026-09-26T17:11:33.960Z (scope=full)

- HEAD: 55cfe22 | file chưa commit: 65 | Tree: ee1434ee
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | FAIL | 3.0s |
| typecheck | `npm run typecheck` | NOT_RUN | - |
| lint | `npm run lint` | NOT_RUN | - |
| format:check | `npm run format:check` | NOT_RUN | - |
| test | `npm run test` | NOT_RUN | - |
| test:e2e | `npm run test:e2e` | NOT_RUN | - |
| build | `npm run build` | NOT_RUN | - |

### Lỗi: prisma:generate

Log đầy đủ: `.brain/evidence/05e-verifier-tree-fingerprint-build-checkpoint/logs/run1-prisma_generate.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text

> civic-os@0.1.0 prisma:generate
> prisma generate

Prisma schema loaded from prisma\schema.prisma

--- stderr ---
Environment variables loaded from .env
Error: 
EPERM: operation not permitted, rename 'D:\Project\CivicOS\node_modules\.prisma\client\query_engine-windows.dll.node.tmp8452' -> 'D:\Project\CivicOS\node_modules\.prisma\client\query_engine-windows.dll.node'
````

## Lần chạy 2 — 2026-09-26T17:15:18.607Z (scope=fast)

- HEAD: 55cfe22 | file chưa commit: 65 | Tree: d3916842
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.0s |
| typecheck | `npm run typecheck` | PASS | 3.5s |
| lint | `npm run lint` | PASS | 17.9s |
| format:check | `npm run format:check` | PASS | 21.7s |
| test | `npm run test` | FAIL | 41.6s |

### Lỗi: test

Log đầy đủ: `.brain/evidence/05e-verifier-tree-fingerprint-build-checkpoint/logs/run2-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads counts, incidents, alarms, dispatches, tasks, and the task alias
TypeError: fetch failed
{
  stack: 'AggregateError: \n' +
    '    at internalConnectMultiple (node:net:1194:18)\n' +
    '    at afterConnectMultiple (node:net:1784:7)',
  errors: [
    {
      stack: 'Error: connect ECONNREFUSED 127.0.0.1:3000\n' +
        '    at createConnectionError (node:net:1747:14)\n' +
        '    at afterConnectMultiple (node:net:1777:16)',
      message: 'connect ECONNREFUSED 127.0.0.1:3000',
      errno: -4078,
      code: 'ECONNREFUSED',
      syscall: 'connect',
      address: '127.0.0.1',
      port: 3000,
      constructor: 'Function<Error>',
      name: 'Error',
      toString: 'Function<toString>'
    },
    {
      stack: 'Error: connect ECONNREFUSED ::1:3000\n' +
        '    at createConnectionError (node:net:1747:14)\n' +
        '    at afterConnectMultiple (node:net:1777:16)',
      message: 'connect ECONNREFUSED ::1:3000',
      errno: -4078,
      code: 'ECONNREFUSED',
      syscall: 'connect',
      address: '::1',
      port: 3000,
      constructor: 'Function<Error>',
      name: 'Error',
      toString: 'Function<toString>'
    }
  ],
  code: 'ECONNREFUSED',
  message: '',
  constructor: 'Function<AggregateError>',
  name: 'Caused by: AggregateError',
  toString: 'Function<toString>',
  stacks: []
}
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errors: [ { stack: 'Error: connect ECONNREFUSED 127.0.0.1:3000\n    at createConnectionError (node:net:1747:14)\n    at afterConnectMultiple (node:net:1777:16)', message: 'connect ECONNREFUSED 127.0.0.1:3000', errno: -4078, code: 'ECONNREFUSED', syscall: 'connect', address: '127.0.0.1', port: 3000, constructor: 'Function<Error>', name: 'Error', toString: 'Function<toString>' }, { stack: 'Error: connect ECONNREFUSED ::1:3000\n    at createConnectionError (node:net:1747:14)\n    at afterConnectMultiple (node:net:1777:16)', message: 'connect ECONNREFUSED ::1:3000', errno: -4078, code: 'ECONNREFUSED', syscall: 'connect', address: '::1', port: 3000, constructor: 'Function<Error>', name: 'Error', toString: 'Function<toString>' } ], code: 'ECONNREFUSED' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/7]⎯

 FAIL  tests/tooling/verify-tree-fingerprint.test.ts > verify tree fingerprint > keeps Tree stable across the real native build lifecycle
Error: spawnSync git ENOBUFS
 ❯ gitLines tests/tooling/verify-tree-fingerprint.test.ts:83:10
     81| 
     82| function gitLines(args: string[]): string[] {
     83|   return execFileSync('git', args, {
       |          ^
     84|     cwd: root,
     85|     encoding: 'utf8',
 ❯ inventory tests/tooling/verify-tree-fingerprint.test.ts:108:5
 ❯ tests/tooling/verify-tree-fingerprint.test.ts:204:20

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/7]⎯
````

## Lần chạy 3 — 2026-09-26T17:20:47.937Z (scope=fast)

- HEAD: 55cfe22 | file chưa commit: 67 | Tree: 76fa3754
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.0s |
| typecheck | `npm run typecheck` | PASS | 3.5s |
| lint | `npm run lint` | PASS | 16.3s |
| format:check | `npm run format:check` | PASS | 21.7s |
| test | `npm run test` | FAIL | 45.8s |

### Lỗi: test

Log đầy đủ: `.brain/evidence/05e-verifier-tree-fingerprint-build-checkpoint/logs/run3-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
 ↓ tests/eventing/projection-replay.postgres.test.ts (1 test | 1 skipped)
 ↓ tests/identity/health-worker-access.integration.test.ts (5 tests | 5 skipped)
 ↓ tests/identity/migration-rollback.integration.test.ts (2 tests | 2 skipped)
 ↓ tests/identity/user-screen-access.integration.test.ts (3 tests | 3 skipped)
 ↓ tests/incidents/incident-approval.postgres.test.ts (3 tests | 3 skipped)
 ↓ tests/incidents/incident-authorization.postgres.test.ts (12 tests | 12 skipped)
 ↓ tests/incidents/intake-report-separation.postgres.test.ts (16 tests | 16 skipped)
 ↓ tests/inspections/inspection-schedule.postgres.test.ts (2 tests | 2 skipped)
 ↓ tests/inspections/inspection-slices-4-6.postgres.test.ts (10 tests | 10 skipped)
 ↓ tests/inspections/inspection-stats.postgres.test.ts (2 tests | 2 skipped)
 ↓ tests/integration/parallel-wave-authorization.integration.test.ts (4 tests | 4 skipped)
 ↓ tests/integration/parallel-wave-resilience.integration.test.ts (4 tests | 4 skipped)
 ↓ tests/vehicles/vehicle-watch-slices-4-7.postgres.test.ts (11 tests | 11 skipped)
 ↓ tests/residents/resident-scope-regression.postgres.test.ts (5 tests | 5 skipped)
 ↓ tests/residents/resident-workflow.postgres.test.ts (8 tests | 8 skipped)

 Test Files  1 failed | 50 passed | 17 skipped (68)
      Tests  1 failed | 236 passed | 191 skipped (428)
   Start at  00:20:03
   Duration  44.52s (transform 1.46s, setup 0ms, collect 8.34s, tests 18.09s, environment 16ms, prepare 6.99s)


--- stderr ---
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/annotations/markerview/': Filename too long
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/annotations/pointannotation/': Filename too long
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/sources/tilesources/rasterdemsource/': Filename too long
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/sources/tilesources/rastersource/': Filename too long
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/sources/tilesources/vectorsource/': Filename too long
warning: in the working copy of '.brain/evidence/03-ps-e1005-intake-report/logs/e2e-read-model-http.jsonl', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/03-ps-e1005-intake-report/logs/e2e-read-model-trace.jsonl', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05-mobile-readonly-client/plan.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05-mobile-readonly-client/review.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05a-mobile-build-boundary-fix/review.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05a-mobile-build-boundary-fix/tests.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05b-mobile-gradle-repository-mode-fix/review.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05d-verifier-tree-fingerprint-generated-artifacts/review.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.scratch/civicos-e1-clone-mvp/issues/05-mobile-readonly-client.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.scratch/civicos-e1-clone-mvp/issues/05d-verifier-tree-fingerprint-generated-artifacts.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'Lesson-learned.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'mobile/src/features/__tests__/deepLinks.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'mobile/src/features/__tests__/navigation-readonly.test.tsx', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'mobile/src/test-globals.d.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'next-env.d.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'scripts/verify.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'tests/tooling/mobile-build-boundary.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'tests/tooling/verify-tree-fingerprint.test.ts', LF will be replaced by CRLF the next time Git touches it

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/tooling/verify-tree-fingerprint.test.ts > verify tree fingerprint > keeps Tree stable across the real native build lifecycle
Error: spawnSync npm.cmd EINVAL
 ❯ tests/tooling/verify-tree-fingerprint.test.ts:208:5
    206|     const base = runTree();
    207|     expect(base).toMatch(/^Tree: [0-9a-f]{8}$/);
    208|     execFileSync(
       |     ^
    209|       process.platform === 'win32' ? 'npm.cmd' : 'npm',
    210|       ['run', 'mobile:build'],

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯
````

## Lần chạy 4 — 2026-09-26T17:27:35.751Z (scope=fast)

- HEAD: 55cfe22 | file chưa commit: 67 | Tree: dd3ea4e6
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | FAIL | 2.0s |
| typecheck | `npm run typecheck` | NOT_RUN | - |
| lint | `npm run lint` | NOT_RUN | - |
| format:check | `npm run format:check` | NOT_RUN | - |
| test | `npm run test` | NOT_RUN | - |

### Lỗi: prisma:generate

Log đầy đủ: `.brain/evidence/05e-verifier-tree-fingerprint-build-checkpoint/logs/run4-prisma_generate.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text

> civic-os@0.1.0 prisma:generate
> prisma generate

Prisma schema loaded from prisma\schema.prisma

--- stderr ---
Environment variables loaded from .env
Error: 
EPERM: operation not permitted, rename 'D:\Project\CivicOS\node_modules\.prisma\client\query_engine-windows.dll.node.tmp2160' -> 'D:\Project\CivicOS\node_modules\.prisma\client\query_engine-windows.dll.node'
````

## Lần chạy 5 — 2026-09-26T17:36:11.662Z (scope=fast)

- HEAD: 55cfe22 | file chưa commit: 67 | Tree: dd3ea4e6
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.0s |
| typecheck | `npm run typecheck` | PASS | 3.3s |
| lint | `npm run lint` | PASS | 17.4s |
| format:check | `npm run format:check` | PASS | 21.8s |
| test | `npm run test` | FAIL | 66.8s |

### Lỗi: test

Log đầy đủ: `.brain/evidence/05e-verifier-tree-fingerprint-build-checkpoint/logs/run5-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/annotations/pointannotation/': Filename too long
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/sources/tilesources/rasterdemsource/': Filename too long
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/sources/tilesources/rastersource/': Filename too long
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/sources/tilesources/vectorsource/': Filename too long
warning: in the working copy of '.brain/evidence/03-ps-e1005-intake-report/logs/e2e-read-model-http.jsonl', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/03-ps-e1005-intake-report/logs/e2e-read-model-trace.jsonl', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05-mobile-readonly-client/plan.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05-mobile-readonly-client/review.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05a-mobile-build-boundary-fix/review.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05a-mobile-build-boundary-fix/tests.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05b-mobile-gradle-repository-mode-fix/review.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05d-verifier-tree-fingerprint-generated-artifacts/review.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.scratch/civicos-e1-clone-mvp/issues/05-mobile-readonly-client.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.scratch/civicos-e1-clone-mvp/issues/05d-verifier-tree-fingerprint-generated-artifacts.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'Lesson-learned.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'mobile/src/features/__tests__/deepLinks.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'mobile/src/features/__tests__/navigation-readonly.test.tsx', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'mobile/src/test-globals.d.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'next-env.d.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'scripts/verify.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'tests/tooling/mobile-build-boundary.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'tests/tooling/verify-tree-fingerprint.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/annotations/markerview/': Filename too long
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/annotations/pointannotation/': Filename too long
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/sources/tilesources/rasterdemsource/': Filename too long
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/sources/tilesources/rastersource/': Filename too long
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/sources/tilesources/vectorsource/': Filename too long
warning: in the working copy of '.brain/evidence/03-ps-e1005-intake-report/logs/e2e-read-model-http.jsonl', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/03-ps-e1005-intake-report/logs/e2e-read-model-trace.jsonl', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05-mobile-readonly-client/plan.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05-mobile-readonly-client/review.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05a-mobile-build-boundary-fix/review.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05a-mobile-build-boundary-fix/tests.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05b-mobile-gradle-repository-mode-fix/review.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05d-verifier-tree-fingerprint-generated-artifacts/review.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.scratch/civicos-e1-clone-mvp/issues/05-mobile-readonly-client.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.scratch/civicos-e1-clone-mvp/issues/05d-verifier-tree-fingerprint-generated-artifacts.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'Lesson-learned.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'mobile/src/features/__tests__/deepLinks.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'mobile/src/features/__tests__/navigation-readonly.test.tsx', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'mobile/src/test-globals.d.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'next-env.d.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'scripts/verify.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'tests/tooling/mobile-build-boundary.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'tests/tooling/verify-tree-fingerprint.test.ts', LF will be replaced by CRLF the next time Git touches it

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/tooling/verify-tree-fingerprint.test.ts > verify tree fingerprint > keeps Tree stable across the real native build lifecycle
Error: Test timed out in 5000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
 ❯ tests/tooling/verify-tree-fingerprint.test.ts:204:3
    202|   });
    203| 
    204|   it('keeps Tree stable across the real native build lifecycle', () =>…
       |   ^
    205|     const before = inventory();
    206|     const base = runTree();

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯
````

## Lần chạy 6 — 2026-09-26T17:45:30.577Z (scope=fast)

- HEAD: 55cfe22 | file chưa commit: 67 | Tree: caa07e58
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 3.3s |
| typecheck | `npm run typecheck` | PASS | 3.7s |
| lint | `npm run lint` | PASS | 17.9s |
| format:check | `npm run format:check` | PASS | 21.8s |
| test | `npm run test` | PASS | 68.2s |

## Lần chạy 7 — 2026-09-26T17:52:06.099Z (scope=full)

- HEAD: 55cfe22 | file chưa commit: 68 | Tree: b5098e3e
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.6s |
| typecheck | `npm run typecheck` | PASS | 3.7s |
| lint | `npm run lint` | PASS | 17.8s |
| format:check | `npm run format:check` | PASS | 21.9s |
| test | `npm run test` | PASS | 68.2s |
| test:e2e | `npm run test:e2e` | PASS | 142.8s |
| build | `npm run build` | PASS | 12.7s |

## Lần chạy 8 — 2026-09-26T17:54:34.080Z (scope=mobile)

- HEAD: 55cfe22 | file chưa commit: 67 | Tree: b5098e3e
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| mobile:typecheck | `npm run mobile:typecheck` | PASS | 4.1s |
| mobile:test | `npm run mobile:test` | PASS | 17.6s |
| mobile:build | `npm run mobile:build` | PASS | 7.0s |

## Lần chạy 9 — 2026-09-26T19:01:37.289Z (only=test)

- HEAD: 55cfe22 | file chưa commit: 67 | Tree: e81315aa
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| test | `npm run test` | FAIL | 411.3s |

### Lỗi: test

Log đầy đủ: `.brain/evidence/05e-verifier-tree-fingerprint-build-checkpoint/logs/run9-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
+   if (r.out) writeFileSync(logPath(name), r.out);
+   results.push(r);
+   if (r.status === 'FAIL' && !keepGoing) halted = true;
+ }
+
+ const has = (s) => results.some((r) => r.status === s);
+ const overall = has('FAIL')
+   ? 'FAIL'
+   : has('MISSING') || has('NOT_RUN')
+     ? 'INCOMPLETE'
+     : 'PASS';
+ const label =
+   (only ? `only=${only}` : `scope=${scope}`) +
+   (filter ? ` filter="${filter}"` : '');
+ const F = '````';
+
+ let md =
+   `${prev ? '\n' : `# Evidence kiểm tra — ${ticket}\n\n`}` +
+   `## Lần chạy ${run} — ${new Date().toISOString()} (${label})\n\n` +
+   `- HEAD: ${head} | file chưa commit: ${dirty} | Tree: ${tree}\n` +
+   `- Kết quả: **${overall}**\n\n| Bước | Lệnh | Kết quả | Thời gian |\n|---|---|---|---|\n` +
+   results
+     .map(
+       (r) =>
+         `| ${r.name} | \`npm run ${r.name}\` | ${r.status} | ${r.ms ? secs(r.ms) : '-'} |`,
+     )
+     .join('\n') +
+   '\n';
+ for (const r of results.filter((x) => x.status === 'FAIL')) {
+   md +=
+     `\n### Lỗi: ${r.name}\n\nLog đầy đủ: \`${logPath(r.name)}\`. ${tail} dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):\n\n` +
+     `${F}text\n${lastLines(r.out, tail)}\n${F}\n`;
+ }
+ writeFileSync(testsPath, prev + md);
+
+ const lines = [
+   `verify ${ticket} · lần ${run} · ${label} · HEAD ${head} · Tree ${tree}`,
+ ];
+ for (const r of results) {
+   lines.push(
+     `${r.status.padEnd(8)} ${r.name.padEnd(16)} ${r.ms ? secs(r.ms) : r.status === 'MISSING' ? '(không có trong package.json)' : ''}`.trimEnd(),
+   );
+ }
+ for (const r of results.filter((x) => x.status === 'FAIL').slice(0, 2)) {
+   lines.push(`--- ${r.name}: 15 dòng cuối ---`, lastLines(r.out, 15));
+ }
+ lines.push(`RESULT: ${overall}`, `Evidence: ${testsPath}`);
+ console.log(lines.join('\n'));
+ process.exit(overall === 'PASS' ? 0 : overall === 'FAIL' ? 1 : 2);
+

 ❯ tests/tooling/verify-tree-fingerprint.test.ts:366:20
    364|     expect(source).toContain('isExcluded(f) || isGeneratedArtifact(f)'…
    365|     expect(source).toContain('tree = treeFingerprint();');
    366|     expect(source).toContain('h.update(readFileSync(f));');
       |                    ^
    367|     expect(source.split('isGeneratedArtifact')).toHaveLength(3);
    368|     const imports = [

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/9]⎯
````

## Lần chạy 10 — 2026-09-26T19:10:59.348Z (only=test)

- HEAD: 55cfe22 | file chưa commit: 67 | Tree: a9fbc0c6
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| test | `npm run test` | FAIL | 50.5s |

### Lỗi: test

Log đầy đủ: `.brain/evidence/05e-verifier-tree-fingerprint-build-checkpoint/logs/run10-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 7 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads layers from the real backend contract
Error: CIVICOS_API_BASE_URL is required for the HTTP contract test
 ❯ get tests/mobile/readonly-http.contract.test.ts:7:11
      5| async function get(path: string): Promise<Response> {
      6|   if (!baseUrl)
      7|     throw new Error(
       |           ^
      8|       'CIVICOS_API_BASE_URL is required for the HTTP contract test',
      9|     );
 ❯ tests/mobile/readonly-http.contract.test.ts:15:28

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/7]⎯

 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo RESIDENT from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo BUSINESS from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo HOTSPOT from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo VIOLATION from the real backend contract
Error: CIVICOS_API_BASE_URL is required for the HTTP contract test
 ❯ get tests/mobile/readonly-http.contract.test.ts:7:11
      5| async function get(path: string): Promise<Response> {
      6|   if (!baseUrl)
      7|     throw new Error(
       |           ^
      8|       'CIVICOS_API_BASE_URL is required for the HTTP contract test',
      9|     );
 ❯ tests/mobile/readonly-http.contract.test.ts:26:30

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/7]⎯

 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads counts, incidents, alarms, dispatches, tasks, and the task alias
Error: CIVICOS_API_BASE_URL is required for the HTTP contract test
 ❯ get tests/mobile/readonly-http.contract.test.ts:7:11
      5| async function get(path: string): Promise<Response> {
      6|   if (!baseUrl)
      7|     throw new Error(
       |           ^
      8|       'CIVICOS_API_BASE_URL is required for the HTTP contract test',
      9|     );
 ❯ tests/mobile/readonly-http.contract.test.ts:63:47

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/7]⎯

 FAIL  tests/tooling/verify-tree-fingerprint.test.ts > verify tree fingerprint > keeps Tree sensitive to native config content
AssertionError: expected 'Tree: 95940a76' to be 'Tree: a9fbc0c6' // Object.is equality

Expected: "Tree: a9fbc0c6"
Received: "Tree: 95940a76"

 ❯ tests/tooling/verify-tree-fingerprint.test.ts:330:25
    328|       }
    329|       expect(readFileSync(config, 'utf8')).toBe(original);
    330|       expect(runTree()).toBe(base);
       |                         ^
    331|     }
    332|   });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/7]⎯
````

## Lần chạy 11 — 2026-09-26T19:22:34.961Z (only=test)

- HEAD: 55cfe22 | file chưa commit: 67 | Tree: d6beb416
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| test | `npm run test` | FAIL | 349.4s |

### Lỗi: test

Log đầy đủ: `.brain/evidence/05e-verifier-tree-fingerprint-build-checkpoint/logs/run11-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
       |           ^
      8|       'CIVICOS_API_BASE_URL is required for the HTTP contract test',
      9|     );
 ❯ tests/mobile/readonly-http.contract.test.ts:63:47

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/15]⎯

 FAIL  tests/tooling/verify-tree-fingerprint.test.ts > verify tree fingerprint > keeps profile Tree equal to standalone Tree across the real build
Error: Test timed out in 300000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
 ❯ tests/tooling/verify-tree-fingerprint.test.ts:287:3
    285|   }, 180000);
    286| 
    287|   it('keeps profile Tree equal to standalone Tree across the real buil…
       |   ^
    288|     const probeDir = path.dirname(checkpointProbe);
    289|     const before = inventory();

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/15]⎯

 FAIL  tests/tooling/verify-tree-fingerprint.test.ts > verify tree fingerprint > keeps profile Tree equal to standalone Tree across the real build
 FAIL  tests/tooling/verify-tree-fingerprint.test.ts > verify tree fingerprint > changes Tree for untracked source outside build
 FAIL  tests/tooling/verify-tree-fingerprint.test.ts > verify tree fingerprint > changes Tree for tracked config edit
 FAIL  tests/tooling/verify-tree-fingerprint.test.ts > verify tree fingerprint > keeps Tree sensitive to native config content
 FAIL  tests/tooling/verify-tree-fingerprint.test.ts > verify tree fingerprint > ignores generated mtime-only changes but keeps content changes visible
 FAIL  tests/tooling/verify-tree-fingerprint.test.ts > verify tree fingerprint > keeps verifier selection behavior via --check
 FAIL  tests/tooling/verify-tree-fingerprint.test.ts > verify tree fingerprint > limits fingerprint change to generated build output
AssertionError: expected true to be false // Object.is equality

- Expected
+ Received

- false
+ true

 ❯ tests/tooling/verify-tree-fingerprint.test.ts:173:41
    171|     expect(existsSync(artifactCxx)).toBe(false);
    172|     expect(existsSync(probeOutsideBuild)).toBe(false);
    173|     expect(existsSync(checkpointProbe)).toBe(false);
       |                                         ^
    174|   });
    175| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/15]⎯

 FAIL  tests/tooling/verify-tree-fingerprint.test.ts > verify tree fingerprint > keeps Tree sensitive to native config content
AssertionError: expected 'Tree: f21b5a8a' to be 'Tree: 129f4b0f' // Object.is equality

Expected: "Tree: 129f4b0f"
Received: "Tree: f21b5a8a"

 ❯ tests/tooling/verify-tree-fingerprint.test.ts:445:25
    443|       }
    444|       expect(readFileSync(config, 'utf8')).toBe(original);
    445|       expect(runTree()).toBe(base);
       |                         ^
    446|     }
    447|   });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/15]⎯
````

## Lần chạy 12 — 2026-09-26T19:27:53.589Z (only=test)

- HEAD: 55cfe22 | file chưa commit: 68 | Tree: bc0a02de
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| test | `npm run test` | FAIL | 58.8s |

### Lỗi: test

Log đầy đủ: `.brain/evidence/05e-verifier-tree-fingerprint-build-checkpoint/logs/run12-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
      6|   if (!baseUrl)
      7|     throw new Error(
       |           ^
      8|       'CIVICOS_API_BASE_URL is required for the HTTP contract test',
      9|     );
 ❯ tests/mobile/readonly-http.contract.test.ts:63:47

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/10]⎯

 FAIL  tests/tooling/verify-tree-fingerprint.test.ts > verify tree fingerprint > keeps Tree stable when generated artifacts appear and change
 FAIL  tests/tooling/verify-tree-fingerprint.test.ts > verify tree fingerprint > keeps Tree stable across the real native build lifecycle
AssertionError: expected true to be false // Object.is equality

- Expected
+ Received

- false
+ true

 ❯ tests/tooling/verify-tree-fingerprint.test.ts:173:41
    171|     expect(existsSync(artifactCxx)).toBe(false);
    172|     expect(existsSync(probeOutsideBuild)).toBe(false);
    173|     expect(existsSync(checkpointProbe)).toBe(false);
       |                                         ^
    174|   });
    175| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/10]⎯

 FAIL  tests/tooling/verify-tree-fingerprint.test.ts > verify tree fingerprint > keeps profile Tree equal to standalone Tree across the real build
AssertionError: expected 'Tree: 7175ea1d' to be 'Tree: a6721eab' // Object.is equality

Expected: "Tree: a6721eab"
Received: "Tree: 7175ea1d"

 ❯ tests/tooling/verify-tree-fingerprint.test.ts:408:26
    406|         ).toBe(true);
    407|       }
    408|       expect(standalone).toBe(profileTree);
       |                          ^
    409|     } finally {
    410|       clearInterval(ticker);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/10]⎯

 FAIL  tests/tooling/verify-tree-fingerprint.test.ts > verify tree fingerprint > keeps Tree sensitive to native config content
AssertionError: expected 'Tree: c2a01f8e' to be 'Tree: 0ee5632d' // Object.is equality

Expected: "Tree: 0ee5632d"
Received: "Tree: c2a01f8e"

 ❯ tests/tooling/verify-tree-fingerprint.test.ts:478:25
    476|       }
    477|       expect(readFileSync(config, 'utf8')).toBe(original);
    478|       expect(runTree()).toBe(base);
       |                         ^
    479|     }
    480|   });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/10]⎯
````

### Bằng chứng native build trước target equality

Log đầy đủ: `.brain/evidence/05e-verifier-tree-fingerprint-build-checkpoint/logs/run12-test.log`.

Trích nguyên văn:

````text
verify 05e-verifier-tree-fingerprint-build-checkpoint · lần 12 · only=mobile:build · HEAD 55cfe22 · Tree a6721eab
PASS     mobile:build     5.6s
RESULT: PASS
checkpoint-profile Tree: Tree: a6721eab
checkpoint-standalone Tree: Tree: 7175ea1d
FAIL  tests/tooling/verify-tree-fingerprint.test.ts > verify tree fingerprint > keeps profile Tree equal to standalone Tree across the real build
AssertionError: expected 'Tree: 7175ea1d' to be 'Tree: a6721eab' // Object.is equality
  ❯ tests/tooling/verify-tree-fingerprint.test.ts:408:26
    406|         ).toBe(true);
    407|       }
    408|       expect(standalone).toBe(profileTree);
````

Native `--only=mobile:build` đã PASS trước khi target equality FAIL vì `standalone === profileTree`; hai Tree khác nhau: `Tree: 7175ea1d` và `Tree: a6721eab`.

## Lần chạy 13 — 2026-09-26T19:41:05.652Z (only=mobile:build)

- HEAD: 55cfe22 | file chưa commit: 69 | Tree: 7fc44539
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| mobile:build | `npm run mobile:build` | PASS | 5.8s |

## Lần chạy 14 — 2026-09-26T19:43:44.880Z (scope=full)

- HEAD: 55cfe22 | file chưa commit: 68 | Tree: 13178a56
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.0s |
| typecheck | `npm run typecheck` | PASS | 3.8s |
| lint | `npm run lint` | PASS | 16.2s |
| format:check | `npm run format:check` | PASS | 22.2s |
| test | `npm run test` | FAIL | 72.8s |
| test:e2e | `npm run test:e2e` | NOT_RUN | - |
| build | `npm run build` | NOT_RUN | - |

### Lỗi: test

Log đầy đủ: `.brain/evidence/05e-verifier-tree-fingerprint-build-checkpoint/logs/run14-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
warning: in the working copy of '.brain/evidence/05-mobile-readonly-client/plan.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05-mobile-readonly-client/review.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05a-mobile-build-boundary-fix/review.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05a-mobile-build-boundary-fix/tests.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05b-mobile-gradle-repository-mode-fix/review.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05d-verifier-tree-fingerprint-generated-artifacts/review.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.scratch/civicos-e1-clone-mvp/issues/05-mobile-readonly-client.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.scratch/civicos-e1-clone-mvp/issues/05d-verifier-tree-fingerprint-generated-artifacts.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'Lesson-learned.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'mobile/src/features/__tests__/deepLinks.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'mobile/src/features/__tests__/navigation-readonly.test.tsx', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'mobile/src/test-globals.d.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'next-env.d.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'scripts/verify.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'tests/tooling/mobile-build-boundary.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'tests/tooling/verify-tree-fingerprint.test.ts', LF will be replaced by CRLF the next time Git touches it

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 6 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads layers from the real backend contract
Error: CIVICOS_API_BASE_URL is required for the HTTP contract test
 ❯ get tests/mobile/readonly-http.contract.test.ts:7:11
      5| async function get(path: string): Promise<Response> {
      6|   if (!baseUrl)
      7|     throw new Error(
       |           ^
      8|       'CIVICOS_API_BASE_URL is required for the HTTP contract test',
      9|     );
 ❯ tests/mobile/readonly-http.contract.test.ts:15:28

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/6]⎯

 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo RESIDENT from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo BUSINESS from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo HOTSPOT from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo VIOLATION from the real backend contract
Error: CIVICOS_API_BASE_URL is required for the HTTP contract test
 ❯ get tests/mobile/readonly-http.contract.test.ts:7:11
      5| async function get(path: string): Promise<Response> {
      6|   if (!baseUrl)
      7|     throw new Error(
       |           ^
      8|       'CIVICOS_API_BASE_URL is required for the HTTP contract test',
      9|     );
 ❯ tests/mobile/readonly-http.contract.test.ts:26:30

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/6]⎯

 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads counts, incidents, alarms, dispatches, tasks, and the task alias
Error: CIVICOS_API_BASE_URL is required for the HTTP contract test
 ❯ get tests/mobile/readonly-http.contract.test.ts:7:11
      5| async function get(path: string): Promise<Response> {
      6|   if (!baseUrl)
      7|     throw new Error(
       |           ^
      8|       'CIVICOS_API_BASE_URL is required for the HTTP contract test',
      9|     );
 ❯ tests/mobile/readonly-http.contract.test.ts:63:47

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/6]⎯
````

## Lần chạy 15 — 2026-09-26T19:48:13.151Z (scope=full)

- HEAD: 55cfe22 | file chưa commit: 68 | Tree: 13178a56
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.0s |
| typecheck | `npm run typecheck` | PASS | 3.8s |
| lint | `npm run lint` | PASS | 16.2s |
| format:check | `npm run format:check` | PASS | 22.3s |
| test | `npm run test` | FAIL | 72.0s |
| test:e2e | `npm run test:e2e` | NOT_RUN | - |
| build | `npm run build` | NOT_RUN | - |

### Lỗi: test

Log đầy đủ: `.brain/evidence/05e-verifier-tree-fingerprint-build-checkpoint/logs/run15-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
warning: in the working copy of 'mobile/src/features/__tests__/navigation-readonly.test.tsx', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'mobile/src/test-globals.d.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'next-env.d.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'scripts/verify.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'tests/tooling/mobile-build-boundary.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'tests/tooling/verify-tree-fingerprint.test.ts', LF will be replaced by CRLF the next time Git touches it

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 6 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads layers from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo RESIDENT from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo BUSINESS from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo HOTSPOT from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo VIOLATION from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads counts, incidents, alarms, dispatches, tasks, and the task alias
TypeError: fetch failed
{
  stack: 'AggregateError: \n' +
    '    at internalConnectMultiple (node:net:1194:18)\n' +
    '    at afterConnectMultiple (node:net:1784:7)',
  errors: [
    {
      stack: 'Error: connect ECONNREFUSED 127.0.0.1:3000\n' +
        '    at createConnectionError (node:net:1747:14)\n' +
        '    at afterConnectMultiple (node:net:1777:16)',
      message: 'connect ECONNREFUSED 127.0.0.1:3000',
      errno: -4078,
      code: 'ECONNREFUSED',
      syscall: 'connect',
      address: '127.0.0.1',
      port: 3000,
      constructor: 'Function<Error>',
      name: 'Error',
      toString: 'Function<toString>'
    },
    {
      stack: 'Error: connect ECONNREFUSED ::1:3000\n' +
        '    at createConnectionError (node:net:1747:14)\n' +
        '    at afterConnectMultiple (node:net:1777:16)',
      message: 'connect ECONNREFUSED ::1:3000',
      errno: -4078,
      code: 'ECONNREFUSED',
      syscall: 'connect',
      address: '::1',
      port: 3000,
      constructor: 'Function<Error>',
      name: 'Error',
      toString: 'Function<toString>'
    }
  ],
  code: 'ECONNREFUSED',
  message: '',
  constructor: 'Function<AggregateError>',
  name: 'Caused by: AggregateError',
  toString: 'Function<toString>',
  stacks: []
}
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errors: [ { stack: 'Error: connect ECONNREFUSED 127.0.0.1:3000\n    at createConnectionError (node:net:1747:14)\n    at afterConnectMultiple (node:net:1777:16)', message: 'connect ECONNREFUSED 127.0.0.1:3000', errno: -4078, code: 'ECONNREFUSED', syscall: 'connect', address: '127.0.0.1', port: 3000, constructor: 'Function<Error>', name: 'Error', toString: 'Function<toString>' }, { stack: 'Error: connect ECONNREFUSED ::1:3000\n    at createConnectionError (node:net:1747:14)\n    at afterConnectMultiple (node:net:1777:16)', message: 'connect ECONNREFUSED ::1:3000', errno: -4078, code: 'ECONNREFUSED', syscall: 'connect', address: '::1', port: 3000, constructor: 'Function<Error>', name: 'Error', toString: 'Function<toString>' } ], code: 'ECONNREFUSED' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/6]⎯
````

## Lần chạy 16 — 2026-09-26T19:55:04.829Z (scope=full)

- HEAD: 55cfe22 | file chưa commit: 69 | Tree: f9348dc3
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.1s |
| typecheck | `npm run typecheck` | PASS | 3.9s |
| lint | `npm run lint` | PASS | 16.2s |
| format:check | `npm run format:check` | PASS | 22.4s |
| test | `npm run test` | PASS | 75.1s |
| test:e2e | `npm run test:e2e` | PASS | 141.1s |
| build | `npm run build` | PASS | 11.9s |

## Standalone invocation sau full run 16

- Lệnh: `node scripts/verify.mjs --tree`
- Output nguyên văn: `Tree: f9348dc3`
- Đây là standalone invocation ngay sau full run 16 để Reviewer đối chiếu với Tree `f9348dc3` của lần full PASS.
