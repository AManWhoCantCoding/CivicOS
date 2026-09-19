# 07: Tích hợp và kiểm chứng parallel wave

**What to build:** Tích hợp ba vertical slice vào cùng modular monolith theo thứ tự PS-E1-005 → PS-E1-007 → PS-E1-009, xác nhận các module dùng chung event/authorization/evidence/geo/SLA contracts mà không ghi xuyên aggregate, và chứng minh toàn bộ wave chạy được từ UI đến projection. Đây là thứ tự tích hợp của parallel wave hiện tại, không thay thế roadmap tổng thể `PS-E1-005 → PS-E1-008 → PS-E1-007`.

**Blocked by:** 04: PS-E1-005 IntakeReport đến Incident; 05: PS-E1-007 Inspection cơ sở kinh doanh; 06: PS-E1-009 VehicleObservation và registry

**Status:** ready-for-agent

## Files in scope

- `prisma/schema.prisma`: final schema review, indexes, foreign keys, encryption metadata và cross-module references.
- `prisma/migrations/<timestamp>_parallel_wave_hardening/migration.sql`: only additive/integration migration required after module review.
- `src/app/page.tsx`: thay placeholder bằng operational landing/work queue entry surface, không phải marketing landing page.
- `src/app/layout.tsx`: shared metadata, app shell provider and navigation integration.
- `src/app/globals.css`: final shared design tokens, responsive states, focus/reduced-motion rules; không thêm page-specific hacks.
- `src/modules/eventing/index.ts`: verify only public event entry points are used by all modules.
- `src/modules/identity/index.ts`: verify only public authorization/audit entry points are used by all modules.
- `src/modules/platform/index.ts`: verify shared Evidence/Geo/SLA/notification entry points.
- `tests/integration/parallel-wave.integration.test.ts`: cross-module command/event/projection/replay tests.
- `tests/integration/schema-and-migration.test.ts`: clean database migration and rollback-safety checks.
- `tests/e2e/parallel-wave.spec.ts`: end-to-end smoke path through all three module UIs.
- `README.md`: local PostgreSQL, worker, test and verification instructions.

## Implementation steps

1. **Freeze the integration baseline.** Review all migrations, public module entry points, event versions, authorization contracts and generated Prisma client; reject direct imports into another module’s internals.
2. **Build and migrate from a clean database.** Apply Event kernel, Identity, platform, PS-E1-005, PS-E1-007 and PS-E1-009 migrations in dependency order; verify a second migration run is a no-op.
3. **Integrate PS-E1-005 first.** Run its integration and browser suites, verify Incident projection/replay, Assignment, Approval, AuditEvent and SLA before adding the next module.
4. **Integrate PS-E1-007 second.** Run its suites against the same shared contracts, verify checklist versioning, Evidence access, EnforcementRecommendation Approval and no write into Incident tables.
5. **Integrate PS-E1-009 third.** Run its suites, verify PWA/offline sync, registry validity, match confirmation, Evidence access and two-hour escalation without Camera/LPR network access.
6. **Run cross-module replay.** Clear/rebuild all read models from event history, compare expected list/detail/timeline results and verify sensitive suggestions remain authorization-gated.
7. **Run authorization and audit matrix.** Exercise Trưởng Công an xã, assigned User, unassigned User, revoked Assignment and unrelated OrganizationUnit on every module API and UI route.
8. **Run resilience and freshness tests.** Stop/restart worker, inject duplicate/failing messages, measure retry/dead-letter/replay, and verify projection p95 freshness target of 10 seconds under the defined workload.
9. **Run UI preflight.** Test desktop/mobile viewport, keyboard navigation, focus/contrast, labels/errors, no horizontal overflow, loading/empty/error/denied/offline states, dark-mode consistency and `prefers-reduced-motion`; check all visible copy for clarity.
10. **Finalize operational verification.** Run lint, typecheck, build, format check, all unit/integration/e2e suites, update README with only verified commands, and confirm explicitly out-of-scope modules were not introduced.

## Explicitly out of scope

- Không thêm module PS-E1-003/004/008/001/002/006/010 vào wave này.
- Không tách service hoặc tạo branch/worktree dependency trong workspace chưa có Git.
- Không mở rộng cross-module write để làm tắt một luồng UI.

## UI requirements

Áp dụng `design-taste-frontend` theo design read: **trust-first public-sector operations console**, `DESIGN_VARIANCE=3`, `MOTION_INTENSITY=2`, `VISUAL_DENSITY=5`. Giữ một hệ thống token, radius và icon family; không dùng AI-purple gradient, glassmorphism, decorative hero, duplicate CTA hoặc card-inside-card. Kiểm tra desktop/mobile, dark-mode hiện có, WCAG AA contrast, keyboard focus, empty/loading/error/denied/offline states và `prefers-reduced-motion`.

## Acceptance criteria

- [ ] Có thể dựng database sạch và chạy toàn bộ migrations theo đúng thứ tự; không có migration phụ thuộc file cục bộ không được commit.
- [ ] PS-E1-005 được tích hợp trước, sau đó PS-E1-007, sau đó PS-E1-009; mỗi bước giữ lint/typecheck/build xanh.
- [ ] Không module nào ghi trực tiếp aggregate hoặc bảng nguồn sự thật của module khác.
- [ ] Toàn bộ event type của ba module có version, owner và consumer rõ ràng; event replay dựng lại được các projection chính.
- [ ] Cross-module link chỉ là ID/projection/suggestion; sensitive link cần confirmation theo authorization.
- [ ] Authorization matrix được kiểm tra cho Trưởng Công an xã, assigned User, unassigned User, revoked Assignment và unrelated OrganizationUnit trên cả API/UI.
- [ ] AuditEvent được tạo cho sensitive read/download/mutation trong cả ba module.
- [ ] SLA test chứng minh thời gian liên tục qua cuối tuần/ngày lễ và notification retry không nhân bản side effect.
- [ ] Projection freshness đạt p95 không quá 10 giây trong test workload đã định nghĩa; lag/failure có signal.
- [ ] E2E smoke test đi qua IntakeReport/Incident, Establishment/Inspection và registry/VehicleObservation từ UI đến read model.
- [ ] UI preflight kiểm tra không có text/button bị cắt, mọi form có label/error/focus, mobile layout không tràn ngang, reduced motion hoạt động.
- [ ] `npm run lint`, `npm run build`, toàn bộ unit/integration/e2e test và format check pass.
- [ ] README mô tả chính xác cách chạy app, worker, PostgreSQL, migrations và test; không ghi lệnh chưa tồn tại.
