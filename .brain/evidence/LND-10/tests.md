# Verification evidence — LND-10

- `npx vitest run tests/land/lnd10-national-land-adapter.test.ts tests/land/`:
  **7 files passed, 1 skipped; 89 tests passed, 59 skipped**.
- `npx tsc --noEmit`: **PASS**.
- Scoped ESLint, including `--no-ignore` for the test file: **PASS**.
- Scoped Prettier check for all three LND-10 files: **PASS**.
