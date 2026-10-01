# LND-16 — Mobile screen-06 read-only

- **Ticket ID:** LND-16
- **Status:** needs-triage
- **V6 effective status:** done
- **V3 status:** needs-triage
- **Blocked by:** LND-08, LND-14
- **Loại:** feature
- **Lane:** full
- **Gate hướng:** có
- **File được phép sửa:** `mobile/src/features/land/**`, `mobile/src/navigation/AppNavigator.tsx`, `mobile/src/api/**`, `mobile/src/features/**/__tests__/**`
- **File cấm sửa:** `.env`, `.brain/**`, `docs/design/**`, `src/**`, `.scratch/land-module/ui/**`
- **Demo path:** Mobile đọc lookup/application/parcel summary/timeline; không có bất kỳ write action nào.
- **Evidence/commit:** `af2132e` (`feat: add mobile land read-only flow`); focused/full mobile tests, typecheck and Android build passed.

## Mô tả

Thêm mobile land read-only lookup/summary/timeline theo policy, masked/offline state và không có write controls.

## Các bước thực hiện

- [x] Thêm navigation entry và typed API client read methods.
- [x] Dựng lookup/summary/timeline read-only views.
- [x] Dùng `StateMessage`, `OfflineBanner`, `MaskedValue`.
- [x] Ẩn/bỏ mọi create/review/sync/approve/reject/upload controls.
- [x] Viết state/role/read-only tests.

## Acceptance Criteria

- [x] Given mobile API trả lookup/summary hợp lệ, When mở screen-06, Then application/parcel/timeline render read-only và field nhạy cảm masked.
- [x] Given forbidden/offline/error/empty, When state xảy ra, Then đúng state surface hiển thị và không lộ resource.
- [x] Given bất kỳ role nào, When screen-06 render, Then không có control create/review/sync/retry/approve/reject/upload.

## Test-skeleton

- AC-01: public lookup response + internal summary → cards/status/timeline render, `MaskedValue` used.
- AC-02: API 403/offline/empty → StateMessage/OfflineBanner, no data leakage.
- AC-03: rendered tree query for mutation labels/actions → zero matching controls.

## Rubric bắt buộc

- [x] Bám screen-06 handoff và existing mobile read-only/write guard; không thêm write queue.

## Traceability

- Design: `.scratch/land-module/ui/screen-06.md`, `mobile/src/components/States.tsx:4-52`.
- Dependencies: LND-08 and LND-14.

## V6 reconciliation

- Effective status `done` after `af2132e`; mobile lookup/summary/timeline is read-only with policy, masking and state guards.
