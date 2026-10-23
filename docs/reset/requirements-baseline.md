# Requirements Baseline — Epic PS-E1 (từ Requirement.md)

> Nguồn duy nhất: `Requirement.md`. Không dùng design/ADR/code. Định nghĩa trích nguyên văn; chỗ mơ hồ ghi "CÂU HỎI". Phần Gap (mục 5, 6, 7) tách riêng ở cuối.

---

## PS-E1-001 — Bản đồ Địa bàn Số Tổng hợp (ANTT Dashboard Map) — T1, Must Have

### Căn cứ pháp lý
`[BỔ SUNG]` Không có căn cứ trực tiếp cho riêng công cụ bản đồ (đây là công cụ điều hành nội bộ). Cơ sở gián tiếp:
- Luật Công an nhân dân 2018 (sửa đổi 2023), Điều 16–17 — nhiệm vụ nắm tình hình, chỉ huy điều hành.
- Luật Lực lượng tham gia bảo vệ an ninh, trật tự ở cơ sở (Luật số 30/2023/QH15, hiệu lực 01/7/2024) — thay thế Pháp lệnh Công an xã 2008/TT 12/2010 đã hết hiệu lực (xem mục 7, Gap 1).

### Actor (bảng Actor trong story)
| Actor | Nền tảng | Vai trò |
|---|---|---|
| Trưởng Công an xã Nghĩa Trụ | Web | Xem tổng quan địa bàn, điều hành, xuất bản đồ in ấn |
| Hệ thống Camera/AI | Hệ thống/API | Cấp lớp dữ liệu camera lên bản đồ |
| Nền bản đồ VietGeoX/VBDLIS | Hệ thống/API | Cấp nền GIS |

`[BỔ SUNG — bảng gốc thiếu]` Không cần bước phê duyệt (công cụ xem/điều hành, không phải quy trình xử lý hồ sơ).

### Bảng yêu cầu

| ID gốc | Phát biểu (trích nguyên văn) | Actor | Căn cứ pháp lý | Vị trí (mục) |
|---|---|---|---|---|
| FR-001-01 | Hệ thống hiển thị bản đồ GIS cấp xã/phường với các lớp Camera, Điểm nóng, Vụ việc, Lực lượng, Cơ sở KD, Đối tượng quản lý — bật/tắt độc lập từng lớp. | Trưởng CA xã; Hệ thống Camera/AI; Nền bản đồ VietGeoX/VBDLIS | Luật CAND 2018 (sửa đổi 2023) Đ16–17; Luật 30/2023/QH15 | Functional Requirements |
| FR-001-02 | Vụ việc hiển thị icon phân màu theo mức độ (đỏ/vàng/xanh). | Trưởng CA xã | (như trên) | Functional Requirements |
| FR-001-03 | Click vào bất kỳ đối tượng bản đồ nào → popup tóm tắt + link chi tiết. | Trưởng CA xã | (như trên) | Functional Requirements |
| FR-001-04 | Bộ lọc theo thời gian, loại sự việc, mức độ, đơn vị xử lý. | Trưởng CA xã | (như trên) | Functional Requirements |
| FR-001-05 | Time slider xem lại bản đồ theo ngày/tuần/tháng bất kỳ. | Trưởng CA xã | (như trên) | Functional Requirements |
| FR-001-06 | Xuất snapshot bản đồ (ảnh/PDF) để đính kèm báo cáo. | Trưởng CA xã | (như trên) | Functional Requirements |
| NFR-001-01 | Bản đồ load < 3s; cập nhật sự kiện mới hiển thị trong < 30s. | (hệ thống) | (như trên) | Non-Functional Requirements |
| NFR-001-02 | Nền bản đồ chính xác đến cấp đường/ngõ hẻm (nguồn VietGeoX/VBDLIS). | Nền bản đồ VietGeoX/VBDLIS | (như trên) | Non-Functional Requirements |
| NFR-001-03 | Hỗ trợ đồng thời ≥ 5 lớp thông tin độc lập. | (hệ thống) | (như trên) | Non-Functional Requirements |
| NFR-001-04 | Cached tiles cho phép xem dữ liệu tĩnh khi mất internet. | (hệ thống) | (như trên) | Non-Functional Requirements |
| NFR-001-05 | Xuất bản đồ khổ A3/A4 phục vụ giao ban. | Trưởng CA xã | (như trên) | Non-Functional Requirements |

### CÂU HỎI
- "cấp xã/phường" — xác nhận đơn vị hành chính chính xác (xã Nghĩa Trụ hay cấp xã chung)?
- "đơn vị xử lý" trong FR-001-04 — tham chiếu OrganizationUnit nào (cấp xã, cấp huyện)?
- NFR-001-02 yêu cầu "nguồn VietGeoX/VBDLIS" — có hợp đồng/cấp phép truy cập không?

---

## PS-E1-002 — Quản lý Điểm nóng ANTT (Hot Spot Management) — T1, Must Have

### Căn cứ pháp lý
Tương tự PS-001 — Luật CAND 2018 (sửa đổi 2023) Điều 16 (phòng ngừa, đấu tranh tội phạm); Luật số 30/2023/QH15 (thay Pháp lệnh Công an xã 2008 — xem mục 7, Gap 1). Không có quy định riêng về "điểm nóng số hóa"; đây là nghiệp vụ nội bộ theo chỉ đạo nghiệp vụ ngành, không phải TTHC công dân.

### Actor (bảng Actor trong story)
| Actor | Nền tảng | Vai trò |
|---|---|---|
| Cán bộ An ninh xã Nghĩa Trụ | Web | Khởi tạo, cập nhật, theo dõi điểm nóng (vẽ polygon, nhập phân tích) |
| Trưởng Công an xã Nghĩa Trụ | Web | Phê duyệt đề xuất đóng/mở điểm nóng `[BỔ SUNG — suy luận từ B8]` |
| Công an cấp trên (CA huyện) | Web | Nhận báo cáo điểm nóng tuần |

### Bảng yêu cầu

