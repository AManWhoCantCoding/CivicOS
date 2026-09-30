# Archive 01 — Isolate test database

- Test, migration, backend and fixture processes must use one isolated `civicos_e2e` target.
- `civicos` and `civicos_demo` are protected from test mutation.
- Reject test target `civicos_demo` with `TEST_DATABASE_TARGET_FORBIDDEN`.
