# Ticket 01 verification after event-kernel coverage

Environment: PostgreSQL container `civicos-postgres-1`; readiness check returned `/var/run/postgresql:5432 - accepting connections`.

## Eventing suite

Command (executed through native PowerShell):

```text
RUN_DB_TESTS=1 npx.cmd vitest run tests/eventing/
```

Exit: 0

Results: 4 test files passed; 15 tests passed; 0 failed; 0 skipped.

Files/tests:

- `tests/eventing/event-durability.postgres.test.ts`: 9 passed
  - persists every envelope field with actor snapshot and causation metadata
  - treats a repeated event id as idempotent when the event matches
  - rejects a duplicate event id with conflicting content
  - rejects a reused aggregate version for a different event id
  - claims each outbox row once and dispatches each consumer exactly once
  - retries with backoff and parks poison messages in dead letter
  - rebuilds projections from the event stream without changing original events
  - reports projection lag sufficient to detect a stale projection
  - reports idle and unknown projection status without events or checkpoints
- `tests/eventing/event-kernel.postgres.test.ts`: 3 passed
- `tests/eventing/projection-replay.postgres.test.ts`: 1 passed
- `tests/eventing/event-kernel.integration.test.ts`: 2 passed

## Full DB suite

Command (executed through native PowerShell):

```text
RUN_DB_TESTS=1 npm.cmd test
```

Exit: 0

Results: 18 test files passed; 37 tests passed; 0 failed; 0 skipped.

Files/tests:

- `tests/incidents/incident-approval.postgres.test.ts`: 2
- `tests/inspections/inspection-schedule.postgres.test.ts`: 1
- `tests/eventing/event-durability.postgres.test.ts`: 9
- `tests/eventing/event-kernel.postgres.test.ts`: 3
- `tests/eventing/projection-replay.postgres.test.ts`: 1
- `tests/identity/audit.integration.test.ts`: 1
- `tests/identity/encryption.integration.test.ts`: 1
- `tests/platform/geo.integration.test.ts`: 3
- `tests/inspections/inspection-workflow.integration.test.ts`: 2
- `tests/incidents/incident-workflow.integration.test.ts`: 2
- `tests/identity/authorization.integration.test.ts`: 1
- `tests/platform/evidence.integration.test.ts`: 1
- `tests/platform/offline-sync.integration.test.ts`: 2
- `tests/integration/parallel-wave.integration.test.ts`: 1
- `tests/eventing/event-kernel.integration.test.ts`: 2
- `tests/vehicles/vehicle-watch.integration.test.ts`: 2
- `tests/integration/schema-and-migration.test.ts`: 2
- `tests/platform/sla.integration.test.ts`: 1

## Repository checks

- `npm.cmd run typecheck`: exit 0.
- `npm.cmd run lint`: exit 0.
- `npm.cmd run build`: exit 0; Next.js production build compiled, typechecked, generated 26 static pages, and finalized route output.

## Static boundary

- No matches for `@/modules/platform/sla` under `src/modules/eventing`.
- `src/modules/platform/index.ts` exports `markOverdue` from `./sla`.

No Ticket 07 p95 verification was run or claimed. No remaining Ticket 01 blocker observed within this verification scope.
