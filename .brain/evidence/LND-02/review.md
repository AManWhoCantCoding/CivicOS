# Review evidence — LND-02

- **Decision:** `REVIEW-PASS`
- **Reviewer:** Mentor
- **Review date:** 2026-09-30

## Standards

- Source is split into schema, access, repository, service and thin route boundaries (`src/modules/land/`, `src/app/api/land/parties/route.ts:16-39`, `src/app/api/land/parcels/route.ts:16-39`).
- Geometry writes remain parameterized (`src/modules/land/parcel-repository.ts:84-105`); no new dependency or unrelated file was introduced.
- Typecheck, scoped lint and scoped Prettier checks pass (`tests.md:761-765`).

## Spec

- LND-02 allowed files and acceptance criteria are recorded in `phase-01-foundation-access.md:57-81`.
- Party response excludes ciphertext/blind-index fields and masks identity data (`party-service.ts:39-59, 70-110`); parcel response preserves version/geometry/national reference contract (`parcel-service.ts:47-64`).
- API routes return the locked `{ party }` / `{ parcel }` shapes and `201` (`parties/route.ts:28-35`, `parcels/route.ts:28-35`).
- DB-gated targeted suite passes all 29 tests, including privacy, geometry, scope, duplicate, pagination and audit regressions (`tests.md:761`).

## Government correctness

- Land role and OrganizationUnit checks fail closed (`access.ts:25-58`).
- Sensitive party fields are encrypted/blind-indexed before persistence (`party-service.ts:77-90`, `party-repository.ts:29-45`).
- Domain persistence and audit share a transaction; audit errors propagate and roll back (`access.ts:61-85`, `party-service.ts:79-105`, `parcel-service.ts:77-103`). Regression coverage is in `lnd02-party-parcel.test.ts:692-755`.
- Parcel creation keeps version `1`, internal organization scope, PostGIS SRID 4326 and no national record reference (`parcel-repository.ts:92-105`, `parcel-service.ts:74-104`).

## Decision notes

- The `read_sensitive` capability is intentionally fail-closed in LND-02; capability/catalog completion belongs to LND-04 and was not changed outside this ticket’s allowed files.
- Full phase verification is not run because Phase 01 still has later tickets; no commit was created.
