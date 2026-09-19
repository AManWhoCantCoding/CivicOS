# CivicOS Event-First Development Roadmap

Status: ready-for-agent

## Problem Statement

CivicOS cần cung cấp một nền tảng điều hành an ninh, trật tự cho Công an xã Nghĩa Trụ. Epic PS-E1 bao gồm tiếp nhận và xử lý tố giác, tác nghiệp hiện trường, quản lý cư dân và đối tượng cần theo dõi, kiểm tra cơ sở kinh doanh có điều kiện, theo dõi phương tiện lạ, quản lý điểm nóng, bản đồ, phân tích xu hướng và báo cáo định kỳ.

Các phân hệ này cùng cần một lịch sử nghiệp vụ đáng tin cậy, quyền truy cập theo vai trò và phân công, bằng chứng bất biến, SLA, thông báo, dữ liệu địa lý và khả năng hoạt động khi thiếu nguồn Camera/LPR. Nếu xây từng màn hình độc lập trước, hệ thống sẽ lặp lại vòng đời trạng thái, timeline, audit, thông báo và báo cáo; các projection và báo cáo về sau cũng khó bảo đảm tính nhất quán.

Repo hiện mới có scaffold Next.js, TypeScript, Tailwind CSS và Prisma, chưa có module nghiệp vụ, event kernel, hệ thống quyền hoặc test suite nghiệp vụ. Cần một lộ trình phát triển ưu tiên cơ chế tạo sự kiện, bắt đầu bằng một vertical slice nhỏ nhưng chạy được từ đầu đến cuối.

## Solution

Xây CivicOS như một modular monolith gồm một ứng dụng Next.js, PostgreSQL, và một worker riêng trong cùng codebase. Các module giao tiếp qua DomainEvent và adapter rõ ràng. PostgreSQL là nguồn dữ liệu chính; thay đổi domain và event log được ghi trong cùng transaction, sau đó transactional outbox được worker polling để cập nhật projection, SLA và notification.

Event log là bất biến và có stream theo aggregate, cùng một chỉ mục event toàn cục để tìm kiếm và replay. Projection được cập nhật bất đồng bộ với mục tiêu p95 freshness không quá 10 giây trong điều kiện bình thường. MVP không dùng full event sourcing cho toàn bộ state và không thêm message broker như Kafka.

Sau Event kernel, xây Identity và quyền, các năng lực dùng chung, rồi một vertical slice cho PS-E1-005. Các phase sau chỉ bắt đầu khi phase trước có integration test, projection replay, authorization test, audit, SLA và idempotency test tương ứng.

Thứ tự dưới đây là **roadmap tổng thể khi phát triển tuần tự**. Parallel wave được phê duyệt sau đó là một ngoại lệ có chủ đích và được mô tả riêng bên dưới; không dùng thứ tự tổng thể này làm blocking order cho các ticket của parallel wave.

Thứ tự phát triển:

1. Event kernel: event envelope, event log, aggregate version, transactional outbox, worker, retry, idempotency và replay.
2. Identity và quyền: User, Actor, Role, OrganizationUnit, Assignment, RBAC, mã hóa và AuditEvent.
3. Năng lực dùng chung: Evidence, GeoPoint, GeoArea, notification, SLA timer và cấu hình.
4. PS-E1-005: IntakeReport, Incident, phân loại, phân công, xác minh và Approval.
5. PS-E1-008: FieldUpdate trên mobile, ảnh/GPS, push và offline sync.
6. PS-E1-007: Cơ sở kinh doanh có điều kiện, lịch kiểm tra, checklist và Evidence.
7. PS-E1-004: Cư dân đặc biệt, tạm trú và SLA 24 giờ.
8. PS-E1-003: Đối tượng cần quản lý, lịch gặp, audit và cảnh báo.
9. PS-E1-009: Phương tiện lạ, trước tiên nhập tay rồi mới tích hợp Camera/LPR.
10. PS-E1-002: Điểm nóng, polygon, liên kết vụ việc và trend.
11. PS-E1-001: Bản đồ tổng hợp; có thể dựng shell sớm nhưng hoàn thiện sau khi có dữ liệu thật.
12. PS-E1-006: Phân tích xu hướng.
13. PS-E1-010: Báo cáo định kỳ, snapshot, Approval và ký số.

### Parallel wave hiện tại

Sau các ticket nền tảng `01` Event kernel, `02` Identity/Assignment và `03` shared capabilities, ba phân hệ sau được triển khai song song:

