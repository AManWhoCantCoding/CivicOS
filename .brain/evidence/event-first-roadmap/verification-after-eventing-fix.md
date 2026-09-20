# Ticket 01 narrow-slice independent verification

Date: 2026-09-20
Scope: eventing PostgreSQL regression, repository PostgreSQL suite, typecheck/lint/build, and eventing platform-import boundary only.

## PostgreSQL readiness

Native PowerShell command:

```powershell
docker.exe compose up -d
docker.exe compose exec -T postgres pg_isready -U civicos -d civicos
```

Raw result:

```text
Container civicos-postgres-1 Running
/var/run/postgresql:5432 - accepting connections
PostgreSQL ready
```

Exit code: `0`.

## Focused eventing PostgreSQL test

Native PowerShell equivalent of the requested environment-variable command:

```powershell
$env:RUN_DB_TESTS = "1"; npm.cmd test -- tests/eventing/event-kernel.postgres.test.ts
```

Raw result:

```text
> civic-os@0.1.0 test
> vitest run tests/eventing/event-kernel.postgres.test.ts

RUN  v3.2.7 D:/Project/CivicOS
✓ tests/eventing/event-kernel.postgres.test.ts (3 tests) 208ms
Test Files  1 passed (1)
Tests       3 passed (3)
Duration    608ms
```

Exit code: `0`; 1 file passed, 3 tests passed.

## Complete PostgreSQL suite

Native PowerShell equivalent:

```powershell
$env:RUN_DB_TESTS = "1"; npm.cmd test
```

Raw result:

```text
✓ tests/incidents/incident-approval.postgres.test.ts (2 tests)
✓ tests/inspections/inspection-schedule.postgres.test.ts (1 test)
✓ tests/eventing/event-kernel.postgres.test.ts (3 tests)
✓ tests/eventing/projection-replay.postgres.test.ts (1 test)
✓ tests/identity/audit.integration.test.ts (1 test)
✓ tests/identity/encryption.integration.test.ts (1 test)
✓ tests/inspections/inspection-workflow.integration.test.ts (2 tests)
✓ tests/platform/geo.integration.test.ts (3 tests)
✓ tests/incidents/incident-workflow.integration.test.ts (2 tests)
✓ tests/platform/offline-sync.integration.test.ts (2 tests)
✓ tests/identity/authorization.integration.test.ts (1 test)
✓ tests/platform/evidence.integration.test.ts (1 test)
✓ tests/eventing/event-kernel.integration.test.ts (2 tests)
✓ tests/integration/parallel-wave.integration.test.ts (1 test)
✓ tests/integration/schema-and-migration.test.ts (2 tests)
✓ tests/vehicles/vehicle-watch.integration.test.ts (2 tests)
✓ tests/platform/sla.integration.test.ts (1 test)

Test Files  17 passed (17)
Tests       28 passed (28)
Duration    8.78s
```

Exit code: `0`; exact total: 17 files passed, 28 tests passed, 0 failed.

## Typecheck, repository lint, and build

### `npm.cmd run typecheck`

Raw result:

```text
> civic-os@0.1.0 typecheck
> tsc --noEmit
```

Exit code: `0`.

### `npm.cmd run lint`

Raw result:

```text
> civic-os@0.1.0 lint
> eslint .
```

Exit code: `0`. This was repository-level lint (`eslint .`).

### `npm.cmd run build`

Raw result:

```text
> civic-os@0.1.0 build
> next build

▲ Next.js 16.3.5 (Turbopack)
✓ Running next.config.ts took 42ms
Creating an optimized production build ...
✓ Compiled successfully in 6.3s
Running TypeScript ...
Finished TypeScript in 4.6s ...
Collecting page data using 11 workers ...
Generating static pages using 11 workers (26/26) in 416ms
Finalizing page optimization ...
```

Exit code: `0`.

## Static boundary verification

Command:

```powershell
Get-ChildItem src/modules/eventing -Recurse -File |
  Select-String -Pattern "@/modules/platform/sla"
```

Raw result:

```text
NO_MATCH: src/modules/eventing contains no direct @/modules/platform/sla import
```

Public export and consumer evidence:

```text
D:\Project\CivicOS\src\modules\platform\index.ts:15: export { createSla, dueAt, isOverdue, markOverdue } from './sla';
D:\Project\CivicOS\src\modules\eventing\worker.ts:2: import { markOverdue } from '@/modules/platform';
D:\Project\CivicOS\src\modules\eventing\worker.ts:10: await markOverdue();
```

The app clock is used for the outbox timestamp:

```text
D:\Project\CivicOS\src\modules\eventing\event-store.ts:106: const recordedAt = input.recordedAt ?? new Date();
D:\Project\CivicOS\src\modules\eventing\event-store.ts:167: availableAt: recordedAt,
```

`markOverdue` also resolves at its implementation:

```text
D:\Project\CivicOS\src\modules\platform\sla\index.ts:90: export async function markOverdue(now = new Date()): Promise<number> {
```

## Remaining blocker

No blocker observed within the requested Ticket 01 regression and boundary-fix scope. No p95 or unrelated acceptance criteria were assessed.
