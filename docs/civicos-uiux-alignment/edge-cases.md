# Case biên presentation: `civicos-uiux-alignment`
 
| Case                                   | Cách xử lý phải giữ                                                            | Cấm suy ra                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Session loading/error/unauthenticated  | Dùng state shell hiện có, copy an toàn và login destination hiện có.           | Không tạo auth flow, redirect hoặc permission mới.                             |
| Empty/no assignment                    | Nêu rõ bước tiếp theo theo contract hiện có; không giả dữ liệu.                | Không tự cấp Assignment hoặc mở rộng scope.                                    |
| Forbidden/masked/out-of-scope          | Giữ denial/masking và không xác nhận existence.                                | Không reveal vì layout/card cần thêm thông tin.                                |
| Loading/skeleton                       | Skeleton đúng kích thước, có `Đang tải`; không hiển thị response cũ như ready. | Không tạo API status/timeout policy mới.                                       |
| Error/conflict/retry                   | Copy lỗi an toàn, retry/reload hữu hạn theo behavior hiện có.                  | Không render raw payload, status mới hoặc fake success.                        |
| Stale                                  | Hiện cảnh báo, `updatedAt` và reload action nếu surface đã có.                 | Không tạo freshness field/cache policy mới.                                    |
| Offline                                | Giữ banner `Đang ngoại tuyến.`; không fake success mutation.                   | Không lưu/render land polygon offline hoặc dùng public lookup thay projection. |
| Map geometry/provider failure          | Message an toàn, retry/back hiện có; không render polygon bán hợp lệ.          | Không đổi CRS/provider/projection allowlist.                                   |
| Unsaved/online-required form           | Giữ warning/confirmation và chặn write khi offline theo workflow hiện có.      | Không đổi write guard/state transition.                                        |
| Simulated/public lookup                | Giữ `internal / simulated` và non-legal wording.                               | Không dùng `official`, `certified` hoặc legal boundary claim.                  |
| Mobile capability gap                  | Giữ read-only MVP dù web có write flow.                                        | Không thêm write/public intake để đạt parity.                                  |
| Long Vietnamese labels/narrow viewport | Cho phép wrap/scroll/layout thích ứng mà không cắt mất meaning/accessibility.  | Không rút ngắn làm đổi thuật ngữ domain hoặc xóa state copy.                   |
| Raw incident/API body                  | Chỉ hiển thị structured safe fields/message đã có.                             | Không hiển thị `JSON.stringify(body)` hoặc raw response.                       |
 
Nếu gặp case không nằm trong contract, dừng với `BLOCKED-CONTRACT` và đưa về
Research; không tự tạo behavior để hoàn tất visual.
