# 06: PS-E1-009 VehicleObservation và SuspiciousVehicleRegistry

**What to build:** Cung cấp vertical slice hiện trường cho phương tiện lạ bằng nhập tay: quản lý registry nội bộ có nguồn/lý do/thời hạn, ghi VehicleObservation, tra cứu biển số, tạo match cảnh báo, xác minh bằng GPS/ảnh, offline sync và escalation lên OrganizationUnit cấp trên.

**Blocked by:** 01: Event kernel và transactional outbox; 02: Identity, Assignment và quyền truy cập; 03: Năng lực dùng chung cho vertical slice

**Status:** ready-for-agent

## Files in scope

- `prisma/schema.prisma`: thêm SuspiciousVehicleEntry, VehicleObservation, VehicleVerification và escalation projection; chỉ tham chiếu shared Evidence/Geo/Assignment.
- `prisma/migrations/<timestamp>_ps009_vehicle_watch/migration.sql`: migration PS-E1-009.
- `src/modules/vehicles/index.ts`: public entry point.
- `src/modules/vehicles/contracts.ts`: registry, observation, match and verification contracts.
- `src/modules/vehicles/domain.ts`: registry validity, observation and escalation rules.
- `src/modules/vehicles/commands.ts`: create/update registry, record observation, verify and escalate commands.
- `src/modules/vehicles/repository.ts`: aggregate persistence through shared event boundary.
- `src/modules/vehicles/projection.ts`: registry search, observation history and escalation queue projections.
- `src/modules/vehicles/mock-camera-adapter.ts`: deterministic mock input contract; no real provider call.
- `src/modules/vehicles/schemas.ts`: REST input validation.
- `src/app/api/vehicles/registry/route.ts`: registry management endpoint.
- `src/app/api/vehicles/observations/route.ts`: manual observation endpoint.
- `src/app/api/vehicles/observations/[observationId]/route.ts`: verification/escalation endpoint.
- `src/app/vehicles/registry/page.tsx`: authorized registry management UI.
- `src/app/field/vehicles/page.tsx`: PWA field observation UI.
- `src/app/field/vehicles/[observationId]/page.tsx`: verification and escalation UI.
- `src/components/vehicles/RegistryForm.tsx`: registry entry form with source/reason/expiry/status.
- `src/components/vehicles/VehicleObservationForm.tsx`: fast mobile observation form.
- `src/components/vehicles/VehicleMatchPanel.tsx`: registry match and manual confirmation surface.
- `src/components/vehicles/VehicleVerificationTimeline.tsx`: observation/evidence/escalation timeline.
- `src/app/manifest.ts`: PWA metadata for field client.
- `tests/vehicles/vehicle-watch.integration.test.ts`: registry validity, match, verification, SLA and authorization tests.
- `tests/e2e/ps009-vehicle-watch.spec.ts`: registry-to-observation-to-escalation browser flow.

## Implementation steps

1. **Define registry versus observation boundaries.** `SuspiciousVehicleRegistry` owns entries with source, reason, active window and status; `VehicleObservation` owns one real-world sighting. A match creates a suggestion, not a legal or operational conclusion.
2. **Define event/command contracts.** Freeze `VehicleObservationRecorded`, `SuspiciousVehicleMatched`, `VehicleVerificationRecorded` and `VehicleEscalated`, including what confirmation is required before escalation.
3. **Create schema/migration.** Add registry entries, observations, verification records and escalation projection with plate normalization, source, validity period, GeoPoint, Evidence reference and assignment scope.
4. **Implement registry lifecycle.** Create/update/expire entries, validate plate format without over-normalizing local conventions, preserve source/reason history and prevent active duplicate entries for the same effective identity.
5. **Implement manual observation.** Validate plate/time/GeoPoint, attach photo Evidence, append observation event and return pending projection status; no network or Camera/LPR dependency.
6. **Implement match and confirmation.** Match only active registry entries, produce notification/link suggestion, require authorized User confirmation, then allow verification or escalation command.
7. **Implement verification and two-hour SLA.** Record owner lookup/result, Actor, GPS, capture time and Evidence; create continuous 2-hour SLA and escalation event with retry/idempotency.
8. **Implement mock adapter.** Add deterministic fixtures and adapter contract tests; ensure the adapter cannot call external network and manual input remains available when adapter is unavailable.
9. **Build PWA field and registry UI.** Implement registry form, fast observation form, match confirmation, verification timeline and escalation. Apply mobile-first trust-first design, clear GPS/photo/offline state, touch-safe controls, WCAG AA and reduced motion.
10. **Test sync/security/end-to-end.** Cover expired registry, false/no match, duplicate offline command, stale confirmation, denied access, Evidence audit and escalation retry; run browser flow from registry to escalation and all verification commands.

## Explicitly out of scope

- Không kết nối Camera/LPR thật.
- Không tự kết luận một phương tiện là khả nghi chỉ vì registry match.
- Không triển khai CSDL phương tiện bên ngoài.
- Không xây thống kê tháng hoặc bản đồ tổng hợp.

## UI requirements

Áp dụng `design-taste-frontend` với design read: **mobile-first trust-first field operation UI for police officers and community teams**; `DESIGN_VARIANCE=3`, `MOTION_INTENSITY=2`, `VISUAL_DENSITY=5`. Form phải thao tác nhanh dưới một phút, input label rõ, GPS/ảnh status luôn nhìn thấy, offline state không thể nhầm là đã gửi, contrast WCAG AA, touch target phù hợp, reduced motion và không dùng decorative dashboard patterns.

## Acceptance criteria

- [ ] Authorized User tạo được registry entry với biển số, nguồn, lý do, hiệu lực từ/đến và trạng thái.
- [ ] Registry entry hết hạn không tạo active match; lịch sử vẫn truy vấn được.
- [ ] Cán bộ hiện trường tạo VehicleObservation thủ công với biển số, thời điểm, GeoPoint và Evidence ảnh.
- [ ] Match registry chỉ tạo `SuspiciousVehicleMatched`/notification suggestion; User phải xác nhận trước khi escalation.
- [ ] Verification ghi Actor, kết quả, thời điểm, GPS và Evidence; không sửa observation gốc.
- [ ] Observation nghi vấn có SLA escalation 2 giờ, chạy cả ngày nghỉ, có overdue event và retry notification.
- [ ] Offline command có client ID, sync idempotent, hiển thị pending/failed/synced và server từ chối stale transition.
- [ ] Mock camera adapter tạo được fixture deterministic nhưng không được gọi network ngoài.
- [ ] User không có Assignment không đọc/ghi observation hoặc Evidence chỉ bằng cách đổi URL/ID.
- [ ] E2E test chạy từ registry entry đến manual observation, match confirmation, verification và escalation.
- [ ] UI PWA hoạt động trên mobile viewport, keyboard/focus cơ bản, loading/error/offline states và reduced motion.
- [ ] `npm run lint`, `npm run build` và PS-E1-009 tests pass.