| ID gốc | Phát biểu (trích nguyên văn) | Actor | Căn cứ pháp lý | Vị trí (mục) |
|---|---|---|---|---|
| FR-002-01 | Tạo điểm nóng mới bằng vẽ vùng polygon trên bản đồ (không giới hạn 1 điểm tọa độ). | Cán bộ An ninh xã | Luật CAND 2018 (sửa đổi 2023) Đ16; Luật 30/2023/QH15 | Functional Requirements |
| FR-002-02 | Nhập thuộc tính: tên, loại (Trộm cắp/Ma túy/TNXH/Khiếu kiện/Khác), mức độ (Thấp/TB/Cao). | Cán bộ An ninh xã | (như trên) | Functional Requirements |
| FR-002-03 | Auto-link vụ việc mới vào điểm nóng nếu tọa độ vụ việc nằm trong vùng đã khoanh. | Hệ thống (tự động) | (như trên) | Functional Requirements |
| FR-002-04 | Ghi nhận phân tích nguyên nhân và biện pháp đã/sẽ triển khai. | Cán bộ An ninh xã | (như trên) | Functional Requirements |
| FR-002-05 | Tự động tăng tần suất nhắc tuần tra khi điểm nóng ở mức Cao. | Hệ thống (tự động) | (như trên) | Functional Requirements |
| FR-002-06 | Theo dõi trend số vụ việc theo tuần tại từng điểm nóng. | Cán bộ An ninh xã; Trưởng CA xã | (như trên) | Functional Requirements |
| FR-002-07 | Đề xuất đóng điểm nóng khi mức độ duy trì Thấp liên tục 4 tuần. | Hệ thống (tự động) → Trưởng CA xã phê duyệt | (như trên) | Functional Requirements |
| FR-002-08 | Tự động tổng hợp điểm nóng vào báo cáo tuần gửi CA huyện. | Hệ thống (tự động) | (như trên) | Functional Requirements |
| NFR-002-01 | Màu sắc điểm nóng trên bản đồ theo mức độ, đồng bộ với FR-001-02. | (hệ thống) | (như trên) | Non-Functional Requirements |
| NFR-002-02 | Lịch sử điểm nóng lưu vĩnh viễn, hỗ trợ so sánh theo năm. | (hệ thống) | (như trên) | Non-Functional Requirements |
| NFR-002-03 | Gửi nhắc tăng cường tuần tra tới đúng cán bộ phụ trách khu vực. | Hệ thống → Cán bộ phụ trách | (như trên) | Non-Functional Requirements |
| NFR-002-04 | Ngưỡng "4 tuần liên tiếp mức Thấp" phải cấu hình được, không hard-code. | (hệ thống) | (như trên) | Non-Functional Requirements |

### CÂU HỎI
- "Cán bộ An ninh xã Nghĩa Trụ" — có phải role `village_officer` hoặc role riêng không?
- "phụ trách khu vực" trong NFR-002-03 — xác định bằng Assignment hay OrganizationUnit?
- "CA huyện" trong FR-002-08 — xem Gap 2 (đã bỏ cấp huyện, cần cấu hình được đơn vị cấp trên).

---

## PS-E1-003 — Quản lý Đối tượng cần Quản lý (Persons of Interest) — T1, Must Have

### Căn cứ pháp lý
- Luật Thi hành án hình sự 2019, Điều 45–46 (thông báo, tiếp nhận người chấp hành xong án phạt tù), Điều 25 (trách nhiệm Công an cấp xã trong tái hòa nhập cộng đồng).
- Nghị định 49/2020/NĐ-CP quy định chi tiết thi hành Luật THAHS về tái hòa nhập cộng đồng.
- Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân — áp dụng vì hồ sơ đối tượng là dữ liệu nhạy cảm (đã nêu trong AC gốc).

### Actor (bảng Actor trong story)
| Actor | Nền tảng | Vai trò |
|---|---|---|
| Cán bộ Công an xã Nghĩa Trụ phụ trách tái hòa nhập | Web (lập hồ sơ, upload tài liệu) + Mobile (ghi nhật ký khi đi kiểm tra tại nhà đối tượng) | Lập & quản lý hồ sơ đối tượng, ghi nhận kiểm tra định kỳ |
| Công an cấp trên (CA huyện) | Web | Bàn giao hồ sơ đối tượng, nhận báo cáo tháng |
| Đối tượng quản lý (tái hòa nhập/tiền án) | Không truy cập hệ thống | Data subject bị theo dõi |

`[BỔ SUNG — bảng gốc thiếu]` Phân quyền truy cập: chỉ cán bộ được phân công mới xem được hồ sơ (theo AC gốc).

### Bảng yêu cầu

| ID gốc | Phát biểu (trích nguyên văn) | Actor | Căn cứ pháp lý | Vị trí (mục) |
|---|---|---|---|---|
| FR-003-01 | Tạo hồ sơ đối tượng từ hồ sơ bàn giao CA huyện: họ tên, CCCD, địa chỉ, phân loại (hình sự/ma túy/TNXH), mức độ nguy cơ. | Cán bộ tái hòa nhập | Luật THAHS 2019 Đ45–46, Đ25; NĐ 49/2020; NĐ 13/2023 | Functional Requirements |
| FR-003-02 | Upload tài liệu kèm theo (quyết định mãn hạn tù, cam kết tái hòa nhập). | Cán bộ tái hòa nhập | (như trên) | Functional Requirements |
| FR-003-03 | Đặt lịch kiểm tra định kỳ theo tần suất cấu hình theo mức độ nguy cơ (tuần/2 tuần/tháng). | Cán bộ tái hòa nhập | (như trên) | Functional Requirements |
| FR-003-04 | Cấu hình cảnh báo không trình diện: nhắc sau 3 ngày, cảnh báo sau 7 ngày. | Cán bộ tái hòa nhập / Hệ thống | (như trên) | Functional Requirements |
| FR-003-05 | Ghi nhật ký mỗi lần gặp/kiểm tra (ngày, nội dung, đánh giá). | Cán bộ tái hòa nhập (Mobile) | (như trên) | Functional Requirements |
| FR-003-06 | Tích hợp cảnh báo từ camera LPR khi biển số xe đối tượng xuất hiện ban đêm. | Hệ thống Camera/AI → Cán bộ tái hòa nhập | (như trên) | Functional Requirements |
| FR-003-07 | Tự động liên kết đối tượng với vụ việc mới nếu đối tượng liên quan → cảnh báo CB phụ trách. | Hệ thống (tự động) | (như trên) | Functional Requirements |
| FR-003-08 | Tự động tổng hợp báo cáo quản lý đối tượng hàng tháng gửi CA huyện. | Hệ thống (tự động) | (như trên) | Functional Requirements |
| NFR-003-01 | Hồ sơ mã hóa, chỉ CB được phân công truy cập (cấp độ bí mật). | Hệ thống (phân quyền) | NĐ 13/2023/NĐ-CP | Non-Functional Requirements |
| NFR-003-02 | Tuân thủ NĐ 13/2023/NĐ-CP — không chia sẻ dữ liệu nhạy cảm không kiểm soát; cần có nhật ký truy cập (audit log) để chứng minh tuân thủ. | Hệ thống (audit) | NĐ 13/2023/NĐ-CP | Non-Functional Requirements |
| NFR-003-03 | Nhắc lịch qua app + SMS trước 1 ngày. | Hệ thống → Cán bộ tái hòa nhập | (như trên) | Non-Functional Requirements |
| NFR-003-04 | Cảnh báo tự động khi quá hạn trình diện > 3 ngày. | Hệ thống (tự động) | (như trên) | Non-Functional Requirements |

