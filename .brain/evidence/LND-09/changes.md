# Evidence LND-09 — Web screen-01 queue và screen-02 create

## Files

- `src/app/land/page.tsx`, `src/app/land/applications/page.tsx`: ModuleShell queue pages, server feature gate, simulated notice, forbidden state.
- `src/app/land/applications/new/page.tsx`: officer-only create page and forbidden state.
- `src/components/land/application-view.ts`: locked summary view types, Vietnamese labels, query/share/payload builders, error mapping and leak guard.
- `src/components/land/land-api.ts`: GET application list and POST application client seams with `Idempotency-Key`; existing parcel/party seams preserved.
- `src/components/land/ApplicationQueue.tsx`: URL filters, summary-only table, cursor pagination, CTA and loading/error/empty/offline/retry states.
- `src/components/land/ApplicationForm.tsx`: four dynamic payload/link forms, masked pickers, client validation, stable idempotency retry, session draft and 201 navigation.
- `src/components/navigation/feature-registry.ts`: queue requires scoped `land_review`; create is visible to `land_officer` without review Assignment; parcel workspace unchanged.
- `tests/land-ui/lnd09-application-queue-create.test.ts`: UI contract/accessibility/privacy/idempotency/feature-gate tests.

## Review repair

- Initial review found create incorrectly required `land_review` Assignment. The locked create contract only requires `land_officer` mutate capability; the queue/review gates retain `land_review`. Added regression coverage for officer-without-assignment create access and corrected copy.

## Scope

- No API route, module service, identity, Prisma, design, research, `.scratch/land-module/ui`, or environment file changed by LND-09.
