# Phase 02 — Intake & review

## Phạm vi phase

Xây dựng `LandChangeApplication` aggregate, create/list/detail/review, bốn change type, validation, idempotency, optimistic concurrency, timeline và web workspace/form. Phase này hoàn thiện F-02 và phần timeline/Assignment của F-06; chưa chạy national mock hoặc approval.

## Tính năng thuộc phase

- F-02 — tiếp nhận và thẩm tra hồ sơ biến động.
- F-06 — application scope, review Assignment và timeline read.

## Ticket list dự kiến

| ID | Ticket | Demo path sau ticket | Tham chiếu design | Phụ thuộc |
|---|---|---|---|---|
| LND-06 | Application aggregate create/list/detail | Officer tạo application `submitted`, list/detail trả đúng contract. | `api-contract.md#post-apilandapplications`; `api-contract.md#get-apilandapplicationsapplicationid`; DR-06–DR-08 | Phase 01 |
| LND-07 | Change-type validation và idempotency | Transfer/information update/mortgage/split-merge invalid cases bị chặn; cùng key+cùng payload không tạo duplicate. | `domain-rules.md#dr-07-idempotency-khi-tạo-application`; DR-12–DR-15; EC-03–EC-06 | LND-06 |
| LND-08 | Review transition và timeline | Officer có Assignment chuyển `submitted → in_review`; timeline đọc event theo `occurredAt`. | `api-contract.md#post-apilandapplicationsapplicationidreview`; `api-contract.md#get-apilandapplicationsapplicationidtimeline`; DR-08, DR-10, DR-19 | LND-04, LND-06 |
| LND-09 | Web screen-01 queue và screen-02 create | Officer lọc queue, tạo hồ sơ; submit success chuyển tới detail; role/scope states đúng. | `.scratch/land-module/ui/screen-01.md`; `.scratch/land-module/ui/screen-02.md`; `design-tokens.md` | LND-06, LND-07, LND-08 |

## Thứ tự thực hiện

1. LND-06.
2. LND-07.
3. LND-08.
4. LND-09.

## Ticket contracts

### LND-06 — Application aggregate create/list/detail

- **Status:** needs-triage
- **Blocked by:** LND-01, LND-02, LND-04
- **Loại:** feature
- **Lane:** full
- **Gate hướng:** có
- **File được phép sửa:** `src/modules/land/**`, `src/app/api/land/applications/route.ts`, `src/app/api/land/applications/[applicationId]/route.ts`, `tests/land/**`
- **File cấm sửa:** `.env`, `.brain/**`, `docs/design/**`, `prisma/migrations/**`
- **Demo path:** Officer tạo/list/detail application `submitted` với links party/parcel.
- **Các bước thực hiện:**
  1. Tạo application command/query service và response mapper.
  2. Validate session/OrganizationUnit và required links.
  3. Tạo GET list với filter/cursor và GET detail.
  4. Tạo POST application với `Idempotency-Key` boundary.
  5. Ghi event/audit trong transaction và viết tests.
- **Acceptance Criteria:**
  - [ ] Given application payload hợp lệ, When POST create, Then HTTP `201`, status `submitted`, version `1` và links đúng.
  - [ ] Given query filter/cursor hợp lệ, When GET list, Then response có `items`/`nextCursor` đúng contract.
  - [ ] Given application ngoài scope, When GET detail, Then `403 LAND_FORBIDDEN` hoặc `LAND_ASSIGNMENT_REQUIRED` không lộ detail.
- **Test-skeleton:**
  - AC-01: transfer payload + links + idempotency header → application `submitted`, event/audit tồn tại.
  - AC-02: status/changeType/limit/cursor query → items đúng filter, nextCursor nullable.
  - AC-03: other OU application → HTTP 403, no `changePayload` in response.
- **Rubric bắt buộc:** Fields/envelopes khớp `api-contract.md`; createdBy/organization lấy session, không nhận tùy ý từ client.

### LND-07 — Change-type validation và idempotency

- **Status:** needs-triage
- **Blocked by:** LND-06
- **Loại:** feature
- **Lane:** full
- **Gate hướng:** có
- **File được phép sửa:** `src/modules/land/**`, `src/modules/land/schemas/**`, `tests/land/**`
- **File cấm sửa:** `.env`, `.brain/**`, `docs/design/**`, `prisma/schema.prisma`
- **Demo path:** Bốn change type hợp lệ được tiếp nhận; payload/links sai bị từ chối trước review.
- **Các bước thực hiện:**
  1. Tạo schema cho bốn `changeType` và payload shape.
  2. Validate party/parcel role links theo loại.
  3. Enforce share/mortgage/split-merge rules.
  4. Persist payload fingerprint cho idempotency.
  5. Viết red/green tests cho EC-03–EC-06 và DR-12–DR-15.
- **Acceptance Criteria:**
  - [ ] Given transfer thiếu holder/subject hoặc share tổng khác `100.00`, When create/review, Then `400 LAND_INVALID_REQUEST` và không transition.
  - [ ] Given same `Idempotency-Key` với cùng payload, When retry, Then cùng application id và không thêm row.
  - [ ] Given same key với payload khác, When retry, Then `409 LAND_IDEMPOTENCY_CONFLICT` và application cũ không đổi.
