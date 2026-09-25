# Scope change — ticket 04

- Trước khi Research hỏi user, ticket chỉ cho phép sửa module inspection/routes/schema/tests; `src/modules/eventing/event-catalog.ts` nằm ngoài scope và chưa có AC riêng cho event transfer.
- Research xác nhận user chọn **“Mở rộng scope”**: cho phép sửa `src/modules/eventing/event-catalog.ts`, chỉ thêm `EnforcementTransferred` và giữ nguyên semantics của các event hiện có.
- Ticket đã được Research cập nhật với `Loại: feature`, `Gate hướng: có`, scope mới và AC đăng ký `EnforcementTransferred`.
- Quyết định điều phối: tiếp tục ticket 04 theo scope/AC mới; không đổi các AC khác và không sửa event catalog ngoài event được user duyệt.
