# Ticket 01 revised closure-gate review

Review-only. No Developer was spawned, no source/config/test/README/.scratch file was changed, and no commit was made.

## Acceptance criteria

| ID | Result | Exact evidence |
|---|---|---|
| AC1 | PASS | `tests/eventing/event-durability.postgres.test.ts:29-86` appends and round-trips every envelope field, actor snapshot, correlation/causation IDs, payload, metadata, timestamps, and outbox row. Native result: `verification-after-event-kernel-coverage.md:17-28` records the test as passed. |
| AC2 | PASS | Matching/conflicting duplicate `eventId` behavior is tested at `tests/eventing/event-durability.postgres.test.ts:88-146`; duplicate aggregate version is tested at `:148-188`. |
| AC3 | PASS | `tests/eventing/event-durability.postgres.test.ts:190-212` forces a transaction failure and asserts zero `EventRecord` and `OutboxMessage` rows afterward. The native eventing suite passed this test (`verification-after-event-kernel-coverage.md:19-28`). |
| AC4 | PASS | `tests/eventing/event-durability.postgres.test.ts:148-188` asserts `AGGREGATE_VERSION_CONFLICT` and preserved history; concurrent same-version rejection is also asserted at `:214-273`. |
| AC5 | PASS | `tests/eventing/event-durability.postgres.test.ts:275-327` runs concurrent processing and asserts one claim, one delivery, one checkpoint, and one processed row. The eventing suite passed 15/15 (`verification-after-event-kernel-coverage.md:13-31`). |
| AC6 | PASS | `tests/eventing/event-durability.postgres.test.ts:329-390` asserts attempts, future backoff, last error, threshold, dead-letter state, and no further delivery; the test is included in the 15/15 native eventing result (`verification-after-event-kernel-coverage.md:19-28`). |
| AC7 | PASS | `tests/eventing/event-durability.postgres.test.ts:392-457` compares direct/rebuilt projection state and verifies original event IDs, payloads, and count remain unchanged. |
| AC8 | PASS | `tests/eventing/event-durability.postgres.test.ts:459-518` asserts pending/oldest-pending signals, stale `projectionLagMs > 10,000`, and idle/unknown states. No Ticket 07 numeric p95 is required for this criterion; the evidence explicitly claims no p95 run (`verification-after-event-kernel-coverage.md:72-77`). |
| AC9 | PASS | The durability tests import Prisma from `@/lib/prisma` (`tests/eventing/event-durability.postgres.test.ts:5`) and contain no Prisma mock. Native PostgreSQL readiness and the 18-file/39-test full run are recorded at `verification-after-event-kernel-hardening.md:15-19` and `verification-after-event-kernel-coverage.md:33-64`. |
| AC10 | PASS | Native verification records eventing 17/17, full DB 39/39, typecheck, lint, and build all exit 0 (`verification-after-event-kernel-hardening.md:13-19`). |
| AC11 | PASS | The public-surface and boundary result is recorded at `review-ticket-01-final.md:19`; the current boundary scan reports zero direct `@/modules/platform/sla` imports (`verification-after-event-kernel-hardening.md:39-47`), and the durability test imports the eventing API from `@/modules/eventing` (`tests/eventing/event-durability.postgres.test.ts:6-16`), not an implementation file. |

## Implementation steps

| ID | Result | Exact evidence |
|---|---|---|
| S1 | PASS | PostgreSQL readiness, Prisma generate, commands, exits, and environment are recorded in `verification.md:5-13` and `:15-23`; the native runtime is identified as PowerShell 5.1.26100.9444/npm 10.9.4 in `verification-after-event-kernel-hardening.md:1-9`. The isolated temporary database, all four migrations, first deploy, status, second no-op deploy, cleanup, and exit codes are recorded in `verification-after-event-kernel-hardening.md:21-37`. This satisfies the revised reproducible-verification requirement without relying on historical ordering. |
| S2 | PASS | `tests/eventing/event-durability.postgres.test.ts:6-16` imports only the public eventing entry point. Direct envelope/actor/correlation/causation/payload/metadata round-trip coverage is at `:29-86`; duplicate and version behavior is at `:88-188`; native execution records all nine durability tests passed (`verification-after-event-kernel-coverage.md:17-28`). This satisfies the revised public-entry contract requirement without relying on historical ordering. |
| S3 | PASS | Schema constraints/indexes are identified in `review-ticket-01-final.md:27`; isolated clean migration deploy, status, second no-op deploy, and cleanup all exit 0 in `verification-after-event-kernel-hardening.md:21-37`. |
| S4 | PASS | `review-ticket-01-final.md:28` identifies `src/modules/eventing/index.ts:1-33` as the public entry point with contracts/operations and no Prisma/repository exports; the boundary scan is recorded at `verification-after-event-kernel-hardening.md:39-47`. |
| S5 | PASS | Atomic append and version checks are exercised at `tests/eventing/event-durability.postgres.test.ts:190-273`; persistence implementation evidence is cited at `review-ticket-01-final.md:29`; native eventing result is 17/17 (`verification-after-event-kernel-hardening.md:15-16`). |
| S6 | PASS | Claim/idempotency coverage is at `tests/eventing/event-durability.postgres.test.ts:275-327`; retry/backoff/dead-letter coverage is at `:329-390`; native eventing result is 17/17 (`verification-after-event-kernel-hardening.md:15-16`). |
| S7 | PASS | Replay equivalence and preservation of original events are tested at `tests/eventing/event-durability.postgres.test.ts:392-457`; the native eventing suite passed 17/17 (`verification-after-event-kernel-hardening.md:15-16`). |
| S8 | PASS | Health/lag signals, including stale lag over 10 seconds, are directly tested at `tests/eventing/event-durability.postgres.test.ts:459-518`. Ticket 07 p95 remains out of scope, as explicitly recorded at `verification-after-event-kernel-coverage.md:72-77`. |
| S9 | PASS | PostgreSQL-backed eventing durability coverage includes rollback, concurrent append, claim/idempotency, retry/dead-letter, and replay at `tests/eventing/event-durability.postgres.test.ts:190-457`; native eventing and full DB results are 17/17 and 39/39 (`verification-after-event-kernel-hardening.md:15-16`). |
| S10 | PASS | Eventing/full-DB tests, typecheck, lint, and build all exit 0 at `verification-after-event-kernel-hardening.md:13-19`; isolated clean migration verification and boundary scan are at `:21-47`. |

## Closure recommendation

**PASS — recommend closure.** AC1–AC11 and revised S1–S10 are individually supported by the cited current evidence. Historical ordering is not required for revised S1/S2, and Ticket 07 numeric p95 is not required for S1/S2 or S8.
