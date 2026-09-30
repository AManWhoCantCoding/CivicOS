# WORKFLOW CHUẨN — Từ Ý tưởng đến Triển khai (v3.1)

> Workflow này thay thế mọi phiên bản cũ. Đây là TÀI LIỆU THAM CHIẾU TỔNG QUAN cho con người.
> Agent KHÔNG phụ thuộc vào file này: toàn bộ trách nhiệm workflow của từng agent được nhúng
> trực tiếp trong file vai trò của nó (research.md, mentor.md, developer.md, ui-ux.md) và các
> file skill — mỗi file vai trò PHẢI tự chứa đầy đủ input/output/điều kiện qua bước của mọi
> bước mà agent đó phụ trách, không yêu cầu agent đọc thêm file nào khác.

## Phân chia thư mục (quy tắc cứng của workflow)

```
docs/                          ← MỌI TÀI LIỆU THIẾT KẾ + RESEARCH (nội dung "sự thật")
  design/<feature>/            ← bộ 8 file thiết kế đã khóa (LOCK.json ở đây)
  adr/                         ← ADR (quyết định kiến trúc)
  research/<feature>/          ← tài liệu tra cứu: input, luật VN/QT, tổng hợp luật

.scratch/                      ← CHỈ CHỨA ĐIỀU PHỐI TRIỂN KHAI (nội dung "kế hoạch")
  <feature>/
    feature-list.md            ← danh sách tính năng (kết quả hội đồng Sáu Mũ)
    sow.md                     ← Scope of Work
    phases/                    ← mỗi phase 1 file: phase-<tên>.md (chứa ticket list)
  _templates/                  ← template
```

Nguyên tắc: **docs/ = thiết kế & dữ kiện luật (khóa bằng check-scope); .scratch/ = kế hoạch &
ticket (sửa tự do trong quy trình, KHÔNG khóa).** Design docs KHÔNG nằm trong .scratch nữa.

## Sơ đồ tổng quan (thứ tự thực thi)

```
B1 Ý tưởng → B2 Tra luật VN ┐
                            ├→ B3 Tra luật Quốc tế ┘ → B4 Tổng hợp luật (5W1H)
                                                      ↓
                                            B4.5 THIẾT KẾ DATABASE  ← (quan trọng nhất, tách riêng)
                                                      ↓
                                                      B5 Họp Sáu Mũ → Danh sách tính năng
                                                      ↓
                                                      B6 Grill with Docs (mở rộng) → Design docs + SOW
                                                      ↓
                                                      B7 Thiết kế Mockup (SOW + Design system)
                                                      ↓
                                              Mockup đúng yêu cầu? ─ Không → quay B6
                                                      ↓ Có
                                                      B8 Chia Phase (file phase trong .scratch/<feature>/phases/)
                                                      ↓
                                                      B9 DO — Triển khai (Techlead + subagents)
                                                      ↓
                                                      B10 Con người review
                                                      ↓
                                                      B11 Sáng tạo tính năng → quay lại B1 (vòng lặp)
```

**Thay đổi so với v3 (quan trọng):**
- Toàn bộ tài liệu thiết kế chuyển từ `.scratch/<feature>/design/` sang **`docs/design/<feature>/`**;
  tài liệu research (input + luật) chuyển sang **`docs/research/<feature>/`**.
- `.scratch/<feature>/` giờ CHỈ chứa điều phối triển khai: `feature-list.md`, `sow.md`, `phases/`
  (mỗi phase 1 file), thư mục `ui/` và `council/` (kết quả trung gian).
- `check-scope.mjs` đã đổi `designDir` → `docs/design/<feature>`: lệnh lock/verify-lock/diff/migrate
  hoạt động trên đường dẫn mới, không đổi cú pháp gọi.
- Phases tách thành nhiều file trong `.scratch/<feature>/phases/` thay vì 1 file lớn — mỗi phase
  độc lập, dễ giao ticket theo phase.

## Quy ước tên file

