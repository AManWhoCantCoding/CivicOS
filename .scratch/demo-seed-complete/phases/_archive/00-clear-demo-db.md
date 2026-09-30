# Archive 00 — Clear demo database

- Scope: reset only `civicos_demo` after target/confirmation guard.
- Preserve schema, migrations, tiles and Evidence outside `demoNamespace=civicos-demo`.
- Failure codes: `DEMO_DATABASE_URL_REQUIRED`, `DEMO_RESET_REFUSED`, `DEMO_RESET_CONFIRM_REQUIRED`.
- Historical phase retained here; current design source is `docs/design/demo-seed-complete/`.
