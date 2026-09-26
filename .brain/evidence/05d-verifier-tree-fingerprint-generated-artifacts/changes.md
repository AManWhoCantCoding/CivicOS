# Changes — 05d-verifier-tree-fingerprint-generated-artifacts (green phase)

Mục tiêu: loại generated Android build output khỏi input `treeFingerprint` để Tree ổn định trước/sau build.
File được phép sửa: chỉ `scripts/verify.mjs` và `tests/tooling/verify-tree-fingerprint.test.ts` (+ evidence này).
AC chính: AC-01/AC-02 Tree ổn định trước/sau artifact; AC-03/AC-04 tracked/untracked relevant vẫn đổi Tree; AC-05 giữ behavior verifier; AC-06 diff tối thiểu.
Red phase (Tester đã xác nhận): T1 đỏ đúng lỗi artifact làm Tree đổi; 6 lỗi HTTP contract thiếu `CIVICOS_API_BASE_URL` ngoài phạm vi, không sửa.
Green phase này: patch đúng 3 điểm (a)(b)(c) trong `treeFingerprint` + hoàn thiện regression T3/T4; chưa chạy kiểm tra (Tester xác nhận).

## File đã sửa (vòng green này)

- `scripts/verify.mjs` (đúng 3 hunk fingerprint, mọi dòng ngoài 3 hunk byte-identical với baseline):
  - (a) thêm `isGeneratedArtifact(f)`: chuẩn hóa slash, `true` khi path dưới `mobile/android/` và có segment `build`; bao `app/build/**`, `build/**`, mọi `**/build/**` lồng nhau; `false` cho `settings.gradle`, `app/build.gradle`, `gradle.properties`, `mobile/src/**`, `src/**`.
  - (b) nhánh tracked: `git diff HEAD` thêm pathspec `:!mobile/android/**/build/**`, artifact không vào hash.
  - (c) nhánh untracked: `if (isExcluded(f)) continue;` thành `if (isExcluded(f) || isGeneratedArtifact(f)) continue;`; giữ `statSync` size/mtime + `try/catch`.
  - Giữ nguyên `EXCLUDE`, thứ tự/hash, `sha1.slice(0, 8)`, `runStep`/`--check`/`--only`/`--scope`/status/exit/evidence/masking.
- `tests/tooling/verify-tree-fingerprint.test.ts` (giữ T1/T2 runtime red-phase, thêm T3/T4 còn thiếu của B3):
  - T1/T2 giữ nguyên: artifact ở 2 build dirs không đổi Tree dù size/mtime/fileset đổi; tracked `settings.gradle` + untracked probe ngoài build đổi Tree; cleanup `finally`/`afterEach` + guard `ls-files` + format `Tree: [0-9a-f]{8}`; chỉ import `node:*` + `vitest`.
  - T3 mới: `--check` scope mobile/only typecheck/full qua subprocess, assert chọn step + `RESULT`; static không-bypass (`runStep`, `shell: true`, `NOT_RUN`, `INCOMPLETE` còn nguyên).
  - T4 mới: static pathspec ở nhánh diff + guard ở nhánh untracked, `isGeneratedArtifact` chỉ dùng trong fingerprint (2 điểm xuất hiện), import test chỉ `node:*`/`vitest`.
- `.brain/evidence/05d-verifier-tree-fingerprint-generated-artifacts/changes.md`: evidence vòng green này.
- Không đổi: `package.json`, 05a/05b/05c, production/mobile source/behavior, dependency/lockfile; không workaround HTTP contract/`CIVICOS_API_BASE_URL`.

## Vòng sửa test theo Tester báo fail (không sửa implementation)
- `tests/tooling/verify-tree-fingerprint.test.ts`:
  - Tracked fixture: `mobile/android/settings.gradle` (untracked trong checkout) thành root `tsconfig.json` (tracked relevant config ngoài build output); giữ nguyên logic append marker, restore byte-identical, assert Tree đổi rồi về base.
  - Parser import static: thay lọc từng dòng `startsWith('import ')` bằng `matchAll(/import\s+[\s\S]*?from\s+'([^']+)'/g)` toàn file để bắt đúng multi-line `from`; giữ assert mọi spec là `node:*` hoặc `vitest`, không skip/ignore, giữ test runtime.
