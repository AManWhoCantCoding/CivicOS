# Non-functional Requirements — `ui-auto-demo`

## Accessibility and presenter control

- Demo Center, narrator, current step, progress, pause/resume, stop, replay,
  blocked/error and cleanup status có accessible name/role rõ ràng.
- Narrator dùng live region nhưng không đọc liên tục raw response; focus chuyển
  theo action thật và luôn restore được sau pause/stop/dialog.
- Control tối thiểu `44px`, keyboard path và visible focus giữ theo shared web
  baseline; native mobile giữ target/accessibility hiện có.
- Reduced-motion chỉ giảm visual animation; không bỏ text explanation, action
  order, readiness hoặc 3-second readability contract nếu user chưa chốt khác.

## Timing and determinism

- Delay mặc định là `3000ms` giữa hai action đã settle; dùng monotonic/testable
  clock seam, không tạo timer rời rạc không thể cancel.
- Readiness wait theo observable route/control/state; timeout có mã blocked/failed
  và copy an toàn.
- Pause/stop/replay phải deterministic: không nhân đôi timer, không chạy callback
  cũ, không tiếp tục step sau stop.
- Manifest version, scene order và persona sequence phải được ghi trong safe
  evidence để replay đối chiếu.

## Security and privacy

- Chỉ enable live mode khi demo flag và exact `civicos_demo` target hợp lệ.
- Credential provider local/demo giữ password/token ngoài client bundle, manifest,
  log, narrator, screenshot và run report.
- Không dùng production account, PII thật, raw payload, cookie copy, role claim
  spoofing hoặc API/DOM bypass.
- Giữ role, Assignment, OrganizationUnit, masking, audit và server authorization;
  AccessDenied/empty không được biến thành success để demo đẹp hơn.
- Local bridge nếu có phải bind theo local/demo boundary, reject production
  origin/target và không trở thành public control plane.

## Resilience and safety

- Missing DB/API/worker/map/device/bridge/persona provider chuyển sang blocked
  state có prerequisite và lựa chọn stop/replay.
- Không tự restart/kill infrastructure; operator vẫn sở hữu lifecycle.
- Stop không rollback mutation đã commit; UI phải nêu cleanup pending rõ ràng.
- Retry chỉ được dùng cho read/readiness hoặc mutation có idempotency contract;
  không retry mù create/approve/reject/close.
- Một run không được chạy đồng thời trên cùng demo fixture nếu manifest không có
  isolation/lock policy.

## Compatibility and integration

- Không đổi route/API/data payload/state machine/permission của domain hiện có.
- Web hiện tại và mobile native hiện tại vẫn chạy độc lập khi demo mode tắt.
- Mobile vẫn read-only, giữ `WriteGuard`, deep link, offline/no-offline-polygon,
  masking và simulated wording.
- Browser back/forward, refresh, session expiry và direct URL vẫn theo behavior
  hiện tại ngoài runner-owned surfaces.

## Performance and observability

- Runner không fetch một endpoint mới cho mỗi module chỉ để dựng catalog; manifest
  có thể static/versioned và reuse existing session/assignment reads.
- Không thêm telemetry mặc định. Run evidence local chỉ chứa safe metadata:
  run/scene/step id, state, duration, status và reason code.
- UI không bị khóa bởi 3-second timer khi user stop/pause; active control phản hồi
  trong một event loop turn hợp lý.

## Verification targets

- Web: component/runner lifecycle, action ordering, native select semantics,
  route/access, live mutation guard, persona switch, timing, narrator và a11y.
- Native: login/session, bridge handoff, read-only/write guard, deep link,
  offline/masked/provider states, typecheck/test/build.
- Cross-surface: device/worker readiness, partial failure, replay/cleanup,
  session expiry và no-secret evidence review.