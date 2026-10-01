# LND-09 — Web screen-01 queue và screen-02 create

- **Ticket ID:** LND-09
- **Status:** done
- **V6 effective status:** done
- **V3 status:** needs-triage
- **Blocked by:** LND-06, LND-07, LND-08
- **Loại:** feature
- **Lane:** full
- **Gate hướng:** có
- **File được phép sửa:** `src/app/land/**`, `src/components/land/**`, `src/components/navigation/feature-registry.ts`, `tests/land-ui/**`
- **File cấm sửa:** `.env`, `.brain/**`, `docs/design/**`, `.scratch/land-module/ui/**`
- **Demo path:** Officer mở queue, lọc application, tạo hồ sơ và được chuyển tới detail.
- **Shared commit:** `e81c252`
- **Evidence:** `.brain/evidence/LND-09/{changes,tests,review,digest}.md`

## Mô tả

Triển khai queue/create web flow theo screen-01/02, bốn change type, server-owned scope, idempotency retry và state surfaces.

## Các bước thực hiện

- [x] Dựng screen-01 queue/filter/pagination.
- [x] Dựng screen-02 dynamic four change type form.
- [x] Kết nối create/list/detail API và idempotency feedback.
- [x] Implement loading/error/empty/forbidden/offline/conflict states.
- [x] Viết UI contract/accessibility tests.

## Acceptance Criteria

- [x] Given officer có scope, When mở `/land`, Then queue/filter và CTA create hiển thị đúng scope.
- [x] Given form hợp lệ, When submit screen-02, Then API 201 và navigation tới detail status `submitted`.
- [x] Given invalid payload/offline/conflict, When submit, Then message tiếng Việt hiển thị tại control và input không mất.

## Test-skeleton

- AC-01: session officer + queue response → rows/status chip/CTA render; leader không thấy CTA create.
- AC-02: form transfer valid + API 201 → navigate detail with applicationCode/status.
- AC-03: API `LAND_IDEMPOTENCY_CONFLICT`/offline → error state, retry and input values remain.

## Rubric bắt buộc

- [x] Bám screen-01/02 handoff và design tokens; không tạo UI control approve/sync trong form create.

## Traceability

- Design: `.scratch/land-module/ui/screen-01.md`, `screen-02.md`, `design-tokens.md`.
- Review: `.brain/evidence/LND-09/review.md` — `REVIEW-PASS`.
- Verification: `.brain/evidence/LND-09/tests.md` — LND-09 + LND-05 UI 41 passed; scoped checks PASS.

## V6 reconciliation

- Effective `done` giữ nguyên acceptance/review evidence và shared commit `e81c252`.
