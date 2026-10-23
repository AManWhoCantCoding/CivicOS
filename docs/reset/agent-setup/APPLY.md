# APPLY — áp dụng bộ chuẩn hóa vào repo CivicOS (v2)

Dành cho agent. Làm lần lượt, **không bỏ bước**. Không sửa `src/**`, `tests/**`, `prisma/**`.
Không xoá file: tài liệu cũ chuyển sang `docs/archive/` và thêm dòng đầu `> superseded by docs/agents/cach-soan-tai-lieu.md`.
Quy tắc báo cáo: `AGENTS.proposed.md` §3–§4 (nằm trong gói này).
Nếu shell bị chặn: viết lệnh ra để người dùng chạy, ghi "CHƯA CHẠY", không tự suy kết quả.

## Bước 0: Chỉ đọc, kiểm kê hiện trạng
Ghi `docs/reset/agent-inventory.md`:
1. `AGENTS.md` hiện có (đường dẫn, các mục chính) và `CLAUDE.md` nếu có.
2. Mọi thư mục skill (`.opencode/`, `.claude/`, `.commandcode/`, `.agents/`, global `~/.config/opencode/`): tên skill, thư mục thật hay link.
3. Ba tài liệu quy trình cũ: `DESIGN_DOC_PROCESS.md`, `workflow.md`, `docs/AI-AGENT-WORKFLOW.md` (đường dẫn, số dòng).
4. `.scratch/`: số file theo từng thư mục con.

## Bước 1: Chép bộ file (không ghi đè)
Chép từ gói này vào gốc repo: `CLAUDE.md`*, `.agents/README.md`, `.agents/dev-agent.md`, `.agents/skills/README.md`, `docs/agents/*`, `scripts/setup-agent-tools.ps1`.
File đã tồn tại thì dừng và hỏi, không ghi đè. (*`CLAUDE.md` chỉ chép nếu chưa có.)

## Bước 2: Hợp nhất `AGENTS.md`
Đối chiếu `AGENTS.proposed.md` với `AGENTS.md` hiện có. Giữ phần riêng của dự án (thứ tự ưu tiên, quy tắc gỡ block, hook safety, skill map đang đúng). Chỗ mâu thuẫn: **dừng và liệt kê**, không tự chọn. Ghi kết quả vào `AGENTS.md.new` kèm diff; người dùng duyệt rồi mới thay.

## Bước 3: Skill
1. Hỏi người dùng đường dẫn repo VBDAgri (chưa có thì BLOCKED).
2. Chép **nguyên văn** các skill trong `.agents/skills/README.md` từ `VBDAgri/.agents/skills/`. Đếm số skill `ponytail*` thực tế rồi ghi vào sổ. Không chép file hook hay script kèm theo.
3. Skill cũ (`gov-*`, `stitch-design-taste`, bản trùng tên): chuyển sang `.agents/skills-archive/`.
4. Không tạo skill mới.

## Bước 4: Tài liệu quy trình cũ
Chuyển ba tài liệu ở Bước 0 mục 3 sang `docs/archive/` kèm dòng superseded. Cập nhật mọi link trỏ tới chúng (báo danh sách link đã sửa).

## Bước 5: Link skill cho runtime
Chạy `powershell -ExecutionPolicy Bypass -File scripts/setup-agent-tools.ps1` (kiểm tra), rồi thêm `-Apply`, rồi chạy lại để kiểm. Dán output thật.

## Bước 6: Smoke test
Do người dùng làm trong phiên thật của OpenCode và Command Code theo `docs/agents/capability-matrix.md`. Agent chỉ cập nhật bảng theo kết quả người dùng báo.

## Báo cáo cuối
Danh sách file tạo/đổi/chuyển, lệnh đã chạy kèm exit code và output thật, mọi chỗ BLOCKED, và phần chưa kiểm. Không tự đánh giá chất lượng.
