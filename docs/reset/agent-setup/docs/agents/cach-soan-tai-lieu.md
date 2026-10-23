---
title: Cách soạn tài liệu (mô tả cách làm của VBDAgri, để áp dụng cho CivicOS)
status: proposed
updated: 2026-10-15
sources:
  - process-summary.md và process-summary-2 (phần 1–2) do agent đọc repo VBDAgri ngày 15/10/2026, chưa được người dùng đối chiếu từng dòng
---

# Cách soạn tài liệu

Đây là **mô tả** cách VBDAgri làm, không phải danh sách bước bắt buộc. Việc nhỏ chỉ cần phần liên quan; bỏ qua phần không cần.
Độ tin cậy: mục có nguồn lấy từ bản tóm tắt đọc trực tiếp repo VBDAgri. Mục ghi "chưa kiểm" thì chưa đủ bằng chứng.

## 1. Bộ tài liệu của một tính năng (thực tế đã quan sát)
Mỗi tính năng có thư mục `docs/<feature>/` với `README.md` làm bảng theo dõi (bước, file, trạng thái, lịch sử các lượt làm, câu hỏi còn mở).
Số liệu từ bảng thống kê 62 đường dẫn (đã đọc nội dung 34 file, chưa đọc 26; hai dòng `08`, `09` là đường dẫn không tồn tại):
- Dạng phổ biến: `sow-web.md` (30 file), `sow-mobile.md` (20 file), `sow-api.md` (2 file: một file API chung `docs/api/sow-api.md` chia nhóm A0–A15, và một file cho đa ngôn ngữ).
- `06-sow.md` và `07-mockup.md` chỉ có ở 2 tính năng đầu (`m03-ke-hoach-mua-vu`, `du-bao-san-luong`).
- **Không tìm thấy** `08-thiet-ke-database.md` và `09-phase.md` ở bất kỳ đâu. Danh sách file đánh số 01–12 trong README là **kế hoạch** ghi ở hai tính năng đầu, không phải bộ tài liệu bắt buộc.

Các file đánh số theo kế hoạch trong README (hiện có ở 2 tính năng đầu, trừ khi ghi khác):

| File | Nội dung | Ai làm |
|---|---|---|
| `01-dau-vao.md` | Đóng khung 5W1H: bài toán, ngữ cảnh, câu hỏi mở | Người + agent (`/5w1h`) |
| (tra luật) | Bằng chứng pháp lý, tiêu chuẩn từ nguồn sơ cấp, lưu ở `brain/domains/` | Một agent tra, agent khác kiểm lại |
| `04-tong-hop-luat.md`, `05-danh-sach-tinh-nang.md` | Tổng hợp luật; danh sách tính năng qua 6 mũ tư duy | Agent (`/six-thinking-hats`) |
| `06-sow.md` | Quyết định đã chốt sau khi grill (bảng Q&A: câu hỏi, trả lời, lý do, ADR liên quan), câu hỏi còn mở, API contract kèm mã lỗi, permission matrix, tham chiếu mockup, ràng buộc dữ liệu | Chủ dự án + agent (`/grill-with-docs`); chủ dự án duyệt |
| `07-mockup.md` | Bản chữ cho từng màn: route, layout, component, state (tải/rỗng/lỗi), tương tác, validation, token màu, responsive, truy cập | Người dựng canvas; agent ghi bản chữ |
| `08-thiet-ke-database.md`, `09-phase.md` | Chỉ có trong kế hoạch, **chưa thấy file nào** | — |
| `12-tinh-nang-sang-tao.md` | Ý tưởng mở rộng (tuỳ chọn) | Agent |

