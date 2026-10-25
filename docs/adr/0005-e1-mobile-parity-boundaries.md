# ADR-0005 — Mobile parity có kiểm soát cho E1-004/005/007

- **Status:** `PROPOSED` — chờ user xác nhận bộ B6 design/SOW trước B7.
- **Date:** 2026-10-13.
- **Scope:** Mobile nội bộ cho PS-E1-004, PS-E1-005 và PS-E1-007; không thay đổi
  bounded context Land hoặc mở EP-E3 độc lập.

## Context

CivicOS hiện có mobile shell và một số read projection nhưng
`mobile/src/components/WriteGuard.ts` chặn mọi write ngoài auth. E1-004 chưa có
Residents mobile surface, E1-005 chủ yếu là Incident summary GET và E1-007 chưa
có Inspection mobile surface. Trong khi đó business source yêu cầu cán bộ thực
hiện follow-up, xác minh, checklist, Evidence/GPS và báo cáo tại hiện trường.

`docs/adr/0004-civicos-uiux-alignment.md` từng giữ mobile read-only vì scope UI
alignment không thay đổi business behavior. ADR này là delta business parity cho
ba story E1; nó không biến mọi mobile action thành offline hoặc làm thay đổi các
module ngoài scope.

## Decision

1. Mobile nội bộ được phép có action/write theo actor, OrganizationUnit,
   Assignment, resource state và server capability; read-only AS-IS không còn là
   target constraint cho ba story E1.
2. Offline chỉ mở cho allowlist `resident.record_activity`,
   `inspection.start`, `inspection.save_checklist` và `inspection.finding`, với
   encrypted local queue, idempotency, `baseVersion`, retry/conflict/rejected
   state.
3. E1-005 mutation, sensitive reveal, risk escalation, report send, inspection
   complete, transfer/close/reject và mọi approval online-only ở tranche này.
4. `app` là canonical `sourceChannel` của IntakeReport; không tạo public citizen
   app, public auth hoặc public intake route.
5. GPS chỉ capture theo action; không nhập continuous tracking PS-E3-003.
6. Land giữ contract riêng; PS-E1-009 removal là structural workstream độc lập,
   không được thay bằng compatibility alias/fallback.

## Consequences

### Positive

- Cán bộ có thể hoàn tất phần việc thực địa thay vì nhập lại trên web.
- Server command, Event/Audit, Assignment và Evidence giữ một authority chung cho
  web/mobile.
- Offline được giới hạn ở thao tác có thể retry/idempotent, giảm rủi ro lộ PII và
  approval replay.

### Costs and risks

- Cần mobile adapter, encrypted queue, conflict UX và test matrix mới.
- B9 phải xác định disposition cho version/idempotency/local retention/Evidence;
  B7 phải kiểm tra provider artifact không quảng cáo action ngoài capability.
- Mọi command write cần regression trên web vì shared domain command.

## Alternatives rejected

- **Giữ mobile read-only:** không đáp ứng business process/field parity của ba
  story; chỉ phù hợp ADR-0004 UI-only, không phù hợp work item hiện tại.
- **Cho mọi mutation offline:** tăng risk replay, protected identity leak và
  approval/transfer không có authority online.
- **Tạo public citizen app từ `app` channel:** mở scope/auth/legal boundary không
  được user yêu cầu.
- **Nhập continuous GPS PS-E3-003:** thêm EP-E3 độc lập và vượt acceptance E1.
- **Tạo generic mobile workflow:** làm mất semantics riêng của Subject, Intake,
  Inspection và Land.

## Verification

- Capability matrix và B6 API/domain rules map từng action tới actor, Assignment,
  online/offline, masking, Evidence/GPS và audit.
- Edge-case tests chứng minh offline allowlist, conflict, revoked Assignment,
  masking, source channel và no-public-app boundary.
- B7 conformance review đánh dấu `UI_REPAIR_REQUIRED` nếu artifact vi phạm ADR;
  không sửa business contract để hợp thức hóa provider.
