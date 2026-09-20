# Ticket 01 post-hardening verification

Execution path: native Windows PowerShell via `powershell.exe -NoProfile -NonInteractive -Command`, using `npm.cmd`/`npx.cmd`. No source, config, test, README, or `.scratch` files were changed.

## Runtime

- PowerShell: `5.1.26100.9444`
- npm: `10.9.4`
- npx: `10.9.4`

## Results

| Command | Exit code | Result |
|---|---:|---|
| `$env:RUN_DB_TESTS="1"; npx.cmd vitest run tests/eventing/` | 0 | 4 test files passed; 17 tests passed; 0 failed |
| `$env:RUN_DB_TESTS="1"; npm.cmd test` | 0 | 18 test files passed; 39 tests passed; 0 failed |
| `npm.cmd run typecheck` | 0 | Passed |
| `npm.cmd run lint` | 0 | Passed |
| `npm.cmd run build` | 0 | Production build completed successfully |

## Isolated temporary PostgreSQL migration audit

The temporary database was `civicos_verify_20260920160416`; it was created and dropped through the PostgreSQL `postgres` database. The existing `civicos` database was not used or modified.

Commands, in order:

1. `npx.cmd prisma db execute --stdin --url postgresql://civicos:civicos@localhost:5432/postgres` with `CREATE DATABASE "civicos_verify_20260920160416"` — exit `0`.
2. `npx.cmd prisma migrate deploy` against the temporary database — exit `0`; all 4 migrations applied:
   - `0001_event_first`
   - `20260919042323_incident_approval`
   - `20260919050000_approval_organization_scope`
   - `20260919052000_inspection_cadence`
3. `npx.cmd prisma migrate status` — exit `0`; `Database schema is up to date!`
4. `npx.cmd prisma migrate deploy` again — exit `0`; `No pending migrations to apply.`
5. `npx.cmd prisma db execute --stdin --url postgresql://civicos:civicos@localhost:5432/postgres` with `DROP DATABASE "civicos_verify_20260920160416"` — exit `0`.

Raw migration exit codes: `deploy1=0 status=0 deploy2=0 cleanup=0`.

## Eventing boundary audit

PowerShell scan of `src/modules/eventing` for `@/modules/platform/sla` imports:

```text
DIRECT_EVENTING_SLA_IMPORT_MATCHES=0
```

Exit code: `0`.
