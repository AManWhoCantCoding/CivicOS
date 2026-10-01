# LND-05 — Web screen-04 parcel/party workspace

- **Ticket ID:** LND-05
- **Status:** done
- **V6 effective status:** done
- **V3 status:** needs-triage
- **Blocked by:** LND-02, LND-03, LND-04
- **Loại:** feature
- **Lane:** full
- **Gate hướng:** có
- **File được phép sửa:** `src/app/land/parcels/**`, `src/components/land/**`, `src/components/navigation/feature-registry.ts`, `tests/land-ui/**`
- **File cấm sửa:** `.env`, `.brain/**`, `.scratch/land-module/ui/**`
- **Demo path:** Internal user vào `/land/parcels`, mở detail, xem geometry/rights/encumbrances theo scope.
- **Shared commit:** `e81c252`
- **Evidence:** `.brain/evidence/LND-09/{tests,review,digest}.md` — LND-09 + LND-05 UI 41/41.

## Mô tả

Triển khai parcel/party list và detail theo screen-04, scope/masked/forbidden/offline states và không có direct mutation rights/encumbrances.

## Các bước thực hiện

- [x] Đăng ký route/feature land theo ModuleShell.
- [x] Dựng parcel/party list, filter và cursor state.
- [x] Dựng detail geometry/rights/encumbrances/Evidence placeholder.
- [x] Áp dụng masked/forbidden/offline states theo screen-04.
- [x] Viết UI contract tests.

## Acceptance Criteria

- [x] Given internal actor có scope, When mở parcel detail, Then geometry/rights/encumbrances hiển thị và identity chỉ masked.
- [x] Given actor forbidden/offline/empty, When load screen, Then state tương ứng hiển thị và không lộ dữ liệu.
- [x] Given screen-04, When người dùng thao tác rights/encumbrances, Then không có direct mutation control.

## Test-skeleton

- AC-01: mock parcel detail + right/encumbrance → sections render đúng, không có ciphertext.
- AC-02: API 403/empty/offline → denied/empty/offline state + retry theo brief.
- AC-03: query UI controls → không tìm thấy button mutate right/encumbrance.

## Rubric bắt buộc

- [x] Bám `.scratch/land-module/ui/screen-04.md` và `design-tokens.md`; không tự thêm UI flow.

## Traceability

- Design: `.scratch/land-module/ui/screen-04.md`, `design-tokens.md`.
- Implementation/test: shared commit `e81c252`.
- Verification/review: `.brain/evidence/LND-09/tests.md`, `.brain/evidence/LND-09/review.md`.

## V6 reconciliation

- Effective `done` được reconcile từ shared implementation batch và LND-09 evidence explicitly ghi `LND-09 + LND-05 UI`.
- Không có evidence directory riêng LND-05; không tạo bản evidence mới trong migration.