- `docs/research/<feature>/`: `input.md`, `law-vn.md`, `law-intl.md`, `law-summary.md` (KHÔNG số thứ tự).
- `docs/design/<feature>/`: `overview.md`, `api-contract.md`, `data-model.md`, `domain-rules.md`,
  `non-functional.md`, `edge-cases.md`, `integration-contracts.md`, `glossary.md` + `LOCK.json`.
- `.scratch/<feature>/`: `feature-list.md`, `sow.md`, `phases/phase-<tên>.md`, `ui/**`, `council/**`,
  `workflow-status.md`. Ticket nằm trong file phase tương ứng.
- ID tham chiếu giữ nguyên: F-xx (tính năng), DR-xx (quy tắc nghiệp vụ), EC-xx (edge case) — dùng trong
  ticket và Traceability Matrix.

---

## B1 — ĐẦU VÀO
- **Input:** ý tưởng, yêu cầu tính năng, vấn đề cần giải quyết, mục tiêu kỳ vọng, đối tượng sử dụng, ràng buộc (chi phí, thời gian, công nghệ).
- **Ai làm:** Con người (hoặc Research thu thập).
- **Output:** `docs/research/<feature>/input.md` — mô tả ý tưởng gốc, nguyên văn, KHÔNG diễn giải thêm.
- **Điều kiện qua bước:** tài liệu đầu vào tồn tại và người dùng xác nhận "đúng ý".

## B2 — TRA LUẬT VIỆT NAM (Six Hats — White only)
- **Skill:** `skills/six-hats-white-research.md` (mọi agent chỉ đội mũ Trắng: thuần dữ kiện).
- **Input:** `input.md`.
- **Output:** `docs/research/<feature>/law-vn.md` — tra cứu pháp luật/nghị định/thông tư/quy định VN liên quan, trích dẫn nguồn cụ thể (tên văn bản, điều, khoản, link).
- **Điều kiện qua bước:** mọi khẳng định đều có trích dẫn nguồn; không có ý kiến chủ quan (đó là việc của B4).

## B3 — TRA LUẬT QUỐC TẾ (Six Hats — White only)
- **Skill:** `skills/six-hats-white-research.md` (vẫn mũ Trắng).
- **Input:** `input.md` + `law-vn.md`.
- **Output:** `docs/research/<feature>/law-intl.md` — tiêu chuẩn quốc tế, best practice, quy định khung liên quan (GDPR/ISO/WCAG/OWASP... tùy lĩnh vực), trích dẫn nguồn.
- **Điều kiện qua bước:** như B2.

## B4 — TỔNG HỢP LUẬT (5W1H)
- **Ai làm:** Research (agent duy nhất, không cần hội đồng).
- **Input:** `law-vn.md` + `law-intl.md`.
- **Output:** `docs/research/<feature>/law-summary.md` — so sánh/đối chiếu 2 file luật, trả lời 5W1H cho từng vấn đề. Xác định: yêu cầu bắt buộc, khuyến nghị, rủi ro tuân thủ.
- **Điều kiện qua bước:** mọi xung đột giữa luật VN và quốc tế được nêu rõ + hướng xử lý đề xuất.

## B4.5 — THIẾT KẾ DATABASE (quan trọng nhất — trước mọi tranh luận tính năng)
- **Ai làm:** Research + người dùng chốt. **Không dùng hội đồng** — đây là việc kỹ thuật cần chính xác, không cần đa góc nhìn.
- **Input:** `law-summary.md` (đặc biệt: quy định lưu trữ dữ liệu, thời hạn lưu, quyền xóa dữ liệu, nghĩa vụ bảo mật).
- **Output (khóa bằng check-scope):** `docs/design/<feature>/data-model.md` —
  - Bảng/cột/kiểu/null/mặc định/ràng buộc, quan hệ, hành vi khi xóa, chiến lược migration.
  - Đánh dấu nguồn từng dòng: "Bắt buộc bởi luật (điều X)" / "Nghiệp vụ yêu cầu" / "Kỹ thuật cần".
  - Phân tích toàn vẹn: mở rộng tương lai, hiệu năng, bảo mật (mã hóa trường nhạy cảm, retention, soft-delete hay hard-delete theo luật).
