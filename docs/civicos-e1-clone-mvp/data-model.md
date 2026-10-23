# Mô hình dữ liệu: civicos-e1-clone-mvp

> **Nguồn sự thật:** `prisma/schema.prisma` (đã triển khai trong code hiện hữu — 31 model).
> Đánh dấu nguồn mỗi dòng: **[CODE]** = đã có trong schema, **[SPEC]** = yêu cầu từ spec,
> **[GAP]** = chưa có trong schema, cần Research/người dùng xác nhận trước khi làm ticket.

## Nhóm Identity & tổ chức

| Bảng                | Nguồn  | Ghi chú chính                                                                                                    |
| ------------------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| `User`              | [CODE] | email unique, passwordHash, organizationUnitId, active                                                           |
| `Role` / `UserRole` | [CODE] | M2M, composite key [userId, roleId]                                                                              |
| `OrganizationUnit`  | [CODE] | name, level, parentId (tự tham chiếu qua parentId logic), active                                                 |
| `Assignment`        | [CODE] | resourceType+resourceId+task, assignee, grantedBy, status, revoke fields; index [resourceType,resourceId,status] |
| `Session`           | [CODE] | tokenHash unique, expiresAt, cascade delete theo user                                                            |

## Nhóm Event kernel (nền tảng)

| Bảng                   | Nguồn  | Ghi chú chính                                                                                                                 |
| ---------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `EventRecord`          | [CODE] | eventId unique, aggregateType+Id+Version unique (optimistic concurrency), payload/metadata Json, actor fields                 |
| `OutboxMessage`        | [CODE] | status pending → claimed → processed; attempts, deadLetterAt; cascade theo EventRecord                                        |
| `ProjectionCheckpoint` | [CODE] | theo tên projection, lastRecordedAt + processedEventIds                                                                       |
| `ProjectionRecord`     | [CODE] | unique [projectionName, aggregateType, aggregateId], state Json                                                               |
| `AuditEvent`           | [CODE] | resourceType+resourceId+operation, actorId, metadata; index truy vết                                                          |
| `SlaInstance`          | [CODE] | unique [resourceType, resourceId, kind], dueAt/status/overdueEventId unique                                                   |
| `Notification`         | [CODE] | userId, sourceEventId unique (idempotent theo event)                                                                          |
| `OfflineCommand`       | [CODE] | clientCommandId unique (idempotency offline), baseVersion, status                                                             |
| `Evidence`             | [CODE] | resourceType+resourceId, storageKey, originalHash, GPS lat/lng, immutable=true; unique [resourceType,resourceId,originalHash] |

## Nhóm Tố giác (PS-E1-005)

| Bảng            | Nguồn  | Ghi chú chính                                                                                                                                                                                                                                                |
| --------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `IntakeReport`  | [CODE] | status RECEIVED/VERIFIED/PROCESSED/CLOSED/REJECTED (giữ semantics source); sourceChannel (cần đủ direct/phone/app/district_transfer — [SPEC]); sensitiveRef + sensitiveRefIndex (vùng bảo vệ danh tính [SPEC]); idempotencyKey unique; incidentId unique 1-1 |
| `IntakeCommand` | [CODE] | unique [reportId, command, idempotencyKey] — log lệnh idempotent                                                                                                                                                                                             |
| `Incident`      | [CODE] | intakeReportId unique 1-1 (chỉ tạo khi convert — [SPEC] mục 4.2), status/category/severity, version optimistic                                                                                                                                               |

## Nhóm Cư dân đặc biệt (PS-E1-004)

| Bảng                        | Nguồn  | Ghi chú chính                                                                                                       |
| --------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------- |
| `Subject`                   | [CODE] | subjectType, sensitiveProfile + sensitiveIndex (mask theo role [SPEC]), status                                      |
| `SubjectManagementRecord`   | [CODE] | purpose, riskLevel, nextCheckAt (cảnh báo theo dõi tháng [SPEC]), version                                           |
| `SubjectManagementActivity` | [CODE] | activityType, occurredAt, actorId, assignmentId, evidenceIds; idempotencyKey unique                                 |
| `ResidentMonthlyReport`     | [CODE] | unique [organizationId, period], status draft→approved→sent, snapshotPayload+snapshotHash (bất biến khi gửi [SPEC]) |

## Nhóm Cơ sở kinh doanh có điều kiện (PS-E1-007)

