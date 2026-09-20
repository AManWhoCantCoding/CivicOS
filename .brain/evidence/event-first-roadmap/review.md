# Reviewer evidence — civicos-event-first-roadmap

Review-only pass. No source, config, test, README, or `.scratch/**` file was changed; no ticket status or checkbox was changed; no commit was made.

## Evidence key

- **V** = `.brain/evidence/event-first-roadmap/verification.md`: native readiness/quality gates at lines 7–25; DB run and failure at 29–59; E2E at 61–69; migration audit at 71–86; static audit at 88–99; prior ticket map at 110–181.
- **E02** = `.brain/evidence/02-native-harness-login/tests.md:96-161`, latest identity desktop/mobile suites and targeted login/logout, all passing.
- **E03** = `.brain/evidence/03-native-acceptance-gate/tests.md:100-173`, latest native full suite history (16/16 failure run); this is not used as a pass claim where it conflicts with the later independent pass below.
- **E05** = `.brain/evidence/05-windows-next-transport-harness/tests.md:186-278`, independent native run: affected sweep 18/18 and full suite 32/32 passed; `.brain/evidence/05-windows-next-transport-harness/tests.md:175-184` records the immediately prior failing run.
- **E07** = `.brain/evidence/07-python-313-readme/tests.md:372-450,451-576`, latest targeted 18/18, full 32/32, README/format/version/path checks passing.
- **DB** = command `$env:RUN_DB_TESTS="1"; npm.cmd test`, recorded at V:31–46 and raw artifact `.brain/evidence/event-first-roadmap/vitest-db.log`; result 27/28, exit 1.
- **Q** = `npm.cmd run lint`, `typecheck`, `format:check`, `build`, `prisma:generate`, raw artifacts under `.brain/evidence/event-first-roadmap/`; V:17–25 records all five exit 0.
- **M** = `npx.cmd prisma migrate status; npm.cmd run prisma:migrate:deploy` twice; V:73–86, clean/no-op second deployment.
- **TS-E2E** = `npm.cmd run test:e2e`; V:63–69, 12/12 desktop/mobile passed.
- **STATIC** = `.brain/evidence/event-first-roadmap/static-audit.log`, summarized at V:88–99. It explicitly records `src/modules/eventing/worker.ts:2` importing `@/modules/platform/sla`.
- **RAW05** = native raw evidence for failed inspection/vehicle workflows at E05:121–184; later independent pass is E05:186–278.

Classification is evidence-based: a passing related test is not treated as proof of an unasserted criterion. `NOT OBSERVED` means no direct assertion/result for that exact line was supplied.

## Ticket 01 — Event kernel and transactional outbox

| # | Acceptance criterion (ticket line) | Result | Exact evidence |
|---|---|---|---|
| AC01 | Every event stores all envelope fields, actor snapshot, correlation/causation IDs, payload and metadata. | NOT OBSERVED | `STATIC`/V:96 reports source fields, but no direct persistence assertion covers every listed field. |
| AC02 | Duplicate `eventId` or `(aggregateId, aggregateVersion)` cannot be stored. | NOT OBSERVED | `DB`; the supplied PostgreSQL test source only directly asserts skipped-version rejection, not both duplicate cases. |
| AC03 | Domain state and event record commit/rollback in one transaction. | PASS | `DB`; `tests/eventing/event-kernel.postgres.test.ts` atomic test, lines 22–47, passed in the 27/28 run. |
| AC04 | Wrong aggregate version is rejected without overwrite. | PASS | `DB`; same test file lines 49–82, assertion for `AGGREGATE_VERSION_CONFLICT`, passed. |
| AC05 | Multi-worker-safe claim and one effective dispatch through idempotency. | FAIL | `DB`/V:39–44; `processOutboxUntilIdle()` at `tests/eventing/event-kernel.postgres.test.ts:99` returned `0`, expected `>0`; subsequent processed-row assertions were not a successful proof. |
| AC06 | Consumer errors retry with backoff, attempt count, and dead-letter threshold. | NOT OBSERVED | `DB`/V:120 explicitly says retry/dead-letter has no independent passing result. |
| AC07 | Projection delete/rebuild from event stream equals direct processing. | NOT OBSERVED | `DB`; no direct replay-equivalence result is listed. |
| AC08 | Worker health/lag detects projection older than 10 seconds in normal test conditions. | NOT OBSERVED | `STATIC` finds lag signal references, but no numeric freshness/10-second test result is present. |
| AC09 | Integration tests use real PostgreSQL, not mocked Prisma for transaction/locking/uniqueness. | PASS | `DB`; command ran with `RUN_DB_TESTS=1`; V:35–59 records PostgreSQL suite and eventing tests. |
| AC10 | `npm run lint`, `npm run build`, and new test command run on clean DB. | FAIL | `Q` passed lint/build, but `DB` exited 1; V:35–46. |
| AC11 | No event consumer imports another consumer's internal implementation. | NOT OBSERVED | `STATIC` verifies registrations but does not prove this exact negative criterion. |

