# Ticket 01 closure-gate review

Review-only. No source/config/test/README/.scratch file was changed and no commit was made.

## Acceptance criteria

| ID | Result | Direct evidence |
|---|---|---|
| AC1 | PASS | `tests/eventing/event-durability.postgres.test.ts:29-86` asserts the persisted envelope, actor, correlation/causation IDs, payload, metadata, and outbox row; `src/modules/eventing/event-store.ts:143-169` writes `EventRecord` and `recordedAt`/outbox data. PostgreSQL result: `.brain/evidence/event-first-roadmap/verification-after-event-kernel-coverage.md:17-27` (9 tests passed). |
| AC2 | PASS | `tests/eventing/event-durability.postgres.test.ts:88-146` tests matching/conflicting duplicate IDs; `:148-188` tests reused aggregate version; schema uniqueness is `prisma/schema.prisma:82-105`. |
| AC3 | NOT OBSERVED | `tests/eventing/event-kernel.postgres.test.ts:22-47` proves a successful event/outbox commit, but no supplied test directly forces a transaction failure and verifies rollback of both domain state and event record. |
| AC4 | PASS | `tests/eventing/event-kernel.postgres.test.ts:49-82` asserts `AGGREGATE_VERSION_CONFLICT` and unchanged history; the new duplicate-version test is also at `tests/eventing/event-durability.postgres.test.ts:148-188`. |
| AC5 | PASS | `tests/eventing/event-durability.postgres.test.ts:190-242` runs four concurrent claims and asserts one outcome, one delivery, one checkpoint, and one processed row; coverage result is `.brain/evidence/event-first-roadmap/verification-after-event-kernel-coverage.md:19-25`. |
| AC6 | PASS | `tests/eventing/event-durability.postgres.test.ts:244-305` asserts retry attempts, future backoff, last error, configured threshold, dead-letter state, and no further delivery; coverage result is `.brain/evidence/event-first-roadmap/verification-after-event-kernel-coverage.md:24-26`. |
| AC7 | PASS | `tests/eventing/event-durability.postgres.test.ts:307-372` compares direct and rebuilt projection state and verifies original event IDs/payloads remain unchanged; coverage result is `.brain/evidence/event-first-roadmap/verification-after-event-kernel-coverage.md:26-27`. |
| AC8 | PASS | `tests/eventing/event-durability.postgres.test.ts:374-406` creates a 30-second stale checkpoint and asserts lag greater than 10,000 ms plus pending/oldest-pending signals. `src/modules/eventing/outbox.ts:185-242` returns the health fields. This verifies detection, not a p95 workload measurement. |
| AC9 | PASS | The focused/full commands use `RUN_DB_TESTS=1`; `.brain/evidence/event-first-roadmap/verification-after-event-kernel-coverage.md:1-15,33-44` records PostgreSQL readiness and 4/15 and 18/37 PostgreSQL tests passed. The tests use `@/lib/prisma` and no Prisma mock. |
| AC10 | PASS | `.brain/evidence/event-first-roadmap/verification-after-event-kernel-coverage.md:66-70` records typecheck/lint/build exit 0; `:5-15` records the new eventing test command 4 files/15 tests passed; `:33-44` records the full clean-DB run 18 files/37 tests passed. |
| AC11 | PASS | Current-source import scan found no `@/modules/eventing/...` internal imports under `src`; event consumers use the public entry, e.g. `src/modules/platform/notifications/index.ts:4`. No consumer-to-another-consumer implementation import was observed. |

## Implementation steps

| ID | Result | Direct evidence |
|---|---|---|
| S1 | NOT OBSERVED | `.brain/evidence/event-first-roadmap/verification-after-eventing-fix.md:6-23` proves Docker/PostgreSQL readiness, and `review.md:39` cites Prisma generate, but no evidence proves the required execution ordering before schema work. |
| S2 | NOT OBSERVED | `src/modules/eventing/contracts.ts:1-33` defines the contract, but no supplied evidence proves it was written/tested before the repository implementation. |
| S3 | NOT OBSERVED | Schema and migration artifacts exist (`prisma/schema.prisma:82-142`; `prisma/migrations/0001_event_first/migration.sql:79-141,406-440`), but the supplied new verification does not directly record a clean-database migration execution/audit. |
| S4 | PASS | `src/modules/eventing/index.ts:1-32` exports contracts and the intended kernel operations, with no Prisma model export. The current consumer import scan found no consumer import of another consumer's implementation. |
| S5 | PASS | Atomic append is exercised by `tests/eventing/event-kernel.postgres.test.ts:22-47`; version rejection/history preservation is `:49-82`; duplicate-ID and aggregate-version coverage is `tests/eventing/event-durability.postgres.test.ts:88-188`; persistence is implemented at `src/modules/eventing/event-store.ts:101-169`. |
| S6 | PASS | Claim/concurrency/idempotency is covered at `tests/eventing/event-durability.postgres.test.ts:190-242`; retry/backoff/dead-letter at `:244-305`; coverage result is `.brain/evidence/event-first-roadmap/verification-after-event-kernel-coverage.md:17-27`. |
| S7 | PASS | Consumer checkpoint/replay behavior is directly exercised at `tests/eventing/event-durability.postgres.test.ts:307-372`; checkpoint dispatch implementation is `src/modules/eventing/outbox.ts:74-123`; replay API is `src/modules/eventing/replay.ts:6-46`. |
| S8 | NOT OBSERVED | Health fields and a >10-second lag detector are tested at `tests/eventing/event-durability.postgres.test.ts:374-433`, but no p95 workload/latency measurement for Ticket 07 is supplied. |
| S9 | NOT OBSERVED | Real PostgreSQL eventing coverage is proven by `.brain/evidence/event-first-roadmap/verification-after-event-kernel-coverage.md:5-31`, but the supplied tests do not directly cover rollback failure semantics and concurrent append behavior as distinct cases. |
| S10 | PASS | `.brain/evidence/event-first-roadmap/verification-after-event-kernel-coverage.md:5-15,33-44,66-70` records eventing 4/15, full native 18/37, and typecheck/lint/build all passing. |

## Regression and boundary checks

The previous outbox failure is resolved in the supplied post-fix evidence: the full native PostgreSQL run is **18 files, 37 tests passed, 0 failed** (`verification-after-event-kernel-coverage.md:33-44`), and the focused eventing run is **4 files, 15 tests passed, 0 failed** (`:5-15`). The new durability test contributes 9 passing tests (`:17-28`). Limitation: this is a passing verification run, not a p95 workload measurement; the older `tests.md:24-32` records an earlier environment where PowerShell was unavailable and is superseded for this post-fix result by the newer native-run evidence.

`src/modules/eventing/worker.ts:1-3` imports `markOverdue` from `@/modules/platform`; `.brain/evidence/event-first-roadmap/verification-after-eventing-fix.md:129-149` records no direct `@/modules/platform/sla` match and the public export. No direct `@/modules/platform/sla` import remains.

## Closure decision

**FAIL / NOT APPROVABLE.** The Planner rule requires every AC and implementation step to be directly supported. AC3, S1, S2, S3, S8, and S9 remain `NOT OBSERVED`; therefore Ticket 01 does not satisfy the closure rule, despite the post-fix outbox and native test runs passing. No status/checkbox was changed and no commit was made.
