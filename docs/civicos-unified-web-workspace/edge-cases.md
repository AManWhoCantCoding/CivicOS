# Edge Cases — `civicos-unified-web-workspace`

## Authentication/session

| Case                       | Required behavior                                                      |
| -------------------------- | ---------------------------------------------------------------------- |
| Chưa đăng nhập tại `/`     | Giữ auth/login boundary hiện có; không hiển thị feature/data inventory |
| Session đang tải           | Dùng loading state có accessible status; chưa quyết định landing       |
| Session hết hạn            | Dùng existing expiry/redirect behavior; không giữ stale feature list   |
| Session response malformed | Error state an toàn; không fail-open navigation                        |
| Session read lỗi           | Retry/error behavior hiện có; không render role workspace giả          |

## Role and Assignment

| Case                              | Required behavior                                                                      |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| Role không có feature             | `AccessDenied`, không phải empty business list                                         |
| Nhiều role                        | Union feature đủ điều kiện, dedupe theo feature ID                                     |
| Task assignment revoked           | Feature task-gated biến mất khỏi navigation sau refresh; direct route vẫn server-check |
| Assignment khác user/organization | Không dùng để mở feature                                                               |
| Assignment endpoint lỗi           | Không hiển thị task-gated feature; không fail-open                                     |
| `commune_leader` land bypass      | Giữ bypass `land_review` hiện tại; không suy ra bypass cho module khác                 |

## Hidden navigation/direct route

| Case                                              | Required behavior                                                       |
| ------------------------------------------------- | ----------------------------------------------------------------------- |
| User mở direct URL PS-E1-004/005/007 và được phép | Page/API hiện có tiếp tục render; hidden item không xuất hiện trong nav |
| User mở direct URL và không được phép             | Existing server/domain forbidden boundary                               |
| Back/forward từ hidden route                      | Không đổi browser history semantics; không tự redirect sang route mới   |
| Active breadcrumb trên hidden route               | Không tạo link navigation tới hidden feature; giữ page context an toàn  |
| Bookmark cũ                                       | Không biến “ẩn navigation” thành route deletion                         |

## Web shell

| Case                               | Required behavior                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------ |
| Module không có feature visible    | Không render module entry trong switcher                                       |
| Feature registry có duplicate href | Hiển thị một entry theo feature ID/label policy đã chốt; không tạo action mới  |
| Hash route như inspection schedule | Giữ hash/deep-link mapping hiện có                                             |
| Drawer mở khi chuyển route         | Giữ close/focus restore semantics của `ModuleShell`                            |
| Offline lúc tải workspace          | Dùng existing offline/status vocabulary; không suy diễn quyền từ offline state |

## Mobile audit

- Mobile visual mismatch không được chữa bằng cách thêm web route hoặc đổi
  `AppNavigator` trong work item này.
- Mobile failure state phải giữ `StateMessage`, `MaskedValue`, `OfflineBanner`
  và current read-only semantics.
