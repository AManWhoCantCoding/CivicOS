# Trạng thái workflow — demo-seed-complete

- Design đã khóa cho reset/seed/rebuild/verify deterministic trên `civicos_demo`.
- Fixed clock explicit, target guard trước Prisma import, domain command là owner của derived rows.
- Inspection canonical count là 8 vì ba recurrence do `completeInspection` tạo ra.
- Npm wiring `demo:rebuild`/`demo:verify` thuộc ticket readiness; không tự mở rộng whitelist clock ticket.
- Mọi verify phải fail-closed với pending/dead-letter/orphan/unexpected row.
