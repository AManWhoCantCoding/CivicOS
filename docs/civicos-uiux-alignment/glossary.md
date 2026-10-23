# Thuật ngữ: `civicos-uiux-alignment`
 
| Thuật ngữ                            | Định nghĩa trong work item                                                                                               | Không đồng nghĩa với                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| **All UI/UX**                        | Toàn bộ web/mobile UI surface đang tồn tại trong source và route inventory của source assessment.                        | Thêm capability, route hoặc screen production mới.                     |
| **UI-only / presentation migration** | Đổi token, layout, component rendering, responsive/focus/state presentation; giữ runtime contracts.                      | Đổi behavior, API, data, permission hoặc workflow.                     |
| **Shared baseline**                  | Light/Blue tokens và presentation rules đã được duyệt ở `civicos-ui-design-system`.                                      | Một palette mới hoặc brand/legal claim.                                |
| **Surface**                          | Screen, shell, list, detail, form, map, public lookup hoặc primitive hiện có.                                            | Stitch screenshot tự sinh ra production route.                         |
| **Visual drift**                     | Cùng loại UI/state nhưng khác palette, typography, spacing, control hoặc copy pattern giữa surface.                      | Khác biệt capability có chủ đích giữa web/mobile.                      |
| **Semantic state**                   | Cách trình bày state runtime hiện có: loading, empty, ready, warning/stale, error, forbidden/masked, offline, simulated. | State machine hoặc database status mới.                                |
| **Read-only mobile**                 | Mobile capability boundary hiện có: xem/tìm/tap/điều hướng theo server scope, không có write/public intake.              | Yêu cầu mobile parity 1:1 với web.                                     |
| **Masked value**                     | Giá trị đã được server/policy che theo scope hiện hành.                                                                  | Placeholder mà UI được phép tự reveal.                                 |
| **Internal / simulated**             | Dữ liệu mô phỏng nội bộ, không phải official/certified/legal source.                                                     | Public legal claim hoặc projection chính thức.                         |
| **No-offline-polygon**               | Polygon land không được lưu/render từ offline cache trong flow hiện tại.                                                 | Basemap cache hoặc offline land store mới.                             |
| **Contract gap**                     | Nhu cầu cần thay đổi API, data, permission, route, state, legal meaning hoặc integration.                                | Một thiếu sót styling có thể giải quyết bằng token/primitives hiện có. |
 
## Quy tắc dùng thuật ngữ
 
- Dùng tên domain trong `CONTEXT.md`: `IntakeReport`, `Incident`, `Subject`,
  `User`, `Assignment`, `Inspection`, `VehicleObservation`, `GeoPoint` và
  `GeoArea` đúng nghĩa.
- Không gọi dữ liệu simulated là official/certified; không dùng “parity” để
  ngầm yêu cầu mobile write flow.
