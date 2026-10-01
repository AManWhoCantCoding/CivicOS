# Review evidence — LND-07

- **Decision:** `REVIEW-PASS`
- **Reviewer:** Mentor
- **Review date:** 2026-10-01

## Standards

- Validation is isolated in `src/modules/land/change-validation.ts:10-237`; application orchestration remains in `application-service.ts:212-355`.
- Invalid input throws the existing `INVALID_REQUEST` seam and is mapped by `src/modules/land/errors.ts:24-27` to `400 LAND_INVALID_REQUEST`.
- Canonicalization is deterministic for valid transfer shares and preserves unknown keys for idempotency conflict detection (`change-validation.ts:57-97`).

## Spec

- Four locked change types and exact payload keys are enforced at `change-validation.ts:164-237`.
- Transfer requires current/proposed holders, exactly one subject, 100.00 payload and link totals, plus equal normalized share multisets (`change-validation.ts:117-162`).
- Mortgage release checks an active `LandEncumbrance` in the existing transaction client (`application-service.ts:256-279`).
- Same-key replay/conflict behavior is implemented in `application-service.ts:239-355` and covered by `lnd07-change-validation.test.ts`.

## Government correctness

- Invalid change shapes are rejected before application insertion; event/audit remain in the same transaction (`application-service.ts:244-330`).
- Server-owned actor, organization, application code, status and version are unchanged from LND-06.
- No PII/ciphertext is introduced; change payload is only exposed through the existing scoped application detail seam.

## Evidence

- DB-backed land/identity targeted gate: 8 test files, 174 passed.
- LND-07 DB suite: 41 passed; LND-06 DB suite: 30 passed.
- `npx tsc --noEmit`: pass.
- Scoped ESLint: pass.
- Scoped Prettier check: pass.
