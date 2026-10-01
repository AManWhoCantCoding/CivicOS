# LND-17 — Evidence service/API

- **Ticket ID:** LND-17
- **Status:** needs-triage
- **V6 effective status:** done
- **V3 status:** needs-triage
- **Blocked by:** LND-02, LND-06, LND-08
- **Loại:** feature
- **Lane:** full
- **Gate hướng:** có
- **File được phép sửa:** `src/modules/land/**`, `src/modules/platform/evidence/**`, `src/app/api/land/applications/[applicationId]/evidence/**`, `src/app/api/land/parcels/[parcelId]/evidence/**`, `src/app/api/land/parties/[partyId]/evidence/**`, `tests/land/**`, `tests/platform/**`
- **File cấm sửa:** `.env`, `.brain/**`, `docs/design/**`, `storage/**` generated files
- **Demo path:** Scoped officer/leader upload/list Evidence metadata cho application/parcel/party với hash immutable, không lộ storageKey.
- **Evidence/commit:** `19cc0cc` (`feat: add evidence upload and metadata APIs`); focused LND-17 tests, land/platform regression, typecheck, scoped ESLint và Prettier passed.

## Mô tả

Implement Evidence command/query và nested internal API qua `EvidenceStorageAdapter`, enforce MIME/size/hash/immutable/privacy policy.

## Các bước thực hiện

- [x] Tạo Evidence command/query dùng adapter hiện có.
- [x] Parse multipart file/description và enforce MIME/size.
- [x] Persist metadata/hash với unique resource/hash cho ba resource type.
- [x] Tạo POST/GET nested evidence routes cho application, parcel và party; audit read/write.
- [x] Viết storage failure/duplicate/privacy tests.

## Acceptance Criteria

- [x] Given PDF/JPEG/PNG ≤ `10 MiB` và actor scoped, When upload, Then `201`, SHA-256/immutable metadata tồn tại và response không có storageKey.
- [x] Given unsupported MIME/size vượt ngưỡng, When upload, Then correct `400` code và không có row/file mồ côi.
- [x] Given same resource/hash upload lại, When upload, Then không tạo Evidence row/file thứ hai.

## Test-skeleton

- AC-01: PDF 1 MiB + scoped officer → Evidence id/hash/immutable true, `storageKey` absent.
- AC-02: text/plain or 10 MiB+1 → expected error code, database/storage count unchanged.
- AC-03: same bytes/resource twice → one unique row and one storage file.

## Rubric bắt buộc

- [x] Reuse `EvidenceStorageAdapter`; không tạo `LandAttachment`, không expose physical path.

## Traceability

- Design: `api-contract.md#post-apilandapplicationsapplicationidevidence`, `api-contract.md#get-apilandapplicationsapplicationidevidence`, DR-21.
- Dependency: existing `EvidenceStorageAdapter`, Phase 02/03 outputs.

## V6 reconciliation

- Effective status `done` after `19cc0cc`; `tests/land/lnd17-evidence.test.ts` covers the three resource types, authorization, allowlist/size, duplicate and audit/cleanup behavior; `tests/land/lnd17-evidence-api.test.ts` covers all six nested route methods and redacted errors; `tests/platform/evidence-duplicate-cleanup.test.ts` covers the unique-conflict cleanup path.
