Files changed:
- src/modules/platform/evidence/evidence-service.ts — validates capture time and GPS at the public Evidence contract boundary.
- tests/platform/evidence.integration.test.ts — covers Evidence metadata, hash idempotency, replacement, access-facing retrieval, and invalid GPS cases with PostgreSQL coverage.
- tests/platform/geo.integration.test.ts — covers coordinate bounds and zero-area polygon rejection.
- tests/platform/sla.integration.test.ts — covers invalid thresholds, persisted exactly-once overdue state, outbox notification causality, idempotency, and read mutation.
- tests/platform/offline-sync.integration.test.ts — covers persisted timestamps, duplicate command idempotency, prior response retention, and terminal transition behavior.

## 2026-09-21 execution (Ticket 03 gaps)
- prisma/schema.prisma — adds shared-capability hardening indexes Evidence_actorId_receivedAt_idx, SlaInstance_assigneeUserId_status_idx, OfflineCommand_resourceType_resourceId_status_idx.
- prisma/migrations/20260921090000_shared_field_capabilities/migration.sql — additive IF NOT EXISTS index migration for the shared platform capability schema.
- tests/platform/shared-capabilities.test.ts — asserts public platform export surface, no cross-module persistence writes, and migration/schema index consistency.
- tests/platform/sla.integration.test.ts — adds National Day holiday and full-weekend continuous-clock cases plus outbox retry/idempotency/health coverage.
- tests/platform/offline-sync.integration.test.ts — adds failed-retry recovery with attempt/retry state and append-only payload/response preservation.
- tests/e2e/evidence-authorization.spec.ts — covers Evidence upload/download authorization over real HTTP: 401 unauthenticated, 201 authorized with hash/actor/capture/GPS/immutable/idempotency/replacement assertions, 403 tampered and cross-resource download.
- tests/e2e/field-shell.spec.ts — expands field-shell browser coverage: seeded pending/failed/synced counts, reload persistence, keyboard retry to failed, retry recovery to synced, offline/online transitions, reduced-motion labels.
- src/components/field/OfflineQueueStatus.tsx — adds retry button, role=alert sync error, aria-live/label, data-testid counts, single-column mobile grid.
