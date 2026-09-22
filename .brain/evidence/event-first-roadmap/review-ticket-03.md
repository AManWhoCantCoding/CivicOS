# Ticket 03 closure-gate review

Review-only. No Developer was spawned, no source/config/test/README/.scratch
file was changed, no ticket status/checkbox was changed, and no commit was
made.

## Evidence basis

- `verification-ticket-03-final.md:29-60` records the final PostgreSQL platform
  run (17/17) and full run (71/71); `:63-96` records typecheck, lint, and build
  passing; `:98-122` records targeted field-shell E2E 2/2 and full E2E 18/18.
- `verification-ticket-03-final.md:124-136` explicitly limits direct coverage:
  no HTTP/API Evidence authorization test and no browser coverage for upload,
  GPS success/denial, queue transitions, retry/sync/error, online/offline
  changes, or reload behavior.
- `verification-ticket-03.md:85-92` is consistent with those gaps and records
  the earlier failing run; the final run supersedes its failed test result only
  for the later green command execution.
- `changes.md:1-6` lists the changed platform tests and service fixes.

## Acceptance criteria

| ID | Result | Exact evidence |
|---|---|---|
| AC1 | PASS | `tests/platform/evidence.integration.test.ts:42-84` creates persisted Evidence and asserts `originalHash`, `capturedAt`, `actorId`, metadata, `immutable`, numeric GPS values, and retrieval by `storageKey`; final verification says this DB case passed (`verification-ticket-03-final.md:124-127`). `prisma/schema.prisma:160-179` contains the corresponding fields and indexes. |
| AC2 | PASS | `tests/platform/evidence.integration.test.ts:60-71` uploads identical bytes twice and asserts the same ID, then uploads replacement bytes and asserts a new ID; final verification records the DB case passing (`verification-ticket-03-final.md:124-127`). |
| AC3 | NOT OBSERVED | The route does call `assertAccess` on POST (`src/app/api/evidence/route.ts:29-31`) and GET (`:95-100`), but final verification explicitly states no direct HTTP/API test exists for unauthenticated, forbidden cross-resource, permitted access, or audit behavior (`verification-ticket-03-final.md:130-134`). Source inspection alone is not treated as authorization evidence. |
| AC4 | PASS | `tests/platform/geo.integration.test.ts` is included in the final 17/17 DB platform run (`verification-ticket-03-final.md:34-46`); final coverage inspection explicitly lists WGS84, polygon closure/self-intersection, bounds, and zero-area rejection (`:126-127`). `src/modules/platform/geo/index.ts:1-19,22-109` uses WGS84 for both value objects and rejects invalid polygons. |
| AC5 | NOT OBSERVED | The test crosses Friday to Saturday and checks a configurable duration (`tests/platform/sla.integration.test.ts:21-29`) and the DB test checks one overdue transition (`:38-59`), but no supplied assertion uses an actual holiday calendar/holiday date, and no direct retry behavior result is listed. The final evidence only claims the platform run is green (`verification-ticket-03-final.md:34-46`), not each holiday/retry subclaim. |
| AC6 | PASS | `tests/platform/sla.integration.test.ts:51-63` asserts zero notifications before `processOutboxUntilIdle()` and one notification after it; `:64-77` asserts notification idempotency/read behavior. The consumer is registered for `SlaOverdue` and uses `sourceEventId` in `src/modules/platform/notifications/index.ts:55-81`. This is direct outbox-causality evidence, not source-only inference. |
| AC7 | NOT OBSERVED | `src/modules/platform/field-sync/index.ts:17-18,158-227` defines retry-related statuses/counters and transitions, and `tests/platform/offline-sync.integration.test.ts` is included in the final run. However, the supplied direct result covers duplicate ID, timestamps, completed response, conflicts, and terminal transition—not a failed command followed by retry/recovery. The final coverage summary lists those exact items and no failed-retry observation (`verification-ticket-03-final.md:124-127`). |
| AC8 | NOT OBSERVED | Stale-version rejection is directly covered by the final platform run and source (`src/modules/platform/field-sync/index.ts:77-89`), but no supplied test directly proves append-only `FieldUpdate` preservation/non-overwrite. The final evidence does not claim that subcase. |
| AC9 | NOT OBSERVED | `src/components/field/OfflineQueueStatus.tsx:38-76` renders online/offline, pending/syncing-count, failed/rejected-count, and synced-count, but the only browser assertion is visibility of `Trạng thái thiết bị` and `Kết nối` (`tests/e2e/field-shell.spec.ts:3-7`). Final verification explicitly says no direct coverage exists for queue transitions, retry/sync/error, online/offline changes, upload/GPS, or reload persistence (`verification-ticket-03-final.md:128-134`). |
| AC10 | NOT OBSERVED | The targeted browser run is 2/2 (`verification-ticket-03-final.md:98-109`), but the test source has only two visibility assertions (`tests/e2e/field-shell.spec.ts:3-7`); no keyboard-focus, reduced-motion, or main-error assertions are supplied. |
| AC11 | PASS | Final verification records `RUN_DB_TESTS=1 npx.cmd vitest run tests/platform`: 4 files/17 tests passed (`verification-ticket-03-final.md:29-46`), full `npm.cmd test`: 20 files/71 tests passed (`:49-60`), and typecheck/lint/build all exit 0 (`:63-96`). |

