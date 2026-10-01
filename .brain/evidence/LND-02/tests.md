# Evidence kiểm tra — LND-02

## Lần chạy 1 — 2026-09-30T13:03:06.609Z (scope=fast)

- HEAD: 087f8e9 | file chưa commit: 24 | Tree: c47b75f4
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| typecheck | `npm run typecheck` | PASS | 9.5s |
| lint | `npm run lint` | PASS | 70.5s |
| format:check | `npm run format:check` | FAIL | 32.6s |
| test | `npm run test` | FAIL | 130.0s |

### Lỗi: format:check

Log đầy đủ: `.brain/evidence/LND-02/logs/run1-format_check.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
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
[warn] docs/research/land-module/law-vn.md
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
[warn] src/modules/land/parcel-geometry.ts
[warn] src/modules/land/parcel-repository.ts
[warn] src/modules/land/parcel-service.ts
[warn] src/modules/land/party-repository.ts
[warn] src/modules/land/party-service.ts
[warn] src/modules/land/schemas.ts
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
[warn] tests/land/lnd02-party-parcel.test.ts
[warn] workflow-roles/developer.md
[warn] workflow-roles/mentor.md
[warn] workflow-roles/research.md
[warn] workflow-roles/ui-ux.md
[warn] workflow.md
[warn] Code style issues found in 62 files. Run Prettier with --write to fix.
````

### Lỗi: test

Log đầy đủ: `.brain/evidence/LND-02/logs/run1-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/annotations/pointannotation/': Filename too long
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/sources/tilesources/rasterdemsource/': Filename too long
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/sources/tilesources/rastersource/': Filename too long
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/sources/tilesources/vectorsource/': Filename too long
warning: in the working copy of '.brain/evidence/05e-verifier-tree-fingerprint-build-checkpoint/digest.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05e-verifier-tree-fingerprint-build-checkpoint/tests.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/_infra-status.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/metrics.csv', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.scratch/land-module/workflow-status.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/civicos-e1-clone-mvp/api-contract.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/civicos-e1-clone-mvp/data-model.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/civicos-e1-clone-mvp/domain-rules.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/civicos-e1-clone-mvp/edge-cases.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/civicos-e1-clone-mvp/glossary.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/civicos-e1-clone-mvp/overview.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/demo-seed-complete/LOCK.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/demo-seed-complete/api-contract.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/demo-seed-complete/data-model.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/demo-seed-complete/overview.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/land-module/LOCK.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/land-module/api-contract.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/land-module/data-model.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/land-module/domain-rules.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/land-module/edge-cases.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/land-module/glossary.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/land-module/integration-contracts.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/land-module/overview.md', LF will be replaced by CRLF the next time Git touches it

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

## Lần chạy 2 — 2026-09-30T13:06:06.729Z (scope=fast)

- HEAD: 087f8e9 | file chưa commit: 29 | Tree: 4b67c46f
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| typecheck | `npm run typecheck` | PASS | 13.6s |
| lint | `npm run lint` | PASS | 17.0s |
| format:check | `npm run format:check` | FAIL | 25.4s |
| test | `npm run test` | FAIL | 69.9s |

### Lỗi: format:check

Log đầy đủ: `.brain/evidence/LND-02/logs/run2-format_check.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
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
[warn] Code style issues found in 96 files. Run Prettier with --write to fix.
````

### Lỗi: test

Log đầy đủ: `.brain/evidence/LND-02/logs/run2-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/sources/tilesources/rastersource/': Filename too long
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/sources/tilesources/vectorsource/': Filename too long
warning: in the working copy of '.brain/evidence/05a-mobile-build-boundary-fix/digest.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05a-mobile-build-boundary-fix/tests.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05e-verifier-tree-fingerprint-build-checkpoint/digest.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05e-verifier-tree-fingerprint-build-checkpoint/tests.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/_infra-status.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/metrics.csv', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.scratch/land-module/workflow-status.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/civicos-e1-clone-mvp/api-contract.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/civicos-e1-clone-mvp/data-model.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/civicos-e1-clone-mvp/domain-rules.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/civicos-e1-clone-mvp/edge-cases.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/civicos-e1-clone-mvp/glossary.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/civicos-e1-clone-mvp/overview.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/demo-seed-complete/LOCK.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/demo-seed-complete/api-contract.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/demo-seed-complete/data-model.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/demo-seed-complete/overview.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/land-module/LOCK.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/land-module/api-contract.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/land-module/data-model.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/land-module/domain-rules.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/land-module/edge-cases.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/land-module/glossary.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/land-module/integration-contracts.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/land-module/overview.md', LF will be replaced by CRLF the next time Git touches it

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

