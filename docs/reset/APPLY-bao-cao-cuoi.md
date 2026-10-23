# BÁO CÁO CUỐI — Áp dụng bộ chuẩn hóa agent (APPLY.md v2) vào repo CivicOS

Nguồn: `D:\Project\CivicOS\docs\reset\agent-setup\APPLY.md`. Thực hiện tại repo `D:\Project\CivicOS`.
Ngày thực hiện: 2026-10-16. Agent: OpenCode (role `research`).

> Quy tắc báo cáo theo `AGENTS.proposed.md` §3–§4: dẫn file:line thật, không tự đánh giá chất lượng, chỉ ghi việc đã làm.

---

## 1. Danh sách file tạo / đổi / chuyển

### Tạo mới
| # | File / thư mục | Bước | Ghi chú |
|---|----------------|------|---------|
| 1 | `docs/reset/agent-inventory.md` | Bước 0 | Kiểm kê hiện trạng (AGENTS.md, CLAUDE.md, skill, 3 tài liệu cũ, `.scratch/`) |
| 2 | `CLAUDE.md` (gốc repo) | Bước 1 | Chép từ gói (`@AGENTS.md`) — trước đây chưa có |
| 3 | `.agents/dev-agent.md` | Bước 1 | Chép từ gói — trước đây chưa có |
| 4 | `scripts/setup-agent-tools.ps1` | Bước 1 | Chép từ gói — trước đây chưa có |
| 5 | `docs/archive/` (thư mục) | Bước 4 | Tạo để nhận 3 tài liệu cũ |
| 6 | `docs/archive/DESIGN_DOC_PROCESS.md` | Bước 4 | Chuyển từ gốc + thêm dòng đầu `> superseded by docs/agents/cach-soan-tai-lieu.md` |
| 7 | `docs/archive/workflow.md` | Bước 4 | Chuyển từ gốc + thêm dòng đầu |
| 8 | `docs/archive/AI-AGENT-WORKFLOW.md` | Bước 4 | Chuyển từ `docs/` + thêm dòng đầu |
| 9 | `.agents/skills-archive/` (thư mục) | Bước 5 | Tạo để nhận skill thật của `.opencode/skills` |
| 10 | `.agents/skills-archive/opencode-skills-real/` | Bước 5 | Chuyển toàn bộ thư mục thật `.opencode/skills` (27 skill) vào đây |
| 11 | `.opencode/skills` (junction) | Bước 5 | Tạo junction → `.agents\skills` |
| 12 | `.commandcode/skills` (junction) | Bước 5 | Tạo junction → `.agents\skills` |

### Đổi (ghi đè / sửa nội dung)
| # | File | Bước | Ghi chú |
|---|------|------|---------|
| 1 | `.agents/README.md` | Bước 1 | Ghi đè bằng bản agrios (đã tồn tại, người dùng cho phép) |
| 2 | `.agents/skills/README.md` | Bước 1 + 3.3 | Bước 1 ghi đè bằng bản agrios; Bước 3.3 sửa số `ponytail*` = 6 và đánh dấu 18 skill "Đã chép" |
| 3 | `docs/agents/*` (9 file) | Bước 1 | Ghi đè bằng bản agrios: `cach-soan-tai-lieu.md`, `capability-matrix.md`, `domain.md`, `issue-tracker.md`, `project.md`, `setup.md`, `source-assessment.md`, `triage-labels.md`, `workflow-vnext.md` |
| 4 | `docs/agents/capability-matrix.md` | Bước 6 | Sửa dòng OpenCode và Command Code (Doctor, Smoke test, Trạng thái) |
| 5 | `docs/reset/agent-inventory.md` | Bước 4 (links) | Sửa 3 đường dẫn trỏ sang `docs/archive/` |
| 6 | `.gitignore` | Bước 4 (links) | Sửa `/docs/AI-AGENT-WORKFLOW.md` → `/docs/archive/AI-AGENT-WORKFLOW.md`; `/workflow.md` → `/docs/archive/workflow.md` |
| 7 | `README.md` | Bước 4 (links) | Sửa link `[docs/AI-AGENT-WORKFLOW.md](docs/AI-AGENT-WORKFLOW.md)` → trỏ `docs/archive/` |
| 8 | `docs/reset/doc-census.md` | Bước 4 (links) | Sửa 3 dòng tham chiếu tên file sang `docs/archive/` |

### Chuyển (move, không xoá)
| # | Từ → Đến | Bước |
|---|----------|------|
| 1 | `DESIGN_DOC_PROCESS.md` → `docs/archive/DESIGN_DOC_PROCESS.md` | Bước 4 |
| 2 | `workflow.md` → `docs/archive/workflow.md` | Bước 4 |
| 3 | `docs/AI-AGENT-WORKFLOW.md` → `docs/archive/AI-AGENT-WORKFLOW.md` | Bước 4 |
| 4 | `.opencode/skills` (thư mục thật) → `.agents/skills-archive/opencode-skills-real/` | Bước 5 |

