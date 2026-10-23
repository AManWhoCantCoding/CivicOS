---
title: 'Ma trận mapping vai trò E1-004/005/007 — bản 2'
status: accepted
owner: Techlead
created: 2026-10-22
updated: 2026-10-22
supersedes: docs/rbac/role-matrix.md
sources:
  - AGENTS.md
  - docs/reset/requirements-baseline.md
  - docs/reset/decision-log.md
  - docs/rbac/role-matrix.md
  - brain/adr/0005-e1-mobile-parity-boundaries.md
  - docs/civicos-e1-business-parity/api-contract.md
  - src/modules/identity/contracts.ts
  - src/modules/identity/authorization.ts
---

# Ma trận mapping vai trò E1-004/005/007 — bản 2

> **PO đã duyệt mapping trong tài liệu ngày 2026-10-22.** Bản này thay thế `docs/rbac/role-matrix.md` để bổ sung action `resident.record_activity` theo D-63. Ma trận ghi mapping đã được xác nhận, không tự cấp quyền ngoài các ranh giới nêu tại đây.

## Nguyên tắc

- Role mapping không thay cho authorization theo action/resource. Server phải kiểm tra theo policy trung tâm; menu/client không cấp quyền.
- Quyền theo OU và Assignment phải được kiểm tra server-side khi contract yêu cầu. Không suy ra quyền từ tên role hoặc việc một role xuất hiện trong catalog.
- `read_sensitive` là điều kiện bổ sung, không tự cho phép xem PII. Sensitive read/write cần masking, authorization và audit theo contract đã duyệt.
- Không thêm role check rải rác trong module. Ma trận này không thay đổi `ROLE_CATALOG`, capability hay policy trong code.
- E1 dùng `commander` cho Trưởng Công an xã; Land giữ bounded context và mapping riêng, không nhập `commune_leader` vào role E1.

## Mapping actor và action đã được PO xác nhận

| Story / actor / action | Role CivicOS | Phạm vi đã xác nhận | Ranh giới chưa được ma trận tự quyết |
|---|---|---|---|
| E1-004 — cán bộ hộ khẩu | `office_officer` | Mapping theo actor tại D-61. | Các quyền chi tiết trên từng field hồ sơ, PII, retention và risk/escalation chưa được xác định ở đây. |
| E1-004 — cán bộ thôn theo dõi hồ sơ | `village_officer` | Chỉ theo dõi hồ sơ được giao; dùng tập field cư dân tối thiểu theo quyết định PO. | Assignment grant/revoke, field-level read/write và audit phải theo contract riêng; không mở rộng dữ liệu hồ sơ. |
| E1-004 — ghi activity `resident.record_activity` | `commander`, `duty_officer`, `field_officer`, `office_officer`, `village_officer` | Cả 5 role được ghi nếu có Assignment `resident_followup` active trên đúng hồ sơ và cùng OU (D-63). | Không cho phép chỉ dựa vào role; Assignment phải được kiểm tra server-side cho đúng actor/resource/OU. Offline behavior còn phải đáp ứng confidentiality và D-22. |
| E1-004/005 — Trưởng Công an xã | `commander` | Mapping E1 đã được PO xác nhận; không dùng role Land `commune_leader`. | Không coi role mapping là quyền mặc định cho mọi transition hoặc dữ liệu nhạy cảm. |
| E1-005 — cán bộ trực ban tiếp nhận | `duty_officer` | Mapping theo actor tại D-61. | Các transition ngoài tiếp nhận cần contract action/state cụ thể. |
| E1-005 — cán bộ hiện trường; E1-007 — cán bộ kiểm tra hiện trường | `field_officer` | Mapping theo actor tại D-61. Offline chỉ theo allowlist D-22, không suy ra từ role. | E1-005 mutation và E1-007 completion/authority action vẫn online-only theo D-22. |
| E1-004/005 — người nhận tại đơn vị cấp trên cấu hình | `superior_officer` | OU cấp trên cấu hình được và hồ sơ phải có Assignment phù hợp (D-61); không hard-code `district`. | Không tự cấp quyền quản trị/approve ngoài action đã được contract xác nhận. |
| E1-007 — Phòng CSKT cấp trên | `superior_officer` | Mapping giữ theo D-28; đơn vị/Assignment phải giới hạn phạm vi tương ứng. | Không suy ra quyền xử phạt pháp lý. |

## Ràng buộc nghiệp vụ liên quan

- **E1-005 reveal danh tính tố giác:** chỉ khi cùng OU, có `read_sensitive` và Assignment/grant theo đúng hồ sơ; online-only và có audit. Role hoặc OU riêng lẻ không đủ (D-01, D-04, D-22).
- **E1-007 recommendation:** Finding tạo `EnforcementRecommendation`; approve/return/transfer theo thẩm quyền trong phạm vi được chốt, không phát hành quyết định xử phạt pháp lý (D-55). Ma trận không gán các transition này cho role nếu action contract chưa xác định.
- **E1-007 checklist:** nội dung chuẩn phải lấy từ nguồn pháp lý chính thức; `office_officer` quản lý template có version; local additions phải nhận diện riêng (D-60). Pilot chỉ giới hạn nhóm kinh doanh có điều kiện về ANTT theo Nghị định 96 và sửa đổi có hiệu lực; danh sách/checklist chưa được xác minh toàn văn pháp lý (D-62).
- **Land:** giữ contract riêng; `commune_leader` không được hiểu là alias của `commander` trong E1.

## Đối chiếu source hiện tại — không phải contract

- `src/modules/identity/contracts.ts:85-98` hiện khai báo capability cơ sở `read_sensitive` cho nhiều role; dòng 109-135 dùng chung `BUSINESS_ROLES` cho các task nghiệp vụ và các task capability có `read_sensitive`.
- `src/modules/identity/authorization.ts:134-234` hiện đánh giá capability, role, Assignment và OU; đây là source behavior hiện tại, không phải bằng chứng rằng từng endpoint E1 đã enforce đúng ma trận này.
- `src/modules/residents/commands.ts:397-408,434` hiện liệt kê năm role đã được chốt tại D-63 và kiểm tra access hồ sơ; không tự xác nhận phần strict same-OU nếu thông tin OU bị thiếu.
- Trước khi thay đổi hoặc nghiệm thu permission code, cần map từng action/resource vào policy trung tâm và có kiểm thử allow/deny cho Assignment, OU, sensitive read, audit và các negative cases tương ứng. Không mở rộng quyền chỉ để khớp cấu trúc source hiện hữu.

## Còn cần chốt/kiểm chứng trước khi dùng làm policy code

1. D-63 chỉ chốt role cho `resident.record_activity`; các action/resource còn lại của E1-004/005/007, gồm field-level PII, risk/escalation, Assignment administration và recommendation authority, cần contract riêng.
2. Xác minh nguồn pháp lý toàn văn và danh sách/checklist E1-007 trước khi đưa nội dung checklist vào contract hoặc khẳng định tuân thủ.
3. Xác nhận từng endpoint đọc/ghi có policy server-side và audit theo yêu cầu; không suy ra từ role catalog, UI hay test cũ.