1. PS-E1-005: IntakeReport đến Incident.
2. PS-E1-007: Inspection cơ sở kinh doanh.
3. PS-E1-009: VehicleObservation và SuspiciousVehicleRegistry.

Ba ticket module có cùng blockers `01`, `02`, `03`. Ticket tích hợp `07` kiểm tra theo thứ tự `PS-E1-005 → PS-E1-007 → PS-E1-009`. PS-E1-008 không thuộc parallel wave hiện tại; nó vẫn giữ vị trí sau PS-E1-005 trong roadmap tổng thể và sẽ được ticket hóa ở wave sau.

Seam kiểm thử chính là luồng command/query end-to-end:

`gửi command → ghi DomainEvent + outbox → worker projection → đọc read model`

Adapter IdentityProvider, Camera/LPR, bản đồ, SMS và storage có contract test riêng.

## User Stories

1. As a developer, I want to define a stable DomainEvent envelope, so that every module records who, what, when and why a change occurred.
2. As a developer, I want a per-aggregate event stream, so that the order and version of changes to one Incident or other aggregate are deterministic.
3. As a developer, I want domain changes and their events written in one transaction, so that the system cannot commit a business change while losing its event.
4. As a developer, I want an outbox worker with retry and backoff, so that projections and notifications recover from temporary failures.
5. As a developer, I want event handling to be idempotent, so that retries do not duplicate assignments, notifications or projection rows.
6. As a maintainer, I want to rebuild a projection from event history, so that a damaged or newly introduced read model can be recovered without changing the source history.
7. As an operator, I want event consumer lag and failures to be visible, so that a stale map or notification pipeline can be diagnosed.
8. As a developer, I want Actor identity and correlation information captured in each event, so that one operational action can be traced across modules.
9. As an administrator, I want to manage User accounts and Roles, so that system access reflects the responsibilities of each officer.
10. As an administrator, I want OrganizationUnit hierarchy and receiving units to be configurable, so that the system does not hard-code the label “CA huyện”.
11. As a Trưởng Công an xã, I want to see records within my command scope, so that I can supervise operations and make Approval decisions.
12. As a Trưởng Công an xã, I want to assign one or more Users to a specific task and record the assignment, so that access follows operational responsibility.
13. As an assigned User, I want to see the sensitive record needed for my assigned task, so that I can perform that task without receiving unrelated confidential data.
14. As a Trưởng Công an xã, I want to revoke an Assignment, so that access ends when responsibility changes while historical AuditEvent records remain intact.
15. As a compliance reviewer, I want reads and changes to sensitive data audited, so that access to informant identity and managed-person data can be investigated.
16. As a system operator, I want sensitive identifiers encrypted at the application layer, so that a database disclosure does not directly reveal protected personal data.
17. As a duty officer, I want to record an IntakeReport from an in-person, telephone or other manual channel, so that every received report enters the system promptly.
18. As a duty officer, I want an IntakeReport to create an Incident in the MVP, so that the report becomes actionable without requiring a separate manual registration step.
19. As a duty officer, I want to classify an Incident, so that the system can route it to the appropriate verification and escalation path.
20. As a Trưởng Công an xã, I want to assign an Incident to an officer, so that responsibility and access are explicit.
21. As an assigned officer, I want to record the initial verification work, so that the Incident has a traceable operational history.
22. As an assigned officer, I want to view the Incident timeline, so that I can understand all prior DomainEvent and FieldUpdate activity.
23. As a Trưởng Công an xã, I want to approve transfer of an Incident to an OrganizationUnit cấp trên, so that escalation is authorized and recorded.
24. As an assigned officer, I want to propose a resolution, so that the responsible officer can document the result before approval.
25. As a Trưởng Công an xã, I want to approve resolution and closure, so that only an authorized person can end the operational lifecycle.
26. As a responsible officer, I want SLA reminders and overdue alerts, so that an Incident is not left unclassified, unverified or untransferred.
27. As a Trưởng Công an xã, I want to search and filter Incident history, so that I can review prior work without relying on current status alone.
28. As a field officer, I want to select an assigned Incident on mobile, so that I can update the correct case at the scene.
29. As a field officer, I want to add a FieldUpdate with description, time and GPS, so that current developments are recorded with their origin.
30. As a field officer, I want to attach an Evidence photo whose GPS and capture metadata cannot be edited, so that the record retains evidentiary provenance.
31. As a Trưởng Công an xã, I want to receive a push notification for a new critical FieldUpdate, so that I can direct operations remotely.
32. As a field officer, I want mobile actions queued while offline and synchronized later, so that temporary loss of network does not lose work.
33. As a system, I want offline commands identified by a client-generated unique ID, so that synchronization is idempotent.
34. As a system, I want server-side validation of offline status transitions, so that a stale mobile client cannot bypass Approval rules.
35. As an office officer, I want to maintain the catalog of conditional business establishments, so that every establishment requiring inspection is known.
36. As an office officer, I want to schedule periodic inspections, so that each establishment is covered at least twice per year.
37. As a field officer, I want a checklist selected by establishment type, so that an inspection follows the correct standardized procedure.
38. As a field officer, I want to record an Inspection with photos and GPS Evidence, so that field findings are traceable.
39. As a Trưởng Công an xã, I want to approve a warning, sanction or transfer recommendation, so that violations follow the authorized route.
40. As a responsible officer, I want to receive reminders for inspections and unresolved violations, so that the seven-day handling target can be monitored.
41. As an office officer, I want to receive a handoff for a special-resident record from an OrganizationUnit cấp trên, so that the local management record starts from an authoritative source.
42. As an office officer, I want to maintain a separate management record for a special resident, so that temporary residence, foreign-resident and reintegration purposes retain their own lifecycle and access policy.
43. As a cán bộ thôn, I want to see only the special-resident records assigned to me, so that I can perform monthly follow-up without broad access to confidential data.
44. As an office officer, I want a 24-hour SLA for foreign-resident registration and notification, so that statutory timing is visible and actionable.
45. As a Trưởng Công an xã, I want immediate escalation for a disappearance or violation, so that the responsible OrganizationUnit can act quickly.
46. As a cán bộ phụ trách tái hòa nhập, I want to create a SubjectManagementRecord from a handoff, so that the person can be monitored under the correct purpose.
47. As a cán bộ phụ trách tái hòa nhập, I want to upload handoff documents and schedule visits by risk level, so that the management plan is explicit.
48. As a cán bộ phụ trách tái hòa nhập, I want to record each meeting and evaluation, so that the subject history supports monthly reporting.
49. As a responsible officer, I want overdue-presentation alerts after configured thresholds, so that missed contact is not discovered only during a later report.
50. As an authorized officer, I want a mock Camera/LPR source and a manual fallback, so that the management workflow works before a real camera feed is available.
51. As a cán bộ hiện trường or tổ tự quản, I want to record a VehicleObservation manually, so that vehicle monitoring does not depend on Camera/LPR access.
52. As a cán bộ hiện trường, I want to search a vehicle plate against the suspicious-vehicle data and history, so that I can decide what to verify next.
53. As a cán bộ hiện trường, I want to record the result of finding the vehicle owner with GPS and photo Evidence, so that verification is auditable.
54. As a responsible officer, I want a two-hour alert for a suspicious vehicle report to an OrganizationUnit cấp trên, so that the escalation SLA is visible.
55. As a cán bộ nghiệp vụ, I want to create a Hotspot by drawing a GeoArea and recording its type and level, so that an abnormal area can be managed explicitly.
56. As a system, I want an Incident with a GeoPoint inside a Hotspot to produce a link suggestion, so that officers can see relevant relationships without changing conclusions automatically.
57. As a Trưởng Công an xã, I want high-level Hotspots to create patrol reminders, so that the response plan reflects the current risk level.
58. As a cán bộ nghiệp vụ, I want Hotspot history and weekly trends retained, so that closure proposals can be based on four consecutive low-risk weeks.
59. As a Trưởng Công an xã, I want to toggle map layers for cameras, Hotspots, Incidents, forces, establishments and managed subjects, so that the map supports operational decisions.
60. As a Trưởng Công an xã, I want map symbols colored by level and filtered by time, type, severity and handling unit, so that the map shows only the relevant operational picture.
61. As a Trưởng Công an xã, I want to inspect a map object and open its detail, so that the map is a navigation surface rather than an isolated visualization.
62. As a Trưởng Công an xã, I want to replay a map by day, week or month and export a snapshot, so that it can support briefings and reports.
63. As a Trưởng Công an xã, I want to compare Incident counts across periods, locations, types and time windows, so that I can identify changing patterns.
64. As a Trưởng Công an xã, I want a heat map and configurable growth alerts, so that rising risk is visible before a periodic report.
65. As a Trưởng Công an xã, I want to evaluate outcomes after a patrol adjustment, so that the system measures whether the intervention reduced incidents rather than only displaying a suggestion.
66. As a Trưởng Công an xã, I want to select a weekly, monthly or quarterly reporting period, so that the required reporting cadence is explicit.
67. As a Trưởng Công an xã, I want a PeriodicReport to aggregate data from projections, so that at least 90 percent of its figures are produced automatically.
68. As a Trưởng Công an xã, I want to compare a report with the previous period, so that changes are explained before submission.
69. As a Trưởng Công an xã, I want to add comments, approve and sign a report, so that the submitted document represents an authorized decision.
70. As a Trưởng Công an cấp trên, I want to receive a submitted report and its ReportSnapshot, so that later source-data changes do not rewrite the received record.
71. As a system operator, I want a graceful “camera source not connected” state, so that missing Camera/LPR access does not break other map, vehicle or subject workflows.
72. As a deployment operator, I want the system to run on a private or on-premise server, so that the initial deployment does not depend on a public cloud.
73. As a deployment operator, I want external map, camera, SMS and IdentityProvider integrations behind adapters, so that a provider can be changed without rewriting domain modules.

