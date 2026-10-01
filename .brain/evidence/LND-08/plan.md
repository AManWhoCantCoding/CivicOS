# Plan Check B10 — Ticket LND-08 (land-module): Review transition và timeline

- Mục tiêu: chuyển application `submitted → in_review` bằng Assignment `land_review`, optimistic concurrency và timeline đọc an toàn.
- Allowed scope: `src/modules/land/**`, review/timeline routes under the application path, `tests/land/**`.
- Contract refs: `phase-02-intake-review.md:82-106`, `api-contract.md:312-321,396-405`, DR-08–DR-11, EC-06–EC-09.
- Không sửa design/schema/migration/identity/UI; transition event và audit phải cùng transaction.
- Trạng thái: implementation, privacy repair và Mentor review đã hoàn tất; Phase 02 còn LND-09.
