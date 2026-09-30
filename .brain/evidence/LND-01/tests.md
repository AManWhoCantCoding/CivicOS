# Tests — LND-01

> File được khôi phục từ digest/log còn lại sau sự cố worktree. Các mục dưới đây là lịch sử đã biết, không phải bằng chứng PASS mới.

## Lần chạy 1 — scope=fast

- `typecheck`: FAIL ban đầu do seed gọi helper không tồn tại.
- `lint`: FAIL.
- `format:check`: FAIL.
- `test`: FAIL.

## Lần chạy 2 — scope=fast

- `typecheck`: PASS sau khi sửa helper seed.
- `lint`: FAIL — `scripts/demo/seed-land.ts` còn `require()` style import và warnings hiện hữu.
- `format:check`: FAIL — 73 file có style issue, gồm workflow backup files.
- `test`: FAIL — `tests/mobile/readonly-http.contract.test.ts` có 6 failure; tổng 9 test files failed, 48 passed, 18 skipped.

## Evidence còn lại

- Raw logs: `.brain/evidence/LND-01/logs/run1-*.log` và `run2-*.log`.
- Digest gần nhất: `digest.md`.
- Chưa có lần chạy `scope=full` PASS cho LND-01.

## Lần chạy 3 — 2026-09-30T08:27:32.469Z (scope=fast)

- HEAD: 1a825b9 | file chưa commit: 53 | Tree: 39ed6bdd
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| typecheck | `npm run typecheck` | PASS | 8.4s |
| lint | `npm run lint` | FAIL | 15.2s |
| format:check | `npm run format:check` | FAIL | 21.2s |
| test | `npm run test` | FAIL | 168.6s |

### Lỗi: lint

Log đầy đủ: `.brain/evidence/LND-01/logs/run3-lint.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text

> civic-os@0.1.0 lint
> eslint .


D:\Project\CivicOS\.scratch\_workflow-adoption\check-opencode.cjs
  3:12  error  A `require()` style import is forbidden  @typescript-eslint/no-require-imports
  4:14  error  A `require()` style import is forbidden  @typescript-eslint/no-require-imports

D:\Project\CivicOS\mobile\src\auth\SessionContext.tsx
  33:5  warning  React Hook useEffect has an unnecessary dependency: 'onSessionExpired'. Either exclude it or remove the dependency array. Outer scope values like 'onSessionExpired' aren't valid dependencies because mutating them doesn't re-render the component  react-hooks/exhaustive-deps

D:\Project\CivicOS\mobile\src\features\related-info\RelatedInfoScreen.tsx
  95:6  warning  React Hook useEffect has a missing dependency: 'load'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

D:\Project\CivicOS\src\modules\incidents\commands.ts
  1830:9  warning  'resource' is assigned a value but never used  @typescript-eslint/no-unused-vars

D:\Project\CivicOS\tests\integration\demo-seed-reset.integration.test.ts
  8:3  warning  'LocalEvidenceStorage' is defined but never used  @typescript-eslint/no-unused-vars

✖ 6 problems (2 errors, 4 warnings)
````

## Kiểm tra targeted do Mentor tự chạy — 2026-09-30T16:13Z

- `npx prisma validate`: PASS; schema hợp lệ sau khi sửa relation `securedParty`.
- `npx prisma migrate deploy`: PASS; migration `20260930000000_lnd01_land_foundation` đã áp dụng.
- DB preflight: PASS; PostGIS `3.4`, đủ 8 bảng `Land*`, port `5432` accepting connections.
- DB test command với `RUN_DB_TESTS=1`: PASS — `tests/land/lnd01-land-foundation.test.ts` 13/13 và `tests/integration/schema-and-migration.test.ts` 7/7; tổng 20/20.
- Seed command gọi trực tiếp `upsertLandRoles` + `seedLandDemo` chạy hai lần: PASS; truy vấn sau đó cho mỗi role count `1`, party `1`, parcel `1`, right `1`.
- `npm run typecheck`: PASS; `npm run lint`: PASS (0 errors, 4 warnings).
- Prettier trên các file LND được phép: PASS.
- Đây là evidence targeted bổ sung; lần chạy `scope=full` gần nhất vẫn FAIL ở format baseline ngoài ticket, nên chưa được dùng để đóng ticket.

### Lỗi: format:check

Log đầy đủ: `.brain/evidence/LND-01/logs/run3-format_check.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
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
[warn] package.json
[warn] package.json.bak-workflow-cu.md
[warn] scripts/check-scope.mjs
[warn] scripts/check-scope.mjs.bak-workflow-cu.md
[warn] scripts/demo/demo-db.ts
[warn] scripts/demo/reset.ts
[warn] scripts/demo/seed.ts
[warn] scripts/oc.mjs.bak-workflow-cu.md
[warn] scripts/verify.mjs.bak-workflow-cu.md
[warn] src/modules/eventing/event-store.ts
[warn] src/modules/eventing/outbox.ts
[warn] src/modules/eventing/read-model.ts
[warn] src/modules/eventing/worker.ts
[warn] src/modules/incidents/commands.ts
[warn] src/modules/incidents/contracts.ts
[warn] src/modules/incidents/index.ts
[warn] src/modules/incidents/projection.ts
[warn] src/modules/inspections/commands.ts
[warn] src/modules/inspections/projection.ts
[warn] src/modules/inspections/schemas.ts
[warn] src/modules/platform/evidence/evidence-service.ts
[warn] src/modules/platform/index.ts
[warn] src/modules/platform/notifications/index.ts
[warn] src/modules/platform/sla/index.ts
[warn] src/modules/residents/commands.ts
[warn] src/modules/residents/contracts.ts
[warn] src/modules/residents/index.ts
[warn] src/modules/residents/projection.ts
[warn] src/modules/residents/seed.ts
[warn] src/modules/vehicles/commands.ts
[warn] tests/integration/demo-seed-reset.integration.test.ts
[warn] tests/integration/schema-and-migration.test.ts
[warn] workflow-roles/developer.md
[warn] workflow-roles/mentor.md
[warn] workflow-roles/research.md
[warn] workflow-roles/ui-ux.md
[warn] workflow.md
[warn] Code style issues found in 102 files. Run Prettier with --write to fix.
````

