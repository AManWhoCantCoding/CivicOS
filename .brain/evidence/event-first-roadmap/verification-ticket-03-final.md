# Ticket 03 final native verification

Date: 2026-09-21

## Environment

- Native Windows PowerShell used with `D:\Project\CivicOS`.
- `docker info`: Docker Desktop server available, context `desktop-linux`.
- `docker compose up -d`: `civicos-postgres-1 Running`.
- No database reset command was run.

## Verification results

1. `$env:RUN_DB_TESTS='1'; npx.cmd vitest run tests/platform`
   - Passed: 24; failed: 0; skipped: 0.
   - Test files: 5 passed.
   - The first shell-wrapper attempt expanded `$env` before PowerShell and emitted `The term ':RUN_DB_TESTS=1' is not recognized ...`; the command was immediately rerun with the native PowerShell environment assignment, producing the result above.

2. `$env:RUN_DB_TESTS='1'; npm.cmd test`
   - Passed: 78; failed: 0; skipped: 0.
   - Test files: 21 passed.

3. Quality/build commands:
   - `npm.cmd run typecheck`: passed (exit 0).
   - `npm.cmd run lint`: passed (exit 0).
   - `npm.cmd run build`: passed (Next.js production build completed; exit 0).

4. Playwright:
   - `npx.cmd playwright test tests/e2e/field-shell.spec.ts`: 14 passed, 0 failed.
   - `npx.cmd playwright test tests/e2e/evidence-authorization.spec.ts`: 6 passed, 0 failed.
   - `npm.cmd run test:e2e`: 36 passed, 0 failed.

## S9 assertion confirmation

The field-shell S9 test is not class-name-only:

- It asserts `retry.boundingBox().height >= 44`.
- In page evaluation it reads the actual action rectangle via `getBoundingClientRect()` and asserts `actionHeight >= 44`.
- It reads computed foreground/background colors, converts colors to RGB, calculates relative luminance, calculates contrast ratio, and asserts both action and status ratios are `>= 4.5`.

## Migration status

`npx.cmd prisma migrate status` reported:

```text
5 migrations found in prisma/migrations
Database schema is up to date!
```

No remaining blocker observed within the requested verification scope.