### CÂU HỎI
- "Cán bộ phụ trách tái hòa nhập" — role cụ thể nào (`field_officer`, `village_officer`, role mới)?
- FR-003-06 "camera LPR" — phụ thuộc Camera/LPR (xem mục 5, PS-003).
- "CA huyện" trong FR-003-01, FR-003-08 — xem Gap 2.
- "phân loại (hình sự/ma túy/TNXH)" — danh sách này có mở rộng được không?

---

## PS-E1-004 — Quản lý Cư dân Đặc biệt (Tạm trú, Người nước ngoài, Tái hòa nhập) — T1, Must Have

### Căn cứ pháp lý
Luật Cư trú 2020, Điều 27–32; Luật Nhập cảnh, xuất cảnh, quá cảnh, cư trú của người nước ngoài 2019, Điều 31–38; Luật Thi hành án hình sự 2019, Điều 50–58.

### Actor (bảng Actor trong story)
| Actor | Nền tảng | Vai trò |
|---|---|---|
| Cán bộ Công an xã Nghĩa Trụ phụ trách hộ khẩu | Web | Lập hồ sơ, đăng ký tạm trú, cập nhật biến động |
| Trưởng Công an xã Nghĩa Trụ | Web | Phê duyệt hồ sơ cư dân đặc biệt |
| Cán bộ thôn (thuộc xã Nghĩa Trụ) | Mobile | Theo dõi, gặp gỡ hàng tháng đối tượng tái hòa nhập tại địa bàn |
| Công an cấp trên (CA huyện) | Web | Chuyển hồ sơ bàn giao, nhận báo cáo tháng |
| Người tạm trú / Người nước ngoài / Chủ nhà cho thuê | Không truy cập hệ thống | Nguồn khai báo, data subject |

### Bảng yêu cầu

| ID gốc | Phát biểu (trích nguyên văn) | Actor | Căn cứ pháp lý | Vị trí (mục) |
|---|---|---|---|---|
| FR-004-01 | Tiếp nhận hồ sơ bàn giao đối tượng tái hòa nhập từ CA huyện. | Cán bộ hộ khẩu | Luật Cư trú 2020 Đ27–32; Luật NHQC 2019 Đ31–38; Luật THAHS 2019 Đ50–58 | Functional Requirements |
| FR-004-02 | Lập hồ sơ quản lý (ảnh, lý lịch, tội danh, mức độ nguy hiểm). | Cán bộ hộ khẩu | (như trên) | Functional Requirements |
| FR-004-03 | Phân công cán bộ thôn theo dõi, ghi nhận gặp gỡ hàng tháng trên app. | Trưởng CA xã → Cán bộ thôn | (như trên) | Functional Requirements |
| FR-004-04 | Đăng ký tạm trú người nước ngoài trong 24h, tự động báo CA huyện. | Cán bộ hộ khẩu | (như trên) | Functional Requirements |
| FR-004-05 | Cập nhật biến động (di chuyển, việc làm, tái phạm). | Cán bộ hộ khẩu / Cán bộ thôn | (như trên) | Functional Requirements |
| FR-004-06 | Cảnh báo ngay CA huyện khi đối tượng bỏ trốn/vi phạm. | Hệ thống (tự động) | (như trên) | Functional Requirements |
| FR-004-07 | Xuất báo cáo danh sách cư dân đặc biệt theo tháng. | Cán bộ hộ khẩu / Hệ thống | (như trên) | Functional Requirements |
| NFR-004-01 | Đăng ký tạm trú/khai báo người nước ngoài hoàn tất trong 24h kể từ khi đến — có cảnh báo SLA khi gần/quá hạn. | Hệ thống (SLA) | Luật Cư trú 2020 Đ27–32; Luật NHQC 2019 Đ31–38 | Non-Functional Requirements |
| NFR-004-02 | 100% cư dân đặc biệt được đăng ký/ghi nhận, không bỏ sót đối tượng nguy hiểm. | Cán bộ hộ khẩu / Hệ thống | (như trên) | Non-Functional Requirements |
| NFR-004-03 | Hệ thống nhắc đảm bảo gặp gỡ đối tượng tái hòa nhập ≥ 1 lần/tháng. | Hệ thống → Cán bộ thôn | (như trên) | Non-Functional Requirements |
| NFR-004-04 | Báo cáo CA huyện tự động đúng kỳ hàng tháng. | Hệ thống (tự động) | (như trên) | Non-Functional Requirements |

### CÂU HỎI
- "CA huyện" trong FR-004-01, FR-004-04, FR-004-06, NFR-004-04 — xem Gap 2.
- "cán bộ thôn" — role `village_officer` hay role riêng?
- FR-004-03 "ghi nhận gặp gỡ hàng tháng trên app" — mobile write hay read-only? (xem ADR-0005, nhưng Requirement.md không quy định rõ).
- "ảnh, lý lịch, tội danh" trong FR-004-02 — có yêu cầu mã hóa không (xem NFR-X-01)?

---

## PS-E1-005 — Ghi nhận và Theo dõi Tố giác Tội phạm từ Dân — T1, Must Have

### Căn cứ pháp lý
Bộ luật Tố tụng hình sự 2015, Điều 144–147 (tố giác, tin báo tội phạm); Thông tư 28/2020/TT-BCA (quy trình tiếp nhận, giải quyết tố giác, tin báo về tội phạm); Luật Công an nhân dân 2018.

### Actor (bảng Actor trong story)
| Actor | Nền tảng | Vai trò |
|---|---|---|
| Cán bộ trực ban Công an xã Nghĩa Trụ | Web | Tiếp nhận, mã hóa danh tính, phân loại tin tố giác |
| Cán bộ Công an xã Nghĩa Trụ (hiện trường) | Mobile | Xác minh ban đầu tại địa điểm tố giác |
| Trưởng Công an xã Nghĩa Trụ | Web | Xem danh tính thật người tố giác (quyền cao nhất), duyệt chuyển huyện |
| Người dân | Mobile (app công dân) hoặc kênh ngoài hệ thống (trực tiếp/điện thoại) | Người tố giác |
| Công an cấp trên (CA huyện) | Web | Tiếp nhận hồ sơ vượt thẩm quyền |