| # | Implementation step (ticket line) | Result | Exact evidence |
|---|---|---|---|
| S01 | Chốt runtime baseline before schema; PostgreSQL, env, commands; compose and Prisma generate first. | PASS | V:7–13 and `Q` (`npm.cmd run prisma:generate`) exit 0. |
| S02 | Define envelope/persistence contract and write contract test first. | NOT OBSERVED | `STATIC`/V:96 shows fields; no ordering or contract-test evidence. |
| S03 | Create schema/migration and clean-DB migration audit. | PASS | `M`; V:75–84 shows ordered migrations and two no-op deploys. |
| S04 | Public Event kernel API only; no Prisma/repository internals exported. | NOT OBSERVED | `STATIC` found public entry points, but no direct export-boundary assertion. |
| S05 | Atomic append and optimistic concurrency; reject stale/duplicate versions. | PASS | `DB`; atomic and skipped-version tests passed, `tests/eventing/event-kernel.postgres.test.ts:22-82`. |
| S06 | Safe claim, retry/backoff, dead-letter, idempotent side effects. | FAIL | `DB` failure at `tests/eventing/event-kernel.postgres.test.ts:99`; V:120. |
| S07 | Consumer dispatch/checkpoint and replay without changing original events. | NOT OBSERVED | `DB` has no direct passing replay/checkpoint result in the supplied evidence. |
| S08 | Health and lag signal sufficient for Ticket 07 p95/10 seconds. | NOT OBSERVED | `STATIC` only; no latency measurement. |
| S09 | Real-PostgreSQL integration coverage for rollback/concurrency/retry/replay. | FAIL | `DB` is real PostgreSQL but the full command is 27/28 and the outbox case fails, V:35–59. |
| S10 | Verification gate and all eventing tests pass. | FAIL | `Q` passes, but `DB` exits 1 with one failed eventing test. |

## Ticket 02 — Identity, assignment and access

