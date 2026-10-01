# Verification evidence — LND-07

## TDD

- Red evidence from Developer: five review-regression tests failed before repair (three extra-subject cases, share multiset mismatch, canonical share order); follow-up Red reproduced tampered retry replaying instead of conflicting.
- Green evidence: all regressions pass after repair.

## Commands and results

| Scope | Command/result |
|---|---|
| Focused DB | `LND-07 41 passed`, `LND-06 30 passed` with `RUN_DB_TESTS=1` |
| Phase-01/02 land + UI + LND-04 identity | 8 test files, `174 passed` with `RUN_DB_TESTS=1` |
| Typecheck | `npx tsc --noEmit` — PASS |
| Lint | `npx eslint src/modules/land/change-validation.ts src/modules/land/application-service.ts tests/land/lnd07-change-validation.test.ts tests/land/lnd06-application.test.ts` — PASS |
| Format | `npx prettier --check` on the four LND-07/LND-06 files — PASS |

The repository-wide suite/format gate was not used as a ticket gate because the working tree contains unrelated baseline failures; no unrelated files were modified to silence them.