## Implementation Decisions

- Use a modular monolith with explicit modules and one PostgreSQL database; do not split into microservices during the MVP.
- Use a separate worker process in the same codebase for outbox consumption, projection updates, SLA timers and notifications.
- Use PostgreSQL as the source of truth with relational aggregate/projection tables and JSONB event payloads.
- Write domain state and its DomainEvent transactionally; publish through a transactional outbox polled by the worker.
- Keep event streams per aggregate with aggregate versioning and a global searchable event index.
- Make DomainEvent immutable and distinguish it from AuditEvent; AuditEvent records sensitive reads and changes for compliance.
- Support retry, exponential backoff, idempotency, dead-letter handling and projection replay.
- Target p95 projection freshness of no more than 10 seconds under normal operation; expose lag and consumer failures for diagnosis.
- Keep `IntakeReport` separate from `Incident`, while creating one Incident from each IntakeReport in the MVP.
- Limit `Incident` to the PS-E1-005 and PS-E1-008 operational lifecycle; use separate aggregates for `VehicleObservation`, `Inspection`, `SubjectManagementRecord`, special-resident records and `Hotspot`.
- Use a shared `Subject` identity with separate purpose-specific management records and independent access boundaries.
- Use `Assignment` as an explicit grant from the Trưởng Công an xã to one or more Users for a task and record; assignment access does not imply unit-wide access.
- Allow the Trưởng Công an xã to view records within the command scope and assigned Users to view records required for their task.
- Require Approval by the Trưởng Công an xã for transfer to an OrganizationUnit cấp trên and for final resolution/closure.
- Use configurable `OrganizationUnit` hierarchy and receiving units; do not hard-code the historical “CA huyện” label.
- Use continuous SLA timing, including weekends and holidays, from the DomainEvent that triggers the SLA; keep thresholds configurable by workflow.
- Use a shared Evidence capability with immutable files, hash, source Actor, capture time and GPS metadata; replacements create a new Evidence record rather than modifying the original.
- Use shared `GeoPoint` and `GeoArea` values under one coordinate system, with adapters for VietGeoX/VBDLIS.
- Generate link suggestions from events for Hotspot, Subject and vehicle relationships; require authorized confirmation for sensitive conclusions.
- Use REST and typed commands for the initial HTTP boundary; do not add GraphQL in the MVP.
- Use a local development IdentityProvider and an adapter boundary for production OIDC/SSO or an equivalent organizational directory.
- Encrypt informant identity, CCCD, criminal history and other high-risk identifiers at the application layer; use a separate blind index when a protected field must be searched.
- Support offline FieldUpdate commands with client-generated IDs, separate occurred and received timestamps, server-side validation and idempotent synchronization.
- Use in-app notifications first, push for mobile next and SMS through an adapter later; notification delivery must be driven by outbox events.
- Provide manual input and mock adapters for Camera/LPR until a real source is available; Camera/LPR is not a prerequisite for go-live.
- The sequential roadmap's first operational MVP is Event kernel plus PS-E1-005 and PS-E1-008. The currently approved implementation wave supersedes that sequencing for delivery and uses Event kernel plus PS-E1-005, PS-E1-007 and PS-E1-009.
- The first parallel implementation wave contains PS-E1-005, PS-E1-007 and PS-E1-009. They share a completed foundation but own separate aggregates, commands, events and projections.
- PS-E1-005 owns `IntakeReport` and `Incident`; PS-E1-007 owns `Establishment`, `Inspection`, `InspectionFinding` and `EnforcementRecommendation`; PS-E1-009 owns `VehicleObservation` and `SuspiciousVehicleRegistry`.
- A single integration owner controls Prisma schema and migrations, shared event and authorization contracts, and cross-module links. Module owners must not edit shared internals directly.
- The three module workstreams may develop vertical slices in parallel after shared contracts are stable. Integration order is PS-E1-005, then PS-E1-007, then PS-E1-009.
- Each module wave is limited to an operational vertical slice; advanced citizen, Camera/LPR, analytics, reporting and external-provider behavior remains out of the first wave.

