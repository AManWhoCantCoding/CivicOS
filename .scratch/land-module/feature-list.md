# Danh sách tính năng — land-module (Hội đồng Sáu Mũ)

## Trạng thái và chế độ hội đồng

- B5 thực hiện theo **chế độ tiết kiệm**: một Coordinator lần lượt giữ đủ sáu mũ vì phiên hiện tại không có sáu subagent chuyên biệt khả dụng.
- Giai đoạn 1 đã tách riêng sáu góc nhìn tại `.scratch/land-module/council/hat-*.md`.
- Giai đoạn 2 dùng **mũ Xanh dương — tổng hợp và cấu trúc**; các mâu thuẫn được chốt theo thứ tự ưu tiên và boundary đã khóa.

## Giai đoạn 1 — Tóm tắt góc nhìn

- **Trắng:** xác nhận scope, bốn loại biến động, state machine, bảng land mới và các bảng CivicOS tái sử dụng; xem `council/hat-trang.md`.
- **Đỏ:** nhấn mạnh niềm tin công dân, nhãn mô phỏng, timeline minh bạch và lo ngại PII; xem `council/hat-do.md`.
- **Đen:** cảnh báo PII, duplicate sync, sai tổng quyền, PostGIS, phân quyền và retention; xem `council/hat-den.md`.
- **Vàng:** xác định giá trị của workflow thật, public lookup, integration seam, event/audit và polygon; xem `council/hat-vang.md`.
- **Xanh lá:** đề xuất read seam, timeline từ event, mock fixtures, polygon validation, Evidence reuse và backlog mở rộng; xem `council/hat-xanh-la.md`.
- **Xanh dương:** sắp xếp trình tự và dependency, giữ aggregate/application boundary và yêu cầu B6; xem `council/hat-xanh-duong.md`.

## Giai đoạn 2 — Đồng thuận (mũ chốt: Xanh dương)

### Danh sách tính năng

| ID | Tính năng | Mô tả ngắn | Ưu tiên | Bảng/chạm data-model | Nguồn góc nhìn |
|---|---|---|---|---|---|
| F-01 | Quản lý thửa, party, quyền và ràng buộc | Tạo/đọc dữ liệu giả lập về thửa, party, quyền sử dụng, polygon và thế chấp; giữ lịch sử, không hard-delete. | P0 | `LandParty`, `LandParcel`, `LandRight`, `LandEncumbrance`, `OrganizationUnit` | Trắng + Vàng + Xanh dương |
| F-02 | Tiếp nhận và thẩm tra hồ sơ biến động | Tạo và thẩm tra hồ sơ cho chuyển quyền, đổi thông tin, đăng ký thế chấp, tách/hợp thửa; gắn party, thửa, assignment và Evidence. | P0 | `LandChangeApplication`, `LandApplicationParty`, `LandApplicationParcel`, `Assignment`, `Evidence`, `User` | Trắng + Đen + Vàng |
| F-03 | Đồng bộ Cơ sở dữ liệu quốc gia bằng mock | Gọi adapter mock, lưu request/response, retry idempotent và phân biệt success/failure; không kết nối quốc gia thật. | P0 | `LandNationalSync`, `LandChangeApplication`, `EventRecord`, `OutboxMessage`, `AuditEvent` | Đen + Vàng + Xanh lá |
| F-04 | Lãnh đạo duyệt và hoàn tất biến động | Sau mock sync thành công, `commune_leader` approve/reject; chỉ completed mới cập nhật quyền, thửa hoặc thế chấp. | P0 | `Approval`, `LandChangeApplication`, `LandRight`, `LandParcel`, `LandEncumbrance`, `EventRecord`, `AuditEvent` | Trắng + Đen + Xanh dương |
| F-05 | Tra cứu công khai tối thiểu | Tra theo `applicationCode` hoặc `parcelCode`, read-only, không session bắt buộc, không trả PII/polygon/sync payload. | P0 | `LandChangeApplication`, `LandApplicationParcel`, `LandParcel` | Đỏ + Vàng + Đen + Xanh dương |
| F-06 | Role, assignment và audit cho module đất đai | Bổ sung role `land_officer`, `commune_leader`, `citizen`; giới hạn thao tác theo đơn vị, assignment và ghi audit/event. | P0 | `Role`, `UserRole`, `User`, `OrganizationUnit`, `Assignment`, `AuditEvent`, `EventRecord` | Đen + Vàng + Xanh dương |
| F-07 | Hồ sơ Evidence bất biến | Gắn file/tài liệu giả lập vào application/parcel/party bằng Evidence hiện có, giữ hash và immutable storage metadata. | P1 | `Evidence`, `LandChangeApplication`, `LandParcel`, `LandParty` | Vàng + Xanh lá |

### Tính năng loại/gỡ

- Kết nối thật với Cơ sở dữ liệu quốc gia về đất đai.
- Liên thông thật với thuế, công chứng hoặc ngân hàng.
- Quyết định hành chính, chữ ký điện tử hoặc Giấy chứng nhận có giá trị pháp lý.
- Dữ liệu cá nhân thật và public map/polygon.
- Cloud/thuê dịch vụ, thanh tra, quy hoạch, định giá đất và cấp độ an toàn thông tin chính thức.

### Cần amend `data-model.md`

- Không có tính năng P0/P1 trong danh sách cần amend data model.
- Legal-rule versioning, liên thông liên ngành và public map được giữ ngoài scope; nếu mở lại phải qua quy trình amend riêng.

### Ý kiến không thống nhất và phương án cuối

- **Polygon public:** Mũ Xanh lá gợi ý khả năng mở rộng bản đồ; Mũ Đen và Xanh dương giữ polygon nội bộ. Phương án cuối: public lookup không trả polygon.
- **Legal-rule versioning:** có giá trị dài hạn nhưng chưa có bảng/contract trong model. Phương án cuối: không đưa vào B5 feature-list.
- **Số agent:** phiên này dùng chế độ tiết kiệm một Coordinator, không tuyên bố có sáu đánh giá độc lập.

### Biên bản đồng thuận

- Chế độ: một Coordinator thực hiện đủ sáu mũ, hai giai đoạn tách biệt.
- Mũ chốt giai đoạn 2: **Xanh dương**.
- Kết quả: 7 tính năng được chọn; F-01 đến F-06 P0, F-07 P1.
- Người dùng cần xác nhận danh sách trước khi chuyển B6.
- Ngày điều phối: 2026-09-30.
