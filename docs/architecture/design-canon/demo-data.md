---
title: CivicOS — dữ liệu demo và seed
status: draft
owner: project
created: 2026-10-23
updated: 2026-10-23
sources:
  - ../../../docs/demo-seed-complete/overview.md
  - ../../../docs/demo-seed-complete/LOCK.json
  - ../../../docs/demo-seed-restart/overview.md
  - ../../../docs/demo-seed-restart/LOCK.json
  - ../../../docs/demo-script.md
  - ../../../.scratch/demo-seed-complete/workflow-status.md
  - ../../../.scratch/demo-seed-restart/workflow-status.md
  - ../../../docs/agents/project.md
---

# CivicOS — dữ liệu demo và seed

## Quyết định nguồn hiện hành

| Work item             | Status được ghi                                                | Cách dùng                                                                                                                             |
| --------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `demo-seed-complete`  | `CLOSED_BY_USER` — đóng vĩnh viễn ngày 2026-10-07              | Chỉ dùng để hiểu lịch sử. Không resume, không lấy manifest/phase/ticket/count làm requirement mới.                                    |
| `demo-seed-restart`   | `DS09_B11_PHASE_PASS`; full lock, B8/B9 approved theo workflow | Là work item mới cho dữ liệu synthetic, repeatable và coverage các surface hiện có. Đọc design/lock/status/ticket trước mọi thay đổi. |
| `docs/demo-script.md` | Runbook demo end-to-end bằng synthetic data                    | Kịch bản vận hành demo, không phải production runbook; thao tác thực tế phải được operator kiểm tra.                                  |

Không ghép hai manifest thành một. Các count, state, credential, ordering và assumptions trong thiết kế cũ không tự chuyển sang `demo-seed-restart`.

## Boundary an toàn

- Target reset/rebuild chỉ là `civicos` trên Docker Compose local, PostgreSQL loopback port `5432`; không dùng shared/staging/production, `.env`, secrets, tile storage hoặc môi trường khác. Quyết định target: `docs/reset/decision-log.md` D-80.
- Target/clock/confirmation phải được kiểm tra trước import hoặc mutation theo contract của work item.
- Dùng dữ liệu synthetic; không đưa PII thật hoặc credential vào manifest, report, screenshot hoặc log.
- Derived event/outbox/projection/SLA/notification/audit phải do command/worker sở hữu theo thiết kế, không insert trực tiếp chỉ để làm dữ liệu demo “đủ”.
- Verification phải fail-closed với row ngoài manifest, orphan, pending/processing/dead-letter hoặc trạng thái không được dự kiến.
- Không dùng demo để khẳng định dữ liệu chính thức, kết nối CSDL quốc gia, legal effect hoặc production readiness.

## Thiết kế hiện hành được mô tả

`demo-seed-restart` đặt mục tiêu phủ các surface web hiện có, mobile read-only, map/Land, Evidence, SLA, notification, event/projection và permission/error state. Workflow ghi thứ tự khái niệm:

```text
validate target/clock
  → migrate/reset theo guard
  → identity
  → residents
  → intake/incidents
  → inspections
  → vehicles
  → land
  → assignments
  → drain worker
  → verify API/read models
```

Manifest cần deterministic và idempotent theo key; database-generated IDs không phải identity ổn định của fixture. Các count/bản ghi đại diện cụ thể thuộc manifest/work item mới, không chép từ thiết kế cũ.

## Quy tắc thời gian và domain ownership

Tài liệu seed cũ mô tả explicit clock seam, `DEMO_NOW` ISO-8601 có timezone, không monkey-patch `Date`, và truyền clock/context tới demo-reachable commands. Đây là lịch sử thiết kế có ích để hiểu deterministic seed; chỉ áp dụng phần nào đã được `demo-seed-restart`/contract hiện hành xác nhận.

Inspection recurrence, Recommendation/Approval, state chuyển Intake/Incident và derived event không được sửa production semantics để ép một fixture/count. Khi code contract và seed design không khớp, ghi chênh lệch và đối chiếu command/test/decision tương ứng; không lặng lẽ sửa dữ liệu hoặc state machine.

## Bằng chứng và trạng thái

Workflow `demo-seed-restart` ghi DS-09/phase gate hoàn tất và link evidence dưới `.brain/evidence/PH-05-DS09/`. Đây là status lịch sử trong artifact; tài liệu này không chạy lại rebuild, verify hoặc phase gate. `LOCK.json` hiện giữ nguyên, không được regenerate trong lần tổng hợp.

### Nguồn chính

- Current design: `docs/demo-seed-restart/`.
- Legacy closed design: `docs/demo-seed-complete/` và `.scratch/demo-seed-complete/`.
- Work state: `.scratch/demo-seed-restart/workflow-status.md`, phases, tickets, verification/evidence.
- Manual narrative: `docs/demo-script.md`.
