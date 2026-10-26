---
title: CivicOS — research, quyết định và nguồn thiết kế
status: draft
owner: project
created: 2026-10-23
updated: 2026-10-23
sources:
  - ../../adr/
  - ../land/research/
  - ../ui-experience/research/
  - ../demo-runner/research/
  - ../land/research/input.md
  - ../land/research/feature-list.md
  - ../../../docs/rbac/role-matrix.md
  - ../../../docs/rbac/role-matrix-v2.md
  - ../../../docs/reset/doc-census.md
  - ../../../docs/reset/decision-log.md
  - ../../../docs/reset/scratch-files.md
  - ../../../docs/agents/cach-soan-tai-lieu.md
  - ../../../ui1-visual-redesign-brief.md
  - ../../../kiem-ke-ui-civicos.md
---

# CivicOS — research, quyết định và nguồn thiết kế

## ADR register

| ADR                                                                                 | Quyết định/phạm vi                                                                          | Status được ghi                                 | Cách hiểu trong bộ tổng hợp                                                                                   |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| [0001 — Land boundaries](../../adr/0001-land-module-boundaries.md)                  | `LandChangeApplication` aggregate; mutation land khi completed; mock quốc gia; PostGIS seam | Accepted                                        | Boundary Land, không nhập vào generic E1 map                                                                  |
| [0002 — Land map projection](../../adr/0002-land-parcel-map-projection-boundary.md) | Projection land riêng, scoped, read-only; không public polygon/offline polygon              | Accepted ở header                               | Nội dung heading gọi “Decision đề xuất”; lưu như wording/status discrepancy, không tự sửa ADR                 |
| [0003 — Shared UI tokens](../../adr/0003-shared-civicos-ui-design-tokens.md)        | Light/Blue baseline, tokens, type, spacing, touch targets; UI-only                          | Token baseline approved; ADR còn ghi B8 pending | Scratch workflow ghi B8/B12 approved; status ADR có vẻ cũ, chưa được normalize                                |
| [0004 — UIX alignment](../../adr/0004-civicos-uiux-alignment.md)                    | Presentation alignment, không thay behavior/API/data/permission                             | Accepted ngày 2026-10-23 sau B12                | User chấp nhận overview phục hồi làm bản thay thế và duyệt B12; legacy copy trong `docs/adr/` được giữ nguyên |
| [0005 — E1 mobile parity](../../adr/0005-e1-mobile-parity-boundaries.md)            | Đề xuất mobile write có kiểm soát và offline allowlist cho E1                               | Proposed, chờ user gate                         | Không coi là quyết định hiện hành thay read-only boundary                                                     |

ADR `accepted` không bị viết lại để thay lịch sử. Nếu cần thay một quyết định accepted, tạo ADR mới, ghi `supersedes`/`superseded_by` và owner/user approval theo quy trình dự án.

## Research register

| Nhóm                      | Nguồn                                                                                    | Kết luận dùng được                                                                                    | Giới hạn                                                                                          |
| ------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Land — luật Việt Nam      | `brain/domains/land/research/law-vn.md`                                                  | Đã ghi một số nguồn chính thức về luật đất đai, CSDL, đăng ký, dữ liệu, dữ liệu cá nhân và thẩm quyền | Chính file liệt kê nhiều điều khoản/văn bản kỹ thuật chưa đối chiếu toàn văn                      |
| Land — đầu vào/tính năng  | `brain/domains/land/research/input.md`, `feature-list.md`                                | Ghi yêu cầu ban đầu và danh sách tính năng đã được đánh dấu confirmed trong artifact                  | Không thay thế design lock; các nội dung legal đã ghi UNVERIFIED vẫn cần nguồn gốc                |
| Land — tổng hợp           | `brain/domains/land/research/law-summary.md`                                             | Dữ liệu demo synthetic, mock quốc gia, không tuyên bố legal effect; ghi các rủi ro vận hành thật      | Status trong summary còn “chờ B4” nhưng workflow Land nói B4 đã qua; không dùng làm legal opinion |
| Land — tiêu chuẩn quốc tế | `brain/domains/land/research/law-intl.md`                                                | LADM, VGGT, GDPR và ISO 27001 là nguồn tham chiếu theo phạm vi                                        | Không mặc nhiên là pháp luật bắt buộc tại Việt Nam; LADM 2012 đã withdrawn theo research          |
| UIX                       | `brain/domains/ui-experience/research/civicos-uiux-alignment/input.md`, `law-summary.md` | Yêu cầu presentation/UI; `NO_NEW_LEGAL_RULE`; giữ privacy, masking, simulated wording                 | Không cấp quyền hoặc sửa business contract                                                        |
| Unified workspace         | `brain/domains/ui-experience/research/civicos-unified-web-workspace/input.md`            | Chỉ hợp nhất web; ẩn E1 nav nhưng giữ route/API; mobile chỉ audit presentation                        | User request/change decision không phải legal authority                                           |
| UI demo                   | `brain/domains/demo-runner/research/input.md`, `law-summary.md`                          | Runner hướng dẫn UI, operator tự quản hạ tầng, synthetic/masked data; không bypass authorization      | Không có quyết định pháp lý riêng; mở lại review nếu chạy dữ liệu/credential thật                 |

