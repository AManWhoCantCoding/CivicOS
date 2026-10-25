# Hợp đồng tích hợp presentation: `civicos-uiux-alignment`

## Seam phải giữ nguyên

| Seam               | Hợp đồng                                                                                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web shell          | Reuse Home, `ModuleShell`, sidebar, session/org context, breadcrumb/back và module destinations.                                                     |
| Web domain UI      | Reuse existing fields, actions, API callers, masking và state semantics của Incidents, Intake, Inspections, Residents, Land, Map, Vehicles và Field. |
| Identity/access    | Reuse `SessionControls`, `AccessDenied`, directory, Assignment and server-enforced scope; chỉ đổi presentation.                                      |
| Public land lookup | Reuse public projection/rate-limit/error semantics và simulated label; không mở rộng projection.                                                     |
| Mobile shell       | Reuse `AppNavigator`, `SessionContext`, deep links và screen destinations.                                                                           |
| Mobile read-only   | Reuse current read-only API contracts, state helpers, offline/no-polygon guard và bottom-sheet/back context.                                         |
| Data/persistence   | Reuse current schema/read models/evidence/audit/offline policy; không tạo data structure.                                                            |
| Visual reference   | Kế thừa canonical Stitch project `projects/3369879313583874807` và Light/Blue tokens; B7 quyết định artifact bổ sung nếu cần.                        |

## Integration risks

- Shared shell/state primitive có blast radius liên module; mỗi ticket phải nêu
  caller/test coverage.
- Auth/identity/Assignment surface nhạy cảm với masking và access-denied copy.
- Field/inspection/land/map có offline, evidence, provider và write guards; UI
  migration không được làm biến mất các guard.
- Mobile API surface là read-only; visual reuse không được kéo theo endpoint
  hoặc mutation reuse.

## Stop/escalation

API, schema, permission, route, integration, offline store, map provider/
projection hoặc public/legal meaning phát sinh là contract delta. Dừng ticket,
ghi evidence và chuyển Research/B9/architecture review phù hợp.

## Verification seam

Mỗi surface dùng test hiện có theo module; cross-surface gate đối chiếu token,
accessibility, privacy, state copy và behavior-preservation tại web `1440 × 900`
và mobile `390 × 844`.
