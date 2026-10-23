# API Contract B6 — CivicOS E1 Business Parity

**Trạng thái:** B6 design draft; không chốt schema hay implementation route mới.  
**Authority:** server/API và domain command; mobile chỉ là client surface khác.

## 1. Quy ước chung

### Request context

- Authenticated session là bắt buộc cho internal E1 routes.
- `X-Client-Source: mobile-ios|mobile-android|mobile` chỉ phục vụ telemetry/
  conformance; không phải quyền truy cập.
- Server lấy actor, role, OrganizationUnit và Assignment từ session/database;
  client không được gửi role để tự cấp quyền.
- `view=mobile` nếu được dùng chỉ là projection allowlist; không làm yếu masking.

### Mutation envelope

Các command mobile online và offline dùng cùng semantics:

```json
{
  "command": "<allowlisted-command>",
  "resourceType": "<aggregate>",
  "resourceId": "<id>",
  "clientCommandId": "<stable-client-id>",
  "idempotencyKey": "<optional-or-required-by-route>",
  "baseVersion": 7,
  "occurredAt": "2026-10-13T08:30:00.000Z",
  "payload": {}
}
```

- `clientCommandId`/`idempotencyKey` phải ổn định qua retry.
- `baseVersion` bắt buộc với aggregate có optimistic concurrency.
- Server chuẩn hóa `occurredAt`, không tin timestamp để bypass SLA.
- Error 401/403/404/409/422/503 giữ response convention hiện hành; mobile map
  thành state nhưng không tự đổi business state.

## 2. E1-004 — Residents

| Method | Path/logical operation | Actor | Target contract |
|---|---|---|---|
| GET | `/api/residents?assignedTo=me&overdue=true&view=mobile` | Assigned officer/commander | Chỉ Subject/Record visible theo OU + active Assignment; list masked, có SLA/due/risk badge được phép. |
| GET | `/api/residents/[subjectId]?view=mobile` | Assigned officer/commander | Detail chỉ trả visible records; sensitive profile chỉ khi server cho phép; sensitive read có AuditEvent. |
| GET | `/api/residents/[subjectId]/management-records/[recordId]` | Assigned officer | Record + activity timeline + SLA; không lộ field ngoài projection. |
| POST | `/api/residents/.../[recordId]/activities` | Assigned field/village officer | `activityType`, `occurredAt`, `content`, `evaluation`, `latitude/longitude`, `evidenceIds`, `assignmentId`, idempotency; checkup cập nhật cadence/SLA. |
| PATCH | `/api/residents/.../[recordId]` | Commander/duty/office theo policy | Status/risk/nextCheckAt với `baseVersion`; high-risk escalation server-side. |
| POST | `/api/residents` và `/management-records` | Commander/duty/office | Tạo Subject/Record và Assignment; online-only; không nhận sensitive data tùy tiện từ mobile local buffer. |
| GET/POST | `/api/residents/reports/monthly` | Commander/office | Generate/list theo organization + period; snapshot semantics giữ nguyên. |
| POST | `/api/residents/reports/[reportId]/approve`, `/send` | Commander | Online-only; approve freeze snapshot/hash; send chỉ sau approve, notification không phải auth. |

### Activity command

- `content` không rỗng; nếu có GPS phải có cả latitude và longitude hợp lệ.
- `assignmentId` phải active, thuộc resource/actor/OU; server không tin assignment
  từ payload nếu không khớp.
- Retry cùng idempotency trả activity đầu tiên; không cập nhật `nextCheckAt` lần
  hai.
- Mobile offline chỉ được queue `resident.record_activity` với local buffer policy
  đã duyệt; không queue `resident.update_risk`, record creation hay report send.

## 3. E1-005 — Intake/Incident

| Method | Path/logical operation | Actor | Target contract |
|---|---|---|---|
| GET | `/api/intake-reports?assignedTo=me&view=mobile` | Duty/commander/allowed officer | List masked, status/channel/SLA/location allowlist; không plaintext identity. |
| POST | `/api/intake-reports` | Duty/office officer | `content`, canonical `sourceChannel` (`direct|phone|app|district_transfer`), optional protected identity/contact/location, idempotency; status `RECEIVED`; không tạo Incident. |
| GET | `/api/intake-reports/[reportId]?view=mobile` | Allowed actor | Masked detail, events/SLA/Evidence/audit projection theo policy; sensitive reveal riêng và audit. |
| POST | `/api/intake-reports/[reportId]/commands` | Duty/commander | `verify`, `process`, `close`, `reject`, `transfer` theo version/state; transfer online-only. |
| POST | `/api/incidents` | Allowed commander/duty actor | Chỉ convert IntakeReport đủ điều kiện; 1:1; phát event/notification. |
| GET | `/api/incidents` và `/api/incidents/[incidentId]` | Allowed officer | Incident summary/timeline/location/SLA allowlist; mobile không nhận raw protected intake identity. |
| POST | `/api/incidents/[incidentId]/commands` | Assigned/commander actor | Dispatch/status/field context theo Incident contract; server kiểm tra Assignment. |

