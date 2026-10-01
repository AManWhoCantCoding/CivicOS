# Mentor review — baseline repairs

- **Decision:** `REVIEW-PASS` for the repair slices.
- **Scope:** pre-existing global-gate failures only; no land contract or design contract changed.

## Standards/spec correctness

- Demo validation occurs before side effects/imports (`scripts/demo/seed.ts:20-28`).
- Formatter baseline ignores generated artifacts rather than rewriting them (`.prettierignore:32-35`).
- Incident tests now match the explicit confirmation workflow already asserted by the incident separation contract; authorization fix fails closed and preserves the transaction (`commands.ts:363-403,406-479`).
- Inspection and vehicle tests use actors compatible with existing `requireRole`/Assignment policy; source guards remain unchanged (`src/modules/vehicles/commands.ts:374-385`).
- Identity test verifies only seeded development accounts, preserving the no-plaintext assertion (`session-seed-boundary.postgres.test.ts:139-153`).

## Government correctness

- No authorization weakening, PII exposure, history deletion, or source-of-truth change.
- Incident approval existence is not disclosed to unauthorized actors.
- Audit/event and transaction paths remain production code paths.

## Eventing/SLA repair

- **Decision:** `REVIEW-PASS` for the targeted outbox filter repair.
- `processOneOutboxMessage` and `processOutboxUntilIdle` preserve the existing
  no-filter oldest-first behavior while allowing an internal `eventId` filter
  (`src/modules/eventing/outbox.ts:165-177,332-337`).
- The SLA tests now process only their own overdue/probe events, so unrelated
  pending messages cannot change the test outcome (`tests/platform/sla.integration.test.ts:88-113,151-172`).
- No retry, claim-token, backoff, checkpoint, ordering, authorization, PII,
  audit, or history semantics were weakened.

## Evidence

- Focused tests and static checks passed after each repair slice; see `tests.md`.
