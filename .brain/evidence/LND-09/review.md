# Review evidence — LND-09

- **Decision:** `REVIEW-PASS`
- **Reviewer:** Mentor
- **Review date:** 2026-10-01

## Standards

- UI uses thin client API seams and existing ModuleShell/feature-entry boundaries; no dependency added (`ApplicationQueue.tsx:1-408`, `ApplicationForm.tsx:1-717`).
- Feature-gated server pages deny before rendering scoped application data (`src/app/land/page.tsx:9-45`, `applications/new/page.tsx:9-47`).
- Queue uses accessible labels/table caption/header scopes and visible text for statuses (`ApplicationQueue.tsx:207-375`).

## Spec

- Queue requests only `ApplicationSummary` fields and deliberately does not fabricate parcel/assignee/detail fields (`application-view.ts:8-20`, `ApplicationQueue.tsx:81-110,344-371`).
- Create builders cover exactly transfer, information_update, mortgage and parcel_split_merge (`application-view.ts:113-263`) with client share/link validation.
- POST keeps one `Idempotency-Key` through retry and routes 201/200 success to the later detail path (`ApplicationForm.tsx:207-287`, `land-api.ts:193-267`).
- `LAND_IDEMPOTENCY_CONFLICT`, offline and invalid responses preserve form state (`application-view.ts:278-298`, `ApplicationForm.tsx:277-287`).

## Government correctness

- Party pickers expose only reference code and masked identity number; no plaintext/ciphertext is rendered (`ApplicationForm.tsx:27-30,349-419`).
- Queue/create have separate gates: queue requires scoped assignment for officers and leader bypass; create requires only land officer role/capability (`feature-registry.ts:266-283`).
- No approve/reject/sync or direct land mutation control is present in create UI.

## Evidence

- `tests/land-ui/`: 2 files, `41 passed`.
- `npx tsc --noEmit`: pass.
- Scoped ESLint: pass.
- Scoped Prettier check: pass.
