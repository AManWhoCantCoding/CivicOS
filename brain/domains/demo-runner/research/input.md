# Input — `ui-auto-demo`

## Nguồn yêu cầu

Yêu cầu người dùng ngày 2026-10-12:

> Thêm một nút tự động demo có thể chạy qua tất cả chức năng và tình huống,
> không chỉ happy path. Mỗi bước có dòng giải thích; giữa các thao tác chờ 3
> giây để người xem đọc. Mỗi thao tác phải dùng đúng behavior của component,
> ví dụ dropdown phải mở rồi mới chọn. Tự động demo chỉ là demo giao diện;
> người dùng tự chạy hạ tầng.

## Chuẩn hóa ý định

- **Mục tiêu:** tạo một điểm khởi chạy cho guided UI demo trên ứng dụng CivicOS.
- **Vấn đề:** kịch bản hiện tại cần người trình bày tự điều hướng; chưa có
  narrator, pacing và cơ chế bao phủ có kiểm soát các nhánh ngoài happy path.
- **Kết quả mong muốn:** người xem nhìn thấy từng thao tác, hiểu lý do của thao
  tác và thấy component phản ứng như khi người dùng thật tương tác.
- **Ràng buộc rõ ràng:** thời gian chờ mặc định giữa các thao tác là 3 giây;
  không tự khởi động PostgreSQL, worker, TileServer, Next.js hay Android
  infrastructure.
- **Không được suy diễn:** yêu cầu chưa chốt demo chỉ chạy web hay cả native
  mobile; chỉ đọc dữ liệu hay có submit/mutation trên database demo; có tự đăng
  nhập/đổi persona hay bắt đầu sau khi người dùng đã đăng nhập.

## Mục tiêu quan sát được

1. Có một control để bắt đầu/dừng hoặc tạm dừng guided demo.
2. Mỗi bước có mô tả tiếng Việt hiển thị rõ ràng và trạng thái bước hiện tại.
3. Pacing 3 giây là contract có thể kiểm thử, không phải `setTimeout` rời rạc
   không quan sát được.
4. Automation đi qua UI semantics hiện có: click, type, mở/chọn native select,
   checkbox, dialog, navigation và submit theo đúng thứ tự component yêu cầu.
5. Nhánh loading, empty, validation, forbidden, offline, error, simulated và
   provider-unavailable được trình diễn an toàn nếu nằm trong phạm vi đã chốt.

## Câu hỏi cần đóng trước B6

- Phạm vi một nút: web hiện tại hay web + native mobile?
- Demo có được gửi mutation vào `civicos_demo` không, hay chỉ đọc/validation?
- Điểm bắt đầu là sau khi người dùng đăng nhập hay demo được phép tự đăng nhập?
- Có cho phép người xem pause/skip/replay từng scenario hay chỉ chạy tuyến tính?

## Quyết định B5 đã được người dùng xác nhận

- Phạm vi: web + native mobile orchestration.
- Live mutation: chỉ web được phép thực hiện mutation thật trên `civicos_demo`;
  mobile giữ nguyên read-only.
- Authentication: tự login persona demo qua credential provider local/demo; không
  dùng credential production và không hard-code secret.
- Runner lifecycle: start, pause/resume, stop và replay; delay mặc định giữa các
  thao tác là 3 giây.
- Infrastructure: runner không tự khởi động database, worker, map provider,
  emulator hoặc device; chỉ kiểm tra readiness và báo blocked state.
