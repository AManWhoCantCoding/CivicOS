# API contract: civicos-e1-clone-mvp

> **Nguồn sự thật:** 44 route files trong `src/app/api/**/route.ts` (Next.js App Router, file-based).
> Tổng: 39 GET, 22 POST, 5 PATCH, 3 DELETE. Route được liệt kê theo đường dẫn thực tế đã triển khai;
> phần **[GAP]** là hành vi cần điều chỉnh theo spec (không phải route mới).

## Bảng endpoint (theo module)

### Auth & health
| Method | Path | Auth | Tính năng | Ghi chú |
|---|---|---|---|---|
| GET | /api/auth/session | any | nền tảng | trả user hiện tại từ session |
| GET | /api/health/worker | any | nền tảng | health worker (bắt buộc healthy trước khi coi integration pass) |

### Identity
| Method | Path | Auth | Tính năng | Ghi chú |
|---|---|---|---|---|
| GET/POST | /api/identity/users | cán bộ văn phòng | nền tảng | |
| GET/POST | /api/identity/organization-units | cán bộ văn phòng | nền tảng | cấu hình đơn vị, không hard-code tên |
| GET/POST | /api/identity/assignments | Trưởng CA/cán bộ | E1-004 bước 3 | phân công cán bộ phụ trách |

### Tố giác (PS-E1-005)
| Method | Path | Auth | Tính năng | Ghi chú |
|---|---|---|---|---|
| GET/POST | /api/intake-reports | cán bộ trực ban (web) | E1-005 bước 1 | [GAP] bắt buộc sourceChannel; KHÔNG tự tạo Incident khi POST |
| GET | /api/intake-reports/[reportId] | cán bộ trực ban | E1-005 | danh tính trả masked theo role |
| POST | /api/intake-reports/[reportId]/commands | cán bộ trực ban | E1-005 bước 3–7 | lệnh verify/process/close/reject/transfer (semantics source) |
| GET/POST | /api/incidents | cán bộ | E1-005 bước 6 | [GAP] POST = convert từ IntakeReport (event detected→open), phát notification "incident created" |
| GET/PATCH/DELETE | /api/incidents/[incidentId] | cán bộ | E1-005 | PATCH kèm version (optimistic) |
| POST | /api/incidents/[incidentId]/commands | cán bộ | E1-005 | lệnh phân loại/giao/xử lý |

### Cư dân đặc biệt (PS-E1-004)
| Method | Path | Auth | Tính năng | Ghi chú |
|---|---|---|---|---|
| GET/POST | /api/residents | cán bộ văn phòng | E1-004 bước 2 | Subject + SubjectManagementRecord |
| GET/PATCH/DELETE | /api/residents/[subjectId] | cán bộ phụ trách | E1-004 | dữ liệu nhạy cảm masked theo role |
| GET/POST | /api/residents/[subjectId]/management-records | cán bộ phụ trách | E1-004 bước 2 | purpose/riskLevel/nextCheckAt |
| GET/PATCH | /api/residents/[subjectId]/management-records/[recordId] | cán bộ phụ trách | E1-004 | version check |
| GET/POST | /api/residents/[subjectId]/management-records/[recordId]/activities | cán bộ phụ trách | E1-004 bước 4 | ghi hoạt động tháng, idempotencyKey |
| GET/POST | /api/residents/reports/monthly | cán bộ văn phòng | E1-004 bước 6 | tổng hợp theo period |
| POST | /api/residents/reports/[reportId]/approve | Trưởng CA | E1-004 bước 6 | đóng băng snapshot + hash |
| POST | /api/residents/reports/[reportId]/send | Trưởng CA | E1-004 bước 6 | gửi CA huyện qua notification adapter |

### Cơ sở kinh doanh có điều kiện (PS-E1-007)
| Method | Path | Auth | Tính năng | Ghi chú |
|---|---|---|---|---|
| GET/POST | /api/establishments | cán bộ văn phòng | E1-007 bước 1 | |
| GET/PATCH/DELETE | /api/establishments/[establishmentId] | cán bộ văn phòng | E1-007 | |
| GET/POST | /api/inspections | cán bộ văn phòng | E1-007 bước 2–4 | lịch định kỳ 6 tháng + đột xuất |
| GET | /api/inspections/[inspectionId] | cán bộ | E1-007 | |
| POST | /api/inspections/[inspectionId]/commands | cán bộ | E1-007 bước 4–6 | start/record-result/finding/recommendation |
| GET | /api/inspections/stats | lãnh đạo | E1-007 bước 8 | tỷ lệ đạt/nhắc nhở/vi phạm theo loại hình |

