# 02: Identity, Assignment và quyền truy cập

**What to build:** Cung cấp đăng nhập development, User/Role/OrganizationUnit, Assignment theo hồ sơ, quyền của Trưởng Công an xã và người được phân công, AuditEvent cho dữ liệu nhạy cảm, và mã hóa application-level tối thiểu để các vertical slice có thể kiểm soát truy cập từ API đến UI.

**Blocked by:** 01: Event kernel và transactional outbox

**Status:** ready-for-agent

## Files in scope

- `prisma/schema.prisma`: thêm User profile, Role, OrganizationUnit, Assignment, Session và AuditEvent; thêm quan hệ/index không trùng với aggregate của module nghiệp vụ.
- `prisma/migrations/<timestamp>_identity_access/migration.sql`: migration Identity/access.
- `src/modules/identity/index.ts`: public entry point.
- `src/modules/identity/contracts.ts`: User, Actor, Role, OrganizationUnit, Assignment và authorization contracts.
- `src/modules/identity/local-provider.ts`: development IdentityProvider; không phải production OIDC implementation.
- `src/modules/identity/session.ts`: session parsing/creation/expiration.
- `src/modules/identity/authorization.ts`: command/query authorization theo Role, command scope và Assignment.
- `src/modules/identity/audit.ts`: ghi AuditEvent qua Event kernel.
- `src/modules/identity/encryption.ts`: application-level encryption và blind-index interface cho trường cần tìm kiếm.
- `src/app/api/auth/session/route.ts`: development session endpoint.
- `src/app/api/identity/users/route.ts`: user/role management tối thiểu cho development.
- `src/app/api/identity/assignments/route.ts`: tạo, thu hồi và đọc Assignment.
- `src/app/login/page.tsx`: login UI development.
- `src/components/identity/LoginForm.tsx`: login form với loading/error/invalid-session states.
- `src/components/identity/AccessDenied.tsx`: access-denied state dùng chung.
- `tests/identity/authorization.integration.test.ts`: role, command scope, assignment và revocation tests.
- `tests/identity/audit.integration.test.ts`: sensitive-read/change audit tests.
- `tests/e2e/login-and-access.spec.ts`: login và access boundary browser test.

## Implementation steps

- [x] 1. **Xác định và kiểm tra authorization matrix có thể tái lập:** phải có case/test cho commander, assigned user, same-unit unassigned user, revoked assignment và unrelated organization; mỗi ô phải map được thành một test case trước khi ticket được đóng.

> **Change rationale:** S1 được chuyển từ yêu cầu chứng minh thứ tự lịch sử sang yêu cầu verification có thể tái lập, vì Git history không thể chứng minh thứ tự cũ.
- [x] 2. **Thiết kế Identity schema.** Thêm User profile, Role, RoleBinding, OrganizationUnit, OrganizationMembership, Assignment, Session và AuditEvent; Assignment phải có subject/record reference, task scope, assignees, granted/revoked timestamps và Actor thực hiện.
- [x] 3. **Tạo migration và seed development.** Tạo một Trưởng Công an xã, một cán bộ được phân công, một cán bộ không được phân công và một OrganizationUnit cấp trên; seed chỉ dùng dữ liệu development, không chứa secret hoặc dữ liệu thật.
- [x] 4. **Implement local IdentityProvider và session.** Tạo login/logout/session validation tối thiểu, HttpOnly cookie, expiration và invalid-session path. Giữ interface để production OIDC/SSO thay provider mà không đổi domain authorization.
- [x] 5. **Implement authorization service.** Tách `canRead`, `canMutate`, `canAssign`, `canApprove` và `canViewSensitive`; kiểm tra tại API/domain boundary trước khi truy cập projection hoặc Evidence. Không dùng component visibility làm security boundary.
- [x] 6. **Implement Assignment lifecycle.** Cho phép Trưởng Công an xã tạo, thêm nhiều assignee, thu hồi và truy vấn Assignment; tạo event/audit cho mỗi thay đổi; không cho module nghiệp vụ tự sửa Assignment table.
- [x] 7. **Implement AuditEvent và encryption boundary.** Ghi sensitive read/download/mutation với Actor, resource, operation, timestamp và correlation ID; mã hóa informant identity/CCCD/criminal-history fields, giữ blind-index riêng nếu cần tìm kiếm.
- [x] 8. **Expose API và UI development.** Tạo session, user/role, assignment endpoints và login/access-denied screens; mọi route phải có server authorization, validation, status code và error shape nhất quán.
- [x] 9. **Viết tests theo matrix.** Integration test đủ allow/deny/revoke/cross-unit, audit and encryption tests; browser test thử login, session expiry, direct URL tampering và denied state.
- [x] 10. **Chạy verification gate.** Kiểm tra không có sensitive plaintext trong log/database test fixture, lint/typecheck/build/e2e pass, và public identity entry point không export database internals.

## Explicitly out of scope

- Không triển khai OIDC/SSO provider thật; chỉ giữ adapter boundary.
- Không cấp quyền toàn bộ theo OrganizationUnit cho User không được phân công.
- Không xây user-management dashboard đầy đủ.
- Không thêm domain fields của Incident, Inspection hoặc VehicleObservation.

## UI requirements

Áp dụng `design-taste-frontend` theo hướng: **trust-first public-sector operations UI for internal police officers**, `DESIGN_VARIANCE=3`, `MOTION_INTENSITY=2`, `VISUAL_DENSITY=5`. Dùng Tailwind hiện có, bố cục rõ ràng, tương phản WCAG AA, không gradient/glass/neon, không dùng layout marketing, có trạng thái loading/empty/error/focus và hoạt động tốt trên desktop/mobile. Animation phải tôn trọng `prefers-reduced-motion`.

## Acceptance criteria

- [x] User có thể đăng nhập bằng development IdentityProvider và nhận session HttpOnly có expiration.
- [x] Role, OrganizationUnit và Assignment được lưu bền vững, có trạng thái active/revoked và audit lịch sử thay đổi.
- [x] Trưởng Công an xã xem được record trong command scope; User được phân công xem được record liên quan; User không được phân công bị từ chối.
- [x] Thu hồi Assignment cắt quyền đọc mới nhưng không xóa AuditEvent hoặc lịch sử nghiệp vụ.
- [x] Authorization được kiểm tra ở API/domain boundary, không chỉ ẩn nút trên UI.
- [x] Sensitive read, download và mutation đều tạo AuditEvent có Actor, record, thời điểm và lý do/operation.
- [x] Encryption key không nằm trong database; test chứng minh plaintext sensitive value không xuất hiện trong persistent payload hoặc log.
- [x] Login, denied và expired-session UI có label trên input, focus state, error inline và không dùng placeholder thay label.
- [x] Browser test chứng minh User không được phân công không thể truy cập trực tiếp URL/API bằng cách sửa ID.
- [x] `npm run lint`, `npm run build` và toàn bộ identity tests pass.
