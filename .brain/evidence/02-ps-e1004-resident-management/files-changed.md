# Files changed — 02-ps-e1004-resident-management

## Commit

- Commit: `b065e630216e396392babb49cb1c346ca5e3461f`
- Message: `feat(residents): add PS-E1 resident management`
- Final status: `done`
- Reviewer: PASS; AC1–AC12 và bốn rubric bắt buộc đã được đối chiếu với diff/evidence.

## Files

### Developer

- `prisma/migrations/20260923090000_ps_e1004_resident_management/migration.sql`
- `prisma/schema.prisma`
- `src/app/api/residents/[subjectId]/management-records/[recordId]/activities/route.ts`
- `src/app/api/residents/[subjectId]/management-records/[recordId]/route.ts`
- `src/app/api/residents/[subjectId]/management-records/route.ts`
- `src/app/api/residents/[subjectId]/route.ts`
- `src/app/api/residents/reports/[reportId]/approve/route.ts`
- `src/app/api/residents/reports/[reportId]/send/route.ts`
- `src/app/api/residents/reports/monthly/route.ts`
- `src/app/api/residents/route.ts`
- `src/app/residents/[subjectId]/page.tsx`
- `src/app/residents/[subjectId]/records/[recordId]/page.tsx`
- `src/app/residents/page.tsx`
- `src/app/residents/reports/page.tsx`
- `src/components/navigation/feature-registry.ts`
- `src/components/residents/ActivityForm.tsx`
- `src/components/residents/ReportPreview.tsx`
- `src/components/residents/ResidentDetail.tsx`
- `src/components/residents/ResidentList.tsx`
- `src/modules/residents/commands.ts`
- `src/modules/residents/contracts.ts`
- `src/modules/residents/index.ts`
- `src/modules/residents/projection.ts`
- `src/modules/residents/seed.ts`
- `tests/e2e/ps004-resident.spec.ts`
- `tests/residents/resident-contracts.test.ts`
- `tests/residents/resident-regression.test.ts`
- `tests/residents/resident-scope-regression.postgres.test.ts`
- `tests/residents/resident-workflow.postgres.test.ts`

### Planner

- `.scratch/civicos-e1-clone-mvp/issues/02-ps-e1004-resident-management.md`

### Developer evidence

- `.brain/evidence/02-ps-e1004-resident-management/changes.md`

### Tester evidence

- `.brain/evidence/02-ps-e1004-resident-management/tests.md`

### Reviewer evidence

- `.brain/evidence/02-ps-e1004-resident-management/review.md`

## Verification summary

- Migration deploy trên `civicos_demo`: PASS.
- Prisma generate: PASS.
- Resident Vitest với DB tests bật: `27/27 PASS`, `0 skip`.
- Lint: PASS.
- Resident Prettier check: PASS; không còn warning trong file ticket.
- Resident Playwright Chromium + mobile: `10/10 PASS`.
- Typecheck/build, full `npm test`, full E2E và 15 format warnings còn lại: lỗi ngoài scope ticket, đã được ghi trong `tests.md` và Reviewer xác nhận không ảnh hưởng resident.
