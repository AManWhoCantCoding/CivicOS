# Evidence kiểm tra — 06-mobile-readonly-backend-contract

## Lần chạy 1 — 2026-09-25T07:38:27.795Z (only=test filter="tests/mobile-readonly")

- HEAD: 1d7095a | file chưa commit: 91 | Tree: 26364b14
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| test | `npm run test` | FAIL | 18.8s |

### Lỗi: test

Log đầy đủ: `.brain/evidence/06-mobile-readonly-backend-contract/logs/run1-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text

> civic-os@0.1.0 test
> vitest run tests/mobile-readonly


 RUN  v3.2.7 D:/Project/CivicOS

 ✓ tests/mobile-readonly/read-only-guard.regression.test.ts (1 test) 7ms
 ✓ tests/mobile-readonly/forces-read.contract.test.ts (1 test) 128ms
 ✓ tests/mobile-readonly/related-info-search.contract.test.ts (1 test) 341ms
   ✓ mobile related-info search contract > echoes pagination and strips raw PII  340ms
 ❯ tests/mobile-readonly/related-info-detail.contract.test.ts (1 test | 1 failed) 33ms
   × mobile related-info detail contract > returns an entity envelope without raw PII 31ms
     → FORBIDDEN
 ✓ tests/mobile-readonly/related-info-counts.contract.test.ts (1 test) 63ms
 ✓ tests/mobile-readonly/boundary.regression.test.ts (1 test) 29ms
 ✓ tests/mobile-readonly/tasks-by-dispatch.contract.test.ts (1 test) 34ms
 ❯ tests/mobile-readonly/map-layers.contract.test.ts (1 test | 1 failed) 127ms
   × mobile map layer contract > publishes the allow-listed layer envelope 126ms
     → FORBIDDEN
 ✓ tests/mobile-readonly/contract-matrix.contract.test.ts (1 test) 3ms

 Test Files  2 failed | 7 passed (9)
      Tests  2 failed | 7 passed (9)
   Start at  14:38:16
   Duration  10.65s (transform 459ms, setup 0ms, collect 3.68s, tests 765ms, environment 3ms, prepare 1.89s)


--- stderr ---

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/mobile-readonly/map-layers.contract.test.ts > mobile map layer contract > publishes the allow-listed layer envelope
Error: FORBIDDEN
 ❯ resolveMobileLayers src/modules/mobile-readonly/layers.ts:88:29
     86|     if (await hasLayerAssignment(user, layer.entityTypes)) layers.push…
     87|   }
     88|   if (!layers.length) throw new Error('FORBIDDEN');
       |                             ^
     89|   return { layers };
     90| }
 ❯ tests/mobile-readonly/map-layers.contract.test.ts:8:20

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯

 FAIL  tests/mobile-readonly/related-info-detail.contract.test.ts > mobile related-info detail contract > returns an entity envelope without raw PII
Error: FORBIDDEN
 ❯ getRelatedInfoDetail src/modules/mobile-readonly/related-info.ts:345:19
    343|   const rows = await candidatesForType(user, entityType);
    344|   const row = rows.find((candidate) => candidate.id === id);
    345|   if (!row) throw new Error('FORBIDDEN');
       |                   ^
    346|   await requireMobileReadAccess(user, {
    347|     resourceType: row.resourceType,
 ❯ tests/mobile-readonly/related-info-detail.contract.test.ts:9:20

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯
````

## Lần chạy 2 — 2026-09-25T07:53:26.198Z (only=test filter="tests/mobile-readonly")

- HEAD: 1d7095a | file chưa commit: 91 | Tree: 658b4555
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| test | `npm run test` | FAIL | 7.0s |

### Lỗi: test

Log đầy đủ: `.brain/evidence/06-mobile-readonly-backend-contract/logs/run2-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
 ❯ a node_modules/@prisma/client/src/runtime/getPrismaClient.ts:833:24
 ❯ seedMobileReadonlyFixture tests/mobile-readonly/fixtures.ts:105:3
    103|     })),
    104|   });
    105|   await prisma.subject.create({
       |   ^
    106|     data: {
    107|       id: residentId,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/7]⎯

 FAIL  tests/mobile-readonly/related-info-search.contract.test.ts > mobile related-info search contract
PrismaClientUnknownRequestError: 
Invalid `prisma.subject.create()` invocation in
D:\Project\CivicOS\tests\mobile-readonly\fixtures.ts:105:24

  102     roleId: roles.find((role) => role.name === user.roles[0])!.id,
  103   })),
  104 });