- **Quy trình:** Research đọc source hiện có → đề xuất mô hình → liệt kê câu hỏi cho người dùng (chỉ phần source không trả lời được) → người dùng chốt → `node scripts/check-scope.mjs lock <feature> --stage=data-model --user-approved`.
- B4.5 tạo LOCK.json với stage "data-model". Sau khi B6 hoàn thiện đủ bộ design, chạy `node scripts/check-scope.mjs lock <feature> --stage=full --user-approved` để chuyển sang full lock.

- **Điều kiện qua bước:** `data-model.md` đã khóa, không còn TBD/TODO. B5/B6/... chỉ được tham chiếu, KHÔNG được sửa mô hình. LOCK.json tồn tại và có stage "data-model".

## B5 — HỌP SÁU MŨ → DANH SÁCH TÍNH NĂNG (Six Hats Council)
- **Skill:** `skills/six-hats-council.md` — quy tắc 2 giai đoạn (mỗi agent 1 mũ → tất cả cùng 1 mũ khi chốt).
- **Input:** `input.md`, `law-summary.md`, `docs/design/<feature>/data-model.md` (đã khóa).
- **Output:** `.scratch/<feature>/feature-list.md` — danh sách tính năng: ưu tiên (P0/P1/P2), MỖI tính năng ghi rõ bảng nào trong data-model mà nó chạm tới + biên bản đồng thuận.
- **Điều kiện qua bước:** hội đồng đạt đồng thuận giai đoạn "cùng mũ"; người dùng xác nhận danh sách.

## B6 — LÀM RÕ TỪNG TÍNH NĂNG (Grill with Docs — mở rộng)
- **Skill:** `skills/grill-with-docs-extended.md` (dựa trên skill gốc của Matt Pocock, mở rộng phần docs).
- **Input:** `feature-list.md` + `data-model.md` + `law-summary.md`.
- **Output — 2 nhóm file:**
  - **Bộ tài liệu thiết kế chi tiết** `docs/design/<feature>/`: đủ 8 file (data-model đã có từ B4.5).
  - **File SOW** `.scratch/<feature>/sow.md` — Scope of Work tổng: phạm vi từng tính năng, deliverable, tiêu chí nghiệm thu theo tính năng, mockup tham chiếu, ước lượng, phụ thuộc.
- **Vòng lặp:** nếu quá grilling phát hiện cần bổ sung/amend tính năng → quay lại B5.
- **Điều kiện qua bước:** không còn TBD trong mọi file thiết kế; người dùng xác nhận SOW; khóa toàn bộ `docs/design/<feature>/`.

## B7 — THIẾT KẾ MOCKUP (giữ nguyên vị trí sau SOW)
- **Ai làm:** Research → gọi `ui-ux` (quy trình Stitch như cũ trong `research.md`).
- **Input:** `sow.md` + `data-model.md` (design tokens do ui-ux tự trích khi generate màn đầu tiên).
- **Output:** `.scratch/<feature>/ui/screen-XX.md` + `report.md`.
- **Điều kiện qua bước:** mockup đúng yêu cầu? Không → quay B6 bổ sung/amend. Có → B8. LOCK.json phải có stage "full".

## B8 — CHIA PHASE
- **Ai làm:** Research.
- **Input:** SOW + feature-list + data-model.
- **Output:** `.scratch/<feature>/phases/phase-<tên>.md` (mỗi phase 1 file) — phạm vi phase, tính năng F-xx thuộc phase, ticket list (mỗi ticket ≤7 bước, AC dạng Given/When/Then, test-skeleton), thứ tự ưu tiên, tiêu chí hoàn thành, phụ thuộc giữa các phase.
- **Điều kiện qua bước:** mọi ticket đều tham chiếu thiết kế đã khóa, không tự thêm endpoint/bảng ngoài thiết kế.