## Lần chạy 3 — 2026-09-30T13:21:18.705Z (scope=fast)

- HEAD: 087f8e9 | file chưa commit: 30 | Tree: c6fdb85e
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| typecheck | `npm run typecheck` | PASS | 5.5s |
| lint | `npm run lint` | PASS | 16.8s |
| format:check | `npm run format:check` | FAIL | 26.0s |
| test | `npm run test` | FAIL | 69.8s |

### Lỗi: format:check

Log đầy đủ: `.brain/evidence/LND-02/logs/run3-format_check.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
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
[warn] Code style issues found in 96 files. Run Prettier with --write to fix.
````

### Lỗi: test

Log đầy đủ: `.brain/evidence/LND-02/logs/run3-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/sources/tilesources/vectorsource/': Filename too long
warning: in the working copy of '.brain/evidence/05a-mobile-build-boundary-fix/digest.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05a-mobile-build-boundary-fix/tests.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05e-verifier-tree-fingerprint-build-checkpoint/digest.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05e-verifier-tree-fingerprint-build-checkpoint/tests.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/_infra-status.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/metrics.csv', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.scratch/land-module/workflow-status.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'Lesson-learned.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/civicos-e1-clone-mvp/api-contract.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/civicos-e1-clone-mvp/data-model.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/civicos-e1-clone-mvp/domain-rules.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/civicos-e1-clone-mvp/edge-cases.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/civicos-e1-clone-mvp/glossary.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/civicos-e1-clone-mvp/overview.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/demo-seed-complete/LOCK.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/demo-seed-complete/api-contract.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/demo-seed-complete/data-model.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/demo-seed-complete/overview.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/land-module/LOCK.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/land-module/api-contract.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/land-module/data-model.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/land-module/domain-rules.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/land-module/edge-cases.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/land-module/glossary.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/land-module/integration-contracts.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/land-module/overview.md', LF will be replaced by CRLF the next time Git touches it

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

## Lần chạy 4 — 2026-09-30T13:26:53.025Z (scope=fast)

- HEAD: 087f8e9 | file chưa commit: 30 | Tree: a0997960
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| typecheck | `npm run typecheck` | PASS | 5.6s |
| lint | `npm run lint` | PASS | 16.7s |
| format:check | `npm run format:check` | FAIL | 25.4s |
| test | `npm run test` | FAIL | 69.6s |

### Lỗi: format:check

Log đầy đủ: `.brain/evidence/LND-02/logs/run4-format_check.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
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
[warn] Code style issues found in 96 files. Run Prettier with --write to fix.
````

### Lỗi: test

Log đầy đủ: `.brain/evidence/LND-02/logs/run4-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
warning: could not open directory 'mobile/node_modules/@maplibre/maplibre-react-native/android/build/.transforms/cd95fe503500587b40d884f94235f7e1/transformed/bundleLibRuntimeToDirDebug/bundleLibRuntimeToDirDebug_dex/org/maplibre/reactnative/components/sources/tilesources/vectorsource/': Filename too long
warning: in the working copy of '.brain/evidence/05a-mobile-build-boundary-fix/digest.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05a-mobile-build-boundary-fix/tests.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05e-verifier-tree-fingerprint-build-checkpoint/digest.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05e-verifier-tree-fingerprint-build-checkpoint/tests.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/_infra-status.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/metrics.csv', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.scratch/land-module/workflow-status.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'Lesson-learned.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/civicos-e1-clone-mvp/api-contract.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/civicos-e1-clone-mvp/data-model.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/civicos-e1-clone-mvp/domain-rules.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/civicos-e1-clone-mvp/edge-cases.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/civicos-e1-clone-mvp/glossary.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/civicos-e1-clone-mvp/overview.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/demo-seed-complete/LOCK.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/demo-seed-complete/api-contract.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/demo-seed-complete/data-model.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/demo-seed-complete/overview.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/land-module/LOCK.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/land-module/api-contract.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/land-module/data-model.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/land-module/domain-rules.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/land-module/edge-cases.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/land-module/glossary.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/land-module/integration-contracts.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/design/land-module/overview.md', LF will be replaced by CRLF the next time Git touches it

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