| # | Acceptance criterion (ticket line) | Result | Exact evidence |
|---|---|---|---|
| AC01 | Development IdentityProvider login yields expiring HttpOnly session. | PASS | `E02:150-158`; targeted desktop/mobile login suites pass. |
| AC02 | Role, OrganizationUnit, Assignment persist with active/revoked state and audit history. | PASS | V:127 and `DB`; identity integration group 3/3 passed; revocation is named in `playwright/test_identity_shared.py` per V:105–108. |
| AC03 | Commander sees command scope; assignee sees related record; unassigned user denied. | PASS | `E02:152-158`; full identity suites pass, including access scenarios. |
| AC04 | Revocation removes new read access without deleting audit/business history. | PASS | `E02:152-158`; revocation scenario is included in full native identity suite. |
| AC05 | Authorization is checked at API/domain boundary, not only UI visibility. | PASS | V:127 and `tests/identity/authorization.integration.test.ts` group result 3/3; direct API/domain authorization suite passed. |
| AC06 | Sensitive read/download/mutation creates AuditEvent with actor/record/time/reason. | NOT OBSERVED | `DB` reports audit tests passed, but no criterion-specific assertion/result is quoted in the supplied evidence. |
| AC07 | Encryption key is outside DB; plaintext sensitive value absent from payload/log. | NOT OBSERVED | No direct key-location/plaintext scan result is recorded in V or native evidence. |
| AC08 | Login/denied/expired UI has labels, focus, inline errors, no placeholder-only labels. | PASS | `TS-E2E` login/access 2/2 plus `E02:155-158`; native targeted UI checks pass. |
| AC09 | Browser test blocks unassigned direct URL/API ID tampering. | PASS | `E02:152-158`; full identity suite includes assignment/access scenarios and passes. |
| AC10 | Lint/build and all identity tests pass. | PASS | `Q` and `DB`; V:20–23, 52–54 show quality and identity group 3/3 pass. |

| # | Implementation step | Result | Exact evidence |
|---|---|---|---|
| S01 | Authorization matrix maps every actor case to a test. | NOT OBSERVED | `E02` names scenarios, but no matrix artifact mapping every cell is supplied. |
| S02 | Identity schema includes required entities/timestamps/actor. | NOT OBSERVED | `DB` pass count does not prove each schema field. |
| S03 | Development seed contains commander, assigned/unassigned users and superior unit, without secrets/real data. | NOT OBSERVED | No seed-content inspection evidence. |
| S04 | Local provider/session has login/logout, HttpOnly, expiration, invalid-session path and provider seam. | PASS | `E02:152-158`; targeted login/wrong-password/logout and full suite pass. |
| S05 | Separate authorization functions and API/domain boundary checks. | PASS | `tests/identity/authorization.integration.test.ts` group 3/3, V:52–54. |
| S06 | Assignment lifecycle and event/audit for changes. | PASS | `E02:152-158`; revocation/cross-organization scenarios pass. |
| S07 | Audit and encryption boundary. | NOT OBSERVED | No direct encryption/plaintext evidence; `E02` does not cover it. |
| S08 | API/UI endpoints and consistent validation/error shape. | NOT OBSERVED | `TS-E2E` proves selected flows, not every endpoint/error shape. |
| S09 | Matrix tests include allow/deny/revoke/cross-unit, audit/encryption and browser tampering. | NOT OBSERVED | Identity/access tests pass, but audit/encryption subclaims lack direct evidence. |
| S10 | Verification gate: no sensitive plaintext, quality/e2e, public entry boundary. | NOT OBSERVED | Quality/e2e pass, but plaintext and export-boundary checks are absent. |

## Ticket 03 — Shared field/evidence/geo/SLA

| # | Acceptance criterion | Result | Exact evidence |
|---|---|---|---|
| AC01 | Evidence stores hash, actor, capture time, GPS and immutable original reference. | NOT OBSERVED | V:135 reports platform 7/7 and static signals, but no field-by-field assertion. |
| AC02 | Same-content upload is idempotent; replacement creates new Evidence. | NOT OBSERVED | No direct result for both duplicate and replacement behavior. |
| AC03 | Unauthorized user cannot read metadata/download by changing ID. | NOT OBSERVED | No direct platform authorization result is quoted. |
| AC04 | GeoPoint/GeoArea share coordinate contract; invalid polygon rejected. | PASS | `DB`; platform group 7/7 includes geo integration suite, V:54. |
| AC05 | Continuous SLA crosses weekends/holidays; configurable threshold; one overdue event. | PASS | `DB`; platform SLA suite included in 7/7, V:54. |
| AC06 | Notification comes from outbox, not direct domain side effect. | NOT OBSERVED | `STATIC` finds notification/outbox signals, but no direct causality assertion. |
| AC07 | Offline command has client ID/timestamps/retry and is idempotent. | PASS | `DB`; platform group 7/7 includes offline-sync integration, V:54. |
| AC08 | Stale transition rejected; append-only FieldUpdate not overwritten. | PASS | `DB`; platform group 7/7, but exact subassertion is not independently quoted. |
| AC09 | Field shell shows online/offline/syncing/failed/synced and survives reload. | PASS | `TS-E2E`; field-shell desktop/mobile 2/2, V:67. |
| AC10 | Browser test covers desktop/mobile, keyboard focus, reduced motion and main errors. | NOT OBSERVED | `TS-E2E` reports 2/2 but does not enumerate every required assertion. |
| AC11 | Lint/build and all shared-capability tests pass. | PASS | `Q` and `DB`; V:20–23, 54. |

