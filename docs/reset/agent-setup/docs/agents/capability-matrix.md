---
title: Trạng thái hỗ trợ theo runtime
status: proposed
updated: 2026-10-15
---

# Capability matrix

Một runtime chỉ được ghi **"Sẵn sàng"** khi **cả** doctor (`scripts/setup-agent-tools.ps1`) **và** smoke test trong phiên thật đều đạt. Ghi ngày, người kiểm, phiên bản runtime.

| Runtime | Đọc `AGENTS.md` gốc | Thư mục skill | Hook | Subagent / orchestrator | Doctor | Smoke test | Trạng thái |
|---|---|---|---|---|---|---|---|
| OpenCode | Có (đang dùng) | `.opencode/skills` (junction) | Chưa cấu hình | Theo runtime; dùng Chế độ B | chưa chạy | chưa | CHƯA KIỂM CHỨNG |
| Command Code | Chưa xác nhận | `.commandcode/skills` (junction) | Chưa rõ, có thể không có | Chưa rõ; dùng Chế độ B | chưa chạy | chưa | CHƯA KIỂM CHỨNG |
| Claude Code | (không dùng) | `.claude/skills` | — | `/claude-orchestrator` | — | — | KHÔNG DÙNG |

Ghi chú: cột "Thư mục skill" của Command Code lấy từ công cụ skills cộng đồng, chưa có tài liệu chính thức đối chiếu.

## Smoke test (làm trong phiên thật của từng runtime)
1. Mở runtime tại gốc repo.
2. Hỏi: "Trích nguyên văn dòng đầu tiên của `AGENTS.md` và liệt kê tên các skill bạn thấy."
3. Đạt khi trích **đúng** dòng đầu và liệt kê **đủ** skill trong `.agents/skills/`, mỗi skill xuất hiện một lần.
4. Không đạt: ghi vào bảng trên, xem `docs/agents/setup.md` mục Xử lý sự cố.