## Lần chạy 5 — 2026-09-30T13:29:07.208Z (scope=full)

- HEAD: 087f8e9 | file chưa commit: 30 | Tree: a0997960
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | SKIPPED | - |
| typecheck | `npm run typecheck` | PASS | 4.1s |
| lint | `npm run lint` | PASS | 17.0s |
| format:check | `npm run format:check` | FAIL | 25.9s |
| test | `npm run test` | NOT_RUN | - |
| test:e2e | `npm run test:e2e` | NOT_RUN | - |
| build | `npm run build` | NOT_RUN | - |

### Lỗi: format:check

Log đầy đủ: `.brain/evidence/LND-02/logs/run5-format_check.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
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
[warn] Code style issues found in 96 files. Run Prettier with --write to fix.
````

## Lần chạy 6 — 2026-09-30T13:45:16.314Z (only=test filter="tests/land/lnd02-party-parcel.test.ts")

- HEAD: 087f8e9 | file chưa commit: 30 | Tree: b45fa82a
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| test | `npm run test` | FAIL | 2.2s |

### Lỗi: test

Log đầy đủ: `.brain/evidence/LND-02/logs/run6-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text

Raw query failed. Code: `23505`. Message: `Key ("organizationId", "mapSheetNumber", "parcelNumber")=(lnd02-ou-a-f4628b39, SHEET-f4628b39-DUP, NUM-f4628b39-DUP) already exists.`

 ❯ tests/land/lnd02-party-parcel.test.ts (26 tests | 1 failed) 293ms
   ✓ LND-02 party privacy helpers > masks identity numbers keeping four trailing characters 2ms
   ✓ LND-02 party privacy helpers > maps stored rows without ciphertext internals 1ms
   ✓ LND-02 input schemas > parses valid party input with nullable identity number 0ms
   ✓ LND-02 input schemas > rejects party input with missing name or unknown type 1ms
   ✓ LND-02 input schemas > parses valid parcel input with DecimalString area 0ms
   ✓ LND-02 input schemas > rejects parcel input with bad area or geometry 1ms
   ✓ LND-02 input schemas > checks DecimalString and list query bounds 1ms
   ✓ LND-02 input schemas > round-trips opaque cursors and rejects garbage 0ms
   ✓ LND-02 geometry seam > accepts closed polygons and rejects points 1ms
   ✓ LND-02 geometry seam > round-trips ST_AsGeoJSON payloads 1ms
   ✓ LND-02 geometry seam > normalizes numeric output to DecimalString 0ms
   ✓ LND-02 geometry seam > maps stored parcel rows without storage internals 0ms
   ✓ LND-02 error mapping > maps internal codes to Vietnamese LAND_* errors 1ms
   ✓ LND-02 scope and sensitive gates > enforces land role and organization presence 1ms
   ✓ LND-02 scope and sensitive gates > denies party sensitive reads without read_sensitive 25ms
   ✓ LND-02 scope and sensitive gates > rejects service calls from actors outside scope 1ms
   ✓ LND-02 party/parcel database seam > stores ciphertext and blind index without plaintext 19ms
   ✓ LND-02 party/parcel database seam > rejects duplicate party reference codes 41ms
   ✓ LND-02 party/parcel database seam > scopes party lists to linked organizations only 53ms
   ✓ LND-02 party/parcel database seam > writes and reads valid polygons at version 1 37ms
   × LND-02 party/parcel database seam > creates parcel ids in Cuid contract format 10ms
     → expected '920dd191-8e47-466b-96d9-25251d13c74a' to match /^c[a-z0-9]+$/
   ✓ LND-02 party/parcel database seam > rejects self-intersecting polygons without new rows 5ms
   ✓ LND-02 party/parcel database seam > rejects duplicate parcel codes and sheet-number pairs 12ms
   ✓ LND-02 party/parcel database seam > paginates parcel lists with opaque cursors 46ms
   ✓ LND-02 party/parcel database seam > hides organization parcels from other units 24ms
   ✓ LND-02 party/parcel database seam > keeps party creates fail-closed without read_sensitive 6ms

 Test Files  1 failed (1)
      Tests  1 failed | 25 passed (26)
   Start at  20:45:13
   Duration  952ms (transform 278ms, setup 0ms, collect 394ms, tests 293ms, environment 0ms, prepare 93ms)


