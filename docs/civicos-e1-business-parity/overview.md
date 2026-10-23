# Thiết kế B6 — CivicOS E1 Business Parity

**Trạng thái:** B6 design draft — chờ user gate trước B7  
**Ngày:** 13-10-2026  
**Phạm vi:** PS-E1-004, PS-E1-005, PS-E1-007 và mobile nội bộ parity.  
**Không thay thế:** contract bounded context Land tại
`docs/land-module/**` và `docs/land-parcel-map/**`.

## 1. Nguồn và quan hệ với thiết kế cũ

- Business source chính: `D:\Project\news-map-main\news-map-main\PS-E1-001_to_010_DayDu.md`, các mục PS-E1-004/005/007.
- Mobile-operation source tham chiếu: `D:\Project\force-app-main\force-app-main\Product_Requirement_Document_CA.md` và các mobile guide/code pattern trong cùng repo.
- AS-IS CivicOS: `CONTEXT.md`, `docs/civicos-e1-clone-mvp/**`,
  `mobile/src/**`, `src/modules/**`, `src/app/api/**`.
- B5 artifacts: `.scratch/civicos-uiux-rebuild/reference-requirements-crosswalk.md`,
  `mobile-capability-matrix.md`, `feature-list.md`.

Tài liệu này **supersede phần target mobile read-only** của
`docs/civicos-e1-clone-mvp/**` sau khi được user duyệt. Các business
boundary, state machine, permission, masking, Evidence, SLA, Audit và Land
contract cũ vẫn được giữ trừ delta ghi rõ tại đây. Đây là design behavior, chưa
phải data model hay implementation plan.

## 2. Vấn đề và kết quả mong muốn

### Vấn đề

CivicOS đã có các web command cho ba story E1 và một mobile shell thiên về đọc.
Tuy nhiên mobile chưa có Residents/Inspections surface, E1-005 chỉ có Incident
summary GET, mọi write bị `WriteGuard` chặn, và các pattern tác nghiệp từ hai repo
gốc chưa được chuyển thành capability contract có Assignment, Evidence/GPS,
offline, masking, audit và conflict rõ ràng.

### Kết quả

1. Ba story E1 đạt business intent của source với current CivicOS boundary.
2. Mobile nội bộ cho cán bộ được authenticate có action/write có kiểm soát; không
   còn mặc định read-only.
3. Offline chỉ hoạt động trên command allowlist an toàn; sensitive reveal,
   Intake transfer/close và approval không được queue offline.
4. Land được tích hợp về experience/navigation nhưng không nhập business boundary
   hoặc source parity của hai repo gốc.
5. PS-E1-009 bị remove theo structural-removal contract riêng; không có Vehicle
   navigation, deep link, seed, API hoặc test contract mới.

## 3. Actors và authority

| Actor | Trách nhiệm trong tranche | Quyền mobile chính |
|---|---|---|
| `commander` | Phê duyệt, phân công, xem dữ liệu nhạy cảm theo policy, chuyển cấp trên, approve report/recommendation | Online authority actions; không offline approval/sensitive reveal |
| `duty_officer` | Tiếp nhận/verify/classify IntakeReport, quản lý hồ sơ được giao | E1-005 online mutation; E1-004 record action khi được Assignment |
| `field_officer` | Xác minh hiện trường, follow-up Subject, thực hiện Inspection | E1-004 activity offline allowlist; E1-005 field update online; E1-007 field command/offline draft |
| `village_officer` | Theo dõi Subject được giao tại địa bàn | E1-004 queue/activity theo Assignment |
| `office_officer` | Nhập liệu, danh mục và báo cáo theo OU | Online setup/report actions; không tự vượt Assignment |
| `superior_officer` / `superior_commander` | Tiếp nhận/chỉ huy cấp trên theo OrganizationUnit | Chỉ thấy projection/command được server cấp; không mở global read |
| `Subject` / người tố giác / chủ cơ sở | Đối tượng hoặc nguồn nghiệp vụ, không mặc nhiên là User | Không phải mobile persona nội bộ của tranche |

UI/mobile không được suy quyền từ actor label. Server phải trả kết quả capability
và vẫn enforce khi request trực tiếp.

## 4. AS-IS → GAP → TO-BE

| Concern | AS-IS | GAP | TO-BE B6 |
|---|---|---|---|
| Mobile write | `WriteGuard` chặn mọi POST/PUT/PATCH/DELETE ngoài auth | Không thể ghi activity/checklist/field evidence trên mobile | Domain command chung web/mobile; capability và offline policy theo matrix |
| E1-004 mobile | Không có Residents route; web có activity/GPS/Evidence/idempotency | Cán bộ phải nhập lại trên web; không thấy queue/SLA/action tại hiện trường | Queue/detail masked, activity/checkup, biến động/risk online, report review online |
| E1-005 mobile | Chỉ Incident summary GET | Thiếu IntakeReport, verify/classify, field verification, transfer và SLA surface | Internal intake/detail/action; app là source channel, không tạo citizen app |
| E1-007 mobile | Không có Inspection route; web có offline commands | Không thể start/resume checklist, capture Evidence/GPS, finding trên mobile | Schedule/detail, checklist draft, Evidence/finding; complete/approval online |
| Offline | Web/server có inspection queue/sync; mobile client chưa có adapter | Không có mobile queue/conflict UX | Queue allowlist, clientCommandId/baseVersion, retry/reject/conflict, encrypted local buffer |
| Location | Mobile map/read surfaces; Force source có continuous GPS pattern | Chưa có action-level GPS contract cho E1 | GPS theo activity/verification/inspection action; không continuous tracking |
| Land | Land internal/public/mobile contract riêng | Redesign dễ đưa Land vào generic E1 workflow | Giữ bounded context, public allowlist, `simulated=true`, focused parcel map |
| Vehicle | PS-E1-009 còn xuyên runtime/mobile/demo | Xóa một menu không đủ | Structural-removal package xử lý source/runtime/data/migration/docs/test |