| # | Implementation step | Result | Exact evidence |
|---|---|---|---|
| S01 | Platform ownership/public contracts only. | NOT OBSERVED | `STATIC` finds public entry point and module directories, not complete ownership proof. |
| S02 | Shared migration/entities/indexes. | NOT OBSERVED | `M` proves migration status, not every entity/index. |
| S03 | Evidence adapter/hash/immutable authorization boundary. | NOT OBSERVED | No direct field-level Evidence test result. |
| S04 | Geo value objects and invalid-input tests. | PASS | `DB`; platform group 7/7 includes geo integration. |
| S05 | SLA engine timezone/weekend/holiday/once/retry/idempotency. | NOT OBSERVED | Passing platform count is not direct proof of each substep. |
| S06 | Notification projection from outbox with retry/lag/error. | NOT OBSERVED | `STATIC` only; no direct outbox-origin assertion. |
| S07 | Offline sync persistence/idempotency/stale rejection/append-only. | PASS | `DB`; offline-sync group included in platform 7/7. |
| S08 | Shared field shell states and no client-only synced state. | PASS | `TS-E2E`; field-shell 2/2. |
| S09 | UI preflight labels/focus/touch/mobile/contrast/reduced motion. | NOT OBSERVED | No complete criterion-by-criterion preflight output. |
| S10 | Tests/verification including outbox notification origin. | NOT OBSERVED | `DB`/`TS-E2E` pass counts do not directly prove notification origin. |

## Ticket 04 — PS-E1-005 Incident

| # | Acceptance criterion | Result | Exact evidence |
|---|---|---|---|
| AC01 | Intake accepts channel/time/content/location/source with server validation. | PASS | `TS-E2E`; PS005 desktop/mobile 2/2, V:67; incident group 4/4, V:55. |
| AC02 | Exactly one Incident per IntakeReport and both events in one operation. | NOT OBSERVED | Passing PS005 smoke does not directly assert exact cardinality/atomic event pair. |
| AC03 | Only specified valid transitions. | PASS | `DB`; incident group 4/4, V:55; native E2E lifecycle evidence `E05:186-278`. |
| AC04 | Only assignee writes verification; out-of-scope user cannot read/write. | PASS | `E05:186-278` 18/18 affected suite and `TS-E2E` PS005 2/2. |
| AC05 | Transfer/resolve/close require commander approval; missing approval rejected/no success event. | PASS | `E05:186-278` full native 32/32 includes incident approval flow; `E07:227-254` prior failing node later passed. |
| AC06 | Timeline derives from projection/event history, not client/hard-coded state. | PASS | `DB` incident group and `E05:186-278` projection lifecycle pass. |
| AC07 | Configured SLA reminder/overdue for required Incident states. | NOT OBSERVED | No direct SLA threshold/overdue assertion is quoted for Incident. |
| AC08 | Sensitive read/mutation audited; informant redacted for unauthorized list/projection. | NOT OBSERVED | No direct redaction/audit result in current evidence. |
| AC09 | Idempotency key prevents duplicate Incident/Assignment/event. | NOT OBSERVED | No direct duplicate-command result quoted. |
| AC10 | E2E intake-to-close and denied access. | PASS | `TS-E2E` PS005 2/2 and `E05:186-278` native full 32/32. |
| AC11 | UI loading/empty/error/denied/focus/mobile and no clipping. | NOT OBSERVED | E2E pass count does not enumerate all UI states. |
| AC12 | Lint/build and PS005 tests pass. | PASS | `Q`; incident group 4/4 in V:55. |