## Testing Decisions

- Test the highest seam: submit a typed command, observe durable DomainEvent and outbox behavior, run the worker, then query the resulting read model.
- Test external behavior and business guarantees rather than ORM calls, private functions or table layout details.
- Use integration tests against PostgreSQL for transaction atomicity, event ordering, outbox claiming, retry and idempotency.
- Use replay tests that rebuild projections from event fixtures and compare the resulting read behavior with expected outcomes.
- Use authorization tests for Trưởng Công an xã, assigned User, unassigned User, revoked Assignment and unrelated OrganizationUnit.
- Use audit tests proving that sensitive reads, downloads and changes create AuditEvent records.
- Use workflow tests for Incident status transitions, Approval requirements, transfer and closure.
- Use SLA tests for continuous timing across weekends and holidays, configurable thresholds and overdue notifications.
- Use offline synchronization tests for duplicate client IDs, delayed events, stale transitions and append-only FieldUpdate behavior.
- Use contract tests for IdentityProvider, map provider, Camera/LPR, notification, SMS and Evidence storage adapters.
- Use projection freshness and worker recovery tests to verify the p95 target and replay behavior under normal failure scenarios.
- Use report snapshot tests to prove that an issued ReportSnapshot does not change when source projections change later.
- No existing business-test pattern is available in the scaffold; establish the command/projection integration seam before adding module-specific test conventions.
- A phase is not complete until its vertical slice has event, projection replay, authorization, audit, SLA and integration coverage appropriate to its behavior.