### Bảng yêu cầu

| ID gốc | Phát biểu (trích nguyên văn) | Actor | Căn cứ pháp lý | Vị trí (mục) |
|---|---|---|---|---|
| FR-005-01 | Ghi nhận tin tố giác qua đa kênh (trực tiếp/app/điện thoại) ngay khi tiếp nhận. | Cán bộ trực ban | BLTTHS 2015 Đ144–147; TT 28/2020/TT-BCA; Luật CAND 2018 | Functional Requirements |
| FR-005-02 | Mã hóa/che danh tính người tố giác — chỉ Trưởng CA xã xem được tên thật. | Hệ thống (mã hóa) → Trưởng CA xã | (như trên) | Functional Requirements |
| FR-005-03 | Phân loại tin (đủ cơ sở điều tra / cần xác minh thêm). | Cán bộ trực ban | (như trên) | Functional Requirements |
| FR-005-04 | Ghi nhận kết quả xác minh ban đầu (CB đến hiện trường quan sát). | Cán bộ hiện trường (Mobile) | (như trên) | Functional Requirements |
| FR-005-05 | Chuyển hồ sơ CA huyện khi vượt thẩm quyền xã. | Trưởng CA xã | (như trên) | Functional Requirements |
| FR-005-06 | Theo dõi và cập nhật trạng thái xử lý vụ việc theo thời gian thực. | Trưởng CA xã / Cán bộ trực ban | (như trên) | Functional Requirements |
| FR-005-07 | Tự động nhắc/gửi thông báo kết quả xử lý cho người tố giác trong hạn. | Hệ thống (tự động) | (như trên) | Functional Requirements |
| NFR-005-01 | 100% tin tố giác được ghi nhận trong 24h. | Hệ thống (SLA) | (như trên) | Non-Functional Requirements |
| NFR-005-02 | Danh tính người tố giác được bảo vệ tuyệt đối — mã hóa, phân quyền chặt hơn dữ liệu thường (liên quan NĐ 13/2023). | Hệ thống (bảo mật) | NĐ 13/2023/NĐ-CP | Non-Functional Requirements |
| NFR-005-03 | Xác minh ban đầu hoàn tất trong 48h. | Cán bộ hiện trường / Hệ thống (SLA) | (như trên) | Non-Functional Requirements |
| NFR-005-04 | Thông báo kết quả cho người tố giác trong 20 ngày (đúng Điều 147 BLTTHS 2015). | Hệ thống (tự động) | BLTTHS 2015 Đ147 | Non-Functional Requirements |
| NFR-005-05 | Cơ chế cảnh báo tin quá hạn xử lý chưa được phân loại/chuyển tiếp. | Hệ thống (tự động) | (như trên) | Non-Functional Requirements |

### CÂU HỎI
- "app công dân" trong Actor "Người dân" — public citizen app có trong phạm vi MVP không? (Requirement.md không rõ; ADR-0005 nói không tạo public citizen app).
- "CA huyện" trong FR-005-05 — xem Gap 2.
- "mã hóa/che danh tính" — cơ chế kỹ thuật cụ thể (encryption hay masking) chưa quy định.
- "đủ cơ sở điều tra / cần xác minh thêm" — tiêu chí phân loại có được chuẩn hóa không?

---

## PS-E1-006 — Phân tích Xu hướng ANTT theo Thời gian (Trend Analysis) — T2, Should Have

### Căn cứ pháp lý
Luật Công an nhân dân 2018, Điều 14 (phân tích, đánh giá tình hình); Thông tư 17/2018/TT-BCA (nghiệp vụ Công an xã).

### Actor (bảng Actor trong story)
| Actor | Nền tảng | Vai trò |
|---|---|---|
| Trưởng Công an xã Nghĩa Trụ | Web | Xem biểu đồ/heat map, ra quyết định điều chỉnh tuần tra |
| Hệ thống CivicOS (tự động) | Hệ thống/API | Tổng hợp dữ liệu, tính toán xu hướng |
| Công an cấp trên (CA huyện) | Web | Tiếp nhận báo cáo phân tích hàng tháng |

### Bảng yêu cầu

| ID gốc | Phát biểu (trích nguyên văn) | Actor | Căn cứ pháp lý | Vị trí (mục) |
|---|---|---|---|---|
| FR-006-01 | Tổng hợp tự động vụ việc ANTT theo loại, địa điểm, thời gian. | Hệ thống CivicOS | Luật CAND 2018 Đ14; TT 17/2018/TT-BCA | Functional Requirements |
| FR-006-02 | Vẽ biểu đồ xu hướng so sánh tháng này/tháng trước, năm nay/năm ngoái. | Hệ thống CivicOS → Trưởng CA xã | (như trên) | Functional Requirements |
| FR-006-03 | Vẽ heat map vụ việc theo tọa độ địa lý. | Hệ thống CivicOS → Trưởng CA xã | (như trên) | Functional Requirements |
| FR-006-04 | Phân tích phân bố loại tội phạm theo khung giờ. | Hệ thống CivicOS → Trưởng CA xã | (như trên) | Functional Requirements |
| FR-006-05 | Cảnh báo tự động khi xu hướng tăng > 30% so với kỳ trước. | Hệ thống CivicOS | (như trên) | Functional Requirements |
| FR-006-06 | Gợi ý điều chỉnh kế hoạch tuần tra theo khu vực/khung giờ nguy cơ cao. | Hệ thống CivicOS → Trưởng CA xã | (như trên) | Functional Requirements |
| FR-006-07 | Xuất báo cáo phân tích gửi CA huyện hàng tháng. | Hệ thống CivicOS | (như trên) | Functional Requirements |
| NFR-006-01 | Biểu đồ xu hướng cập nhật hàng ngày. | Hệ thống CivicOS | (như trên) | Non-Functional Requirements |
| NFR-006-02 | Heat map chính xác theo tọa độ GPS thực tế. | Hệ thống CivicOS / Nền bản đồ | (như trên) | Non-Functional Requirements |
| NFR-006-03 | Ngưỡng 30% phải điều chỉnh được theo loại vụ việc. | Hệ thống CivicOS | (như trên) | Non-Functional Requirements |
| NFR-006-04 | Cần cơ chế đo tỷ lệ giảm tội phạm sau khi tăng cường theo gợi ý (đánh giá hậu kiểm, không chỉ hiển thị). | Trưởng CA xã / Hệ thống | (như trên) | Non-Functional Requirements |

