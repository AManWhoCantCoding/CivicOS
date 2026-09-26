# Evidence kiểm tra — 05d-verifier-tree-fingerprint-generated-artifacts

## Lần chạy 1 — 2026-09-26T08:49:06.793Z (only=test)

- HEAD: 17258fc | file chưa commit: 26 | Tree: b1113a8c
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| test | `npm run test` | FAIL | 42.7s |

### Lỗi: test

Log đầy đủ: `.brain/evidence/05d-verifier-tree-fingerprint-generated-artifacts/logs/run1-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo RESIDENT from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo BUSINESS from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo HOTSPOT from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo VIOLATION from the real backend contract
Error: CIVICOS_API_BASE_URL is required for the HTTP contract test
 ❯ get tests/mobile/readonly-http.contract.test.ts:6:23
      4| 
      5| async function get(path: string): Promise<Response> {
      6|   if (!baseUrl) throw new Error('CIVICOS_API_BASE_URL is required for …
       |                       ^
      7|   return fetch(new URL(path, baseUrl));
      8| }
 ❯ tests/mobile/readonly-http.contract.test.ts:23:30

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/8]⎯

 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads counts, incidents, alarms, dispatches, tasks, and the task alias
Error: CIVICOS_API_BASE_URL is required for the HTTP contract test
 ❯ get tests/mobile/readonly-http.contract.test.ts:6:23
      4| 
      5| async function get(path: string): Promise<Response> {
      6|   if (!baseUrl) throw new Error('CIVICOS_API_BASE_URL is required for …
       |                       ^
      7|   return fetch(new URL(path, baseUrl));
      8| }
 ❯ tests/mobile/readonly-http.contract.test.ts:45:47

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/8]⎯

 FAIL  tests/tooling/verify-tree-fingerprint.test.ts > verify tree fingerprint > keeps Tree stable when generated artifacts appear and change
AssertionError: expected 'Tree: 0ee605d2' to be 'Tree: b1113a8c' // Object.is equality

Expected: "Tree: b1113a8c"
Received: "Tree: 0ee605d2"

 ❯ tests/tooling/verify-tree-fingerprint.test.ts:68:25
     66|         'mobile/android/build/__05d_probe__/probe2.bin',
     67|       );
     68|       expect(runTree()).toBe(base);
       |                         ^
     69|       writeFileSync(artifactA, '05d-probe-a-changed-bytes');
     70|       writeFileSync(artifactB, '05d-probe-b-changed-bytes');

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/8]⎯

 FAIL  tests/tooling/verify-tree-fingerprint.test.ts > verify tree fingerprint > changes Tree for tracked config edit
AssertionError: expected 'Tree: 0ffb6786' to be 'Tree: b1113a8c' // Object.is equality

Expected: "Tree: b1113a8c"
Received: "Tree: 0ffb6786"

 ❯ tests/tooling/verify-tree-fingerprint.test.ts:117:23
    115|     }
    116|     expect(readFileSync(trackedConfig, 'utf8')).toBe(original);
    117|     expect(runTree()).toBe(base);
       |                       ^
    118|   });
    119| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/8]⎯
````

## Lần chạy 2 — 2026-09-26T08:59:27.036Z (only=test filter="tests/tooling/verify-tree-fingerprint.test.ts")

- HEAD: 17258fc | file chưa commit: 26 | Tree: 271b63bb
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| test | `npm run test` | FAIL | 5.0s |

### Lỗi: test

Log đầy đủ: `.brain/evidence/05d-verifier-tree-fingerprint-generated-artifacts/logs/run2-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text

> civic-os@0.1.0 test
> vitest run tests/tooling/verify-tree-fingerprint.test.ts


 RUN  v3.2.7 D:/Project/CivicOS

 ❯ tests/tooling/verify-tree-fingerprint.test.ts (5 tests | 2 failed) 3276ms
   ✓ verify tree fingerprint > keeps Tree stable when generated artifacts appear and change  1275ms
   ✓ verify tree fingerprint > changes Tree for untracked source outside build  885ms
   × verify tree fingerprint > changes Tree for tracked config edit 866ms
     → expected 'Tree: b2d67304' to be 'Tree: 271b63bb' // Object.is equality
   ✓ verify tree fingerprint > keeps verifier selection behavior via --check 243ms
   × verify tree fingerprint > limits fingerprint change to generated build output 5ms
     → expected false to be true // Object.is equality

 Test Files  1 failed (1)
      Tests  2 failed | 3 passed (5)
   Start at  15:59:23
   Duration  3.58s (transform 46ms, setup 0ms, collect 39ms, tests 3.28s, environment 0ms, prepare 94ms)


--- stderr ---

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/tooling/verify-tree-fingerprint.test.ts > verify tree fingerprint > changes Tree for tracked config edit
AssertionError: expected 'Tree: b2d67304' to be 'Tree: 271b63bb' // Object.is equality

