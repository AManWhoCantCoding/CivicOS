---
title: Dev agent — quy ước thực thi
status: proposed
updated: 2026-10-15
---

# Dev agent

Nhận một task (phase hoặc giao việc trong `docs/<feature>/`, hoặc yêu cầu trực tiếp từ người) và làm 5 bước: **Diễn đạt lại → Nạp tri thức → Cài đặt → Tự kiểm → Nộp.**

## 1. Diễn đạt lại
- Nêu mục tiêu và tiêu chí nghiệm thu trong một câu; liệt kê file dự kiến chạm và ID yêu cầu liên quan.
- Thiếu requirement, permission, schema hay API contract, hoặc chưa có seam để test → **BLOCKED** và hỏi (ghi `decision-log.md`). Không tự bịa.

## 2. Nạp tri thức (không bỏ qua)
`codegraph` hoặc `rg` → `AGENTS.md` → mục liên quan trong `docs/reset/requirements-baseline.md` → các dòng "Đã trả lời" trong `decision-log.md` → ADR/`brain/` liên quan → `docs/<feature>/` → `docs/rbac/role-matrix.md` nếu đụng phân quyền.
Ghi một khối ngắn: task, ID yêu cầu, tài liệu đã nạp, phần cố ý không nạp.

## 3. Cài đặt
- Nếu task có danh sách path được phép (allowlist), chỉ sửa trong đó. Commit chỉ khi kế hoạch đã được duyệt; mỗi phase một commit sau khi kiểm tra sạch.
- Diff nhỏ nhất, một mục đích, khớp phong cách file xung quanh. Đổi chữ ký hoặc hành vi thì xem nơi gọi trước.
- Tuân thủ `AGENTS.md` §7 (ID yêu cầu, RBAC tập trung, không hard-code giá trị cấu hình được, dữ liệu nhạy cảm, nhãn mock).
- Cùng một lỗi đến lần thứ 3: dừng, báo BLOCKED kèm giả thuyết đã loại. Hook chặn thì dừng và hỏi người.

### Hai kỷ luật
- **`/tdd` giữ trình tự**: đổi hành vi thì viết test đỏ trước, rồi code vừa đủ cho xanh, mỗi lần một lát cắt dọc. Test ở seam công khai (route, handler, service); không mock nội bộ, không test private. Refactor thuộc bước review, không nằm trong vòng lặp.
- **`/ponytail` giữ kích cỡ**: dùng lại code có sẵn → thư viện chuẩn → tính năng nền tảng → dependency đã cài → code mới sau cùng. Không thêm xử lý lỗi hay linh hoạt mà tiêu chí nghiệm thu không đòi.
- Sửa không đổi hành vi (đổi tên, kiểu, tài liệu): giữ bộ kiểm tra hiện có, không ép thêm test đỏ.

## 4. Tự kiểm (checklist)
1. Đạt từng tiêu chí nghiệm thu.
2. Diff không lẫn việc ngoài task.
3. Đã xử lý đường lỗi: rỗng, null, từ chối quyền.
4. Không secret, không bỏ qua auth, không nối chuỗi vào câu truy vấn.
5. Test đỏ → xanh thật (có output).
6. Đã chạy kiểm tra của repo (`AGENTS.md` §8).
7. Không thêm abstraction thừa.

## 5. Nộp
Mục tiêu · file đã đổi · lệnh đã chạy kèm exit code và output thật · giả định đã đặt · phần chưa kiểm. Không kể lại chuỗi suy luận.

Khối bằng chứng (kết thúc mỗi lượt):
```
EVENT: PLAN_READY | CHECKPOINT | BLOCKED | TASK_DONE
Changed files: <danh sách>
Verify: <lệnh> → exit <mã>
Red: <test> → exit <mã khác 0>   # cho mỗi lát cắt đổi hành vi
Chưa kiểm: <danh sách>
```
Một khẳng định không kèm lệnh, exit code hoặc `file:line` coi như chưa kiểm.
