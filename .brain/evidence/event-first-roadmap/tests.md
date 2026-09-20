# Verification evidence

Command run sequentially three times from the repository root:

```powershell
$env:RUN_DB_TESTS='1'; 1..3 | ForEach-Object { $run = $_; Write-Output ('=== RUN ' + $run + ' ==='); & npm.cmd test -- tests/eventing/event-kernel.postgres.test.ts; Write-Output ('=== EXIT ' + $LASTEXITCODE + ' ===') }
```

Results:

- Run 1: exit 0; 1 test file passed; 3 tests passed; duration 656ms (test time 242ms).
- Run 2: exit 0; 1 test file passed; 3 tests passed; duration 622ms (test time 216ms).
- Run 3: exit 0; 1 test file passed; 3 tests passed; duration 664ms (test time 231ms).
- Aggregate: 3/3 runs passed, 9/9 tests passed, 0 failures. No failure stack or reproduction exists.

Read-only evidence:

- `tests/eventing/event-kernel.postgres.test.ts:12-20` gates on `RUN_DB_TESTS === '1'` and clears projection records, checkpoints, outbox messages, and event records in `beforeEach`.
- `tests/eventing/event-kernel.postgres.test.ts:84-103` covers outbox dispatch and projection progress.
- `docs/adr/0001-domain-events-and-projections.md:7` states a p95 freshness target of 10 seconds, but repository tests/docs/scripts search found no defined projection-freshness workload or numeric p95 measurement.
- `src/modules/eventing/worker.ts:2` imports `markOverdue` from `@/modules/platform/sla`.
- `src/modules/platform/index.ts:14-15` exports `markOverdue` from `./sla`.

## Complete PostgreSQL Vitest suite follow-up

Requested command, attempted once sequentially from the repository root via PowerShell:

```powershell
$env:RUN_DB_TESTS="1"; npm.cmd test
```

Result: PowerShell was unavailable in the execution environment (`pwsh: command not found`; `powershell` was also unavailable), so `npm.cmd test` did not start. No Vitest files or tests ran; pass/fail counts are unavailable, and there is no failure stack from Vitest. The shell-level launch attempt returned exit code 127.
