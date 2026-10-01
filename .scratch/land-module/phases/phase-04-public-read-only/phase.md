# Phase 04 — Public lookup & read-only clients

- **Workflow version:** V6
- **Effective status:** pending-gate
- **V3 source:** `phase-04-public-read-only.md` (migrated; ticket contracts split below)
- **Current frontier:** none; LND-14–LND-16 accepted
- **Gate:** pending; ticket-level verification exists for LND-14–LND-16
- **Blocked by:** none; Phase 04 gate is next.

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

## SOW và phụ thuộc phase

- SOW mapping: F-05, phần mobile read-only của F-06 và screen-05/06 trong `.scratch/land-module/sow.md` mục 3–5.
- Phụ thuộc trước: Phase 02 có application/parcel lookup source; Phase 03 có trạng thái sync/approval đầy đủ.
- Mở khóa cho: Phase 05 dùng public boundary làm regression check khi bổ sung Evidence.
- Public UI không được reuse internal detail component nếu component có thể render field ngoài projection.

## Phase DoD

- Đúng một query key trả đúng 8 field lookup và `simulated=true`.
- Missing/both key, not-found và rate-limit có code/error đúng, không query/lộ internal detail.
- Screen-05 giữ input/retry và không render PII/polygon/sync/approval/Evidence.
- Mobile screen-06 chỉ read-only, masked/offline/error/forbidden states đầy đủ.

## Tiêu chí hoàn thành

- Given application hoặc parcel code tồn tại, When public client gửi đúng một query key, Then HTTP `200`, có đúng 8 field lookup và `simulated=true`.
- Given không có key hoặc có cả hai key, When lookup, Then HTTP `400 LAND_LOOKUP_QUERY_INVALID` và không query resource detail.
- Given code không tồn tại hoặc IP vượt quota, When lookup, Then HTTP `404 LAND_LOOKUP_NOT_FOUND` hoặc `429 LAND_RATE_LIMITED`, không lộ resource nội bộ.
- Given web screen-05 success, When result render, Then UI không hiển thị PII, address, polygon, sync, approval hoặc Evidence.
- Given mobile screen-06 mở application/parcel, When policy trả dữ liệu, Then chỉ có read control, field nhạy cảm mask và state offline/error có retry phù hợp.
- Given mobile user ở bất kỳ role nào, When render screen-06, Then không có create/review/sync/retry/approve/reject/upload control.

## Ticket index

| ID | File V6 | Effective status | V3 status | Blocked by |
|---|---|---|---|---|
| LND-14 | `T-LND-14-public-lookup-projection-rate-limit.md` | done | needs-triage | LND-06, LND-08, LND-11, LND-12 |
| LND-15 | `T-LND-15-web-public-lookup.md` | done | needs-triage | LND-14 |
| LND-16 | `T-LND-16-mobile-read-only.md` | done | needs-triage | LND-08, LND-14 |

## Phụ thuộc giữa phase

- Phụ thuộc trước: Phase 02 có application/parcel lookup source; Phase 03 có trạng thái sync/approval đầy đủ.
- Mở khóa cho: Phase 05 dùng public boundary làm regression check khi bổ sung Evidence.
- Public UI không được reuse internal detail component nếu component có thể render field ngoài projection.

## V6 reconciliation

- LND-14 được accept sau `e331951`; LND-15 được accept sau `c661456`.
- LND-16 được accept sau `af2132e`.
- Phase 04 đủ điều kiện chạy phase gate; chưa dispatch Phase 05 trước khi gate hoàn tất.
- LND-17/LND-18/LND-19 vẫn blocked bởi LND-15/LND-16 và Phase 04 completion.
