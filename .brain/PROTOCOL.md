# 2 Team tách biệt, `.brain` chỉ chứa evidence

## Nơi mỗi loại tài liệu thực sự nằm
- **Thiết kế / ADR**: `docs/CONTEXT.md`, `docs/contexts/*/CONTEXT.md` — quy ước gốc của mattpocock/skills (domain-modeling), KHÔNG chép vào `.brain`.
- **Ticket + trạng thái**: `.scratch/<feature>/` — tracker gốc theo `docs/agents/issue-tracker.md`, KHÔNG duplicate index riêng trong `.brain`.
- **`.brain/`**: CHỈ chứa evidence — bằng chứng kết quả, mapping tới file mà các agent đã sửa. Không chứa thiết kế, không chứa nội dung ticket, không chứa file điều phối trung gian.

```
.brain/
  evidence/<ticket-id>/
    files-changed.md   -- Planner ghi: file nào đổi, agent nào đổi, kết quả cuối, commit hash
    bug-reports/*.md    -- Tester ghi: lỗi phát hiện được (evidence)
    review-log.md        -- Reviewer ghi: PASS/FAIL từng tiêu chí (evidence)
```

## Team Thiết kế — chỉ có Research (agent default)
Thảo luận trực tiếp với người dùng. Người dùng tự gõ lệnh skill (`/ask-matt`, `/grill-with-docs`, `/grill-me`, `/wayfinder`, `/to-spec`, `/to-tickets`) — Research KHÔNG tự động chọn hay chạy skill thay người dùng.

```
Người dùng <-> Research (người dùng tự gõ lệnh skill)
   /grill-with-docs hoặc /wayfinder -> docs/CONTEXT.md / docs/contexts/*/CONTEXT.md
   /to-spec hoặc /to-tickets -> .scratch/<feature>/ (ticket + trạng thái todo)
```

Research không chạm code, không invoke Planner/Developer/Tester/Reviewer, không ghi gì vào `.brain`.

## Team Dev — Planner (bộ não) + Developer/Tester/Reviewer (thực thi thuần)
```
Planner đọc .scratch/<feature>/ (ticket) + docs/CONTEXT.md (thiết kế)

Với mỗi ticket, Planner lặp (luôn đọc lại trạng thái ticket trên đĩa trước mỗi quyết định):
   invoke Developer(lệnh cụ thể) -> đọc kết quả thô -> quyết định bước kế
   invoke Tester(phạm vi cụ thể) -> FAIL: sửa -> lặp lại | PASS: tiếp
   invoke Reviewer(checklist cụ thể) -> FAIL: sửa nhỏ hoặc làm lại toàn bộ
                                      -> PASS: invoke Reviewer("commit với message: ...")
   Planner cập nhật trạng thái ticket trong .scratch/<feature>/
   Planner ghi .brain/evidence/<ticket-id>/files-changed.md

Planner báo cáo người dùng khi feature xong.
```

## Ranh giới quyền ghi (khớp `opencode.json`)
| Khu vực | Research | Planner | Developer | Tester | Reviewer |
|---|---|---|---|---|---|
| `docs/**`, `research/**` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `.scratch/**` (ticket + trạng thái) | ✅ (khởi tạo) | ✅ (chỉ trạng thái) | ❌ | ❌ | ❌ |
| Code (`src/**`, `app/**`...) | ❌ | ❌ | ✅ (trong whitelist ticket) | ❌ | ❌ |
| `tests/**`, `e2e/**` | ❌ | ❌ | ❌ | ✅ | ❌ |
| `.brain/evidence/<id>/files-changed.md` | ❌ | ✅ | ❌ | ❌ | ❌ |
| `.brain/evidence/<id>/bug-reports/**` | ❌ | ❌ | ❌ | ✅ | ❌ |
| `.brain/evidence/<id>/review-log.md` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `git commit` | ❌ | ❌ | ❌ (bị deny) | ❌ | ✅ (chỉ khi Planner ra lệnh) |

## Yêu cầu bắt buộc cho mỗi ticket (Research tạo)
Mỗi ticket trong `.scratch/<feature>/` phải có 2 checklist:
- **Acceptance Criteria** (`- [ ] ...`): mỗi dòng cụ thể, kiểm chứng được, không mơ hồ.
- **Các bước thực hiện** (`- [ ] ...`): đủ chi tiết để Developer làm tuần tự.

## Điều kiện đóng ticket — chỉ 2 trạng thái cuối
- **`done`**: CHỈ khi toàn bộ ô Acceptance Criteria đã tick, toàn bộ ô Các bước thực hiện đã tick, VÀ Reviewer đã PASS + đã commit. Thiếu 1 trong 3 điều kiện = chưa được `done`.
- **`wontfix`**: khi không thể/không nên hoàn thành, BẮT BUỘC kèm lý do cụ thể ghi trong ticket, chỉ chuyển sau khi người dùng xác nhận (Planner không tự ý huỷ ticket).
Ticket không bao giờ được để trạng thái lửng lơ ngoài 2 trạng thái này (`todo`/`doing`/`review` chỉ là trạng thái tạm trong lúc xử lý).

Việc tick từng ô checklist là của **Planner** (dựa trên bằng chứng Developer/Reviewer báo cáo) — Developer không có quyền ghi vào `.scratch/**` nên không tự tick được.

## Quy tắc chống lệch trạng thái do compact
Planner phải đọc lại trạng thái ticket trong `.scratch/<feature>/` từ đĩa trước mỗi quyết định bước tiếp theo — không dựa vào trí nhớ hội thoại.

## Quy tắc riêng của repo (vẫn áp dụng cho cả 2 team)
1. Mọi agent đọc `Lesson-learned.md (gốc repo)` trước khi thực thi việc được giao.
2. Comment: không comment dòng độc lập, chỉ 1 dòng đầu hàm/method/class.
3. Mọi agent được ĐỌC `.env`/`.env.*` để lấy thông tin cấu hình cần thiết (VD: biết port DB, feature flag đang bật) — nhưng KHÔNG được ghi/sửa file này (đã khoá ở permission), và KHÔNG được in nguyên giá trị bí mật (API key, mật khẩu, connection string...) ra: response trả lời, file evidence, ticket, commit message, hay bất kỳ nơi nào khác ngoài chính việc dùng nội bộ để quyết định hành động. Cần nhắc tới giá trị đó trong báo cáo thì chỉ nêu TÊN biến, không nêu giá trị thật.
