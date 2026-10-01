# LND-18 — Web Evidence integration

- **Ticket ID:** LND-18
- **Status:** needs-triage
- **V6 effective status:** blocked
- **V3 status:** needs-triage
- **Blocked by:** LND-13, LND-17
- **Loại:** feature
- **Lane:** full
- **Gate hướng:** có
- **File được phép sửa:** `src/app/land/applications/[applicationId]/**`, `src/app/land/parcels/[parcelId]/**`, `src/components/land/**`, `tests/land-ui/**`
- **File cấm sửa:** `.env`, `.brain/**`, `docs/design/**`, `.scratch/land-module/ui/**`
- **Demo path:** Screen-03 upload/list và screen-04 list Evidence theo scope với feedback giới hạn file.
- **Evidence/commit:** chưa có.

## Mô tả

Tích hợp Evidence panel vào application detail và parcel detail theo screen-03/04, giữ role/privacy/limit state.

## Các bước thực hiện

- [ ] Thêm Evidence upload/list panel vào application detail.
- [ ] Thêm Evidence metadata list panel vào parcel detail.
- [ ] Kết nối application/parcel/party nested API; chỉ upload từ screen-03.
- [ ] Render loading/error/empty/size/MIME feedback.
- [ ] Viết UI privacy/role tests.

## Acceptance Criteria

- [ ] Given scoped internal actor, When upload valid Evidence trên screen-03 hoặc gọi nested parcel/party API, Then metadata xuất hiện và storageKey không render.
- [ ] Given invalid MIME/size, When upload, Then message tiếng Việt hiển thị gần file control và file không được coi là uploaded.
- [ ] Given public/mobile screen, When resource có Evidence, Then không có Evidence panel/data.

## Test-skeleton

- AC-01: application/parcel/party API 201 evidence → metadata row renders fileName/mime/size/hash/immutable only.
- AC-02: API 400 evidence limit → error message + retry/input remains, no success toast.
- AC-03: public/mobile render fixture → selectors for Evidence/storageKey absent.

## Rubric bắt buộc

- [ ] Bám screen-03/screen-04; không tạo upload trong screen-05/screen-06.

## Traceability

- Design: `.scratch/land-module/ui/screen-03.md`, `.scratch/land-module/ui/screen-04.md`.
- Dependencies: LND-13 and LND-17.

## V6 reconciliation

- Effective status `blocked`; no implementation/evidence/commit exists.
