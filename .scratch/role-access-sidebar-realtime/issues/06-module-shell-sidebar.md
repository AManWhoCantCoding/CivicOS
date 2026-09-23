# 06: Module shell và sidebar Feature

**What to build:** Giữ nguyên các card Module trên dashboard nhưng bổ sung Module shell cho Incident, Inspection, Vehicle và Identity; mỗi shell có sidebar Feature cấp màn hình/work queue, lọc theo quyền và responsive trên desktop/mobile.

**Blocked by:**

- 02: Identity Role catalog, migration và Assignment policy
- 03: Incident authorization và separation of duties
- 04: Inspection authorization theo trách nhiệm
- 05: Vehicle authorization theo vai trò hiện trường

Status: ready-for-agent

## Phạm vi

Module shell và Feature sidebar cho Incident, Inspection, Vehicle và Identity; dashboard cards giữ nguyên.

## File được phép sửa

- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/incidents/**`
- `src/app/inspections/**`
- `src/app/vehicles/**`
- `src/app/assignments/**`
- `src/app/users/**`
- `src/components/navigation/**`
- `src/components/shell/**`
- `src/components/identity/SessionControls.tsx`
- `src/components/identity/AccessDenied.tsx`
- `src/app/globals.css`
- `tests/e2e/module-shell.spec.ts`
- `tests/e2e/login-and-access.spec.ts`

## File cấm sửa

- `src/modules/**`
- `src/app/api/**` ngoài route changes cần thiết để trả denied state đã được policy kiểm soát.
- `src/worker.ts`
- `src/components/incidents/**` ngoài integration với shell.
- `src/components/inspections/**` ngoài integration với shell.
- `src/components/vehicles/**` ngoài integration với shell.
- `prisma/**`

## Acceptance Criteria

- [x] Dashboard cards giữ nguyên nội dung, hành vi mở Module và visual contract hiện tại.
- [x] `/incidents`, `/inspections`, `/vehicles` và `/identity` có Module shell riêng với sidebar Feature.
- [x] Sidebar có đúng Feature đã duyệt: Incident intake/work queue/Assignment; Inspection catalogue/schedule/work queue; Vehicle registry/observation/verification; Identity User/Assignment.
- [x] Feature không được phép bị ẩn khỏi sidebar theo Role, Assignment và OrganizationUnit scope hiện tại.
- [x] Truy cập trực tiếp Feature không được phép trả `403`/denied state từ server, không chỉ bị ẩn bằng client.
- [x] Active Feature, Module context, breadcrumb, focus state và accessible name hiển thị đúng.
- [x] Desktop hỗ trợ sidebar mở/thu gọn; mobile hỗ trợ drawer, focus trap và đóng drawer sau navigation.
- [x] Trạng thái loading, empty, error, denied và offline nhất quán với visual direction trust-first dark.
- [x] Sidebar không tự quyết định quyền và không làm lộ danh sách Feature/resource ngoài scope.

## Các bước thực hiện

- [x] Bước 1: Viết failing browser tests cho dashboard card preservation, shell per Module, Feature visibility, deep-link denial, keyboard focus và mobile drawer.
- [x] Bước 2: Tạo Feature registry dùng chung, mỗi Feature khai báo Module, route và requirement capability mà không chứa dữ liệu nhạy cảm.
- [x] Bước 3: Xây Module shell/sidebar responsive với active state, breadcrumb, collapsed state, drawer và reduced-motion fallback.
- [x] Bước 4: Gắn shell vào Incident, Inspection, Vehicle và Identity mà không thay đổi domain command/API.
- [x] Bước 5: Đồng bộ client visibility với server denied state và thêm empty/error/offline states theo design system.
- [x] Bước 6: Chạy module-shell E2E trên desktop/mobile, accessibility checks, lint và typecheck.

## Trạng thái

ready-for-agent

## Lịch sử wontfix

Ticket chưa thể bắt đầu vì các blocker 02–05 đều chưa thể hoàn tất sau khi Ticket 01 phải đóng `wontfix` do harness chặn ghi ADR policy bắt buộc trong `docs/**`. Không có bước nào của Ticket 06 được thực thi, không có file bị thay đổi. Có thể yêu cầu làm lại sau khi các blocker được mở lại và hoàn tất.

## Reopened

Reopened after blockers 02–05 reached `done`; the user requested continuing the remaining tickets.
