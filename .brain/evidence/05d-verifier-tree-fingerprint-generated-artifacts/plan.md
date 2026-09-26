# Plan — 05d-verifier-tree-fingerprint-generated-artifacts (REPAIRED sau Plan Check FAIL 2026-09-26, CHƯA viết code)

## Diễn đạt lại ticket (5 dòng)
- Mục tiêu: ổn định `Tree` fingerprint trước/sau mobile Android build bằng cách loại generated/build artifacts khỏi input fingerprint.
- File được phép sửa: chỉ `scripts/verify.mjs` và `tests/tooling/verify-tree-fingerprint.test.ts` (+ evidence workflow do Tester/Reviewer sinh).
- Giữ nguyên command/check/test/build behavior, không skip/bypass check thật, không sửa production/mobile source, dependency, lockfile, 05a/05b/05c.
- AC chính: AC-01/AC-02 ổn định Tree, AC-03/AC-04 giữ source/config, AC-05 giữ behavior verifier, AC-06 giới hạn diff.
- Phạm vi lần gọi này: chỉ sửa `plan.md`, không viết code, không sửa ticket/`.scratch`, không chạy test/build/lint/typecheck/format.

## 1. File dự định sửa/tạo
| File | Thao tác | Ghi chú phạm vi |
|---|---|---|
| `scripts/verify.mjs` | Sửa (duy nhất 1 file implementation) | Chỉ chạm logic input của `treeFingerprint` — chi tiết (a)(b)(c) ở mục 2; baseline 05a đã có trong file được tách ở mục 6b, không quy nhầm vào patch 05d |
| `tests/tooling/verify-tree-fingerprint.test.ts` | Tạo mới | Regression test RUNTIME `--tree` (T1/T2) + `--check` static/behavior (T3) + scope static (T4); fixture chỉ dưới `mobile/android/**/build/**` (artifact) và 1 probe ngoài `build/` (sensitivity), dọn sạch sau test |
| `.brain/evidence/05d-verifier-tree-fingerprint-generated-artifacts/plan.md` | Sửa (artifact của lần gọi này) | Bản repair sau Plan Check FAIL; evidence PASS/fail runtime do Tester/Reviewer sinh |

- Không tạo/sửa bất kỳ file nào khác: cấm `src/**`, `mobile/src/**`, `mobile/android/**` (chỉ đọc; test tạo fixture tạm dưới `build/**` rồi xóa, không commit), `package.json`, `mobile/package.json`, lockfile, `node_modules/**`, `.env*`, `**/secrets/**`, `05a/05b/05c`, `docs/**`, `.brain/**` khác.

## 2. Hàm/interface dự định đổi
- `scripts/verify.mjs` — giữ nguyên tuyệt đối (baseline, gồm cả phần 05a đã có):
  - `EXCLUDE`, `isExcluded(f)`, thứ tự hash, `sha1.slice(0, 8)`, `runStep` (kể cả nhánh `format:check` + `shell:true` + `filter`), vòng `steps`/`halted`/`keepGoing`, `overall` PASS/FAIL/INCOMPLETE, exit code 0/1/2/64, evidence writer, secret masking, argv validation.
- `scripts/verify.mjs` — patch 05d, đúng 3 điểm (a)(b)(c), không thêm CLI flag, không export symbol mới:
  - (a) `isGeneratedArtifact(f: string): boolean` (1 dòng đầu hàm giải thích mục đích theo convention repo) — predicate thuần túy: chuẩn hóa `f.replace(/\\/g, '/')`, trả `true` khi path bắt đầu `mobile/android/` và có segment `build`. Bao phủ `mobile/android/app/build/**`, `mobile/android/build/**`, mọi `mobile/android/**/build/**` lồng nhau. Trả `false` cho `mobile/android/settings.gradle`, `mobile/android/app/build.gradle`, `mobile/android/gradle.properties`, `mobile/src/**`, `src/**`.
  - (b) Nhánh tracked trong `treeFingerprint()`: `git(['diff', 'HEAD', '--', '.', ...EXCLUDE.map(...)])` → thêm spread pathspec loại artifact (`:!mobile/android/**/build/**`, hằng phụ trợ `GENERATED_EXCLUDES` nếu cần gọn Prettier).
  - (c) Nhánh untracked: `if (isExcluded(f)) continue;` → `if (isExcluded(f) || isGeneratedArtifact(f)) continue;`. Giữ nguyên `statSync` + hash `f:size:mtimeMs` + `try/catch`.
