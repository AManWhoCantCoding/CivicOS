# API Contract — `civicos-unified-web-workspace`

## Trạng thái

`DRAFT_REVIEW_REQUIRED` — contract này xác nhận không có API delta; không phải
đề xuất endpoint mới.

## Existing reads reused

| Need            | Existing source                              | Contract                                                 |
| --------------- | -------------------------------------------- | -------------------------------------------------------- |
| Session         | `/api/auth/session`                          | Giữ method, response shape, errors và expiry behavior    |
| Own assignments | `/api/identity/assignments`                  | Giữ query scope, status, assignee và organization fields |
| Feature entry   | `feature-entry.ts` + existing server layouts | Giữ `canEnterAnyFeature()` và domain gates               |
| Domain data     | Existing module API callers                  | Không đổi path/method/payload/error/status               |

## Workspace read behavior

- Workspace có thể đọc session một lần và lấy assignments cần cho toàn bộ
  navigation calculation; đây là reuse existing read API, không phải API change.
- Feature chỉ được đưa vào navigation khi policy hiện tại cho phép. Không dùng
  `ROLE_BASE_CAPABILITIES` đơn độc để suy ra feature visibility.
- Nếu assignments không tải được, feature cần Assignment không được hiển thị;
  feature bypass task vẫn theo role hiện tại. Không fail-open.
- Nếu session read lỗi, dùng existing auth/session error behavior; không render
  module catalog hoặc data.

## Navigation projection vs entry authorization

Thiết kế phải có hai projection riêng:

1. **Navigation projection:** loại các feature bị user yêu cầu ẩn:
   `resident-list`, `resident-reports`, `incident-queue`, `incident-intake`,
   `inspection-catalogue`, `inspection-schedule`, `inspection-workqueue`.
2. **Entry authorization:** giữ toàn bộ feature registry và server/domain gate để
   direct URL behavior không bị biến thành deny chỉ vì navigation đã ẩn.

Không được giải quyết việc ẩn navigation bằng cách xóa feature khỏi tập dùng bởi
`canEnterFeature()` nếu cách đó làm thay đổi direct-route authorization.

## Forbidden API changes

- Không thêm `/api/workspace`, `/api/navigation`, `/api/modules` hoặc endpoint
  aggregate mới chỉ để phục vụ launcher.
- Không thêm field role/permission/visibility vào session hoặc database.
- Không sửa payload, error code, pagination, version, idempotency, masking hoặc
  organization scope của domain APIs.
- Không thay đổi API/runtime boundary của mobile.

## Data-model disposition

`NO_KNOWN_IMPACT_PRELIMINARY`. Role, Assignment và session structures đã tồn tại;
không có evidence yêu cầu table/field/relation/migration. Nếu implementation
phát sinh data/API semantics mới, phải dừng ticket và mở lại B9/contract review.
