---
status: accepted
---

# Start as a modular monolith with a separate worker

CivicOS starts as one modular Next.js application with one PostgreSQL database and a separate worker process in the same codebase. Modules communicate through explicit domain events and adapters; the worker polls the PostgreSQL transactional outbox rather than introducing a message broker during the MVP. This keeps on-premise deployment and the MVP operationally simple while preserving seams for later extraction if scale or ownership requires it.
