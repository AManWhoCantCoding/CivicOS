# API/CLI Contract — demo-seed-restart

## Production API

Không thêm endpoint mới cho DS-09. Change contract cho phép mở rộng có kiểm soát
response của các endpoint hiện có; các endpoint khác giữ nguyên shape và
permission semantics:

- `/api/auth/session`
- `/api/residents/**`
- `/api/incidents/**`
- `/api/inspections/**`
- `/api/vehicles/**`
- `/api/related-info/**`
- `/api/forces/**`
- `/api/map/**`
- `/api/land/**`
- `/api/public/land/lookup`
- `/api/evidence/**`
- `/api/notifications`

## CLI contract mới

### `demo:rebuild`

Input:

- `DEMO_DATABASE_URL` hoặc `DATABASE_URL` có database name chính xác
  `civicos_demo`;
- confirmation explicit cho destructive reset;
- `DEMO_NOW` là ISO-8601 có timezone;
- optional output mode JSON.

Behavior:

1. Validate target/clock trước khi import Prisma hoặc mutate.
2. Migrate/reset đúng target.
3. Chạy các seed phase theo dependency order.
4. Drain worker/outbox đến idle.
5. Chạy verifier.
6. Exit non-zero nếu có lỗi, orphan, unexpected row, pending hoặc dead-letter.

### `demo:verify`

- Read-only; không reset/seed/mutate.
- Target hiện tại phải là `civicos_demo`.
- Báo counts theo domain, stable keys, status coverage, permission/read checks,
  derived health và evidence file ownership.
- Pass chỉ khi `errors=[]`, `orphanRows=[]`, `unexpectedRows=[]` và queue không
  còn pending/processing/dead-letter.

## Existing API read contract cần kiểm

| Surface         | Expected evidence                                                                             |
| --------------- | --------------------------------------------------------------------------------------------- |
| Residents       | list có Subject và record; detail có masked/sensitive boundary; reports có nhiều status       |
| Intake/Incident | list/detail có nhiều lifecycle state; assignment/approval không orphan                        |
| Inspection      | list/stats có scheduled/in-progress/completed; finding/recommendation đọc được                |
| Vehicle         | registry/observations có match/escalation; notifications/SLA resolve đúng resource            |
| Mobile          | related-info có `RESIDENT`, `BUSINESS`, `HOTSPOT`, `VIOLATION`; forces có alarm/dispatch/task |
| Map             | provider/config/layers và marker/parcel projection có geometry/coordinates hợp lệ             |
| Land            | internal parcel/party/application/evidence/timeline; public lookup trả `simulated: true`      |
| Permission      | assigned actor đọc được; unassigned/cross-OU actor nhận đúng `403` hoặc empty theo contract   |

### DS-09 — VehicleObservation mobile read projection

- `GET /api/forces/alarms` phải có thể trả alarm có
  `resourceType=VehicleObservation`, `resourceId`, `createdAt`, `status` và
  coordinates nếu observation có tọa độ; không trả `Notification.body` hoặc
  sensitive vehicle description.
- `GET /api/vehicles/observations/:observationId?view=mobile` reuse endpoint
  vehicle hiện có nhưng trả mobile-safe projection gồm `id`, full `plate`,
  `status`, `observedAt`, `latitude`, `longitude`.
- Mobile view yêu cầu authenticated actor có active `mobile_read` Assignment
  trên đúng `VehicleObservation` và cùng OU; query không tự cấp quyền.
- Mobile view không trả `verifications`, `permissions`, `matchedRegistryId`,
  owner lookup, notes, evidence content hoặc mutation affordance.
- Request không có `view=mobile` giữ raw web response hiện tại; không đổi
  behavior của web vehicle detail.
- Unauthenticated/forbidden/not-found/error giữ envelope/status semantics hiện
  có (`401`/`403`/`404`/`400`); forbidden không làm lộ existence.