Expected: "Tree: 271b63bb"
Received: "Tree: b2d67304"

 ❯ tests/tooling/verify-tree-fingerprint.test.ts:130:23
    128|     }
    129|     expect(readFileSync(trackedConfig, 'utf8')).toBe(original);
    130|     expect(runTree()).toBe(base);
       |                       ^
    131|   });
    132| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯

 FAIL  tests/tooling/verify-tree-fingerprint.test.ts > verify tree fingerprint > limits fingerprint change to generated build output
AssertionError: expected false to be true // Object.is equality

- Expected
+ Received

- true
+ false

 ❯ tests/tooling/verify-tree-fingerprint.test.ts:167:7
    165|     expect(
    166|       imports.every((spec) => spec.startsWith('node:') || spec === 'vi…
    167|     ).toBe(true);
       |       ^
    168|   });
    169| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯
````

## Lần chạy 3 — 2026-09-26T09:04:26.817Z (only=test filter="tests/tooling/verify-tree-fingerprint.test.ts")

- HEAD: 17258fc | file chưa commit: 26 | Tree: d9ea4095
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| test | `npm run test` | PASS | 5.4s |

## Lần chạy 4 — 2026-09-26T09:12:38.038Z (only=test filter="tests/tooling/verify-tree-fingerprint.test.ts")

- HEAD: 17258fc | file chưa commit: 26 | Tree: 5bc4410c
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| test | `npm run test` | PASS | 4.9s |

## Lần chạy 5 — 2026-09-26T09:19:47.108Z (only=test filter="tests/tooling/verify-tree-fingerprint.test.ts")

- HEAD: 17258fc | file chưa commit: 26 | Tree: c4aea483
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| test | `npm run test` | PASS | 5.5s |

## Lần chạy 6 — 2026-09-26T09:33:28.752Z (only=test)

- HEAD: 17258fc | file chưa commit: 26 | Tree: c4aea483
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| test | `npm run test` | FAIL | 32.5s |

### Lỗi: test

Log đầy đủ: `.brain/evidence/05d-verifier-tree-fingerprint-generated-artifacts/logs/run6-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
 ↓ tests/integration/parallel-wave-authorization.integration.test.ts (4 tests | 4 skipped)
 ↓ tests/integration/parallel-wave-resilience.integration.test.ts (4 tests | 4 skipped)
 ↓ tests/inspections/inspection-schedule.postgres.test.ts (2 tests | 2 skipped)
 ↓ tests/inspections/inspection-slices-4-6.postgres.test.ts (10 tests | 10 skipped)
 ↓ tests/inspections/inspection-stats.postgres.test.ts (2 tests | 2 skipped)
 ↓ tests/residents/resident-scope-regression.postgres.test.ts (5 tests | 5 skipped)
 ↓ tests/residents/resident-workflow.postgres.test.ts (8 tests | 8 skipped)
 ↓ tests/vehicles/vehicle-watch-slices-4-7.postgres.test.ts (11 tests | 11 skipped)

 Test Files  1 failed | 50 passed | 17 skipped (68)
      Tests  6 failed | 228 passed | 191 skipped (425)
   Start at  16:32:57
   Duration  31.09s (transform 1.32s, setup 0ms, collect 7.57s, tests 7.64s, environment 16ms, prepare 6.02s)


--- stderr ---

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 6 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads layers from the real backend contract
Error: CIVICOS_API_BASE_URL is required for the HTTP contract test
 ❯ get tests/mobile/readonly-http.contract.test.ts:6:23
      4| 
      5| async function get(path: string): Promise<Response> {
      6|   if (!baseUrl) throw new Error('CIVICOS_API_BASE_URL is required for …
       |                       ^
      7|   return fetch(new URL(path, baseUrl));
      8| }
 ❯ tests/mobile/readonly-http.contract.test.ts:12:28

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/6]⎯

 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo RESIDENT from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo BUSINESS from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo HOTSPOT from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo VIOLATION from the real backend contract
Error: CIVICOS_API_BASE_URL is required for the HTTP contract test
 ❯ get tests/mobile/readonly-http.contract.test.ts:6:23
      4| 
      5| async function get(path: string): Promise<Response> {
      6|   if (!baseUrl) throw new Error('CIVICOS_API_BASE_URL is required for …
       |                       ^
      7|   return fetch(new URL(path, baseUrl));
      8| }
 ❯ tests/mobile/readonly-http.contract.test.ts:23:30

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/6]⎯

 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads counts, incidents, alarms, dispatches, tasks, and the task alias
Error: CIVICOS_API_BASE_URL is required for the HTTP contract test
 ❯ get tests/mobile/readonly-http.contract.test.ts:6:23
      4| 
      5| async function get(path: string): Promise<Response> {
      6|   if (!baseUrl) throw new Error('CIVICOS_API_BASE_URL is required for …
       |                       ^
      7|   return fetch(new URL(path, baseUrl));
      8| }
 ❯ tests/mobile/readonly-http.contract.test.ts:45:47

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/6]⎯
````
