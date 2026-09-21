# Ticket 05 evidence

- Ticket: `civicos-event-first-roadmap` / `05-ps007-inspection`
- Final status: `done`
- Review: PASS in `.brain/evidence/05-ps007-inspection/review.md`
- Final verification: `.brain/evidence/05-ps007-inspection/tests.md` (`AUTHORITATIVE FINAL NATIVE VERIFICATION`)
- Implementation commit: `d79c2feefb477988b403379dfa868ea31b470eed` (`feat: complete inspection roadmap ticket`)
- Closure commit: pending Reviewer commit

## Final verification

- Python PS-007 Playwright: `8/8` passed, desktop/mobile.
- TypeScript PS-007 Playwright: `10/10` passed, Chromium/mobile.
- PostgreSQL groups: `74/74` passed, `0` skipped.
- Occupied-port ownership regression: `1/1` passed.
- Lint, typecheck, build, targeted Prettier and Python compileall: passed.
- Migration status: current; no recreate/drop/reset used.

## Files changed

- `prisma/migrations/20260922070000_ps_e1_007_inspection_contract/migration.sql` — additive PS-E1-007 constraints/indexes.
- `src/modules/inspections/contracts.ts` — inspection vocabulary contracts.
- `src/modules/inspections/domain.ts` — lifecycle, event ownership, checklist and result rules.
- `src/modules/inspections/index.ts` — public exports.
- `src/modules/inspections/config.ts` — configured continuous Inspection SLA thresholds.
- `src/modules/inspections/commands.ts` — catalog, scheduling, checklist, Evidence, finding and Approval behavior.
- `src/modules/inspections/projection.ts` — due/overdue projection support.
- `src/modules/inspections/schemas.ts` — server input/error validation.
- `src/app/api/establishments/route.ts` — typed establishment API validation/errors.
- `src/app/api/establishments/[establishmentId]/route.ts` — typed establishment patch validation/errors.
- `src/app/api/inspections/route.ts` — schedule and due/overdue API handling.
- `src/app/api/inspections/[inspectionId]/route.ts` — command validation, typed errors and version response.
- `src/components/inspections/ChecklistForm.tsx` — required validation, offline state and reduced motion.
- `src/components/inspections/EstablishmentList.tsx` — accessible non-decorative catalog list.
- `src/components/inspections/InspectionScheduleBoard.tsx` — schedule filters and touch sizing.
- `src/components/inspections/InspectionDetail.tsx` — aggregate-version refresh after Approval.
- `src/components/inspections/EnforcementApprovalPanel.tsx` — Approval/version synchronization.
- `tests/inspections/inspection-contract.test.ts` — domain/migration contract tests.
- `tests/inspections/inspection-workflow.integration.test.ts` — lifecycle/checklist/SLA tests.
- `tests/inspections/inspection-slices-4-6.postgres.test.ts` — catalog, checklist, Evidence, access and Approval DB tests.
- `tests/inspections/inspection-slice-7-8.test.ts` — API/projection/UI seam tests.
- `tests/inspections/inspection-schedule.postgres.test.ts` — recurring schedule DB coverage.
- `tests/e2e/ps007-inspection.spec.ts` — full TypeScript browser flow.
- `playwright/conftest.py` — safe E2E DB defaults, Prisma lock ownership and port selection.
- `playwright/pages.py` — native E2E workflow/queue assertions.
- `playwright/test_inspections.py` — native PS-007 workflow coverage.
- `playwright/test_service_ports.py` — occupied-port ownership regression.
- `Lesson-learned.md` — reusable engineering lessons from recurring failures.
- `.scratch/civicos-event-first-roadmap/issues/05-ps007-inspection.md` — Planner closure status/checklists.
- `.brain/evidence/05-ps007-inspection/tests.md` — Tester verification history and authoritative final result.
- `.brain/evidence/05-ps007-inspection/review.md` — Reviewer final PASS.
