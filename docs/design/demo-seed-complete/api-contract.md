# API contract: demo-seed-complete

## Phạm vi contract

- Nguồn: Đã có (đọc từ `spec.md:3-7`, `spec.md:152-158`). Feature không thêm HTTP route, không thêm public API và không thêm màn hình; dùng CLI demo cùng route/API hiện có để xác minh.
- Nguồn: Đã có (đọc từ `src/app/api/**/route.ts` và `src/modules/mobile-readonly/contracts.ts:3-119`). Các HTTP endpoint dưới đây là contract hiện có được dùng để đọc dữ liệu canonical, không được đổi path/shape/error.
- Nguồn: Mới (xác nhận với người dùng ngày 2026-09-29). CLI `demo:rebuild` và `demo:verify` là contract mới của feature; response JSON được định nghĩa đầy đủ bên dưới. Wiring npm script thuộc ticket `08`; clock/preflight hook được cung cấp bởi ticket `00b`.

## CLI contract mới và hiện có

| Method | Path/command | Input | Output thành công | Error | Nguồn |
|---|---|---|---|---|---|
| CLI | `npm run demo:reset` | Env `DEMO_DATABASE_URL` hoặc `DATABASE_URL`; `DEMO_RESET_CONFIRM=1` hoặc `--confirm`. Target database name phải là `civicos_demo`. | Exit `0`; stdout có target đã sanitize, confirmation, JSON count `before`, JSON count `after`, số Evidence file demo đã xử lý. | `DEMO_DATABASE_URL_REQUIRED`; `DEMO_RESET_REFUSED`; `DEMO_RESET_CONFIRM_REQUIRED`; exit non-zero trước mutation. | Đã có (`scripts/demo/reset.ts:49-120`) |
| CLI | `npm run demo:seed` | Env target hợp lệ; `DEMO_NOW` bắt buộc trong demo flow; identity đã seed hoặc command identity được gọi trước. | Exit `0`; report runtime gồm phase, manifest key → database ID, counts/domain summary; không tạo table mới. | `DEMO_NOW_INVALID`; command/domain error; exit non-zero nếu derived flow lỗi. | Đã có entry point (`scripts/demo/seed.ts:13-203`); clock-aware hook thuộc `00b`, output/report là Mới (ticket `02-07`) |
| CLI | `npm run demo:rebuild` | `DEMO_DATABASE_URL` trỏ `civicos_demo`, `DEMO_RESET_CONFIRM=1`, `DEMO_NOW=2026-09-28T08:00:00.000Z`; option `--json` tùy chọn. | Exit `0`; phase theo thứ tự `validate`, `reset`, `migrate`, `identity`, `residents`, `intake-incidents`, `inspections`, `vehicles`, `mobile-read`, `drain`, `verify`; option `--json` trả `DemoVerifyReport`. | `DEMO_RESET_REFUSED`, `DEMO_RESET_CONFIRM_REQUIRED`, `DEMO_NOW_INVALID`, `DEMO_REBUILD_FAILED`; không trả `0` nếu verify có lỗi. | Mới (xác nhận trong `issues/08-demo-rebuild-readiness.md:23-32`); npm wiring **chỉ thuộc ticket `08`**, clock/preflight hook do `00b` cung cấp |
| CLI | `npm run demo:verify -- --json` | Target hiện tại phải là `civicos_demo`; không mutate. | JSON đúng `DemoVerifyReport` bên dưới; `errors=[]`, `unexpectedRows=[]`, `orphanRows=[]` khi pass. | Exit non-zero nếu target sai, schema thiếu, count/key/status/derived/file invariant sai. | Mới (xác nhận trong `issues/08-demo-rebuild-readiness.md:25-31`); npm wiring **chỉ thuộc ticket `08`** |

## Ranh giới integration hook