→ 105 await prisma.subject.create(
Error occurred during query execution:
ConnectorError(ConnectorError { user_facing_error: None, kind: QueryError(PostgresError { code: "23514", message: "new row for relation \"Subject\" violates check constraint \"Subject_subjectType_allowed\"", severity: "ERROR", detail: Some("Failing row contains (mobile-resident-a86ee0d6-daa9-4891-bec7-d71fc203b2a8, Synthetic resident PII, person, synthetic-sensitive-profile, null, active, 20.900000000000000000000000000000, 105.800000000000000000000000000000, 2026-09-25 07:53:22.413, 2026-09-25 07:53:22.413)."), column: None, hint: None }), transient: false })
 ❯ ei.handleRequestError node_modules/@prisma/client/src/runtime/RequestHandler.ts:237:13
 ❯ ei.handleAndLogRequestError node_modules/@prisma/client/src/runtime/RequestHandler.ts:174:12
 ❯ ei.request node_modules/@prisma/client/src/runtime/RequestHandler.ts:143:12
 ❯ a node_modules/@prisma/client/src/runtime/getPrismaClient.ts:833:24
 ❯ seedMobileReadonlyFixture tests/mobile-readonly/fixtures.ts:105:3
    103|     })),
    104|   });
    105|   await prisma.subject.create({
       |   ^
    106|     data: {
    107|       id: residentId,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/7]⎯

 FAIL  tests/mobile-readonly/tasks-by-dispatch.contract.test.ts > tasks-by-dispatch compatibility alias
PrismaClientUnknownRequestError: 
Invalid `prisma.subject.create()` invocation in
D:\Project\CivicOS\tests\mobile-readonly\fixtures.ts:105:24

  102     roleId: roles.find((role) => role.name === user.roles[0])!.id,
  103   })),
  104 });
