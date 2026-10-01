# Phase 05 — Evidence & hardening

- **Workflow version:** V6
- **Effective status:** done
- **V3 source:** `phase-05-evidence-hardening.md` (migrated; ticket contracts split below)
- **Current frontier:** complete; LND-17–LND-19 accepted
- **Gate:** `PHASE-PASS`
- **Blocked by:** none; existing `EvidenceStorageAdapter` is available.

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

## SOW và phụ thuộc phase

- SOW mapping: F-07 và regression hardening trong `.scratch/land-module/sow.md` mục 3–5.
- Phụ thuộc trước: Phase 01–04; `EvidenceStorageAdapter` và full design lock.
- Đây là phase hardening cuối trước khi Mentor nhận triển khai theo ticket; không mở rộng ngoài SOW.

## Phase DoD

- PDF/JPEG/PNG ≤10 MiB upload tạo immutable SHA-256 metadata, không trả `storageKey`.
- MIME/size invalid không tạo row/file mồ côi; duplicate resource/hash không tạo bản ghi thứ hai.
- Public/mobile không nhận bytes, storageKey, hash hoặc Evidence metadata.
- Regression matrix pass state machine, idempotency, concurrency, role/Assignment, event/audit và redaction.
- UI dùng textual handoff khi Stitch không có rendered URL; không coi timeout là visual pass.

## Tiêu chí hoàn thành

- Given file PDF/JPEG/PNG ≤ `10 MiB` và actor có scope, When upload Evidence, Then HTTP `201`, SHA-256/`immutable=true` được lưu và response không có `storageKey`.
- Given MIME không allowlist hoặc file lớn hơn `10 MiB`, When upload, Then HTTP `400` với code tương ứng và không có Evidence row/file mồ côi.
- Given cùng resource và bytes/hash đã tồn tại, When upload lại, Then không tạo Evidence row/storage file thứ hai.
- Given public client hoặc mobile user gọi Evidence, When request, Then không có bytes, storageKey, hash hoặc metadata Evidence trong response.
- Given toàn bộ phase 01–05 đã triển khai, When chạy regression matrix, Then state machine, idempotency, optimistic concurrency, role/Assignment, event/audit và public redaction đều pass theo `sow.md` mục 4.
- Given Stitch không có rendered screen URL, When UI implementation được review, Then Developer dùng handoff `screen-01.md`–`screen-06.md` và `design-tokens.md`, không coi timeout là bằng chứng visual đạt.

## Ticket index

| ID | File V6 | Effective status | V3 status | Blocked by |
|---|---|---|---|---|
| LND-17 | `T-LND-17-evidence-service-api.md` | done | needs-triage | LND-02, LND-06, LND-08 |
| LND-18 | `T-LND-18-web-evidence-integration.md` | done | needs-triage | LND-13, LND-17 |
| LND-19 | `T-LND-19-land-regression-security-hardening.md` | done | needs-triage | none |

## Phụ thuộc giữa phase

- Phụ thuộc trước: Phase 01–04; `EvidenceStorageAdapter` và full design lock.
- Đây là phase hardening cuối trước khi Mentor nhận triển khai theo ticket; không mở rộng ngoài SOW.

## V6 reconciliation

- LND-17 được accept sau `19cc0cc`; nested upload/list API, authorization/scope, MIME/size, hash/immutable projection, duplicate cleanup và audit được kiểm thử.
- LND-18 được accept sau `8ba8e0a`; screen-03 upload/list, screen-04 metadata list, privacy projection và MIME/size/error states được kiểm thử.
- LND-19 đã hoàn tất ticket-level review/verification sau `1cde325`.
- Phase 05 gate: `PHASE-PASS`; full Vitest serial `94 files passed`, `730 passed`, `5 skipped`; land/integration/land-ui matrix `25 files passed`, `321 passed`, `5 skipped`; E2E `91 passed`, `1 skipped`; typecheck, lint (0 errors), format, Prisma generate/migrate, production build và mobile typecheck/Jest `11 suites/26 tests`/Android build đều pass.
