# Edge Cases — `ui-auto-demo`

| Tình huống | Hành vi bắt buộc |
|---|---|
| Demo mode tắt | Không hiển thị/enable live runner; application hoạt động như bình thường. |
| Target không phải `civicos_demo` | Preflight `blocked`; không login persona và không mutation. |
| Target URL thiếu hoặc malformed | `blocked` với hướng dẫn operator; không đoán database. |
| Persona provider không sẵn sàng | Dừng ở `authenticating/blocked`; không fallback credential hoặc account khác. |
| Persona alias không tồn tại | Hiển thị lỗi cấu hình an toàn; không thử account production. |
| Login thất bại | Giữ auth error behavior hiện có; run dừng, không retry vô hạn. |
| Persona không có Assignment | Hiển thị forbidden/empty thật; không cấp Assignment tạm. |
| Session hết hạn giữa scene | Dừng action, yêu cầu broker re-auth theo policy; không tự dùng persona khác. |
| Switch persona khi action đang chạy | Pause/stop action hiện tại; không đổi cookie giữa chừng; reload scope sau login mới. |
| Bridge không kết nối | Web scene có thể chạy nếu manifest cho phép; mobile scene `blocked` và giải thích prerequisite. |
| Emulator/device chưa sẵn sàng | `blocked`; không tự start Metro/emulator/ADB/device. |
| Mobile API trả 403/empty/offline/error | Giữ `StateMessage`/`OfflineBanner`/masked/forbidden semantics; không biến thành ready. |
| Mobile action cố gắng POST/PUT/PATCH/DELETE | `WriteGuard`/server block; ghi evidence safe, không retry. |
| Worker không chạy sau web mutation | Mutation success vẫn giữ, downstream step `blocked`/`pending projection`; không tự giả lập event. |
| Map provider/tile không khả dụng | Hiển thị safe state/limitation; không bịa marker/polygon/legal source. |
| Native select chưa mở | `choose-option` không được chạy; step fail/blocked với reason `SELECT_NOT_OPEN`. |
| Option không có hoặc bị disabled | Không ép chọn; giữ validation/blocked behavior của control. |
| Dialog/focus bị mất | Runner chờ focus/visible; timeout thành blocked/failed, không click background. |
| User click ngoài runner | Runner phát hiện ownership conflict; pause hoặc block, không tự overwrite user input. |
| User refresh/back/forward | Run chuyển interrupted; không tự replay mutation; hiển thị resume/restart policy. |
| Pause trong 3-second delay | Hủy timer; resume tạo đúng một timer còn lại, không nhân action. |
| Stop sau mutation đã commit | Không rollback; status `cleanup-pending` và chỉ dẫn operator. |
| Replay create không idempotent | Block trước mutation hoặc yêu cầu clean fixture theo B9; không tạo duplicate. |
| Conflict/version mismatch | Giữ conflict UI hiện có; narrator nói rõ và dừng scene. |
| Network offline trong web mutation | Existing offline/online-required guard thắng; giữ draft nếu component có contract, không tự queue mutation mới. |
| Raw PII/secret xuất hiện trong response | Không đưa vào narrator/evidence; step fail privacy review và dừng. |
| Manifest version stale | Preflight block; không chạy action theo catalog chưa verified. |
| Reduced motion | Vẫn giữ order, explanation, readiness và semantic delay; chỉ giảm animation. |
| Chạy hai run cùng fixture | Block nếu không có isolation/lock; không cho race mutation. |
| Cleanup chưa hoàn tất | Run kết thúc với `cleanup-pending`, không báo “sạch” hoặc “replay-safe”. |