## 2. Độ dài và cấu trúc của SOW (số liệu chỉ cho 34 file đã đọc)
- Độ dài trung vị **90 dòng** (từ 44 đến 395); 24/34 file ≤ 100 dòng; chỉ 3 file ≥ 200 dòng: `docs/api/sow-api.md` (395), `docs/tro-ly-ai/sow-web.md` (293), `docs/web-theo-vai/sow-web.md` (226).
- 29/34 file không có bảng Markdown.
- Dẫn chiếu `src/...:dòng`: chỉ `tro-ly-ai/sow-web.md` có (3 chỗ). Phép đếm chỉ bắt đúng mẫu đó nên có thể bỏ sót cách dẫn khác.
- Không có một khung heading chung. SOW API chia theo nhóm (Quy ước chung, A0…A15). SOW trợ lý AI chia theo file code (`danh-muc.ts`, `hieu-y.ts`…) rồi Test, Tiêu chí nghiệm thu, Hoàn tất. SOW web theo vai chia theo Ràng buộc, Quyết định đã chốt, Ma trận vai × khu vực, Hành vi giao diện, Nút theo quyền, Các đợt làm, Tiêu chí nghiệm thu, Giả định, Câu hỏi mở, Phụ thuộc.
- Thói quen đáng sao chép: ghi "(nháp, chờ ADR-xxxx)" ở phần còn phụ thuộc quyết định chưa chốt; đánh dấu `[?]` cho ô chưa có nguồn (SOW web theo vai); `sources` trong frontmatter liệt kê ADR, SRS và SOW liên quan.
- Tham chiếu cho phân quyền theo vai: `docs/web-theo-vai/sow-web.md` ("Mười một vai", "Ma trận vai × khu vực", "Năng lực chi tiết (nguồn của mọi ẩn hoặc hiện)", "Nút theo quyền, theo màn"). Chưa đọc nội dung.
- Chưa kiểm: nội dung chi tiết của phần lớn 34 file; ngày commit và thứ tự tạo (người đọc không có `git`).

## 3. Văn phong
- Câu ngắn, nhiều bảng, số đo chính xác (px, %, ngưỡng), tên component và trạng thái liệt kê đầy đủ.
- Dẫn chiếu `file:line` hoặc ADR cho mọi nhận định về hiện trạng.
- Chủ ngữ rõ ("chủ dự án chốt", "agent ghi"), không dùng "chúng tôi".
- Frontmatter: `title`, `status`, `owner`, `created`, `updated`, `sources`.

## 4. Agent tham gia soạn thế nào
- **Hỏi theo vòng**, mỗi câu kèm đáp án đề nghị. Định dạng của `grilling`: `Q1 - <tiêu đề>: <nội dung>` rồi `➡️ <đáp án đề nghị>`. Câu hỏi thực tế trong SOW: "Mỗi lô có một vụ đang chạy, hay có thể nhiều vụ song song?", "Trạng thái Chờ duyệt: ai duyệt, một cấp hay hai cấp?".
- **Sự thật thì agent tự tìm** (đọc code, tra tài liệu, giao sub-agent), chỉ hỏi người những gì là **quyết định**.
- **Dừng hỏi người** khi ≥ 2 chiều của 5W1H gần như trống, khi Open Questions còn mục chặn, hoặc thiếu requirement/permission/schema/contract.
- `domain-modeling` khi hỏi: đối chiếu thuật ngữ với glossary, làm sắc từ mơ hồ ("account là Customer hay User?"), đưa tình huống cạnh để thử, đối chiếu với code, rồi cập nhật glossary/ADR ngay trong lúc hỏi.
- `writing-for-agents`: dùng khi viết hoặc sửa skill, `AGENTS.md`, `CLAUDE.md`.

## 5. Ghi quyết định ở đâu
| Loại | Nơi ghi |
|---|---|
| Quyết định của một tính năng | Bảng Q&A trong `06-sow.md` (câu hỏi, trả lời, lý do, ADR liên quan) |
| Quyết định bền vững, khó đảo, có đánh đổi thật, gây ngạc nhiên nếu thiếu bối cảnh | ADR trong `brain/adr/NNNN-slug.md`: Context, Decision drivers, Options considered, Decision, Consequences, Verification |
| Thuật ngữ | Bảng trong `brain/GLOSSARY.md`: định nghĩa, dòng `Tránh: <từ đồng nghĩa dễ nhầm>`, link ADR |
| Tiến độ | `README.md` của thư mục tính năng |

