---
title: .agents — tri thức vận hành cho agent
status: proposed
updated: 2026-10-15
---

# `.agents/`

| Thư mục / file | Là gì |
|---|---|
| `skills/` | Nguồn duy nhất của skill; sổ đăng ký ở `skills/README.md` |
| `skills-archive/` | Skill cũ đã thay thế (không nạp) |
| `dev-agent.md` | Quy ước thực thi của vai Dev (5 bước) |
| `lessons/`, `index/`, `hooks/` | **Chưa bật.** Thêm sau khi quy trình ổn định |

## Bốn tầng (nơi đặt thứ gì)
| Tầng | Là gì |
|---|---|
| `brain/` | Tri thức đã chốt: ADR, glossary, trang domain (tạo khi cần) |
| `docs/<feature>/` | Working doc theo tính năng, hết hạn khi feature xong. `docs/agents/` luôn hiện hành |
| `.agents/` | Tri thức vận hành cho agent; chỉ trỏ về `brain/`, không mâu thuẫn ADR accepted |
| `.opencode/`, `.commandcode/`, `.claude/` | Cấu hình runtime; skill là **link** tới `.agents/skills/` |

## Thứ tự ưu tiên khi mâu thuẫn
Yêu cầu đã xác nhận (baseline + decision-log) > `AGENTS.md` > `brain/` và ADR accepted > Skill > Lesson `active` > Lesson `candidate`.
Lesson không thắng tầng cao hơn; mâu thuẫn thì đề xuất sửa nguồn cao hơn.

## Hook (để sau)
Khi bật: chặn lệnh phá huỷ, secret hard-code, sửa file cấu hình được bảo vệ. Command Code có thể không hỗ trợ hook; khi đó dùng git pre-commit chạy cùng kiểm tra (độc lập với runtime).
