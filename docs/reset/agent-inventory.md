# Kiểm kê agent hiện trạng — repo CivicOS

Nguồn: `APPLY.md` Bước 0. Ghi lúc bắt đầu áp dụng bộ chuẩn hóa v2.

## 1. `AGENTS.md` và `CLAUDE.md` hiện có

| File | Đường dẫn | Mục chính / ghi chú |
|------|-----------|---------------------|
| `AGENTS.md` | `D:\Project\CivicOS\AGENTS.md` (gốc repo) | ⚠️ OVERRIDE DIRECTIVE ghi đè hoàn toàn global `C:\Users\GODxDEMON\.config\opencode\AGENTS.md`. Mục: 1. Môi trường & Precedence; 2. Quy tắc gỡ Block (Propose-and-Verify); 3. Bản đồ Skill & Tự kiểm (diagnosing-bugs, tdd, ponytail, Hook `.agents/hooks/`); nextjs-agent-rules block. |
| `CLAUDE.md` | Chưa có ở gốc repo | Chỉ có bản gói cài đặt tại `D:\Project\CivicOS\docs\reset\agent-setup\CLAUDE.md` (nội dung `@AGENTS.md`). Theo Bước 1, `CLAUDE.md` chỉ chép nếu chưa có → sẽ chép. |
| Global `AGENTS.md` | `C:\Users\GODxDEMON\.config\opencode\AGENTS.md` | 6 dòng: PRECEDENCE RULE, project-local `AGENTS.md` ghi đè hoàn toàn, không tự ý áp dụng B5-B13 Waterfall nếu local có `AGENTS.md`/`migration-adapter.md`. |

## 2. Thư mục skill

| Thư mục | Loại | Số skill | Danh sách skill | Thật hay link |
|---------|------|----------|-----------------|---------------|
| `.agents/skills/` | Nguồn duy nhất (canonical) | 20 | `5w1h`, `claude-orchestrator-opencode`, `diagnosing-bugs`, `domain-modeling`, `grill-me`, `grill-with-docs`, `grilling`, `ponytail-audit`, `ponytail-debt`, `ponytail-gain`, `ponytail-help`, `ponytail-review`, `ponytail`, `research`, `resolving-merge-conflicts`, `six-thinking-hats`, `standards-spec-review`, `tdd`, `writing-for-agents` | Thư mục thật (không phải link) |
| `.opencode/skills/` | Runtime adapter (OpenCode) | 27 | `5w1h`, `gov-change-routing`, `gov-code-review`, `gov-commit`, `gov-contract-integrity`, `gov-data-model`, `gov-feature-council`, `gov-grill-with-docs`, `gov-implement`, `gov-innovation`, `gov-lesson-lifecycle`, `gov-phase-verify`, `gov-repo-architecture`, `gov-repo-refactor`, `gov-research-six-hats`, `gov-setup-project`, `gov-tdd`, `gov-to-phases`, `gov-ui-ux`, `gov-wayfinder`, `gov-workflow`, `ponytail-audit`, `ponytail-debt`, `ponytail-gain`, `ponytail-help`, `ponytail-review`, `ponytail` | Kiểm tra link/junction chưa xác thực (shell trước đây bị chặn) |
| `.claude/` | — | 0 | Không tồn tại trong repo | Không có |
| `.commandcode/` | — | 0 | Không tồn tại trong repo | Không có |
| Global `~/.config/opencode/` | Global | 0 skill | Chỉ có `AGENTS.md`, `service.json`, `package.json`, `package-lock.json`, `opencode.json`, `cli.json` + node_modules | Không có thư mục `skills/` |

Khi áp dụng: `.opencode/skills` và các runtime khác phải thành junction/link tới `.agents/skills` qua `scripts/setup-agent-tools.ps1` (Bước 5).

## 3. Ba tài liệu quy trình cũ (đến Bước 4 → `docs/archive/`)

| File | Đường dẫn | Số dòng |
|------|-----------|---------|
| `DESIGN_DOC_PROCESS.md` | `docs/archive/DESIGN_DOC_PROCESS.md` | 356 |
| `workflow.md` | `docs/archive/workflow.md` | 193 |
| `docs/AI-AGENT-WORKFLOW.md` | `docs/archive/AI-AGENT-WORKFLOW.md` | 624 |

Mỗi file chuyển sang `docs/archive/` kèm dòng đầu: `> superseded by docs/agents/cach-soan-tai-lieu.md`. Sau đó cập nhật mọi link trỏ tới chúng (báo danh sách link đã sửa trong báo cáo cuối).

## 4. `.scratch/`: số file theo từng thư mục con

| Thư mục con `.scratch/` | Số file |
|-------------------------|---------|
| `_templates` | 10 |
| `_workflow-adoption` | 4 |
| `cadn-map-asset` | 17 |
| `civicos-e1-business-parity` | 1 |
| `civicos-e1-clone-mvp` | 31 |
| `civicos-migration-reconciliation` | 8 |
| `civicos-ui-design-system` | 21 |
| `civicos-uiux-alignment` | 47 |
| `civicos-uiux-rebuild` | 41 |
| `civicos-unified-web-workspace` | 48 |
| `demo-seed-canonical-clean` | 2 |
| `demo-seed-complete` | 24 |
| `demo-seed-restart` | 40 |
| `readme-codebase-refresh` | 5 |
| `tinh-trang-ui-hien-tai` | 6 |
| `ui-auto-demo` | 45 |
| `land-module` | 39 |
| `land-parcel-map` | 34 |
| `codebase-review-demo-script` | 3 |
| `feature-map.md` (gốc `.scratch/`) | 1 |

Tổng thư mục con: 18. Tổng file trong `.scratch/`: 366 (bao gồm `feature-map.md` ở gốc).

> Số file đếm từ danh sách `glob .scratch/**/*` đã thu thập. Shell trước đây bị chặn nên chưa chạy lệnh đếm chính thức lại.