### CÂU HỎI
- "CA huyện" trong FR-006-07 — xem Gap 2.
- "vụ việc ANTT" — bao gồm IntakeReport, Incident, Hotspot, Vehicle... nào? Chưa có định nghĩa tập hợp.
- NFR-006-04 "cơ chế đo tỷ lệ giảm tội phạm" — chỉ hiển thị hay cần workflow đánh giá hậu kiểm?

---

## PS-E1-007 — Quản lý Cơ sở Kinh doanh Có Điều kiện — T1, Must Have

### Căn cứ pháp lý
Luật Đầu tư 2020, Điều 7 (danh mục ngành nghề kinh doanh có điều kiện); Nghị định 167/2013/NĐ-CP, Điều 11–20; Nghị định 96/2016/NĐ-CP (điều kiện ANTT đối với ngành nghề kinh doanh có điều kiện).

### Actor (bảng Actor trong story)
| Actor | Nền tảng | Vai trò |
|---|---|---|
| Cán bộ Công an xã Nghĩa Trụ (văn phòng) | Web | Lập danh mục, lên lịch kiểm tra định kỳ |
| Cán bộ Công an xã Nghĩa Trụ (hiện trường) | Mobile | Kiểm tra thực địa, điền checklist, chụp ảnh GPS |
| Trưởng Công an xã Nghĩa Trụ | Web | Chỉ đạo, xử phạt hoặc chuyển huyện |
| Phòng CSKT huyện (Công an cấp trên) | Web | Phối hợp kiểm tra |
| Chủ cơ sở KDCĐK | Không truy cập hệ thống | Đối tượng kiểm tra |

### Bảng yêu cầu

| ID gốc | Phát biểu (trích nguyên văn) | Actor | Căn cứ pháp lý | Vị trí (mục) |
|---|---|---|---|---|
| FR-007-01 | Lập danh mục cơ sở KDCĐK (tên, chủ, địa chỉ, loại hình, giấy phép). | Cán bộ văn phòng | Luật Đầu tư 2020 Đ7; NĐ 167/2013 Đ11–20; NĐ 96/2016 | Functional Requirements |
| FR-007-02 | Lập lịch kiểm tra định kỳ 6 tháng/lần. | Cán bộ văn phòng | (như trên) | Functional Requirements |
| FR-007-03 | Checklist kiểm tra chuẩn hóa theo từng loại hình cơ sở. | Cán bộ văn phòng / Hệ thống | (như trên) | Functional Requirements |
| FR-007-04 | Ghi nhận kết quả kiểm tra thực địa kèm ảnh có gắn GPS. | Cán bộ hiện trường (Mobile) | (như trên) | Functional Requirements |
| FR-007-05 | Phân loại kết quả: đạt / nhắc nhở / xử phạt. | Cán bộ hiện trường / Trưởng CA xã | (như trên) | Functional Requirements |
| FR-007-06 | Lập biên bản vi phạm → luồng xử phạt (Trưởng CA xã) hoặc chuyển huyện. | Trưởng CA xã / Hệ thống | (như trên) | Functional Requirements |
| FR-007-07 | Thống kê tỷ lệ đạt theo loại cơ sở. | Cán bộ văn phòng / Hệ thống | (như trên) | Functional Requirements |
| NFR-007-01 | 100% cơ sở KDCĐK được kiểm tra ≥ 2 lần/năm. | Hệ thống (SLA) / Cán bộ văn phòng | (như trên) | Non-Functional Requirements |
| NFR-007-02 | Biên bản kèm ảnh GPS đủ giá trị chứng cứ. | Cán bộ hiện trường / Hệ thống (Evidence) | (như trên) | Non-Functional Requirements |
| NFR-007-03 | Vi phạm được xử lý trong 7 ngày. | Trưởng CA xã / Hệ thống (SLA) | (như trên) | Non-Functional Requirements |
| NFR-007-04 | Checklist phải theo đúng cấu trúc từng loại hình, không dùng chung 1 mẫu. | Cán bộ văn phòng / Hệ thống | (như trên) | Non-Functional Requirements |

### CÂU HỎI
- "chuyển huyện" trong FR-007-06 — xem Gap 2 (chuyển cấp tỉnh/đầu mối nghiệp vụ).
- "Phòng CSKT huyện" — role `superior_officer`/`superior_commander` hay role riêng?
- FR-007-04 "ảnh có gắn GPS" — metadata chuẩn nào (EXIF, custom)?
- "loại hình cơ sở" — danh sách loại hình tham chiếu từ đâu (Luật Đầu tư, NĐ 167/2013)?

---

## PS-E1-008 — Cập nhật Thông tin Tình huống từ Hiện trường (Field Update) — T1, Must Have

### Căn cứ pháp lý
Luật Công an nhân dân 2018 (sửa đổi 2023), Điều 17; Luật số 30/2023/QH15 (thay Pháp lệnh Công an xã 2008 — xem mục 7, Gap 1); Quy chế báo cáo tình huống Công an xã (văn bản chỉ đạo nghiệp vụ nội bộ ngành, không công khai số hiệu).

### Actor (bảng Actor trong story)
| Actor | Nền tảng | Vai trò |
|---|---|---|
| Cán bộ Công an xã Nghĩa Trụ (hiện trường) | Mobile | Cập nhật trạng thái, ảnh, GPS theo thời gian thực |
| Trưởng Công an xã Nghĩa Trụ | Mobile | Nhận push notification, chỉ huy điều phối từ xa (vai trò khác cán bộ hiện trường dù cùng Mobile: nhận lệnh vs báo cáo) |

### Bảng yêu cầu