| Bảng                        | Nguồn  | Ghi chú chính                                                                                                      |
| --------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------ |
| `Establishment`             | [CODE] | type, licenseRef, risk (default medium), status; index [type, active]                                              |
| `ChecklistTemplate`         | [CODE] | unique [establishmentType, version] — checklist theo loại hình [SPEC]                                              |
| `Inspection`                | [CODE] | unique [establishmentId, scheduledAt], cadenceMonths default 6 (2 lần/năm [SPEC]), checklistResponses Json, result |
| `InspectionFinding`         | [CODE] | checklistKey, severity, evidenceIds                                                                                |
| `EnforcementRecommendation` | [CODE] | findingIds, status pending_approval → …; KHÔNG tự phát hành quyết định pháp lý [SPEC]                              |
| `Approval`                  | [CODE] | unique [resourceType, resourceId, action, status] — quyết định Trưởng CA                                           |

## Nhóm Phương tiện (PS-E1-009 — nền, chưa phải tranche chính)

| Bảng                     | Nguồn  | Ghi chú chính                                                     |
| ------------------------ | ------ | ----------------------------------------------------------------- |
| `SuspiciousVehicleEntry` | [CODE] | plate, validFrom/validUntil, status                               |
| `VehicleObservation`     | [CODE] | plate, GPS, clientCommandId unique, matchedRegistryId, escalation |
| `VehicleVerification`    | [CODE] | observationId, result, ownerLookup, evidenceIds                   |

## Khác biệt giữa schema và spec — GAP cần biết khi tạo ticket

1. **[GAP] `sourceChannel` của IntakeReport:** spec mục 4.2 yêu cầu đủ `direct`, `phone`, `app`, `district_transfer`; schema có cả `channel` và `sourceChannel` nullable — kiểm tra `src/modules/incidents/contracts.ts` khi làm ticket, bổ sung giá trị thiếu.
2. **[GAP] Incident tự động tạo:** spec yêu cầu KHÔNG tạo Incident ngay khi nhập (chỉ khi cán bộ convert). Baseline ghi nhận behavior hiện tại `registerIntakeReport` vẫn tạo ngay — đây là thay đổi behavior cần ticket riêng.
3. **[GAP] Masking danh tính tố giác:** có `sensitiveRef`/`sensitiveRefIndex` trong schema; quy tắc mask theo role nằm ở tầng service (`incidents/contracts.ts`) — ghi vào domain-rules, không đổi schema.
4. **[GAP] PeriodicReport → CA huyện:** `ResidentMonthlyReport.sendTargetId` tồn tại; luồng gửi qua notification adapter [SPEC mục 4.1 bước 5–6].
5. **[GAP] Checklist versioning:** `Inspection.templateVersion` + `ChecklistTemplate.version` đã hỗ trợ; ticket phải luôn chốt version khi tạo Inspection (không dùng bản active mới nhất lúc evaluate).

## Migration

- [CODE] Toàn bộ bảng đã có migration trong `prisma/migrations/` (đã deploy, sản phẩm đang chạy).
- Không có migration mới trong tranche này trừ khi GAP số 1–2 được chốt; nếu có: tạo migration Prisma riêng cho từng thay đổi, không sửa migration cũ.

## Toàn vẹn & mở rộng

- **[CODE] Optimistic concurrency:** Incident/IntakeReport/Inspection/SubjectManagementRecord/ResidentMonthlyReport dùng cột `version`; mọi mutation phải kèm version check.
- **[CODE] Idempotency:** các lệnh ghi từ client đều có key unique (IntakeReport.idempotencyKey, OfflineCommand.clientCommandId, SubjectManagementActivity.idempotencyKey, ResidentMonthlyReport.idempotencyKey) — bắt buộc dùng khi retry.
- **[CODE] Audit:** mọi thay đổi nghiệp vụ ghi `AuditEvent` + `DomainEvent` trong cùng transaction (quy ước repo, xem `src/modules/eventing/`).
- **[CODE] PII:** dữ liệu nhạy cảm tách thành `sensitiveProfile` + `sensitiveIndex` (index tra cứu không lộ nội dung) — mô hình hỗ trợ masking theo role mà không truy vấn nội dung nhạy cảm.
- **[SPEC] Mở rộng sau:** PS-E1-001/002/003/006/008/009/010 dùng chung shared kernel — không khóa thêm gì; schema đã đủ nền cho các story này.