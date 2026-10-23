# Thiết kế — demo-seed-restart

## Trạng thái

- Route: `FULL_FEATURE`.
- B5 feature-list: đã được user xác nhận.
- B6: baseline đã được user xác nhận; DS-09 amendment đã chốt summary/detail,
  Assignment `mobile_read`, `?view=mobile` và full plate, nhưng cần re-lock sau
  khi các gate DS-09 hoàn tất.
- B7: UI artifacts đã materialize và local prototype wiring pass; provider index
  hiện vẫn `PROVIDER_INDEX_STALE`.
- Work item `demo-seed-complete` không phải nguồn requirement của thiết kế này;
  đã đóng vĩnh viễn theo chỉ đạo user.

## Mục tiêu

Tạo một bộ dữ liệu synthetic, repeatable và an toàn để trình diễn **tất cả
surface hiện có** của CivicOS:

- core web: identity, residents, intake/incidents, inspections, vehicles;
- mobile read-only: related-info, map, alarms, dispatch/task;
- map/basemap và land parcel projection;
- land internal workspace và public lookup;
- evidence, SLA, notification, event/projection và permission/error states.

## Không thay đổi production behavior

Baseline work item chỉ tạo/điều phối dữ liệu demo và verification. DS-09 là
change contract riêng: mở rộng read projection/API response có kiểm soát cho
VehicleObservation mobile; không mở mutation, schema hoặc migration nếu B9 không
chứng minh cần.

## Narrative demo tối thiểu

1. `commander` đăng nhập, xem workspace/map và danh sách aggregate.
2. `duty_officer` xem Intake ở nhiều trạng thái và một Incident đã convert.
3. `office_officer` xem resident list/detail và monthly report states.
4. `field_officer` xem mobile related-info, assignment và notification.
5. `commander` xem Inspection scheduled/in-progress/completed và recommendation.
6. `field_officer` xem Vehicle registry/observation/verification/escalation và
   mobile forces có VehicleObservation alert/detail read-only khi có
   `mobile_read` assignment.
7. `land_officer` xem parcel/party/application/evidence/timeline.
8. Anonymous user tra cứu land bằng `parcelCode` hoặc `applicationCode`.
9. `field_officer` không được phân công nhận empty/forbidden đúng policy.

## Bộ dữ liệu đại diện mới

Đây là minimum representative dataset của work item mới, không phải count/manifest
cũ:

| Domain          | Required representative data                                                                                                  |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Identity        | 2 OU hiện có, 8 role core hiện có, các account development hiện có; thêm user land synthetic cho internal land                |
| Residents       | 3 Subject, 3 management record, 3 activity, 3 monthly report                                                                  |
| Intake/Incident | Tối thiểu 4 Intake và 4 Incident phủ received/verified/processed/rejected hoặc completed                                      |
| Inspection      | Tối thiểu 3 Establishment, template tương ứng, inspection scheduled/in-progress/completed, finding và recommendation          |
| Vehicle         | Tối thiểu 3 registry/observation phủ recorded/match/escalated, ít nhất 1 verification                                         |
| Mobile          | Ít nhất 1 assignment `mobile_read` cho mỗi entity type, thêm 1 VehicleObservation `mobile_read`, và 1 actor không được assign |
| Map             | Coordinates hợp lệ cho các aggregate map được; parcel polygon hợp lệ trong CADN bounds                                        |
| Land            | Party, parcel, right, application, party/parcel links, evidence và timeline                                                   |
| Evidence        | Synthetic files có namespace demo, đủ cho resident/inspection/vehicle/land flow                                               |
| Derived         | Event, outbox, projection, SLA, notification và audit do command/worker tạo                                                   |

## Nguyên tắc seed

Seed theo thứ tự:

```text
target/clock validation
→ migrate
→ reset
→ identity
→ residents
→ intake/incidents
→ inspections
→ vehicles
→ land
→ assignments
→ worker drain
→ API/read verification
```

Không insert trực tiếp bảng derived để làm dữ liệu có vẻ đầy.
