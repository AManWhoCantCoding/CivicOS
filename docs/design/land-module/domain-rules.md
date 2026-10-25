# Quy tắc nghiệp vụ: land-module

## DR-01: Demo không có giá trị pháp lý

- Mô tả: Mọi API nội bộ chạy thật trên dữ liệu giả lập; adapter quốc gia là mock duy nhất; response public có `simulated: true`.
- Điều kiện kích hoạt: Mọi create, sync, approve, lookup.
- Hành vi khi vi phạm: Từ chối gọi hệ thống ngoài hoặc gắn nhãn kết quả pháp lý; trả `LAND_INVALID_REQUEST`.
- Nguồn: nghiệp vụ đã chốt; `docs/research/land-module/law-summary.md:46-50,152-161`.
- Nơi enforce: service và integration adapter.

## DR-02: Party là chủ thể đất đai riêng

- Mô tả: `LandParty` không dùng `User` hoặc `Subject`; `createdById` chỉ là actor cán bộ.
- Điều kiện kích hoạt: Tạo link party với application/right/encumbrance.
- Hành vi khi vi phạm: Không cho ghi ID của User/Subject vào `LandParty`.
- Nguồn: nghiệp vụ B4.5; `data-model.md:16-21,44-58`.
- Nơi enforce: service và FK/logical reference boundary.

## DR-03: Bảo vệ dữ liệu party

- Mô tả: `displayName` và `identityNumber` chỉ lưu ciphertext; blind index chống trùng; identity number không trả đầy đủ.
- Điều kiện kích hoạt: Create/read party và mọi response nội bộ.
- Hành vi khi vi phạm: Từ chối plaintext storage; response chỉ trả mask identity number.
- Nguồn: `docs/research/land-module/law-summary.md:53-65`; B6 Q19.
- Nơi enforce: encryption service, repository và response mapper.

## DR-04: Geometry của parcel

- Mô tả: Parcel phải có GeoJSON `Polygon`, SRID 4326, geometry valid; không nhận Point.
- Điều kiện kích hoạt: Tạo hoặc cập nhật parcel/split/merge result.
- Hành vi khi vi phạm: Trả `LAND_GEOMETRY_INVALID`, không tạo hoặc mutate row.
- Nguồn: B4.5 `data-model.md:60-80`; B6 Q20.
- Nơi enforce: PostGIS CHECK, geometry repository và service.

## DR-05: Mã nghiệp vụ duy nhất

- Mô tả: `referenceCode`, `parcelCode`, `applicationCode` và identity blind index không trùng trong phạm vi unique đã thiết kế.
- Điều kiện kích hoạt: Create party, parcel hoặc application.
- Hành vi khi vi phạm: Trả `409 LAND_DUPLICATE_CODE`, transaction rollback.
- Nguồn: `data-model.md:48-56,64-82,124-134`.
- Nơi enforce: database unique index và service mapping.

## DR-06: Application phải có quan hệ bắt buộc

- Mô tả: Application phải có application code, actor, links party/parcel phù hợp `changeType` trước khi ở `submitted`.
- Điều kiện kích hoạt: `POST /api/land/applications`.
- Hành vi khi vi phạm: Trả `400 LAND_INVALID_REQUEST`, không tạo application.
- Nguồn: `data-model.md:215-226`; B6 Q20/Q22.
- Nơi enforce: request schema và application service.

## DR-07: Idempotency khi tạo application

- Mô tả: `Idempotency-Key` bắt buộc; cùng key và cùng payload trả cùng application; cùng key với payload khác trả conflict.
- Điều kiện kích hoạt: Create application retry.
- Hành vi khi vi phạm: `400 LAND_INVALID_REQUEST` nếu thiếu; `409 LAND_IDEMPOTENCY_CONFLICT` nếu khác payload.
- Nguồn: `data-model.md:131-134`; B6 Q21.
- Nơi enforce: service transaction và unique partial index.

## DR-08: Máy trạng thái application (D-66)

