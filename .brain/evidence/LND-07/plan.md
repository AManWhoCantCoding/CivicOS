# Plan Check B10 — Ticket LND-07 (land-module): Change-type validation và idempotency

- Mục tiêu: validate bốn `changeType` trước khi tạo application, enforce payload/link rules và idempotency fingerprint theo contract khóa.
- Allowed scope: `src/modules/land/**`, `src/modules/land/schemas/**`, `tests/land/**`.
- Contract refs: `data-model.md:141-171,228-235`, DR-07, DR-12–DR-15, EC-03–EC-06, EC-10–EC-12, `phase-02-intake-review.md:56-80`.
- Không sửa design/schema/migration/API route/UI/identity; không tạo `.brain` artifact từ Developer.
- Trạng thái: implementation và Mentor review đã hoàn tất; chưa chạy phase gate vì Phase 02 còn LND-08/LND-09.
