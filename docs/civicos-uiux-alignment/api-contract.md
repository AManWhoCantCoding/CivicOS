# API contract: `civicos-uiux-alignment`
 
## Kết luận
 
Đây là presentation migration. **Không có API delta.** Tất cả web/mobile
surface tiếp tục dùng endpoint, read model, response và error semantics hiện có.
 
## Invariants
 
| Hạng mục             | Contract phải giữ                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| Endpoint/method/path | Không thêm, xóa, đổi tên hoặc đổi path.                                                          |
| Request/response     | Giữ shape, field, nullability, pagination, version và idempotency semantics.                     |
| Error/status         | Giữ HTTP status, error code/message và state mapping hiện có; UI không tạo API status mới.       |
| Authorization        | Giữ session, role, OrganizationUnit, permission, Assignment và masking; không thêm quyền.        |
| Navigation           | Giữ route destination, deep link và back destination; không tạo flow nghiệp vụ mới.              |
| Map                  | Giữ projection allowlist, provider/geometry boundary, stale/offline và no-offline-polygon rules. |
| Mobile               | Giữ read-only API/config/deep-link boundary; không thêm write/public-intake endpoint.            |
 
## Presentation consumption rule
 
UI chỉ được hiển thị field/state đã có từ contract hiện tại. Nếu một surface
cần field mới để đạt visual parity, đó là `DATA-MODEL-IMPACT`/contract gap,
không được tự thêm field hoặc đổi API trong work item này.
 
## Privacy rule
 
- Không render raw response, PII, sync/storage key, geometry hoặc resource
  existence ngoài scope trong error/forbidden state.
- Không đổi masked value thành reveal; UI không tự suy ra quyền từ palette hay
  route.
 
## Compatibility gate
 
Nếu implementation cần API, route, permission, masking, state-machine hoặc map
projection change, dừng ticket và mở review mới. Không dùng UIX work item để
che giấu contract delta.
