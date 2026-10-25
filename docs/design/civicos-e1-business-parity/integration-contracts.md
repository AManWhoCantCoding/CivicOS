# Hợp đồng tích hợp B6 — CivicOS E1 Business Parity

**Nguyên tắc:** các tích hợp ngoài domain dùng adapter hiện có hoặc mock trong
tranche demo. Không dùng code/UI của `news-map-main` hay `force-app-main` làm
runtime target.

## 1. Identity, session, RBAC và Assignment

- **Cách gọi:** Tái sử dụng session/auth adapter, policy evaluation,
  OrganizationUnit và Assignment hiện có; mobile không có identity service riêng.
- **Request/response:** Server lấy actor/role/OU từ session. Capability response
  có thể trả action allowlist, nhưng client gửi role/OU/Assignment trong payload
  không được dùng để tự cấp quyền.
- **Lỗi:** thiếu session → `401`; role/capability/OU/Assignment sai → `403`;
  resource không thuộc scope có thể trả not-found theo masking policy.
- **Retry/timeout:** Không retry `401/403`; retry mạng chỉ áp dụng command có
  idempotency và còn valid version.
- **Fallback:** Không cấp quyền tạm khi authorization service/policy lookup lỗi.
- **Secret:** Không ghi session token/secret vào log, offline queue hoặc docs.
- **Nguồn:** `CONTEXT.md`, `docs/design/civicos-e1-clone-mvp/domain-rules.md`,
  `src/modules/identity/**`, `mobile-capability-matrix.md`.

## 2. Domain command, EventRecord, AuditEvent và Outbox

- **Cách gọi:** Web và mobile gọi cùng command semantics; route/API adapter chỉ
  chuyển đổi transport envelope.
- **Request/response:** Command mang `clientCommandId`, optional
  `idempotencyKey`, `baseVersion`, `occurredAt` và payload allowlist. Commit trả
  resource projection, version và command result.
- **Lỗi:** domain validation, transition, version hoặc transaction failure không
  được để lại business mutation nửa chừng.
- **Retry/timeout:** Client retry cùng key; worker outbox retry side effect có
  giới hạn và correlation ID.
- **Fallback:** Event/Audit không ghi được → rollback/fail command; notification
  fail sau commit → outbox retry, không rollback business state.
- **Secret:** Event/audit payload phải mask protected identity và không chứa token
  hoặc storage path.
- **Nguồn:** `src/modules/eventing/**`, `src/modules/platform/**`, DR-P-02/03.

## 3. SLA, projection và notification

- **Cách gọi:** DomainEvent/Outbox phát tới worker hiện hành để cập nhật projection,
  SLA và notification; không tạo worker mobile riêng.
- **Request/response:** Worker nhận event có aggregate type/id/version, actor
  snapshot tối thiểu và correlation ID; notification adapter nhận template + safe
  summary, không nhận plaintext protected identity.
- **Lỗi:** projection/notification failure được retry theo outbox; SLA overdue
  phải là state/event có thể truy vết, không chỉ là màu UI.
- **Retry/timeout:** Retry có giới hạn, dead-letter/health signal; không gửi cùng
  notification nhiều lần cho một event thành công.
- **Fallback:** Notification thất bại không rollback record đã commit; delivery
  state hiển thị retryable/failed.
- **Secret:** FCM/SMS credentials nếu có chỉ nằm trong environment adapter.
- **Nguồn:** `docs/design/civicos-e1-clone-mvp/integration-contracts.md`,
  `src/modules/platform/notifications/**`, `src/worker.ts`.

## 4. Offline local queue và `/api/sync`

- **Cách gọi:** Mobile adapter lưu encrypted queue cục bộ; khi online gọi sync
  seam hiện hành với batch bounded.
- **Allowlist:** `resident.record_activity`, `inspection.start`,
  `inspection.save_checklist`, `inspection.finding`. E1-005 mutation, risk,
  sensitive reveal, complete, transfer/close/reject, report send và approval
  không được queue.
- **Request:** Mỗi item có clientCommandId, resource, baseVersion,
  templateVersion nếu có, occurredAt, payload version và trạng thái local.
- **Lỗi:** `401` session-expired; `403` revoked/forbidden; `409` conflict;
  `422` validation; unsupported command → rejected. Không tự merge conflict.
