# Evidence LND-07 — Change-type validation và idempotency

## Files

- `src/modules/land/change-validation.ts`: exact payload keys, four change types, duplicate-link checks, transfer share totals/multiset equality, exactly one subject for transfer/update/mortgage, mortgage release prerequisite seam remains in service, canonical transfer payload ordering while preserving unknown keys for conflict detection.
- `src/modules/land/application-service.ts`: validation inside the create transaction after idempotency replay/conflict lookup; active `LandEncumbrance` check for mortgage release; canonical fingerprint and transactionally coupled event/audit remain intact.
- `tests/land/lnd07-change-validation.test.ts`: pure and DB-backed valid/invalid change types, no-row rejection, release prerequisite, replay/conflict, link-order/share-order canonicalization and extra-key conflict regression.
- `tests/land/lnd06-application.test.ts`: existing mortgage fixture updated to satisfy the locked mortgage payload shape.

## Review repairs

- Initial review found subject cardinality, payload-vs-link share mismatch, and transfer share-array order sensitivity; fixed with Red→Green regression tests.
- Follow-up review found canonicalization dropped unknown top-level/entry keys, allowing a tampered retry to replay; fixed by preserving keys and adding a conflict regression.

## Scope

- No design, research, Prisma schema/migration, route, UI, identity or environment files changed by LND-07.
