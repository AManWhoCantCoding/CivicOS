# Screen-05 — Public land lookup

## Route và mục đích

- `/public/land/lookup`.
- Anonymous user tra cứu đúng một `applicationCode` hoặc `parcelCode`; chỉ nhận projection tám trường và `simulated: true`.

## Bố cục

- Public header, simulated notice và giải thích dữ liệu demo không có giá trị pháp lý.
- Mode selector chỉ có hai lựa chọn: `Mã hồ sơ` hoặc `Mã thửa`.
- Một input code, submit và result card.
- Result fields: applicationCode, parcelCode, mapSheetNumber, parcelNumber, status, submittedAt, updatedAt, completedAt.

## Validation/state

- Không chọn mode hoặc code rỗng: `LAND_LOOKUP_QUERY_INVALID` inline.
- Không tìm thấy: `LAND_LOOKUP_NOT_FOUND`, không phân biệt party/PII.
- Rate limit: `LAND_RATE_LIMITED`, nêu thời điểm retry nếu có.
- Offline/network error: giữ code, nút retry; không tự retry vô hạn.
- Success: status chip + simulated label; không có link vào internal detail.

## Redaction/accessibility

- Không render party, address đầy đủ, polygon, sync, approval, audit, Evidence, `storageKey`.
- Input có label, submit keyboard-accessible, error liên kết bằng `aria-describedby`.
- Không dùng màu duy nhất để biểu thị status.