| ID gốc | Phát biểu (trích nguyên văn) | Actor | Căn cứ pháp lý | Vị trí (mục) |
|---|---|---|---|---|
| FR-008-01 | Chọn tình huống đang xử lý từ danh sách trên app mobile. | Cán bộ hiện trường | Luật CAND 2018 (sửa đổi 2023) Đ17; Luật 30/2023/QH15; Quy chế báo cáo tình huống (nội bộ) | Functional Requirements |
| FR-008-02 | Cập nhật trạng thái: Đang xử lý / Cần hỗ trợ / Đã kiểm soát. | Cán bộ hiện trường | (như trên) | Functional Requirements |
| FR-008-03 | Đính kèm ảnh và tọa độ GPS tự động (không nhập tay). | Cán bộ hiện trường / Hệ thống | (như trên) | Functional Requirements |
| FR-008-04 | Nhập mô tả ngắn diễn biến mới (1–3 câu). | Cán bộ hiện trường | (như trên) | Functional Requirements |
| FR-008-05 | Gửi push notification realtime tới Trưởng CA xã. | Hệ thống (tự động) | (như trên) | Functional Requirements |
| FR-008-06 | Đóng tình huống khi cập nhật "Đã xử lý xong". | Cán bộ hiện trường | (như trên) | Functional Requirements |
| FR-008-07 | Lưu timeline liên tục các cập nhật của một tình huống. | Hệ thống (tự động) | (như trên) | Functional Requirements |
| NFR-008-01 | Thao tác cập nhật hoàn tất < 1 phút. | Cán bộ hiện trường / Hệ thống | (như trên) | Non-Functional Requirements |
| NFR-008-02 | GPS gắn tự động, không yêu cầu nhập tay tọa độ. | Hệ thống (Mobile) | (như trên) | Non-Functional Requirements |
| NFR-008-03 | Thông báo tới Trưởng CA xã theo thời gian thực (push). | Hệ thống (notification) | (như trên) | Non-Functional Requirements |
| NFR-008-04 | Ảnh gắn metadata (thời gian, GPS, người chụp) không thể chỉnh sửa sau khi upload. | Hệ thống (Evidence immutable) | (như trên) | Non-Functional Requirements |
| NFR-008-05 | Cần cơ chế đồng bộ lại khi hiện trường mất sóng tạm thời (suy ra từ bối cảnh hiện trường — `[BỔ SUNG]`, chưa có trong AC gốc, cần xác nhận). | Hệ thống (offline sync) | (như trên) | Non-Functional Requirements |

### CÂU HỎI
- "tình huống" — là `Incident` hay `IntakeReport` hay entity riêng `FieldUpdate` (xem CONTEXT.md có `FieldUpdate`)?
- "app mobile" — mobile internal (cán bộ) hay public citizen app?
- NFR-008-05 được đánh dấu `[BỔ SUNG]` — cần xác nhận với đơn vị nghiệp vụ.
- "push notification realtime" — FCM/APNs hay websocket/Socket.IO?

---

## PS-E1-009 — Quản lý Phương tiện Lạ / Khả nghi Lưu trú — T1, Must Have

### Căn cứ pháp lý
Luật Giao thông đường bộ 2008, Điều 75 (dừng, đỗ xe); Luật Cư trú 2020; Nghị định 167/2013/NĐ-CP.

### Actor (bảng Actor trong story)
| Actor | Nền tảng | Vai trò |
|---|---|---|
| Cán bộ Công an xã Nghĩa Trụ (hiện trường) | Mobile | Tra cứu biển số, xác minh thực địa |
| Tổ tự quản thôn (thuộc xã Nghĩa Trụ) | Mobile | Báo cáo phương tiện lạ tại chỗ (vai trò khác cán bộ hiện trường dù cùng Mobile: phát hiện/báo tin vs tra cứu/xử lý nghiệp vụ) |
| Người dân | Mobile (app công dân) hoặc kênh ngoài hệ thống | Nguồn tin phương tiện lạ |
| Công an cấp trên (CA huyện) | Web | Nhận báo cáo xe nghi vấn trong 2h |

### Bảng yêu cầu

| ID gốc | Phát biểu (trích nguyên văn) | Actor | Căn cứ pháp lý | Vị trí (mục) |
|---|---|---|---|---|
| FR-009-01 | Tiếp nhận báo cáo phương tiện lạ từ tổ tự quản hoặc cảnh báo camera LPR. | Cán bộ hiện trường / Tổ tự quản / Hệ thống Camera | Luật GTĐB 2008 Đ75; Luật Cư trú 2020; NĐ 167/2013 | Functional Requirements |
| FR-009-02 | Tra cứu biển số theo CSDL xe nghi vấn + lịch sử camera. | Cán bộ hiện trường | (như trên) | Functional Requirements |
| FR-009-03 | Ghi nhận kết quả xác minh thực địa (tìm chủ xe). | Cán bộ hiện trường | (như trên) | Functional Requirements |
| FR-009-04 | Nhắc chủ xe khai báo tạm trú nếu xe hợp lệ. | Cán bộ hiện trường / Hệ thống | (như trên) | Functional Requirements |
| FR-009-05 | Báo cáo CA huyện trong 2h nếu xe thuộc diện khả nghi (không tự xử lý). | Cán bộ hiện trường / Hệ thống | (như trên) | Functional Requirements |
| FR-009-06 | Ghi nhận đầy đủ biển số, thời gian, địa điểm, ảnh GPS cho mọi xe lạ. | Cán bộ hiện trường / Tổ tự quản | (như trên) | Functional Requirements |
| FR-009-07 | Thống kê xe lạ theo tháng và theo điểm hay xuất hiện. | Hệ thống / Cán bộ văn phòng | (như trên) | Functional Requirements |
| NFR-009-01 | Phương tiện dừng > 48h không khai báo → kiểm tra trong 4h. | Hệ thống (SLA) / Cán bộ hiện trường | (như trên) | Non-Functional Requirements |
| NFR-009-02 | Tra cứu biển số < 30 giây. | Hệ thống | (như trên) | Non-Functional Requirements |
| NFR-009-03 | Xe trong danh sách nghi vấn báo CA huyện trong 2h. | Hệ thống (SLA) | (như trên) | Non-Functional Requirements |
| NFR-009-04 | Mọi ghi nhận có ảnh + GPS + thời gian. | Hệ thống (Evidence) / Cán bộ hiện trường | (như trên) | Non-Functional Requirements |

### CÂU HỎI
- "CSDL xe nghi vấn" — là `SuspiciousVehicleRegistry` (xem PS-E1-001/vehicles) hay CSDL riêng?
- "CA huyện" trong FR-009-05, NFR-009-03 — xem Gap 2.
- "tổ tự quản thôn" — role `village_officer` hay role riêng?
- FR-009-01 "cảnh báo camera LPR" — phụ thuộc Camera/LPR (xem mục 5, PS-009).
- "app công dân" cho Người dân — public citizen app có trong phạm vi không?

---

## PS-E1-010 — Báo cáo Tình hình ANTT Định kỳ (Tự động Tổng hợp) — T2, Should Have

### Căn cứ pháp lý
Thông tư 17/2018/TT-BCA, Điều 8 (chế độ báo cáo Công an xã); Luật Công an nhân dân 2018, Điều 16; Quy chế báo cáo CA huyện (nội bộ ngành).

