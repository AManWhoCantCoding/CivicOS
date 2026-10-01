# Review evidence — LND-08

- **Decision:** `REVIEW-PASS`
- **Reviewer:** Mentor
- **Review date:** 2026-10-01

## Standards

- Thin routes delegate to the existing land access/error seams (`review/route.ts:19-41`, `timeline/route.ts:18-31`).
- Transaction orchestration is isolated in `application-service.ts:570-710`; no new dependency or policy abstraction was introduced.
- Request validation and stable error mapping are explicit (`schemas.ts:269-291`, `errors.ts:59-68`).

## Spec

- Review enforces `submitted → in_review`, positive version, active `land_review` Assignment and optimistic `id+version` update (`application-service.ts:570-638`).
- Stale version and invalid transition return the locked 409 seams with no event/audit mutation (`application-service.ts:581-590`).
- Timeline queries only the exact `LandChangeApplication` aggregate in ascending `occurredAt` order and returns the locked projection (`application-service.ts:670-710`).

## Government correctness

- Domain update, `LandChangeApplicationReviewStarted` EventRecord and `land.application.reviewed` AuditEvent share one transaction (`application-service.ts:586-638`).
- Timeline access uses the existing same-OU leader/assigned-officer seam; cross-OU and unassigned access fail closed (`application-service.ts:676-686`, `access.ts:268-323`).
- Recursive projection sanitization removes nested `changePayload`, ciphertext and storage internals (`application-service.ts:502-539`); no raw DB row is returned.

## Evidence

- LND-08/LND-06/LND-07 DB tests: `82 passed`.
- Land + land UI + LND-04 assignment regression set: 9 files, `185 passed`.
- `npx tsc --noEmit`: pass; scoped ESLint: pass; scoped Prettier check: pass.
