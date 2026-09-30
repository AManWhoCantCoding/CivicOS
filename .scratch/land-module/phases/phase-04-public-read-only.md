# Phase 04 — Public lookup & read-only clients

## Phạm vi phase

Triển khai public lookup projection/rate limit và các UI read-only web/mobile. Không trả party, PII, address, polygon, sync, approval hoặc Evidence metadata; mobile không có write control.

## Tính năng thuộc phase

- F-05 — public lookup bằng `applicationCode` hoặc `parcelCode`.
- F-06 — mobile/internal read policy và masked data.
- Phần UI screen-05 web và screen-06 mobile.

## Ticket list dự kiến

| ID | Ticket | Demo path sau ticket | Tham chiếu design | Phụ thuộc |
|---|---|---|---|---|
| LND-14 | Public lookup projection/rate limit | Public client tra cứu đúng một key, nhận 8 field + `simulated=true`; invalid/not-found/rate-limit rõ ràng. | `api-contract.md#get-apipubliclandlookup`; DR-20; `non-functional.md#giới-hạn` | Phase 02, Phase 03 |
| LND-15 | Web screen-05 public lookup | Người dùng nhập application/parcel code và xem projection tối thiểu, không cần session. | `.scratch/land-module/ui/screen-05.md`; `design-tokens.md` | LND-14 |
| LND-16 | Mobile screen-06 read-only | Mobile đọc public lookup/application/parcel summary/timeline theo policy, masked/offline, không write. | `.scratch/land-module/ui/screen-06.md`; `mobile/src/components/States.tsx:4-52` | LND-14, LND-08 |

## Thứ tự thực hiện

1. LND-14.
2. LND-15 và LND-16 có thể triển khai song song sau contract API.

## Ticket contracts

### LND-14 — Public lookup projection/rate limit

- **Status:** needs-triage
- **Blocked by:** LND-06, LND-08, LND-11, LND-12
- **Loại:** feature
- **Lane:** full
- **Gate hướng:** có
- **File được phép sửa:** `src/modules/land/**`, `src/app/api/public/land/lookup/**`, `tests/land/**`, `tests/integration/**`
- **File cấm sửa:** `.env`, `.brain/**`, `docs/design/**`, `docs/research/**`
- **Demo path:** Anonymous user lookup bằng một application/parcel code nhận projection tối thiểu.
- **Các bước thực hiện:**
  1. Tạo read query projection không join field nhạy cảm.
  2. Validate mutual-exclusive query params.
  3. Thêm rate limit `60 requests/minute/IP`.
  4. Map not-found/invalid/rate-limit message tiếng Việt.
  5. Viết redaction/rate-limit contract tests.
- **Acceptance Criteria:**
  - [ ] Given đúng một code tồn tại, When GET public lookup, Then HTTP `200`, đúng 8 field và `simulated=true`.
  - [ ] Given không có hoặc có cả hai code, When lookup, Then `400 LAND_LOOKUP_QUERY_INVALID` và không query detail.
  - [ ] Given unknown code/IP vượt quota, When lookup, Then `404 LAND_LOOKUP_NOT_FOUND` hoặc `429 LAND_RATE_LIMITED`, không lộ nội bộ.
- **Test-skeleton:**
  - AC-01: `applicationCode=APP-001` → 8 fields, simulated true, no party/address/polygon.
  - AC-02: both query params → 400; DB query spy không gọi detail.
  - AC-03: missing code/unknown code/61st request → expected 400/404/429 and safe error body.
- **Rubric bắt buộc:** Projection bám API contract/DR-20; rate limit không tạo auth/session requirement.

### LND-15 — Web screen-05 public lookup

- **Status:** needs-triage
- **Blocked by:** LND-14
- **Loại:** feature
- **Lane:** fast
- **Gate hướng:** không
- **File được phép sửa:** `src/app/public/land/lookup/**`, `src/components/land/**`, `tests/land-ui/**`
- **File cấm sửa:** `.env`, `.brain/**`, `docs/design/**`, `.scratch/land-module/ui/**`
- **Demo path:** Public user mở `/public/land/lookup`, nhập một mã và xem trạng thái mô phỏng.
- **Các bước thực hiện:**
  1. Dựng mode selector và input code.
  2. Kết nối public lookup GET.
  3. Render result 8 fields và simulated label.
  4. Implement invalid/not-found/rate-limit/offline states.
  5. Viết redaction/accessibility tests.