## 5. Feature design map

### F-01 — Mobile capability shell

- Capability-aware navigation/deep link, session, OU, Assignment context.
- State grammar: loading, empty, forbidden, masked, offline, stale, provider
  error, rejected và success.
- Notification → safe deep link; không nhúng PII.

### F-02 — E1-004 mobile follow-up

- Queue hồ sơ được giao, SLA/due state và masked detail.
- Ghi activity/checkup với GPS/Evidence/idempotency; offline allowlist.
- Cập nhật biến động/risk online; high-risk tạo SLA/notification.
- Commander review/approve/send monthly report online.

### F-03 — E1-005 mobile intake và verification

- IntakeReport/Incident queue/detail masked, SLA/timeline.
- Internal duty officer tạo intake theo direct/phone/app/district_transfer.
- Verify/classify, field verification, convert, transfer/close theo state machine.
- Tất cả sensitive/authority mutation online.

### F-04 — E1-007 mobile field inspection

- Assigned establishment/inspection schedule và focused location.
- Start/resume checklist versioned; draft/checklist/finding được queue theo allowlist.
- Evidence/GPS capture; complete chỉ online sau prerequisites.
- Commander review/approve/return/transfer recommendation online.

### F-05 — Shared mobile safety

- Auth/RBAC/Assignment/masking/Audit.
- Offline queue và conflict protocol.
- Notification, Evidence, GPS, map/provider safe state.
- Demo/test journey và zero-reference Vehicle gate.

### F-06 — Land integration

- Navigation/shell integration và focused parcel map.
- Không thêm Land business flow từ EP-E1/EP-E3; contract Land là nguồn duy nhất.

### F-07 — Structural removal

- Handoff cho `repo-architect`; không được thực hiện production source trong B6.
- M2 purge/squash, zero-reference và retained worker/replay là B9/B10/implementation
  evidence, không được lẫn vào mobile parity semantics.

## 6. Business acceptance tổng hợp

### E1-004

- Hồ sơ nhận từ CA huyện/cơ sở lưu trú được đăng ký trong 24 giờ.
- Cán bộ có Assignment ghi ít nhất một checkup/tháng cho hồ sơ tái hòa nhập;
  activity có actor, thời điểm, Assignment và Evidence/GPS khi yêu cầu.
- Người nước ngoài lưu trú có same-day notification tới cấp nhận hợp lệ.
- Biến động/risk/high-risk được ghi nhận, audit và escalation; report tháng đúng
  period, approve rồi snapshot bất biến trước send.

### E1-005

- Mọi IntakeReport được ghi nhận trong 24 giờ với channel hợp lệ và idempotency.
- Identity mặc định masked; sensitive reveal chỉ role/policy hợp lệ và có audit.
- Verify ban đầu trong 48 giờ; chỉ convert thành Incident khi đủ cơ sở; không
  auto-create khi intake.
- Transfer vượt thẩm quyền và thông báo kết quả trong 20 ngày có deadline,
  state, audit và notification result.

### E1-007

- Mỗi Establishment có kiểm tra định kỳ tối thiểu hai lần/năm và lịch đột xuất
  khi có dấu hiệu.
- Inspection giữ template/version tại thời điểm tạo; draft không mất khi lỗi/mất
  mạng.
- Biên bản hoàn tất có checklist, finding, Evidence ảnh và GPS provenance.
- Finding có recommendation; xử lý recommendation trong 7 ngày qua Approval/return/
  transfer; không tự phát hành quyết định pháp lý.

### Mobile và shared

- Action chỉ hiện/được chấp nhận khi capability + Assignment + OU đúng.
- Offline queue chỉ chứa allowlist; retry không nhân đôi; stale version không ghi
  đè; rejected/conflict hiển thị rõ.
- Notification/deep link không bypass auth/masking; GPS/Evidence có provenance.
- Mobile Land vẫn focused read projection theo Land contract; không public polygon.

## 7. B6 design gate

- Không tạo `data-model.md` ở B6. Mọi trường/queue/index/retention phát sinh chỉ
  là data-model input cho B9.
- Không dùng UI/code của `news-map-main` hoặc `force-app-main` làm target.
- Sau user xác nhận bộ design + SOW: `NEXT-SKILL: gov-ui-ux`.