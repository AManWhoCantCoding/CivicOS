# Ticket 06 — changes (Developer slice)

## File đã sửa trong lần thực thi này
- `eslint.config.mjs`: thêm `qualityGateIgnores` đầu array flat-config, ignore `node_modules/**`, `.next/**`, `out/**`, `coverage/**`, `playwright/.venv/**`, `**/.venv/**`, `playwright/.pytest_cache/**`, `**/.pytest_cache/**`, `playwright/test-results/**`, `test-results/**`, `playwright-report/**`, `**/*.egg-info/**`, `storage/**`, `.brain/**`, `**/__pycache__/**`. Không đổi rule, không `eslint-disable`, không đổi script.
- `.prettierignore`: giữ nguyên 16 dòng cũ, thêm `.brain/`, `.venv/`, `**/.venv/`, `playwright/.venv/`, `playwright/.pytest_cache/`, `**/.pytest_cache/`, `playwright/test-results/`, `test-results/`, `playwright-report/`, `*.egg-info/`, `**/*.egg-info/`, `storage/`, `coverage/`, `__pycache__/`. Prettier tự format lại `eslint.config.mjs` (multiline array) để pass `format:check`.
- `.gitignore`: thêm `storage/`, `*.egg-info/`, `playwright/.pytest_cache/` để ngăn artifact local vào working tree. Không sửa gì khác.

## Không sửa (giữ nguyên theo phạm vi)
- `src/**`, `tests/**`, `playwright.config.ts`, `next.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `README.md`, `playwright/README.md`, `.prettierrc`: không có violation thật nên không đụng.
- Dirty/untracked unrelated trước slice (`.opencode/agent/reviewer.md`, `Lesson-learned.md`, `opencode.jsonc`, `.scratch/*03/04/06/07*`, `docs/Lesson-learned.md`, `storage/`, `playwright/civicos_playwright.egg-info/`): không revert, không stage.
- `next-env.d.ts`: `npm run build` đổi `dev/types` thành `types` (side-effect của build, không thuộc slice này, để nguyên không revert).

## Diagnosis (raw trước thay đổi)
- `npm run lint` exit 1: `11256 problems (2086 errors, 9170 warnings)` trên 185 file entries; 100% message thuộc 41 file trong `playwright/.venv/**` (đại diện: `no-require-imports`, `no-unused-vars`, `no-explicit-any`, `no-empty-object-type` trong driver bundle/vite assets/types). 144 file app-source (`eslint.config.mjs`, `next/playwright/postcss/vitest config`, `src/**`, `tests/**`) có 0 message.
- `npm run format:check` exit 1: 8 file `list-different`: 7 file `.brain/evidence/{01,02-native-harness-login,03-native-acceptance-gate,05-windows-next-transport-harness}/*.md` (evidence ticket khác, cấm sửa) + `playwright/.pytest_cache/README.md` (cache generated). 0 violation trong source/config/docs thuộc phạm vi.
- Raw log đầy đủ: `/tmp/opencode/lint-before.txt` (13153 dòng, `LINT_EXIT=1`), `/tmp/opencode/format-before.txt` (`FORMAT_EXIT=1`).

## Boundary check sau thay đổi
- Probe dương lint: `src/_violation_probe.ts` với `any` bị `npx eslint` báo `no-explicit-any` exit 1 rồi xoá.
- Probe dương format: `src/_format_probe.ts` cố ý sai spacing bị `prettier --check` báo exit 1 rồi xoá.
- Probe âm: `playwright/.venv/.../cli.js` báo `File ignored because of a matching ignore pattern` (lint exit 0); `playwright/.pytest_cache/README.md` và `.brain/evidence/01/review.md` có `file-info ignored:true`, `prettier --check` exit 0.

## Kết quả sau thay đổi (từ repo root, nguyên văn command)
- `npm run lint` exit 0 (output chỉ `> eslint .`, không findings).
- `npm run format:check` exit 0 (`All matched files use Prettier code style!`).
- `npm run typecheck` exit 0 (`tsc --noEmit`, không output).
- `npm test` exit 0: `Test Files 13 passed | 4 skipped (17)`, `Tests 21 passed | 7 skipped (28)`, postgres suite skip (không có DB container, giữ nguyên Docker data/container, không chạm DB).
- `npm run build` exit 0 (route list đầy đủ, static/dynamic như log; side-effect duy nhất là `next-env.d.ts` như trên).
- Raw sau: `/tmp/opencode/lint-after.txt`, `/tmp/opencode/format-after.txt`, `/tmp/opencode/typecheck-after.txt`, `/tmp/opencode/test-after.txt`, `/tmp/opencode/build-after.txt`.

## Follow-up slice (khôi phục next-env.d.ts sau build)
- `next-env.d.ts`: khôi phục tracked ban đầu (`./.next/dev/types/routes.d.ts` và `./.next/dev/types/root-params.d.ts`), revert side-effect `npm run build` đổi thành `./.next/types/`. Không sửa file Ticket05/unrelated nào, không đụng `.scratch/**`, không commit.
- Verify: `git diff -- next-env.d.ts` không còn output (exit 0, empty).

## Follow-up 2026-09-20 (cleanup sau native `npm.cmd run build`)
- `next-env.d.ts`: khôi phục imports tracked ban đầu về `./.next/dev/types/routes.d.ts` và `./.next/dev/types/root-params.d.ts` (revert side-effect build đổi sang `./.next/types/`). Không sửa config/source/Ticket05/unrelated, không commit.
- Verify: `git diff -- next-env.d.ts` rỗng (exit 0, no output); `git diff --stat -- next-env.d.ts` rỗng.