| # | Implementation step | Result | Exact evidence |
|---|---|---|---|
| S01 | Freeze state machine/commands and reject unknown transitions. | PASS | `DB`; incident group 4/4 and native lifecycle suite `E05:186-278`. |
| S02 | Define aggregate/event/idempotency/correlation contracts before routes. | NOT OBSERVED | No contract-order evidence. |
| S03 | Schema/migration with shared references and sensitive source IDs. | NOT OBSERVED | `M` does not identify PS005 schema fields. |
| S04 | Atomic register creates one IntakeReport/Incident and two events. | NOT OBSERVED | No direct cardinality/event-pair assertion. |
| S05 | Lifecycle commands check version/auth/fields/approval. | PASS | `E05:186-278` full native workflow passes approval/denial paths. |
| S06 | Event-only projection/timeline with filters and redaction. | NOT OBSERVED | Projection smoke passes, but redaction/filter details are not directly observed. |
| S07 | REST validation/idempotency/auth boundary. | NOT OBSERVED | E2E is insufficient to prove every route/header/error shape. |
| S08 | Trust-first responsive UI states/accessibility. | NOT OBSERVED | No complete UI preflight output. |
| S09 | Event/auth/audit/SLA tests including rebuild. | NOT OBSERVED | Passing group does not directly prove every listed subtest. |
| S10 | Browser full path plus quality/format/out-of-scope verification. | FAIL | `DB` is not fully green (27/28), despite `TS-E2E`/`Q` passing; V:35–46. |

## Ticket 05 — PS-E1-007 Inspection

| # | Acceptance criterion | Result | Exact evidence |
|---|---|---|---|
| AC01 | Establishment create/edit with type/owner/address/license/valid GeoPoint. | PASS | `E05:186-278` affected sweep 18/18 and full 32/32; establishment case included. |
| AC02 | Configured periodic schedule, upcoming/overdue, no duplicate schedule. | PASS | `E05:186-278` inspection suite 4/4; establishment/schedule workflow passes. |
| AC03 | Different checklist templates by EstablishmentType. | NOT OBSERVED | No direct template-variance assertion quoted. |
| AC04 | Assigned field officer only; safe checklist save during poor network. | PASS | `E05:186-278` full 32/32; inspection offline workflow is included in the latest independent pass. |
| AC05 | Started/finding/completed order and required Evidence linkage. | PASS | `E05:186-278` full 32/32; latest independent inspection workflow passes. |
| AC06 | Result is limited to allowed values; recommendation requires approval. | PASS | `E05:186-278` full 32/32 includes recommendation workflow. |
| AC07 | Evidence image hash/time/GPS; original immutable. | NOT OBSERVED | No field-level Evidence assertion quoted separately. |
| AC08 | Recommendation/violation SLA crosses weekends/holidays. | NOT OBSERVED | No direct numeric/threshold SLA result for Inspection. |
| AC09 | Unassigned user cannot read sensitive inspection/download Evidence. | PASS | `E05:186-278` full suite includes access flows; latest 32/32. |
| AC10 | E2E establishment-to-approval and denied/retry states. | PASS | `E05:186-278` full 32/32 and `TS-E2E` PS007 2/2. |
| AC11 | UI loading/empty/error/offline-save/success/validation desktop/mobile. | NOT OBSERVED | Pass counts do not enumerate every state. |
| AC12 | Lint/build and PS007 tests pass. | PASS | `Q`; inspection group 3/3 V:56 and native full 32/32 E05. |