- Không đổi: `scripts/verify.mjs`, `package.json`, production/05a/05b/05c.

## Vòng sửa lỗi 1 (2026-09-26) — `.gradle` cache làm Tree đổi sau `scope=mobile` PASS
- `scripts/verify.mjs` (đúng 2 hunk fingerprint, không chạm verifier steps/check/status/exit):
  - `isGeneratedArtifact(f)`: `split('/').includes('build')` thành `split('/').some((s) => s === 'build' || s === '.gradle')`; vẫn chuẩn hóa slash, vẫn `startsWith('mobile/android/')`, vẫn so khớp segment chính xác nên `settings.gradle`, `app/build.gradle`, `gradle.properties` trả `false`.
  - Nhánh tracked: thêm pathspec `:!mobile/android/**/.gradle/**` cạnh `:!mobile/android/**/build/**`; nhánh untracked giữ nguyên guard `isExcluded(f) || isGeneratedArtifact(f)`.
- `tests/tooling/verify-tree-fingerprint.test.ts`:
  - Thêm fixture runtime `mobile/android/.gradle/__05d_probe__/probe-gradle.bin`: tạo/sửa byte trong T1, assert `untracked()` chứa path, assert `runTree()` bằng base, xóa trong `finally`, `afterEach` assert hết residue.
  - T4 static: thêm assert chứa `:!mobile/android/**/.gradle/**`; giữ assert build pathspec, guard untracked, `isGeneratedArtifact` 2 điểm xuất hiện, import chỉ `node:*`/`vitest`; giữ T2/T3 nguyên (build dirs, tracked `tsconfig.json`, untracked probe ngoài build, `--check` behavior).
- Không đổi vòng này: `package.json`, 05a/05b/05c, production/mobile source/behavior, dependency/lockfile; không chạy test/lint/typecheck/format/build/verify (Tester xác nhận).

## Vòng sửa lỗi 2 (2026-09-26) — `.cxx` CMake artifacts làm Tree đổi sau `scope=mobile` PASS
- `scripts/verify.mjs` (đúng 2 hunk fingerprint, không chạm verifier steps/check/status/exit):
  - `isGeneratedArtifact(f)`: thêm segment `.cxx` vào `some(...)` (`build`/`gradle` giữ nguyên); vẫn chuẩn hóa slash, vẫn `startsWith('mobile/android/')`, vẫn so khớp segment chính xác nên `settings.gradle`, `app/build.gradle`, `gradle.properties` trả `false`.
  - Nhánh tracked: thêm pathspec `:!mobile/android/**/.cxx/**` cạnh `:!mobile/android/**/build/**` và `:!mobile/android/**/.gradle/**`; nhánh untracked giữ nguyên guard `isExcluded(f) || isGeneratedArtifact(f)`.
- `tests/tooling/verify-tree-fingerprint.test.ts`:
  - Thêm fixture runtime `mobile/android/app/.cxx/__05d_probe__/probe-cxx.bin`: tạo/sửa byte trong T1, assert `untracked()` chứa path, assert `runTree()` bằng base, xóa trong `finally`, `afterEach` assert hết residue.
  - T4 static: thêm assert chứa `:!mobile/android/**/.cxx/**`; giữ assert build/`.gradle` pathspec, guard untracked, `isGeneratedArtifact` 2 điểm xuất hiện, import chỉ `node:*`/`vitest`; giữ T2/T3 nguyên (tracked `tsconfig.json`, untracked probe ngoài build, `--check` behavior).
- Không đổi vòng này: `package.json`, 05a/05b/05c, production/mobile source/behavior, dependency/lockfile; không chạy test/lint/typecheck/format/build/verify (Tester xác nhận).
