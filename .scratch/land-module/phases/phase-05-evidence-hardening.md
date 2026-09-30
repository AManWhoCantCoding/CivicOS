# Phase 05 — Evidence & hardening

## Phạm vi phase

Triển khai Evidence upload/list cho application/parcel/party qua nested API và storage adapter hiện có, immutable hash/metadata, web integration và regression hardening toàn bộ land flow. Không upload Evidence trên mobile hoặc public.

## Tính năng thuộc phase

- F-07 — Evidence bất biến.
- Cross-cutting hardening cho F-01–F-06.
- UI Evidence panel ở screen-03 và screen-04.

## Ticket list dự kiến

| ID | Ticket | Demo path sau ticket | Tham chiếu design | Phụ thuộc |
|---|---|---|---|---|
| LND-17 | Evidence service/API | Officer/leader có scope upload/list metadata; MIME/size/hash/immutable đúng contract; storageKey không trả ra API. | `api-contract.md#post-apilandapplicationsapplicationidevidence`; `api-contract.md#get-apilandapplicationsapplicationidevidence`; DR-21 | Phase 02, `EvidenceStorageAdapter` hiện có |
| LND-18 | Web Evidence integration | Screen-03 application detail upload/list và screen-04 parcel detail list Evidence với loading/error/limit feedback. | `.scratch/land-module/ui/screen-03.md`; `.scratch/land-module/ui/screen-04.md` | LND-17, LND-13 |
| LND-19 | Land regression/security hardening | Chạy cross-feature assertions cho transaction, audit/event, public redaction, role/scope, concurrency và no-hard-delete. | `edge-cases.md#ec-01-body-json-vượt-giới-hạn`; EC-06, EC-08, EC-20–EC-24; `non-functional.md` | Phase 01–04, LND-17 |

## Thứ tự thực hiện

1. LND-17.
2. LND-18.
3. LND-19.

## Ticket contracts

### LND-17 — Evidence service/API

- **Status:** needs-triage
- **Blocked by:** LND-02, LND-06, LND-08
- **Loại:** feature
- **Lane:** full
- **Gate hướng:** có
- **File được phép sửa:** `src/modules/land/**`, `src/modules/platform/evidence/**`, `src/app/api/land/applications/[applicationId]/evidence/**`, `src/app/api/land/parcels/[parcelId]/evidence/**`, `src/app/api/land/parties/[partyId]/evidence/**`, `tests/land/**`, `tests/platform/**`
- **File cấm sửa:** `.env`, `.brain/**`, `docs/design/**`, `storage/**` generated files
- **Demo path:** Scoped officer/leader upload/list Evidence metadata cho application/parcel/party với hash immutable, không lộ storageKey.
- **Các bước thực hiện:**
  1. Tạo Evidence command/query dùng adapter hiện có.
  2. Parse multipart file/description và enforce MIME/size.
  3. Persist metadata/hash với unique resource/hash cho ba resource type.
  4. Tạo POST/GET nested evidence routes cho application, parcel và party; audit read/write.
  5. Viết storage failure/duplicate/privacy tests.
- **Acceptance Criteria:**
  - [ ] Given PDF/JPEG/PNG ≤ `10 MiB` và actor scoped, When upload, Then `201`, SHA-256/immutable metadata tồn tại và response không có storageKey.
  - [ ] Given unsupported MIME/size vượt ngưỡng, When upload, Then correct `400` code và không có row/file mồ côi.
  - [ ] Given same resource/hash upload lại, When upload, Then không tạo Evidence row/file thứ hai.
- **Test-skeleton:**
  - AC-01: PDF 1 MiB + scoped officer → Evidence id/hash/immutable true, `storageKey` absent.
  - AC-02: text/plain or 10 MiB+1 → expected error code, database/storage count unchanged.
  - AC-03: same bytes/resource twice → one unique row and one storage file.
- **Rubric bắt buộc:** Reuse `EvidenceStorageAdapter`; không tạo `LandAttachment`, không expose physical path.

### LND-18 — Web Evidence integration

- **Status:** needs-triage
- **Blocked by:** LND-13, LND-17
- **Loại:** feature
- **Lane:** full
- **Gate hướng:** có
- **File được phép sửa:** `src/app/land/applications/[applicationId]/**`, `src/app/land/parcels/[parcelId]/**`, `src/components/land/**`, `tests/land-ui/**`
- **File cấm sửa:** `.env`, `.brain/**`, `docs/design/**`, `.scratch/land-module/ui/**`
- **Demo path:** Screen-03 upload/list và screen-04 list Evidence theo scope với feedback giới hạn file.
- **Các bước thực hiện:**
  1. Thêm Evidence upload/list panel vào application detail.
  2. Thêm Evidence metadata list panel vào parcel detail.
  3. Kết nối application/parcel/party nested API; chỉ upload từ screen-03.
  4. Render loading/error/empty/size/MIME feedback.
  5. Viết UI privacy/role tests.