- **Acceptance Criteria:**
  - [ ] Given code hợp lệ, When submit screen-05, Then result card hiển thị 8 fields và `simulated: true`.
  - [ ] Given cả hai mode hoặc code rỗng, When submit, Then UI hiển thị message `LAND_LOOKUP_QUERY_INVALID` bằng tiếng Việt.
  - [ ] Given not-found/rate-limited/offline, When API lỗi, Then input được giữ và retry không tự lặp vô hạn.
- **Test-skeleton:**
  - AC-01: mode application + APP-001 → result field set exact, no internal field.
  - AC-02: both mode flags/blank input → validation message, network call absent or 400 mapped.
  - AC-03: 404/429/offline → error/rate/offline state, input value unchanged.
- **Rubric bắt buộc:** Bám screen-05; không render official/certified wording, polygon hoặc PII.

### LND-16 — Mobile screen-06 read-only

- **Status:** needs-triage
- **Blocked by:** LND-08, LND-14
- **Loại:** feature
- **Lane:** full
- **Gate hướng:** có
- **File được phép sửa:** `mobile/src/features/land/**`, `mobile/src/navigation/AppNavigator.tsx`, `mobile/src/api/**`, `mobile/src/features/**/__tests__/**`
- **File cấm sửa:** `.env`, `.brain/**`, `docs/design/**`, `src/**`, `.scratch/land-module/ui/**`
- **Demo path:** Mobile đọc lookup/application/parcel summary/timeline; không có bất kỳ write action nào.
- **Các bước thực hiện:**
  1. Thêm navigation entry và typed API client read methods.
  2. Dựng lookup/summary/timeline read-only views.
  3. Dùng `StateMessage`, `OfflineBanner`, `MaskedValue`.
  4. Ẩn/bỏ mọi create/review/sync/approve/reject/upload controls.
  5. Viết state/role/read-only tests.
- **Acceptance Criteria:**
  - [ ] Given mobile API trả lookup/summary hợp lệ, When mở screen-06, Then application/parcel/timeline render read-only và field nhạy cảm masked.
  - [ ] Given forbidden/offline/error/empty, When state xảy ra, Then đúng state surface hiển thị và không lộ resource.
  - [ ] Given bất kỳ role nào, When screen-06 render, Then không có control create/review/sync/retry/approve/reject/upload.
- **Test-skeleton:**
  - AC-01: public lookup response + internal summary → cards/status/timeline render, `MaskedValue` used.
  - AC-02: API 403/offline/empty → StateMessage/OfflineBanner, no data leakage.
  - AC-03: rendered tree query for mutation labels/actions → zero matching controls.
- **Rubric bắt buộc:** Bám screen-06 handoff và existing mobile read-only/write guard; không thêm write queue.

## Tiêu chí hoàn thành

- Given application hoặc parcel code tồn tại, When public client gửi đúng một query key, Then HTTP `200`, có đúng 8 field lookup và `simulated=true`.
- Given không có key hoặc có cả hai key, When lookup, Then HTTP `400 LAND_LOOKUP_QUERY_INVALID` và không query resource detail.
- Given code không tồn tại hoặc IP vượt quota, When lookup, Then HTTP `404 LAND_LOOKUP_NOT_FOUND` hoặc `429 LAND_RATE_LIMITED`, không lộ resource nội bộ.
- Given web screen-05 success, When result render, Then UI không hiển thị PII, address, polygon, sync, approval hoặc Evidence.
- Given mobile screen-06 mở application/parcel, When policy trả dữ liệu, Then chỉ có read control, field nhạy cảm mask và state offline/error có retry phù hợp.
- Given mobile user ở bất kỳ role nào, When render screen-06, Then không có create/review/sync/retry/approve/reject/upload control.

## Phụ thuộc giữa phase

- Phụ thuộc trước: Phase 02 có application/parcel lookup source; Phase 03 có trạng thái sync/approval đầy đủ.
- Mở khóa cho: Phase 05 dùng public boundary làm regression check khi bổ sung Evidence.
- Public UI không được reuse internal detail component nếu component có thể render field ngoài projection.