## Out of Scope

- Full event sourcing for every aggregate during the MVP.
- Kafka, RabbitMQ or another separate message broker during the MVP.
- Microservice extraction or independent deployment of each module during the MVP.
- Multi-tenant isolation for multiple Công an xã deployments; the first deployment targets Nghĩa Trụ while retaining configurable OrganizationUnit boundaries.
- A real Camera/LPR feed before access to an actual source is available.
- Making Camera/LPR, public map connectivity or SMS a prerequisite for core workflows.
- A full citizen mobile app in the first technical or operational MVP; manual officer intake covers the initial input path.
- Digital signing and complete PS-E1-010 report submission in the first vertical slice.
- Automatic legal conclusions or automatic sensitive links without authorized User confirmation.
- Physical deletion of DomainEvent, AuditEvent or original Evidence.

## Further Notes

- The requirement uses “CA huyện” as a historical operational term, but the system must model the receiving OrganizationUnit as configuration because the current organizational structure may differ.
- Camera/LPR requirements must degrade gracefully: show an explicit unavailable state, provide mock data for development, and preserve manual input paths.
- The first implementation task should be the Event kernel, but it must be exercised by a real PS-E1-005 command/query slice rather than delivered as an unused framework.
- The sequential roadmap milestones remain Event kernel, PS-E1-005 vertical slice, PS-E1-008 field updates, then the remaining modules. The current release milestones are Event kernel, the shared foundation, the PS-E1-005/007/009 parallel wave, and PS-E1-008 in the following wave.
- The selected parallel wave does not mean that shared foundation code is edited concurrently. Shared foundation is completed first; only module-owned work then proceeds in parallel.
- Because the current workspace is not a Git repository, parallel work must use disjoint module-owned files and one integration owner rather than relying on branches or worktrees.
- The domain glossary uses `IntakeReport`, `Incident`, `FieldUpdate`, `Evidence`, `Subject`, `SubjectManagementRecord`, `Assignment`, `OrganizationUnit`, `DomainEvent`, `AuditEvent`, `PeriodicReport`, `ReportSnapshot`, `VehicleObservation`, `SuspiciousVehicleRegistry`, `Inspection`, `InspectionResult`, `InspectionFinding`, `EnforcementRecommendation`, `Hotspot`, `GeoPoint`, `GeoArea`, `SLA` and `Approval` as canonical terms.
- The architecture decisions are recorded as accepted decisions for domain events with projections, modular monolith and worker deployment, and shared Subject identity with separate management records.
