# Ticket 06 — checkpoint review

- Căn cứ: ticket `.scratch/role-access-sidebar-realtime/issues/06-module-shell-sidebar.md`, `CONTEXT.md`, diff/code hiện tại, `changes.md`, `tests.md` và review trước.
- Reviewer **không chạy** test/lint/typecheck/format/build và **không sửa production, không commit**.

| Acceptance Criteria | Kết quả | Đối chiếu code và evidence |
|---|---|---|
| 1. Dashboard cards unchanged | PASS | `src/app/page.tsx:5-28,68-105` giữ nguyên ba card và Assignment card; `tests/e2e/module-shell.spec.ts:29-54` ghi nhận headings/hrefs pass desktop + mobile. |
| 2. Literal `/incidents`, `/inspections`, `/vehicles`, `/identity` shells | PASS | `feature-registry.ts:3,39-64` khai báo đúng bốn module và `identity.homeHref: '/identity'`; `incidents/layout.tsx:6-27`, `inspections/layout.tsx:6-27`, `vehicles/layout.tsx:6-27`, `identity/page.tsx:69-110`, cùng `field/vehicles/layout.tsx:1-7` gắn shell. `tests.md:350-359` ghi module-shell pass 26/26 thực thi. |
| 3. Exact Feature registry | PASS | `feature-registry.ts:66-185` chỉ có 12 Feature thuộc đúng bốn nhóm: Incident queue/intake/assignment; Inspection catalogue/schedule/workqueue; Vehicle registry/observation/verification; Identity assignments/users. `tests.md:104-106` ghi các assertion registry pass. |
| 4. Role/active Assignment/OU visibility | PASS | `feature-registry.ts:219-235` lọc module + role + task + active assignment; `:197-211` kiểm tra assignee và OU scope; `useModuleSession.ts:129-152` chỉ tải assignment khi cần. Retest cuối ghi `module-shell.spec.ts` pass (`tests.md:350-359`), gồm own-assignment/role-filtered coverage. |
| 5. Server-side direct-link denial cho `/identity`, `/users`, `/assignments`, `/incidents`, `/inspections/establishments`, `/vehicles/registry`, `/field/vehicles` | PASS | Seam server-only `feature-entry.ts:20-45` dùng session/role rồi `listAssignments`, sau đó `canEnterAnyFeature`; entry pages gọi seam tại `identity/page.tsx:9-55`, `users/page.tsx:14-59`, `assignments/page.tsx:10-55`, `incidents/page.tsx:9-18`, `inspections/establishments/page.tsx:10-18`, `vehicles/registry/page.tsx:9-12`, `field/vehicles/page.tsx:8-22`. `tests.md:274` và `:350-359` ghi server-denied assertions cho đủ bảy route. Logged-out `/incidents` giữ contract cũ: page không render sidebar và API trả 401 (`tests.md:274`), không phải bypass client authorization. |
| 6. Active/module/breadcrumb/focus/accessibility | PASS | Active matching `feature-registry.ts:269-307`; `ModuleSidebar.tsx:21-43` có `aria-current`, accessible label và target 44px; breadcrumb/module context `ModuleShell.tsx:250-290`; dialog name `:301-317`; focus handling `:126-169`. `tests.md:359` xác nhận keyboard focus/accessibility coverage pass. |
| 7. Desktop collapse | PASS | `ModuleShell.tsx:36-68,213-230` lưu trạng thái và dùng `aria-expanded`; test desktop tại `module-shell.spec.ts:360-385`, kết quả pass trong `tests.md:359`. |
| 8. Mobile drawer/focus trap/close/reduced-motion | PASS | Drawer/dialog và close `ModuleShell.tsx:294-325`; Tab/Escape trap `:141-169`; close khi navigation/focus return `:111-124`; motion dùng `motion-safe` tại `:214`, `ModuleSidebar.tsx:31`. Test mobile drawer/focus/navigation pass theo `tests.md:359`. |
| 9. Loading/empty/error/denied/offline | PASS | `ModuleStatus.tsx:5-61` định nghĩa đủ loading, error, empty, denied, offline; lựa chọn state ở `ModuleShell.tsx:171-204`; denied server-render ở các entry page. `tests.md:111` và retest cuối `:359` ghi denied/offline/loading/error coverage pass; typecheck/lint và focused format-check pass tại `tests.md:429-443`. |
| 10. Sidebar không phải security boundary | PASS | Client chỉ đọc session/assignment để hiển thị (`useModuleSession.ts:61-82`); authorization thật nằm ở server `feature-entry.ts:1-4,20-45` và page gates nêu ở AC5. Direct-link denied assertions được ghi tại `tests.md:274,350-359`; không có thay đổi `src/modules/**`, API hay worker trong diff ticket. |

## Scope và ảnh hưởng của failure ngoài ticket

| Kiểm tra | Kết quả | Evidence/đánh giá |
|---|---|---|
| Production scope của Ticket 06 | PASS | `changes.md:3-5,7-36,62-139` mô tả chỉ registry/shell/sidebar, entry-page integration và test. `src/app/identity/page.tsx` và `src/app/field/vehicles/layout.tsx` là hai ngoại lệ tối thiểu được AC route/Vehicle yêu cầu; code chỉ dùng shell/gate, không thêm domain/API. Các page entry khác là phần server direct-link AC5. |
| Domain/API boundary | PASS | `changes.md:3-5` và diff/code thực tế không có thay đổi `src/modules/**`, `src/app/api/**`, worker hoặc domain component; migration không thuộc Ticket 06. |
| Full-suite Tester failures có ảnh hưởng AC06 | PASS — không ảnh hưởng | `tests.md:464-481` chỉ fail migration contract do migration ngoài ticket; `:494-525` chỉ fail evidence-authorization và parallel-wave/read-model do file/worker ngoài ticket; `:534-550` chỉ là format warnings ở 13 file ngoài ticket. Cùng evidence ghi module-shell, login, PS005, PS007, PS009, field-shell pass (`tests.md:350-380,492-498`). Không có failure nào trỏ vào code/evidence của AC Ticket 06. |
| Không có thay đổi ngoài ticket trong working tree | THIẾU EVIDENCE | `git status` có các thay đổi ngoài ticket (migration, evidence khác, `.scratch`, file rác được Tester ghi tại `tests.md:162-164`), nhưng evidence hiện có không chứng minh được chúng là do Ticket 06 hay do wave khác. Cần Planner xử lý scope/worktree attribution; Reviewer không tự sửa. Điều này không làm đổi kết luận 10 AC ở trên. |

## Kết luận

- 10/10 Acceptance Criteria: **PASS** theo diff và Tester evidence hiện có.
- Đã commit sau checkpoint theo lệnh Planner.
- Evidence review đã được cập nhật tại `.brain/evidence/06-module-shell-sidebar/review.md`.
- Commit: `3b24834` (`feat(ui): add module shells and feature sidebars`).
