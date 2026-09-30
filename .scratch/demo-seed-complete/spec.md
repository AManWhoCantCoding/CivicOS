# Spec — demo-seed-complete

## Mục tiêu

Reset, seed, rebuild và verify dữ liệu synthetic đầy đủ trong `civicos_demo`, phục vụ web/mobile read-only mà không chạm `civicos` hoặc dữ liệu production.

## Quyết định

- Target phải qua `resolveDemoTarget`/confirmation; dynamic Prisma import chỉ sau preflight.
- `DEMO_NOW=2026-09-28T08:00:00.000Z` là canonical instant; không monkey-patch `Date`.
- Seed gọi domain command hiện có, không insert trực tiếp derived Event/Outbox/SLA/Notification.
- Manifest key/idempotency key là stable identity; database ID được normalize khi verify.
- Rebuild order: validate → reset → migrate → identity → residents → intake/incidents → inspections → vehicles → mobile-read → drain → verify.

## Ngoài phạm vi

- Không reset/migrate `civicos`, không sửa `.env`/secret/CI, không tạo model hoặc route mới.
- Không dùng PII thật, provider thật hoặc mobile write flow.

## Acceptance boundary

- Repeat cùng clock cho normalized report giống nhau.
- Verifier pass chỉ khi counts/manifest/status/derived/file ownership đúng và `errors`, `unexpectedRows`, `orphanRows` đều rỗng.
