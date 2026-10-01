# LND-08 — Review transition và timeline

- **Ticket ID:** LND-08
- **Status:** done
- **V6 effective status:** done
- **V3 status:** needs-triage
- **Blocked by:** LND-04, LND-06
- **Loại:** feature
- **Lane:** full
- **Gate hướng:** có
- **File được phép sửa:** `src/modules/land/**`, `src/app/api/land/applications/[applicationId]/review/**`, `src/app/api/land/applications/[applicationId]/timeline/**`, `tests/land/**`
- **File cấm sửa:** `.env`, `.brain/**`, `docs/design/**`, `docs/research/**`
- **Demo path:** Officer được phân công chuyển application `submitted → in_review` và đọc timeline.
- **Shared commit:** `e81c252`
- **Evidence:** `.brain/evidence/LND-08/{changes,tests,review,digest}.md`

## Mô tả

Implement review transition với active `land_review` Assignment, optimistic concurrency, transaction event/audit và timeline projection an toàn.

## Các bước thực hiện

- [x] Implement transition guard/version check.
- [x] Enforce active `land_review` Assignment.
- [x] Append EventRecord/AuditEvent trong transaction.
- [x] Expose review/timeline routes theo contract.
- [x] Viết transition/concurrency/privacy tests.

## Acceptance Criteria

- [x] Given submitted application + active Assignment + current version, When POST review, Then status `in_review`, version tăng một.
- [x] Given stale version hoặc invalid status, When POST review, Then `409 LAND_VERSION_CONFLICT` hoặc `LAND_INVALID_TRANSITION`, no new event.
- [x] Given scoped actor gọi timeline, When GET timeline, Then events sorted by `occurredAt` và no ciphertext.

## Test-skeleton

- AC-01: application v1 + assigned officer + If-Match 1 → v2/in_review, event/audit count +1.
- AC-02: If-Match 0 or status rejected → expected 409, status/version unchanged.
- AC-03: timeline with two events → ascending occurredAt, actor/payload fields match safe projection.

## Rubric bắt buộc

- [x] Optimistic concurrency và audit/event phải cùng transaction; không cho officer bypass Assignment.

## Traceability

- Design: `api-contract.md:312-321,396-405`, DR-08–DR-11, EC-06–EC-09.
- Review: `.brain/evidence/LND-08/review.md` — `REVIEW-PASS`.
- Verification: `.brain/evidence/LND-08/tests.md` — LND-08 11 passed; affected regression 185 passed.

## V6 reconciliation

- Effective `done` giữ nguyên acceptance/review evidence và shared commit `e81c252`.