---

## 2. Lệnh đã chạy kèm output thật

Tất cả chạy tại `D:\Project\CivicOS` qua PowerShell (`-ExecutionPolicy Bypass`).

### Bước 1 — `step1-copy.ps1`
```
=== Buoc 1: Chep bo file (khong ghi de -> da duoc phep ghi de) ===
OK: CLAUDE.md
OK: .agents/README.md
OK: .agents/dev-agent.md
OK: .agents/skills/README.md
OK: docs/agents/*
OK: scripts/setup-agent-tools.ps1
=== Hoan tat Buoc 1 ===
```

### Bước 3.2 — `step3-skill.ps1`
```
=== Buoc 3.2: Chep nguyen van 18 skill tu agrios ===
OK: 5w1h
OK: six-thinking-hats
OK: grill-with-docs
OK: grill-me
OK: grilling
OK: domain-modeling
OK: tdd
OK: diagnosing-bugs
OK: standards-spec-review
OK: research
OK: resolving-merge-conflicts
OK: writing-for-agents
OK: ponytail
OK: ponytail-review
OK: ponytail-audit
OK: ponytail-debt
OK: ponytail-gain
OK: ponytail-help
Da chep 18 skill
Skill ponytail* thuc te: 6
=== Hoan tat Buoc 3.2 ===
```

### Bước 4 — `step4-archive.ps1`
```
TAO: docs\archive
OK: DESIGN_DOC_PROCESS.md -> docs/archive/DESIGN_DOC_PROCESS.md (ban goc da xoa)
OK: workflow.md -> docs/archive/workflow.md (ban goc da xoa)
OK: docs\AI-AGENT-WORKFLOW.md -> docs/archive/AI-AGENT-WORKFLOW.md (ban goc da xoa)
=== Hoan tat Buoc 4 ===
```

### Bước 4 (cap nhat link) — `step4-links.ps1`
```
DA CAP NHAT: docs\reset\agent-inventory.md
DA CAP NHAT: .gitignore
DA CAP NHAT: docs\reset\doc-census.md
DA CAP NHAT: README.md
=== Hoan tat cap nhat link ===
```

### Bước 5 — `step5-link.ps1`
```
TAO: .agents\skills-archive
DI CHUYEN: .opencode\skills -> .agents\skills-archive\opencode-skills-real
=== setup-agent-tools.ps1 -Apply (lan 1: tao junction) ===
[OK] 19 skill trong .agents\skills
[OK] opencode: da tao junction .opencode\skills -> .agents\skills
[OK] commandcode: da tao junction .commandcode\skills -> .agents\skills
[OK] AGENTS.md co o goc repo
[OK] CLAUDE.md import AGENTS.md
Doctor: dat. (Chua gom smoke test trong phien thuc: xem docs/agents/capability-matrix.md)
=== setup-agent-tools.ps1 -Apply (lan 2: kiem tra) ===
[OK] 19 skill trong .agents\skills
[OK] opencode: .opencode\skills dung link
[OK] commandcode: .commandcode\skills dung link
[OK] AGENTS.md co o goc repo
[OK] CLAUDE.md import AGENTS.md
Doctor: dat. (Chua gom smoke test trong phien thuc: xem docs/agents/capability-matrix.md)
=== Hoan tat Buoc 5 ===
```

Exit code: các lệnh trên chạy thành công (không báo lỗi PowerShell). Doctor lần 2 trả về 0 vấn đề.

---

## 3. Mọi chỗ BLOCKED

| # | Vị trí | Lý do | Xử lý |
|---|--------|-------|-------|
| 1 | Bước 3.1 (hỏi đường dẫn repo VBDAgri) | Chưa có đường dẫn repo VBDAgri | **Đã giải quyết**: người dùng cung cấp `D:\Project\agrios`. Không còn BLOCKED. |

Không còn chỗ BLOCKED nào trong báo cáo này.

---

## 4. Phần chưa kiểm

