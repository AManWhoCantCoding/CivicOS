# Design Overview — `ui-auto-demo`

## Trạng thái

- **B5:** `APPROVED_BY_USER` — UAD-01…UAD-13 theo scope mở rộng.
- **B6:** `APPROVED_BY_USER` — user đã duyệt design/SOW.
- **B7:** `READY_FOR_NEXT_GATE` — Stitch conformance `PASS`; runtime smoke deferred
  tới B8.
- **B8:** `APPROVED_BY_USER` — user đã duyệt executable prototype.
- **B9:** `APPROVED_BY_USER` — user duyệt `NO_NEW_SCHEMA`.
- **B10:** `COMPLETE` — phase/ticket decomposition đã tạo.
- **Selected scope:** web + native mobile orchestration; live mutation chỉ trên
  web `civicos_demo`; mobile giữ read-only; tự login persona demo qua provider
  local/demo.
- **Infrastructure:** user tự khởi động; runner chỉ preflight/readiness và báo
  `blocked`, không tự start DB, worker, map provider, emulator hoặc device.
- **Timing:** mặc định chờ 3.000ms giữa hai thao tác đã settle.

## Problem statement

CivicOS có nhiều surface và runbook demo thủ công nhưng chưa có một control điều
phối có narrator, pacing và scenario coverage. Người trình bày khó cho khán giả
thấy đủ happy path, validation, forbidden, offline, provider failure, approval và
những giới hạn của mobile read-only. Existing Playwright automation là test
harness, không phải presenter capability trong sản phẩm.

## Goal

Tạo một Demo Center/runner có thể chạy một manifest scenario đã được kiểm duyệt,
hiển thị giải thích từng bước, thao tác qua UI/native behavior thật và chuyển
giữa web live workflow với native mobile read-only. Runner phải an toàn khi thiếu
dependency, không bypass permission và không biến demo thành production operation.

## Scope map

| Feature | Required state | Must preserve |
|---|---|---|
| UAD-01 Demo control | Start, pause/resume, stop, replay; hiển thị mode/target/run state | Auth boundary, responsive/focus semantics |
| UAD-02 Manifest | Scene/persona/precondition/step/explanation/expected state/cleanup | Domain vocabulary và route ownership |
| UAD-03 Narrator | Tiếng Việt, current/completed/blocked, live region, progress | Không lộ raw payload/PII |
| UAD-04 Pacing | 3.000ms giữa action settle và action kế tiếp; readiness wait riêng | Reduced motion không bỏ narration/semantic order |
| UAD-05 Web runner | Click/type/open-select/choose/checkbox/dialog/navigation/submit qua component thật | Existing API, form validation, server authorization |
| UAD-06 Live mutation | Chỉ web, chỉ target `civicos_demo`, allowlist scene và cleanup/replay policy | Domain state machine, audit/event/outbox semantics |
| UAD-07 Persona broker | Tự login/switch persona bằng local/demo credential provider | Không credential production, không cookie swap |
| UAD-08 Mobile runner | Điều phối native screens và deep links; chỉ GET/read actions | `WriteGuard`, native navigation, read-only API |
| UAD-09 Negative states | Loading/empty/validation/forbidden/offline/error/simulated/provider blocked | Safe copy, masking, no legal/public overclaim |
| UAD-10 Evidence | Coverage and run evidence per scenario/step | No secret/PII/raw response logging |

## User flow

```text
Demo Center
  → verify demo mode + exact target civicos_demo
  → verify local broker/bridge + web/mobile readiness
  → select manifest / run mode LIVE_DEMO
  → broker establishes demo persona session
  → web scene: actual component interaction + live mutation
  → wait for action settle → narrator → 3 seconds
  → mobile scene: native read-only interaction through bridge
  → blocked/error/forbidden state is narrated, not silently skipped
  → pause/resume/stop/replay as requested
  → completion report + cleanup handoff
```

## Non-goals

- Không cho mobile tạo/sửa/xóa/duyệt dữ liệu; không đổi `WriteGuard`.
- Không tự khởi động hoặc quản trị PostgreSQL, worker, TileServer, Metro,
  emulator/device hay production infrastructure.
- Không đăng nhập account production, không hard-code password/token, không lộ
  credential trong client bundle, narrator, log hoặc screenshot.
- Không gọi API trực tiếp để thay thế thao tác component; không sửa DOM/state để
  giả lập kết quả.
- Không thêm business workflow, permission, role, Assignment, legal meaning,
  public lookup semantics hoặc map projection behavior.
- Không gọi một manifest “tất cả” nếu chưa có coverage evidence cho từng scope.
- Không tạo mobile write parity hoặc biến simulated data thành official data.

## Decision closure needed at B6

- Local broker/bridge chỉ chạy trong demo mode, target `civicos_demo`, và không
  được expose như public production API.
- Web mutation dùng existing component/API/action; runner không có mutation API
  riêng thay cho domain contract.
- Mobile runner chỉ dùng native UI và existing read API/deep-link; mọi write bị
  chặn ở `WriteGuard` và server.
- Cleanup/reset không được âm thầm destructive từ nút; B9 phải chốt fixture,
  idempotency và operator-confirmed cleanup disposition.
