# Event-first roadmap — native Windows verification evidence

Verification-only run. No Developer was spawned. No source, config, test, README, `.scratch/**`, or migration file was edited. Commands were invoked through native `powershell.exe` from `D:\Project\CivicOS`; no WSL runtime was used for conclusions.

## Environment/readiness

Command:

```text
powershell.exe -NoProfile -NonInteractive -Command ... docker.exe compose up -d postgres; docker.exe exec civicos-postgres-1 pg_isready -U civicos -h 127.0.0.1; npm.cmd run prisma:generate
```

Raw result: `civicos-postgres-1` was running; `127.0.0.1:5432 - accepting connections`; Prisma Client v6.19.3 generated successfully. Exit codes: compose `0`, readiness `0`, generate `0`.

## Native Node quality gates

| Command | Exit | Duration | Raw artifact |
|---|---:|---:|---|
| `npm.cmd run prisma:generate` | 0 | 2,283 ms | `.brain/evidence/event-first-roadmap/prisma-generate.log` |
| `npm.cmd run lint` | 0 | 59,766 ms | `.brain/evidence/event-first-roadmap/lint.log` |
| `npm.cmd run typecheck` | 0 | 4,516 ms | `.brain/evidence/event-first-roadmap/typecheck.log` |
| `npm.cmd run format:check` | 0 | 8,692 ms | `.brain/evidence/event-first-roadmap/format-check.log` |
| `npm.cmd run build` | 0 | 27,305 ms | `.brain/evidence/event-first-roadmap/build.log` |

Build emitted the expected route table, including event, identity, platform, incident, inspection, vehicle, sync and worker-health routes.

## PostgreSQL Vitest/DB run

Command:

```text
$env:RUN_DB_TESTS="1"; npm.cmd test
```

Exit `1`; duration `14,081 ms`; `17` test files, `28` tests: `27 passed`, `1 failed`.

Raw failure:

```text
tests/eventing/event-kernel.postgres.test.ts > event kernel PostgreSQL seam > dispatches the outbox and records consumer progress
AssertionError: expected 0 to be greater than 0
tests/eventing/event-kernel.postgres.test.ts:99:44
expect(await processOutboxUntilIdle()).toBeGreaterThan(0)
```

Artifact: `.brain/evidence/event-first-roadmap/vitest-db.log`.

### Requested test-group matrix

| Group / ticket | Files | Tests | Pass | Fail | Result |
|---|---:|---:|---:|---:|---|
| `tests/eventing/**` / 01 | 3 | 6 | 5 | 1 | FAIL — outbox dispatch assertion above |
| `tests/identity/**` / 02 | 3 | 3 | 3 | 0 | PASS |
| `tests/platform/**` / 03 | 4 | 7 | 7 | 0 | PASS |
| `tests/incidents/**` / 04 | 2 | 4 | 4 | 0 | PASS |
| `tests/inspections/**` / 05 | 2 | 3 | 3 | 0 | PASS |
| `tests/vehicles/**` / 06 | 1 | 2 | 2 | 0 | PASS |
| `tests/integration/**` / 07 | 2 | 3 | 3 | 0 | PASS |
| **Total** | **17** | **28** | **27** | **1** | **FAIL** |

## TypeScript E2E

Command: `npm.cmd run test:e2e`

Exit `0`; duration `14,981 ms`; `12 passed`, `0 failed` across Chromium desktop/mobile.

Coverage: `tests/e2e/login-and-access.spec.ts` 2/2; `field-shell` 2/2; `ps005` 2/2; `ps007` 2/2; `ps009` 2/2; `parallel-wave` 2/2.

Artifact: `.brain/evidence/event-first-roadmap/test-e2e.log`.

## Migration/order/idempotency audit

Commands: `npx.cmd prisma migrate status`; `npm.cmd run prisma:migrate:deploy` twice, sequentially.

Observed migration order:

```text
0001_event_first
20260919042323_incident_approval
20260919050000_approval_organization_scope
20260919052000_inspection_cadence
```