| Hook/seam | Input | Output/behavior | Owner | Ticket sử dụng end-to-end |
|---|---|---|---|---|
| `resolveDemoClock(env)` và clock context trong `scripts/demo/seed.ts` | `DEMO_NOW` ISO 8601 có timezone; env target đã được kiểm tra | Clock scoped hoặc lỗi `DEMO_NOW_INVALID` trước dynamic Prisma import/mutation; `now` được truyền explicit vào demo-reachable command/worker path | `00b` | `08` gọi lại trong `demo:rebuild` |
| Seed/orchestrator hook dưới `scripts/demo/**` | `DemoEnv` + clock context của run | Chạy seed qua domain command, không tự tạo npm script; không dùng shared mutable clock | `00b` cung cấp, `08` điều phối | `08` wiring `package.json` và phase order |
| `npm run demo:rebuild` / `npm run demo:verify -- --json` | package script, target/confirmation/clock theo bảng CLI | CLI machine-readable, drain và verify fail-closed | `08` | `08` AC-08-01/07/09 |

## JSON response của `demo:verify`

```json
{
  "feature": "demo-seed-complete",
  "targetDatabase": "civicos_demo",
  "demoNow": "2026-09-28T08:00:00.000Z",
  "counts": {
    "OrganizationUnit": 2,
    "Role": 8,
    "User": 11,
    "UserRole": 11,
    "Session": 0,
    "Subject": 3,
    "SubjectManagementRecord": 3,
    "SubjectManagementActivity": 3,
    "ResidentMonthlyReport": 3,
    "IntakeReport": 6,
    "Incident": 6,
    "Establishment": 5,
    "ChecklistTemplate": 5,
    "Inspection": 8,
    "InspectionFinding": 4,
    "EnforcementRecommendation": 4,
    "SuspiciousVehicleEntry": 3,
    "VehicleObservation": 5,
    "VehicleVerification": 1,
    "Evidence": 6
  },
  "manifest": {
    "subjectKeys": ["seed-subject-tam-tru", "seed-subject-nuoc-ngoai", "seed-subject-tai-hoa-nhap"],
    "intakeKeys": ["demo-intake-received", "demo-intake-verified", "demo-intake-processed", "demo-intake-closed", "demo-intake-rejected", "demo-intake-transfer"],
    "incidentKeys": ["demo-incident-received", "demo-incident-classified", "demo-incident-verifying", "demo-incident-resolved", "demo-incident-closed", "demo-incident-transferred"],
    "establishmentNames": ["[DEMO] Quan karaoke Sao Dem", "[DEMO] Bar Ben Song", "[DEMO] Cam Do Nghia Tru", "[DEMO] Game Center Nghia Tru", "[DEMO] Nha nghi Pho Dong"],
    "vehicleObservationKeys": ["demo-vehicle-observation-01", "demo-vehicle-observation-02", "demo-vehicle-observation-03", "demo-vehicle-observation-04", "demo-vehicle-observation-05"],
    "inspectionRecurrenceKeys": ["demo-recurrence-cam-do", "demo-recurrence-game", "demo-recurrence-nha-nghi"]
  },
  "derived": {
    "outbox": {"pending": 0, "processing": 0, "deadLetter": 0},
    "projection": {"unresolved": 0},
    "sla": {"orphan": 0},
    "notification": {"orphan": 0, "plaintextSensitive": 0},
    "evidence": {"missingFiles": 0, "foreignNamespaceFiles": 0}
  },
  "unexpectedRows": [],
  "orphanRows": [],
  "errors": []
}
```

- Nguồn: Mới (manifest/canonical counts từ `spec.md:53-127`, đã cập nhật Inspection=8 theo code wins ngày 2026-09-29). `counts` là bản đồ tên model → số nguyên; mọi key xuất hiện phải có giá trị số nguyên không âm.
- Nguồn: Mới (xác nhận ngày 2026-09-29). `manifest` chỉ chứa stable key/name; database ID generated không nằm trong normalized comparison.
- Nguồn: Mới (ticket `08`). `derived` có các nhóm bắt buộc; mỗi field là số nguyên không âm; `unexpectedRows`, `orphanRows`, `errors` là mảng chuỗi; verifier pass chỉ khi cả ba mảng rỗng và các derived count bằng zero.

## HTTP endpoints hiện có dùng để xác minh

### Authentication

