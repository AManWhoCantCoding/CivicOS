# Archive 08 — Demo rebuild readiness

- Wire `demo:rebuild` and `demo:verify` with fixed phase order, drain and fail-closed report.
- Verify counts, manifest keys/statuses, derived rows, Evidence namespace and orphan/unexpected rows.
- Pass only when `errors`, `unexpectedRows`, `orphanRows` and pending/dead-letter derived queues are empty.
