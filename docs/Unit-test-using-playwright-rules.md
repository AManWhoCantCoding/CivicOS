# Quy định viết Test cho Project sử dụng Playwright

---

## 1. Quy tắc chung

### 1.1. Không sử dụng `console.log`

- **Không sử dụng `console.log`** trong các file Playwright. Khi chạy trên CI, việc log quá nhiều sẽ gây nhiễu và khó theo dõi kết quả.
- Có thể giữ lại `console.warn` để cảnh báo các vấn đề như hiệu năng hoặc các tình huống cần lưu ý.
- Không sử dụng các hàm in log tổng hợp như `printSummary()` hoặc các log verbose không cần thiết.

### 1.2. Mỗi test case chỉ kiểm tra một chức năng

- Mỗi test case nên tương ứng với **một trang, một tab hoặc một kịch bản nghiệp vụ cụ thể**.
- Hiện tại các bài test đang sử dụng tài khoản Admin. Trong tương lai khi triển khai kiểm thử theo từng vai trò (_Role-based Testing_), các test này sẽ được tái sử dụng và kế thừa.
- **Không viết một test case quá lớn**, kiểm tra nhiều chức năng liên tiếp trong cùng một luồng. Điều này khiến việc bảo trì, tái sử dụng và xác định nguyên nhân lỗi trở nên khó khăn.

### 1.3. Phân loại test

Hiện tại hệ thống phân loại thành hai nhóm test:

- **Web Test:** Chỉ kiểm tra chức năng trên giao diện Web.
- **Web - App Test:** Kiểm tra luồng tương tác giữa Web và ứng dụng Mobile.

> **Cấu hình môi trường đối với Web - App Test:**  
> Cần bổ sung cờ cấu hình trong file `.env` để có thể chủ động skip khi môi trường chưa được cài đặt Mobile. Điều này giúp các thành viên khác vẫn có thể chạy toàn bộ test mà không bị ảnh hưởng bởi việc thiếu môi trường Mobile.

---

## 2. Lưu ý quan trọng

1. **Chạy test thường xuyên:** Mỗi thành viên cần chủ động chạy Playwright hằng ngày để phát hiện sớm các lỗi phát sinh trong quá trình phát triển.
2. **Kiểm tra sau refactor:** Sau mỗi lần refactor code, bắt buộc chạy lại Playwright để đảm bảo thay đổi không làm ảnh hưởng đến các chức năng hiện có.
3. **Thảo luận khi có thay đổi/lỗi:** Khi phát hiện một thay đổi làm hỏng test của người khác hoặc có sự khác biệt về kỳ vọng giữa các bên, các thành viên cần trao đổi và thống nhất lại trong buổi họp, tránh tự ý sửa theo cách hiểu riêng.
