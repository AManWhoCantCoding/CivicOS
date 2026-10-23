# Case biên: land-module

## EC-01: Body JSON vượt giới hạn

- Điều kiện: Request JSON lớn hơn `1 MiB`.
- Hành vi mong đợi: Trả `400 LAND_INVALID_REQUEST`, không tạo row hoặc event.
- Tính năng liên quan: F-01, F-02, F-03, F-04.

## EC-02: Polygon sai hình học hoặc SRID

- Điều kiện: GeoJSON không phải Polygon, self-intersection, ít điểm đóng vòng hoặc SRID khác 4326.
- Hành vi mong đợi: Trả `400 LAND_GEOMETRY_INVALID`, transaction rollback.
- Tính năng liên quan: F-01, F-04.

## EC-03: Mã nghiệp vụ trùng

- Điều kiện: Create party/parcel/application với code đã tồn tại.
- Hành vi mong đợi: Trả `409 LAND_DUPLICATE_CODE`, không tạo bản ghi thứ hai.
- Tính năng liên quan: F-01, F-02.

## EC-04: Idempotency cùng payload

- Điều kiện: Hai create application có cùng `Idempotency-Key` và cùng payload.
- Hành vi mong đợi: Hai response tham chiếu cùng `application.id`; database chỉ có một application.
- Tính năng liên quan: F-02.

## EC-05: Idempotency khác payload

- Điều kiện: Key đã dùng cho payload A nhưng request sau gửi payload B.
- Hành vi mong đợi: Trả `409 LAND_IDEMPOTENCY_CONFLICT`; application A không đổi.
- Tính năng liên quan: F-02.

## EC-06: Version cũ

- Điều kiện: Command gửi `If-Match-Version` nhỏ hơn `application.version` hiện tại.
- Hành vi mong đợi: Trả `409 LAND_VERSION_CONFLICT`; không tăng version và không ghi event mới.
- Tính năng liên quan: F-02, F-03, F-04.

## EC-07: Transition không hợp lệ

- Điều kiện: Gọi approve khi application còn `in_review`, hoặc retry khi chưa `sync_failed`.
- Hành vi mong đợi: Trả `409 LAND_INVALID_TRANSITION`; trạng thái giữ nguyên.
- Tính năng liên quan: F-02, F-03, F-04.

## EC-08: Officer không có Assignment

- Điều kiện: `land_officer` gọi review/sync/retry cho application không có Assignment `land_review` active.
- Hành vi mong đợi: Trả `403 LAND_ASSIGNMENT_REQUIRED`; không ghi mutation.
- Tính năng liên quan: F-02, F-03, F-06.

## EC-09: Khác OrganizationUnit

- Điều kiện: User hoặc Assignment khác `organizationId` của resource.
- Hành vi mong đợi: Trả `403 LAND_FORBIDDEN`; không tiết lộ resource detail.
- Tính năng liên quan: F-01, F-02, F-04, F-06.

## EC-10: Thiếu quan hệ transfer

- Điều kiện: Transfer thiếu current holder, proposed holder, subject parcel hoặc tổng share sau mutation khác `100.00`.
- Hành vi mong đợi: Trả `400 LAND_INVALID_REQUEST`; không cho review.
- Tính năng liên quan: F-02, F-04.

## EC-11: Mortgage release không có encumbrance active

- Điều kiện: Release tham chiếu parcel không có `LandEncumbrance.status=active`.
- Hành vi mong đợi: Trả `400 LAND_INVALID_REQUEST`; không tạo row released.
- Tính năng liên quan: F-02, F-04.

## EC-12: Split/merge thiếu source hoặc result

- Điều kiện: Application chỉ có source hoặc chỉ có result.
- Hành vi mong đợi: Trả `400 LAND_INVALID_REQUEST`; không tạo application `submitted`.
- Tính năng liên quan: F-02.

## EC-13: Mock sync thất bại

