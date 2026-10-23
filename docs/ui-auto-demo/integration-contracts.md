# Integration Contracts — `ui-auto-demo`

## Web application ↔ Demo Center

- Demo Center là presentation/orchestration surface; không trở thành domain
  service và không sở hữu permission.
- Control đọc session/scope theo existing boundary, hiển thị mode/target/provider
  readiness và gửi lifecycle command qua local/demo control seam.
- Route/page/component hiện có vẫn là owner của data, validation, action và state.

## Demo Center ↔ local demo broker

- Broker chịu trách nhiệm persona alias → session bootstrap trong local/demo mode.
- Broker không trả password/token cho browser; chỉ trả safe session/status/scope
  summary.
- Broker từ chối production target, unknown origin/target, alias ngoài allowlist
  và provider chưa ready.
- Transport (loopback HTTP, WebSocket, IPC hoặc test harness) chưa lock ở B6;
  B7 phải thể hiện provider-aware state, B9/B10 lock boundary triển khai.

## Demo Center ↔ web action runner

- Runner gọi action adapter theo vocabulary locked: navigate, click, fill,
  open-select, choose-option, check, submit, wait-ready, assert-state.
- Adapter chỉ tương tác với rendered component qua accessible/user-level path;
  không set state, mutate DOM hoặc gọi domain API thay submit.
- Mỗi action phát step status/narration/progress; action async phải settle trước
  pacing delay.

## Demo broker/runner ↔ existing web API

- Reuse `/api/auth/session`, `/api/identity/assignments`, domain endpoints,
  worker health, map/provider và evidence APIs theo caller hiện tại.
- Existing authorization/error/masking/idempotency/version/pagination không đổi.
- Live mutation phải đi qua form/action/API đang được component dùng, để audit,
  DomainEvent, OutboxMessage, projection và SLA semantics giữ nguyên.

## Demo Center ↔ native runner

- Bridge chuyển scene/step và safe result; native runner thao tác app đang chạy,
  không tạo web parity surface.
- Native runner dùng `AppNavigator`, `SessionContext`, `States`, `WriteGuard`,
  existing read APIs, deep links và current API base URL config.
- Mobile only-read contract được kiểm tra cả client và server; bridge không có
  quyền nâng capability.

## Runner ↔ infrastructure do operator sở hữu

- Operator tự start PostgreSQL/demo database, Next.js, worker, map/tile provider,
  Metro và emulator/device theo runbook.
- Runner chỉ kiểm tra readiness/identity/target; không start, stop, reset hoặc
  thay đổi process infrastructure.
- Worker/projection delay là dependency riêng; 3 giây pacing không được coi là
  worker readiness.

## Seed/reset/cleanup

- Initial fixture dùng existing demo seed/labels; không tạo fixture ad hoc bằng
  browser nếu không có contract.
- Live mutation cleanup, stable idempotency key, run isolation và reset operator
  flow là B9 data/integration disposition.
- Nút demo không gọi destructive `demo:reset` ngầm. Nếu B9 cần cleanup artifact,
  operator phải xác nhận đúng target trước khi chạy ngoài UI.

## Verification handoff

- B7: provider/UI conformance cho Demo Center, narrator, live/blocked states và
  mobile bridge status.
- B9: survey schema/fixture/audit/outbox/cleanup impact; không tạo data model ở
  B6.
- B10: phase/ticket contracts cho runner, broker, web scenes, mobile scenes,
  negative states, security and verification.