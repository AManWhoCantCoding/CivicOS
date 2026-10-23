---
title: Cài đặt môi trường agent (Windows)
status: proposed
updated: 2026-10-15
---

# Cài đặt sau khi clone

1. Cần: Git, Node.js, Docker (cho test DB). CodeGraph là tuỳ chọn.
2. Bật đường dẫn dài cho Git: `git config core.longpaths true` (log test của repo có cảnh báo "Filename too long" trong `mobile/node_modules`).
3. Tạo link skill và kiểm tra:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/setup-agent-tools.ps1            # chỉ kiểm tra
   powershell -ExecutionPolicy Bypass -File scripts/setup-agent-tools.ps1 -Apply     # tạo junction còn thiếu
   powershell -ExecutionPolicy Bypass -File scripts/setup-agent-tools.ps1 -Apply -Agent claude   # thêm Claude Code (tuỳ chọn)
   ```
4. Làm smoke test cho từng runtime (`docs/agents/capability-matrix.md`) và cập nhật bảng.

**Đừng dùng `ln -s` trong Git Bash** khi chưa đặt `MSYS=winsymlinks`: nó chép nguyên thư mục và tạo nhiều bản skill lệch nhau. Dùng junction của script.

## Command Code
- Skill: `.commandcode/skills` → `.agents/skills` (script tạo).
- `AGENTS.md`: chưa xác nhận Command Code tự đọc `AGENTS.md` ở gốc dự án. Nếu smoke test không thấy, thêm `.commandcode/AGENTS.md` chứa `@../AGENTS.md`, hoặc đặt bản ở cấp người dùng, rồi thử lại.
- Hook: có thể không hỗ trợ. Bù bằng git pre-commit chạy cùng kiểm tra (độc lập runtime).
- Orchestrator: dùng Chế độ B (`.agents/dev-agent.md`).

## Xử lý sự cố
| Hiện tượng | Cách xử lý |
|---|---|
| Skill hiện hai lần | Có thư mục skill thật hoặc hai runtime cùng đọc một nguồn. Giữ một link; chuyển bản thật sang `.agents/skills-archive/` |
| Doctor báo thư mục là thư mục thật, không phải link | Chuyển nó sang `.agents/skills-archive/` rồi chạy lại với `-Apply` |
| Agent không thấy `AGENTS.md` | Xem mục Command Code ở trên; kiểm tra file nằm ở gốc repo |
| Agent không chạy được shell | Chạy lệnh tay trong PowerShell và dán output lại |
