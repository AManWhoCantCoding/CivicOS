# API Contract — `ui-auto-demo`

## Trạng thái

`DRAFT_REVIEW_REQUIRED` — B6 design contract. Đây là contract cho orchestration,
không phải permission để tạo domain API mới. B9 phải review data/fixture impact
trước khi lock.

## Contract principles

1. Existing domain API path/method/payload/error/status/version/idempotency và
   authorization được giữ nguyên.
2. Web live mutation chỉ phát sinh từ component/action thật; runner không có
   “admin mutate” endpoint để thay thế domain flow.
3. Native mobile chỉ dùng existing read API và deep-link; không thêm write API.
4. Demo broker/bridge là local/demo integration, chỉ enable khi explicit demo mode
   và exact target `civicos_demo`; không phải public production API.

## Logical Demo Control contract

Transport có thể là local loopback/IPC do B7/B10 chốt; payload vocabulary dưới
đây là locked semantic contract, không khóa implementation library.

### `preflight`

Input:

```json
{
  "manifestVersion": "string",
  "surfaces": ["web", "mobile"],
  "mode": "LIVE_DEMO"
}
```

Output:

```json
{
  "state": "ready | blocked",
  "target": "civicos_demo | unknown | forbidden",
  "web": "ready | unavailable",
  "mobile": "ready | unavailable",
  "worker": "ready | unavailable | unknown",
  "personaProvider": "ready | unavailable",
  "reasons": ["safe Vietnamese explanation"]
}
```

Runner không được start nếu `target !== civicos_demo`, persona provider không
ready, hoặc manifest không hợp lệ. `mobile`, `worker` và `map` có thể làm riêng
scene `blocked` theo policy, nhưng không được giả báo success.

### `run`

Input chỉ gồm `manifestVersion`, `sceneIds`, `mode=LIVE_DEMO`, `requestedBy`
(session-scoped user id, không phải credential) và `surfaces`. Output gồm opaque
`runId`, normalized scene order, current state và safe target label. Không nhận
password, token, raw API payload hoặc arbitrary JavaScript.

### `step-event`

```json
{
  "runId": "opaque",
  "sceneId": "string",
  "stepId": "string",
  "action": "navigate | click | fill | open-select | choose-option | check | submit | wait-ready | assert-state | native-tap | pause",
  "status": "started | settled | blocked | failed | cancelled",
  "explanation": "Vietnamese safe copy",
  "durationMs": 0,
  "blockedReason": "optional safe code"
}
```

`choose-option` chỉ hợp lệ sau `open-select`/focus step trên cùng control. Event
không được chứa input value nhạy cảm, response body, password, token, raw
geometry hoặc masked value trước khi policy cho phép.

### `lifecycle`

Commands: `pause`, `resume`, `stop`, `replay`. Mỗi command có `runId`, expected
current state và idempotent command key. Command không được làm mất action order;
`stop` cancel timer và ngăn action mới, nhưng không rollback mutation đã commit.

## Persona broker contract

- Input: persona alias được allowlist trong manifest, run id và target guard.
- Output: `authenticated | rejected | blocked`, safe display name/role label,
  session expiry và scope summary đã masking.
- Password/token chỉ tồn tại trong provider local/demo; không trả về browser,
  manifest, bridge event hoặc log.
- Switch persona phải gọi logout/expire session cũ rồi establish session mới qua
  auth boundary; client reload session và Assignment/OrganizationUnit reads.
- Production target, unknown alias, missing provider hoặc scope mismatch trả
  `blocked`, không fallback account.

## Existing web contracts reused

| Capability | Existing contract | Demo rule |
|---|---|---|
| Login/session | `/api/auth/session` | Broker phải kết thúc ở auth/session semantics hiện có; không đổi response/error. |
| Assignment/scope | `/api/identity/assignments` | Reload sau persona switch; không tự cấp task. |
| Domain mutation | Existing `/api/**` callers/components | Chỉ gọi bằng component action; giữ validation/auth/audit/event/outbox. |
| Worker evidence | `/api/health/worker` và existing projections | Readiness check only; không coi health là permission grant. |
| Map/provider | Existing map APIs/provider adapters | Provider failure thành blocked/safe state; không bịa geometry. |

## Native mobile contract

- Bridge chỉ chuyển scene/step commands và safe result state tới native runner.
- Native runner dùng existing `mobile/src/api/**`, `AppNavigator`, deep links,
  `States`, `OfflineBanner`, `MaskedValue` và `WriteGuard`.
- Allowed methods: session login/logout, GET/read, search/filter, tap/detail,
  map/deep-link. Any domain `POST/PUT/PATCH/DELETE` trả blocked.
- API base URL/device configuration là runtime input do operator cung cấp; UI demo
  không tự inject host/network secret ngoài config contract hiện có.

## Compatibility / forbidden API changes

- Không thêm `/api/demo-admin`, `/api/reset`, `/api/persona-switch` public hoặc
  endpoint aggregate để bypass existing authorization.
- Nếu bridge cần local transport, endpoint phải bind local/demo-only, có target
  guard và không được deploy production; exact design phải được B7/B9/B10 lock.
- Không đổi existing domain payload, error, pagination, masking, idempotency hoặc
  mobile read-only boundary.