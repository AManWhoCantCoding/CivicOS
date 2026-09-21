# Ticket 04 final closure-gate review

Review-only. No Developer was spawned, no source/config/test/README/.scratch
file was changed, and no ticket status or checkbox was changed. The reviewed
implementation and evidence were committed afterward as `82b790c`.

## Evidence basis

- Ticket acceptance criteria: `.scratch/civicos-event-first-roadmap/issues/04-ps005-intake-incident.md:59-72`.
- Current PostgreSQL/browser verification: `.brain/evidence/event-first-roadmap/verification-ticket-04-final.md:21-144`.
- Earlier failing run retained, including the approval timeout and Prisma N-API panic: `.brain/evidence/event-first-roadmap/verification-ticket-04.md:5-29,56-61`.
- Current direct PostgreSQL tests: `tests/incidents/incident-ticket04.postgres.test.ts:342-874` and `tests/incidents/incident-approval.postgres.test.ts:30-208`.
- Current browser tests: `tests/e2e/ps005-incident.spec.ts:49-339`.
- No prior Ticket 04 review evidence file was present.
- Working tree was already dirty before this review; existing modifications are not this review's changes (`git status --short`).

## Acceptance criteria

| ID | Result | Exact evidence |
|---|---|---|
| AC1 | PASS | Server validation is exercised against PostgreSQL for content, received time, channel, incomplete/invalid location, and role at `tests/incidents/incident-ticket04.postgres.test.ts:347-365`; input parsing is also covered at `:67-101`. The HTTP form submits channel/time/content/location/source fields at `tests/e2e/ps005-incident.spec.ts:49-58` and `src/components/incidents/IntakeReportForm.tsx:94-186`. |
| AC2 | PASS | The PostgreSQL test asserts exactly one IntakeReport and one Incident, reciprocal IDs, and both `IntakeReportReceived`/`IncidentRegistered` events at `tests/incidents/incident-ticket04.postgres.test.ts:367-415`. The trigger-injected transaction failure verifies unchanged counts and no sentinel rows at `:417-465`. |
| AC3 | PASS | The transition matrix accepts only the specified edges and rejects every other pair at `tests/incidents/incident-ticket04.postgres.test.ts:104-132`; the integration test separately rejects skipping classification at `tests/incidents/incident-workflow.integration.test.ts:5-23`. |
| AC4 | PASS | Assignment scope is tested for classify, verify, assignment, unassigned reads, and cross-unit reads/writes at `tests/incidents/incident-ticket04.postgres.test.ts:492-542`. The browser flow assigns Field, verifies as Field, and checks unassigned UI/API denial at `tests/e2e/ps005-incident.spec.ts:86-99,149-175`. |
| AC5 | PASS | Transfer, resolve, and close remain pending until approval; rejection/history/already-decided behavior and the complete event sequence are asserted at `tests/incidents/incident-ticket04.postgres.test.ts:544-644`. The focused approval seam repeats transfer/resolution/closure approval and event assertions at `tests/incidents/incident-approval.postgres.test.ts:91-167`; the browser completes all three approvals at `tests/e2e/ps005-incident.spec.ts:109-145`. |
| AC6 | PASS | Detail events are read and version-ordered, projection rebuild is invoked, and list filtering/redaction is asserted at `tests/incidents/incident-ticket04.postgres.test.ts:646-693`. The timeline UI renders the returned event list in `src/components/incidents/IncidentTimeline.tsx:1-31`, and the E2E checks all eleven lifecycle event labels at `tests/e2e/ps005-incident.spec.ts:132-147`. |
| AC7 | PASS | PostgreSQL tests assert SLA phase advancement, active kinds, overdue status/event, and completion at `tests/incidents/incident-ticket04.postgres.test.ts:742-811`; elapsed-clock due-time and overdue behavior is directly asserted at `:813-874`. Final verification records the focused suite passing at `.brain/evidence/event-first-roadmap/verification-ticket-04-final.md:23-44,125-130`. Limitation recorded honestly: exact per-status duration constants are not independently asserted for every status; the evidence proves the configured kinds, the explicit 24-hour/7-day clock cases, and overdue behavior, not an unlisted stronger requirement. |
| AC8 | PASS | Creation, mutation, sensitive read, and list AuditEvent counts are asserted at `tests/incidents/incident-ticket04.postgres.test.ts:695-740`; redaction of informant fields/values and stored source data is asserted at `:679-692`. |
| AC9 | PASS | Duplicate module idempotency returns the original result with unchanged report/incident/event counts at `tests/incidents/incident-ticket04.postgres.test.ts:467-490`; the real HTTP retry returns 201 and the same incident ID at `tests/e2e/ps005-incident.spec.ts:212-230`. |
| AC10 | PASS | The browser lifecycle starts at intake and reaches close with assignment, verification, approvals, and timeline assertions at `tests/e2e/ps005-incident.spec.ts:60-147`; denied UI/API access is at `:149-175`. The targeted file passed 12/12 in the final verification at `.brain/evidence/event-first-roadmap/verification-ticket-04-final.md:95-108`. |
| AC11 | PASS | Browser assertions cover loading, empty, error, retry, denied, keyboard focus, and no horizontal clipping at `tests/e2e/ps005-incident.spec.ts:261-339`; the final run includes the configured desktop and mobile projects, 12/12 passed at `.brain/evidence/event-first-roadmap/verification-ticket-04-final.md:95-123`. |
| AC12 | PASS | Final verification records `RUN_DB_TESTS=1 npx.cmd vitest run tests/incidents` as 3 files/21 tests passed and full `RUN_DB_TESTS=1 npm.cmd test` as 22 files/95 tests passed at `.brain/evidence/event-first-roadmap/verification-ticket-04-final.md:21-62`; typecheck rerun, lint, and build passed at `:64-93`. |

