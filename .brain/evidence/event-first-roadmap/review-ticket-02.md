# Ticket 02 closure-gate review

Review-only. No Developer was spawned. No source, config, test, README, or
`.scratch` file was changed, and no commit or ticket-status/checkbox change was
made.

## Acceptance criteria

| ID | Result | Exact evidence |
|---|---|---|
| AC1 | PASS | `src/app/api/auth/session/route.ts:16-31` authenticates through the public identity surface and sets `civicos_session` with `httpOnly`, `expires`, and `/` path. `src/modules/identity/session.ts:31-50` creates a future expiry, stores only `tokenHash`, and rejects an expired row. `tests/e2e/login-and-access.spec.ts:26-44` observes HttpOnly, non-empty, future-expiring cookie and successful session API; `verification-ticket-02.md:54-56` records 8/8 browser results. |
| AC2 | PASS | `prisma/schema.prisma:10-79,145-158` persists User/Role/UserRole/OrganizationUnit/Assignment/Session/AuditEvent, including active/revoked and audit fields. `tests/identity/session-seed-boundary.postgres.test.ts:72-109` verifies persisted seed entities; `tests/identity/authorization.integration.test.ts:339-368` verifies revoked assignment, retained history, grant/revoke audits and Assignment events. |
| AC3 | PASS | `tests/identity/authorization.integration.test.ts:231-281` directly checks commander command scope, assigned-user capabilities, same-unit unassigned denial, and cross-unit denial. `src/modules/identity/authorization.ts:55-81` implements organization and assignment checks. |
| AC4 | PASS | `tests/identity/authorization.integration.test.ts:326-368` asserts read/mutate denial after revocation while the Assignment row, grant/revoke audit rows, and Assignment event history remain. |
| AC5 | PASS | `src/app/api/identity/assignments/route.ts:11-24,28-73,76-104` authenticates and authorizes at route/domain boundary; `src/modules/identity/authorization.ts:55-93` performs the access decision. `tests/identity/authorization.integration.test.ts:283-323` proves a real domain read is allowed/denied server-side. |
| AC6 | PASS | `tests/identity/audit.integration.test.ts:63-131` asserts sensitive read, evidence download, and mutation AuditEvents with actor, resource, operation, reason, time, and correlation ID. `src/modules/identity/audit.ts:12-57` persists the fields and appends `AuditEventRecorded`. |
| AC7 | NOT OBSERVED | `tests/identity/encryption.integration.test.ts:125-150` proves ciphertext/blind-index persistence and absence of the marker from the stored row/JSON; `:14-46` proves encryption/key configuration behavior, and `src/modules/identity/encryption.ts:8-15` derives the key from `SESSION_SECRET`, not Prisma. No supplied test or evidence directly scans application logs for the sensitive marker, so the full “persistent payload or log” wording is not observed. |
| AC8 | PASS | `src/components/identity/LoginForm.tsx:41-66` uses visible labels and focus styling; `:23-37` provides inline errors/loading handling. `src/components/identity/AccessDenied.tsx:1-10` provides denied state. `tests/e2e/login-and-access.spec.ts:3-24,56-83` verifies labeled login, inline invalid-login error, and denied state; `verification-ticket-02.md:54-56` records 8/8 passes. The shared login/denied screen is the expired-session destination; no placeholder-only label is used. |
| AC9 | PASS | `tests/e2e/login-and-access.spec.ts:56-83` logs in the unassigned seeded user, tampers with a direct incident ID and assignment API, asserts HTTP 403/`FORBIDDEN`, and observes the denied page. |
| AC10 | PASS | `verification-ticket-02.md:11-19` records 4 identity files/22 tests passed; `:23-24` records 19/19 files/58 tests passed; `:46-50` records typecheck, lint, and build passed; `:52-59` records targeted identity E2E 8/8 and full E2E 18/18. |

## Implementation steps

