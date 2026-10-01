# LND-07 — Change-type validation và idempotency

- **Ticket ID:** LND-07
- **Status:** done
- **V6 effective status:** done
- **V3 status:** needs-triage
- **Blocked by:** LND-06
- **Loại:** feature
- **Lane:** full
- **Gate hướng:** có
- **File được phép sửa:** `src/modules/land/**`, `src/modules/land/schemas/**`, `tests/land/**`
- **File cấm sửa:** `.env`, `.brain/**`, `docs/design/**`, `prisma/schema.prisma`
- **Demo path:** Bốn change type hợp lệ được tiếp nhận; payload/links sai bị từ chối trước review.
- **Shared commit:** `e81c252`
- **Evidence:** `.brain/evidence/LND-07/{changes,tests,review,digest}.md`

## Mô tả

Validate bốn `changeType`, enforce payload/link/share/mortgage rules và fingerprint idempotency trước khi tạo hoặc replay application.

## Các bước thực hiện

- [x] Tạo schema cho bốn `changeType` và payload shape.
- [x] Validate party/parcel role links theo loại.
- [x] Enforce share/mortgage/split-merge rules.
- [x] Persist payload fingerprint cho idempotency.
- [x] Viết red/green tests cho EC-03–EC-06 và DR-12–DR-15.

## Acceptance Criteria

- [x] Given transfer thiếu holder/subject hoặc share tổng khác `100.00`, When create/review, Then `400 LAND_INVALID_REQUEST` và không transition.
- [x] Given same `Idempotency-Key` với cùng payload, When retry, Then cùng application id và không thêm row.
- [x] Given same key với payload khác, When retry, Then `409 LAND_IDEMPOTENCY_CONFLICT` và application cũ không đổi.

## Test-skeleton

- AC-01: mỗi change type với payload tối thiểu hợp lệ → validation pass; thiếu relation → expected error code.
- AC-02: key `key-001` + payload A gửi hai lần → one row, same id.
- AC-03: key `key-001` + payload B → HTTP 409, version/status unchanged.

## Rubric bắt buộc

- [x] Không mở rộng change type/payload ngoài `data-model.md:141-148`; error message dùng bảng API contract.

## Traceability

- Design: DR-07, DR-12–DR-15; EC-03–EC-06; `phase-02-intake-review.md` V3 lines 56–80.
- Review: `.brain/evidence/LND-07/review.md` — `REVIEW-PASS`.
- Verification: `.brain/evidence/LND-07/tests.md` — LND-07 41 passed, LND-06 30 passed, targeted regression 174 passed.

## V6 reconciliation

- Effective `done` giữ nguyên acceptance/review evidence và shared commit `e81c252`.
