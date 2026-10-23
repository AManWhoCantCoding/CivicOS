AGENTS.md | chưa rõ | GỐC do người viết | Quy tắc agent toàn cục cho repo CivicOS: precedence, quy tắc gỡ block, skill map, hook safety.
CONTEXT.md | chưa rõ | GỐC do người viết | Ngữ cảnh domain ANTT của CivicOS: ubiquitous language cho IntakeReport, Incident, Subject, Assignment, DomainEvent, SLA, VehicleObservation, Hotspot, GeoPoint/GeoArea.
README.md | chưa rõ | GỐC do người viết | Hướng dẫn chạy repo: quick start, env, docker, demo bootstrap/seed/reset, mobile, routes, testing, cấu trúc repo.
Requirement.md | chưa rõ | GỐC do người viết | Yêu cầu chức năng & phi chức năng Epic PS-E1 (10 story): bản đồ địa bàn, điểm nóng, đối tượng quản lý, cư dân đặc biệt, tố giác, phân tích xu hướng, cơ sở KDCĐK, cập nhật hiện trường, phương tiện lạ, báo cáo định kỳ — kèm actor, FR/NFR, căn cứ pháp lý, gap.
docs/archive/DESIGN_DOC_PROCESS.md | chưa rõ | GỐC do người viết | Quy trình tài liệu thiết kế CivicOS: adaptive routes (FULL_FEATURE/MICRO_CHANGE/BOUNDED_CHANGE/STRUCTURAL_CHANGE), skill chi tiết B1-B10, cấu trúc artifact .scratch/, nguyên tắc bắt buộc, resume/migration policy.
docs/archive/workflow.md | chưa rõ | GỐC do người viết | Workflow chuẩn v3.1 từ ý tưởng đến triển khai: B1-B4.5 research/luật/database, B5 feature council, B6 grill/design/SOW, B7 mockup, B8 phase/ticket, B9 implementation, B10 human review, B11 innovation — phân chia docs/.scratch, LOCK.json, matrix trách nhiệm.
docs/AI-AGENT-docs/archive/workflow.md | chưa rõ | GỐC do người viết | Bản đồ vận hành AI agent: snapshot workflow B1-B13, precedence nguồn sự thật, agent khai báo (research/techlead/developer/ui-ux/repo-architect), preflight, chi tiết từng bước B1-B13, cấu trúc artifact, LOCK.json, evidence, quyền ghi, MCP, suy luận được phép/cấm, trạng thái lỗi, frontier feature hiện có.
docs/demo-script.md | chưa rõ | GỐC do người viết | Kịch bản demo end-to-end: preflight an toàn, bootstrap demo database, account card, 6 scene web (login, intake→incident, inspection, vehicle, resident, map/land, worker), mobile native optional, acceptance checklist, reset/dọn dẹp, lỗi thường gặp.
docs/UI-map.md | chưa rõ | GỐC do người viết | (File không đọc được nội dung — chỉ ghi nhận từ README reference) Bản đồ UI/click path cho demo.
docs/Unit-test-using-playwright-rules.md | chưa rõ | GỐC do người viết | Quy tắc unit test dùng Playwright.
docs/runbooks/cadn-map-asset/README.md | chưa rõ | GỐC do người viết | Runbook tạo và cài CADN MBTiles: nguồn OSM PBF → cắt bbox CADN → OpenMapTiles extract → MBTiles → TileServer GL; bbox bắt buộc, kiểm tra metadata, smoke test, hash asset, xử lý khi thiếu asset.
docs/runbooks/cadn-map-asset/T-001-evidence.md | chưa rõ | GỐC do người viết | Evidence kiểm tra asset CADN.
docs/runbooks/ui-auto-demo/README.md | chưa rõ | GỐC do người viết | Runbook demo UI tự động.
docs/runbooks/ui-auto-demo/coverage.md | chưa rõ | GỐC do người viết | Coverage demo UI tự động.
docs/design/civicos-e1-clone-mvp/overview.md | chưa rõ | PHÁI SINH do agent sinh | Thiết kế tính năng clone MVP PS-E1: vấn đề/giải pháp, phạm vi trong/ngoài, bản đồ module, luồng chính 3 story, quy tắc nghiệp vụ, quyết định kỹ thuật, seam kiểm thử, nhật ký thay đổi.
docs/design/civicos-e1-clone-mvp/non-functional.md | chưa rõ | PHÁI SINH do agent sinh | Yêu cầu phi chức năng cho clone MVP.
docs/design/civicos-e1-clone-mvp/integration-contracts.md | chưa rõ | PHÁI SINH do agent sinh | Integration contracts cho clone MVP.
docs/design/civicos-e1-clone-mvp/glossary.md | chưa rõ | PHÁI SINH do agent sinh | Glossary cho clone MVP.
docs/design/civicos-e1-clone-mvp/edge-cases.md | chưa rõ | PHÁI SINH do agent sinh | Edge cases cho clone MVP.
docs/design/civicos-e1-clone-mvp/domain-rules.md | chưa rõ | PHÁI SINH do agent sinh | Domain rules cho clone MVP.
docs/design/civicos-e1-clone-mvp/api-contract.md | chưa rõ | PHÁI SINH do agent sinh | API contract cho clone MVP.
docs/design/civicos-e1-clone-mvp/data-model.md | chưa rõ | PHÁI SINH do agent sinh | Data model cho clone MVP.
docs/design/civicos-e1-business-parity/overview.md | chưa rõ | PHÁI SINH do agent sinh | Thiết kế B6 business parity cho E1-004/005/007 + mobile parity: nguồn, vấn đề, actor, AS-IS→GAP→TO-BE, feature map F-01..F-07, acceptance criteria, design gate.
docs/design/civicos-e1-business-parity/non-functional.md | chưa rõ | PHÁI SINH do agent sinh | Non-functional requirements cho business parity.
docs/design/civicos-e1-business-parity/integration-contracts.md | chưa rõ | PHÁI SINH do agent sinh | Integration contracts cho business parity.
docs/design/civicos-e1-business-parity/glossary.md | chưa rõ | PHÁI SINH do agent sinh | Glossary cho business parity.
docs/design/civicos-e1-business-parity/edge-cases.md | chưa rõ | PHÁI SINH do agent sinh | Edge cases cho business parity.
docs/design/civicos-e1-business-parity/domain-rules.md | chưa rõ | PHÁI SINH do agent sinh | Domain rules cho business parity.
docs/design/civicos-e1-business-parity/api-contract.md | chưa rõ | PHÁI SINH do agent sinh | API contract cho business parity.
docs/design/civicos-e1-business-parity/data-model.md | chưa rõ | PHÁI SINH do agent sinh | Data model cho business parity.
docs/design/civicos-ui-design-system/overview.md | chưa rõ | PHÁI SINH do agent sinh | Thiết kế UI design system: token, primitives, baseline visual.
docs/design/civicos-ui-design-system/non-functional.md | chưa rõ | PHÁI SINH do agent sinh | Non-functional cho UI design system.
docs/design/civicos-ui-design-system/integration-contracts.md | chưa rõ | PHÁI SINH do agent sinh | Integration contracts cho UI design system.
docs/design/civicos-ui-design-system/glossary.md | chưa rõ | PHÁI SINH do agent sinh | Glossary cho UI design system.
docs/design/civicos-ui-design-system/edge-cases.md | chưa rõ | PHÁI SINH do agent sinh | Edge cases cho UI design system.
docs/design/civicos-ui-design-system/domain-rules.md | chưa rõ | PHÁI SINH do agent sinh | Domain rules cho UI design system.
docs/design/civicos-ui-design-system/data-model.md | chưa rõ | PHÁI SINH do agent sinh | Data model cho UI design system.
docs/design/civicos-ui-design-system/api-contract.md | chưa rõ | PHÁI SINH do agent sinh | API contract cho UI design system.
docs/design/ui-auto-demo/overview.md | chưa rõ | PHÁI SINH do agent sinh | Thiết kế UI auto demo.
docs/design/ui-auto-demo/non-functional.md | chưa rõ | PHÁI SINH do agent sinh | Non-functional cho UI auto demo.
docs/design/ui-auto-demo/integration-contracts.md | chưa rõ | PHÁI SINH do agent sinh | Integration contracts cho UI auto demo.
docs/design/ui-auto-demo/glossary.md | chưa rõ | PHÁI SINH do agent sinh | Glossary cho UI auto demo.
docs/design/ui-auto-demo/edge-cases.md | chưa rõ | PHÁI SINH do agent sinh | Edge cases cho UI auto demo.
docs/design/ui-auto-demo/domain-rules.md | chưa rõ | PHÁI SINH do agent sinh | Domain rules cho UI auto demo.
docs/design/ui-auto-demo/data-model.md | chưa rõ | PHÁI SINH do agent sinh | Data model cho UI auto demo.
docs/design/ui-auto-demo/api-contract.md | chưa rõ | PHÁI SINH do agent sinh | API contract cho UI auto demo.
docs/design/civicos-e1-clone-mvp/overview.md | chưa rõ | PHÁI SINH do agent sinh | (Duplicate entry — đã ghi ở trên)
docs/design/civicos-e1-clone-mvp/non-functional.md | chưa rõ | PHÁI SINH do agent sinh | (Duplicate)
docs/design/civicos-e1-clone-mvp/integration-contracts.md | chưa rõ | PHÁI SINH do agent sinh | (Duplicate)
docs/design/civicos-e1-clone-mvp/glossary.md | chưa rõ | PHÁI SINH do agent sinh | (Duplicate)
docs/design/civicos-e1-clone-mvp/edge-cases.md | chưa rõ | PHÁI SINH do agent sinh | (Duplicate)
docs/design/civicos-e1-clone-mvp/domain-rules.md | chưa rõ | PHÁI SINH do agent sinh | (Duplicate)
docs/design/civicos-e1-clone-mvp/api-contract.md | chưa rõ | PHÁI SINH do agent sinh | (Duplicate)
docs/design/civicos-e1-clone-mvp/data-model.md | chưa rõ | PHÁI SINH do agent sinh | (Duplicate)
docs/design/demo-seed-complete/overview.md | chưa rõ | PHÁI SINH do agent sinh | Thiết kế demo seed complete.
docs/design/demo-seed-complete/data-model.md | chưa rõ | PHÁI SINH do agent sinh | Data model demo seed complete.
docs/design/demo-seed-complete/api-contract.md | chưa rõ | PHÁI SINH do agent sinh | API contract demo seed complete.
docs/design/demo-seed-restart/overview.md | chưa rõ | PHÁI SINH do agent sinh | Thiết kế demo seed restart.
docs/design/demo-seed-restart/non-functional.md | chưa rõ | PHÁI SINH do agent sinh | Non-functional demo seed restart.
docs/design/demo-seed-restart/integration-contracts.md | chưa rõ | PHÁI SINH do agent sinh | Integration contracts demo seed restart.
docs/design/demo-seed-restart/glossary.md | chưa rõ | PHÁI SINH do agent sinh | Glossary demo seed restart.
docs/design/demo-seed-restart/edge-cases.md | chưa rõ | PHÁI SINH do agent sinh | Edge cases demo seed restart.
docs/design/demo-seed-restart/domain-rules.md | chưa rõ | PHÁI SINH do agent sinh | Domain rules demo seed restart.
docs/design/demo-seed-restart/data-model.md | chưa rõ | PHÁI SINH do agent sinh | Data model demo seed restart.
docs/design/demo-seed-restart/api-contract.md | chưa rõ | PHÁI SINH do agent sinh | API contract demo seed restart.
docs/design/land-parcel-map/source-assessment.md | chưa rõ | PHÁI SINH do agent sinh | Source assessment cho land parcel map (AS-IS).
docs/design/land-parcel-map/overview.md | chưa rõ | PHÁI SINH do agent sinh | Thiết kế xem thửa đất trên bản đồ nội bộ: trạng thái B10, scope P0/P1, context, user, feature slices F-01..F-05, luồng web/mobile, boundary, data-model-impact, dependency/gate.
docs/design/land-parcel-map/non-functional.md | chưa rõ | PHÁI SINH do agent sinh | Non-functional cho land parcel map.
docs/design/land-parcel-map/integration-contracts.md | chưa rõ | PHÁI SINH do agent sinh | Integration contracts cho land parcel map.
docs/design/land-parcel-map/glossary.md | chưa rõ | PHÁI SINH do agent sinh | Glossary cho land parcel map.
docs/design/land-parcel-map/edge-cases.md | chưa rõ | PHÁI SINH do agent sinh | Edge cases cho land parcel map.
docs/design/land-parcel-map/domain-rules.md | chưa rõ | PHÁI SINH do agent sinh | Domain rules cho land parcel map.
docs/design/land-parcel-map/data-model.md | chưa rõ | PHÁI SINH do agent sinh | Data model cho land parcel map.
docs/design/land-parcel-map/api-contract.md | chưa rõ | PHÁI SINH do agent sinh | API contract cho land parcel map.
docs/design/civicos-uiux-alignment/overview.md | chưa rõ | PHÁI SINH do agent sinh | Thiết kế đồng bộ UI/UX toàn bộ CivicOS theo Light/Blue baseline: trạng thái B5-B10, current/required state, delta, must preserve, non-goals, data-model impact (NO KNOWN IMPACT), handoff.
docs/design/civicos-uiux-alignment/non-functional.md | chưa rõ | PHÁI SINH do agent sinh | Non-functional cho UI/UX alignment.
docs/design/civicos-uiux-alignment/integration-contracts.md | chưa rõ | PHÁI SINH do agent sinh | Integration contracts cho UI/UX alignment.
docs/design/civicos-uiux-alignment/glossary.md | chưa rõ | PHÁI SINH do agent sinh | Glossary cho UI/UX alignment.
docs/design/civicos-uiux-alignment/edge-cases.md | chưa rõ | PHÁI SINH do agent sinh | Edge cases cho UI/UX alignment.
docs/design/civicos-uiux-alignment/domain-rules.md | chưa rõ | PHÁI SINH do agent sinh | Domain rules cho UI/UX alignment.
docs/design/civicos-uiux-alignment/data-model.md | chưa rõ | PHÁI SINH do agent sinh | Data model cho UI/UX alignment.
docs/design/civicos-uiux-alignment/api-contract.md | chưa rõ | PHÁI SINH do agent sinh | API contract cho UI/UX alignment.
docs/design/civicos-unified-web-workspace/overview.md | chưa rõ | PHÁI SINH do agent sinh | Thiết kế unified web workspace: root workspace role-aware, shell, registry, land anchor, identity/assignment, ẩn navigation PS-E1-004/005/007 nhưng giữ route/API, mobile visual audit, decision closure.
docs/design/civicos-unified-web-workspace/non-functional.md | chưa rõ | PHÁI SINH do agent sinh | Non-functional cho unified web workspace.
docs/design/civicos-unified-web-workspace/integration-contracts.md | chưa rõ | PHÁI SINH do agent sinh | Integration contracts cho unified web workspace.
docs/design/civicos-unified-web-workspace/glossary.md | chưa rõ | PHÁI SINH do agent sinh | Glossary cho unified web workspace.
docs/design/civicos-unified-web-workspace/edge-cases.md | chưa rõ | PHÁI SINH do agent sinh | Edge cases cho unified web workspace.
docs/design/civicos-unified-web-workspace/domain-rules.md | chưa rõ | PHÁI SINH do agent sinh | Domain rules cho unified web workspace.
docs/design/civicos-unified-web-workspace/data-model.md | chưa rõ | PHÁI SINH do agent sinh | Data model cho unified web workspace.
docs/design/civicos-unified-web-workspace/api-contract.md | chưa rõ | PHÁI SINH do agent sinh | API contract cho unified web workspace.
docs/design/land-module/overview.md | chưa rõ | PHÁI SINH do agent sinh | Thiết kế land-module: vấn đề/giải pháp, phạm vi F-01..F-07, bản đồ module, luồng chính 8 bước, quy tắc nghiệp vụ & state machine, quyết định kỹ thuật, seam kiểm thử, nhật ký thay đổi.
docs/design/land-module/non-functional.md | chưa rõ | PHÁI SINH do agent sinh | Non-functional cho land module.
docs/design/land-module/integration-contracts.md | chưa rõ | PHÁI SINH do agent sinh | Integration contracts cho land module.
docs/design/land-module/glossary.md | chưa rõ | PHÁI SINH do agent sinh | Glossary cho land module.
docs/design/land-module/edge-cases.md | chưa rõ | PHÁI SINH do agent sinh | Edge cases cho land module.
docs/design/land-module/domain-rules.md | chưa rõ | PHÁI SINH do agent sinh | Domain rules cho land module (DR-01..DR-22).
docs/design/land-module/data-model.md | chưa rõ | PHÁI SINH do agent sinh | Data model cho land module (8 bảng, PostGIS).
docs/design/land-module/api-contract.md | chưa rõ | PHÁI SINH do agent sinh | API contract cho land module.
docs/adr/0001-land-module-boundaries.md | chưa rõ | GỐC do người viết | ADR ranh giới kiến trúc land-module: LandChangeApplication aggregate điều phối, mutate LandRight/LandParcel/LandEncumbrance chỉ khi completed, adapter mock quốc gia, PostGIS geometry qua SQL parameterized seam.
docs/adr/0002-land-parcel-map-projection-boundary.md | chưa rõ | GỐC do người viết | ADR boundary map projection thửa đất: tạo read projection boundary riêng /api/map/land-parcels, field tối thiểu, reuse land access policy, web/mobile cùng contract, read-only, không legal-boundary claim.
docs/adr/0003-shared-civicos-ui-design-tokens.md | chưa rõ | GỐC do người viết | ADR shared UI design tokens: light neutral workspace, light/blue baseline từ land-parcel-map, typography system sans/monospace, spacing/radius/touch target, semantic state colors.
docs/adr/0004-civicos-uiux-alignment.md | chưa rõ | GỐC do người viết | ADR đồng bộ UI/UX toàn bộ CivicOS theo Light/Blue baseline: scope UI-only, dependency từ foundation, mobile read-only, boundary không thay đổi business/API/data/permission/route/map/legal.
docs/adr/0005-e1-mobile-parity-boundaries.md | chưa rõ | GỐC do người viết | ADR mobile parity có kiểm soát cho E1-004/005/007: cho phép action/write theo actor/OU/Assignment, offline allowlist 4 command, approval online-only, app sourceChannel, GPS theo action, land bounded context riêng, PS-E1-009 removal structural.
docs/design/land-module/overview.md | chưa rõ | PHÁI SINH do agent sinh | (Duplicate — đã ghi ở trên)
docs/design/land-module/non-functional.md | chưa rõ | PHÁI SINH do agent sinh | (Duplicate)
docs/design/land-module/integration-contracts.md | chưa rõ | PHÁI SINH do agent sinh | (Duplicate)
docs/design/land-module/glossary.md | chưa rõ | PHÁI SINH do agent sinh | (Duplicate)
docs/design/land-module/edge-cases.md | chưa rõ | PHÁI SINH do agent sinh | (Duplicate)
docs/design/land-module/domain-rules.md | chưa rõ | PHÁI SINH do agent sinh | (Duplicate)
docs/design/land-module/data-model.md | chưa rõ | PHÁI SINH do agent sinh | (Duplicate)
docs/design/land-module/api-contract.md | chưa rõ | PHÁI SINH do agent sinh | (Duplicate)
docs/design/civicos-unified-web-workspace/overview.md | chưa rõ | PHÁI SINH do agent sinh | (Duplicate — đã ghi ở trên)
docs/design/civicos-unified-web-workspace/non-functional.md | chưa rõ | PHÁI SINH do agent sinh | (Duplicate)
docs/design/civicos-unified-web-workspace/integration-contracts.md | chưa rõ | PHÁI SINH do agent sinh | (Duplicate)
docs/design/civicos-unified-web-workspace/glossary.md | chưa rõ | PHÁI SINH do agent sinh | (Duplicate)
docs/design/civicos-unified-web-workspace/edge-cases.md | chưa rõ | PHÁI SINH do agent sinh | (Duplicate)
docs/design/civicos-unified-web-workspace/data-model.md | chưa rõ | PHÁI SINH do agent sinh | (Duplicate)
docs/design/civicos-unified-web-workspace/api-contract.md | chưa rõ | PHÁI SINH do agent sinh | (Duplicate)
playwright/README.md | chưa rõ | GỐC do người viết | README cho Python browser acceptance suite (Playwright).