- `tests/tooling/verify-tree-fingerprint.test.ts` — tạo mới theo mẫu `tests/tooling/mobile-build-boundary.test.ts` (`describe/it/expect` của `vitest`, `execFileSync`, `path`):
  - Helper `runTree()` (1 dòng đầu hàm giải thích mục đích): `execFileSync(process.execPath, ['scripts/verify.mjs', '--tree'], { cwd: root, encoding: 'utf8' }).trim()` — gọi đúng fingerprint behavior production, không replicate hash thủ công, không import `verify.mjs`.
  - Fixture artifact: `mobile/android/app/build/__05d_probe__/probe.bin`, `mobile/android/build/__05d_probe__/probe2.bin` — tạo bằng `mkdirSync` recursive + `writeFileSync`, chạm/sửa (ghi thêm byte để đổi size/mtime), xóa bằng `rmSync` recursive trong `finally`; `afterEach` assert không còn residue (`existsSync` false).
  - Fixture sensitivity: untracked `mobile/android/__05d_probe__/probe-config.gradle` (ngoài mọi `build/`, non-ignored — test assert file hiện trong `git ls-files -o --exclude-standard` trước khi assert Tree đổi, tránh false-pass khi bị ignore); tracked `mobile/android/settings.gradle` (đã xác nhận tồn tại) — đọc bytes gốc, append marker, assert Tree đổi, restore bytes gốc trong `finally`, assert restore byte-identical.
  - Không import production/mobile source; không commit fixture; không chạy Android build thật, test/build thật nào ngoài `--tree`/`--check`/`git ls-files`.

## 3. Luồng xử lý chi tiết
- Hiện trạng (`scripts/verify.mjs:143-169`): `treeFingerprint()` hash(1) = `git diff HEAD` (tracked trừ EXCLUDE); hash(2..n) = từng untracked non-ignored `f:size:mtimeMs` (trừ `isExcluded`); mobile build ghi hàng trăm file dưới `mobile/android/**/build/**` → fileset/hash đổi dù source không đổi.
- Sau patch: (a) định nghĩa predicate; (b) tracked diff thêm `:!mobile/android/**/build/**` → artifact không vào hash; (c) untracked bỏ qua khi `isExcluded || isGeneratedArtifact`. Mọi luồng khác (`--tree` in `Tree: ${tree}`, `--check`, `runStep`, exit code, evidence) giữ nguyên.
- Regression test — 4 nhóm, T1/T2 là RUNTIME `--tree` trước/sau (khác bản plan cũ chỉ assert static/predicate):
  - T1 Ổn định (AC-01, Rubric ổn định): `base = runTree()` → tạo 2 fixture artifact → `runTree()` bằng `base` → ghi thêm byte/chạm mtime → `runTree()` vẫn bằng `base` → `finally` xóa → `runTree()` bằng `base` + assert hết residue. Kèm static assert source chứa pathspec artifact ở nhánh diff VÀ guard `isGeneratedArtifact` ở nhánh untracked (bao cả 2 nhánh dù `.gitignore` có che một nhánh).
  - T2 Bảo toàn (AC-03/AC-04, Rubric phạm vi): T2a untracked — tạo probe ngoài `build/`, `runTree()` KHÁC base, xóa, `runTree()` về bằng base. T2b tracked — append marker vào `settings.gradle`, `runTree()` KHÁC base, restore, `runTree()` về bằng base. T2c âm tính — fixture T1 không bao giờ làm Tree đổi (đã chứng minh ở T1); static assert `isGeneratedArtifact` chỉ được gọi trong `treeFingerprint`, không dùng cho check thật.
  - T3 Behavior (AC-05): trong vitest chỉ gọi `--check` (an toàn, không chạy check thật): `--check --scope=mobile`, `--only=mobile:typecheck`, `--check --scope=fast/full` qua `execFileSync` như test mẫu; assert thứ tự/chọn step/RESULT; assert static không có skip/exclude/bypass mới (`runStep`, `shell:true`, `NOT_RUN`, `INCOMPLETE` còn nguyên; `EXCLUDE` không thêm default mới). Profile có step FAIL thật + exit code + `NOT_RUN`/`INCOMPLETE` do Tester chạy thủ công ở B4, không đưa vào vitest.
  - T4 Tối thiểu diff (AC-06): static assert test file chỉ import `node:*` + `vitest`; Tester xác nhận `git status --porcelain` + `git diff --stat` chỉ 2 file (ngoài evidence workflow).