| ID | Result | Exact evidence |
|---|---|---|
| S1 | NOT OBSERVED | `tests/identity/authorization.integration.test.ts:55-72,231-281,326-368` covers commander, assigned, same-unit unassigned, revoked, and cross-unit cases, each with assertions. However, no artifact or history evidence proves the matrix was written before the model, as the step literally requires. |
| S2 | PASS | `prisma/schema.prisma:10-79,145-158` contains the required identity entities, assignment subject/resource/task/assignee/status/timestamps, and AuditEvent actor/resource/operation/time fields. PostgreSQL persistence is directly exercised by `session-seed-boundary.postgres.test.ts:69-121` and authorization tests. |
| S3 | PASS | `src/modules/identity/local-provider.ts:25-141` seeds commander, assigned candidate, unassigned user, and superior unit with development-only hashed credentials. `tests/identity/session-seed-boundary.postgres.test.ts:72-121` verifies those rows and confirms the password is not plaintext or a real secret. |
| S4 | PASS | `src/modules/identity/local-provider.ts:144-167` provides the provider seam; `src/modules/identity/session.ts:31-61` provides create/read/delete, HttpOnly is set at `route.ts:23-31`, and expiration/invalid-session handling is at `session.ts:43-51`. `session-seed-boundary.postgres.test.ts:123-135,152-216` verifies authentication, hashed persistence, expired/unknown rejection, and logout. |
| S5 | PASS | `src/modules/identity/authorization.ts:41-93` separates action capabilities and boundary access checks. `tests/identity/authorization.integration.test.ts:231-324` verifies allow/deny decisions at both authorization and real domain-read seams. |
| S6 | PASS | `src/modules/identity/assignments.ts:21-92,169-226,229-260` implements multi-assignee grant, event/audit, revoke, and active/revoked query behavior; `tests/identity/authorization.integration.test.ts:117-128,326-368` verifies lifecycle and history. |
| S7 | PASS | `src/modules/identity/audit.ts:12-77` records the required fields and event; `src/modules/identity/encryption.ts:8-51` defines application encryption/blind index. `tests/identity/audit.integration.test.ts:63-131` and `encryption.integration.test.ts:14-150` pass the audit and ciphertext/persistence assertions. The log-specific limitation is recorded under AC7. |
| S8 | PASS | Session, users, and assignment routes use `getCurrentUser`, status codes, validation, and `{ error }` responses: `src/app/api/auth/session/route.ts:12-37`, `src/app/api/identity/users/route.ts:10-23,26-60`, and `src/app/api/identity/assignments/route.ts:11-104`. `session-seed-boundary.postgres.test.ts:220-388` verifies stable invalid assignment/revocation/user errors; browser E2E verifies the login/access-denied UI. |
| S9 | PASS | Authorization matrix assertions are at `authorization.integration.test.ts:231-368`; audit and encryption tests are at `audit.integration.test.ts:63-131` and `encryption.integration.test.ts:125-150`; URL/API tampering is at `tests/e2e/login-and-access.spec.ts:56-83`. `verification-ticket-02.md:11-19,52-59` records all these test groups passing. |
| S10 | PASS | Public boundary is asserted by `tests/identity/session-seed-boundary.postgres.test.ts:38-66` (`prisma` is not exported), with exports defined in `src/modules/identity/index.ts:1-30`. PostgreSQL-backed identity tests, quality checks, and E2E results are recorded in `verification-ticket-02.md:11-19,23-24,46-59`; plaintext persistence is checked by `encryption.integration.test.ts:125-150`. |

## Required boundary and limitation decisions

- **Ticket 01 dependency: PASS.** `.scratch/civicos-event-first-roadmap/issues/01-event-kernel.md:7` is `Status: done`; `git show` verified `253885d123851df1cbd309afd96bb1f1bda6e1fe` (`feat: complete event kernel roadmap ticket`) and `47b1b921e76c6ac2ce2f58e0fd38db2263c04a0e` (`chore: close Ticket 01 evidence`). `47b1b92` is current HEAD.
- **Wall-clock expiry limitation does not block AC1/S4 wording.** The implementation computes a real expiry (`session.ts:35-39`) and rejects `expiresAt <= new Date()` (`:47-51`); the supplied test uses an expired persisted row (`session-seed-boundary.postgres.test.ts:189-199`). The ticket requires expiration behavior, not a separate sleep/clock-advance test, so this limitation is noted but not treated as a failure.
- **Multipart limitation does not block AC6/S7 wording.** The ticket requires an AuditEvent for a sensitive `download`, not a multipart upload round-trip. `audit.integration.test.ts:93-131` directly verifies the `evidence.downloaded` audit/API seam with all required fields. No out-of-scope multipart requirement is imposed.

## Closure decision

**FAIL / NOT APPROVABLE under the strict closure gate.** AC1–AC6 and AC8–AC10 pass; AC7 is NOT OBSERVED because log absence is not directly evidenced. S2–S10 pass; S1 is NOT OBSERVED because the required pre-model ordering of the authorization matrix is not established. The two stated coverage limitations do not block the ticket wording; the failure is limited to the two evidence gaps above. No status or checkbox was changed.
