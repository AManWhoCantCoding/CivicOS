# Ticket 06 final re-review — `06-ps009-vehicle-watch`

Scope: current working tree/diff, Ticket 06, migrations, latest evidence, and
the remediation recorded in `changes.md`. No source, ticket status, or commit
was changed. Unrelated workspace changes and `opencode.jsonc` whitespace were
ignored.

## Implementation steps 1–10

| Step | Result | Evidence |
|---|---|---|
| 1. Registry/observation boundary | PASS | `src/modules/vehicles/commands.ts:118-193` owns registry entries; `:280-443` owns observations. A match remains `match_suggested` and emits `requiresConfirmation: true` at `:366-394`. |
| 2. Event/command contracts | PASS | `src/modules/vehicles/domain.ts:1-36` defines vehicle event ownership/version; contract assertions are `tests/vehicles/vehicle-watch-contract.test.ts:116-142`; command emissions are in `commands.ts:162-177,341-394,669-683,758-774,865-876`. |
| 3. Schema/migration | PASS | Shared registry/observation/verification/Evidence/Assignment/SLA fields are asserted by `tests/vehicles/vehicle-watch-contract.test.ts:145-174`; migration status is current (`tests.md:913-918`). |
| 4. Registry lifecycle | PASS | Validation, status/window history, audit/event writes: `commands.ts:118-277`; effective-window GiST exclusion migration: `prisma/migrations/20260922090000_ps_e1_009_vehicle_active_identity/migration.sql:1-25`; lifecycle/race tests: `vehicle-watch-slices-4-7.postgres.test.ts:328-398`. |
| 5. Manual observation | PASS | Observation and pending-token Evidence validation/claim are `commands.ts:280-339`; HTTP VehicleObservation uploads use the atomic service at `src/app/api/evidence/route.ts:52-70`; the service transaction covers Evidence row, observation attachment, projection event, and audits at `commands.ts:535-632`, with storage cleanup at `:629-631`. Rollback/orphan assertions are `vehicle-watch-slices-4-7.postgres.test.ts:547-608`. |
| 6. Match/confirmation | PASS | Match event/transaction-scoped notification: `commands.ts:366-394`; confirmation access/version/pending guards: `commands.ts:635-698`; negative and positive browser coverage: `tests.md:567-577`. |
| 7. Verification/SLA | PASS | Verification preserves observation identity/fields and records actor, lookup, GPS, Evidence IDs, event, audit, and SLA completion in `commands.ts:701-802`; SLA/overdue/retry/duplicate tests are `vehicle-watch-slices-4-7.postgres.test.ts:909-1049`. |
| 8. Mock adapter | PASS | Deterministic fixtures and explicit manual fallback: `src/modules/vehicles/mock-camera-adapter.ts:8-53`; no-network/manual-fallback tests: `tests/vehicles/vehicle-watch-slices-8-9.test.ts:34-61`. |
| 9. PWA field/registry UI | PASS | Form/detail/verification/escalation loading, GPS/photo/offline and Evidence paths are covered by the current vehicle components; latest TS browser result is 8/8 (`tests.md:941-948`) and Python result is 8/8 (`tests.md:950-967`). |
| 10. Sync/security/E2E | PASS | Latest relevant DB run is 8 files/51 tests/0 skips, SLA was independently 3x 6/6, TS was 8/8, Python was 8/8, and quality gates passed (`tests.md:920-979`). |

## Acceptance criteria 1–12

