# Thiết kế tính năng: civicos-ui-design-system

- **Trạng thái:** B9 `APPROVED` — người dùng duyệt kết luận **no data-model impact**.
- **Phạm vi:** migration trình bày UI-only cho các surface web/mobile đã được phê duyệt.
- **Nguồn contract:** `.scratch/civicos-ui-design-system/ui/design-tokens.md`, `prototype.md`, `stitch-screens.md`, `test-scenarios.md`, `data-model-assessment.md`.

## Vấn đề / giải pháp

CivicOS cần một baseline trình bày Light/Blue thống nhất giữa web và mobile. Giải pháp là áp dụng các token màu, typography, spacing, shape, focus và semantic state đã được duyệt vào các component/surface hiện có; không thay đổi domain behavior.

## Phạm vi được duyệt

- Shared Light/Blue token baseline và semantic state presentation.
- Web foundation, shell, navigation và các surface Residents, Intake, Inspection, Land, map trong các đường dẫn đã ghi tại `ui/design-tokens.md`.
- Mobile primitives và các surface Map, Related Info, Alarm, Dispatch, Task và Land đã ghi tại `ui/design-tokens.md`.
- Screen set canonical và composite board đã được duyệt trong `ui/stitch-screens.md` và `ui/prototype.md`.
- Giữ copy `internal / simulated`, masked values, trạng thái loading/empty/error/forbidden/stale/offline và các boundary đã có.

## Boundary và tương thích

- Giữ nguyên API paths, method, request/response/error contracts và các route/navigation destination hiện có.
- Không tạo API mới, data model mới, bảng/cột/quan hệ/index/migration/seed mới.
- Không thay đổi permission, Assignment, masking, state machine, map projection allowlist, offline policy hoặc business action.
- Không bổ sung legal rule, retention rule, public claim hay permission mới; nhãn dữ liệu mô phỏng không phải tuyên bố pháp lý.
- Thay đổi chỉ được giới hạn ở token, layout và component presentation trong approved paths; nếu phát sinh behavior/API/data change phải mở review mới.

## Contract summary

Feature này là một compatibility-preserving presentation migration. Các API, read model, persistence và domain constraints hiện có tiếp tục là nguồn sự thật; tài liệu này không định nghĩa behavior mới.
