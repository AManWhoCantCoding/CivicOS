---
title: CivicOS — guided UI demo runner
status: draft
owner: project
created: 2026-10-23
updated: 2026-10-23
sources:
  - ../../../docs/ui-auto-demo/overview.md
  - ../../../docs/ui-auto-demo/LOCK.json
  - ../../../brain/domains/demo-runner/research/input.md
  - ../../../brain/domains/demo-runner/research/law-summary.md
  - ../../../docs/runbooks/ui-auto-demo/README.md
  - ../../../docs/runbooks/ui-auto-demo/coverage.md
  - ../../../docs/demo-script.md
  - ../../../.scratch/ui-auto-demo/workflow-status.md
---

# CivicOS — guided UI demo runner

## Mục tiêu và trạng thái

`ui-auto-demo` đề xuất một Demo Center/runner có narrator tiếng Việt, pacing và coverage các nhánh happy/negative để người trình bày không phải tự điều hướng. Workflow hiện ghi B5–B10 approved/complete và B11 `READY_FOR_IMPLEMENTATION_HANDOFF`; **production implementation chưa dispatch** theo status được đọc. Không gọi thiết kế này là feature đã triển khai.

Runner điều phối UI thật; không phải Playwright test harness thay thế, không phải API nghiệp vụ và không phải công cụ quản trị hạ tầng.

## Runtime behavior được thiết kế

- Phạm vi điều phối: web và native mobile.
- Live mutation: web only và target `civicos` trên Docker Compose local, loopback port `5432`; scene/manifest/cleanup/replay cần allowlist rõ. Quyết định target: `docs/reset/decision-log.md` D-80.
- Mobile: chỉ native UI và read APIs; giữ `WriteGuard`/read-only boundary.
- Persona: đăng nhập/chuyển persona qua local/demo credential provider; không dùng production credential, không hard-code secret, không đổi cookie tùy tiện.
- Pacing mặc định: 3.000 ms sau khi action settle và trước thao tác tiếp theo; readiness wait là cơ chế riêng.
- Component interaction: click/type/open-select/choose/checkbox/dialog/navigation/submit theo đúng thứ tự UI semantics; không gọi API thay UI hoặc sửa DOM/state để giả lập.
- Hạ tầng: operator tự khởi động DB, worker, web, map provider, Metro/emulator/device; runner chỉ preflight và biểu diễn `blocked`.
- Negative state: loading, empty, validation, forbidden, offline, error, simulated/provider unavailable được kể rõ, không âm thầm bỏ qua.

## An toàn, quyền và dữ liệu

1. Không vượt session, role, OU, Assignment, masking, audit hoặc server authorization.
2. Chỉ synthetic/masked data. Không đưa PII, credential, secret hoặc raw response/payload vào narrator, log, accessibility text, screenshot hay evidence.
3. Không thực hiện mobile write; không đưa runner vào production operation.
4. Không xem `simulated`, provider fallback, public lookup hoặc map polygon là dữ liệu/ranh giới có giá trị pháp lý.
5. Start/pause/resume/stop/replay phải tôn trọng cleanup/idempotency contract; không tự reset/destructively cleanup database từ nút demo.

## Phân biệt với demo thủ công và test

- `docs/demo-script.md` là kịch bản người trình bày chạy từng bước với operator-controlled prerequisites.
- `docs/runbooks/ui-auto-demo/` ghi coverage/handoff và prerequisite.
- `tests/**`/`playwright/` là harness kiểm thử, không tự chứng minh runner có sẵn trong sản phẩm.
- Feature design/lock mô tả contract; `.scratch/ui-auto-demo/workflow-status.md` mô tả status/handoff. Đọc tất cả trước khi triển khai.

## Handoff gates

Trước khi coi runner sẵn sàng, kiểm tra implementation ticket/file scope, target guard, persona broker, cleanup disposition, web mutation allowlist, mobile read-only, accessibility narration, evidence minimization, negative states và failure behavior. Status artifact cũ không thay thế verification thực tế tại thời điểm handoff.
