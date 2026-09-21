# Changes

- `src/app/api/evidence/route.ts` — routes VehicleObservation uploads through the atomic application service while preserving the existing generic evidence path.
- `src/modules/platform/evidence/evidence-service.ts` — supports transaction clients and reports whether storage was created for rollback cleanup.
- `src/modules/platform/evidence/storage-adapter.ts` — adds local storage artifact removal for failed transactions.
- `src/modules/platform/evidence/index.ts` — exports the transaction-aware evidence creation helper.
- `src/modules/platform/index.ts` — re-exports the transaction-aware evidence creation helper.
- `src/modules/vehicles/commands.ts` — adds atomic VehicleObservation evidence creation, projection update, event, audit metadata, authorization, and artifact cleanup.
- `src/modules/vehicles/index.ts` — exports the VehicleObservation evidence application service.
- `src/modules/eventing/worker.ts` — prevents overlapping worker ticks during SLA/outbox processing.
- `tests/vehicles/vehicle-watch-slices-4-7.postgres.test.ts` — adds rollback coverage proving failed evidence attachment leaves no evidence, observation projection, event, or audit orphan.
- `tests/platform/sla.integration.test.ts` — removes busy retry loops from the outbox regression and makes retry progression deterministic.
- `playwright/test_vehicles.py` — removes the fixed anchor count and validates actual Evidence-ID hrefs and visibility.
