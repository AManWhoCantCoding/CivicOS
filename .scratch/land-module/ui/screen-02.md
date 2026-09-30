# Screen-02 — Create land application

## Route và mục đích

- `/land/applications/new`.
- Chỉ `land_officer` có capability mutate; form tạo application ở `submitted`.

## Bố cục

- Header có back về queue, title `Tạo hồ sơ biến động`, simulated notice.
- Step/section `Loại biến động`: `transfer`, `information_update`, `mortgage`, `parcel_split_merge`.
- Party picker và parcel picker dùng reference code/mã thửa; hiển thị role/link và scope.
- Dynamic payload section theo change type:
  - transfer: current/proposed holder và share percent;
  - information update: field `address` hoặc `landUseType`, new value;
  - mortgage: register/release và secured party;
  - split/merge: source/result parcel.
- Footer: cancel, submit; submit gửi `Idempotency-Key` và không nhận actor/organization từ form.

## Validation/state

- Required relation, decimal share, change payload và unique selection validate tại control.
- Server error map `LAND_*` gần field/form; giữ input khi retry.
- Offline tắt submit nhưng giữ draft trong phiên; không tạo local mutation.
- Double click submit bị khóa trong request; retry cùng key phải an toàn.
- Success 201 điều hướng screen-03 với status `submitted`.

## Accessibility/content

- Label rõ, helper text nêu share phải bằng `100.00`; focus tới lỗi đầu tiên.
- Không dùng từ “phê duyệt” cho submit; chỉ nói “Gửi hồ sơ”.
- Không render plaintext identity number; picker dùng masked/reference code.

## Không có trong screen

- Không review, sync, retry, approve, reject, upload Evidence hoặc chỉnh quyền trực tiếp.