## Implementation steps

| ID | Result | Exact evidence |
|---|---|---|
| S1 | NOT OBSERVED | `src/modules/platform/index.ts:1-25` is a public platform export surface and exports no Prisma symbol, but no supplied boundary test proves that platform contains no Incident/Inspection/VehicleObservation state or that every public type is reachable only there. Source inspection is insufficient for the complete ownership claim. |
| S2 | FAIL | `prisma/schema.prisma:160-233` and `prisma/migrations/0001_event_first/migration.sql` contain the shared tables/indexes, but `prisma/migrations/*/migration.sql` has no separate shared-capabilities migration; the available migration names are `0001_event_first`, `incident_approval`, `approval_organization_scope`, and `inspection_cadence`. This does not satisfy the explicitly requested shared migration step. |
| S3 | NOT OBSERVED | The adapter/hash/idempotency implementation is visible in `src/modules/platform/evidence/evidence-service.ts:23-83`, and the direct metadata/hash/replacement test passes (`tests/platform/evidence.integration.test.ts:42-84`). The authorization-boundary portion remains unverified because final evidence found no direct Evidence API authorization test (`verification-ticket-03-final.md:130-134`). |
| S4 | PASS | Geo value objects and invalid-input coverage are directly evidenced by `src/modules/platform/geo/index.ts:12-19,22-109` and the final inspection's WGS84/bounds/polygon results (`verification-ticket-03-final.md:124-127`). |
| S5 | NOT OBSERVED | `src/modules/platform/sla/index.ts:27-35,90-129` implements configurable duration and one guarded overdue transition; `tests/platform/sla.integration.test.ts:21-59` directly covers duration, weekend crossing, and once-only transition. No actual holiday-calendar assertion or retry/idempotency result for the SLA engine is supplied. |
| S6 | NOT OBSERVED | Outbox-origin and notification idempotency are directly tested (`tests/platform/sla.integration.test.ts:51-77`), and the consumer is in `src/modules/platform/notifications/index.ts:59-81`. The step also requires retry/lag/error exposure; no direct result for those subclaims appears in either final verification (`verification-ticket-03-final.md:124-136`). |
| S7 | NOT OBSERVED | Offline persistence, client ID, timestamps, duplicate result retention, conflict detection, and stale-version rejection are covered by `src/modules/platform/field-sync/index.ts:91-155` and the final DB run (`verification-ticket-03-final.md:124-127`). Append-only FieldUpdate non-overwrite and a failed-retry recovery are not directly observed. |
| S8 | NOT OBSERVED | The UI source renders online/offline and aggregate pending/failed/synced counts (`src/components/field/OfflineQueueStatus.tsx:12-79`), while local queue synchronization is wired through browser online events (`:15-30`). The only browser test is the two-label smoke test, and final verification explicitly excludes expanded state/reload coverage (`verification-ticket-03-final.md:128-134`). |
| S9 | NOT OBSERVED | No complete design preflight artifact/result is supplied. The field component has labels/text (`src/components/field/OfflineQueueStatus.tsx:45-76`), but the final browser evidence does not enumerate focus, touch targets, contrast, keyboard, mobile single-column, or reduced-motion checks. |
| S10 | NOT OBSERVED | Quality and all listed command results are green (`verification-ticket-03-final.md:29-122`), and outbox causality is directly tested (`tests/platform/sla.integration.test.ts:51-77`). The required browser online/offline/resume flow and expanded field-shell state coverage remain explicitly absent (`verification-ticket-03-final.md:130-134`), so the whole step is not observed as written. |

## Required assessments

- **SLA/outbox causality:** PASS for the observed outbox causality and exactly-once notification assertions; NOT OBSERVED for holiday-calendar semantics and retry/lag/error subclaims.
- **Offline persistence/idempotency/stale handling:** PASS for persisted command timestamps, duplicate-ID result retention, conflict detection, and stale-version rejection; NOT OBSERVED for append-only FieldUpdate preservation and failed-retry recovery.
- **Geo validation:** PASS for WGS84 coordinate bounds, polygon closure/self-intersection, and zero-area checks; no Evidence HTTP multipart authorization claim is inferred.
- **Public platform boundary:** the public export surface is visible (`src/modules/platform/index.ts:1-25`), but a complete ownership/export-boundary test is NOT OBSERVED.
- **Quality:** PASS for the final recorded typecheck, lint, build, platform suite, full suite, targeted E2E, and full E2E command results (`verification-ticket-03-final.md:29-122`). Quality PASS does not convert the missing behavior coverage to PASS.

## Closure recommendation

**NOT APPROVABLE / do not close Ticket 03.** AC3, AC5, AC7–AC10 and S1, S3, S5–S10 remain NOT OBSERVED; S2 is FAIL because the required separate shared migration is not present. This review does not change ticket status or checkboxes and does not commit.