## Implementation steps

| ID | Result | Exact evidence |
|---|---|---|
| S1 | PASS | The domain exposes only the six statuses and the transition matrix rejects invalid pairs at `tests/incidents/incident-ticket04.postgres.test.ts:104-132`; lifecycle command coverage is in `:492-644`. |
| S2 | PASS | Public contracts/statuses are in `src/modules/incidents/contracts.ts:3-21`; the public entry point exports contracts and commands/projections/schemas without persistence symbols at `src/modules/incidents/index.ts:1-24`, and the boundary test asserts no Prisma export at `tests/incidents/incident-ticket04.postgres.test.ts:135-160`. |
| S3 | PASS | The one-to-one persistence/event/SLA/audit shape is directly checked at `tests/incidents/incident-ticket04.postgres.test.ts:367-415`; current migration readiness and Prisma generation are recorded in `.brain/evidence/04-remove-wsl-artifacts/tests.md:178-217`. |
| S4 | PASS | Registration validates and atomically persists one report/incident with stable IDs and initial events at `tests/incidents/incident-ticket04.postgres.test.ts:347-415`; rollback is directly verified at `:417-465`. |
| S5 | PASS | Classify/assign/verify/transfer/resolve/close, authorization, required fields, approval rejection, and history are covered at `tests/incidents/incident-ticket04.postgres.test.ts:492-644` and `tests/incidents/incident-approval.postgres.test.ts:91-174`. |
| S6 | PASS | Projection rebuild, timeline ordering, filters, and redaction are exercised at `tests/incidents/incident-ticket04.postgres.test.ts:646-693`; projection implementation reduces domain events in `src/modules/incidents/projection.ts:63-116`. |
| S7 | PASS | Intake and command routes implement server authorization, validation/error mapping, and idempotency headers at `src/app/api/intake-reports/route.ts:6-30` and `src/app/api/incidents/[incidentId]/commands/route.ts:15-98`. Exact HTTP status/error JSON is tested through real Playwright at `tests/e2e/ps005-incident.spec.ts:177-259`. Limitation recorded honestly: REST is verified through real Playwright, not direct route unit tests; the ticket does not require a direct route-unit mechanism. |
| S8 | PASS | The current form has labeled fields and inline error/denied/success states at `src/components/incidents/IntakeReportForm.tsx:22-209`; browser coverage exercises the work-queue and lifecycle UI at `tests/e2e/ps005-incident.spec.ts:49-147,261-339`. |
| S9 | PASS | PostgreSQL coverage directly verifies server validation, one-to-one/events/idempotency, rollback trigger, state machine, assignment authorization, approval/rejection/history, timeline/projection/redaction, audit, and elapsed-clock SLA in `tests/incidents/incident-ticket04.postgres.test.ts:342-874` and `tests/incidents/incident-approval.postgres.test.ts:30-208`; final focused results are 21/21 at `.brain/evidence/event-first-roadmap/verification-ticket-04-final.md:23-44`. |
| S10 | PASS | Targeted and full Playwright both passed (12/12 and 46/46) at `.brain/evidence/event-first-roadmap/verification-ticket-04-final.md:95-123`; typecheck/lint/build passed at `:64-93`. |

