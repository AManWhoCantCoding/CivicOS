# Ticket 06 — Tester verification

Native rerun on 2026-09-20. Commands ran through Windows PowerShell and Windows Node/npm. No source files were changed; temporary probes were removed immediately and none remain in the repository.

## Commands and raw results

### `powershell.exe -NoProfile -NonInteractive -Command "Set-Location 'D:\Project\CivicOS'; npm.cmd run lint"`

```text
> civic-os@0.1.0 lint
> eslint .
```

Exit code: `0`

### `powershell.exe -NoProfile -NonInteractive -Command "Set-Location 'D:\Project\CivicOS'; npm.cmd run format:check"`

```text
> civic-os@0.1.0 format:check
> prettier --check .

Checking formatting...
All matched files use Prettier code style!
```

Exit code: `0`

### `powershell.exe -NoProfile -NonInteractive -Command "Set-Location 'D:\Project\CivicOS'; npm.cmd run typecheck"`

```text
> civic-os@0.1.0 typecheck
> tsc --noEmit
```

Exit code: `0`

### `powershell.exe -NoProfile -NonInteractive -Command "Set-Location 'D:\Project\CivicOS'; npm.cmd test"`

```text
> civic-os@0.1.0 test
> vitest run

Test Files  13 passed | 4 skipped (17)
Tests       21 passed | 7 skipped (28)
```

Exit code: `0`

### `docker.exe compose up -d postgres`

```text
 Container civicos-postgres-1 Running
```

Exit code: `0`

### `powershell.exe -NoProfile -NonInteractive -Command "Set-Location 'D:\Project\CivicOS'; $env:RUN_DB_TESTS='1'; npm.cmd test"`

```text
> civic-os@0.1.0 test
> vitest run

Test Files  17 passed (17)
Tests       28 passed (28)
```

Exit code: `0`

### `powershell.exe -NoProfile -NonInteractive -Command "Set-Location 'D:\Project\CivicOS'; npm.cmd run build"`

```text
> civic-os@0.1.0 build
> next build

▲ Next.js 16.3.5 (Turbopack)
✓ Compiled successfully in 1149ms
  Running TypeScript ...
  Finished TypeScript in 2.9s ...
✓ Generating static pages using 11 workers (26/26) in 392ms
```

Exit code: `0`

## Boundary and real-violation probes

### ESLint violation probe

Temporary `src/_ticket06-eslint-probe.ts` contained `const unusedProbe = 1;`, then was removed:

```text
D:\Project\CivicOS\src\_ticket06-eslint-probe.ts
  1:7  warning  'unusedProbe' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (0 errors, 1 warning)

ESLINT_PROBE_EXIT_CODE=0
```

### Prettier violation probe

Temporary `src/_ticket06-format-probe.ts` contained deliberately unformatted code, then was removed:

```text
Checking formatting...
[warn] src/_ticket06-format-probe.ts
[warn] Code style issues found in the above file. Run Prettier with --write to fix.
PRETTIER_PROBE_EXIT_CODE=1
```

### Ignored evidence boundary

```text
{ "ignored": true, "inferredParser": null }
PRETTIER_FILE_INFO_EXIT_CODE=0

D:\Project\CivicOS\.brain\evidence\06-lint-format-quality-gates\tests.md
  0:0  warning  File ignored because of a matching ignore pattern. Use "--no-ignore" to disable file ignore settings or use "--no-warn-ignored" to suppress this warning

✖ 1 problem (0 errors, 1 warning)

ESLINT_BOUNDARY_EXIT_CODE=0
```

`git check-ignore -v` matched `node_modules/`, `.next/`, `playwright/.venv/`, `playwright/.pytest_cache/`, and `storage/`.

## Generated-file check after build

`git diff -- next-env.d.ts`:

```diff
diff --git a/next-env.d.ts b/next-env.d.ts
index a419cbe..ce4e94a 100644
--- a/next-env.d.ts
+++ b/next-env.d.ts
@@ -1,7 +1,7 @@
 /// <reference types="next" />
 /// <reference types="next/image-types/global" />
-import "./.next/dev/types/routes.d.ts";
-import "./.next/dev/types/root-params.d.ts";
+import "./.next/types/routes.d.ts";
+import "./.next/types/root-params.d.ts";
```

Build regenerated the imports from `.next/dev/types/...` to `.next/types/...`; no manual correction was made.

## Diff audit

Current dirty/untracked files outside Ticket 06 remain untouched, including Ticket 05 and `.scratch` paths. Ticket 06 allowlist observed: `eslint.config.mjs`, `.prettierignore`, `.gitignore`, `.brain/evidence/06-lint-format-quality-gates/*`; `next-env.d.ts` is the separate generated build change shown above.