| # | Implementation step | Result | Exact evidence |
|---|---|---|---|
| S01 | Define vocabulary/lifecycle and avoid automatic legal conclusion. | NOT OBSERVED | No direct static/legal-conclusion audit result. |
| S02 | Define event/command ownership and versions before coding. | NOT OBSERVED | `STATIC` mentions registrations, not owner/version completeness. |
| S03 | Schema preserves checklist version/history. | NOT OBSERVED | No schema-field evidence. |
| S04 | Catalog/scheduling validation and once-per-occurrence event. | PASS | `E05:186-278` establishment/schedule workflow passes; exact event cardinality not independently quoted. |
| S05 | Checklist selection/save/mandatory/Evidence/completion validation. | PASS | `E05:186-278` latest independent full suite 32/32. Earlier failures are retained at `RAW05`; latest run supersedes them for observed behavior. |
| S06 | Finding/Evidence and Approval/rejected history rules. | PASS | `E05:186-278` full 32/32 includes recommendation approval/rejection. |
| S07 | Projections/APIs with server validation. | NOT OBSERVED | E2E does not prove all endpoint/schema details. |
| S08 | Web/PWA UI states and mobile one-hand workflow. | NOT OBSERVED | No complete UI preflight artifact. |
| S09 | Domain/access tests including seven-day SLA/duplicates. | NOT OBSERVED | Test pass count alone does not identify each required assertion. |
| S10 | E2E gate and no automatic legal conclusion. | NOT OBSERVED | E2E passed, but no direct legal-conclusion audit result. |

## Ticket 06 — PS-E1-009 Vehicle watch

| # | Acceptance criterion | Result | Exact evidence |
|---|---|---|---|
| AC01 | Authorized user creates registry entry with plate/source/reason/window/status. | PASS | `E05:186-278` full 32/32 includes vehicle registry flow. |
| AC02 | Expired entry cannot active-match; history remains queryable. | NOT OBSERVED | No direct expired-match assertion quoted. |
| AC03 | Manual observation has plate/time/GeoPoint/photo Evidence. | PASS | `E05:186-278` full 32/32 vehicle workflow passes. |
| AC04 | Match creates suggestion only; confirmation required before escalation. | PASS | `E05:186-278` full 32/32 vehicle flow includes match/confirmation/escalation. |
| AC05 | Verification records actor/result/time/GPS/Evidence without changing original. | NOT OBSERVED | No direct immutability assertion quoted. |
| AC06 | Two-hour continuous SLA, overdue event and retry notification. | NOT OBSERVED | No direct numeric two-hour/overdue result. |
| AC07 | Offline client ID/idempotency/pending states/stale rejection. | PASS | `E05:186-278` full 32/32 includes duplicate offline and stale/access workflows. |
| AC08 | Deterministic mock camera fixture with no external network. | NOT OBSERVED | No direct network-block assertion in supplied current evidence. |
| AC09 | Unassigned user cannot read/write observation/Evidence by URL/ID. | PASS | `E05:186-278` full 32/32 includes denied vehicle role workflow. |
| AC10 | E2E registry → observation → confirmation → verification → escalation. | PASS | `E05:186-278` full 32/32; `TS-E2E` PS009 2/2. |
| AC11 | PWA mobile, focus, loading/error/offline, reduced motion. | NOT OBSERVED | E2E pass count does not enumerate all UI states. |
| AC12 | Lint/build and PS009 tests pass. | PASS | `Q`; vehicle group 2/2 V:57 and native full 32/32 E05. |