Research là evidence có ngày và confidence cụ thể; cần quay lại nguồn sơ cấp khi nội dung pháp lý hoặc runtime assumptions đổi. Không biến “đã được research ghi” thành “đã được luật sư/owner xác nhận”.

## Role matrix

- `docs/rbac/role-matrix.md` có `status: superseded` và trỏ sang `role-matrix-v2.md`.
- `docs/rbac/role-matrix-v2.md` có `status: accepted`, cập nhật 2026-10-22; bổ sung action `resident.record_activity` theo D-63.
- Ma trận chốt mapping được nêu; chính tài liệu nói rõ action/resource khác, field-level PII, escalation, Assignment administration, recommendation authority và kiểm chứng endpoint vẫn cần contract. Nó không tự thay đổi `ROLE_CATALOG` hoặc authorization source.

## Tài liệu rải rác và cách phân loại

| Nhóm nguồn                | File/vị trí                                                                                                                                                | Cách dùng                                                                                          |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Requirement/domain        | `Requirement.md`, `CONTEXT.md`                                                                                                                             | Yêu cầu gốc và ngôn ngữ nghiệp vụ; đọc trước design                                                |
| UI/route                  | `docs/UI-map.md`, `docs/rbac/role-matrix-v2.md`                                                                                                            | Click path và mapping; không thay server authorization                                             |
| Proposal/visual inventory | `ui1-visual-redesign-brief.md`, `kiem-ke-ui-civicos.md` | Bổ sung route/archetype/visual option; giữ status proposal/snapshot cho đến khi có approval riêng  |
| Demo                      | `docs/demo-script.md`, `docs/runbooks/`                                                                                                                    | Operator-facing walkthrough/handoff; không phải production procedure                               |
| Feature design            | `docs/<feature>/`                                                                                                                                          | Contract chi tiết; phải đọc đúng `LOCK.json`/workflow/evidence                                     |
| Feature scratch           | `.scratch/<feature>/`                                                                                                                                      | Spec/SOW/UI/phases/tickets/status; phân biệt design input với history và execution record          |
| Reset/audit               | `docs/reset/`                                                                                                                                              | Snapshot kiểm kê/audit theo ngày; hữu ích để định vị nguồn, không phải canonical business decision |
| Archive                   | `docs/archive/` và các `archive`/`agent-setup` artifacts                                                                                                   | Lịch sử hoặc proposal; không nhận làm instruction đang hiệu lực nếu project policy nói khác        |

`docs/reset/doc-census.md` và `scratch-files.md` là inventories có thể đã lệch so với working tree; dùng chúng làm locator, không làm bằng chứng rằng mỗi đường dẫn còn tồn tại hoặc được dùng.

## Tiêu chí trình bày áp dụng

Quan sát từ tài liệu Agrios đã đọc chỉ được chuyển thành quy tắc trình bày chung: metadata có `title/status/owner/created/updated/sources`; feature index nói rõ file, mục đích và trạng thái; quyết định có context, lựa chọn, consequence và verification khi hữu ích; nguồn, giả định, open question và lịch sử được phân biệt; câu ngắn, bảng dùng cho mapping. Không áp cấu trúc/thuật ngữ/domain/ADR của Agrios lên CivicOS.