- **Test-skeleton:**
  - AC-01: mỗi change type với payload tối thiểu hợp lệ → validation pass; thiếu relation → expected error code.
  - AC-02: key `key-001` + payload A gửi hai lần → one row, same id.
  - AC-03: key `key-001` + payload B → HTTP 409, version/status unchanged.
- **Rubric bắt buộc:** Không mở rộng change type/payload ngoài `data-model.md:141-148`; error message dùng bảng API contract.

### LND-08 — Review transition và timeline

- **Status:** needs-triage
- **Blocked by:** LND-04, LND-06
- **Loại:** feature
- **Lane:** full
- **Gate hướng:** có
- **File được phép sửa:** `src/modules/land/**`, `src/app/api/land/applications/[applicationId]/review/**`, `src/app/api/land/applications/[applicationId]/timeline/**`, `tests/land/**`
- **File cấm sửa:** `.env`, `.brain/**`, `docs/design/**`, `docs/research/**`
- **Demo path:** Officer được phân công chuyển application `submitted → in_review` và đọc timeline.
- **Các bước thực hiện:**
  1. Implement transition guard/version check.
  2. Enforce active `land_review` Assignment.
  3. Append EventRecord/AuditEvent trong transaction.
  4. Expose review/timeline routes theo contract.
  5. Viết transition/concurrency/privacy tests.
- **Acceptance Criteria:**
  - [ ] Given submitted application + active Assignment + current version, When POST review, Then status `in_review`, version tăng một.
  - [ ] Given stale version hoặc invalid status, When POST review, Then `409 LAND_VERSION_CONFLICT` hoặc `LAND_INVALID_TRANSITION`, no new event.
  - [ ] Given scoped actor gọi timeline, When GET timeline, Then events sorted by `occurredAt` và no ciphertext.
- **Test-skeleton:**
  - AC-01: application v1 + assigned officer + If-Match 1 → v2/in_review, event/audit count +1.
  - AC-02: If-Match 0 or status rejected → expected 409, status/version unchanged.
  - AC-03: timeline with two events → ascending occurredAt, actor/payload fields match safe projection.
- **Rubric bắt buộc:** Optimistic concurrency và audit/event phải cùng transaction; không cho officer bypass Assignment.

### LND-09 — Web screen-01 queue và screen-02 create

- **Status:** needs-triage
- **Blocked by:** LND-06, LND-07, LND-08
- **Loại:** feature
- **Lane:** full
- **Gate hướng:** có
- **File được phép sửa:** `src/app/land/**`, `src/components/land/**`, `src/components/navigation/feature-registry.ts`, `tests/land-ui/**`
- **File cấm sửa:** `.env`, `.brain/**`, `docs/design/**`, `.scratch/land-module/ui/**`
- **Demo path:** Officer mở queue, lọc application, tạo hồ sơ và được chuyển tới detail.
- **Các bước thực hiện:**
  1. Dựng screen-01 queue/filter/pagination.
  2. Dựng screen-02 dynamic four change type form.
  3. Kết nối create/list/detail API và idempotency feedback.
  4. Implement loading/error/empty/forbidden/offline/conflict states.
  5. Viết UI contract/accessibility tests.
- **Acceptance Criteria:**
  - [ ] Given officer có scope, When mở `/land`, Then queue/filter và CTA create hiển thị đúng scope.
  - [ ] Given form hợp lệ, When submit screen-02, Then API 201 và navigation tới detail status `submitted`.
  - [ ] Given invalid payload/offline/conflict, When submit, Then message tiếng Việt hiển thị tại control và input không mất.
- **Test-skeleton:**
  - AC-01: session officer + queue response → rows/status chip/CTA render; leader không thấy CTA create.
  - AC-02: form transfer valid + API 201 → navigate detail with applicationCode/status.
  - AC-03: API `LAND_IDEMPOTENCY_CONFLICT`/offline → error state, retry and input values remain.
- **Rubric bắt buộc:** Bám screen-01/02 handoff và design tokens; không tạo UI control approve/sync trong form create.

## Tiêu chí hoàn thành

- Given `Idempotency-Key` và application payload hợp lệ, When create hai lần cùng payload, Then database có một application và hai response cùng `application.id`.
- Given cùng key nhưng payload khác, When create lần hai, Then HTTP `409 LAND_IDEMPOTENCY_CONFLICT` và application đầu tiên không đổi.
- Given transfer thiếu current holder/proposed holder/subject hoặc share không bằng `100.00`, When create/review, Then request bị từ chối với code đúng và không transition.
- Given application `submitted` và officer có Assignment `land_review`, When review với version hiện tại, Then status `in_review`, version tăng một và event/audit được ghi cùng transaction.
- Given actor không có scope, When mở queue/detail/create, Then UI hiển thị forbidden state và không render dữ liệu application.
- Given officer submit screen-02 thành công, When API trả `201`, Then UI chuyển tới screen-03 với status `submitted` và không mất context lỗi retry.

## Phụ thuộc giữa phase

- Phụ thuộc trước: Phase 01 hoàn tất party/parcel/identity/Assignment.
- Mở khóa cho: Phase 03 dùng application state `in_review` và timeline; Phase 04 dùng application projection/public data.
- API không thêm route ngoài `api-contract.md` đã full lock.
