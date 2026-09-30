# Screen-01 — Land workspace / application queue

## Route và mục đích

- `/land` hoặc `/land/applications`.
- Cho `land_officer` và `commune_leader` xem application trong OrganizationUnit; officer chỉ thấy resource theo policy/Assignment.

## Bố cục

- ModuleShell: breadcrumb `Đất đai / Hồ sơ biến động`, organization scope và simulated notice.
- Header: page title, count, `Tạo hồ sơ` chỉ cho officer có capability mutate.
- Filter row: status, change type, assigned user, search application code; filter nằm trong URL.
- Queue table: application code, change type, parcel code, status chip, updatedAt, assignee, version.
- Cursor pagination; row click mở screen-03.

## Role/action

- `land_officer`: create CTA; không thấy approve/reject.
- `commune_leader`: đọc queue và mở detail; assignment management nằm ở identity surface, không tạo control riêng trong queue.
- Actor ngoài scope: forbidden state, không render rows.

## Trạng thái

- Loading skeleton table; empty nêu cách tạo hồ sơ hoặc đổi filter.
- API error giữ filter, inline retry.
- Offline hiển thị banner và tắt create/mutation.
- Forbidden/Assignment required không hiển thị detail preview.

## Accessibility/content

- Filter có label và keyboard focus; status chip có text.
- Application/parcel code dùng monospace; timestamp hiển thị UTC.
- Không render `changePayload`, PII hoặc sync payload trong list.

## Không có trong screen

- Không approve/reject/sync trực tiếp trong queue.
- Không public lookup, polygon hoặc Evidence upload.
