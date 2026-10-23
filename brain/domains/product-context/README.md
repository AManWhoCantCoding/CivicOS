---
title: CivicOS — bối cảnh và phạm vi sản phẩm
status: draft
owner: project
created: 2026-10-23
updated: 2026-10-23
sources:
  - ../../../CONTEXT.md
  - ../../../Requirement.md
  - ../../../README.md
  - ../../../docs/agents/project.md
  - ../../../docs/agents/domain.md
  - ../../../docs/agents/source-assessment.md
  - ../../../docs/reset/requirements-baseline.md
  - ../../../docs/reset/modules.md
---

# CivicOS — bối cảnh và phạm vi sản phẩm

## Tóm tắt

CivicOS là nền tảng tác nghiệp cho Công an xã Nghĩa Trụ, tập trung vào tiếp nhận và xử lý vụ việc, quản lý hồ sơ nghiệp vụ, tác nghiệp hiện trường, điều hành địa bàn và báo cáo cấp trên. Tài liệu dự án mô tả hệ thống hiện tại là modular monolith MVP mở rộng qua tranche PS-E1; không được hiểu là toàn bộ Epic PS-E1-001…010 đã được triển khai.

Ứng dụng web/API dùng Next.js App Router, các module nghiệp vụ TypeScript, Prisma/PostgreSQL và worker xử lý outbox/projection/SLA/notification. Có ứng dụng React Native trong `mobile/`; hiện trạng và quyền mobile phải được xác định theo feature contract riêng, không suy ra từ UI web.

## Ngôn ngữ nghiệp vụ

`CONTEXT.md` là glossary gốc. Những phân biệt quan trọng:

| Thuật ngữ | Nghĩa dùng trong thiết kế | Không đồng nhất với |
|---|---|---|
| `IntakeReport` | Tin được tiếp nhận trước khi được xử lý như vụ việc nội bộ | `Incident`, `PeriodicReport` |
| `Incident` | Vụ việc cần phân loại, xác minh, chuyển tiếp hoặc kết thúc | Tin tiếp nhận, một cập nhật hiện trường |
| `FieldUpdate` | Cập nhật diễn biến của một Incident từ hiện trường | `IncidentStatus`, sự kiện hệ thống |
| `Subject` | Người/tổ chức là đối tượng của hồ sơ nghiệp vụ | `User`, `Actor` |
| `User` | Tài khoản đã xác thực để sử dụng hệ thống | `Subject`, `Actor` |
| `Actor` | Người/hệ thống thực hiện hành động nghiệp vụ | Bản thân tài khoản User |
| `Assignment` | Phân công theo nhiệm vụ/resource, OU và trạng thái/thời hạn | Membership hoặc quyền đọc toàn OU |
| `Evidence` | Tài liệu/ảnh/vị trí có provenance gắn với hoạt động nghiệp vụ | File đính kèm thông thường khi cần bảo toàn nguồn gốc |
| `DomainEvent` / `EventRecord` | Thay đổi nghiệp vụ bất biến và bản ghi lưu trữ tương ứng | `AuditEvent` |
| `AuditEvent` | Bằng chứng ai đọc/thay đổi dữ liệu và khi nào | Domain event |
| `SLA` | Thời hạn xử lý nghiệp vụ được kích hoạt theo quy tắc | Nhắc việc UI tùy ý |
| `Approval` | Quyết định cho một bước có thẩm quyền | Một trạng thái hiển thị hoặc Assignment |

## Mô hình hiện trạng đã được ghi nhận

```text
Browser / mobile
  → page hoặc API route
  → domain command / read model
  → transaction PostgreSQL
  → EventRecord + OutboxMessage
  → worker
  → projection / SLA / notification
```

Các domain được tài liệu dự án ghi nhận gồm `identity`, `incidents`, `inspections`, `vehicles`, `residents`, `platform`, `eventing`, `mobile-readonly` và `land`. Bảng Prisma có thể chứa cấu trúc rộng hơn mức workflow ứng dụng đã triển khai; sự tồn tại của model không chứng minh route, command hay nghiệp vụ tương ứng đã hoàn chỉnh.

Đây là mô tả kiến trúc theo tài liệu dự án, không phải kết quả kiểm tra runtime trong phiên này. `docs/agents/source-assessment.md` cũng cảnh báo working tree có thay đổi nguồn hiện hữu; cần đọc code/test liên quan trước khi dùng mô tả này làm bằng chứng AS-IS.

## Phạm vi yêu cầu PS-E1

`Requirement.md` là đầu vào yêu cầu Epic gồm mười story: bản đồ địa bàn, điểm nóng, hồ sơ đối tượng, cư dân đặc biệt, tố giác, phân tích xu hướng, cơ sở kinh doanh có điều kiện, FieldUpdate, phương tiện lạ và báo cáo định kỳ. Tài liệu yêu cầu gốc còn có căn cứ pháp lý, actor, FR/NFR, dependency Camera/LPR và các gap.

Không suy từ danh sách mười story rằng tất cả story đều có design lock hoặc đã chạy trong sản phẩm. Các feature design hiện tập trung vào một tập con, đặc biệt E1-004/005/007; các quyết định về land, UI, mobile và demo được tách riêng trong bộ tài liệu này.

## Ranh giới xuyên suốt

- Server policy là nơi thực thi quyền. Navigation, tên role, UI visibility hoặc client-provided context không tự cấp quyền.
- Dùng `OrganizationUnit` và `Assignment` theo contract của resource/action; không suy quyền toàn đơn vị từ một role label.
- Dữ liệu nhạy cảm cần masking, access control và audit theo contract; không đưa PII/secret/raw payload vào log, demo narration hoặc evidence công khai.
- Mọi claim `internal`, `simulated`, public lookup hoặc legal status phải giữ đúng wording của feature contract. Dữ liệu mô phỏng không phải hồ sơ pháp lý hoặc nguồn dữ liệu quốc gia thật.
- Web/mobile có thể chia sẻ domain/API nhưng không mặc định có cùng capability, offline policy hoặc navigation.
- Tích hợp ngoài, Camera/LPR, nguồn bản đồ và CSDL quốc gia chỉ là adapter/mock ở phạm vi feature đã ghi; không gọi là tích hợp thật nếu chưa có evidence.

## Đọc nguồn trước khi đổi thiết kế

1. `CONTEXT.md` và `docs/agents/project.md`.
2. ADR liên quan và feature contract cụ thể dưới `docs/<feature>/`; kiểm tra `LOCK.json` và Git state.
3. Research feature liên quan để phân biệt dữ kiện đã xác minh với khoảng trống.
4. `.scratch/<feature>/workflow-status.md`, SOW, phase/ticket và evidence cho trạng thái công việc.
5. Code/test hiện tại như baseline đối chiếu, không âm thầm thay thế quyết định nghiệp vụ đã duyệt.

Nếu required contract thiếu hoặc mâu thuẫn, dừng tại trạng thái `BLOCKED`/`needs-info`; ghi đường dẫn chính xác và xin quyết định thay vì tự tạo bản thay thế.
