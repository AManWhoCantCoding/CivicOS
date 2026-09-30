# Screen-04 — Parcel detail

## Route và mục đích

- `/land/parcels/{parcelId}`.
- Cán bộ scoped đọc parcel, rights, encumbrances, history và Evidence metadata; screen này không tạo quyền trực tiếp.

## Bố cục

- Header: parcel code, map sheet/parcel number, status, organization và version.
- Overview: diện tích, land use type, commune code, địa chỉ internal, geometry preview internal.
- Rights table: party reference/masked display, share, active/ended, validity, source application.
- Encumbrances table: type, secured party masked, active/released, registered/released at.
- Evidence metadata panel dùng chung policy, không có public/mobile exposure.

## Role/state

- Officer cần Assignment liên quan; leader cùng OrganizationUnit có read access.
- Forbidden/Assignment required không lộ parcel code/detail.
- Empty rights/encumbrances/Evidence có empty copy, không coi là lỗi.
- Retired/proposed parcel hiển thị read-only status; không có hard-delete action.

## Privacy/accessibility

- Identity number luôn masked; geometry/address không được reuse vào public lookup.
- Table có caption/headers; numeric fields và codes có monospace.
- Loading/error/retry theo từng panel, không làm mất các panel đã tải.
