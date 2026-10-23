# Non-functional Requirements — demo-seed-restart

## Safety

- Chặn mọi target khác `civicos_demo` trước connection/mutation.
- Không reset `civicos`.
- Reset phải yêu cầu confirmation explicit.
- Không log password, connection secret hoặc sensitive plaintext.

## Repeatability

- Cùng input target/clock cho kết quả domain/state tương đương.
- Seed phase có report và failure boundary rõ.
- Partial failure không được báo demo ready.

## Performance

- Dataset đủ nhỏ để rebuild local trong một phiên demo.
- Worker drain phải có timeout và báo resource đang pending.
- Verifier dùng query bounded, không tải toàn bộ file tile/evidence vào memory.

## Operability

- Có log phase, target đã sanitize và summary counts.
- JSON report dùng được cho smoke automation.
- Runbook nêu rõ shell nào chạy web, worker, TileServer và demo database.

## Privacy

- Synthetic-only.
- Party/resident sensitive data không xuất hiện trong notification/mobile alarm
  ngoài field được contract cho phép.
- DS-09 chỉ hiển thị full plate sau active `mobile_read` + same-OU check; không
  log hoặc trả `Notification.body`, owner lookup, verification notes, evidence
  content hay mutation permissions trong mobile projection.
- Evidence demo có marker namespace để cleanup an toàn.