## B9 — DO — TRIỂN KHAI
- **Ai làm:** Mentor điều phối Developer (+ các subagent Backend/Frontend/DevOps/Testing... nếu có).
- **Input bắt buộc (đầy đủ mới được bắt đầu):** feature-list, SOW, docs/design (đã khóa), phases, mockup. Thiếu bất kỳ file nào → Mentor DỪNG, báo người dùng quay lại bước thiết kế tương ứng. KHÔNG tự đoán.
- **Quy trình:** đúng như `mentor.md` hiện tại (Plan Check → implement → verify → Traceability → Round-trip → commit). Không thay đổi phần này.
- **Nguyên tắc "không cần suy nghĩ":** Developer/Mentor KHÔNG tự quyết định gì ngoài thiết kế — mọi thứ đã có trong tài liệu. Gặp thiếu thông tin → `BLOCKED-CONTRACT` như cũ.

## B10 — CON NGƯỜI REVIEW KẾT QUẢ
- Review độ chính xác so với yêu cầu ban đầu, chất lượng, bảo mật, hiệu năng, trải nghiệm người dùng; đưa phản hồi, yêu cầu sửa (nếu có); chấp nhận và chuyển sang bước tiếp.
- **Output:** `.scratch/<feature>/review.md` — ghi nhận chấp nhận/danh sách phản hồi.

## B11 — SÁNG TẠO TÍNH NĂNG (vòng lặp)
- Skill Sáu Mũ (dạng đánh giá: SOW + thiết kế + kết quả thực tế): tìm cơ hội cải tiến, tối ưu, khác biệt cạnh tranh; bổ sung tính năng sáng tạo; phân tích khả thi/rủi ro/lợi ích; cập nhật backlog và quay lại B1 nếu phù hợp.
- **Output:** `.scratch/<feature>/innovations.md` + mục mới trong `feature-list.md` (chờ vòng lặp tiếp theo).

---

## Ma trận trách nhiệm (tóm tắt)

| Bước | Trách nhiệm chính | Agent | Skill | Output chính |
|---|---|---|---|---|
| B1 | Con người / Research | — | — | docs/research/.../input.md |
| B2 | Tra luật VN | Research | six-hats-white-research | docs/research/.../law-vn.md |
| B3 | Tra luật QT | Research | six-hats-white-research | docs/research/.../law-intl.md |
| B4 | Tổng hợp 5W1H | Research | — | docs/research/.../law-summary.md |
| B4.5 | Database design | Research + người dùng | — | docs/design/.../data-model.md (khóa) |
| B5 | Feature list | Hội đồng 6 agent | six-hats-council | .scratch/.../feature-list.md |
| B6 | Design docs + SOW | Research + người dùng | grill-with-docs-extended | docs/design/.../ (8 file) + .scratch/.../sow.md |
| B7 | Mockup | ui-ux | Stitch MCP | .scratch/.../ui/ |
| B8 | Phases + tickets | Research | — | .scratch/.../phases/ |
| B9 | Triển khai | Mentor + Developer | quy trình mentor.md | code + evidence |
| B10 | Con người | — | — | .scratch/.../review.md |
| B11 | Sáng tạo | Hội đồng 6 agent | six-hats-council (đánh giá) | .scratch/.../innovations.md |

## Quy tắc chung
1. **Một bước chỉ hoàn thành khi output file tồn tại và đạt điều kiện qua bước.** Không nhảy bước.
2. **B4.5 là cổng cứng:** chưa khóa data-model thì không được vào B5.
3. **Phân chia docs/.scratch là quy tắc cứng:** nội dung thiết kế (docs/design) và dữ kiện luật
   (docs/research) chỉ được sửa qua quy trình mở khóa của Research + người dùng; .scratch không chứa
   bất kỳ file thiết kế nào — nếu thấy thiết kế nằm trong .scratch nghĩa là cấu trúc sai, phải di chuyển.
4. Mọi file trong `docs/design/<feature>/` khóa bằng `check-scope.mjs lock` — chỉ Research + người dùng được mở khóa.
5. Ngôn ngữ tài liệu: Tiếng Việt (giữ nguyên thuật ngữ kỹ thuật tiếng Anh).
6. Mỗi agent chỉ theo system prompt (file vai trò) của mình — file đó phải TỰ CHỨA đầy đủ trách nhiệm workflow. Bản đồ này dành cho con người duy trì hệ thống; khi thay đổi workflow, cập nhật cả file vai trò liên quan.
