---
title: 'Decision Log — Các câu hỏi chưa trả lời từ baseline'
status: proposed
owner: unknown
created: unknown
updated: 2026-10-22
sources:
  - docs/reset/requirements-baseline.md
  - docs/reset/audit-001.md
  - docs/reset/audit-002.md
  - docs/reset/audit-003.md
  - docs/reset/audit-004.md
  - docs/reset/audit-005.md
  - docs/reset/audit-006.md
  - docs/reset/audit-007.md
  - docs/reset/audit-008.md
  - docs/reset/audit-009.md
  - docs/reset/audit-010.md
  - docs/reset/audit-cross-cutting.md
  - 'PO decision: CIVICOS — PILOT 01: APPROVED IDENTITY PROVISIONING → DEMO SANDBOX → WEB STARTUP (2026-10-19)'
---

# Decision Log — Các câu hỏi chưa trả lời từ baseline

| ID | Câu hỏi | Trạng thái | Nguồn (story / yêu cầu) |
|---|---|---|---|
| D-01 | "Trưởng CA xã" ứng với role `commander` hay `commune_leader`? | Đã trả lời — PO-APPROVED (2026-10-21): E1 dùng `commander`; Land giữ `commune_leader` theo contract riêng. | PS-E1-001..010 (Actor tables), FR-005-02, NFR-005-02 |
| D-02 | Đơn vị nhận hồ sơ vượt thẩm quyền hiện nay là cấp nào, có cấu hình được không? (Gap 2: bỏ cấp huyện từ 01/3/2025) | Đã trả lời — PO-APPROVED (2026-10-21): OrganizationUnit cấp trên được cấu hình; không hard-code `district`. | Gap 2, FR-005-05, FR-002-08, FR-004-04, FR-004-06, FR-006-07, FR-009-05, FR-010-06 |
| D-03 | "Thông báo kết quả cho người tố giác" (FR-005-07, NFR-005-04): gửi tới người dân (kênh nào: SMS/FCM/email/app) hay nhắc cán bộ? | Đã trả lời — PO-APPROVED (2026-10-21): nếu không có SMS/FCM provider được phép thì delivery cho người tố giác nằm ngoài acceptance; in-app notification cho cán bộ không thay thế delivery đó. | FR-005-07, NFR-005-04 |
| D-04 | Reveal danh tính người tố giác: Trưởng CA xã tự xem được hay cần thêm grant/Assignment? (FR-005-02, NFR-005-02) | Đã trả lời — PO-APPROVED (2026-10-21): `commander` cùng đơn vị, có `read_sensitive` và Assignment/grant theo hồ sơ. | FR-005-02, NFR-005-02 |
| D-05 | Có làm app công dân (public citizen app) cho kênh `app` không? (Actor "Người dân — Mobile (app công dân)") | Đã trả lời — PO-APPROVED (2026-10-21): không làm public app/route; giữ `app` làm metadata nguồn do cán bộ nội bộ ghi nhận từ ứng dụng bên ngoài. | PS-E1-005 Actor table, FR-005-01 (sourceChannel: app) |
| D-06 | "cấp xã/phường" trong FR-001-01 — xác nhận đơn vị hành chính chính xác (xã Nghĩa Trụ hay cấp xã chung)? | Chưa trả lời | PS-E1-001 (`docs/reset/audit-001.md`) |
| D-07 | "đơn vị xử lý" trong FR-001-04 — tham chiếu OrganizationUnit nào (cấp xã, cấp huyện)? | Chưa trả lời | PS-E1-001 (`docs/reset/audit-001.md`) |
| D-08 | NFR-001-02 yêu cầu "nguồn VietGeoX/VBDLIS" — có hợp đồng/cấp phép truy cập không? | Chưa trả lời | PS-E1-001 (`docs/reset/audit-001.md`) |
| D-09 | "Cán bộ An ninh xã" / "Cán bộ trực ban" — map sang role nào trong catalog? | Chưa trả lời | PS-E1-001 (`docs/reset/audit-001.md`) |
| D-10 | "Cán bộ An ninh xã Nghĩa Trụ" — có phải role `village_officer` hoặc role riêng không? | Chưa trả lời | PS-E1-002 (`docs/reset/audit-002.md`) |
| D-11 | "phụ trách khu vực" trong NFR-002-03 — xác định bằng Assignment hay OrganizationUnit? | Chưa trả lời | PS-E1-002 (`docs/reset/audit-002.md`) |
| D-12 | "CA huyện" trong FR-002-08 — xem Gap 2 (đã bỏ cấp huyện, cần cấu hình được đơn vị cấp trên). | Chưa trả lời | PS-E1-002 (`docs/reset/audit-002.md`) |
| D-13 | Baseline NFR-002-04 "ngưỡng 4 tuần phải cấu hình được" — khi triển khai Hotspot, cấu hình ở đâu (config table, env, SLA kind)? | Chưa trả lời | PS-E1-002 (`docs/reset/audit-002.md`) |
| D-14 | "loại (Trộm cắp/Ma túy/TNXH/Khiếu kiện/Khác)" — danh sách này có mở rộng được không? | Chưa trả lời | PS-E1-002 (`docs/reset/audit-002.md`) |
| D-15 | "Cán bộ phụ trách tái hòa nhập" — role cụ thể nào (`field_officer`, `village_officer`, role mới)? | Chưa trả lời | PS-E1-003 (`docs/reset/audit-003.md`) |
| D-16 | FR-003-03 "tần suất cấu hình theo mức độ nguy cơ (tuần/2 tuần/tháng)" — riskLevel hiện có trong ManagementRecord nhưng không dùng cho SLA. Cách cấu hình: config table, env, hay SLA kind? | Chưa trả lời | PS-E1-003 (`docs/reset/audit-003.md`) |
| D-17 | "phân loại (hình sự/ma túy/TNXH)" — danh sách này có mở rộng được không? | Chưa trả lời | PS-E1-003 (`docs/reset/audit-003.md`) |
| D-18 | "CA huyện" trong FR-003-01, FR-003-08 — xem Gap 2 (cấu hình được đơn vị cấp trên). | Chưa trả lời | PS-E1-003 (`docs/reset/audit-003.md`) |
| D-19 | "Cán bộ thôn" — role `village_officer` hay role riêng? | Đã trả lời — PO-APPROVED (2026-10-21): dùng `village_officer`, vẫn cần Assignment cho hồ sơ. | PS-E1-004 (`docs/reset/audit-004.md`) |
| D-20 | "tự động báo CA huyện" (FR-004-04, FR-004-06) — đơn vị cấp trên cấu hình được không (Gap 2)? | Đã trả lời — PO-APPROVED (2026-10-21): dùng OrganizationUnit cấp trên được cấu hình, không hard-code cấp huyện. | PS-E1-004 (`docs/reset/audit-004.md`) |
| D-21 | "ảnh, lý lịch, tội danh" (FR-004-02) — có field này trong Subject/Record không? Cần mở rộng schema? | Đã trả lời — PO-APPROVED (2026-10-21): field tối thiểu theo FR-004-02; chi tiết field/schema phải giữ tối thiểu hóa dữ liệu, mã hóa/masking và audit. | PS-E1-004 (`docs/reset/audit-004.md`) |
| D-22 | Mobile write flow cho cán bộ thôn ghi activity — ADR-0005 cho phép, nhưng code hiện chỉ read-only. Khi triển khai? | Đã trả lời — PO-APPROVED (2026-10-21): Mobile nội bộ theo B6 allowlist; activity E1-004 và một số thao tác E1-007 được queue offline, E1-005 mutation và authority action online-only. | PS-E1-004 (`docs/reset/audit-004.md`) |
| D-23 | "vụ việc ANTT" trong FR-006-01 — tập hợp entity nào (IntakeReport, Incident, Hotspot, Vehicle...)? | Chưa trả lời | PS-E1-006 (`docs/reset/audit-006.md`) |
| D-24 | "loại vụ việc" để cấu hình ngưỡng 30% — danh mục từ đâu (PS-E1-001..010)? | Chưa trả lời | PS-E1-006 (`docs/reset/audit-006.md`) |
| D-25 | "cơ chế đo tỷ lệ giảm tội phạm" (NFR-006-04) — chỉ hiển thị hay cần workflow hậu kiểm? | Chưa trả lời | PS-E1-006 (`docs/reset/audit-006.md`) |
| D-26 | "CA huyện" trong FR-006-07 — xem Gap 2 (cấu hình được đơn vị cấp trên). | Chưa trả lời | PS-E1-006 (`docs/reset/audit-006.md`) |
| D-27 | Heat map — dùng library nào (maplibre-gl heatmap layer, deck.gl, custom)? | Chưa trả lời | PS-E1-006 (`docs/reset/audit-006.md`) |
| D-28 | "Phòng CSKT huyện" — role `superior_officer`/`superior_commander` hay role riêng? | Đã trả lời — PO-APPROVED (2026-10-21): dùng `superior_officer`, giới hạn theo OrganizationUnit/Assignment. | PS-E1-007 (`docs/reset/audit-007.md`) |
| D-29 | NFR-007-03 "vi phạm xử lý trong 7 ngày" — SLA cho recommendation chưa thấy tạo. Cần tạo SLA kind `recommendation_processing_7d` khi submitRecommendation? | Đã trả lời — PO-APPROVED (2026-10-21): recommendation phải được approve/return/transfer trong 7 ngày; transfer là kết quả xử lý của nhánh này, không phải quyết định xử phạt pháp lý. | PS-E1-007 (`docs/reset/audit-007.md`) |
| D-30 | "chuyển huyện" trong FR-007-06 — xem Gap 2 (cấu hình được đơn vị cấp trên). | Đã trả lời — PO-APPROVED (2026-10-21): chuyển tới OrganizationUnit cấp trên được cấu hình. | PS-E1-007 (`docs/reset/audit-007.md`) |
| D-31 | Checklist template versioning — ai quản lý template (cấp tỉnh/cấp xã)? Có sync từ cấp trên không? | Đã trả lời — PO-APPROVED (2026-10-21): `office_officer` ở đơn vị địa phương quản lý checklist versioned; mỗi Inspection giữ version đã dùng. | PS-E1-007 (`docs/reset/audit-007.md`) |
| D-32 | "tình huống" — là `Incident` hay entity riêng `FieldUpdate`? (CONTEXT.md có FieldUpdate nhưng code chưa thấy). | Chưa trả lời | PS-E1-008 (`docs/reset/audit-008.md`) |
| D-33 | "app mobile" — mobile internal (cán bộ) hay public citizen app? | Chưa trả lời | PS-E1-008 (`docs/reset/audit-008.md`) |
| D-34 | NFR-008-05 `[BỔ SUNG]` "cần xác nhận với đơn vị nghiệp vụ" — offline sync cho field update có áp dụng framework `platform/field-sync` không? | Chưa trả lời | PS-E1-008 (`docs/reset/audit-008.md`) |
| D-35 | "push notification realtime" — dùng FCM/APNs hay Socket.IO? Có infrastructure không? | Chưa trả lời | PS-E1-008 (`docs/reset/audit-008.md`) |
| D-36 | "Trưởng CA xã" nhận push — role `commander` hay `commune_leader`? (D-01). | Chưa trả lời | PS-E1-008 (`docs/reset/audit-008.md`) |
| D-37 | "CSDL xe nghi vấn" — là `SuspiciousVehicleRegistry` hay CSDL riêng? | Chưa trả lời | PS-E1-009 (`docs/reset/audit-009.md`) |
| D-38 | "CA huyện" trong FR-009-05, NFR-009-03 — xem Gap 2 (cấu hình được đơn vị cấp trên). | Chưa trả lời | PS-E1-009 (`docs/reset/audit-009.md`) |
| D-39 | "tổ tự quản thôn" — role `village_officer` hay role riêng? | Chưa trả lời | PS-E1-009 (`docs/reset/audit-009.md`) |
| D-40 | "app công dân" cho Người dân — public citizen app có trong phạm vi không? | Chưa trả lời | PS-E1-009 (`docs/reset/audit-009.md`) |
| D-41 | SLA "phương tiện dừng > 48h → kiểm tra 4h" — logic detect như thế nào (parking detection, camera, manual report)? | Chưa trả lời | PS-E1-009 (`docs/reset/audit-009.md`) |
| D-42 | "Báo cáo ANTT định kỳ" — có phải merge resident/incident/inspection/vehicle/hotspot vào một report không? Hay tách riêng? | Chưa trả lời | PS-E1-010 (`docs/reset/audit-010.md`) |
| D-43 | "Mẫu CA huyện" — có file mẫu tham chiếu không? (NFR-010-02). | Chưa trả lời | PS-E1-010 (`docs/reset/audit-010.md`) |
| D-44 | "Ký số" — chuẩn/chứng thư nào (CA Việt Nam, VNeID, tự ký)? (NFR-010-04). | Chưa trả lời | PS-E1-010 (`docs/reset/audit-010.md`) |
| D-45 | "CA huyện" nhận báo cáo — xem Gap 2 (cấu hình được đơn vị cấp trên). | Chưa trả lời | PS-E1-010 (`docs/reset/audit-010.md`) |
| D-46 | Scheduler chạy đúng kỳ (tuần 6, tháng 25, quý 20) — dùng cron, pg_cron, hay application scheduler? | Chưa trả lời | PS-E1-010 (`docs/reset/audit-010.md`) |
| D-52 | Chỉ áp dụng cho provisioning `land_officer` qua `POST /api/identity/users`: commander đã xác thực qua session hợp lệ, có organization unit hợp lệ và active; tài khoản mới nhận đúng organization unit đang hoạt động của commander, không nhận unit từ client; không tự cấp Assignment; giữ nguyên server authorization, password hashing, audit `user.created`, validation và transaction. Không thay đổi provisioning role khác, `GET /api/identity/users`, endpoint Identity khác hoặc trạng thái phê duyệt toàn bộ API contract cũ; không mở rộng role/quyền khác. | Đã trả lời — PO-APPROVED (2026-10-19) | NGOÀI BASELINE — “CIVICOS — PILOT 01: APPROVED IDENTITY PROVISIONING → DEMO SANDBOX → WEB STARTUP”, §1 mục 1–9, §2 Gate A. D-47..D-51 đã được phân bổ cho câu hỏi cross-cutting tại `docs/reset/audit-cross-cutting.md:88-92`. |
| D-53 | Cho phép SAFE DEMO-ONLY Commander bootstrap trong sandbox độc lập Pilot 01 theo prefix `civicos-pilot01-20261019-r01`, DB `civicos_demo`, host `127.0.0.1`, PostgreSQL port `55432`, image `postgis/postgis:16-3.4`; không dùng DB/Compose/resources cũ. Trước mọi DB write phải xác minh DB identity. Không chốt sẵn username/email, OrganizationUnit hay tên container/network/volume; implementer chọn danh tính/unit synthetic active phù hợp source/policy và resource names theo prefix, collision-free; nếu cần đơn vị nghiệp vụ thật thì hỏi PO trước. Credential Commander phải CSPRNG, không hardcode/commit/terminal output/command args, có secure handoff; không dùng `civicos-dev`. Techlead chọn và chứng minh local secret-storage workflow trong đúng Windows user context; nếu không có cách an toàn thì dừng phần phụ thuộc credential. Kiểm tra `ensureDevelopmentUsers()` để login/GET không khôi phục password mặc định hoặc tạo actor đặc quyền yếu; không dùng env flag đơn giản làm security bypass, không đổi production auth. Bootstrap idempotent, fail-closed, dùng password hash hiện hành và audit; Techlead QC trước first DB write. Sau đó login qua API thật, provision land_officer đúng D-52, xác nhận cùng unit, cấp Assignment riêng qua API/service hợp lệ, kiểm tra authorization/masking/audit, tiếp tục synthetic seed/API smoke; không bootstrap commune_leader. Dừng ở PO Phase 3 Review Gate. | Đã trả lời — PO-APPROVED (2026-10-20) | Ngoài baseline — “CIVICOS PHASE 3 — PO DECISION COMPLETION” (2026-10-20); tiếp nối D-52. |
| D-54 | Bản quyết định PO còn thiếu đã được cung cấp. Identity/unit, resource naming và secret-store implementation không bị ấn định cứng: dùng synthetic active unit theo source/policy, collision-free Docker names theo prefix, và cơ chế bàn giao cục bộ được Techlead chứng minh; không cần hỏi lại trừ khi phát sinh lựa chọn nghiệp vụ hoặc rủi ro bảo mật ngoài phạm vi. Bootstrap phải idempotent/fail-closed, không tạo hoặc reset fixture yếu, dùng hash hiện hành/audit; không tạo commune_leader. | Đã trả lời — PO-APPROVED (2026-10-20) | “CIVICOS PHASE 3 — PO DECISION COMPLETION”, mục 2–6. |
| D-55 | FR-007-05/06: “xử phạt” là recommendation hay quyết định pháp lý? | Đã trả lời — PO-APPROVED (2026-10-21): Finding → EnforcementRecommendation; approve/return/transfer theo thẩm quyền, không phát hành quyết định xử phạt pháp lý. | PS-E1-007 FR-007-05/06; NFR-007-03 |
| D-56 | NFR-004-02/NFR-007-01: mẫu số để đo “100%” là gì? | Đã trả lời — PO-APPROVED (2026-10-21): đo trên hồ sơ/cơ sở active trong registry CivicOS; không khẳng định độ đầy đủ của toàn bộ dân cư/cơ sở ngoài hệ thống. | PS-E1-004 NFR-004-02; PS-E1-007 NFR-007-01 |
| D-57 | NFR-007-02: GPS/Evidence có được tuyên bố đủ giá trị pháp lý không? | Đã trả lời — PO-APPROVED (2026-10-21): nghiệm thu technical provenance; không tuyên bố tính thừa nhận pháp lý nếu chưa có chuẩn/authority được xác nhận. | PS-E1-007 NFR-007-02 |
| D-58 | Phạm vi có bao gồm structural removal PS-E1-009 không? | Đã trả lời — PO-APPROVED (2026-10-21): không; work item chỉ gồm E1-004/005/007 và Land. Không xóa Vehicle/source/data theo SOW draft. | Scope PO xác nhận trong hội thoại 2026-10-21; `AGENTS.md` §8.2 |
| D-59 | Tiêu chí phân loại tố giác “đủ cơ sở điều tra / cần xác minh thêm” có được tự động hóa/chuẩn hóa trong CivicOS không? | Đã trả lời — PO-APPROVED (2026-10-21): cán bộ có thẩm quyền chọn một trong hai giá trị; hệ thống không tự suy luận hoặc đặt tiêu chí pháp lý. | PS-E1-005 FR-005-03; `docs/reset/requirements-baseline.md:181,196` |
| D-60 | Checklist theo loại hình cơ sở lấy danh mục/nghĩa vụ chuẩn từ đâu? | Đã trả lời — PO-APPROVED (2026-10-21): lấy nội dung chuẩn từ nguồn pháp lý chính thức; `office_officer` quản lý phiên bản, local additions phải được nhận diện riêng, không trình bày như mẫu pháp lý. | PS-E1-007 FR-007-03/NFR-007-04; `docs/reset/requirements-baseline.md:255,263,269` |
| D-61 | Role CivicOS cho cán bộ hộ khẩu, trực ban, hiện trường và người nhận E1-004/005 ở cấp trên là gì? | Đã trả lời — PO-APPROVED (2026-10-22): hộ khẩu → `office_officer`; trực ban → `duty_officer`; hiện trường E1-005/E1-007 → `field_officer`; người nhận E1-004/005 → `superior_officer` tại OrganizationUnit cấu hình + Assignment. E1-007 CSKT giữ `superior_officer` theo D-28. | PS-E1-004 Actor table; PS-E1-005 Actor table; PS-E1-007 Actor table (`docs/reset/requirements-baseline.md:128-135,166-173,240-247`) |
| D-62 | Phạm vi loại hình pilot cho PS-E1-007 là gì? | Đã trả lời — PO-APPROVED (2026-10-22): giới hạn trong các loại hình kinh doanh có điều kiện về an ninh, trật tự thuộc phạm vi Nghị định 96/2016/NĐ-CP và các sửa đổi đang có hiệu lực tại thời điểm áp dụng; không mở rộng sang mọi ngành, nghề kinh doanh có điều kiện. Danh sách loại hình và checklist cụ thể chỉ được chốt sau khi đối chiếu toàn văn chính thức hiện hành; chưa tuyên bố tuân thủ pháp lý khi việc đối chiếu chưa hoàn tất. | PS-E1-007; `docs/reset/requirements-baseline.md:237-269`; PO confirmation 2026-10-22; official metadata: Nghị định 96/2016, Nghị định 56/2023, Nghị định 58/2026 và Nghị định 392/2026 (có hiệu lực 2026-11-15) tại Cổng Văn bản Chính phủ |
| D-63 | Ai được ghi activity `resident.record_activity` cho hồ sơ E1-004, bao gồm thao tác offline theo D-22? | Đã trả lời — PO-APPROVED (2026-10-22): cả 5 role `commander`, `duty_officer`, `field_officer`, `office_officer`, `village_officer` được ghi khi có Assignment `resident_followup` active trên đúng hồ sơ và cùng OU. | D-19/D-22/D-61; PS-E1-004; xác nhận PO 2026-10-22 |
| D-64 | E1-007 `EnforcementRecommendation`: ai được submit/approve/return/transfer và với scope/Assignment nào? | Đã trả lời — PO-APPROVED (2026-10-22): `field_officer` submit với Assignment `inspection_fieldwork` active trên đúng `Inspection`, cùng OU; `commander` cùng OU approve/return/transfer, không cần Assignment thứ hai; submitter không được tự approve/return; transfer tới OU cấp trên cấu hình là quyết định cuối, không cần recipient acceptance; không thêm authority cho `superior_officer`. | D-22, D-55, D-61; `docs/rbac/role-matrix-v2.md:40,47,60`; xác nhận PO 2026-10-22 |
