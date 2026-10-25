# Thiết kế tính năng: civicos-e1-clone-mvp

> **Nguồn:** `.scratch/civicos-e1-clone-mvp/spec.md` (đã chốt nghiệp vụ), `CONTEXT.md`, khảo sát code `src/modules/**`, `src/app/api/**`.
> **Trạng thái:** bản dựng lại từ code + spec hiện hữu theo workflow v3.1 — cần Research/người dùng đọc lại trước khi khóa.

## Vấn đề / Giải pháp

**Vấn đề:** Xây bản clone MVP của PS-E1 cho Công an xã Nghĩa Trụ: nền tảng tối thiểu (auth/RBAC, OrganizationUnit, Assignment, Evidence, SLA, DomainEvent, AuditEvent, map projection, realtime) + 3 story nghiệp vụ (E1-004 Cư dân đặc biệt, E1-005 Tố giác tội phạm, E1-007 Cơ sở kinh doanh có điều kiện). Web + mobile read-only dùng chung backend.

**Giải pháp:** Modular monolith Next.js App Router hướng sự kiện (đã triển khai lớn phần nền tảng); MVP mở rộng behavior hiện có theo spec — không xây lại module đã có.

## Phạm vi

**Trong phạm vi (tranche):**

- Nền tảng tạo được từng hồ sơ bằng command riêng (chưa hoàn tất đầy đủ E1-001).
- PS-E1-004: quản lý cư dân đặc biệt (Subject/SubjectManagementRecord/Activity/báo cáo tháng).
- PS-E1-005: tiếp nhận + theo dõi tố giác (web-only, masking danh tính).
- PS-E1-007: cơ sở kinh doanh có điều kiện (inspection/checklist/recommendation).
- Mobile: read-only cho E1-004/E1-007; E1-005 web-only.

**NGOÀI phạm vi (tranche này):**

- Public citizen app (tố giác từ dân qua app).
- Mobile write flow mới cho E1-004/E1-007.
- Tích hợp thật VietGeoX/VBDLIS, LPR, SMS, FCM, ký số — chỉ adapter/mock.
- Full E1-001/002/003/006/008/009/010 — chỉ shared kernel không khóa story.
- Quyết định xử phạt tự động / kết luận pháp lý tự động.

## Bản đồ module

| Module                                                          | Trạng thái                | Nguồn                          | Ghi chú                                                                                         |
| --------------------------------------------------------------- | ------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------- |
| eventing (EventRecord/Outbox/Projection/SLA/Audit)              | Đã có                     | `src/modules/eventing/`        | nền tảng, không xây lại                                                                         |
| identity (User/Role/OrganizationUnit/Assignment)                | Đã có                     | `src/modules/identity/`        | local auth, giữ contract role/permission                                                        |
| incidents (IntakeReport/Incident)                               | Đã có + cần sửa           | `src/modules/incidents/`       | [GAP] registerIntakeReport đang tạo Incident ngay khi nhập; channel thiếu app/district_transfer |
| inspections (Establishment/Inspection/Checklist/Recommendation) | Đã có + cần gap-fill      | `src/modules/inspections/`     | đóng gap PS-E1-007, UI mới                                                                      |
| residents (Subject/SubjectManagementRecord/Report)              | Đã có (mới trong tranche) | `src/modules/residents/`       | PS-E1-004                                                                                       |
| vehicles                                                        | Đã có                     | `src/modules/vehicles/`        | E1-009 nền, ngoài tranche chính                                                                 |
| platform (notifications, evidence, sla)                         | Đã có                     | `src/modules/platform/`        | adapter SMS/FCM mock                                                                            |
| mobile-readonly                                                 | Đã có                     | `src/modules/mobile-readonly/` | chỉ đọc                                                                                         |
| MapLibre workspace                                              | Mới                       | web + mobile                   | provider sau adapter, OSS tự host MVP                                                           |

## Luồng chính (kèm nhánh lỗi)

1. **E1-005 Tố giác:** trực ban POST /api/intake-reports (bắt buộc sourceChannel) → lưu danh tính vùng bảo vệ → lệnh verify (48h SLA) → đủ cơ sở → POST /api/incidents convert (detected→open) + notification. _Lỗi:_ thiếu channel → 400; version lệch → 409; vượt thẩm quyền → transfer lên huyện.
2. **E1-004 Cư dân đặc biệt:** tạo Subject + ManagementRecord (24h từ nhận hồ sơ) → Trưởng CA tạo Assignment → cán bộ ghi Activity tháng (cập nhật nextCheckAt) → biến động/nguy cơ → DomainEvent + thông báo CA huyện → cuối tháng MonthlyReport → approve (đóng băng snapshot) → send.
   _Lỗi:_ hoạt động không có Assignment → từ chối; report sai period → 409 (unique organizationId+period).
3. **E1-007 Cơ sở KD:** quản lý Establishment → lịch Inspection định kỳ 6 tháng (đột xuất khi có dấu hiệu) → chọn ChecklistTemplate version theo loại hình → ghi kết quả + GPS + Evidence → Finding → EnforcementRecommendation → Trưởng CA phê duyệt/trả lại/chuyển huyện. Vi phạm xử lý trong 7 ngày; không tự phát hành quyết định pháp lý.

## Quy tắc nghiệp vụ & máy trạng thái

- Trạng thái IntakeReport: RECEIVED → VERIFIED → PROCESSED → CLOSED | REJECTED (semantics source, chi tiết DR-xx trong `domain-rules.md`).
- Trạng thái Inspection: scheduled → started → completed (result: đạt/nhắc nhở/không đạt).
- Recommendation: pending_approval → approved | returned | transferred_huyện.
- MonthlyReport: draft → approved → sent (snapshot bất biến sau phê duyệt).
- Quy tắc nền: mọi mutation ghi DomainEvent + AuditEvent trong cùng transaction; SLA tính liên tục theo ngưỡng cấu hình; masking danh tính theo role.

## Quyết định kỹ thuật

- Event sourcing qua EventRecord + Outbox + Projection (đã có) — ADR: xem `docs/adr/` (bổ sung khi quyết định lớn mới phát sinh trong grilling).
- Map: MapLibre GL JS (web) / MapLibre React Native (mobile), tile OSM tự host (OpenMapTiles → TileServer GL/PMTiles), provider sau adapter để thay VietGeoX/VBDLIS sau.
- Auth local adapter, giữ contract role/permission/masking/audit.
- Realtime: Socket.IO hoặc adapter tương đương.
- Mobile: React Native package riêng trong `mobile/`, dùng backend + domain contracts chung; MVP chỉ auth/main/map/RelatedInfo.

## Seam kiểm thử

- Command handlers trong `src/modules/**/commands.ts` — test unit độc lập qua event store in-memory.
- API Route Handlers — test integration qua fetch + PostgreSQL Docker (RUN_DB_TESTS=1).
- Worker health: `/api/health/worker` bắt buộc healthy trước khi coi integration pass.
- E2E: Playwright tự quản lifecycle trên port 3001 (`scripts/e2e/playwright-services.mjs`).
- Mobile: build/test riêng qua script `mobile:*`.

## Nhật ký thay đổi

| Ngày       | Đổi gì                                              | Lý do                        | Người xác nhận                     |
| ---------- | --------------------------------------------------- | ---------------------------- | ---------------------------------- |
| 2026-09-30 | Dựng lại theo workflow v3.1 từ spec + code hiện hữu | Di trú workflow cũ sang v3.1 | (chờ người dùng xác nhận khi lock) |