### Intake source-channel decision

`app` là source channel hợp lệ của IntakeReport. Mobile nội bộ được phép nhập một
report do người trực tiếp nhận từ nguồn app nếu actor có capability; tranche này
không tạo public citizen app, public auth hoặc public intake route.

### Mobile E1-005 mutation rule

Mọi `POST`/state mutation của E1-005 online-only ở B6: create intake, verify,
classify/process, convert, transfer, close/reject và field update. Nếu offline,
client chỉ giữ draft không gửi sensitive payload; không giả lập đã nhận hoặc đã
chuyển tin.

## 4. E1-007 — Establishment/Inspection

| Method | Path/logical operation | Actor | Target contract |
|---|---|---|---|
| GET | `/api/establishments?assignedTo=me&view=mobile` | Field/office/commander | Establishment allowlist, type/risk/status/location; scope theo OU/Assignment. |
| GET | `/api/inspections?assignedTo=me&due=true&view=mobile` | Field/office/commander | Schedule, cadence, templateVersion, status, SLA, assigned actor; pagination. |
| GET | `/api/inspections/[inspectionId]?view=mobile` | Assigned field/commander | Checklist version, responses, findings, Evidence projection, recommendation status. |
| POST | `/api/inspections/[inspectionId]/commands` | Assigned field/commander | `start`, `save_checklist`, `finding`, `complete`, recommendation actions; version/Assignment enforced. |
| POST | `/api/evidence` | Assigned field actor | Evidence upload only with resource allowlist, MIME/size/hash/GPS provenance; no storageKey in client projection. |
| GET | `/api/evidence?resourceType=Inspection&resourceId=...` | Allowed actor | Immutable Evidence metadata allowlist; masking and resource scope. |

### Inspection offline allowlist

| Command | Offline at B6 | Rule |
|---|---|---|
| `inspection.start` | Có | Queue với baseVersion; server rechecks schedule/Assignment. |
| `inspection.save_checklist` | Có | Draft/resume; templateVersion không đổi; stale không overwrite. |
| `inspection.finding` | Có, có điều kiện | Finding có thể queue; Evidence ref phải hợp lệ hoặc item giữ `pending_evidence`; không được coi là completed. |
| `inspection.complete` | Không | Chỉ online sau required checklist + Evidence/GPS đã server-confirm. |
| Recommendation approve/return/transfer | Không | Commander authority và legal workflow online-only. |

## 5. Shared sync contract

`GET/POST /api/sync` tiếp tục là server seam cho offline commands. B6 yêu cầu:

- Allowlist chỉ gồm command ở bảng trên và `resident.record_activity`.
- Mỗi item có `clientCommandId`, `resourceType`, `resourceId`, `occurredAt`,
  `payloadVersion`, `baseVersion`, `status`.
- Trạng thái: `pending → syncing → synced`; lỗi có thể `failed` để retry hoặc
  `rejected` khi forbidden/invalid/stale/unsupported.
- 409/stale không tự merge nội dung; client phải tải bản mới, hiển thị conflict
  và yêu cầu người dùng quyết định.
- Server phải ghi Event/Audit chỉ một lần sau khi command commit; retry không tạo
  duplicate event/evidence/notification.
- Offline queue không được chứa plaintext sensitive reveal, approval, transfer,
  close/reject IntakeReport hoặc raw auth token.

## 6. Response/state mapping

| HTTP/domain outcome | Mobile state | Hành vi bắt buộc |
|---|---|---|
| 200/201 | `ready`/`success` | Render server result; không tự optimistic commit vượt response. |
| 401 | `session-expired` | Xóa session theo auth contract, không retry vô hạn. |
| 403 | `forbidden` | Không suy ra resource tồn tại; không hiển thị masked data nếu server không trả. |
| 404 | `empty`/`not-found` | Deep link stale phải có copy rõ, không fallback sang Vehicle/RelatedInfo. |
| 409 | `conflict`/`rejected` | Refresh resource, giữ draft local nếu policy cho phép, không tự overwrite. |
| 422 | `validation-error` | Giữ form/draft, chỉ báo field/domain error được allowlist. |
| 503/network | `offline`/`retryable` | Queue chỉ khi command thuộc allowlist; GET hiển thị stale marker nếu có cache. |

## 7. Không thuộc API contract này

- Public citizen intake app/API.
- Continuous GPS tracking PS-E3-003.
- EP-E3 roster, armory, attendance, training, DQTV, fleet, event protection.
- Land business API mới ngoài `docs/land-module/**`.
- Bất kỳ Vehicle endpoint, alias, fallback hoặc compatibility route nào.