## 4. Bảng map thay đổi ↔ AC + Rubric (mỗi AC/Rubric chặn done đều có evidence trực tiếp)
| # | Thay đổi dự kiến | Map AC | Map Rubric bắt buộc | Map Rubric khuyến nghị (+điểm) | Evidence trực tiếp |
|---|---|---|---|---|---|
| C1 | (a) `isGeneratedArtifact()` + pathspec `:!mobile/android/**/build/**` | AC-01, AC-04 | Ổn định Tree trước/sau build | Ổn định (2/2) | T1 runtime + static 2 nhánh |
| C2 | (b) nhánh tracked thêm pathspec vào `git diff HEAD` | AC-01, AC-02, AC-04 | Ổn định Tree; artifact chỉ loại ở fingerprint | Ổn định (2/2) | T1 runtime + B5 Tester đối chiếu |
| C3 | (c) nhánh untracked thêm `\|\| isGeneratedArtifact(f)` | AC-01, AC-02, AC-04 | Ổn định Tree; artifact chỉ loại ở fingerprint | Ổn định (2/2) | T1 runtime (size/mtime chạm vẫn bằng base) |
| C4 | Giữ nguyên EXCLUDE/isExcluded/hash/`runStep/--check/--only/--scope`/exit/evidence-writer (baseline incl. 05a) | AC-05 | Behavior không đổi, không bypass | Tối thiểu hóa (2/2) | T3 `--check` + B4 Tester fail-profile |
| T1 | Runtime: artifact fixture → `--tree` trước/sau bằng nhau, dọn sạch | AC-01 | Ổn định Tree trước/sau build | Ổn định (2/2, ≥ ngưỡng 1) | Output `Tree <fp>` trước/sau trong test |
| T2 | Runtime: tracked (`settings.gradle`) + untracked probe → `--tree` đổi; artifact không vào fingerprint | AC-03, AC-04 | Source/config vẫn trong fingerprint | Bảo toàn phạm vi (2/2, ≥ ngưỡng 1) | Output `Tree` đổi + về base sau restore |
| T3 | `--check` scope/only + static không-bypass; Tester fail-profile thủ công | AC-05 | Behavior không đổi, không bypass | Tối thiểu hóa (2/2) | `--check` output + evidence Tester B4 |
| T4 | Static scope test + Tester `git status/diff --stat` 2 file | AC-06 | Không sửa business source (cùng C4) | Tối thiểu hóa (2/2) | Diff 2 file, baseline tách ở 6b |
| — | Comment 1 dòng đầu hàm mới (convention repo) | Không map | — | — | Lý do kỹ thuật: bắt buộc bởi quy tắc repo; Tester check prettier/review |
| — | Chuẩn hóa slash `replace(/\\/g, '/')` trong predicate | Không map | — | — | Lý do kỹ thuật: khớp filter ổn định trên Windows; không đổi semantics POSIX |

## 5. Bao phủ đủ 6 bước thực hiện của ticket
- [ ] B1 — Tái hiện baseline (`05a... --scope=mobile` + `--tree`, xác nhận `mobile/android/**/build/**` làm fileset đổi): thuộc Tester (Developer không chạy lệnh); regression T1 là contract thay thế chạy được trong CI (không cần Android build thật).
- [ ] B2 — Điều chỉnh tối thiểu `treeFingerprint`, giữ exclusion/thứ tự/hash, không sửa luồng step: C1 + C2 + C3 + C4; ranh giới baseline 05a ở mục 6b.
- [ ] B3 — Thêm regression test ổn định/bảo toàn/behavior: T1 (runtime Tree không đổi) + T2 (runtime Tree đổi cho tracked+untracked) + T3 + T4.
- [ ] B4 — Chạy regression + `--check/--only/--scope`, xác nhận vẫn chạy test/build thật, không skip/bypass: thuộc Tester; vitest cung cấp T3 (`--check` only); Tester chạy thêm 1 profile có step FAIL thật, ghi exit code + `NOT_RUN`/`INCOMPLETE`, không chỉ `--check`.
- [ ] B5 — Chạy lại mobile verifier PASS sau build, đối chiếu Tree với `--tree` độc lập, lặp sau artifact cập nhật: thuộc Tester; điều kiện cần là C2/C3, điều kiện kiểm chứng là T1 + evidence Tree khớp.
- [ ] B6 — Kiểm tra changed paths/diff, ghi evidence cho blocker 05a/05b/05c; không sửa 3 ticket, AC nghiệp vụ, production/mobile behavior: C4 + T4 + mục 6b + ràng buộc mục 6.

