# Readiness review — khả năng triển khai tự động

- **Ngày:** 2026-09-23
- **Kết luận:** Ticket đủ chi tiết để Planner/Team Dev bắt đầu theo thứ tự, nhưng chỉ sau khi ticket 00 hoàn tất preflight.

## Gaps đã phát hiện và đã xử lý

| Gap trước review | Cách xử lý |
|---|---|
| Chưa có ticket xin quyền/folder/hạ tầng | Thêm `issues/00-agent-preflight-permissions-infra.md` và đặt blocker cho 01–05 |
| Ticket còn cho phép mơ hồ `.env`/`.brain` | Tách rõ `.env*` bị cấm; chỉ evidence folder đúng role được ghi |
| Chưa có protocol khi cần path ngoài scope | Thêm permission matrix, question template và nguyên tắc dừng trước khi sửa |
| Chưa có dependency/native SDK/network gate | Thêm kiểm tra package/license, Docker/Postgres, tile server, Android SDK/ADB, outbound network và port |
| Test/quality gate còn chung chung | Thêm command matrix trong `spec.md#9` và command riêng trong từng ticket |
| E1-005 thiếu contract chi tiết | Thêm model, channel mapping, status transition, command/API và event/SLA contract |
| E1-004 thiếu API/data contract | Thêm Subject/ManagementRecord/Activity/Report fields, endpoints và events |
| E1-007 thiếu command/stat/SLA contract | Thêm command, state/event, Evidence, transfer, 7-day SLA và stats endpoints |
| Mobile chưa có build boundary | Chốt `mobile/` cùng repo, MapLibre RN, read-only boundary, API contract và Android gate |

## Điều kiện còn phải xác minh lúc Planner chạy

- Docker Desktop/PostgreSQL có chạy được không.
- Dependency MapLibre/React Native có cần cài mới không và user có approve package/license/network không.
- Nguồn dữ liệu map OSS tự host đã được user xác nhận; Planner vẫn phải kiểm tra TileServer/PMTiles, download network, disk và port.
- Môi trường Windows có JDK/Android SDK/ADB/emulator để đóng native mobile hay chỉ đóng API/JS contract.
- Các thay đổi có sẵn trong working tree có được giữ nguyên và không bị ticket đụng vào không.

Đây không phải thiếu quyết định nghiệp vụ; đây là preflight runtime có chủ đích của ticket 00. Nếu chưa pass, Planner phải chuyển `needs-info` và gọi Research hỏi user, không tự chọn fallback làm giảm AC.