| AC | Result | Evidence |
|---|---|---|
| 1. Authorized registry with plate/source/reason/window/status | PASS | Role and field/window validation/persistence: `commands.ts:118-161`; registry UI/browser assertions and 8/8 latest run: `tests.md:941-948`. |
| 2. Expired registry does not match; history remains queryable | PASS | Effective-window predicate/use: `domain.ts:45-51`, `commands.ts:310-315`; DB expired/no-match/history coverage: `vehicle-watch-slices-4-7.postgres.test.ts:610-688`; latest browser suite passed (`tests.md:950-967`). |
| 3. Manual observation with plate/time/GeoPoint/photo Evidence | PASS | Input validation and observation fields: `commands.ts:280-329`; upload route: `src/app/api/evidence/route.ts:52-82`; atomic attachment/event/audit path: `commands.ts:535-632`; rollback proves zero Evidence, attachment event, audit, and unchanged projection on failure: `vehicle-watch-slices-4-7.postgres.test.ts:547-608`. |
| 4. Match is suggestion/notification; confirmation before escalation | PASS | `commands.ts:366-394` emits the match suggestion and notification in the same transaction; `commands.ts:716-717,846` blocks verify/escalate until confirmation; latest TS/Python full-flow tests passed (`tests.md:941-969`). |
| 5. Verification records Actor/result/time/GPS/Evidence without changing original observation | PASS | Verification persistence and version-only observation update: `commands.ts:728-797`; foreign Evidence rejection and preserved plate/time/Evidence assertions: `vehicle-watch-slices-4-7.postgres.test.ts:746-838`. |
| 6. Continuous two-hour SLA, weekends/holidays, overdue and retry notification | PASS | Two-hour rule is `domain.ts:38-51`; weekend/overdue single-event/idempotent notification/retry coverage is `vehicle-watch-slices-4-7.postgres.test.ts:909-993`; latest SLA runs were 6/6 three times (`tests.md:933-939`). |
| 7. Offline client ID/idempotency/pending-failed-synced/stale rejection | PASS | Offline command state/client-ID implementation is `src/modules/platform/field-sync/index.ts:20-30,91-155`; DB duplicate/stale coverage is `vehicle-watch-slices-4-7.postgres.test.ts:994-1057`; latest browser suite passed (`tests.md:941-969`). |
| 8. Deterministic no-network mock/manual fallback | PASS | Source-level no-network checks and fallback assertions: `vehicle-watch-slices-8-9.test.ts:34-61`; latest TS mock/manual scenario passed (`tests.md:750-761`). |
| 9. Assignment/org authorization and URL/API access | PASS | Assignment-scoped listing/detail: `src/modules/vehicles/projection.ts:242-342`; Evidence URL authorization: `src/app/api/evidence/route.ts:92-135`; pending-token, foreign-resource, wrong-actor and foreign Evidence assertions: `vehicle-watch-slices-4-7.postgres.test.ts:451-535,761-772`; unassigned URL/API coverage passed in the latest browser run (`tests.md:941-969`). Escalation validates an active target and that it is the actor's ancestor (`commands.ts:805-826,849-856`); peer denial and permitted parent/idempotent retry: `vehicle-watch-slices-4-7.postgres.test.ts:1062-1100`. |
| 10. Browser E2E registry→observation→confirmation→verification→escalation | PASS | Latest native TS result: 8 passed, 0 failed, 0 skipped, desktop plus mobile (`tests.md:941-948`); configured Python result: 8 passed, 0 failed, 0 skipped (`tests.md:950-969`). |
| 11. Mobile PWA, focus/keyboard basics, loading/error/offline/reduced motion | PASS | Labeled/touch-safe controls and offline/loading states are in `VehicleObservationForm.tsx:110-128,130-185,220-226` and `VehicleVerificationForm.tsx:156-171,180-206,263-269`; global keyboard focus and reduced-motion handling is `src/app/globals.css:27-40`; mobile project is included in the 8/8 TS run (`tests.md:941-948`) and Python browser run also passed (`tests.md:950-967`). |
| 12. Lint/build and PS-E1-009 tests pass | PASS | Latest quality gates (lint, typecheck, build, targeted Prettier, scoped diff check) passed at `tests.md:971-977`; latest DB/E2E counts and zero skips are `tests.md:920-969`. |

## Mandatory focused checks

