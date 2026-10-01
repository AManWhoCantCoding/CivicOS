# Phase 02 — Intake & review

- **Workflow version:** V6
- **Effective status:** done
- **V3 source:** `phase-02-intake-review.md` (migrated; ticket contracts split below)
- **Gate:** `PHASE-PASS`
- **Gate evidence:** `.brain/evidence/phase-02/gate.md`

## Phạm vi phase

Xây dựng `LandChangeApplication` aggregate, create/list/detail/review, bốn change type, validation, idempotency, optimistic concurrency, timeline và web workspace/form. Phase này hoàn thiện F-02 và phần timeline/Assignment của F-06; chưa chạy national mock hoặc approval.

## Tính năng thuộc phase

- F-02 — tiếp nhận và thẩm tra hồ sơ biến động.
- F-06 — application scope, review Assignment và timeline read.

## SOW và phụ thuộc phase

- SOW mapping: F-02 và phần timeline/Assignment của F-06 trong `.scratch/land-module/sow.md` mục 3–5.
- Phụ thuộc trước: Phase 01 hoàn tất party/parcel/identity/Assignment.
- Mở khóa cho: Phase 03 dùng application state `in_review` và timeline; Phase 04 dùng application projection/public data.
- API không thêm route ngoài `api-contract.md` đã full lock.

## Phase DoD

- Idempotency cùng key/cùng payload trả cùng application; khác payload trả `LAND_IDEMPOTENCY_CONFLICT`.
- Bốn change type và relation/share rules được validate trước review.
- Officer có Assignment chuyển `submitted → in_review`, version tăng và event/audit cùng transaction.
- Actor ngoài scope nhận forbidden state, không lộ application data.
- Screen-01/02 queue/create bám handoff, giữ input khi lỗi/retry và điều hướng sau `201`.

## Ticket index

| ID | File V6 | Effective status | V3 status | Blocked by |
|---|---|---|---|---|
| LND-06 | `T-LND-06-application-aggregate-create-list-detail.md` | done | needs-triage | LND-01, LND-02, LND-04 |
| LND-07 | `T-LND-07-change-type-validation-idempotency.md` | done | needs-triage | LND-06 |
| LND-08 | `T-LND-08-review-transition-timeline.md` | done | needs-triage | LND-04, LND-06 |
| LND-09 | `T-LND-09-web-application-queue-create.md` | done | needs-triage | LND-06, LND-07, LND-08 |

## V6 reconciliation

- `.brain/evidence/phase-02/gate.md` explicitly records `PHASE-PASS` for LND-06–LND-09.
- Shared implementation commit `e81c252` is the accepted commit reference for the batch.
- LND-06 has focused regression evidence embedded in LND-07/LND-08 evidence; no standalone LND-06 evidence directory is created by migration.
