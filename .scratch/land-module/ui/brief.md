# UI Brief — land-module

## Mục tiêu

Tạo workspace đất đai cho cán bộ nội bộ, public lookup tối thiểu và mobile read-only. UI phải làm rõ phạm vi đơn vị, Assignment, trạng thái mô phỏng và các nhánh loading/error/empty/forbidden/offline/conflict.

## Danh sách màn hình

### Web nội bộ

1. **Screen-01 — Land workspace/application queue**: `/land` và `/land/applications`; filter, status, assignment và CTA tạo.
2. **Screen-02 — Create application**: `/land/applications/new`; form bốn change type, links party/parcel và submit.
3. **Screen-03 — Application processing/detail**: `/land/applications/{applicationId}`; detail, timeline, sync/retry, approve/reject, Evidence theo role.
4. **Screen-04 — Parcel detail**: `/land/parcels/{parcelId}`; parcel, rights, encumbrances, history và Evidence metadata.

### Web public

5. **Screen-05 — Public lookup**: `/public/land/lookup`; nhập đúng một application code hoặc parcel code, hiển thị projection tám trường và `simulated`.

### Mobile read-only

6. **Screen-06 — Mobile land read-only**: public lookup, application/parcel summary và timeline; không có write control.

## Luồng chuyển màn hình

```text
Land workspace → queue → create application → application detail
                                      ↘ parcel/party picker
Application detail → review → sync/retry → pending approval → approve/reject
Application detail → Evidence panel
Parcel list → parcel detail → rights/encumbrances/Evidence metadata
Public lookup → minimal result
Mobile → lookup/summary/timeline (read-only)
```

## Trạng thái bắt buộc

- Loading/skeleton theo đúng kích thước nội dung.
- Success/default và simulated label.
- Empty có hướng dẫn hành động tiếp theo.
- Error inline, mã lỗi tiếng Việt và retry.
- Forbidden/Assignment required không lộ dữ liệu.
- Offline giữ input và chặn mutation.
- Version conflict yêu cầu reload, không giả vờ thành công.
- Terminal `completed`/`rejected` chỉ read-only.

## Boundary

- Web nội bộ mới có mutation; approve/reject chỉ leader cùng đơn vị.
- Public/mobile không render PII, polygon, sync payload, approval detail, Evidence metadata hoặc `storageKey`.
- Không thêm control ngoài API contract và không coi mock là hồ sơ pháp lý.