Status: `Database schema is up to date!`; deploy 1 exit `0`, `No pending migrations to apply.`; deploy 2 exit `0`, `No pending migrations to apply.`

Artifact: `.brain/evidence/event-first-roadmap/migration-audit.log`.

## Static audit

Artifact: `.brain/evidence/event-first-roadmap/static-audit.log`.

Observed:

- Public `index.ts` entry points exist for `eventing`, `identity`, `platform`, `incidents`, `inspections`, and `vehicles`.
- The scan found imports through public module roots for the module consumers. It also found one internal cross-module import: `src/modules/eventing/worker.ts:2` imports `@/modules/platform/sla` directly. This is recorded as an observed boundary exception, not inferred away.
- Event envelope source contains event ID/type/version, aggregate identity/version, timestamps, actor snapshot, correlation/causation IDs, payload and metadata. Consumer registrations were found in eventing, incidents, inspections, notifications and vehicles projections.
- The only module directories are `eventing`, `identity`, `incidents`, `inspections`, and `platform`/`vehicles`; no PS-E1-003/004/008/001/002/006/010 module directory was observed.
- Authorization, audit, SLA, replay, pending/dead-letter and projection-lag signal references were found in source/API scan.
- Package scripts listed in `package.json` include every requested generate, lint, typecheck, format, build, test, e2e, migration and worker command; README command mentions were present. Exact command execution results are recorded above.

## Existing native Python evidence reused

Per instruction, the existing native evidence was not rerun:

- `.brain/evidence/02-native-harness-login/tests.md`: latest full identity desktop/mobile runs `7 passed, 7 skipped` each; targeted login/logout passed in two consecutive desktop/mobile runs.
- `.brain/evidence/03-native-acceptance-gate/tests.md`: latest exact Python full suite `32 collected, 32 passed`; native Windows/Node/Chromium/PostgreSQL cleanup observations recorded.
- `.brain/evidence/05-windows-next-transport-harness/tests.md`: latest independent full suite `32 passed`; affected sweep `18 passed` before and after; service artifact paths recorded.
- `.brain/evidence/07-python-313-readme/tests.md`: native Python 3.13.14, setup/install and Chromium commands exit `0`, README targeted `18 passed`, full `32 passed`, README command/path audit passed.

## Ticket / AC / implementation evidence mapping

This is an evidence map only. `PASS` means the cited current command/static or existing native evidence passed; `FAIL` means the cited current evidence failed; `NOT OBSERVED` means no direct result was produced by this verification and no claim is made.

### Ticket 01 — Event kernel

| AC / implementation steps | Result and evidence |
|---|---|
| Steps 1, 3, 10; AC 9, 11 | PASS — native Postgres readiness, Prisma generate, migration status/deploy, lint/build; eventing group has 5/6 tests passing. |
| Steps 2, 4, 5, 7, 8; AC 1–4, 7–8 | PASS evidence signal — envelope fields, public entry point, append/version/replay/health symbols observed; relevant tests passed except the outbox case. |
| Step 6; AC 5–6 | FAIL / NOT fully verified — `processOutboxUntilIdle()` returned `0` where test expected `>0`; retry/dead-letter behavior has no independent passing result in this run. |
| AC 10, 12 | PASS — PostgreSQL-backed tests ran; static scan found public consumer registrations. |

### Ticket 02 — Identity/Assignment/access

| AC / implementation steps | Result and evidence |
|---|---|
| Steps 1–3, 5–7, 9–10; AC 2–7, 10 | PASS — 3/3 identity integration tests passed; existing native identity evidence records full `7 passed, 7 skipped` desktop/mobile and targeted login/logout stability. |
| Step 4; AC 1 | PASS — existing native evidence records valid login/session/logout; current TypeScript login/access smoke passed 2/2. |
| Step 8; AC 8–9 | PASS — current `login-and-access` desktop/mobile E2E 2/2; labels/denied-state smoke passed. |

### Ticket 03 — Shared field/evidence/geo/SLA