### Lỗi: test

Log đầy đủ: `.brain/evidence/LND-01/logs/run3-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
 FAIL  tests/mobile-readonly/related-info-search.contract.test.ts > mobile related-info search contract
 FAIL  tests/mobile-readonly/tasks-by-dispatch.contract.test.ts > tasks-by-dispatch compatibility alias
PrismaClientInitializationError:
Invalid `prisma.notification.deleteMany()` invocation in
D:\Project\CivicOS\tests\mobile-readonly\fixtures.ts:480:29

  477
  478 export async function cleanupMobileReadonlyFixture(): Promise<void> {
  479   const userIds = Object.values(mobileUsers).map((user) => user.id);
→ 480   await prisma.notification.deleteMany(
Can't reach database server at `localhost:5432`

Please make sure your database server is running at `localhost:5432`.
 ❯ ei.handleRequestError node_modules/@prisma/client/src/runtime/RequestHandler.ts:242:13
 ❯ ei.handleAndLogRequestError node_modules/@prisma/client/src/runtime/RequestHandler.ts:174:12
 ❯ ei.request node_modules/@prisma/client/src/runtime/RequestHandler.ts:143:12
 ❯ a node_modules/@prisma/client/src/runtime/getPrismaClient.ts:833:24
 ❯ cleanupMobileReadonlyFixture tests/mobile-readonly/fixtures.ts:480:3
    478| export async function cleanupMobileReadonlyFixture(): Promise<void> {
    479|   const userIds = Object.values(mobileUsers).map((user) => user.id);
    480|   await prisma.notification.deleteMany({ where: { userId: { in: userId…
       |   ^
    481|   await prisma.assignment.deleteMany({
    482|     where: { id: { startsWith: `mobile-assignment-${suffix}` } },

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/19]⎯


⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/demo/demo-now-invalid.test.ts > demo clock preflight > rejects undefined before importing or mutating demo modules
 FAIL  tests/demo/demo-now-invalid.test.ts > demo clock preflight > rejects 2026-09-28T08:00:00.000 before importing or mutating demo modules
 FAIL  tests/demo/demo-now-invalid.test.ts > demo clock preflight > rejects invalid before importing or mutating demo modules
AssertionError: expected [Function] to throw error including 'DEMO_NOW_INVALID' but got '\nInvalid `prisma.organizationUnit.up…'

