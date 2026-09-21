# Ticket 03 evidence

- Ticket: `civicos-event-first-roadmap` / `03-shared-field-evidence-geo-sla`
- Final status: `done`
- Review: PASS in `.brain/evidence/event-first-roadmap/review-ticket-03-final.md`
- Commit: `c3d313586fb88885e99538a0b3615453e8d05ffa` (`feat: complete shared platform roadmap ticket`)
- Dependencies: Tickets 01 and 02 are `done` and committed.

## Files changed

- `.scratch/civicos-event-first-roadmap/issues/03-shared-field-evidence-geo-sla.md` — Planner ticked all implementation steps and acceptance criteria, then set status `done`.
- `prisma/schema.prisma` — Developer added shared-capability hardening indexes.
- `prisma/migrations/20260921090000_shared_field_capabilities/migration.sql` — Developer added the additive shared-capability migration.
- `src/components/field/OfflineQueueStatus.tsx` — Developer added retry/error/accessibility states and the 44px touch target.
- `src/modules/platform/evidence/evidence-service.ts` — Developer added capture-time and GPS validation.
- `src/modules/platform/field-sync/index.ts` — Developer fixed nullable resource ID idempotency normalization.
- `tests/e2e/evidence-authorization.spec.ts` — Developer added real HTTP Evidence authorization/upload/download/idempotency coverage.
- `tests/e2e/field-shell.spec.ts` — Developer added queue-state, transition, reduced-motion and WCAG/touch-target preflight coverage.
- `tests/platform/evidence.integration.test.ts` — Developer added Evidence persistence, hash, replacement and coordinate coverage.
- `tests/platform/geo.integration.test.ts` — Developer added coordinate and polygon validation coverage.
- `tests/platform/offline-sync.integration.test.ts` — Developer added retry, idempotency, stale and append-only coverage.
- `tests/platform/shared-capabilities.test.ts` — Developer added public boundary, ownership and migration/index checks.
- `tests/platform/sla.integration.test.ts` — Developer added holiday/weekend, exactly-once overdue, notification outbox and retry/health coverage.
- `.brain/evidence/03/changes.md` — Developer evidence.
- `.brain/evidence/event-first-roadmap/review-ticket-03-final.md` — Reviewer.
- `.brain/evidence/event-first-roadmap/verification-ticket-03-hardening.md` — Tester.
- `.brain/evidence/event-first-roadmap/verification-ticket-03-final.md` — Tester.

## Final verification

- Platform tests: `24/24` passed.
- Full PostgreSQL suite: `78/78` passed.
- Targeted Evidence/field-shell E2E: `18/18` passed.
- Full E2E: `36/36` passed.
- Typecheck, lint and build: PASS.
- Clean migration deploy/status/second no-op/cleanup: PASS.
- Reviewer: PASS.
