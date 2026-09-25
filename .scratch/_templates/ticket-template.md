# <Tên ticket>

- **Status:** needs-triage
- **Blocked by:** <ticket-id hoặc "không">
- **Loại:** <feature | bug>  <!-- bug = sửa một lỗi đã có; Planner sẽ bắt viết test đỏ tái hiện trước khi sửa -->
- **Gate hướng:** <có | không>  <!-- có: chạm ≥2 module, có ADR liên quan, hoặc thêm domain model/boundary mới. Không chắc → có -->
- **File được phép sửa:**
  - `src/...`
- **File cấm sửa:**
  - `.env`, `**/secrets/**`, ...

## Mô tả

<Mô tả ngắn gọn yêu cầu, lấy từ spec.md, không diễn giải lại toàn bộ spec>

## Acceptance Criteria (bắt buộc — chặn done, PASS 100%)

- [ ] <tiêu chí chức năng 1>
- [ ] <tiêu chí chức năng 2>

## Rubric (mức độ đạt)

### Bắt buộc (chặn done — phải PASS 100%, Reviewer chấm như Acceptance Criteria)

- [ ] <business rule bắt buộc — ghi rõ nguồn: ADR-xxx / spec.md#section>
- [ ] <ví dụ: validate input theo đúng schema trong spec>

### Khuyến nghị (không chặn done, chỉ ghi nhận — trừ khi dưới ngưỡng tối thiểu)

| Trục | Mô tả kỳ vọng | Thang điểm | Ngưỡng tối thiểu |
|---|---|---|---|
| Thiết kế/UI | Bám theo `.scratch/<feature>/ui/screen-XX.md` | 0–2 | 1 |
| Thao tác/UX | Số bước thao tác, có xử lý loading/error/empty state | 0–2 | 1 |
| Quy trình | Đúng luồng nghiệp vụ mô tả trong spec.md | 0–2 | 1 |

> Nếu ticket không có phần UI (API/backend thuần), xóa trục "Thiết kế/UI" khỏi bảng — không để trống rồi chấm 0 oan.

## Các bước thực hiện

- [ ] <bước 1>
- [ ] <bước 2>

## Đang chờ Research

<Chỉ điền khi ticket bị treo do thiếu quyết định nghiệp vụ hoặc Rubric không rõ ràng. Không dùng wontfix cho trường hợp này.>

## Trạng thái cuối

<pending / done / wontfix>

<!--
done chỉ hợp lệ khi: tất cả Acceptance Criteria đã tick + tất cả bước thực hiện đã tick
+ toàn bộ Rubric "Bắt buộc" PASS + toàn bộ trục Rubric "Khuyến nghị" đạt ngưỡng tối thiểu
+ Tester pass + Reviewer pass + đã commit.

wontfix bắt buộc ghi rõ lý do, áp dụng khi: bế tắc kỹ thuật thật sự, hoặc quá 3 vòng lỗi kỹ thuật cùng loại,
hoặc quá 3 vòng cùng một trục Rubric không đạt ngưỡng tối thiểu (và không phải do thiếu quyết định nghiệp vụ).
-->