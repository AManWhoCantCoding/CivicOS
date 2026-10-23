---
title: AGENTS.md — CivicOS (bản đề xuất hợp nhất, v2)
status: proposed
updated: 2026-10-15
---

# AGENTS.md — CivicOS

Điểm vào bắt buộc cho mọi agent (OpenCode, Command Code, Claude Code…). `CLAUDE.md` chỉ import file này.
`AGENTS.md` của dự án ghi đè hoàn toàn file global (`~/.config/opencode/AGENTS.md`).
> Bản đề xuất. Agent áp dụng bằng cách MERGE với `AGENTS.md` hiện có theo `APPLY.md`, không ghi đè mù.

## 1. Giao tiếp
- Nói với người dùng bằng tiếng Việt; agent↔agent bằng tiếng Anh; tài liệu mặc định tiếng Việt; commit theo Conventional Commits (tiếng Anh).
- Người dùng không phải chuyên gia nghiệp vụ ANTT: lần đầu dùng một thuật ngữ nghiệp vụ phải giải thích ngắn.

## 2. Thứ tự ưu tiên khi mâu thuẫn
1. Yêu cầu đã được người dùng xác nhận: `docs/reset/requirements-baseline.md` (mục đã xác nhận) và các dòng "Đã trả lời" trong `docs/reset/decision-log.md`.
2. `AGENTS.md`.
3. `brain/` và ADR `accepted` (khi có).
4. Skill, rồi lesson.
5. Source và test hiện có: là **bằng chứng về hiện trạng, không phải nguồn yêu cầu**. Code mâu thuẫn yêu cầu thì báo lệch, không sửa yêu cầu cho khớp code.

Tài liệu `proposed` / `draft` chưa phải quyết định. (Khác VBDAgri: ở đó code và test thắng tài liệu; CivicOS chưa dùng quy tắc đó vì code từng lệch yêu cầu gốc.)

## 3. Không tự bịa
- Thiếu requirement, role/permission, schema hay API contract, hoặc yêu cầu mơ hồ → **BLOCKED**: ghi câu hỏi vào `decision-log.md` (ID tiếp theo, trạng thái "Chưa trả lời") và dừng phần phụ thuộc. Được đề xuất 2 phương án kèm khuyến nghị, nhưng **không thực thi theo khuyến nghị** khi chưa có xác nhận.
- Sự thật tra được thì tự tra (đọc code, tài liệu), chỉ hỏi người những gì là **quyết định**.
- Giả định tạm cho demo phải gắn nhãn `GIẢ ĐỊNH DEMO` trong decision-log.
- Cùng một lỗi đến lần thứ 3 thì dừng, báo BLOCKED kèm các giả thuyết đã loại.

## 4. Báo cáo phải có bằng chứng
1. Khẳng định về code dẫn `file:line` thật. Khi được yêu cầu trích nguyên văn thì chép đúng, không viết lại, không chèn `// ...` hay comment của agent.
2. Không dẫn file, test, hàm chưa xác minh là tồn tại (`ls`/`rg` trước khi dẫn).
3. Số liệu tổng hợp (đếm, tỷ lệ) sinh từ script/lệnh đã chạy và ghi lệnh; không đếm tay.
4. Test chưa chạy thì ghi "CHƯA CHẠY" kèm lý do. "CÓ" nghĩa là code tồn tại; chỉ ghi "ĐÃ KIỂM CHỨNG" khi test liên quan đã chạy xanh.
5. Không tự nhận xét chất lượng báo cáo của mình ("tự động", "đã loại bỏ"…); chỉ ghi việc đã làm.
6. Nộp: mục tiêu, file đã đổi, lệnh đã chạy kèm exit code và output thật, giả định đã đặt, phần chưa kiểm.

## 5. Định tuyến theo loại việc
| Loại việc | Bắt đầu bằng |
|---|---|
| Tính năng mới, đổi schema, đổi ranh giới | `docs/agents/cach-soan-tai-lieu.md`; bài toán mơ hồ thì `/5w1h` trước, rồi `/grill-with-docs` |
| Bug tái hiện được | `diagnosing-bugs` |
| Hiểu code | `codegraph` (nếu có) hoặc `rg`, rồi đọc vùng cần xem |
| Sửa nhỏ, typo | Không cần skill; vẫn chạy kiểm tra |
| Tái cấu trúc repo, thư mục, tài liệu hàng loạt | Lập kế hoạch → người duyệt → làm theo lô nhỏ (`git mv`) → kiểm tra → commit mỗi lô |
| Điều tra, kiểm toán | Chế độ CHỈ ĐỌC; kết quả ghi vào `docs/reset/` |