## Approval-timeout resolution and run integrity

| Check | Result | Evidence |
|---|---|---|
| Earlier failure retained | OBSERVED | The earlier focused/full evidence records a 5-second approval timeout and Prisma query-engine N-API panic at `.brain/evidence/event-first-roadmap/verification-ticket-04.md:13-29`. |
| Focused approval rerun | PASS | The approval test now declares a 30-second timeout at `tests/incidents/incident-approval.postgres.test.ts:91-94`; the prior green approval-inclusive run reports `incident-approval.postgres.test.ts (2 tests)` at `.brain/evidence/event-first-roadmap/verification-after-eventing-fix.md:48-82`, and the final incident run reports all 3 files/21 tests passed at `.brain/evidence/event-first-roadmap/verification-ticket-04-final.md:23-44`. |
| Full PostgreSQL/Vitest rerun | PASS | A prior full PostgreSQL run passed 17 files/28 tests at `.brain/evidence/event-first-roadmap/verification-after-eventing-fix.md:48-82`; the final full `RUN_DB_TESTS=1 npm.cmd test` also exited 0 with 22 files/95 tests at `.brain/evidence/event-first-roadmap/verification-ticket-04-final.md:46-62`. |
| Prisma panic after fix | PASS | The final focused and full results have exit 0 and no panic; the only diagnostic recorded is the expected rollback trigger error `T04_INJECTED_FAILURE` at `.brain/evidence/event-first-roadmap/verification-ticket-04-final.md:39-44,62`. |

## Dependencies

| Dependency | Result | Exact evidence |
|---|---|---|
| Ticket 01 | PASS | Status is `done` at `.scratch/civicos-event-first-roadmap/issues/01-event-kernel.md:7`; implementation/closure commits `253885d` and `47b1b92` are present in `git log`. |
| Ticket 02 | PASS | Status is `done` at `.scratch/civicos-event-first-roadmap/issues/02-identity-assignment-access.md:7`; implementation/closure commits `08ce4b1` and `954aece` are present in `git log`. |
| Ticket 03 | PASS | Status is `done` at `.scratch/civicos-event-first-roadmap/issues/03-shared-field-evidence-geo-sla.md:7`; implementation/closure commits `c3d3135` and `a573984` are present in `git log`. |

## Closure decision

**PASS — approvable for closure under the exact AC1–AC12 and S1–S10 wording.**

All requested criteria have direct evidence. The prior approval timeout and Prisma
panic are retained as historical observations, while the repeated focused/full
green results establish the resolved state. Known limitations are not inferred
away: exact duration constants for every status are not independently asserted,
rollback evidence is scoped to the intake operation, and REST evidence is real
Playwright rather than direct route-unit testing. None changes the result of the
exact ticket wording. No status or checkbox was changed and no commit was made.