| AC / implementation steps | Result and evidence |
|---|---|
| Steps 1–7, 10; AC 1–9 | PASS — platform group 7/7; static scan found evidence, geo, SLA, notification, sync, replay/lag and authorization signals. |
| Step 8–9; AC 10–11 | PASS — `field-shell` desktop/mobile E2E 2/2; native evidence records mobile/desktop browser coverage and cleanup. |
| AC 12 | PASS — lint/build/format/typecheck current run all exit `0`. |

### Ticket 04 — PS-E1-005 IntakeReport/Incident

| AC / implementation steps | Result and evidence |
|---|---|
| Steps 1–7, 9; AC 1–9 | PASS — incident group 4/4; `ps005` desktop/mobile E2E 2/2; current build exposes intake/incident API routes. |
| Step 8; AC 10–11 | PASS — `ps005` smoke passed both viewports; existing native evidence records full incident UI runs and permission/approval paths. |
| Step 10; AC 12 | PASS — lint/build/typecheck/format current run exit `0`; all current incident Vitest tests passed. |

### Ticket 05 — PS-E1-007 Inspection

| AC / implementation steps | Result and evidence |
|---|---|
| Steps 1–4, 6–7, 9; AC 1–3, 6–9 | PASS — inspection group 3/3; `ps007` desktop/mobile E2E 2/2; migration deploy twice no-op. |
| Step 5; AC 4–5, 7 | NOT OBSERVED in current TypeScript tests — current unit/integration tests pass, but no direct current result separately proves every offline checklist/Evidence sequence. Existing native evidence records the requested inspection workflows and artifacts. |
| Steps 8, 10; AC 10–12 | PASS — current smoke and quality gates passed; existing native evidence records desktop/mobile inspection coverage. |

### Ticket 06 — PS-E1-009 Vehicle watch

| AC / implementation steps | Result and evidence |
|---|---|
| Steps 1–8, 10; AC 1–9 | PASS — vehicle group 2/2; `ps009` desktop/mobile E2E 2/2; static source exposes mock/manual/offline/authorization/SLA signals. |
| Step 9; AC 10–11 | PASS — current smoke passed both viewports; existing native evidence records vehicle observation, idempotency and authorization UI runs. |
| AC 12 | PASS — lint/build/typecheck/format current run exit `0`. |

### Ticket 07 — Parallel-wave integration

| AC / implementation steps | Result and evidence |
|---|---|
| Steps 1–2; AC 1 | PASS — migration order listed; status up to date; two deploy runs both exit `0` with no pending migrations. |
| Steps 3–5; AC 2, 10 | PASS — incident/inspection/vehicle groups `4/4`, `3/3`, `2/2`; `ps005`, `ps007`, `ps009` smoke 2/2 each. |
| Step 6; AC 3–4 | PASS evidence signal — integration parallel-wave and schema/migration tests `3/3`; public entry points and event consumer registrations observed. |
| Steps 7–8; AC 5–9 | PASS evidence signal / NOT OBSERVED for p95 numeric measurement — identity/platform/module tests passed and lag/failure signals were found; no separate numeric p95 workload result was produced by this run. |
| Step 9; AC 11 | PASS — current E2E 12/12; existing native evidence covers desktop/mobile/focus/labels/offline states. |
| Step 10; AC 12–13 | FAIL overall — lint/build/typecheck/format passed, but the full Vitest command had 1 eventing failure; README/package command existence audit passed. |

## Raw result summary for Planner

- Native Node gates: `5/5` requested quality commands passed.
- PostgreSQL Vitest: `27/28` passed; one eventing outbox failure, exit `1`.
- TypeScript E2E: `12/12` passed, exit `0`; all requested named specs covered on desktop/mobile.
- Migration status/deploy: status current; both deploy runs exit `0` and were no-ops.
- Static audit: public entries and out-of-scope directory check observed; one direct internal import observed in `src/modules/eventing/worker.ts`; raw artifact retained.
- Existing native Python evidence reused as listed above; no Python suite rerun.
