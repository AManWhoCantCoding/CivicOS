---
title: CivicOS — thiết kế tác nghiệp PS-E1-004/005/007
status: draft
owner: project
created: 2026-10-23
updated: 2026-10-23
sources:
  - ../../../Requirement.md
  - ../../../CONTEXT.md
  - ../../../docs/civicos-e1-clone-mvp/overview.md
  - ../../../docs/civicos-e1-business-parity/overview.md
  - ../../../brain/adr/0005-e1-mobile-parity-boundaries.md
  - ../../../docs/rbac/role-matrix-v2.md
  - ../../../.scratch/civicos-e1-clone-mvp/workflow-status.md
  - ../../../.scratch/civicos-uiux-alignment/workflow-status.md
---

# CivicOS — thiết kế tác nghiệp PS-E1-004/005/007

## Trạng thái và nguồn

- `civicos-e1-clone-mvp` ghi textual spec/UI baseline đã chốt nhưng overview yêu cầu đọc lại trước khi khóa; workflow ghi không mở rộng mobile write trong tranche đó.
- `civicos-e1-business-parity` mô tả đề xuất B6 cho E1-004/005/007 và mobile parity; overview còn ghi `B6 design draft`. ADR-0005 vẫn `PROPOSED` và chờ user gate.
- `role-matrix-v2.md` có `status: accepted` ngày 2026-10-22 và thay thế `role-matrix.md`; phạm vi chấp thuận là mapping role/action được nêu trong bảng, không phải toàn bộ policy hay quyền endpoint.
- Do các trạng thái trên khác nhau, tài liệu này là bản tổng hợp `draft`. Không coi mobile write parity hoặc các action chưa có contract là đã được duyệt chỉ vì có trong design draft.

## Phạm vi nghiệp vụ

| Story                                  | Năng lực trong tài liệu hiện có                                                              | Boundary cần giữ                                                                                                                              |
| -------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| E1-004 — cư dân đặc biệt               | `Subject`, `SubjectManagementRecord`, activity/checkup, hồ sơ được giao và báo cáo định kỳ   | `Subject` không phải `User`; sensitive fields cần policy/masking/audit; báo cáo được duyệt phải có snapshot theo contract                     |
| E1-005 — tố giác                       | Tiếp nhận `IntakeReport`, xác minh, phân loại, chuyển/đóng hoặc tạo `Incident` khi đủ căn cứ | `IntakeReport` không tự động là `Incident`; nguồn tin nhạy cảm phải có quyền reveal/audit; không tạo public citizen app trong scope đã mô tả  |
| E1-007 — cơ sở kinh doanh có điều kiện | `Establishment`, lịch `Inspection`, versioned checklist, finding, Evidence và recommendation | Không tự phát hành quyết định pháp lý; authority action cần contract riêng; checklist pháp lý chưa được xác minh toàn văn theo role-matrix v2 |

Các ngưỡng thời gian, transition, field-level privacy và API chi tiết thuộc feature contracts tương ứng; không dùng bảng tóm tắt này thay thế các điều khoản/domain-rules/API contract cụ thể.

## Actors và mapping đã ghi nhận

| Actor/action                | Role được role-matrix v2 ghi nhận             | Điều kiện/giới hạn                                                                            |
| --------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Trưởng Công an xã trong E1  | `commander`                                   | Không đồng nhất với role Land `commune_leader`; không có quyền mặc định cho mọi action        |
| Cán bộ hộ khẩu E1-004       | `office_officer`                              | Mapping actor; field-level PII và các action khác cần contract riêng                          |
| Cán bộ thôn theo dõi E1-004 | `village_officer`                             | Chỉ hồ sơ được giao, trường dữ liệu tối thiểu; Assignment/policy phải enforce server-side     |
| Trực ban E1-005             | `duty_officer`                                | Mapping actor; transition cụ thể vẫn phụ thuộc trạng thái/action contract                     |
| Hiện trường E1-005/E1-007   | `field_officer`                               | Mapping actor; offline chỉ theo allowlist nếu contract đó được duyệt                          |
| Đơn vị cấp trên             | `superior_officer`                            | OU cấu hình và Assignment/resource scope; không hard-code `district` hoặc tự cấp authority    |
| `resident.record_activity`  | commander, duty, field, office, village roles | D-63 trong role-matrix v2 yêu cầu Assignment `resident_followup` active trên hồ sơ và cùng OU |

Role matrix là mapping, không phải authorization matrix đầy đủ. `read_sensitive` tự nó không đủ để mở PII; mọi endpoint phải kiểm tra action, resource, OU, Assignment, masking và audit theo contract.

## Mobile boundary

### Contract đã được ghi ở các nguồn

- UI-only design system và `civicos-uiux-alignment` yêu cầu giữ mobile read-only, không đổi API, capability, offline policy hay nghiệp vụ.
- `civicos-e1-clone-mvp` cũng mô tả mobile read-only cho E1-004/007 và E1-005 web-only.
- ADR-0005 và `civicos-e1-business-parity` đề xuất delta: mobile action/write cho ba story, offline chỉ cho allowlist gồm `resident.record_activity`, `inspection.start`, `inspection.save_checklist`, `inspection.finding`; sensitive reveal, authority transitions, E1-005 mutations và approvals online-only.

### Quy tắc áp dụng khi chưa có quyết định mới

ADR-0005 đang `PROPOSED`, vì vậy không xem nó là quyết định đã thay thế read-only boundary. Trước khi triển khai mobile write cần một quyết định/human gate có thẩm quyền cập nhật ADR và contract. Không suy từ mockup, route visibility, test output hoặc sự tồn tại của implementation rằng capability đã được duyệt.

## Các quyết định/điểm cần phân biệt

1. Ẩn E1-004/005/007 khỏi web launcher trong `civicos-unified-web-workspace` là thay đổi navigation; design đó ghi rõ giữ page, route, API và business surface. Không diễn giải thành xóa nghiệp vụ.
2. `PS-E1-009` removal được nêu như structural workstream trong business-parity design, nhưng phải dùng contract riêng; không gộp việc xóa module vào mobile parity hoặc UI work.
3. `app` là source channel hợp lệ được ADR-0005 đề xuất cho internal IntakeReport; không đồng nghĩa public intake route. Vì ADR vẫn proposed, kiểm tra status trước khi dùng như policy hiện hành.
4. Land là bounded context riêng: role `commune_leader`, land access policy và parcel projection không được nhập vào E1 role map.

## Nguồn chi tiết

- Yêu cầu gốc: `Requirement.md` — PS-E1-004, PS-E1-005, PS-E1-007.
- Tranche MVP và flow: `docs/civicos-e1-clone-mvp/`.
- Delta mobile/business đang đề xuất: `docs/civicos-e1-business-parity/` và ADR-0005.
- Role mapping được chấp thuận: `docs/rbac/role-matrix-v2.md`; v1 đã superseded.
- Handoff và status: `.scratch/civicos-e1-clone-mvp/`, `.scratch/civicos-uiux-alignment/`, các ticket/decision artifacts tương ứng.