- **Retry/timeout:** Retry network/5xx với backoff giới hạn và idempotency; không
  retry 4xx bị từ chối. Batch có thể tiếp tục item độc lập sau item lỗi.
- **Fallback:** Không có encrypted storage hoặc queue integrity không kiểm tra
  được → giữ draft an toàn hoặc block save; không dùng AsyncStorage plaintext cho
  protected data.
- **Secret:** Không lưu raw auth token, protected reveal, storageKey hoặc secret.
- **Nguồn:** `src/components/field/offline-queue.ts`, `src/app/api/sync/route.ts`,
  API contract B6 §5, DR-P-50/51.

## 5. Evidence, camera và location

- **Cách gọi:** Tái sử dụng EvidenceStorageAdapter/camera/location adapter; mobile
  capture theo action, không dùng continuous GPS service của EP-E3.
- **Request/response:** Evidence request gắn resource type/id, bytes hoặc upload
  handle, MIME/size, hash, actor/time và GPS provenance nếu policy yêu cầu. Client
  chỉ nhận safe metadata, không nhận storageKey.
- **Lỗi:** MIME/size/hash/GPS/resource scope invalid → validation/rejected; storage
  failure rollback metadata hoặc để trạng thái pending theo contract, không tạo
  orphan.
- **Retry/timeout:** Upload retry cùng resource/hash/client key là idempotent;
  không retry mù khi hash không xác định.
- **Fallback:** Camera/location unavailable → state rõ và cho phép save draft nếu
  business policy cho phép; không tự sinh Evidence giả.
- **Secret:** Storage credential, signed URL nội bộ và raw bytes không vào log.
- **Nguồn:** `src/modules/platform/evidence/**`, `src/app/api/evidence/route.ts`,
  `docs/design/civicos-e1-clone-mvp/integration-contracts.md`.

## 6. Map, tile và geometry

- **Cách gọi:** Web/mobile dùng map provider abstraction và tile self-host hiện
  hành; E1 location chỉ là projection/Evidence, không tạo public polygon.
- **Request/response:** Map config/tiles không nhận protected identity; focused
  parcel/field location trả geometry/coordinate theo scope và precision policy.
- **Lỗi:** Tile/provider unavailable → provider-error/geometry-unavailable; không
  làm fail command đã có dữ liệu hợp lệ và không coi tile load là authorization.
- **Retry/timeout:** Client retry tile theo provider; backend command không phụ
  thuộc tile server.
- **Fallback:** Basemap cache/offline có thể hiển thị stale; action location
  thiếu GPS vẫn bị prerequisite policy chặn.
- **Secret:** Không yêu cầu secret provider trong demo nếu dùng self-hosted tile.
- **Nguồn:** `docs/design/civicos-e1-clone-mvp/integration-contracts.md`,
  `docs/design/land-parcel-map/**`.

## 7. Public Land boundary

- **Cách gọi:** Public Land lookup chỉ qua contract `land-module`; không gọi E1
  API, sync queue, Evidence hoặc identity projection.
- **Response:** Chỉ public allowlist Land, `simulated=true`, không PII/polygon/
  storageKey/timeline. Mobile Land giữ contract riêng.
- **Lỗi/retry:** Land-specific error/rate-limit giữ nguyên mã `LAND_*`; không
  fallback sang E1 resource hoặc Vehicle.
- **Nguồn:** `docs/design/land-module/api-contract.md`,
  `docs/design/land-parcel-map/api-contract.md`.

## 8. Google Stitch và UI provider ở B7

- Stitch chỉ là provider tạo artifact thiết kế ở B7, không phải runtime dependency.
- Input provider là design contract đã chốt; artifact phải map được F-01..F-06,
  mobile capability matrix và state/error paths.
- Artifact có action trái API/Assignment/masking/offline contract bị đánh dấu
  `UI_REPAIR_REQUIRED`; không nới business contract để hợp thức hóa provider.

## 9. Structural-removal handoff

- PS-E1-009 removal là package riêng bàn giao `repo-architect` sau B9/B10; không
  dùng compatibility alias, migration shortcut hoặc fallback Vehicle trong các
  adapter trên.
- Zero-reference verification phải kiểm tra source, route, event, projection,
  sync allowlist, mobile, seed, test, docs và migration history theo M2.
- Nếu retained worker/replay/caller cần chỉnh để không còn Vehicle, handoff phải
  ghi dependency order và rollback evidence; B6 không sửa production source.
