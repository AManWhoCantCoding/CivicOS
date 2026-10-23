---
title: Sổ đăng ký skill
status: proposed
updated: 2026-10-15
---

# Skill của CivicOS

- Nguồn duy nhất: `.agents/skills/<tên>/SKILL.md`. Runtime chỉ link tới đây (`scripts/setup-agent-tools.ps1`).
- Chép nguyên `SKILL.md` từ thượng nguồn; **không tự viết skill mới khi người dùng chưa duyệt**.
- Sửa skill thì sửa thẳng file ở đây, rồi ghi chỗ khác bản gốc vào bảng "Sửa và cập nhật từ thượng nguồn" bên dưới.

## Skill sẽ chép (nguồn: repo VBDAgri, `.agents/skills/`)
| Skill | Nguồn / phiên bản | Gõ `/` mới chạy? | Trạng thái |
|---|---|---|---|
| `grill-with-docs` | mattpocock/skills v1.2.3 | Có | chưa chép |
| `grill-me` | mattpocock/skills v1.2.3 | Có | chưa chép |
| `grilling` | mattpocock/skills v1.2.3 | Không | chưa chép |
| `domain-modeling` | mattpocock/skills v1.2.3 | Không | chưa chép |
| `tdd` | mattpocock/skills v1.2.3 | Không | chưa chép |
| `diagnosing-bugs` | mattpocock/skills v1.2.3 | Không | chưa chép |
| `standards-spec-review` | mattpocock/skills v1.2.3 (đổi tên khỏi `code-review`) | Không | chưa chép |
| `research` | mattpocock/skills v1.2.3 | Không | chưa chép |
| `resolving-merge-conflicts` | mattpocock/skills v1.2.3 | Không | chưa chép |
| `writing-for-agents` | mattpocock/skills v1.2.3 | Không | chưa chép |
| `ponytail`, `ponytail-review`, `ponytail-audit`, `ponytail-debt`, `ponytail-gain`, `ponytail-help` (có thể thêm 1 skill nữa: file hướng dẫn liệt kê 6, bản đọc repo nói 7; agent đếm số thật khi chép) | DietrichGebert/ponytail v4.10.0 (chép `SKILL.md`, không kèm hook) | Không | chưa chép |
| `5w1h`, `six-thinking-hats` | tự viết trong VBDAgri (nhỏ) | Không | chưa chép |

Phiên bản lấy theo sổ đăng ký của VBDAgri; ghi lại phiên bản thật khi chép. Kiểm tra giấy phép của từng nguồn khi chép.

## Chưa đưa vào
- `claude-orchestrator`, `claude-orchestrator-opencode`: phụ thuộc runner riêng (Claude Code, `scripts/run-opencode.ps1`).
- Các skill `gov-*`, `stitch-design-taste` cũ: chuyển sang `.agents/skills-archive/`, không xoá.

## Sửa và cập nhật từ thượng nguồn
| Skill | Ngày | Chỗ khác bản gốc | Lý do |
|---|---|---|---|