- Expected
+ Received

- DEMO_NOW_INVALID
+
+ Invalid `prisma.organizationUnit.upsert()` invocation in
+ D:\Project\CivicOS\src\modules\identity\local-provider.ts:28:46
+
+   25 export async function ensureDevelopmentUsers(): Promise<void> {
+   26   if (process.env.NODE_ENV === 'production') return;
+   27
+ → 28   const unit = await prisma.organizationUnit.upsert(
+ Can't reach database server at `localhost:5432`
+
+ Please make sure your database server is running at `localhost:5432`.

 ❯ tests/demo/demo-now-invalid.test.ts:12:7
     10|     'rejects %s before importing or mutating demo modules',
     11|     async (demoNow) => {
     12|       await expect(
       |       ^
     13|         seedDemo({
     14|           DATABASE_URL: DEMO_URL,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/19]⎯
````

## Lần chạy 4 — 2026-09-30T08:33:54.024Z (scope=fast)

- HEAD: 1a825b9 | file chưa commit: 56 | Tree: 39ed6bdd
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| typecheck | `npm run typecheck` | PASS | 4.2s |
| lint | `npm run lint` | FAIL | 14.2s |
| format:check | `npm run format:check` | FAIL | 21.3s |
| test | `npm run test` | FAIL | 166.6s |

### Lỗi: lint

Log đầy đủ: `.brain/evidence/LND-01/logs/run4-lint.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text

> civic-os@0.1.0 lint
> eslint .


D:\Project\CivicOS\.scratch\_workflow-adoption\check-opencode.cjs
  3:12  error  A `require()` style import is forbidden  @typescript-eslint/no-require-imports
  4:14  error  A `require()` style import is forbidden  @typescript-eslint/no-require-imports

D:\Project\CivicOS\mobile\src\auth\SessionContext.tsx
  33:5  warning  React Hook useEffect has an unnecessary dependency: 'onSessionExpired'. Either exclude it or remove the dependency array. Outer scope values like 'onSessionExpired' aren't valid dependencies because mutating them doesn't re-render the component  react-hooks/exhaustive-deps

D:\Project\CivicOS\mobile\src\features\related-info\RelatedInfoScreen.tsx
  95:6  warning  React Hook useEffect has a missing dependency: 'load'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

D:\Project\CivicOS\src\modules\incidents\commands.ts
  1830:9  warning  'resource' is assigned a value but never used  @typescript-eslint/no-unused-vars

D:\Project\CivicOS\tests\integration\demo-seed-reset.integration.test.ts
  8:3  warning  'LocalEvidenceStorage' is defined but never used  @typescript-eslint/no-unused-vars

✖ 6 problems (2 errors, 4 warnings)
````

### Lỗi: format:check

Log đầy đủ: `.brain/evidence/LND-01/logs/run4-format_check.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
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
[warn] package.json
[warn] package.json.bak-workflow-cu.md
[warn] scripts/check-scope.mjs
[warn] scripts/check-scope.mjs.bak-workflow-cu.md
[warn] scripts/demo/demo-db.ts
[warn] scripts/demo/reset.ts
[warn] scripts/demo/seed.ts
[warn] scripts/oc.mjs.bak-workflow-cu.md
[warn] scripts/verify.mjs.bak-workflow-cu.md
[warn] src/modules/eventing/event-store.ts
[warn] src/modules/eventing/outbox.ts
[warn] src/modules/eventing/read-model.ts
[warn] src/modules/eventing/worker.ts
[warn] src/modules/incidents/commands.ts
[warn] src/modules/incidents/contracts.ts
[warn] src/modules/incidents/index.ts
[warn] src/modules/incidents/projection.ts
[warn] src/modules/inspections/commands.ts
[warn] src/modules/inspections/projection.ts
[warn] src/modules/inspections/schemas.ts
[warn] src/modules/platform/evidence/evidence-service.ts
[warn] src/modules/platform/index.ts
[warn] src/modules/platform/notifications/index.ts
[warn] src/modules/platform/sla/index.ts
[warn] src/modules/residents/commands.ts
[warn] src/modules/residents/contracts.ts
[warn] src/modules/residents/index.ts
[warn] src/modules/residents/projection.ts
[warn] src/modules/residents/seed.ts
[warn] src/modules/vehicles/commands.ts
[warn] tests/integration/demo-seed-reset.integration.test.ts
[warn] workflow-roles/developer.md
[warn] workflow-roles/mentor.md
[warn] workflow-roles/research.md
[warn] workflow-roles/ui-ux.md
[warn] workflow.md
[warn] Code style issues found in 100 files. Run Prettier with --write to fix.
````

### Lỗi: test

Log đầy đủ: `.brain/evidence/LND-01/logs/run4-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
 FAIL  tests/mobile-readonly/related-info-search.contract.test.ts > mobile related-info search contract
 FAIL  tests/mobile-readonly/tasks-by-dispatch.contract.test.ts > tasks-by-dispatch compatibility alias
PrismaClientInitializationError:
Invalid `prisma.notification.deleteMany()` invocation in
D:\Project\CivicOS\tests\mobile-readonly\fixtures.ts:480:29

  477
  478 export async function cleanupMobileReadonlyFixture(): Promise<void> {
  479   const userIds = Object.values(mobileUsers).map((user) => user.id);
→ 480   await prisma.notification.deleteMany(
Can't reach database server at `localhost:5432`

Please make sure your database server is running at `localhost:5432`.
 ❯ ei.handleRequestError node_modules/@prisma/client/src/runtime/RequestHandler.ts:242:13
 ❯ ei.handleAndLogRequestError node_modules/@prisma/client/src/runtime/RequestHandler.ts:174:12
 ❯ ei.request node_modules/@prisma/client/src/runtime/RequestHandler.ts:143:12
 ❯ a node_modules/@prisma/client/src/runtime/getPrismaClient.ts:833:24
 ❯ cleanupMobileReadonlyFixture tests/mobile-readonly/fixtures.ts:480:3
    478| export async function cleanupMobileReadonlyFixture(): Promise<void> {
    479|   const userIds = Object.values(mobileUsers).map((user) => user.id);
    480|   await prisma.notification.deleteMany({ where: { userId: { in: userId…
       |   ^
    481|   await prisma.assignment.deleteMany({
    482|     where: { id: { startsWith: `mobile-assignment-${suffix}` } },

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/19]⎯


⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/demo/demo-now-invalid.test.ts > demo clock preflight > rejects undefined before importing or mutating demo modules
 FAIL  tests/demo/demo-now-invalid.test.ts > demo clock preflight > rejects 2026-09-28T08:00:00.000 before importing or mutating demo modules
 FAIL  tests/demo/demo-now-invalid.test.ts > demo clock preflight > rejects invalid before importing or mutating demo modules
AssertionError: expected [Function] to throw error including 'DEMO_NOW_INVALID' but got '\nInvalid `prisma.organizationUnit.up…'

- Expected
+ Received

- DEMO_NOW_INVALID
+
+ Invalid `prisma.organizationUnit.upsert()` invocation in
+ D:\Project\CivicOS\src\modules\identity\local-provider.ts:28:46
+
+   25 export async function ensureDevelopmentUsers(): Promise<void> {
+   26   if (process.env.NODE_ENV === 'production') return;
+   27
+ → 28   const unit = await prisma.organizationUnit.upsert(
+ Can't reach database server at `localhost:5432`
+
+ Please make sure your database server is running at `localhost:5432`.

 ❯ tests/demo/demo-now-invalid.test.ts:12:7
     10|     'rejects %s before importing or mutating demo modules',
     11|     async (demoNow) => {
     12|       await expect(
       |       ^
     13|         seedDemo({
     14|           DATABASE_URL: DEMO_URL,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/19]⎯
````

## Lần chạy 5 — 2026-09-30T08:55:45.539Z (scope=fast)

- HEAD: 1a825b9 | file chưa commit: 56 | Tree: e42b03d0
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| typecheck | `npm run typecheck` | PASS | 3.3s |
| lint | `npm run lint` | FAIL | 18.2s |
| format:check | `npm run format:check` | FAIL | 22.9s |
| test | `npm run test` | FAIL | 69.3s |

### Lỗi: lint

Log đầy đủ: `.brain/evidence/LND-01/logs/run5-lint.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text

> civic-os@0.1.0 lint
> eslint .


D:\Project\CivicOS\.scratch\_workflow-adoption\check-opencode.cjs
  3:12  error  A `require()` style import is forbidden  @typescript-eslint/no-require-imports
  4:14  error  A `require()` style import is forbidden  @typescript-eslint/no-require-imports

D:\Project\CivicOS\mobile\src\auth\SessionContext.tsx
  33:5  warning  React Hook useEffect has an unnecessary dependency: 'onSessionExpired'. Either exclude it or remove the dependency array. Outer scope values like 'onSessionExpired' aren't valid dependencies because mutating them doesn't re-render the component  react-hooks/exhaustive-deps

D:\Project\CivicOS\mobile\src\features\related-info\RelatedInfoScreen.tsx
  95:6  warning  React Hook useEffect has a missing dependency: 'load'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

D:\Project\CivicOS\src\modules\incidents\commands.ts
  1830:9  warning  'resource' is assigned a value but never used  @typescript-eslint/no-unused-vars

D:\Project\CivicOS\tests\integration\demo-seed-reset.integration.test.ts
  8:3  warning  'LocalEvidenceStorage' is defined but never used  @typescript-eslint/no-unused-vars

✖ 6 problems (2 errors, 4 warnings)
````

### Lỗi: format:check

Log đầy đủ: `.brain/evidence/LND-01/logs/run5-format_check.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
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
[warn] package.json
[warn] package.json.bak-workflow-cu.md
[warn] scripts/check-scope.mjs
[warn] scripts/check-scope.mjs.bak-workflow-cu.md
[warn] scripts/demo/demo-db.ts
[warn] scripts/demo/reset.ts
[warn] scripts/demo/seed.ts
[warn] scripts/oc.mjs.bak-workflow-cu.md
[warn] scripts/verify.mjs.bak-workflow-cu.md
[warn] src/modules/eventing/event-store.ts
[warn] src/modules/eventing/outbox.ts
[warn] src/modules/eventing/read-model.ts
[warn] src/modules/eventing/worker.ts
[warn] src/modules/incidents/commands.ts
[warn] src/modules/incidents/contracts.ts
[warn] src/modules/incidents/index.ts
[warn] src/modules/incidents/projection.ts
[warn] src/modules/inspections/commands.ts
[warn] src/modules/inspections/projection.ts
[warn] src/modules/inspections/schemas.ts
[warn] src/modules/platform/evidence/evidence-service.ts
[warn] src/modules/platform/index.ts
[warn] src/modules/platform/notifications/index.ts
[warn] src/modules/platform/sla/index.ts
[warn] src/modules/residents/commands.ts
[warn] src/modules/residents/contracts.ts
[warn] src/modules/residents/index.ts
[warn] src/modules/residents/projection.ts
[warn] src/modules/residents/seed.ts
[warn] src/modules/vehicles/commands.ts
[warn] tests/integration/demo-seed-reset.integration.test.ts
[warn] workflow-roles/developer.md
[warn] workflow-roles/mentor.md
[warn] workflow-roles/research.md
[warn] workflow-roles/ui-ux.md
[warn] workflow.md
[warn] Code style issues found in 100 files. Run Prettier with --write to fix.
````

### Lỗi: test

Log đầy đủ: `.brain/evidence/LND-01/logs/run5-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
warning: in the working copy of '.brain/evidence/05e-verifier-tree-fingerprint-build-checkpoint/tests.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'Lesson-learned.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docker-compose.yml', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'prisma/schema.prisma', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'tests/integration/schema-and-migration.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/annotations/markerview/': Filename too long
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/annotations/pointannotation/': Filename too long
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/sources/tilesources/rasterdemsource/': Filename too long
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/sources/tilesources/rastersource/': Filename too long
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/sources/tilesources/vectorsource/': Filename too long
warning: in the working copy of '.brain/evidence/05a-mobile-build-boundary-fix/tests.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05e-verifier-tree-fingerprint-build-checkpoint/tests.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'Lesson-learned.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docker-compose.yml', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'prisma/schema.prisma', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'tests/integration/schema-and-migration.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/annotations/markerview/': Filename too long
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/annotations/pointannotation/': Filename too long
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/sources/tilesources/rasterdemsource/': Filename too long
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/sources/tilesources/rastersource/': Filename too long
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/sources/tilesources/vectorsource/': Filename too long
warning: in the working copy of '.brain/evidence/05a-mobile-build-boundary-fix/tests.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05e-verifier-tree-fingerprint-build-checkpoint/tests.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'Lesson-learned.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docker-compose.yml', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'prisma/schema.prisma', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'tests/integration/schema-and-migration.test.ts', LF will be replaced by CRLF the next time Git touches it

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/demo/demo-now-invalid.test.ts > demo clock preflight > rejects undefined before importing or mutating demo modules
 FAIL  tests/demo/demo-now-invalid.test.ts > demo clock preflight > rejects 2026-09-28T08:00:00.000 before importing or mutating demo modules
 FAIL  tests/demo/demo-now-invalid.test.ts > demo clock preflight > rejects invalid before importing or mutating demo modules
AssertionError: promise resolved "{ …(8) }" instead of rejecting

- Expected
+ Received

- Error {
-   "message": "rejected promise",
+ {
+   "drained": 0,
+   "incidentId": "1f23f759-a876-4b43-a432-c970a51fa741",
+   "incidents": 1,
+   "inspectionId": "cmukc13l70024wircliorrtcy",
+   "inspections": 1,
+   "observationId": "cmukc13nx002xwircr0ht5azd",
+   "observations": 1,
+   "users": 26,
  }

 ❯ tests/demo/demo-now-invalid.test.ts:18:7
     16|           DEMO_NOW: demoNow,
     17|         }),
     18|       ).rejects.toThrow('DEMO_NOW_INVALID');
       |       ^
     19|     },
     20|   );

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/3]⎯
````

## Lần chạy 6 — 2026-09-30T08:56:40.815Z (only=test filter="lnd01-land-foundation")

- HEAD: 1a825b9 | file chưa commit: 56 | Tree: e42b03d0
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| test | `npm run test` | PASS | 2.4s |

## Lần chạy 7 — 2026-09-30T08:57:08.546Z (only=test filter="schema-and-migration")

- HEAD: 1a825b9 | file chưa commit: 56 | Tree: e42b03d0
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| test | `npm run test` | PASS | 8.4s |

## Lần chạy 8 — 2026-09-30T09:01:14.429Z (scope=full)

- HEAD: ffc1b9e | file chưa commit: 6 | Tree: 84852274
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.4s |
| typecheck | `npm run typecheck` | PASS | 8.6s |
| lint | `npm run lint` | FAIL | 15.9s |
| format:check | `npm run format:check` | NOT_RUN | - |
| test | `npm run test` | NOT_RUN | - |
| test:e2e | `npm run test:e2e` | NOT_RUN | - |
| build | `npm run build` | NOT_RUN | - |

### Lỗi: lint

Log đầy đủ: `.brain/evidence/LND-01/logs/run8-lint.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text

> civic-os@0.1.0 lint
> eslint .


D:\Project\CivicOS\.scratch\_workflow-adoption\check-opencode.cjs
  3:12  error  A `require()` style import is forbidden  @typescript-eslint/no-require-imports
  4:14  error  A `require()` style import is forbidden  @typescript-eslint/no-require-imports

D:\Project\CivicOS\mobile\src\auth\SessionContext.tsx
  33:5  warning  React Hook useEffect has an unnecessary dependency: 'onSessionExpired'. Either exclude it or remove the dependency array. Outer scope values like 'onSessionExpired' aren't valid dependencies because mutating them doesn't re-render the component  react-hooks/exhaustive-deps

D:\Project\CivicOS\mobile\src\features\related-info\RelatedInfoScreen.tsx
  95:6  warning  React Hook useEffect has a missing dependency: 'load'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

D:\Project\CivicOS\src\modules\incidents\commands.ts
  1830:9  warning  'resource' is assigned a value but never used  @typescript-eslint/no-unused-vars

D:\Project\CivicOS\tests\integration\demo-seed-reset.integration.test.ts
  8:3  warning  'LocalEvidenceStorage' is defined but never used  @typescript-eslint/no-unused-vars

✖ 6 problems (2 errors, 4 warnings)
````

## Lần chạy 9 — 2026-09-30T09:14:18.188Z (scope=full)

- HEAD: aa78c44 | file chưa commit: 28 | Tree: 84852274
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | SKIPPED | - |
| typecheck | `npm run typecheck` | PASS | 3.5s |
| lint | `npm run lint` | PASS | 16.9s |
| format:check | `npm run format:check` | FAIL | 22.9s |
| test | `npm run test` | NOT_RUN | - |
| test:e2e | `npm run test:e2e` | NOT_RUN | - |
| build | `npm run build` | NOT_RUN | - |

### Lỗi: format:check

Log đầy đủ: `.brain/evidence/LND-01/logs/run9-format_check.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
> prettier --check .

Checking formatting...

--- stderr ---
[warn] docs/design/civicos-e1-clone-mvp/api-contract.md
[warn] docs/design/civicos-e1-clone-mvp/data-model.md
[warn] docs/design/civicos-e1-clone-mvp/domain-rules.md
[warn] docs/design/civicos-e1-clone-mvp/edge-cases.md
[warn] docs/design/civicos-e1-clone-mvp/glossary.md
[warn] docs/design/civicos-e1-clone-mvp/overview.md
[warn] docs/design/demo-seed-complete/api-contract.md
[warn] docs/design/demo-seed-complete/data-model.md
[warn] docs/design/demo-seed-complete/LOCK.json
[warn] docs/design/demo-seed-complete/overview.md
[warn] docs/design/land-module/api-contract.md
[warn] docs/design/land-module/data-model.md
[warn] docs/design/land-module/domain-rules.md
[warn] docs/design/land-module/edge-cases.md
[warn] docs/design/land-module/glossary.md
[warn] docs/design/land-module/integration-contracts.md
[warn] docs/design/land-module/LOCK.json
[warn] docs/design/land-module/overview.md
[warn] Lesson-learned.md
[warn] package.json
[warn] package.json.bak-workflow-cu.md
[warn] scripts/check-scope.mjs.bak-workflow-cu.md
[warn] scripts/demo/demo-db.ts
[warn] scripts/demo/reset.ts
[warn] scripts/demo/seed.ts
[warn] scripts/oc.mjs.bak-workflow-cu.md
[warn] scripts/verify.mjs.bak-workflow-cu.md
[warn] src/modules/eventing/event-store.ts
[warn] src/modules/eventing/outbox.ts
[warn] src/modules/eventing/read-model.ts
[warn] src/modules/eventing/worker.ts
[warn] src/modules/incidents/commands.ts
[warn] src/modules/incidents/contracts.ts
[warn] src/modules/incidents/index.ts
[warn] src/modules/incidents/projection.ts
[warn] src/modules/inspections/commands.ts
[warn] src/modules/inspections/projection.ts
[warn] src/modules/inspections/schemas.ts
[warn] src/modules/platform/evidence/evidence-service.ts
[warn] src/modules/platform/index.ts
[warn] src/modules/platform/notifications/index.ts
[warn] src/modules/platform/sla/index.ts
[warn] src/modules/residents/commands.ts
[warn] src/modules/residents/contracts.ts
[warn] src/modules/residents/index.ts
[warn] src/modules/residents/projection.ts
[warn] src/modules/residents/seed.ts
[warn] src/modules/vehicles/commands.ts
[warn] tests/integration/demo-seed-reset.integration.test.ts
[warn] workflow-roles/developer.md
[warn] workflow-roles/mentor.md
[warn] workflow-roles/research.md
[warn] workflow-roles/ui-ux.md
[warn] workflow.md
[warn] Code style issues found in 54 files. Run Prettier with --write to fix.
````
