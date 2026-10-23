# Edge Cases — demo-seed-restart

| Case                                        | Expected behavior                                                           |
| ------------------------------------------- | --------------------------------------------------------------------------- |
| Target thiếu hoặc không phải `civicos_demo` | Fail trước Prisma import/mutation                                           |
| Thiếu confirmation reset                    | Fail với error rõ ràng, không truncate                                      |
| `DEMO_NOW` thiếu/sai timezone               | Fail trước seed                                                             |
| Seed chạy lại                               | Reuse stable key, không duplicate                                           |
| Một phase thất bại                          | Dừng, report phase/error; không báo ready                                   |
| Outbox còn pending/dead-letter              | Verification fail                                                           |
| Projection/SLA/notification orphan          | Verification fail và chỉ rõ resource                                        |
| Actor khác OU                               | API/UI thể hiện forbidden/empty theo existing policy                        |
| Actor không có assignment                   | Không tạo dữ liệu giả; negative state được giữ                              |
| Vehicle actor không có `mobile_read`        | Alarm/detail trả empty hoặc `403` theo current boundary; không lộ existence |
| Vehicle actor khác OU                       | Mobile alarm/detail bị loại hoặc `403`; không bypass bằng `?view=mobile`    |
| Vehicle detail không có `view=mobile`       | Giữ raw web response hiện tại và web mutation semantics                     |
| Vehicle mobile detail có lỗi/not found      | Giữ error envelope/status hiện có; không fallback sang raw detail           |
| Land parcel không có application link       | Public lookup trả not found; fixture không được coi là hoàn chỉnh           |
| Land geometry ngoài provider bounds         | Không dùng làm map acceptance fixture                                       |
| Evidence file thiếu hoặc namespace sai      | Verification fail; cleanup không xoá file ngoài namespace                   |
| TileServer không sẵn sàng                   | Core data demo vẫn verify được; map smoke báo dependency rõ                 |
| Web/worker dùng nhầm database               | Runbook và target log phải phát hiện trước demo                             |