### Actor (bảng Actor trong story)
| Actor | Nền tảng | Vai trò |
|---|---|---|
| Trưởng Công an xã Nghĩa Trụ | Web | Xem lại, bổ sung nhận xét, ký số, gửi báo cáo |
| Trưởng Công an cấp trên (CA huyện) | Web | Tiếp nhận, phê duyệt cuối cùng |

### Bảng yêu cầu

| ID gốc | Phát biểu (trích nguyên văn) | Actor | Căn cứ pháp lý | Vị trí (mục) |
|---|---|---|---|---|
| FR-010-01 | Chọn kỳ báo cáo (tuần/tháng/quý). | Trưởng CA xã | TT 17/2018/TT-BCA Đ8; Luật CAND 2018 Đ16; Quy chế báo cáo CA huyện (nội bộ) | Functional Requirements |
| FR-010-02 | Tự động tổng hợp số vụ việc, loại, trạng thái xử lý, dữ liệu đối tượng quản lý. | Hệ thống (tự động) | (như trên) | Functional Requirements |
| FR-010-03 | So sánh số liệu với kỳ trước (tăng/giảm). | Hệ thống (tự động) → Trưởng CA xã | (như trên) | Functional Requirements |
| FR-010-04 | Xuất báo cáo đúng mẫu CA huyện (hỗ trợ upload mẫu tùy chỉnh). | Trưởng CA xã / Hệ thống | (như trên) | Functional Requirements |
| FR-010-05 | Cho phép Trưởng CA xã xem lại, bổ sung nhận xét trước khi gửi. | Trưởng CA xã | (như trên) | Functional Requirements |
| FR-010-06 | Ký số và gửi báo cáo qua hệ thống tới CA huyện. | Trưởng CA xã / Hệ thống | (như trên) | Functional Requirements |
| FR-010-07 | Lưu trữ báo cáo theo kỳ để tra cứu lịch sử. | Hệ thống | (như trên) | Functional Requirements |
| NFR-010-01 | ≥ 90% số liệu tự động lấy từ CivicOS, không nhập tay. | Hệ thống | (như trên) | Non-Functional Requirements |
| NFR-010-02 | Đúng mẫu CA huyện quy định (báo cáo tuần thứ 6, tháng ngày 25, quý ngày 20 tháng cuối quý). | Hệ thống / Trưởng CA xã | (như trên) | Non-Functional Requirements |
| NFR-010-03 | Gửi đúng hạn từng kỳ, có cảnh báo trước hạn. | Hệ thống (SLA/notification) | (như trên) | Non-Functional Requirements |
| NFR-010-04 | Hỗ trợ ký số để đảm bảo tính pháp lý của báo cáo. | Hệ thống (digital signature) | (như trên) | Non-Functional Requirements |

### CÂU HỎI
- "CA huyện" toàn bộ story — xem Gap 2 (cấu hình được đơn vị cấp trên).
- "ký số" — chuẩn/chứng thư số nào (CA Việt Nam, VNeID, tự ký)?
- "mẫu CA huyện" — có file mẫu tham chiếu không?
- "số vụ việc, loại, trạng thái xử lý, dữ liệu đối tượng quản lý" — nguồn dữ liệu từ story nào (001–009)?

---

## PHẦN GAP (TÁCH RIÊNG — KHÔNG TRỘN VÀO YÊU CẦU STORY)

### 5. Phụ thuộc Camera/LPR (chưa có quyền truy cập nguồn camera)

**Hiện trạng:** chưa có quyền truy cập bất kỳ camera an ninh nào → toàn bộ FR/NFR dưới đây phải thiết kế theo hướng "graceful degradation", không chặn phần còn lại của hệ thống.

| PS | FR/NFR bị ảnh hưởng | Cách xử lý (trích nguyên văn) |
|---|---|---|
| PS-001 | FR-001-01 (lớp Camera trên bản đồ) | Lớp Camera hiển thị trạng thái "Chưa kết nối nguồn camera" thay vì trống/lỗi; các lớp khác (điểm nóng, vụ việc...) hoạt động độc lập, không phụ thuộc |
| PS-003 | FR-003-06 (cảnh báo LPR biển số ban đêm) | Đưa vào Phase 2; hồ sơ đối tượng và nhật ký kiểm tra (FR-003-01→05) vẫn triển khai đầy đủ ở Phase 1 |
| PS-009 | FR-009-01, FR-009-02 (nhận cảnh báo LPR, tra cứu tự động) | Bắt buộc có luồng nhập tay: CB tự nhập biển số quan sát được → vẫn tra cứu CSDL xe nghi vấn bình thường (FR-009-02 không phụ thuộc camera, chỉ nguồn *đầu vào* biển số mới phụ thuộc) |
| PS-010 | Số liệu "camera phát hiện bao nhiêu sự kiện" trong báo cáo | Bỏ trường này khỏi báo cáo tự động cho đến khi có nguồn camera; không hiển thị số 0 gây hiểu nhầm |

**Nguyên tắc kiến trúc (trích nguyên văn):**
- NFR-CAM-01 (Adapter pattern): Định nghĩa 1 interface "Camera/LPR Data Source" dùng chung cho PS-001/003/009; module nghiệp vụ gọi qua interface, không gọi thẳng API của một hãng camera cụ thể → khi có quyền truy cập chỉ cần viết adapter mới.
- NFR-CAM-02 (Mock data): Cung cấp bộ dữ liệu giả lập (sự kiện, biển số) để phát triển/kiểm thử UI và luồng cảnh báo trong lúc chưa có nguồn thật.
- NFR-CAM-03 (Fallback nhập tay): Mọi FR có nguồn dữ liệu camera đều phải có đường nhập tay tương đương, không được là điều kiện bắt buộc để dùng được tính năng.
- NFR-CAM-04 (Phân kỳ): Các FR phụ thuộc camera đưa vào Phase 2 (sau MVP), không chặn go-live của PS-001/003/009/010.

### 6. Yêu cầu Phi chức năng xuyên suốt Epic (Cross-cutting NFR)

