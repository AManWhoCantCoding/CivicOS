# Đồng bộ UI/UX CivicOS theo baseline Light/Blue

## Trạng thái và phạm vi

- Baseline Light/Blue dùng chung cho web và mobile đã được người dùng duyệt; giá trị token chuẩn nằm tại `.scratch/civicos-ui-design-system/ui/design-tokens.md`.
- Tài liệu này giới hạn work item ở presentation của các bề mặt đang tồn tại. Việc chỉnh sửa giao diện không đồng nghĩa với nghiệm thu redesign toàn dự án.
- Kiểm chứng trực quan trực tiếp trên trình duyệt vẫn còn thiếu; không tuyên bố hoàn tất cho đến khi các bề mặt liên quan được rà soát.

## Mục tiêu

Tạo trải nghiệm quản trị CivicOS nhất quán, sáng rõ và phù hợp môi trường cơ quan nhà nước Việt Nam: nền sáng trung tính, màu hành động xanh, thứ bậc nội dung dễ quét, trạng thái có nhãn rõ và thao tác có focus/accessible name.

## Bề mặt áp dụng

- **Web:** shell và điều hướng; danh sách, chi tiết, biểu mẫu và trạng thái hiện có của Identity, Incidents/Intake, Residents, Inspections, Land, Map, Vehicles, Field và Demo.
- **Mobile:** đăng nhập, điều hướng, cài đặt và các màn hình hiện có của Map, Land, Related information, Alarm, Dispatch, Task và Vehicle observation.
- Chỉ áp dụng cho route/screen hiện có. Không tạo màn hình, route, action hoặc capability nghiệp vụ mới trong work item này.

## Chuẩn trình bày

- Dùng đúng token trong design system đã duyệt: canvas `#F8FAFC`, surface `#FFFFFF`, text `#172033`/`#475569`, accent `#075985`, focus `#1D4ED8` và các màu semantic tương ứng.
- Dùng typography system sans; monospace cho mã, timestamp và version. Giữ scale spacing `4/8/12/16/24/32/48px`, radius `6/10/16px` và control tối thiểu `44px`.
- Không dùng gradient, neon, glow, màu đen tuyệt đối hoặc chỉ dựa vào màu để biểu đạt trạng thái.
- Giữ nội dung tiếng Việt, thuật ngữ domain và thông tin quan trọng; cho phép nhãn dài xuống dòng thay vì cắt mất nghĩa.

## Bất biến sản phẩm

- Giữ nguyên API, dữ liệu, phân quyền, Assignment, masking, state machine, route đích, hành vi offline và luồng thao tác hiện hữu.
- Không mở rộng quyền hoặc capability mobile để đạt visual parity; các allowlist đã được duyệt riêng tiếp tục được giữ nguyên.
- Không hiển thị PII, raw payload, dữ liệu hoặc hình học ngoài scope. Giữ nhãn `internal / simulated`; không tạo tuyên bố pháp lý, chính thức hoặc chứng nhận.
- Giữ map provider/projection boundary, stale/offline handling và quy tắc không lưu/render polygon đất từ offline cache.

## Trạng thái và accessibility

Loading, empty, ready, warning/stale, error/conflict, forbidden/masked, offline và simulated phải giữ đúng ý nghĩa hiện có, có text/icon phù hợp và không giả thành công.

Focus-visible dùng `--civicos-focus`; không làm mất keyboard navigation, accessible name, retry/reload, back, confirmation hoặc cảnh báo unsaved changes. Kiểm tra nhãn dài và viewport hẹp.

## Tiêu chí hoàn tất

1. Các bề mặt trong phạm vi dùng chung baseline Light/Blue và không còn lệch palette/layout không chủ ý.
2. Hành vi sản phẩm và các bất biến ở trên không thay đổi.
3. Typecheck, lint và các test hồi quy liên quan có kết quả được ghi nhận.
4. Rà soát trực quan trên web `1440 × 900` và mobile `390 × 844` hoàn tất; lỗi hiển thị và accessibility còn lại được ghi rõ.

## Tài liệu tham chiếu

- `.scratch/civicos-ui-design-system/ui/design-tokens.md`
- `.scratch/civicos-ui-design-system/ui/prototype.md`
- `docs/design/civicos-ui-design-system/`
- `docs/adr/0003-shared-civicos-ui-design-tokens.md`
- `docs/adr/0004-civicos-uiux-alignment.md`