→ 105 await prisma.subject.create(
Error occurred during query execution:
ConnectorError(ConnectorError { user_facing_error: None, kind: QueryError(PostgresError { code: "23514", message: "new row for relation \"Subject\" violates check constraint \"Subject_subjectType_allowed\"", severity: "ERROR", detail: Some("Failing row contains (mobile-resident-69d97f2b-b80c-4382-8461-7a3d27da2081, Synthetic resident PII, person, synthetic-sensitive-profile, null, active, 20.900000000000000000000000000000, 105.800000000000000000000000000000, 2026-09-25 07:53:24.223, 2026-09-25 07:53:24.223)."), column: None, hint: None }), transient: false })
 ❯ ei.handleRequestError node_modules/@prisma/client/src/runtime/RequestHandler.ts:237:13
 ❯ ei.handleAndLogRequestError node_modules/@prisma/client/src/runtime/RequestHandler.ts:174:12
 ❯ ei.request node_modules/@prisma/client/src/runtime/RequestHandler.ts:143:12
 ❯ a node_modules/@prisma/client/src/runtime/getPrismaClient.ts:833:24
 ❯ seedMobileReadonlyFixture tests/mobile-readonly/fixtures.ts:105:3
    103|     })),
    104|   });
    105|   await prisma.subject.create({
       |   ^
    106|     data: {
    107|       id: residentId,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[7/7]⎯
````

## Lần chạy 3 — 2026-09-25T07:57:52.454Z (only=test filter="tests/mobile-readonly")

- HEAD: 1d7095a | file chưa commit: 91 | Tree: 0515cc1d
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| test | `npm run test` | FAIL | 7.6s |

### Lỗi: test

Log đầy đủ: `.brain/evidence/06-mobile-readonly-backend-contract/logs/run3-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text

> civic-os@0.1.0 test
> vitest run tests/mobile-readonly


 RUN  v3.2.7 D:/Project/CivicOS

 ✓ tests/mobile-readonly/map-layers.contract.test.ts (1 test) 265ms
 ✓ tests/mobile-readonly/tasks-by-dispatch.contract.test.ts (1 test) 241ms
 ✓ tests/mobile-readonly/related-info-search.contract.test.ts (1 test) 479ms
 ✓ tests/mobile-readonly/boundary.regression.test.ts (2 tests) 225ms
 ✓ tests/mobile-readonly/forces-read.contract.test.ts (1 test) 264ms
 ✓ tests/mobile-readonly/related-info-counts.contract.test.ts (1 test) 291ms
 ❯ tests/mobile-readonly/related-info-detail.contract.test.ts (2 tests | 1 failed) 254ms
   × mobile related-info detail contract > returns an entity envelope without raw PII 24ms
     → FORBIDDEN
   ✓ mobile related-info detail contract > rejects a resource outside the server boundary 16ms
 ✓ tests/mobile-readonly/read-only-guard.regression.test.ts (1 test) 7ms
 ✓ tests/mobile-readonly/contract-matrix.contract.test.ts (1 test) 4ms

 Test Files  1 failed | 8 passed (9)
      Tests  1 failed | 10 passed (11)
   Start at  14:57:46
   Duration  6.19s (transform 407ms, setup 0ms, collect 1.59s, tests 2.03s, environment 3ms, prepare 982ms)


--- stderr ---

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/mobile-readonly/related-info-detail.contract.test.ts > mobile related-info detail contract > returns an entity envelope without raw PII
Error: FORBIDDEN
 ❯ getRelatedInfoDetail src/modules/mobile-readonly/related-info.ts:414:19
    412|   const rows = await candidatesForType(user, entityType);
    413|   const row = rows.find((candidate) => candidate.id === id);
    414|   if (!row) throw new Error('FORBIDDEN');
       |                   ^
    415|   await requireMobileReadAccess(user, {
    416|     resourceType: row.resourceType,
 ❯ tests/mobile-readonly/related-info-detail.contract.test.ts:10:20

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯
````

## Lần chạy 4 — 2026-09-25T08:02:19.506Z (only=test filter="tests/mobile-readonly")

- HEAD: 1d7095a | file chưa commit: 91 | Tree: b82786fc
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| test | `npm run test` | PASS | 7.7s |

## Lần chạy 5 — 2026-09-25T08:07:15.925Z (scope=full)

- HEAD: 1d7095a | file chưa commit: 91 | Tree: b82786fc
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.3s |
| typecheck | `npm run typecheck` | PASS | 4.3s |
| lint | `npm run lint` | PASS | 17.1s |
| format:check | `npm run format:check` | PASS | 10.7s |
| test | `npm run test` | FAIL | 31.6s |
| test:e2e | `npm run test:e2e` | NOT_RUN | - |
| build | `npm run build` | NOT_RUN | - |

### Lỗi: test

Log đầy đủ: `.brain/evidence/06-mobile-readonly-backend-contract/logs/run5-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
 ↓ tests/incidents/incident-authorization.postgres.test.ts (12 tests | 12 skipped)
 ↓ tests/incidents/intake-report-separation.postgres.test.ts (16 tests | 16 skipped)
 ↓ tests/identity/health-worker-access.integration.test.ts (5 tests | 5 skipped)
 ↓ tests/identity/migration-rollback.integration.test.ts (2 tests | 2 skipped)
 ↓ tests/identity/user-screen-access.integration.test.ts (3 tests | 3 skipped)
 ↓ tests/eventing/event-durability.postgres.test.ts (11 tests | 11 skipped)
 ↓ tests/eventing/event-kernel.postgres.test.ts (3 tests | 3 skipped)
 ↓ tests/eventing/projection-replay.postgres.test.ts (1 test | 1 skipped)
 ↓ tests/inspections/inspection-schedule.postgres.test.ts (2 tests | 2 skipped)
 ↓ tests/inspections/inspection-slices-4-6.postgres.test.ts (10 tests | 10 skipped)
 ↓ tests/inspections/inspection-stats.postgres.test.ts (2 tests | 2 skipped)
 ↓ tests/integration/parallel-wave-authorization.integration.test.ts (4 tests | 4 skipped)
 ↓ tests/integration/parallel-wave-resilience.integration.test.ts (4 tests | 4 skipped)
 ↓ tests/residents/resident-scope-regression.postgres.test.ts (5 tests | 5 skipped)
 ↓ tests/residents/resident-workflow.postgres.test.ts (8 tests | 8 skipped)
 ↓ tests/vehicles/vehicle-watch-slices-4-7.postgres.test.ts (11 tests | 11 skipped)

 Test Files  1 failed | 47 passed | 17 skipped (65)
      Tests  1 failed | 213 passed | 191 skipped (405)
   Start at  15:06:45
   Duration  30.24s (transform 1.49s, setup 0ms, collect 9.07s, tests 2.33s, environment 19ms, prepare 7.35s)


--- stderr ---

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/identity/session-seed-boundary.postgres.test.ts > identity public entry point > exposes only the documented domain surface without database internals
AssertionError: expected [ 'ASSIGNMENT_TASKS', …(34) ] to deeply equal [ 'ASSIGNMENT_TASKS', …(32) ]

- Expected
+ Received

@@ -22,14 +22,16 @@
    "encryptSensitive",
    "ensureDevelopmentUsers",
    "evaluatePolicy",
    "getCurrentUser",
    "grantAssignments",
+   "hasActiveAssignmentForRead",
    "isTaskCompatibleWithRoles",
    "listAssignments",
    "listIdentityUsers",
    "listOrganizationUnits",
    "recordAudit",
+   "requireMobileReadAccess",
    "requireRole",
    "revokeAssignment",
    "sessionCookieName",
  ]

 ❯ tests/identity/session-seed-boundary.postgres.test.ts:40:42
     38| describe('identity public entry point', () => {
     39|   it('exposes only the documented domain surface without database inte…
     40|     expect(Object.keys(identity).sort()).toEqual(
       |                                          ^
     41|       [
     42|         'ASSIGNMENT_TASKS',

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯
````

## Lần chạy 6 — 2026-09-25T08:12:19.372Z (scope=fast)

- HEAD: 1d7095a | file chưa commit: 92 | Tree: 81f5e69b
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.4s |
| typecheck | `npm run typecheck` | PASS | 6.4s |
| lint | `npm run lint` | PASS | 16.8s |
| format:check | `npm run format:check` | PASS | 10.2s |
| test | `npm run test` | PASS | 27.4s |

## Lần chạy 7 — 2026-09-25T08:21:01.488Z (scope=full)

- HEAD: 1d7095a | file chưa commit: 92 | Tree: 81f5e69b
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.3s |
| typecheck | `npm run typecheck` | PASS | 14.8s |
| lint | `npm run lint` | PASS | 18.9s |
| format:check | `npm run format:check` | PASS | 8.7s |
| test | `npm run test` | PASS | 31.4s |
| test:e2e | `npm run test:e2e` | PASS | 155.4s |
| build | `npm run build` | PASS | 14.9s |

## Lần chạy 8 — 2026-09-25T08:39:30.301Z (scope=fast)

- HEAD: 1d7095a | file chưa commit: 92 | Tree: 4159e435
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 3.5s |
| typecheck | `npm run typecheck` | PASS | 6.6s |
| lint | `npm run lint` | PASS | 18.3s |
| format:check | `npm run format:check` | PASS | 10.3s |
| test | `npm run test` | PASS | 32.6s |

## Lần chạy 9 — 2026-09-25T08:44:10.931Z (scope=full)

- HEAD: 1d7095a | file chưa commit: 92 | Tree: 5ddccde8
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.1s |
| typecheck | `npm run typecheck` | PASS | 5.8s |
| lint | `npm run lint` | PASS | 16.5s |
| format:check | `npm run format:check` | PASS | 10.0s |
| test | `npm run test` | PASS | 31.8s |
| test:e2e | `npm run test:e2e` | PASS | 145.9s |
| build | `npm run build` | PASS | 13.9s |

## Lần chạy 10 — 2026-09-25T09:02:26.451Z (scope=fast)

- HEAD: 1d7095a | file chưa commit: 92 | Tree: 1a10b4a9
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.5s |
| typecheck | `npm run typecheck` | PASS | 5.6s |
| lint | `npm run lint` | PASS | 14.9s |
| format:check | `npm run format:check` | PASS | 8.5s |
| test | `npm run test` | PASS | 29.5s |

## Lần chạy 11 — 2026-09-25T09:06:47.420Z (scope=full)

- HEAD: 1d7095a | file chưa commit: 92 | Tree: ad562a8b
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.2s |
| typecheck | `npm run typecheck` | PASS | 5.3s |
| lint | `npm run lint` | PASS | 14.0s |
| format:check | `npm run format:check` | PASS | 8.8s |
| test | `npm run test` | PASS | 28.0s |
| test:e2e | `npm run test:e2e` | PASS | 138.6s |
| build | `npm run build` | PASS | 12.3s |

## Lần chạy 12 — 2026-09-25T09:30:18.920Z (scope=fast)

- HEAD: 1d7095a | file chưa commit: 92 | Tree: f5e9189f
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.7s |
| typecheck | `npm run typecheck` | FAIL | 6.7s |
| lint | `npm run lint` | NOT_RUN | - |
| format:check | `npm run format:check` | NOT_RUN | - |
| test | `npm run test` | NOT_RUN | - |

### Lỗi: typecheck

Log đầy đủ: `.brain/evidence/06-mobile-readonly-backend-contract/logs/run12-typecheck.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text

> civic-os@0.1.0 typecheck
> tsc --noEmit

tests/mobile-readonly/contract-matrix.contract.test.ts(109,32): error TS2345: Argument of type 'readonly [string, string]' is not assignable to parameter of type 'unknown[]'.
  The type 'readonly [string, string]' is 'readonly' and cannot be assigned to the mutable type 'unknown[]'.
tests/mobile-readonly/related-info-search.contract.test.ts(53,32): error TS2345: Argument of type 'readonly [string, string]' is not assignable to parameter of type 'unknown[]'.
  The type 'readonly [string, string]' is 'readonly' and cannot be assigned to the mutable type 'unknown[]'.
````

## Lần chạy 13 — 2026-09-25T09:35:47.786Z (scope=fast)

- HEAD: 1d7095a | file chưa commit: 92 | Tree: 44188a91
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.4s |
| typecheck | `npm run typecheck` | PASS | 4.8s |
| lint | `npm run lint` | PASS | 18.5s |
| format:check | `npm run format:check` | PASS | 10.2s |
| test | `npm run test` | PASS | 34.6s |

## Lần chạy 14 — 2026-09-25T09:42:52.448Z (scope=full)

- HEAD: 1d7095a | file chưa commit: 92 | Tree: 7fd28522
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.2s |
| typecheck | `npm run typecheck` | PASS | 4.5s |
| lint | `npm run lint` | PASS | 16.7s |
| format:check | `npm run format:check` | PASS | 10.0s |
| test | `npm run test` | PASS | 33.7s |
| test:e2e | `npm run test:e2e` | PASS | 140.7s |
| build | `npm run build` | PASS | 13.2s |