--- stderr ---

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/land/lnd02-party-parcel.test.ts > LND-02 party/parcel database seam > creates parcel ids in Cuid contract format
AssertionError: expected '920dd191-8e47-466b-96d9-25251d13c74a' to match /^c[a-z0-9]+$/

- Expected: 
/^c[a-z0-9]+$/

+ Received: 
"920dd191-8e47-466b-96d9-25251d13c74a"

 ❯ tests/land/lnd02-party-parcel.test.ts:510:26
    508|     );
    509|     try {
    510|       expect(created.id).toMatch(/^c[a-z0-9]+$/);
       |                          ^
    511|       expect(created.id).not.toContain('-');
    512|     } finally {

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯
````

## Lần chạy 7 — 2026-09-30T13:46:10.288Z (only=test filter="tests/land/lnd02-party-parcel.test.ts")

- HEAD: 087f8e9 | file chưa commit: 30 | Tree: 743e3089
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| test | `npm run test` | PASS | 2.2s |

## Lần chạy 10 — 2026-09-30T23:00:07+07:00 (Mentor targeted review)

- HEAD: `087f8e9`; không commit thay đổi LND-02.
- Kết quả: **PASS**.

| Bước | Lệnh | Kết quả |
|---|---|---|
| DB-gated test | `node -e "(async()=>{process.env.RUN_DB_TESTS='1'; const {startVitest}=require('vitest/node'); await startVitest('test',['tests/land/lnd02-party-parcel.test.ts']);})().catch((error)=>{console.error(error);process.exitCode=1})"` | PASS — 29/29 |
| targeted test không DB | `npx vitest run tests/land/lnd02-party-parcel.test.ts` | PASS — 16 passed, 13 skipped |
| typecheck | `npx tsc --noEmit` | PASS |
| lint | `npx eslint src/modules/land src/app/api/land/parties/route.ts src/app/api/land/parcels/route.ts tests/land/lnd02-party-parcel.test.ts` | PASS |
| format scoped | `npx prettier --check src/modules/land/access.ts src/modules/land/party-repository.ts src/modules/land/party-service.ts src/modules/land/parcel-repository.ts src/modules/land/parcel-service.ts tests/land/lnd02-party-parcel.test.ts` | PASS |

## Lần chạy 8 — 2026-09-30T13:52:37.117Z (scope=full)

- HEAD: 087f8e9 | file chưa commit: 30 | Tree: 743e3089
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | SKIPPED | - |
| typecheck | `npm run typecheck` | PASS | 7.0s |
| lint | `npm run lint` | PASS | 17.8s |
| format:check | `npm run format:check` | FAIL | 26.4s |
| test | `npm run test` | NOT_RUN | - |
| test:e2e | `npm run test:e2e` | NOT_RUN | - |
| build | `npm run build` | NOT_RUN | - |

### Lỗi: format:check

Log đầy đủ: `.brain/evidence/LND-02/logs/run8-format_check.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
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
[warn] Code style issues found in 96 files. Run Prettier with --write to fix.
````

## Lần chạy 9 — 2026-09-30T13:54:43.818Z (only=test filter="tests/land/lnd02-party-parcel.test.ts")

- HEAD: 087f8e9 | file chưa commit: 30 | Tree: 743e3089
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| test | `npm run test` | PASS | 2.2s |
