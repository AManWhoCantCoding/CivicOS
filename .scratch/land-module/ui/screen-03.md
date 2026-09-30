# Screen-03 — Application processing/detail

## Route và mục đích

- `/land/applications/{applicationId}`.
- Detail projection, timeline và action theo role/Assignment/state.

## Bố cục

- Header: application code, change type, status chip, version, simulated label.
- Summary: organization, createdBy, submittedAt/updatedAt/completedAt, rejection reason nếu có.
- Sections: parties/parcel links, change payload safe projection, timeline EventRecord, Evidence metadata/upload, action bar.
- Action bar tách rõ `Thẩm tra`, `Đồng bộ mô phỏng`, `Thử lại`, `Duyệt`, `Từ chối`.

## Action matrix

| Actor/state | Control |
|---|---|
| Assigned officer + `submitted` | Thẩm tra |
| Assigned officer + `in_review` | Đồng bộ mô phỏng |
| Assigned officer + `sync_failed` | Thử lại |
| Same officer without active assignment | Không có mutation; Assignment required |
| Leader same OU + `pending_approval` | Duyệt/Từ chối |
| `completed`/`rejected` | Read-only |

## Modal/error behavior

- Sync/approve/reject gửi `If-Match-Version`; stale version mở conflict banner yêu cầu reload.
- Reject bắt buộc reason không trắng; không đóng modal khi invalid.
- Sync failure hiển thị `failureCode` an toàn, không hiển thị request/response secret.
- Event/audit failure hiển thị lỗi transaction, không báo success.

## Evidence

- Internal scoped actor thấy fileName/MIME/size/hash/immutable/description; upload chỉ PDF/JPEG/PNG ≤10 MiB.
- Không render `storageKey`; public/mobile không có panel này.

## Trạng thái

- Loading skeleton theo section, empty timeline/Evidence, forbidden/assignment, offline, terminal read-only.
- Timeline sort `occurredAt` tăng dần; time hiển thị UTC.
