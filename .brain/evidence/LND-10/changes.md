# Developer changes — LND-10

- Added the local `NationalLandAdapter` boundary and configured
  `MockNationalLandAdapter` in `src/modules/land/national-land-adapter.ts`.
- Added normalized success/failure response types and exception mapping with
  `MOCK_VALIDATION_FAILED`.
- Exported only the adapter surface and types from `src/modules/land/index.ts`.
- Added five contract tests covering success, configured failure, exception and
  invalid-request mapping, no-network behavior, and client-outcome injection.
- No LND-11/12/13 behavior, database persistence, endpoint, secret, or design
  contract was added.
