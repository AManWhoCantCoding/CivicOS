# Screen-06 — Mobile land read-only

## Mục đích và navigation

- Mobile có tab/entry `Đất đai` với lookup public và các summary đã được policy cho phép.
- Màn hình phục vụ đọc application/parcel/timeline; không có write flow.
- Tái sử dụng `StateMessage`, `OfflineBanner`, `MaskedValue` và navigation/state convention hiện có.

## Bố cục

- Lookup card: chọn một mã, input, result projection tối thiểu.
- Application summary: code/status/change type/timestamps safe projection.
- Parcel summary: parcel code/map sheet/parcel number/status/area nếu policy cho phép; identity mask.
- Timeline list: event type, actor safe snapshot, occurredAt; không payload nhạy cảm.

## Read-only guard

- Không render create, review, sync, retry, approve, reject, assignment mutation, Evidence upload hoặc delete.
- `completed`/`rejected` vẫn chỉ đọc.
- Mobile không gọi internal endpoint nếu session/scope không hợp lệ; forbidden không lộ resource.

## Trạng thái

- Loading skeleton, empty, error/retry, forbidden, masked value, offline banner.
- Offline giữ query/input và cho phép xem cache an toàn nếu có; không báo thành công mutation.
- API error map về message ngắn tiếng Việt; retry có giới hạn.

## Privacy

- Không party plaintext, address đầy đủ, polygon, sync payload, approval detail, Evidence metadata hoặc `storageKey`.
- Mọi public result giữ nhãn `simulated`; không dùng wording official/certified.
