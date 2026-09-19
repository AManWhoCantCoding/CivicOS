---
status: accepted
---

# Use domain events with transactional outbox and projections

CivicOS uses immutable domain events, written transactionally with the domain change, and publishes them through a transactional outbox to asynchronous projections and notifications. This gives the system durable nghiệp vụ history and replayable read models without taking on the operational and migration cost of full event sourcing or a separate message broker during the MVP; the event stream remains structured so those options can be added later if needed. Read models should target p95 freshness of 10 seconds under normal operation, with retry and replay when consumers fall behind.