| # | Implementation step | Result | Exact evidence |
|---|---|---|---|
| S01 | Registry/observation boundaries and match as suggestion. | NOT OBSERVED | No direct static/domain assertion for the legal/operational distinction. |
| S02 | Freeze event/command contracts and confirmation requirement. | NOT OBSERVED | No owner/version/contract artifact. |
| S03 | Schema with normalization/source/window/Geo/Evidence/assignment. | NOT OBSERVED | No field-level schema evidence. |
| S04 | Registry lifecycle/expiry/history/no active duplicate. | NOT OBSERVED | No direct result for each lifecycle invariant. |
| S05 | Manual observation validation/Evidence/event/pending projection. | PASS | `E05:186-278` latest full vehicle workflow passes. |
| S06 | Active-only match, suggestion, authorized confirmation, verification/escalation. | PASS | `E05:186-278` full 32/32 vehicle workflow. |
| S07 | Verification and continuous two-hour SLA/retry/idempotency. | NOT OBSERVED | No direct two-hour measurement. |
| S08 | Deterministic offline-safe mock adapter/no network. | NOT OBSERVED | No direct network assertion. |
| S09 | PWA/registry UI and trust-first states. | NOT OBSERVED | No complete UI preflight output. |
| S10 | Sync/security/E2E and all verification commands. | PASS | `E05:186-278` full 32/32 and affected 18/18. |

## Ticket 07 — Parallel-wave integration

| # | Acceptance criterion | Result | Exact evidence |
|---|---|---|---|
| AC01 | Clean DB and migrations run in dependency order, no uncommitted local dependency. | PASS | `M`; V:75–84 ordered migrations, current status, two no-op deploys. |
| AC02 | Integration order 005 → 007 → 009, each keeps lint/typecheck/build green. | PASS | V:50–58 module groups pass; `Q` all five commands exit 0; E05/E07 latest native suites pass. |
| AC03 | No module directly writes another module's source-of-truth aggregate/table. | NOT OBSERVED | `STATIC` does not provide a direct write-boundary proof. |
| AC04 | All three-module events have version/owner/consumer and replay rebuilds projections. | NOT OBSERVED | `STATIC` reports registrations, but no complete owner/version/replay-equivalence result. |
| AC05 | Cross-module links are IDs/projections/suggestions; sensitive links require authorization confirmation. | NOT OBSERVED | No direct cross-module link audit. |
| AC06 | Authorization matrix exercised across all five actor cases on every API/UI route. | NOT OBSERVED | Identity/module tests pass, but no complete all-module matrix result is recorded. |
| AC07 | AuditEvent for sensitive read/download/mutation in all three modules. | NOT OBSERVED | No complete three-module audit result. |
| AC08 | Continuous weekend/holiday SLA and non-duplicating notification retry. | NOT OBSERVED | No direct cross-module SLA/retry assertion. |
| AC09 | Projection freshness p95 ≤10 seconds under defined workload; lag/failure signal. | NOT OBSERVED | No numeric p95 workload result. Signals were only found by `STATIC`; per assignment this cannot support PASS. |
| AC10 | E2E smoke covers all three UI-to-read-model paths. | PASS | `TS-E2E`; V:65–69 reports 12/12, including PS005/007/009 and parallel-wave specs. |
| AC11 | UI preflight checks clipping, labels/errors/focus, mobile overflow, reduced motion. | NOT OBSERVED | No complete preflight result enumerating these checks. |
| AC12 | Lint/build/all unit/integration/e2e/format pass. | FAIL | `Q` and `TS-E2E` pass, but `DB`/full `npm.cmd test` is 27/28, exit 1 (V:35–46). |
| AC13 | README accurately documents only runnable app/worker/PostgreSQL/migration/test commands. | PASS | `STATIC`/V:99 package/README command audit; `E07:441-450,502-522` README audit and command evidence. |

