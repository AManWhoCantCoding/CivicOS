# API contract: civicos-ui-design-system

## Kết luận contract

Đây là feature UI-only. **Không có API mới được giới thiệu.** Các surface web/mobile tiếp tục dùng API, read model và error/state semantics hiện có.

## Invariants bắt buộc

| Hạng mục               | Contract                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| Endpoint, method, path | Giữ nguyên toàn bộ API hiện có; không thêm, xóa, đổi tên hoặc đổi route.                                |
| Request/response       | Giữ nguyên shape, field, nullability, pagination và version/idempotency semantics hiện có.              |
| Error/status           | Giữ nguyên HTTP status, error code/message và state machine hiện có. UI state không tạo status API mới. |
| Authorization          | Giữ nguyên session, role, OrganizationUnit, permission, Assignment và masking policy; không thêm quyền. |
| Map                    | Giữ nguyên map projection allowlist, server-side access boundary và no-offline-polygon behavior.        |
| Navigation             | Giữ nguyên destination và business action; presentation migration không tạo flow nghiệp vụ mới.         |

## Non-goals

- Không thiết kế endpoint, payload, webhook, event contract hoặc public API mới.
- Không đổi API để phục vụ token, typography, layout, loading/empty/error/offline presentation.
- Không biến dữ liệu mô phỏng thành `official`, `certified` hoặc tuyên bố ranh giới pháp lý.

## Compatibility rule

Implementation chỉ được đổi cách hiển thị dữ liệu và trạng thái từ các contract hiện có. Nếu cần đổi API, route, permission, masking, state machine hoặc map projection, đó không còn là phạm vi của `civicos-ui-design-system` và phải mở một design/data-model review riêng trước khi thực hiện.