| Method | Path | Request | Response 200 | Response lỗi | Nguồn |
|---|---|---|---|---|---|
| GET | `/api/auth/session` | Không body. Cookie session tùy chọn. | JSON `{ "user": IdentityUser hoặc null }`; `IdentityUser` có `id: string`, `email: string`, `name: string`, `roles: string[]`, `organizationUnitId: string hoặc undefined`. | Route hiện không tự đổi status cho GET; body vẫn có `user:null` khi chưa đăng nhập. | Đã có (`src/app/api/auth/session/route.ts:12-14`, `src/modules/identity/contracts.ts`) |
| POST | `/api/auth/session` | JSON `{ "email": string tùy chọn, "password": string tùy chọn }`. | HTTP 200 `{ "user": IdentityUser }` và HttpOnly cookie; identity seed dùng password `civicos-dev`. | HTTP 401 `{ "error": "INVALID_CREDENTIALS" }`. | Đã có (`src/app/api/auth/session/route.ts:16-32`, `spec.md:39-50`) |
| DELETE | `/api/auth/session` | Không body. | HTTP 200 `{ "ok": true }`. | Không có error mapping riêng trong route. | Đã có (`src/app/api/auth/session/route.ts:35-38`) |

### Related-info

| Method | Path | Request | Response JSON đầy đủ | Mã lỗi | Nguồn |
|---|---|---|---|---|---|
| GET | `/api/related-info/counts` | Query `q`, `entityType`, `status`, `type`, `category`, `riskLevel`, `tag`, `dateFrom`, `dateTo`, geo filters, `page`, `pageSize`; mọi field optional. | HTTP 200 `{ "ALL": number, "RESIDENT": number, "BUSINESS": number, "HOTSPOT": number, "VIOLATION": number }`. | 401 `{error:"UNAUTHENTICATED"}`; 400 `{error:"INVALID_ENTITY_TYPE"}`; 403 `{error:"FORBIDDEN"}`; unknown error 500 `{error: code}`. | Đã có (`src/app/api/related-info/counts/route.ts:10-24`, `contracts.ts:30-58`, `http.ts:3-15`) |
| GET | `/api/related-info/search` | Query như counts; default `page=1`, `pageSize=20`, max `100`. | HTTP 200 `{ "data": RelatedInfoItem[], "total": number, "page": number, "pageSize": number }`; item `{entityType:"RESIDENT"|"BUSINESS"|"HOTSPOT"|"VIOLATION", id:string, title:string, status:string, address?:string, lat?:number, lng?:number, geometry?:unknown, updatedAt:string ISO, masked:boolean, metadata?:{result:string, checklistKey:string, evidenceIds:string[]}}`. | 401/400/403/500 cùng mapping mobile. | Đã có (`src/app/api/related-info/search/route.ts:10-24`, `contracts.ts:12-56`, `related-info.ts:403-425`) |
| GET | `/api/related-info/:entityType/:id` | Path `entityType` chuyển uppercase; `id` database ID từ manifest report. | HTTP 200 `{ "entityType": string, "data": RelatedInfoItem }`. | 401 `UNAUTHENTICATED`; 400 `INVALID_ENTITY_TYPE`; 403 `FORBIDDEN`; 500 code khác. | Đã có (`src/app/api/related-info/[entityType]/[id]/route.ts:7-21`, `related-info.ts:445-463`) |

### Forces read-only

