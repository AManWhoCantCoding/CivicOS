# Mũ Đỏ — cảm nhận và niềm tin

## Quan sát

- Người dân cần phân biệt rõ dữ liệu mô phỏng với hồ sơ pháp lý thật; mọi public response cần nhãn `simulated: true`.
- Tra cứu công khai nên hữu ích nhưng tối thiểu: trạng thái hồ sơ/thửa và các mốc thời gian, không lộ party, địa chỉ đầy đủ hay polygon.
- Cán bộ cần thấy timeline và trạng thái lỗi rõ ràng để không nhầm `sync_failed` là đã hoàn tất.
- Khi upload Evidence hoặc gặp conflict/offline, dữ liệu nhập nên được giữ để người dùng có thể retry.

## Hệ quả cho feature-list

- Giữ F-05 public lookup và F-07 Evidence immutable.
- Tách trạng thái loading, empty, forbidden, offline, conflict và simulated trong UI handoff.
- Không dùng từ “official”, “certified” hay “government record” cho fixture mock.
