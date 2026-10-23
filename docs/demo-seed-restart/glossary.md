# Glossary — demo-seed-restart

| Term                     | Nghĩa trong work item                                                             |
| ------------------------ | --------------------------------------------------------------------------------- |
| Demo seed                | Bộ dữ liệu synthetic được tạo cho một phiên demo, không phải production migration |
| Rebuild                  | Quy trình validate, reset, migrate, seed, drain và verify từ đầu                  |
| Fixture                  | Một record/scenario synthetic có stable business key                              |
| Persona                  | User/role/OU dùng để trình diễn một permission boundary                           |
| Derived state            | Event, outbox, projection, SLA, notification, audit tạo từ command                |
| Mobile read-only         | Mobile chỉ đọc dữ liệu được giới hạn bởi Assignment                               |
| `mobile_read`            | Task capability read-only riêng cho mobile VehicleObservation; không có mutation  |
| Mobile projection        | Safe response projection cho mobile; không phải raw web detail response           |
| VehicleObservation alert | Alarm/force item giữ explicit `resourceType` và `resourceId` của observation      |
| Land public lookup       | Tra cứu anonymous projection bằng application/parcel code                         |
| Demo namespace           | Marker metadata dùng để nhận diện và cleanup Evidence demo                        |
| Ready for demo           | Seed và verification pass; không còn unresolved data/integration gap              |
