# Files changed — PS-E1-007

## Trạng thái và evidence

- `.scratch/civicos-e1-clone-mvp/issues/04-ps-e1007-inspection.md` — Planner: tick 15 AC, 4 rubric bắt buộc, 6 bước thực hiện; chuyển `Status` và `Trạng thái cuối` sang `done`.
- `.scratch/feature-map.md` — Planner: thêm entry Inspection/Establishment, cách vào, cách điều khiển và bẫy vận hành.
- `.brain/evidence/04-ps-e1007-inspection/plan.md` — Developer/Reviewer: plan và direction gate PASS.
- `.brain/evidence/04-ps-e1007-inspection/audit-gap-matrix.md` — Developer: audit AC/rubric.
- `.brain/evidence/04-ps-e1007-inspection/scope-change.md` — Planner: quyết định mở rộng scope đã được xác nhận.
- `.brain/evidence/04-ps-e1007-inspection/changes.md` — Developer-fallback: mapping thay đổi/evidence.
- `.brain/evidence/04-ps-e1007-inspection/tests.md` — Tester: verification history; Lần chạy 30 là bằng chứng đầy đủ gần nhất.
- `.brain/evidence/04-ps-e1007-inspection/review.md` — Reviewer: final review PASS và round-trip PASS.
- `.brain/evidence/04-ps-e1007-inspection/logs/run*.log` — Tester: log các lần verification của ticket.
- `Lesson-learned.md` — Developer-fallback/Reviewer: bài học tổng quát trong quá trình triển khai và review.

## Product và migration — Developer-fallback

- `src/app/api/establishments/route.ts`
- `src/app/api/establishments/[establishmentId]/route.ts`
- `src/app/api/inspections/route.ts`
- `src/app/api/inspections/[inspectionId]/route.ts`
- `src/app/api/inspections/[inspectionId]/commands/route.ts`
- `src/app/api/inspections/stats/route.ts`
- `src/app/api/sync/route.ts`
- `src/app/inspections/layout.tsx`
- `src/app/inspections/establishments/page.tsx`
- `src/components/inspections/ChecklistForm.tsx`
- `src/components/inspections/EnforcementApprovalPanel.tsx`
- `src/components/inspections/EstablishmentDetail.tsx`
- `src/components/inspections/EstablishmentForm.tsx`
- `src/components/inspections/EstablishmentList.tsx`
- `src/components/inspections/InspectionDetail.tsx`
- `src/components/inspections/InspectionFindingForm.tsx`
- `src/components/inspections/InspectionScheduleBoard.tsx`
- `src/components/inspections/InspectionScheduleForm.tsx`
- `src/components/inspections/RecommendationForm.tsx`
- `src/modules/eventing/event-catalog.ts`
- `src/modules/inspections/commands.ts`
- `src/modules/inspections/config.ts`
- `src/modules/inspections/contracts.ts`
- `src/modules/inspections/domain.ts`
- `src/modules/inspections/index.ts`
- `src/modules/inspections/projection.ts`
- `src/modules/inspections/schemas.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20260925000000_ps_e1007_completion/migration.sql`

## Tests — Developer-fallback

- `tests/inspections/inspection-ps007-regression.test.ts`
- `tests/inspections/inspection-schedule.postgres.test.ts`
- `tests/inspections/inspection-slices-4-6.postgres.test.ts`
- `tests/inspections/inspection-stats.postgres.test.ts`
- `tests/integration/schema-and-migration.test.ts`
- `tests/e2e/ps007-inspection.spec.ts`
- `tests/e2e/parallel-wave.spec.ts`
- `tests/e2e/parallel-wave-read-model.spec.ts`

## Kết quả cuối

- Tester: Lần chạy 30 `scope=full` PASS toàn bộ 7 bước; Tree `ca44b228` khớp `node scripts/verify.mjs --tree`.
- Reviewer: final checkpoint PASS; round-trip check PASS.
- Gate hướng: không bỏ qua; direction gate PASS.
- Commit: chờ Reviewer thực hiện commit sau khi Planner giao message.
- Các file ngoài danh sách trên đang có thay đổi baseline độc lập; không đưa vào commit ticket này và không reset/xóa.