Số ADR mới = số lớn nhất hiện có + 1 (bỏ `0000-template.md`). ADR `accepted` không sửa nội dung; thay bằng ADR mới ghi `supersedes`, ADR cũ ghi `superseded_by`. Glossary cập nhật trong cùng thay đổi với ADR hoặc SOW.

## 6. Chống tài liệu lệch và lỗi thời
- Trạng thái: `draft` → `proposed` → `accepted` → `deprecated` / `superseded`. Tài liệu theo tính năng (working doc) hết hạn khi tính năng xong.
- Chỉ chủ dự án chuyển sang `accepted`.
- Index tự sinh (`DOCS-INDEX.md`) để agent tìm bằng `rg`, vì công cụ chỉ mục code không đọc Markdown. File có hậu tố phiên bản `-vN` chỉ giữ bản cao nhất.
- Kiểm tra tự động (`scripts/check.py` → `verify-brain.py` + `build-docs-index.py --check`) với các luật: có đủ `title`/`status`/`owner`/`created`/`updated`; `status` hợp lệ; `sources` không rỗng cho ADR và domain; link tương đối không gãy; file trong `sources` tồn tại; số dấu ``` chẵn; không BOM; mọi `.md` trong `brain/` được link từ `INDEX.md`; index khớp nội dung. **Chưa áp dụng cho CivicOS**; làm sau khi có `brain/`.
- Khi mâu thuẫn: `brain/` (ADR accepted) và `AGENTS.md` > skill > lesson. Ở VBDAgri thêm quy tắc "source và test thắng tài liệu"; **CivicOS chưa dùng quy tắc đó** (xem mục 8).

## 7. Đầu vào gốc nằm ngoài repo
Một danh sách tham chiếu duy nhất (VBDAgri: `brain/tai-lieu-tham-chieu-ngoai.md`) ghi nguồn và phiên bản (mã canvas, ngày, hash). Không chép nội dung vào repo. Với mockup: mỗi lần giao việc ghi mã phiên bản; trước khi nhận kết quả đọc lại hash, lệch thì lập lại gói.
Với CivicOS: cần một danh sách như vậy cho SRS, `Requirement.md` và mockup gốc. Process Story/AC gốc (nếu có) thắng `Requirement.md`.

## 8. Khác biệt cần nhớ khi mang sang CivicOS
1. **Ai thắng khi mâu thuẫn**: VBDAgri cho code và test thắng tài liệu. CivicOS hiện lệch yêu cầu gốc nên **yêu cầu đã xác nhận thắng code**. Khi code đã khớp baseline và ổn định, có thể đổi sang quy tắc của VBDAgri (ghi bằng một ADR).
2. **Người trả lời câu hỏi grill**: ở VBDAgri là chủ dự án am hiểu nghiệp vụ. Ở CivicOS người dùng chưa là chuyên gia nghiệp vụ, nên câu hỏi nghiệp vụ ghi vào `decision-log.md` chờ chủ nghiệp vụ; "đáp án đề nghị" của agent chưa phải quyết định.
3. **Không chép phần riêng của VBDAgri**: miền nông nghiệp, `tenant_id`/RLS, `Crop`/`ProductionUnit`, ADR 0001–0046, ranh giới `agrios-api`/`agrios-web`, đa ngôn ngữ, worktree, mockup contract.

## 9. Chưa kiểm
Cách các `sow-*.md` được sinh ra (ngày commit, thứ tự tạo, ai viết); 26/62 đường dẫn SOW/mockup chưa đọc nội dung (chủ yếu `sow-mobile.md`, `06-sow.md`, `07-mockup.md`); quy trình 12 bước có hai phiên bản khác nhau trong chính VBDAgri (`m03-ke-hoach-mua-vu` ghi skill từng bước, `trong-trot-tong-quat` thì không); nội dung đầy đủ của các skill `tdd`, `standards-spec-review`, `diagnosing-bugs`, `ponytail*`, `claude-orchestrator`; chi tiết các ADR quan trọng; số dòng trong bản tóm tắt chưa được đối chiếu lại.