| Method | Path | Request | Response JSON đầy đủ | Mã lỗi | Nguồn |
|---|---|---|---|---|---|
| GET | `/api/forces/alarms` | Không query. | HTTP 200 `{ "alarms": AlarmReadItem[] }`; item `{id:string,title:string,status:string,createdAt:string ISO,incidentId?:string,resourceId?:string,coordinates?:{lat:number,lng:number},relatedInfo?:{entityType:string,id:string},assignmentSummary?:{assignmentId:string,task:string,status:string}}`; không có body notification. | 401 `UNAUTHENTICATED`; 403 `FORBIDDEN`; 500 code khác. | Đã có (`src/app/api/forces/alarms/route.ts:7-16`, `contracts.ts:77-87`, `forces.ts:283-327`) |
| GET | `/api/forces/dispatches` | Query `page`, `pageSize`, `q`, `status`, `incidentId`; optional. | HTTP 200 `{ "data": DispatchReadItem[], "total": number, "page": number, "pageSize": number }`; item có shape AlarmReadItem và `assignmentSummary`. | 401/403/500 mapping mobile. | Đã có (`src/app/api/forces/dispatches/route.ts:7-24`, `forces.ts:329-357`, `contracts.ts:89-99`) |
| GET | `/api/forces/dispatches/:dispatchId` | Path dispatch ID dạng `dispatch:assignmentId` hoặc assignment ID. | HTTP 200 một `DispatchReadItem`. | 401 `UNAUTHENTICATED`; 403 `FORBIDDEN`; 500 code khác. | Đã có (`src/app/api/forces/dispatches/[dispatchId]/route.ts:7-20`, `forces.ts:344-357`) |
| GET | `/api/forces/tasks` | Query `page`, `pageSize`, `status`, `dispatchId`, `incidentId`; optional. | HTTP 200 `{ "data": TaskReadItem[], "total": number, "page": number, "pageSize": number }`; TaskReadItem là AlarmReadItem cộng `dispatchId?:string`, với `id=task:assignmentId`. | 401/403/500 mapping mobile. | Đã có (`src/app/api/forces/tasks/route.ts:7-24`, `forces.ts:359-369`, `contracts.ts:89-99`) |
| GET | `/api/forces/tasks/:taskId` | Path task ID dạng `task:assignmentId` hoặc assignment ID. | HTTP 200 một `TaskReadItem`. | 401 `UNAUTHENTICATED`; 403 `FORBIDDEN`; 500 code khác. | Đã có (`src/app/api/forces/tasks/[taskId]/route.ts:7-20`, `forces.ts:372-384`) |
| GET | `/api/forces/tasksbydispatchid` | Query bắt buộc `dispatchId`; dạng `dispatch:assignmentId` hoặc assignment ID. | HTTP 200 `{ "data": TaskReadItem[], "total": number, "page": number, "pageSize": number }`, chỉ row thuộc parent assignment. | 401 `{error:"UNAUTHENTICATED"}`; 400 `{error:"INVALID_DISPATCH_ID"}`; 403/500 mapping mobile. | Đã có (`src/app/api/forces/tasksbydispatchid/route.ts:7-19`, `forces.ts:386-405`) |

### Web verification endpoints hiện có

| Method | Path | Request/response canonical | Error | Nguồn |
|---|---|---|---|---|
| GET | `/api/residents` | Query optional `subjectType`, `overdue`; response `{ "subjects": ResidentEntry[] }`, item `{id:string,displayName:string,subjectType:string,status:string,records:RecordEntry[]}`, record `{id:string,purpose:string,status:string,riskLevel:string,nextCheckAt:string hoặc null,assignedOrganizationId:string hoặc null,sla:"overdue"|"due_soon"|"on_time"|"unknown"}`. | 401 `UNAUTHENTICATED`; domain `{error:string,code:string}` với 403/404/400 theo `toApiError`. | Đã có (`src/app/api/residents/route.ts:6-24`, `src/modules/residents/projection.ts:129-171`) |
| GET | `/api/incidents` | Query optional `status`, `category`; response `{ "incidents": Incident[] }`, item `{id:string,status:string,category:string|null,severity:string|null,description:string,updatedAt:string}`. | 401 `UNAUTHENTICATED`; 403 `FORBIDDEN`; 500 domain error. | Đã có (`src/app/api/incidents/route.ts:23-34`, `src/components/incidents/IncidentTable.tsx:8-67`) |
| GET | `/api/inspections` | Query `state=due|overdue` hoặc `stats`; response list `{ "inspections": InspectionView[] }` hoặc stats `{ "stats": InspectionStats }`. | 401 `UNAUTHENTICATED`; domain `{error:string,code:string}`. | Đã có (`src/app/api/inspections/route.ts:13-41`) |
| GET | `/api/vehicles/registry` | Không query; response `{ "registry": RegistryEntry[] }`. | 401 `UNAUTHENTICATED`; command errors `{error:string}`. | Đã có (`src/app/api/vehicles/registry/route.ts:10-15`) |
| GET | `/api/vehicles/observations` | Không query; response `{ "observations": ObservationView[] }`. | 401 `UNAUTHENTICATED`; command errors `{error:string}`. | Đã có (`src/app/api/vehicles/observations/route.ts:6-11`) |

- Nguồn: Mới (xác nhận ngày 2026-09-29). Các endpoint web POST/PATCH và mobile write không nằm trong feature contract; seed gọi domain command trực tiếp, không gọi HTTP để tránh session/transport side effect.