| # | Implementation step | Result | Exact evidence |
|---|---|---|---|
| S01 | Freeze integration baseline and reject direct internal imports. | FAIL | `STATIC`; explicit exception `src/modules/eventing/worker.ts:2` imports `@/modules/platform/sla`. |
| S02 | Clean migration in dependency order; second run no-op. | PASS | `M`; V:73–86. |
| S03 | Integrate PS005 first and verify its projection/assignment/approval/audit/SLA. | NOT OBSERVED | `TS-E2E`/E05 pass, but no complete criterion-specific bundle for every named concern. |
| S04 | Integrate PS007 second and verify checklist/Evidence/approval/no Incident writes. | NOT OBSERVED | E05 full suite passes, but no direct no-write audit or complete named bundle. |
| S05 | Integrate PS009 third and verify offline/PWA/match/Evidence/two-hour SLA/no network. | NOT OBSERVED | E05 full suite passes, but no direct two-hour/no-network measurements. |
| S06 | Cross-module replay and compare read models with authorization-gated suggestions. | NOT OBSERVED | No direct replay comparison result. |
| S07 | Full authorization/audit matrix. | NOT OBSERVED | No complete matrix artifact. |
| S08 | Resilience/freshness including numeric p95 target. | NOT OBSERVED | No numeric p95 result; only static lag signal. |
| S09 | UI preflight across desktop/mobile/accessibility/error states. | NOT OBSERVED | No complete preflight artifact. |
| S10 | Final operational verification with all suites and only verified README commands. | FAIL | `DB`/`npm.cmd test` exit 1 despite `Q`, `TS-E2E`, `M`, and `E07` passing. |

## Dependency order and closure legality

| Ticket | Dependency check | Closure result |
|---|---|---|
| 01 | No blocker; base ticket. | **FAIL — cannot legally close:** AC05/AC10 and steps S06/S09/S10 fail; several exact claims are not observed. |
| 02 | Blocked by 01. | **NOT APPROVABLE:** dependency 01 is not closeable; AC06–07 and steps S01/S03/S07–S10 remain unsupported even though core login/access evidence passes. |
| 03 | Blocked by 01 and 02. | **NOT APPROVABLE:** upstream closure is unresolved and multiple exact Evidence/notification/UI claims are not observed. |
| 04 | Blocked by 01–03. | **NOT APPROVABLE:** upstream unresolved; exact atomic/idempotency/SLA/audit/UI claims remain unsupported. |
| 05 | Blocked by 01–03. | **NOT APPROVABLE:** upstream unresolved; several exact domain/schema/SLA/UI claims remain unsupported. |
| 06 | Blocked by 01–03. | **NOT APPROVABLE:** upstream unresolved; expiry/immutability/two-hour SLA/mock-network/UI claims remain unsupported. |
| 07 | Blocked by 04–06. | **FAIL — cannot legally close:** AC09 p95 is NOT OBSERVED, AC12 and steps S01/S10 fail; it also depends on tickets not legally closeable. |

Planner closure rule applied: every AC and implementation step must be checked with direct evidence; Reviewer must PASS; then commit is required. No ticket meets that rule here. No commit was made, as instructed.

## Explicit observations requested

1. **Outbox failure:** `tests/eventing/event-kernel.postgres.test.ts:99` calls `processOutboxUntilIdle()` and receives `0` instead of `>0` (V:39–46; raw `.brain/evidence/event-first-roadmap/vitest-db.log`). This is a real failing PostgreSQL test, not an unsupported inference, and blocks Ticket 01 and the all-tests closure criteria.
2. **Boundary exception:** `.brain/evidence/event-first-roadmap/static-audit.log` records `src/modules/eventing/worker.ts:2` importing `@/modules/platform/sla` directly (V:92–96). Ticket 07 S01 is FAIL against its explicit “reject direct imports into another module’s internals” step. The observation is retained; it is not approved away because other public entry points exist.
3. **Ticket 07 p95:** no numeric p95 freshness result under a defined workload exists. Static lag/failure signals do not satisfy AC09 or S08. Result is NOT OBSERVED, not PASS.

## Recommended next action

Planner should keep all tickets open, address the failing outbox dispatch and the direct internal import, then obtain direct evidence for every currently NOT OBSERVED AC/step—especially replay, authorization/audit boundaries, SLA timings, UI preflight, and Ticket 07 numeric p95—before requesting another closure review. No source changes were made by this review.