### Bản đồ, evidence, notification, mobile read-only
| Method | Path | Auth | Tính năng | Ghi chú |
|---|---|---|---|---|
| GET | /api/map/config, /api/map/health, /api/map/layers, /api/map/markers | any | nền tảng | MapLibre, tile tự host, attribution OSM |
| GET/POST | /api/evidence | cán bộ | dùng chung | lưu storageKey + originalHash + GPS |
| GET | /api/notifications | user | dùng chung | |
| GET | /api/related-info/[entityType]/[id] | mobile | mobile read-only | chỉ đọc |
| GET | /api/related-info/counts, /api/related-info/search | mobile | mobile read-only | chỉ đọc |
| GET | /api/forces/alarms, /api/forces/dispatches..., /api/forces/tasks... | mobile | mobile read-only | surfaces từ source |
| GET | /api/sync | mobile | mobile read-only | đồng bộ offline |
| GET/POST/PATCH | /api/vehicles/observations, /api/vehicles/registry | cán bộ | E1-009 nền | ngoài tranche chính |

## Chi tiết endpoint trọng yếu

### POST /api/intake-reports
- Auth: cán bộ trực ban (role trực ban, web-only trong MVP).
- Request:
```json
{
  "content": "string (nội dung tin báo, bắt buộc)",
  "sourceChannel": "direct | phone | app | district_transfer",
  "sourceName": "string | null (danh tính — lưu vùng bảo vệ)",
  "sourceContact": "string | null",
  "latitude": "number | null",
  "longitude": "number | null",
  "idempotencyKey": "string (bắt buộc khi retry)"
}
```
- Response 201: `{ "id": "...", "status": "RECEIVED" }` — **KHÔNG tạo Incident** ([GAP] sửa behavior hiện tại).
- Mã lỗi:
| Status | Ý nghĩa | Điều kiện |
|---|---|---|
| 400 | Thiếu sourceChannel / content rỗng | validation |
| 401 | Chưa đăng nhập | session hết hạn |
| 403 | Role không phải trực ban | web-only |
| 409 | Trùng idempotencyKey | gọi lại — trả kết quả lần đầu |

### POST /api/intake-reports/[reportId]/commands
- Body: `{ "command": "verify | process | close | reject | transfer", "payload": {...}, "version": number }`
- `verify` → status VERIFIED + verificationNote/Result; `process` → PROCESSED + processedNote;
  `close`/`reject` → CLOSED/REJECTED; `transfer` → transferToId = OrganizationUnit cấp huyện.
- Lỗi 409 khi version lệch (optimistic concurrency).

### POST /api/incidents (convert)
- Semantics giữ từ source: xác nhận event `detected → open`, tạo/ghép case, phát notification "incident created".
- Chỉ nhận `intakeReportId` đã ở trạng thái đủ cơ sở điều tra; tạo Incident 1-1 (incidentId unique).

### POST /api/residents/.../activities
- Body: `{ "activityType", "content", "evaluation?", "evidenceIds?", "assignmentId?", "idempotencyKey?" }`
- Tác dụng phụ: cập nhật `nextCheckAt` của record; biến động/nguy cơ → DomainEvent + notification CA huyện.

### POST /api/residents/reports/[reportId]/send
- Chỉ khi status=approved; đóng băng `snapshotPayload` + `snapshotHash` (bất biến); gửi qua notification adapter tới `sendTargetId`.

## Quy ước chung toàn API
- Lỗi: `NextResponse.json({ error: '...' }, { status })`, một số module trả thêm `code`.
- Mutation dùng optimistic concurrency qua cột `version` — request phải kèm version, lệch → 409.
- Idempotency: mọi POST lặp được phải dùng key unique tương ứng trong schema.
- Pagination: list endpoint dùng limit/offset qua query params (đối chiếu từng route khi làm ticket).
- Danh tính nhạy cảm: response mặc định trả mã masked; chỉ role Trưởng CA được xem dữ liệu thật qua field riêng.
