# Quy tắc domain/presentation: `civicos-uiux-alignment`
 
Tài liệu này không tạo domain rule mới. Nó quy định cách presentation phải bảo
toàn domain contract hiện có của CivicOS.
 
## Presentation invariants
 
1. **Token không phải domain state.** Token chỉ quyết định màu, typography,
   spacing, shape, focus và layout; không tạo status/action/permission mới.
2. **State có nghĩa phải giữ nguyên.** UI có thể thay layout nhưng không đổi
   tên/ý nghĩa state, action visibility hoặc transition.
3. **Quyền do contract hiện có quyết định.** Session, role, OrganizationUnit,
   Assignment và server policy quyết định field/action; UI chỉ trình bày kết quả.
4. **Masked là masked.** Không expose identity, evidence, address, geometry,
   sync hoặc audit data chỉ vì cần một card/detail đẹp hơn.
5. **Mobile vẫn read-only.** Không thêm create/edit/submit/approval mutation
   để làm mobile “giống” web.
6. **Simulated không phải legal claim.** Giữ `internal / simulated`; không dùng
   `official`, `certified` hoặc wording tương đương.
7. **Map boundary bất biến.** Không render polygon cũ/offline; forbidden,
   not-found, geometry/provider failure và stale phải có presentation an toàn.
 
## Module preservation
 
- Incident/Intake: giữ distinction `IntakeReport` và `Incident`, state/action
  theo workflow hiện có.
- Residents: giữ distinction `Subject` và `User`, masking, Assignment và
  activity/evidence boundaries.
- Inspection: giữ checklist, finding, result, online-required write guard và
  approval semantics.
- Land: giữ application/parcel states, simulated label, assignment/action,
  version/reload và no-legal-claim wording.
- Vehicles/Field: giữ observation/registry distinction, evidence/offline state
  và field workflow hiện có.
- Identity: giữ session, directory, OrganizationUnit và Assignment semantics.
 
## Stop rule
 
Nếu design hoặc implementation cần thêm business rule, public claim, role,
permission, state machine, data field, route hoặc API, đánh dấu
`BLOCKED-CONTRACT` và quay lại Research; không tự chốt ở UI layer.
