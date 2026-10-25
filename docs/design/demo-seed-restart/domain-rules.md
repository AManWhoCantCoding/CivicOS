# Domain Rules — demo-seed-restart

## Dữ liệu synthetic

- Không dùng PII, credential thật, token thật hoặc file thật.
- Email/user name/party display đều phải có dấu hiệu synthetic.
- Sensitive field đi qua encryption/masking seam hiện có.

## Determinism và repeatability

- Mọi state phụ thuộc thời gian dùng `DEMO_NOW`/clock context.
- Stable business key/idempotency key dùng để nhận diện fixture; database ID vẫn
  do command hiện có sinh.
- Chạy rebuild lần hai không tạo duplicate aggregate, activity, evidence,
  notification hoặc assignment.

## Ownership

- Aggregate tạo qua domain command.
- Assignment tạo qua identity assignment service.
- Event/audit/SLA/notification/projection tạo qua side-effect service/worker.
- Evidence tạo qua evidence service và file storage adapter.
- Verifier không sửa dữ liệu.

## Permission

- Mỗi fixture có `organizationUnitId` hợp lệ.
- Actor được assign phải cùng OU hoặc đúng policy cấp trên.
- Negative actor không được nhận assignment chỉ để làm UI có dữ liệu.
- Land internal cần actor land hợp lệ; public lookup không bypass sensitive party data.

### DS-09 VehicleObservation mobile

- `VehicleObservation` là canonical resource; không remap sang related-info
  entity type khác.
- Mobile forces chỉ đọc resource có active `mobile_read` Assignment và cùng OU.
- `vehicle_report`/`vehicle_verification` là vehicle web workflow assignments;
  không dùng chúng thay cho mobile permission.
- `?view=mobile` chỉ chọn safe projection; không cấp thêm capability và không
  được gọi các vehicle POST/PATCH command.
- Full plate chỉ xuất hiện trong mobile projection sau khi mobile read boundary
  pass; không trả owner, verification notes, evidence hoặc mutation permissions.

## State coverage

- Mỗi domain phải có tối thiểu một state đang chờ xử lý và một state đã hoàn tất
  hoặc bị từ chối, nếu state đó có trong UI hiện tại.
- Không ép state bằng direct update nếu state machine yêu cầu command transition.

## Map và land

- Point phải nằm trong vùng demo hợp lệ của map.
- Land geometry là Polygon WGS84/SRID 4326, valid và nằm trong `CADN_BOUNDS`.
- Public lookup chỉ thành công khi application và parcel được liên kết.
- Không coi geometry synthetic là ranh giới pháp lý chính thức.
