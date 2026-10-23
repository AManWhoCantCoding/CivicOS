## 05-danh-sach-tinh-nang.md

- status: confirmed
- hats:
  - white:
    - Bắt buộc từ 04: cấu hình thẩm quyền (L2), schema TT09 (L1), log + phân quyền (L4/L6), không lộ dữ liệu cá nhân (L4)
    - Demo dùng dữ liệu giả, không nối hệ thống thật
    - Thế chấp chỉ cập nhật CSDL, không xác nhận trên GCN (NQ254)
  - red:
    - Cán bộ xã sợ thao tác phức tạp, cần luồng ít bước
    - Công dân muốn biết hồ sơ đang ở đâu mà không phải đến trực tiếp
    - Người xem demo cần thấy rõ ngay đây là dữ liệu giả
  - black:
    - Demo dễ bị hiểu nhầm là hệ thống thật/có giá trị pháp lý
    - Hard-code thủ tục/thẩm quyền → lỗi thời khi luật đổi (L8)
    - Làm quá nhiều chức năng → không kịp demo
  - yellow:
    - Luồng cấu hình được chứng minh tính thích nghi với luật
    - Log + che dữ liệu thể hiện tuân thủ ngay từ thiết kế
    - Tra cứu trạng thái hồ sơ giảm việc cho cán bộ xã
  - green:
    - Trình tạo dữ liệu giả lập kèm banner DEMO
    - Timeline trạng thái hồ sơ cho công dân
    - Mock API liên thông (thuế/công chứng/ngân hàng) để minh họa L5
  - blue:
    - Ưu tiên lõi: hồ sơ → luồng → cập nhật CSDL → tra cứu
    - Tuân thủ tối thiểu (log, phân quyền, che dữ liệu, banner DEMO) là must
    - Bản đồ, dashboard, mock liên thông là could
- features:
  - id: F1
    name: Tiếp nhận hồ sơ biến động
    description: Nhập hồ sơ (chuyển nhượng, tặng cho, thừa kế, thế chấp, tách/hợp thửa) kèm tài liệu giả lập
    benefit: Điểm vào của toàn bộ nghiệp vụ
    risk: Sai loại thủ tục so với luật hiện hành
    feasibility: high
    priority: must
    legal_ref: [L2, L3]
  - id: F2
    name: Luồng xử lý cấu hình được
    description: Bước, vai trò, thẩm quyền lấy từ cấu hình (tiếp nhận → thẩm tra → duyệt → cập nhật)
    benefit: Thích nghi khi NĐ151 hết hạn / sửa luật
    risk: Cấu hình phức tạp, tốn công
    feasibility: medium
    priority: must
    legal_ref: [L2, L8]
  - id: F3
    name: CSDL địa chính mô phỏng
    description: Bảng thửa đất, chủ sử dụng, quyền theo cấu trúc TT09/2024 (tham chiếu LADM); cập nhật khi duyệt hồ sơ
    benefit: Chứng minh không tạo mô hình dữ liệu tùy tiện
    risk: TT09 chưa đọc chi tiết (UNVERIFIED)
    feasibility: medium
    priority: must
    legal_ref: [L1]
  - id: F4
    name: Xử lý thế chấp không xác nhận GCN
    description: Đăng ký thế chấp chỉ cập nhật biến động vào CSDL
    benefit: Phản ánh NQ254 (01/01/2026)
    risk: Quy trình chi tiết chưa xác minh
    feasibility: high
    priority: must
    legal_ref: [L3]
  - id: F5
    name: GCN điện tử mô phỏng
    description: Xuất GCN mẫu có nhãn "DEMO – không có giá trị pháp lý"
    benefit: Minh họa GCN điện tử (NĐ101)
    risk: Bị dùng như giấy tờ thật
    feasibility: high
    priority: should
    legal_ref: [L3]
  - id: F6
    name: Nhật ký truy vết
    description: Ghi ai làm gì, khi nào, trên hồ sơ/thửa nào; không sửa/xóa
    benefit: Minh bạch, tuân thủ
    risk: Log chứa dữ liệu cá nhân → phải che
    feasibility: high
    priority: must
    legal_ref: [L4, L6]
  - id: F7
    name: Phân quyền theo vai trò
    description: Vai trò cán bộ tiếp nhận, thẩm tra, lãnh đạo, công dân; giới hạn theo dữ liệu
    benefit: Kiểm soát truy cập
    risk: Đăng nhập chỉ mô phỏng
    feasibility: high
    priority: must
    legal_ref: [L2, L4, L5]
  - id: F8
    name: Cổng tra cứu công dân
    description: Xem thửa đất, lịch sử biến động của mình và trạng thái hồ sơ
    benefit: Minh bạch, giảm việc cho cán bộ
    risk: Lộ dữ liệu nếu phân quyền sai
    feasibility: high
    priority: must
    legal_ref: [L1, L4]
  - id: F9
    name: Che dữ liệu cá nhân
    description: Mask họ tên, giấy tờ, địa chỉ theo vai trò
    benefit: Tối thiểu hóa dữ liệu
    risk: Quy tắc mask chưa có chuẩn (UNVERIFIED)
    feasibility: high
    priority: must
    legal_ref: [L4]
  - id: F10
    name: Dữ liệu giả lập + banner DEMO
    description: Trình tạo dữ liệu tổng hợp, banner cố định "DEMO – dữ liệu giả"
    benefit: Tránh vi phạm dữ liệu cá nhân, tránh hiểu nhầm
    risk: Dữ liệu giả quá lộ liễu, kém thuyết phục
    feasibility: high
    priority: must
    legal_ref: [L4]
  - id: F11
    name: Bản đồ thửa đất đơn giản
    description: Hiển thị ranh thửa mẫu trên bản đồ nền, chọn thửa để xem thông tin
    benefit: Trực quan khi demo
    risk: Tốn công, dễ lệch phạm vi
    feasibility: medium
    priority: must
    legal_ref: []
  - id: F12
    name: Dashboard lãnh đạo xã
    description: Số hồ sơ theo trạng thái, thời gian xử lý
    benefit: Minh họa giám sát
    risk: Số liệu giả gây hiểu nhầm hiệu quả
    feasibility: high
    priority: could
    legal_ref: []
  - id: F13
    name: Mock API liên thông
    description: Giả lập kết nối thuế, công chứng, ngân hàng
    benefit: Minh họa liên thông (L5)
    risk: Có thể bị hiểu là đã kết nối thật
    feasibility: medium
    priority: could
    legal_ref: [L5]
  - id: F14
    name: Ký số / dữ liệu thật / thu phí / quy hoạch-giá đất / kết nối thật
    description: Ngoài phạm vi demo
    benefit: Giữ phạm vi gọn
    risk: Cần chạy lại L4-L7 nếu làm
    feasibility: low
    priority: wont
    legal_ref: [L4, L5, L6, L7]
- decisions_needed: []