## 6. Ràng buộc scope tái khẳng định
- Chỉ lọc generated/build output khỏi INPUT fingerprint; không dùng filter để loại source/config khỏi check thật; không thêm `--exclude` mặc định mới cho noise agent.
- Pattern giới hạn trong `mobile/android/**/build/**` (không mở rộng sang `**/build/**` toàn repo hay `.gradle/`, `node_modules/` nếu không có bằng chứng Tester yêu cầu; mọi mở rộng phải dừng và xin duyệt plan lại).
- Không sửa thứ tự chọn step, mã thoát, PASS/FAIL/INCOMPLETE, `--check/--only/--scope/filter/keep-going/tail/timeout`, secret masking, evidence format.

## 6b. Ranh giới baseline 05a ↔ patch 05d (yêu cầu Review §Scope dòng 57)
- Working tree hiện đã chứa thay đổi tooling của 05a trong `scripts/verify.mjs`; AC-06 của 05d chỉ tính diff của 05d.
- Patch 05d = ĐÚNG 3 hunk (a)(b)(c) ở mục 2, mọi dòng khác trong `verify.mjs` là baseline (05a hoặc cũ hơn) và phải byte-identical sau patch 05d.
- Tester trước khi Developer sửa: lưu `git diff HEAD -- scripts/verify.mjs` làm baseline; sau patch: diff 05d = baseline-diff trừ đi các hunk (a)(b)(c); Reviewer chỉ map (a)(b)(c) cho 05d, không quy nhầm dòng 05a, không yêu cầu sửa unrelated verifier behavior trong ticket này — phát hiện behavior hỏng ngoài fingerprint → blocker riêng.

## 7. Ghi chú repair sau Plan Check FAIL (Review 2026-09-26)
- FAIL-1 (AC-01 + Rubric ổn định, review mục 1): bản plan cũ T1 chỉ assert source/predicate → đã sửa thành T1 RUNTIME: tạo/chạm artifact thật dưới `mobile/android/**/build/**`, chạy `node scripts/verify.mjs --tree` trước/sau, assert `Tree` bằng nhau, dọn fixture trong `finally` + assert hết residue.
- FAIL-2 (AC-03 + Rubric phạm vi, review mục 2): bản plan cũ T2 chỉ assert predicate `false` → đã sửa thành T2 RUNTIME: 1 tracked (`mobile/android/settings.gradle`, append → Tree đổi → restore byte-identical) + 1 untracked non-ignored probe (tạo → Tree đổi → xóa → về base, có guard `ls-files` chống false-pass khi bị ignore).
- FAIL-3 (B4 chỉ `--check`, review mục 3): giữ T3 vitest ở mức `--check` an toàn + ghi rõ Tester chạy thủ công 1 profile có step FAIL thật, ghi exit code/`NOT_RUN`/`INCOMPLETE` vào evidence.
- FAIL-4 (baseline 05a/05d, review mục 4 + §Scope): thêm mục 6b — patch 05d là đúng 3 hunk (a)(b)(c); Tester lập baseline-diff trước/sau; Reviewer không map nhầm dòng 05a, không đòi sửa unrelated verifier behavior.
- Bảng mục 4 và 6 bước mục 5 đã cập nhật: AC-01/AC-03 và 2 Rubric Stability/Scope mỗi mục đều có test runtime + evidence trực tiếp (cột Evidence trực tiếp); 3 Rubric khuyến nghị đạt 2/2 theo thiết kế plan (chấm cuối vẫn cần diff + evidence Tester thật).