- Mô tả: Chỉ các transition `submitted→in_review`, `in_review→pending_approval|sync_failed`, `sync_failed→pending_approval|sync_failed`, `pending_approval→completed|rejected` được phép. Mock sync chạy đồng bộ; không persist application state `sync_pending`/`sync_succeeded`. Reject chỉ sau sync thành công ở `pending_approval`.
- Điều kiện kích hoạt: Mọi command transition.
- Hành vi khi vi phạm: `409 LAND_INVALID_TRANSITION`, version không đổi; không cho approve/reject khi sync chưa thành công.
- Nguồn: `data-model.md:213-226`; USER-APPROVED D-66 (2026-10-24).
- Nơi enforce: application aggregate service.

## DR-09: Scope và role cán bộ

- Mô tả: `land_officer` và `commune_leader` chỉ thao tác trong `OrganizationUnit` của mình; public lookup không cần session.
- Điều kiện kích hoạt: Mọi endpoint nội bộ.
- Hành vi khi vi phạm: `401 LAND_UNAUTHENTICATED` hoặc `403 LAND_FORBIDDEN`.
- Nguồn: `data-model.md:21,31-40`; B6 Q3.
- Nơi enforce: session, authorization policy và service scope check.

## DR-10: Assignment review bắt buộc

- Mô tả: Officer chỉ được review/sync/retry application có Assignment active task `land_review`; leader có quyền approve/reject trong cùng đơn vị.
- Điều kiện kích hoạt: Review, sync, retry và đọc resource officer.
- Hành vi khi vi phạm: `403 LAND_ASSIGNMENT_REQUIRED` hoặc `LAND_FORBIDDEN`.
- Nguồn: `src/modules/identity/assignments.ts:65-83,240-275`; B6 Q13.
- Nơi enforce: identity policy và land command service.

## DR-11: Assignment do leader cấp

- Mô tả: `commune_leader` tạo/revoke Assignment; officer không tự cấp quyền.
- Điều kiện kích hoạt: `POST`/`DELETE /api/identity/assignments` cho resource land.
- Hành vi khi vi phạm: `403 LAND_FORBIDDEN`; Assignment khác đơn vị bị từ chối.
- Nguồn: route hiện có `src/app/api/identity/assignments/route.ts:28-73,76-105`; mở rộng role là mới, B6 Q13.
- Nơi enforce: authorization policy và identity assignment service.

## DR-12: Transfer bảo toàn tỷ lệ

- Mô tả: Transfer phải có current holder, proposed holder, subject parcel; tổng active share sau completed bằng `100.00`.
- Điều kiện kích hoạt: Create và complete `changeType=transfer`.
- Hành vi khi vi phạm: `400 LAND_INVALID_REQUEST` trước review hoặc `409 LAND_INVALID_TRANSITION` nếu không thể complete.
- Nguồn: `data-model.md:228-235`; B5 mũ Đen và B6 Q7.
- Nơi enforce: application service, transaction và database decimal CHECK.

## DR-13: Information update bị giới hạn field

- Mô tả: Chỉ `address` hoặc `landUseType` được sửa qua `information_update`.
- Điều kiện kích hoạt: Validate `changePayload`.
- Hành vi khi vi phạm: `400 LAND_INVALID_REQUEST`.
- Nguồn: `data-model.md:141-148,230-231`; B6 Q7.
- Nơi enforce: request schema và service.

## DR-14: Mortgage register/release

- Mô tả: Register cần subject parcel và secured party; release cần một `LandEncumbrance` active; chỉ completed mới mutate encumbrance.
- Điều kiện kích hoạt: `changeType=mortgage`.
- Hành vi khi vi phạm: `400 LAND_INVALID_REQUEST` hoặc `409 LAND_INVALID_TRANSITION`.
- Nguồn: `data-model.md:102-118,232`; B6 Q7.
- Nơi enforce: service transaction.

## DR-15: Parcel split/merge

- Mô tả: Hồ sơ phải có source và result; result giữ `proposed` trước completed, source/result chỉ được đổi khi completed.
- Điều kiện kích hoạt: `changeType=parcel_split_merge`.
- Hành vi khi vi phạm: `400 LAND_INVALID_REQUEST`; không tạo geometry result không hợp lệ.
- Nguồn: `data-model.md:162-171,233`; B6 Q7.
- Nơi enforce: geometry service, application service và transaction.