- **Acceptance Criteria:**
  - [ ] Given scoped internal actor, When upload valid Evidence trên screen-03 hoặc gọi nested parcel/party API, Then metadata xuất hiện và storageKey không render.
  - [ ] Given invalid MIME/size, When upload, Then message tiếng Việt hiển thị gần file control và file không được coi là uploaded.
  - [ ] Given public/mobile screen, When resource có Evidence, Then không có Evidence panel/data.
- **Test-skeleton:**
  - AC-01: application/parcel/party API 201 evidence → metadata row renders fileName/mime/size/hash/immutable only.
  - AC-02: API 400 evidence limit → error message + retry/input remains, no success toast.
  - AC-03: public/mobile render fixture → selectors for Evidence/storageKey absent.
- **Rubric bắt buộc:** Bám screen-03/screen-04; không tạo upload trong screen-05/screen-06.

### LND-19 — Land regression/security hardening

- **Status:** needs-triage
- **Blocked by:** LND-01 đến LND-18 theo phase hoàn tất
- **Loại:** feature
- **Lane:** full
- **Gate hướng:** có
- **File được phép sửa:** `tests/land/**`, `tests/integration/**`, `tests/land-ui/**`, `tests/mobile/**`
- **File cấm sửa:** `.env`, `.brain/**`, `docs/design/**`, `prisma/migrations/**` trừ khi có BLOCKED-CONTRACT
- **Demo path:** Toàn bộ land demo pass regression matrix; không có PII/public redaction/concurrency/audit gap.
- **Các bước thực hiện:**
  1. Chạy matrix API/state/idempotency/concurrency.
  2. Chạy authorization/Assignment/OrganizationUnit matrix.
  3. Chạy event/audit/transaction rollback assertions.
  4. Chạy web/mobile/public redaction/state assertions.
  5. Ghi kết quả test và mở blocker nếu contract thiếu.
- **Acceptance Criteria:**
  - [ ] Given full phase implementation, When chạy SOW AC matrix, Then F-01–F-07 assertions pass không skip/pending liên quan.
  - [ ] Given public/mobile read paths, When kiểm tra JSON/UI tree, Then không có PII, polygon, sync payload, approval hoặc Evidence metadata.
  - [ ] Given stale version, duplicate key, invalid transition hoặc transaction side-effect failure, When chạy regression, Then expected conflict/rollback và event/audit integrity pass.
- **Test-skeleton:**
  - AC-01: execute SOW mục 4 by F-01..F-07 → all expected status/code/state assertions pass.
  - AC-02: public/mobile snapshots/contract bodies containing forbidden fields → assertion false for every forbidden field.
  - AC-03: concurrency/idempotency/rollback fixtures → no duplicate rows, no half-committed domain/event/audit state.
- **Rubric bắt buộc:** Không tự sửa design/code ngoài contract; mọi thiếu contract phải báo `BLOCKED-CONTRACT` cho Mentor/Research.

## Tiêu chí hoàn thành

- Given file PDF/JPEG/PNG ≤ `10 MiB` và actor có scope, When upload Evidence, Then HTTP `201`, SHA-256/`immutable=true` được lưu và response không có `storageKey`.
- Given MIME không allowlist hoặc file lớn hơn `10 MiB`, When upload, Then HTTP `400` với code tương ứng và không có Evidence row/file mồ côi.
- Given cùng resource và bytes/hash đã tồn tại, When upload lại, Then không tạo Evidence row/storage file thứ hai.
- Given public client hoặc mobile user gọi Evidence, When request, Then không có bytes, storageKey, hash hoặc metadata Evidence trong response.
- Given toàn bộ phase 01–05 đã triển khai, When chạy regression matrix, Then state machine, idempotency, optimistic concurrency, role/Assignment, event/audit và public redaction đều pass theo `sow.md` mục 4.
- Given Stitch không có rendered screen URL, When UI implementation được review, Then Developer dùng handoff `screen-01.md`–`screen-06.md` và `design-tokens.md`, không coi timeout là bằng chứng visual đạt.

## Phụ thuộc giữa phase

- Phụ thuộc trước: Phase 01–04; `EvidenceStorageAdapter` và full design lock.
- Đây là phase hardening cuối trước khi Mentor nhận triển khai theo ticket; không mở rộng ngoài SOW.
