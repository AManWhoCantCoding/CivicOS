# Ticket 01 evidence

- Ticket: `civicos-event-first-roadmap` / `01-event-kernel`
- Final status: `done`
- Review: PASS in `.brain/evidence/event-first-roadmap/review-ticket-01-revised.md`
- Commit: `253885d123851df1cbd309afd96bb1f1bda6e1fe` (`feat: complete event kernel roadmap ticket`)

## Files changed

- `.scratch/civicos-event-first-roadmap/issues/01-event-kernel.md` — Research revised S1/S2; Planner ticked all implementation steps and acceptance criteria, then set status `done`.
- `src/modules/eventing/event-store.ts` — Developer fixed outbox availability clock alignment.
- `src/modules/eventing/worker.ts` — Developer changed the SLA import to the public platform entry point.
- `tests/eventing/event-durability.postgres.test.ts` — Developer added PostgreSQL coverage for envelope persistence, duplicate/version handling, rollback, concurrency, retry/dead-letter, replay and health/lag.
- `.brain/evidence/event-first-roadmap/review-ticket-01-final.md` — Reviewer.
- `.brain/evidence/event-first-roadmap/review-ticket-01-revised.md` — Reviewer.
- `.brain/evidence/event-first-roadmap/review-ticket-01.md` — Reviewer.
- `.brain/evidence/event-first-roadmap/review.md` — Reviewer.
- `.brain/evidence/event-first-roadmap/tests.md` — Tester.
- `.brain/evidence/event-first-roadmap/verification-after-event-kernel-coverage.md` — Tester.
- `.brain/evidence/event-first-roadmap/verification-after-kernel-hardening.md` — Tester.
- `.brain/evidence/event-first-roadmap/verification-after-eventing-fix.md` — Tester.
- `.brain/evidence/event-first-roadmap/verification.md` — Tester.

## Final verification

- Native eventing tests: `4 files, 17 passed`.
- Full PostgreSQL suite: `18 files, 39 passed`.
- Typecheck, lint and build: PASS.
- Isolated clean PostgreSQL migration deploy/status/deploy/cleanup: PASS.
- Reviewer: PASS.