## DR-16: Sync mock không mutate quyền

- Mô tả: Sync success chỉ chuyển hồ sơ tới `pending_approval`; không tạo/cập nhật `LandRight`, `LandParcel` hoặc `LandEncumbrance`.
- Điều kiện kích hoạt: Adapter mock trả success.
- Hành vi khi vi phạm: Transaction rollback; không tạo Approval nếu sync failed.
- Nguồn: `data-model.md:173-192,223-235`; B6 Q4/Q14.
- Nơi enforce: sync command service và aggregate boundary.

## DR-17: Retry sync idempotent

- Mô tả: Retry `sync_failed` dùng cùng application và `requestKey`, tăng attempts, không tạo operation logic thứ hai.
- Điều kiện kích hoạt: `POST /sync/retry`.
- Hành vi khi vi phạm: `LAND_INVALID_TRANSITION` nếu chưa failed; duplicate request không tạo row mới.
- Nguồn: `data-model.md:180-190`; B6 Q5/Q14.
- Nơi enforce: unique index và mock adapter.

## DR-18: Approval và hoàn tất

- Mô tả: Chỉ `commune_leader` được approve/reject `pending_approval` sau sync thành công; approve ghi Approval rồi mutate land trong cùng transaction.
- Điều kiện kích hoạt: Approve/reject command.
- Hành vi khi vi phạm: `403 LAND_FORBIDDEN`; thiếu reason khi reject trả `400 LAND_INVALID_REQUEST`.
- Nguồn: `data-model.md:36,223-226`; B6 Q3/Q22.
- Nơi enforce: authorization, application service và transaction.

## DR-19: Event và audit bất biến

- Mô tả: Mỗi mutation application, sync, approval, assignment và land aggregate tạo EventRecord/AuditEvent; payload không chứa plaintext ciphertext sau giải mã.
- Điều kiện kích hoạt: Transaction nghiệp vụ commit.
- Hành vi khi vi phạm: Rollback toàn transaction; không để state thiếu event/audit.
- Nguồn: `src/modules/identity/audit.ts:24-77`; `src/modules/eventing/event-store.ts:109-188`; `data-model.md:235`.
- Nơi enforce: transaction boundary và event/audit service.

## DR-20: Public lookup tối thiểu

- Mô tả: Phải cung cấp đúng một query param; response chỉ có 8 trường lookup và `simulated=true`; không trả party, PII, polygon, sync, approval hoặc evidence.
- Điều kiện kích hoạt: `GET /api/public/land/lookup`.
- Hành vi khi vi phạm: Query cả hai/không có → `400 LAND_LOOKUP_QUERY_INVALID`; không thấy → `404 LAND_LOOKUP_NOT_FOUND`.
- Nguồn: `data-model.md:238-244`; B6 Q6/Q24; `law-summary.md:53-65`.
- Nơi enforce: route validation, query projection và response mapper.

## DR-21: Evidence bất biến

- Mô tả: Evidence chỉ nhận PDF/JPEG/PNG tối đa 10 MiB; adapter tạo SHA-256; sau tạo không sửa metadata/file qua land API.
- Điều kiện kích hoạt: Upload Evidence.
- Hành vi khi vi phạm: `LAND_EVIDENCE_TYPE_UNSUPPORTED` hoặc `LAND_EVIDENCE_TOO_LARGE`.
- Nguồn: `src/modules/platform/evidence/storage-adapter.ts:11-19,46-67`; B6 Q16/Q23.
- Nơi enforce: multipart parser, service và EvidenceStorageAdapter.

## DR-22: Không hard-delete lịch sử

- Mô tả: Party, parcel, right, encumbrance, application và sync dùng status/validTo/releasedAt/retired/archived; không xóa row nghiệp vụ đã tham chiếu.
- Điều kiện kích hoạt: Mọi delete request hoặc cleanup.
- Hành vi khi vi phạm: Không expose delete endpoint; FK RESTRICT bảo vệ lịch sử.
- Nguồn: `data-model.md:209-211,246-253`; B6 Q7.
- Nơi enforce: schema FK, service và API surface.
