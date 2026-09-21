# Ticket 04 native verification

Date: 2026-09-21
Environment: native Windows PowerShell via `powershell.exe`, repo `D:\Project\CivicOS`, Docker Desktop context `desktop-linux`.

## Database readiness

Raw commands/results:

```text
powershell.exe -NoProfile -Command "Set-Location 'D:\Project\CivicOS'; docker info"
Context: desktop-linux
Server Version: 29.6.2
Containers: 1
Running: 1

powershell.exe -NoProfile -Command "Set-Location 'D:\Project\CivicOS'; docker compose up -d"
 Container civicos-postgres-1 Running
```

## Requested test commands

### Incident/Ticket 04 PostgreSQL tests

Command:

```text
RUN_DB_TESTS=1 npx.cmd vitest run tests/incidents
```

Result: exit 0.

```text
Test Files  3 passed (3)
Tests       21 passed (21)
Duration    5.89s
```

The rollback test emitted this expected database-trigger diagnostic while passing:

```text
Error occurred during query execution:
ConnectorError(ConnectorError { user_facing_error: None, kind: QueryError(PostgresError { code: "P0001", message: "T04_INJECTED_FAILURE", severity: "ERROR", detail: None, column: None, hint: None }), transient: false })
```

### Full Vitest suite

Command:

```text
RUN_DB_TESTS=1 npm.cmd test
```

Result: exit 0.

```text
Test Files  22 passed (22)
Tests       95 passed (95)
Duration    16.82s
```

The same `T04_INJECTED_FAILURE` diagnostic was emitted by the passing rollback test.

### Typecheck, lint, build

Commands:

```text
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

The three commands were first started concurrently. Raw first typecheck result:

```text
.next/types/validator.ts(5,79): error TS2307: Cannot find module './routes.js' or its corresponding type declarations.
```

Raw first lint result: exit 0; ESLint printed no diagnostics.

Raw first build result: exit 0; Next.js compiled, completed TypeScript, generated 26 static pages, and printed the route table.

The exact typecheck command was rerun natively after the build completed:

```text
npm.cmd run typecheck

> civic-os@0.1.0 typecheck
> tsc --noEmit
```

Rerun result: exit 0, no diagnostics.

### Ticket 04 Playwright file

Command:

```text
npx.cmd playwright test tests/e2e/ps005-incident.spec.ts
```

Result: exit 0.

```text
Running 12 tests using 2 workers
12 passed (55.4s)
```

### Full Playwright suite

Command:

```text
npm.cmd run test:e2e
```

Result: exit 0.

```text
Running 46 tests using 6 workers
46 passed (1.2m)
```

## Direct assertion confirmation

The passing PostgreSQL tests directly assert:

- Rollback: counts for intake reports, incidents, event records, outbox messages, audits, and SLAs remain unchanged after `T04_INJECTED_FAILURE`; sentinel rows are absent.
- Elapsed-clock SLA: due times are calculated from `startedAt`; a threshold at exactly `dueAt` is overdue; an elapsed 24-hour instance is marked `overdue` with one `SlaOverdue` event.
- Approval error behavior: missing approval rejects as `APPROVAL_NOT_FOUND` at the REST boundary; module assertions also cover resource mismatch, forbidden scope, already-decided approval, and required rejection reason.
- Exactly-one/idempotency: duplicate intake idempotency returns the original result and leaves report, incident, and event counts unchanged; REST repeats return status `201` and the same `incidentId`.
- Authorization: unassigned and cross-unit reads/writes reject with `FORBIDDEN`; E2E asserts UI denial, `403` read/command responses, and `{"error":"FORBIDDEN"}`.
- Audit: intake creation and incident mutation/read/list operations are counted and asserted in PostgreSQL tests.
- Timeline/redaction: event versions are ordered; expected domain-event types appear; list/detail output excludes `sourceName`, `sourceContact`, `sensitiveRef`, and their sensitive values; the stored source name is also asserted redacted.

The E2E lifecycle additionally directly asserts the full approval lifecycle and all eleven expected timeline event labels through `IncidentClosed`.

## Known limitations

- The first concurrent typecheck invocation reported the missing `.next/types/routes.js`; the same command passed when rerun after the build completed. Both raw outcomes are recorded above.
- Rollback, elapsed-clock SLA, audit, and redaction assertions are PostgreSQL/module tests, not independent browser assertions.
- The REST approval-error assertion covers the missing-approval `404` shape (`APPROVAL_NOT_FOUND`); other approval failures are asserted at the module boundary rather than all through REST JSON.
- No manual production deployment or external browser/device beyond the configured Chromium/mobile Playwright projects was exercised.