| ID | Phát biểu (trích nguyên văn) |
|---|---|
| NFR-X-01 | Bảo mật & phân quyền: RBAC theo cấp độ bí mật dữ liệu — áp dụng nghiêm ngặt nhất cho PS-003 (đối tượng quản lý) và PS-005 (danh tính người tố giác), theo NĐ 13/2023/NĐ-CP. |
| NFR-X-02 | Định vị & bản đồ: Toàn bộ dữ liệu có tọa độ (điểm nóng, vụ việc, xe lạ, cơ sở KD) phải dùng chung 1 hệ tọa độ/nền bản đồ (VietGeoX/VBDLIS) để liên thông với PS-001. |
| NFR-X-03 | Mobile-first cho hiện trường: PS-005, PS-008, PS-009 đều phát sinh thao tác tại hiện trường → cần app mobile hoạt động ổn định, tối ưu thao tác nhanh. |
| NFR-X-04 | Báo cáo tự động lên CA huyện: PS-002, 004, 005(gián tiếp), 006, 010 đều có luồng báo cáo định kỳ lên CA huyện → nên dùng chung 1 engine tổng hợp báo cáo, tránh xây trùng lặp. |
| NFR-X-05 | Audit log: Mọi thao tác trên dữ liệu nhạy cảm (003, 004, 005) cần nhật ký truy cập phục vụ thanh tra/kiểm tra tuân thủ. |

### 7. Gap đã giải quyết

**Gap 1 — Văn bản pháp lý thay thế Pháp lệnh Công an xã 2008 (PS-001, PS-002, PS-008):**
Đã xác nhận. Pháp lệnh Công an xã số 06/2008/PL-UBTVQH12 và Thông tư 12/2010/TT-BCA **hết hiệu lực từ 01/7/2024**, thay thế bởi **Luật Lực lượng tham gia bảo vệ an ninh, trật tự ở cơ sở (Luật số 30/2023/QH15)**. Tuy nhiên Luật 30/2023 điều chỉnh lực lượng bán chuyên trách hỗ trợ (kế thừa công an xã bán chuyên trách, bảo vệ dân phố, dân phòng), không phải công an xã chính quy. Nhiệm vụ nắm tình hình/điều hành ANTT của **công an cấp xã chính quy** hiện dựa trên **Luật Công an nhân dân 2018 (sửa đổi, bổ sung 2023)** và văn bản chỉ đạo nghiệp vụ nội bộ ngành (chưa có thông tư công khai thay thế TT 12/2010). Căn cứ pháp lý ở PS-001, PS-002, PS-008 cập nhật thành: *Luật CAND 2018 (sửa đổi 2023) + Luật số 30/2023/QH15 (phần liên quan lực lượng cơ sở phối hợp) — thay cho Pháp lệnh Công an xã 2008/TT 12/2010 đã hết hiệu lực.*

**Gap 2 — Cấp "CA huyện" trong mô hình tổ chức hiện hành:**
Đã xác nhận có thay đổi cần lưu ý. Từ 01/3/2025, tổ chức Công an đã **bỏ cấp huyện**, chỉ còn 3 cấp: Bộ Công an — Công an cấp tỉnh — Công an cấp xã. Do đó mọi luồng "báo cáo/chuyển hồ sơ lên CA huyện" trong PS-002, 003, 004, 005, 006, 007, 009, 010 về bản chất hiện nay là **báo cáo/chuyển lên Công an cấp tỉnh** (hoặc đầu mối nghiệp vụ tương đương do tỉnh phân công). Khuyến nghị: giữ nguyên nhãn "CA huyện" trong tài liệu vì đây là thuật ngữ nghiệp vụ gốc từ Process Story, nhưng khi thiết kế hệ thống, trường "đơn vị cấp trên nhận báo cáo" phải là **cấu hình được** (không hard-code "huyện"), để đổi tên hiển thị thành "CA tỉnh" hoặc theo mô hình tổ chức từng địa phương mà không cần sửa code.

**Gap 3 — Actor/thông tin nghiệp vụ thiếu ở PS-001, PS-002, PS-008:**
Giữ nguyên phần đã suy luận trong tài liệu (đã đánh dấu `[BỔ SUNG]`), chấp nhận làm baseline vì không có nguồn nào khác để đối chiếu thêm; rủi ro thấp vì đây là công cụ điều hành nội bộ, không phải TTHC có form pháp lý bắt buộc.

**Gap 4 — Đồng bộ offline khi mất sóng tại hiện trường (PS-008):**
Chính thức đưa vào làm yêu cầu chuẩn thay vì gap treo — đã có tại NFR-008-05.

---

### TÓM TẮT CÂU HỎI MỞ (TỔNG HỢP)

1. Xác nhận role mapping: "Cán bộ An ninh xã", "Cán bộ tái hòa nhập", "Cán bộ hộ khẩu", "Cán bộ trực ban", "Cán bộ hiện trường", "Cán bộ văn phòng", "Tổ tự quản thôn" → map tới role catalog nào (`commander`, `duty_officer`, `field_officer`, `office_officer`, `village_officer`, `land_officer`, `commune_leader`, ...)?

2. "CA huyện" xuất hiện khắp nơi — xem Gap 2: cần cấu hình được `OrganizationUnit` cấp trên nhận báo cáo/chuyển hồ sơ.

3. "app công dân" / "public citizen app" — có trong phạm vi MVP không? (Requirement.md ghi "Mobile (app công dân) hoặc kênh ngoài hệ thống"; ADR-0005 nói không tạo public citizen app).

4. "camera LPR" — phụ thuộc Camera/LPR (mục 5); cần adapter pattern + mock data + fallback nhập tay.

5. "tình huống" trong PS-E1-008 — là `Incident`, `IntakeReport`, hay `FieldUpdate` riêng?

6. "CSDL xe nghi vấn" trong PS-E1-009 — là `SuspiciousVehicleRegistry` hay CSDL riêng?

7. "ký số" trong PS-E1-010 — chuẩn/chứng thư nào?

8. "mẫu CA huyện" trong PS-E1-010 — có file mẫu tham chiếu không?

9. "vụ việc ANTT" trong PS-E1-006 — tập hợp entity nào (IntakeReport, Incident, Hotspot, Vehicle...)?

10. "loại hình cơ sở" trong PS-E1-007 — danh sách tham chiếu từ đâu (Luật Đầu tư, NĐ 167/2013)?

11. NFR-008-05 `[BỔ SUNG]` — cần xác nhận với đơn vị nghiệp vụ.

12. "phân loại (hình sự/ma túy/TNXH)" trong PS-E1-003 — danh sách có mở rộng được không?

13. "ảnh có gắn GPS" metadata chuẩn nào (EXIF, custom)?

14. "ngưỡng 30%" trong PS-E1-006 — cấu hình theo loại vụ việc như thế nào?

15. "cơ chế đo tỷ lệ giảm tội phạm" (NFR-006-04) — chỉ hiển thị hay cần workflow đánh giá hậu kiểm?