| # | Nội dung | Lý do |
|---|----------|-------|
| 1 | Smoke test Command Code (phiên thật) | Đã thực hiện theo báo người dùng 2026-10-16 sau khi tạo `.commandcode/AGENTS.md`. Câu trả lời nguyên văn của Command Code: “Dòng đầu tiên của AGENTS.md (đây là phần frontmatter, không phải dòng chữ đầu tiên): ---; Dòng đầu tiên làm nội dung (bỏ frontmatter) là: # AGENTS.md — CivicOS; Các skill được đề cập trong AGENTS.md: - diagnosing-bugs (dùng để sửa bug) - tdd (dùng cho tính năng mới) - ponytail (giữ diff tối giản khi viết tính năng mới) - mattpocock (skill đề cập nhưng chỉ là ví dụ, không có trong danh sách skill thực tế) - codegraph (đề cập trong phần "Hiểu code" nhưng không phải skill thực). Lưu ý: AGENTS.md chỉ liệt kê 3 skill thực sự tồn tại: diagnosing-bugs, tdd, và ponytail.” Số skill được liệt kê: 5 mục, trong đó 3 skill thực. Nguồn được agent nêu: AGENTS.md. Trạng thái: **CHƯA ĐẠT**. |
| 2 | Xác thực junction `.opencode/skills` và `.commandcode/skills` từ bên trong runtime Command Code | Junction đã tạo và agent OpenCode xác thực OK. Kết quả smoke test Command Code 2026-10-16: agent trích frontmatter `---` và dòng nội dung `# AGENTS.md — CivicOS`; liệt kê 5 mục skill, nguồn được agent nêu là `AGENTS.md`. |
| 3 | Kết nối runtime Claude Code (`-Agent claude`) | Lệnh `setup-agent-tools.ps1 -Apply -Agent claude` chưa chạy (tùy chọn theo `docs/agents/setup.md`). Người dùng có thể chạy sau nếu cần. |
| 4 | Kiểm tra lại toàn bộ link còn trỏ đến 3 file đã chuyển (`DESIGN_DOC_PROCESS.md`, `workflow.md`, `docs/AI-AGENT-WORKFLOW.md`) | Đã grep 3 pattern và cập nhật 4 file. Có thể còn sót link trong file nhị phân hoặc đường dẫn khác không bị bắt bởi grep. |
| 5 | Số file `.scratch/` (366) | Được đếm từ danh sách `glob`, chưa chạy lệnh đếm chính thức lại (shell trước đây bị chặn; giờ đã mở nhưng chưa chạy lại). |

---

## 5. Kết quả từng bước (tóm tắt)

| Bước | Nội dung | Trạng thái |
|------|----------|------------|
| Bước 0 | Kiểm kê hiện trạng → `docs/reset/agent-inventory.md` | ✅ Hoàn tất |
| Bước 1 | Chép 6 mục từ gói (CLAUDE.md, .agents/README.md, .agents/dev-agent.md, .agents/skills/README.md, docs/agents/*, scripts/setup-agent-tools.ps1) | ✅ Hoàn tất (4 mục đã tồn tại được ghi đè theo sự đồng ý của người dùng) |
| Bước 2 | Hợp nhất `AGENTS.md` (đối chiếu `AGENTS.proposed.md`) | ✅ Hoàn tất — `AGENTS.md` đã được thay thế bằng bản merge (status: accepted). 3 chỗ mâu thuẫn đã được người dùng duyệt: (1) Thứ tự ưu tiên theo proposed §2 (Lựa chọn B); (2) Quy tắc gỡ Block theo proposed §3 (BLOCKED, ghi vào decision-log.md); (3) B5-B13 Waterfall → proposed không đề cập → không giữ trong AGENTS.md |
| Bước 3 | Skill: chép 18 skill từ `D:\Project\agrios` (trừ 2 skill `claude-orchestrator*` theo ghi "Chưa đưa vào"), đếm `ponytail*` = 6, không có skill `gov-*`/`stitch-design-taste` trong `.agents/skills/` cần chuyển archive | ✅ Hoàn tất |
| Bước 4 | Chuyển 3 tài liệu cũ sang `docs/archive/` + dòng `superseded`; cập nhật link trong 4 file | ✅ Hoàn tất |
| Bước 5 | Chạy `setup-agent-tools.ps1` kiểm tra → -Apply (tạo junction) → -Apply kiểm tra; Doctor đạt 2 lần | ✅ Hoàn tất |
| Bước 6 | Smoke test: OpenCode đã tự xác thực (trích dòng đầu `AGENTS.md` + 19 skill); Command Code đã chạy theo báo người dùng 2026-10-16 nhưng CHƯA ĐẠT (chỉ 3/19 skill) | ✅ OpenCode hoàn tất / ⚠️ Command Code CHƯA ĐẠT |

---

## 6. Cần người dùng làm tiếp

1. **Bước 6 (Command Code)**: Trạng thái hiện tại là CHƯA ĐẠT theo báo người dùng 2026-10-16. Dữ kiện ghi nhận: Command Code trích frontmatter `---` và dòng nội dung `# AGENTS.md — CivicOS`; liệt kê 5 mục skill, nguồn được agent nêu là `AGENTS.md`. Không thay đổi tiêu chí smoke test và không ghi nhận nguyên nhân khi chưa được chứng minh.
2. (Tùy chọn) Chạy `setup-agent-tools.ps1 -Apply -Agent claude` nếu muốn kết nối Claude Code.

---
*Không tự đánh giá chất lượng báo cáo (theo quy tắc `AGENTS.proposed.md` §3.5).*
