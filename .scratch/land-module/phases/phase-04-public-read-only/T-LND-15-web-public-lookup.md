# LND-15 — Web screen-05 public lookup

- **Ticket ID:** LND-15
- **Status:** needs-triage
- **V6 effective status:** done
- **V3 status:** needs-triage
- **Blocked by:** LND-14
- **Loại:** feature
- **Lane:** fast
- **Gate hướng:** không
- **File được phép sửa:** `src/app/public/land/lookup/**`, `src/components/land/**`, `tests/land-ui/**`
- **File cấm sửa:** `.env`, `.brain/**`, `docs/design/**`, `.scratch/land-module/ui/**`
- **Demo path:** Public user mở `/public/land/lookup`, nhập một mã và xem trạng thái mô phỏng.
- **Evidence/commit:** `c661456` (`feat: add public lookup screen`); focused and land-ui regression tests passed.

## Mô tả

Triển khai screen-05 public lookup với mode selector, result projection tám field, simulated label và error/retry states.

## Các bước thực hiện

- [x] Dựng mode selector và input code.
- [x] Kết nối public lookup GET.
- [x] Render result 8 fields và simulated label.
- [x] Implement invalid/not-found/rate-limit/offline states.
- [x] Viết redaction/accessibility tests.

## Acceptance Criteria

- [x] Given code hợp lệ, When submit screen-05, Then result card hiển thị 8 fields và `simulated: true`.
- [x] Given cả hai mode hoặc code rỗng, When submit, Then UI hiển thị message `LAND_LOOKUP_QUERY_INVALID` bằng tiếng Việt.
- [x] Given not-found/rate-limited/offline, When API lỗi, Then input được giữ và retry không tự lặp vô hạn.

## Test-skeleton

- AC-01: mode application + APP-001 → result field set exact, no internal field.
- AC-02: both mode flags/blank input → validation message, network call absent or 400 mapped.
- AC-03: 404/429/offline → error/rate/offline state, input value unchanged.

## Rubric bắt buộc

- [x] Bám screen-05; không render official/certified wording, polygon hoặc PII.

## Traceability

- Design: `.scratch/land-module/ui/screen-05.md`, `design-tokens.md`.
- Dependency: LND-14.

## V6 reconciliation

- Effective status `done` after `c661456`; public screen-05 is standalone, projection-only and covered by UI contract tests.