## 6. Soạn tài liệu
Cách làm mô tả ở `docs/agents/cach-soan-tai-lieu.md` (không phải danh sách bước bắt buộc). Quy tắc cứng chỉ gồm:
1. Tài liệu trong `docs/` và `brain/` có frontmatter: `title`, `status`, `owner`, `created`, `updated`, `sources`.
2. `status` ∈ `draft | proposed | accepted | deprecated | superseded`. Chỉ chủ dự án chuyển sang `accepted`.
3. Tài liệu `accepted` không sửa nội dung; thay bằng tài liệu mới có `supersedes`, tài liệu cũ ghi `superseded_by`.
4. Chốt thuật ngữ hoặc quyết định thì cập nhật glossary/ADR trong cùng thay đổi.
5. Đầu vào gốc ngoài repo (SRS, mockup) ghi vào danh sách tham chiếu kèm phiên bản/ngày; không chép nội dung.
6. Không xoá tài liệu cũ; chuyển sang `docs/archive/` kèm dòng `superseded by …`.

## 7. Skill
- Nguồn duy nhất: `.agents/skills/<tên>/SKILL.md`. Thư mục runtime chỉ là link (`scripts/setup-agent-tools.ps1`). Sổ đăng ký: `.agents/skills/README.md`.
- Dùng skill có sẵn (mattpocock, ponytail). Không tự viết skill mới khi người dùng chưa duyệt.
- `/tdd` giữ **trình tự** (test đỏ trước); `/ponytail` giữ **kích cỡ** (code mới viết sau cùng).

## 8. Quy tắc riêng của CivicOS (chủ dự án duyệt)
1. Mỗi SOW, ticket và test dẫn ID yêu cầu (`FR-005-02`…) hoặc ghi "NGOÀI BASELINE" kèm người duyệt phạm vi. Không dẫn được ID thì dừng hỏi.
2. Phạm vi demo hiện tại: PS-E1-004, PS-E1-005, PS-E1-007, mô-đun đất đai, và tab Bản đồ hiển thị sự kiện của các phân hệ đó. Story khác tạm gác, không làm khi chưa được duyệt.
3. Phân quyền theo RBAC với **một nguồn duy nhất** `docs/rbac/role-matrix.md` (vai trò × chức năng) và **một điểm kiểm tra** trong code; menu, nút và API đều đọc từ đó. Cấm viết kiểm tra role rải rác (`includes('commander')`, danh sách role hard-code trong từng module). Assignment và `read_sensitive` là lớp bổ sung cho dữ liệu nhạy cảm, không thay thế RBAC.
4. Giá trị baseline ghi "cấu hình được" (đơn vị cấp trên, ngưỡng SLA/cảnh báo, danh mục loại) không hard-code trong code nghiệp vụ.
5. Dữ liệu nhạy cảm (danh tính người tố giác, hồ sơ đối tượng/cư dân): mã hóa hoặc che theo vai trò; mọi lần đọc/ghi có audit.
6. Adapter và dữ liệu giả (camera/LPR, hệ thống đất đai quốc gia) gắn nhãn mock, không trình bày như nguồn thật.

## 9. Kiểm tra trước khi hoàn tất
- Test: `npm test` (vitest). Test cần DB: bật Docker/Postgres và đặt `RUN_DB_TESTS=1`.
- Lint / typecheck / build: [CẦN ĐIỀN: lấy từ `package.json`, ghi đúng tên script đã xác nhận].
- Báo cáo đã kiểm gì kèm output thật, và nói rõ phần chưa kiểm.

## 10. An toàn
- Hook hoặc công cụ chặn thì dừng và hỏi người, không tìm cách lách.
- Không commit secret, `.env`, dữ liệu cá nhân thật. Không đọc/ghi ngoài workspace dự án.
- [Merge các quy tắc "hook safety" và "gỡ block" từ `AGENTS.md` cũ vào đây.]

## 11. Tri thức ghi ở đâu
| Loại | Nơi ghi |
|---|---|
| Yêu cầu gốc | `docs/reset/requirements-baseline.md` (sau này `brain/`) |
| Câu hỏi và quyết định | `docs/reset/decision-log.md` |
| Thuật ngữ | `brain/GLOSSARY.md` (`CONTEXT.md` chỉ là con trỏ) |
| Quyết định khó đảo | `brain/adr/NNNN-slug.md` (số lớn nhất + 1) |
| Tài liệu theo tính năng | `docs/<feature>/` kèm `README.md` bảng theo dõi |
| Phân quyền | `docs/rbac/role-matrix.md` |
| Log, transcript, thiết kế phỏng đoán | Không ghi vào `brain/` |

## 12. Không được làm
1. Lách hook; bị chặn thì dừng và hỏi.
2. Tự chọn đáp án cho điểm mơ hồ rồi làm tiếp.
3. Để tài liệu phái sinh hay code thắng yêu cầu đã xác nhận.
4. Viết kiểm tra quyền rải rác ngoài điểm kiểm tra trung tâm.
5. Báo "xong" khi chưa chạy kiểm tra hoặc không có output thật.
6. Xoá tài liệu cũ.