| Check | Result | Evidence |
|---|---|---|
| Atomic Evidence creation + VehicleObservation attachment + projection/audit update | PASS | Route dispatches VehicleObservation uploads directly to `createVehicleObservationEvidence` (`src/app/api/evidence/route.ts:63-70`). `commands.ts:554-628` performs creation, attachment/version update, event/projection update, creation-audit metadata update, upload audit, and attachment audit inside one Prisma transaction. `commands.ts:629-631` removes the stored artifact on rollback; `evidence-service.ts:64-99` also removes storage if the Evidence insert fails. Rollback test proves no DB Evidence, event, audit, or observation Evidence-ID orphan (`vehicle-watch-slices-4-7.postgres.test.ts:547-608`). |
| Foreign resource, pending-token, actor-scope rejection | PASS | Pending token/resource/actor checks are `commands.ts:50-82`; tests cover missing/foreign/pending Evidence and unassigned actor at `vehicle-watch-slices-4-7.postgres.test.ts:451-535`. Verification rejects foreign Evidence at `:761-772`. |
| Python Evidence-ID URLs and audit equality; no fixed anchor-count assertion | PASS | `playwright/test_vehicles.py:39-53` collects unique Evidence-ID URLs, asserts uniqueness, and compares the DB audit Evidence ID; `:58-62` scopes visibility to that actual URL. Latest Python run passed 8/8 (`tests.md:950-969`). |
| Worker tick serialization and outbox retry/backoff | PASS | `src/modules/eventing/worker.ts:4-19` serializes ticks with `tickInFlight` and awaits overdue processing before one outbox message. `src/modules/eventing/outbox.ts:10-15,126-181` uses a claim token/lease, exponential capped backoff, attempt increment, and dead-letter terminal state. Latest SLA 3x 6/6 and relevant DB 8-file/51-test run passed (`tests.md:920-939`). No test busy-retry loop remains in `tests/platform/sla.integration.test.ts:144-166`; browser tests contain no arbitrary sleep (`tests.md:567-577`). |
| Active OrganizationUnit ancestor scope; peer/foreign denial | PASS | Target must be active and must occur in the actor's parent chain: `commands.ts:805-826,849-856`; peer denial, authorized parent escalation, idempotent retry and one event are asserted at `vehicle-watch-slices-4-7.postgres.test.ts:1062-1100`. OrganizationUnit API lists only active units (`src/modules/identity/local-provider.ts:191-208`). |
| Effective-window exclusion migration | PASS | `prisma/migrations/20260922090000_ps_e1_009_vehicle_active_identity/migration.sql:1-25`; migration status current at `tests.md:913-918`. |
| Registry event ownership/version | PASS | Registry event ownership is `src/modules/vehicles/domain.ts:1-36`; contract assertions are `vehicle-watch-contract.test.ts:116-142`; registry command aggregate type/version is `commands.ts:162-177,247-261`. |
| Transaction-scoped notifications | PASS | Match and escalation pass `tx` to `createInAppNotification` at `commands.ts:383-394,877-888`; notification helper accepts the transaction client, and the latest DB suite passed (`tests.md:920-931`). |
| Offline idempotency/stale transitions | PASS | Client-ID uniqueness/replay and stale base-version checks are covered at `vehicle-watch-slices-4-7.postgres.test.ts:869-907,994-1057`; latest browser run passed (`tests.md:941-969`). |
| Mock no-network/manual fallback | PASS | Source regex checks prohibit fetch/XHR/http imports (`vehicle-watch-slices-8-9.test.ts:34-50`); unavailable adapter keeps `manualInputAvailable` true (`:52-61`). |
| Assignment/API URL access | PASS | Projection assignment filtering/detail authorization: `projection.ts:242-342`; Evidence GET authorization and audit: `src/app/api/evidence/route.ts:102-121`; latest TS/Python access cases passed (`tests.md:941-969`). |

## Overall result

**PASS.** All ten implementation steps and all twelve acceptance criteria have
current code/test evidence. The previous blockers are remediated: Evidence
upload plus observation binding is now one transaction with artifact cleanup,
the Python suite checks actual unique Evidence-ID URLs rather than a fixed
anchor count, and worker/outbox retry behavior is serialized and backed by
repeatable SLA runs.

## Trục trặc gặp phải

Latest evidence records a first WSL-to-native-PowerShell environment quoting
failure, transient first combined/SLA failures, and an exploratory Prettier
invocation that included Python. Each was corrected or rerun; the final
scoped results are the PASS results cited above. No source or ticket change was
made during this review.

Implementation commit: `60ccf3f` (`feat: complete vehicle watch roadmap ticket`)
Closure commit: `b997e27` (`chore: close Ticket 06 evidence`)