- Điều kiện: Adapter fixture trả failure.
- Hành vi mong đợi: Application ở `sync_failed`, sync có `failureCode`, không có Approval và không mutate quyền/thửa/ràng buộc.
- Tính năng liên quan: F-03, F-04.

## EC-14: Retry mock sync

- Điều kiện: Gọi retry trên `sync_failed` với cùng request key.
- Hành vi mong đợi: `attempts` tăng, không tạo application/sync operation trùng; success chuyển tới `pending_approval`.
- Tính năng liên quan: F-03.

## EC-15: Approve/reject sai role

- Điều kiện: `land_officer`, citizen hoặc unauthenticated gọi approve/reject.
- Hành vi mong đợi: `401 LAND_UNAUTHENTICATED` hoặc `403 LAND_FORBIDDEN`; không tạo Approval.
- Tính năng liên quan: F-04, F-06.

## EC-16: Reject thiếu reason

- Điều kiện: Reject gửi reason rỗng hoặc chỉ whitespace.
- Hành vi mong đợi: Trả `400 LAND_INVALID_REQUEST`; application vẫn ở trạng thái cũ.
- Tính năng liên quan: F-04.

## EC-17: Lookup thiếu hoặc thừa key

- Điều kiện: Public lookup không có key hoặc có đồng thời `applicationCode` và `parcelCode`.
- Hành vi mong đợi: Trả `400 LAND_LOOKUP_QUERY_INVALID`; không query resource detail.
- Tính năng liên quan: F-05.

## EC-18: Lookup không thấy

- Điều kiện: Một key hợp lệ nhưng không match record.
- Hành vi mong đợi: Trả `404 LAND_LOOKUP_NOT_FOUND`; response không phân biệt party/PII.
- Tính năng liên quan: F-05.

## EC-19: Public lookup bị rate limit

- Điều kiện: Một IP vượt `60 requests/minute`.
- Hành vi mong đợi: Trả `429 LAND_RATE_LIMITED`; không chạy query nghiệp vụ.
- Tính năng liên quan: F-05.

## EC-20: Evidence không hợp lệ

- Điều kiện: MIME không thuộc PDF/JPEG/PNG hoặc file lớn hơn `10 MiB`.
- Hành vi mong đợi: Trả `400 LAND_EVIDENCE_TYPE_UNSUPPORTED` hoặc `LAND_EVIDENCE_TOO_LARGE`; không tạo Evidence/storage file.
- Tính năng liên quan: F-07.

## EC-21: Evidence upload lặp

- Điều kiện: Cùng resource upload cùng bytes/hash hai lần.
- Hành vi mong đợi: Unique `(resourceType,resourceId,originalHash)` ngăn row trùng; response tham chiếu Evidence hiện có, không tạo row/storage file thứ hai.
- Tính năng liên quan: F-07.

## EC-22: Transaction lỗi sau khi ghi domain

- Điều kiện: Event, audit hoặc side effect cuối transaction ném lỗi.
- Hành vi mong đợi: Rollback application/land mutation/approval và không để EventRecord/AuditEvent nửa chừng.
- Tính năng liên quan: F-02, F-03, F-04, F-06.

## EC-23: UTC và thời gian biên

- Điều kiện: Client gửi timestamp hoặc đọc record qua múi giờ khác.
- Hành vi mong đợi: API trả ISO-8601 UTC; server dùng `submittedAt`, `updatedAt`, `completedAt` từ database, không tính theo local time.
- Tính năng liên quan: F-02, F-05.

## EC-24: Public response kiểm tra rò rỉ

- Điều kiện: Lookup record có party, geometry, sync, approval hoặc Evidence liên quan.
- Hành vi mong đợi: Response chỉ có tám trường lookup và `simulated=true`; các resource nhạy cảm không xuất hiện trong JSON hoặc error.
- Tính năng liên quan: F-05, F-07.
