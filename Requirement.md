# Require.md — Yêu cầu Chức năng & Phi chức năng Epic PS-E1 (CivicOS 2.0)

Nguồn: `Process_Story_đầy_đủ.md` (PS-E1-001 → PS-E1-010). Ký hiệu: **FR** = Functional Requirement, **NFR** = Non-Functional Requirement. Các mục đánh dấu `[BỔ SUNG]` là căn cứ pháp lý/actor được suy luận thêm do bảng gốc không có dữ liệu — cần đối chiếu lại với đơn vị nghiệp vụ trước khi triển khai.

---

## 0. Ma trận Tác nhân (Actor) tổng hợp toàn Epic

**Đơn vị áp dụng thống nhất trong toàn bộ tài liệu: Công an xã Nghĩa Trụ** (chọn làm case study chuẩn thay cho các tên khác nhau — Ba Đình, Đà Lạt P3, Xuân Hòa — xuất hiện rải rác trong Process Story gốc).

| Actor | Loại | Nền tảng | Vai trò chính | Xuất hiện ở |
|---|---|---|---|---|
| Trưởng Công an xã Nghĩa Trụ | Internal / Approver | Web (chính) + Mobile (nhận cảnh báo khi ở ngoài) | Điều hành, phê duyệt, ký báo cáo, phân công | 001,002,003(gián tiếp),004,005,007,008,009,010 |
| Cán bộ Công an xã Nghĩa Trụ (văn phòng — hộ khẩu/ANTT) | Internal / Thực hiện | Web | Nhập liệu, lập hồ sơ, tổng hợp báo cáo | 002,003,004,006,007 |
| Cán bộ Công an xã Nghĩa Trụ (hiện trường) | Internal / Thực hiện | Mobile | Tác nghiệp tại chỗ: xác minh, chụp ảnh GPS, cập nhật nhanh | 005,007,008,009 |
| Cán bộ trực ban Công an xã Nghĩa Trụ | Internal / Thực hiện | Web (tiếp nhận tại trực ban) | Tiếp nhận, phân loại tin báo/tố giác | 005 |
| Cán bộ thôn / Tổ tự quản (thuộc xã Nghĩa Trụ) | Internal (bán chuyên trách) | Mobile | Cộng tác viên cơ sở: theo dõi đối tượng, báo phương tiện lạ | 003,004,009 |
| Công an cấp trên (CA huyện/tỉnh phụ trách xã Nghĩa Trụ) | External / Cơ quan cấp trên | Web (cổng tiếp nhận báo cáo riêng) | Nhận báo cáo, chuyển hồ sơ, xử lý vượt thẩm quyền, phê duyệt | 002–007,009,010 |
| Người dân (cư trú tại xã Nghĩa Trụ) | External / Nguồn tin, đối tượng thụ hưởng | Mobile (app công dân) hoặc kênh ngoài hệ thống (trực tiếp/điện thoại) | Tố giác tội phạm, báo phương tiện lạ, chủ nhà cho thuê | 001,005,009 |
| Đối tượng quản lý (tái hòa nhập, tiền án, nguy cơ) | External / Data subject | Không truy cập hệ thống | Chủ thể bị theo dõi định kỳ | 003,004 |
| Người tạm trú / Người nước ngoài | External / Data subject | Không truy cập hệ thống | Đăng ký, bị theo dõi biến động cư trú | 004 |
| Chủ cơ sở KDCĐK (karaoke, bar, cầm đồ, khách sạn...) | External / Đối tượng kiểm tra | Không truy cập hệ thống | Chấp hành kiểm tra định kỳ/đột xuất | 007 |
| Hệ thống Camera/AI (LPR, cảnh báo) | System actor | Hệ thống/API (không phải web/mobile) | Cấp dữ liệu tự động (biển số, cảnh báo đêm) | 001,003,006,009 |
| Nền bản đồ VietGeoX/VBDLIS | System actor (external) | Hệ thống/API | Cung cấp nền GIS | 001 |

**Ghi chú phân nền tảng:** khi hai actor cùng dùng Web (vd. Cán bộ văn phòng vs Trưởng CA xã vs Công an cấp trên), vai trò được phân biệt rõ theo cấp độ: Nhập liệu → Phê duyệt nội bộ → Tiếp nhận cấp trên, tránh trùng quyền trên cùng nền tảng.

**Rủi ro tác nhân cần lưu ý:** dữ liệu đối tượng quản lý (003) và người tố giác (005) là nhóm dễ bị tổn thương về quyền riêng tư/an toàn cá nhân → yêu cầu kiểm soát truy cập phải thiết kế ở tầng phân quyền (RBAC), không chỉ ở tầng UI.

---

## PS-E1-001 — Bản đồ Địa bàn Số Tổng hợp (ANTT Dashboard Map) — T1, Must Have

### Căn cứ pháp lý
`[BỔ SUNG]` Không có căn cứ trực tiếp cho riêng công cụ bản đồ (đây là công cụ điều hành nội bộ). Cơ sở gián tiếp:
- Luật Công an nhân dân 2018 (sửa đổi 2023), Điều 16–17 — nhiệm vụ nắm tình hình, chỉ huy điều hành.
- Luật Lực lượng tham gia bảo vệ an ninh, trật tự ở cơ sở (Luật số 30/2023/QH15, hiệu lực 01/7/2024) — thay thế Pháp lệnh Công an xã 2008/TT 12/2010 đã hết hiệu lực (xem mục 7, Gap 1).

### Actor
| Actor | Nền tảng | Vai trò |
|---|---|---|
| Trưởng Công an xã Nghĩa Trụ | Web | Xem tổng quan địa bàn, điều hành, xuất bản đồ in ấn |
| Hệ thống Camera/AI | Hệ thống/API | Cấp lớp dữ liệu camera lên bản đồ |
| Nền bản đồ VietGeoX/VBDLIS | Hệ thống/API | Cấp nền GIS |

`[BỔ SUNG — bảng gốc thiếu]` Không cần bước phê duyệt (công cụ xem/điều hành, không phải quy trình xử lý hồ sơ).

### Functional Requirements
- FR-001-01: Hệ thống hiển thị bản đồ GIS cấp xã/phường với các lớp Camera, Điểm nóng, Vụ việc, Lực lượng, Cơ sở KD, Đối tượng quản lý — bật/tắt độc lập từng lớp.
- FR-001-02: Vụ việc hiển thị icon phân màu theo mức độ (đỏ/vàng/xanh).
- FR-001-03: Click vào bất kỳ đối tượng bản đồ nào → popup tóm tắt + link chi tiết.
- FR-001-04: Bộ lọc theo thời gian, loại sự việc, mức độ, đơn vị xử lý.
- FR-001-05: Time slider xem lại bản đồ theo ngày/tuần/tháng bất kỳ.
- FR-001-06: Xuất snapshot bản đồ (ảnh/PDF) để đính kèm báo cáo.

### Non-Functional Requirements
- NFR-001-01 (Hiệu năng): Bản đồ load < 3s; cập nhật sự kiện mới hiển thị trong < 30s.
- NFR-001-02 (Độ chính xác dữ liệu): Nền bản đồ chính xác đến cấp đường/ngõ hẻm (nguồn VietGeoX/VBDLIS).
- NFR-001-03 (Khả năng mở rộng): Hỗ trợ đồng thời ≥ 5 lớp thông tin độc lập.
- NFR-001-04 (Khả dụng offline): Cached tiles cho phép xem dữ liệu tĩnh khi mất internet.
- NFR-001-05 (Khả năng in ấn): Xuất bản đồ khổ A3/A4 phục vụ giao ban.

---

## PS-E1-002 — Quản lý Điểm nóng ANTT (Hot Spot Management) — T1, Must Have

### Căn cứ pháp lý
Tương tự PS-001 — Luật CAND 2018 (sửa đổi 2023) Điều 16 (phòng ngừa, đấu tranh tội phạm); Luật số 30/2023/QH15 (thay Pháp lệnh Công an xã 2008 — xem mục 7, Gap 1). Không có quy định riêng về "điểm nóng số hóa"; đây là nghiệp vụ nội bộ theo chỉ đạo nghiệp vụ ngành, không phải TTHC công dân.

### Actor
| Actor | Nền tảng | Vai trò |
|---|---|---|
| Cán bộ An ninh xã Nghĩa Trụ | Web | Khởi tạo, cập nhật, theo dõi điểm nóng (vẽ polygon, nhập phân tích) |
| Trưởng Công an xã Nghĩa Trụ | Web | Phê duyệt đề xuất đóng/mở điểm nóng `[BỔ SUNG — suy luận từ B8]` |
| Công an cấp trên (CA huyện) | Web | Nhận báo cáo điểm nóng tuần |

### Functional Requirements
- FR-002-01: Tạo điểm nóng mới bằng vẽ vùng polygon trên bản đồ (không giới hạn 1 điểm tọa độ).
- FR-002-02: Nhập thuộc tính: tên, loại (Trộm cắp/Ma túy/TNXH/Khiếu kiện/Khác), mức độ (Thấp/TB/Cao).
- FR-002-03: Auto-link vụ việc mới vào điểm nóng nếu tọa độ vụ việc nằm trong vùng đã khoanh.
- FR-002-04: Ghi nhận phân tích nguyên nhân và biện pháp đã/sẽ triển khai.
- FR-002-05: Tự động tăng tần suất nhắc tuần tra khi điểm nóng ở mức Cao.
- FR-002-06: Theo dõi trend số vụ việc theo tuần tại từng điểm nóng.
- FR-002-07: Đề xuất đóng điểm nóng khi mức độ duy trì Thấp liên tục 4 tuần.
- FR-002-08: Tự động tổng hợp điểm nóng vào báo cáo tuần gửi CA huyện.

### Non-Functional Requirements
- NFR-002-01 (Trực quan): Màu sắc điểm nóng trên bản đồ theo mức độ, đồng bộ với FR-001-02.
- NFR-002-02 (Lưu trữ): Lịch sử điểm nóng lưu vĩnh viễn, hỗ trợ so sánh theo năm.
- NFR-002-03 (Thông báo): Gửi nhắc tăng cường tuần tra tới đúng cán bộ phụ trách khu vực.
- NFR-002-04 (Tính đúng đắn nghiệp vụ): Ngưỡng "4 tuần liên tiếp mức Thấp" phải cấu hình được, không hard-code.

---

## PS-E1-003 — Quản lý Đối tượng cần Quản lý (Persons of Interest) — T1, Must Have

### Căn cứ pháp lý
- Luật Thi hành án hình sự 2019, Điều 45–46 (thông báo, tiếp nhận người chấp hành xong án phạt tù), Điều 25 (trách nhiệm Công an cấp xã trong tái hòa nhập cộng đồng).
- Nghị định 49/2020/NĐ-CP quy định chi tiết thi hành Luật THAHS về tái hòa nhập cộng đồng.
- Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân — áp dụng vì hồ sơ đối tượng là dữ liệu nhạy cảm (đã nêu trong AC gốc).

### Actor
| Actor | Nền tảng | Vai trò |
|---|---|---|
| Cán bộ Công an xã Nghĩa Trụ phụ trách tái hòa nhập | Web (lập hồ sơ, upload tài liệu) + Mobile (ghi nhật ký khi đi kiểm tra tại nhà đối tượng) | Lập & quản lý hồ sơ đối tượng, ghi nhận kiểm tra định kỳ |
| Công an cấp trên (CA huyện) | Web | Bàn giao hồ sơ đối tượng, nhận báo cáo tháng |
| Đối tượng quản lý (tái hòa nhập/tiền án) | Không truy cập hệ thống | Data subject bị theo dõi |

`[BỔ SUNG — bảng gốc thiếu]` Phân quyền truy cập: chỉ cán bộ được phân công mới xem được hồ sơ (theo AC gốc).

### Functional Requirements
- FR-003-01: Tạo hồ sơ đối tượng từ hồ sơ bàn giao CA huyện: họ tên, CCCD, địa chỉ, phân loại (hình sự/ma túy/TNXH), mức độ nguy cơ.
- FR-003-02: Upload tài liệu kèm theo (quyết định mãn hạn tù, cam kết tái hòa nhập).
- FR-003-03: Đặt lịch kiểm tra định kỳ theo tần suất cấu hình theo mức độ nguy cơ (tuần/2 tuần/tháng).
- FR-003-04: Cấu hình cảnh báo không trình diện: nhắc sau 3 ngày, cảnh báo sau 7 ngày.
- FR-003-05: Ghi nhật ký mỗi lần gặp/kiểm tra (ngày, nội dung, đánh giá).
- FR-003-06: Tích hợp cảnh báo từ camera LPR khi biển số xe đối tượng xuất hiện ban đêm.
- FR-003-07: Tự động liên kết đối tượng với vụ việc mới nếu đối tượng liên quan → cảnh báo CB phụ trách.
- FR-003-08: Tự động tổng hợp báo cáo quản lý đối tượng hàng tháng gửi CA huyện.

### Non-Functional Requirements
- NFR-003-01 (Bảo mật/Phân quyền): Hồ sơ mã hóa, chỉ CB được phân công truy cập (cấp độ bí mật).
- NFR-003-02 (Tuân thủ pháp lý): Tuân thủ NĐ 13/2023/NĐ-CP — không chia sẻ dữ liệu nhạy cảm không kiểm soát; cần có nhật ký truy cập (audit log) để chứng minh tuân thủ.
- NFR-003-03 (Thông báo đa kênh): Nhắc lịch qua app + SMS trước 1 ngày.
- NFR-003-04 (Cảnh báo realtime): Cảnh báo tự động khi quá hạn trình diện > 3 ngày.

---

## PS-E1-004 — Quản lý Cư dân Đặc biệt (Tạm trú, Người nước ngoài, Tái hòa nhập) — T1, Must Have

### Căn cứ pháp lý
Luật Cư trú 2020, Điều 27–32; Luật Nhập cảnh, xuất cảnh, quá cảnh, cư trú của người nước ngoài 2019, Điều 31–38; Luật Thi hành án hình sự 2019, Điều 50–58.

### Actor
| Actor | Nền tảng | Vai trò |
|---|---|---|
| Cán bộ Công an xã Nghĩa Trụ phụ trách hộ khẩu | Web | Lập hồ sơ, đăng ký tạm trú, cập nhật biến động |
| Trưởng Công an xã Nghĩa Trụ | Web | Phê duyệt hồ sơ cư dân đặc biệt |
| Cán bộ thôn (thuộc xã Nghĩa Trụ) | Mobile | Theo dõi, gặp gỡ hàng tháng đối tượng tái hòa nhập tại địa bàn |
| Công an cấp trên (CA huyện) | Web | Chuyển hồ sơ bàn giao, nhận báo cáo tháng |
| Người tạm trú / Người nước ngoài / Chủ nhà cho thuê | Không truy cập hệ thống | Nguồn khai báo, data subject |

### Functional Requirements
- FR-004-01: Tiếp nhận hồ sơ bàn giao đối tượng tái hòa nhập từ CA huyện.
- FR-004-02: Lập hồ sơ quản lý (ảnh, lý lịch, tội danh, mức độ nguy hiểm).
- FR-004-03: Phân công cán bộ thôn theo dõi, ghi nhận gặp gỡ hàng tháng trên app.
- FR-004-04: Đăng ký tạm trú người nước ngoài trong 24h, tự động báo CA huyện.
- FR-004-05: Cập nhật biến động (di chuyển, việc làm, tái phạm).
- FR-004-06: Cảnh báo ngay CA huyện khi đối tượng bỏ trốn/vi phạm.
- FR-004-07: Xuất báo cáo danh sách cư dân đặc biệt theo tháng.

### Non-Functional Requirements
- NFR-004-01 (Tuân thủ thời hạn pháp lý): Đăng ký tạm trú/khai báo người nước ngoài hoàn tất trong 24h kể từ khi đến — có cảnh báo SLA khi gần/quá hạn.
- NFR-004-02 (Tính đầy đủ): 100% cư dân đặc biệt được đăng ký/ghi nhận, không bỏ sót đối tượng nguy hiểm.
- NFR-004-03 (Tần suất tối thiểu): Hệ thống nhắc đảm bảo gặp gỡ đối tượng tái hòa nhập ≥ 1 lần/tháng.
- NFR-004-04 (Báo cáo đúng hạn): Báo cáo CA huyện tự động đúng kỳ hàng tháng.

---

## PS-E1-005 — Ghi nhận và Theo dõi Tố giác Tội phạm từ Dân — T1, Must Have

### Căn cứ pháp lý
Bộ luật Tố tụng hình sự 2015, Điều 144–147 (tố giác, tin báo tội phạm); Thông tư 28/2020/TT-BCA (quy trình tiếp nhận, giải quyết tố giác, tin báo về tội phạm); Luật Công an nhân dân 2018.

### Actor
| Actor | Nền tảng | Vai trò |
|---|---|---|
| Cán bộ trực ban Công an xã Nghĩa Trụ | Web | Tiếp nhận, mã hóa danh tính, phân loại tin tố giác |
| Cán bộ Công an xã Nghĩa Trụ (hiện trường) | Mobile | Xác minh ban đầu tại địa điểm tố giác |
| Trưởng Công an xã Nghĩa Trụ | Web | Xem danh tính thật người tố giác (quyền cao nhất), duyệt chuyển huyện |
| Người dân | Mobile (app công dân) hoặc kênh ngoài hệ thống (trực tiếp/điện thoại) | Người tố giác |
| Công an cấp trên (CA huyện) | Web | Tiếp nhận hồ sơ vượt thẩm quyền |

### Functional Requirements
- FR-005-01: Ghi nhận tin tố giác qua đa kênh (trực tiếp/app/điện thoại) ngay khi tiếp nhận.
- FR-005-02: Mã hóa/che danh tính người tố giác — chỉ Trưởng CA xã xem được tên thật.
- FR-005-03: Phân loại tin (đủ cơ sở điều tra / cần xác minh thêm).
- FR-005-04: Ghi nhận kết quả xác minh ban đầu (CB đến hiện trường quan sát).
- FR-005-05: Chuyển hồ sơ CA huyện khi vượt thẩm quyền xã.
- FR-005-06: Theo dõi và cập nhật trạng thái xử lý vụ việc theo thời gian thực.
- FR-005-07: Tự động nhắc/gửi thông báo kết quả xử lý cho người tố giác trong hạn.

### Non-Functional Requirements
- NFR-005-01 (SLA ghi nhận): 100% tin tố giác được ghi nhận trong 24h.
- NFR-005-02 (Bảo mật danh tính): Danh tính người tố giác được bảo vệ tuyệt đối — mã hóa, phân quyền chặt hơn dữ liệu thường (liên quan NĐ 13/2023).
- NFR-005-03 (SLA xác minh): Xác minh ban đầu hoàn tất trong 48h.
- NFR-005-04 (SLA phản hồi): Thông báo kết quả cho người tố giác trong 20 ngày (đúng Điều 147 BLTTHS 2015).
- NFR-005-05 (Không bỏ sót): Cơ chế cảnh báo tin quá hạn xử lý chưa được phân loại/chuyển tiếp.

---

## PS-E1-006 — Phân tích Xu hướng ANTT theo Thời gian (Trend Analysis) — T2, Should Have

### Căn cứ pháp lý
Luật Công an nhân dân 2018, Điều 14 (phân tích, đánh giá tình hình); Thông tư 17/2018/TT-BCA (nghiệp vụ Công an xã).

### Actor
| Actor | Nền tảng | Vai trò |
|---|---|---|
| Trưởng Công an xã Nghĩa Trụ | Web | Xem biểu đồ/heat map, ra quyết định điều chỉnh tuần tra |
| Hệ thống CivicOS (tự động) | Hệ thống/API | Tổng hợp dữ liệu, tính toán xu hướng |
| Công an cấp trên (CA huyện) | Web | Tiếp nhận báo cáo phân tích hàng tháng |

### Functional Requirements
- FR-006-01: Tổng hợp tự động vụ việc ANTT theo loại, địa điểm, thời gian.
- FR-006-02: Vẽ biểu đồ xu hướng so sánh tháng này/tháng trước, năm nay/năm ngoái.
- FR-006-03: Vẽ heat map vụ việc theo tọa độ địa lý.
- FR-006-04: Phân tích phân bố loại tội phạm theo khung giờ.
- FR-006-05: Cảnh báo tự động khi xu hướng tăng > 30% so với kỳ trước.
- FR-006-06: Gợi ý điều chỉnh kế hoạch tuần tra theo khu vực/khung giờ nguy cơ cao.
- FR-006-07: Xuất báo cáo phân tích gửi CA huyện hàng tháng.

### Non-Functional Requirements
- NFR-006-01 (Tần suất cập nhật): Biểu đồ xu hướng cập nhật hàng ngày.
- NFR-006-02 (Độ chính xác không gian): Heat map chính xác theo tọa độ GPS thực tế.
- NFR-006-03 (Ngưỡng cảnh báo cấu hình được): Ngưỡng 30% phải điều chỉnh được theo loại vụ việc.
- NFR-006-04 (Hiệu quả nghiệp vụ — đo lường): Cần cơ chế đo tỷ lệ giảm tội phạm sau khi tăng cường theo gợi ý (đánh giá hậu kiểm, không chỉ hiển thị).

---

## PS-E1-007 — Quản lý Cơ sở Kinh doanh Có Điều kiện — T1, Must Have

### Căn cứ pháp lý
Luật Đầu tư 2020, Điều 7 (danh mục ngành nghề kinh doanh có điều kiện); Nghị định 167/2013/NĐ-CP, Điều 11–20; Nghị định 96/2016/NĐ-CP (điều kiện ANTT đối với ngành nghề kinh doanh có điều kiện).

### Actor
| Actor | Nền tảng | Vai trò |
|---|---|---|
| Cán bộ Công an xã Nghĩa Trụ (văn phòng) | Web | Lập danh mục, lên lịch kiểm tra định kỳ |
| Cán bộ Công an xã Nghĩa Trụ (hiện trường) | Mobile | Kiểm tra thực địa, điền checklist, chụp ảnh GPS |
| Trưởng Công an xã Nghĩa Trụ | Web | Chỉ đạo, xử phạt hoặc chuyển huyện |
| Phòng CSKT huyện (Công an cấp trên) | Web | Phối hợp kiểm tra |
| Chủ cơ sở KDCĐK | Không truy cập hệ thống | Đối tượng kiểm tra |

### Functional Requirements
- FR-007-01: Lập danh mục cơ sở KDCĐK (tên, chủ, địa chỉ, loại hình, giấy phép).
- FR-007-02: Lập lịch kiểm tra định kỳ 6 tháng/lần.
- FR-007-03: Checklist kiểm tra chuẩn hóa theo từng loại hình cơ sở.
- FR-007-04: Ghi nhận kết quả kiểm tra thực địa kèm ảnh có gắn GPS.
- FR-007-05: Phân loại kết quả: đạt / nhắc nhở / xử phạt.
- FR-007-06: Lập biên bản vi phạm → luồng xử phạt (Trưởng CA xã) hoặc chuyển huyện.
- FR-007-07: Thống kê tỷ lệ đạt theo loại cơ sở.

### Non-Functional Requirements
- NFR-007-01 (Độ phủ): 100% cơ sở KDCĐK được kiểm tra ≥ 2 lần/năm.
- NFR-007-02 (Chứng cứ pháp lý): Biên bản kèm ảnh GPS đủ giá trị chứng cứ.
- NFR-007-03 (SLA xử lý vi phạm): Vi phạm được xử lý trong 7 ngày.
- NFR-007-04 (Chuẩn hóa nghiệp vụ): Checklist phải theo đúng cấu trúc từng loại hình, không dùng chung 1 mẫu.

---

## PS-E1-008 — Cập nhật Thông tin Tình huống từ Hiện trường (Field Update) — T1, Must Have

### Căn cứ pháp lý
Luật Công an nhân dân 2018 (sửa đổi 2023), Điều 17; Luật số 30/2023/QH15 (thay Pháp lệnh Công an xã 2008 — xem mục 7, Gap 1); Quy chế báo cáo tình huống Công an xã (văn bản chỉ đạo nghiệp vụ nội bộ ngành, không công khai số hiệu).

### Actor
| Actor | Nền tảng | Vai trò |
|---|---|---|
| Cán bộ Công an xã Nghĩa Trụ (hiện trường) | Mobile | Cập nhật trạng thái, ảnh, GPS theo thời gian thực |
| Trưởng Công an xã Nghĩa Trụ | Mobile | Nhận push notification, chỉ huy điều phối từ xa (vai trò khác cán bộ hiện trường dù cùng Mobile: nhận lệnh vs báo cáo) |

### Functional Requirements
- FR-008-01: Chọn tình huống đang xử lý từ danh sách trên app mobile.
- FR-008-02: Cập nhật trạng thái: Đang xử lý / Cần hỗ trợ / Đã kiểm soát.
- FR-008-03: Đính kèm ảnh và tọa độ GPS tự động (không nhập tay).
- FR-008-04: Nhập mô tả ngắn diễn biến mới (1–3 câu).
- FR-008-05: Gửi push notification realtime tới Trưởng CA xã.
- FR-008-06: Đóng tình huống khi cập nhật "Đã xử lý xong".
- FR-008-07: Lưu timeline liên tục các cập nhật của một tình huống.

### Non-Functional Requirements
- NFR-008-01 (Hiệu năng mobile): Thao tác cập nhật hoàn tất < 1 phút.
- NFR-008-02 (Tự động hóa vị trí): GPS gắn tự động, không yêu cầu nhập tay tọa độ.
- NFR-008-03 (Thời gian thực): Thông báo tới Trưởng CA xã theo thời gian thực (push).
- NFR-008-04 (Toàn vẹn dữ liệu): Ảnh gắn metadata (thời gian, GPS, người chụp) không thể chỉnh sửa sau khi upload.
- NFR-008-05 (Độ tin cậy mạng yếu): Cần cơ chế đồng bộ lại khi hiện trường mất sóng tạm thời (suy ra từ bối cảnh hiện trường — `[BỔ SUNG]`, chưa có trong AC gốc, cần xác nhận).

---

## PS-E1-009 — Quản lý Phương tiện Lạ / Khả nghi Lưu trú — T1, Must Have

### Căn cứ pháp lý
Luật Giao thông đường bộ 2008, Điều 75 (dừng, đỗ xe); Luật Cư trú 2020; Nghị định 167/2013/NĐ-CP.

### Actor
| Actor | Nền tảng | Vai trò |
|---|---|---|
| Cán bộ Công an xã Nghĩa Trụ (hiện trường) | Mobile | Tra cứu biển số, xác minh thực địa |
| Tổ tự quản thôn (thuộc xã Nghĩa Trụ) | Mobile | Báo cáo phương tiện lạ tại chỗ (vai trò khác cán bộ hiện trường dù cùng Mobile: phát hiện/báo tin vs tra cứu/xử lý nghiệp vụ) |
| Người dân | Mobile (app công dân) hoặc kênh ngoài hệ thống | Nguồn tin phương tiện lạ |
| Công an cấp trên (CA huyện) | Web | Nhận báo cáo xe nghi vấn trong 2h |

### Functional Requirements
- FR-009-01: Tiếp nhận báo cáo phương tiện lạ từ tổ tự quản hoặc cảnh báo camera LPR.
- FR-009-02: Tra cứu biển số theo CSDL xe nghi vấn + lịch sử camera.
- FR-009-03: Ghi nhận kết quả xác minh thực địa (tìm chủ xe).
- FR-009-04: Nhắc chủ xe khai báo tạm trú nếu xe hợp lệ.
- FR-009-05: Báo cáo CA huyện trong 2h nếu xe thuộc diện khả nghi (không tự xử lý).
- FR-009-06: Ghi nhận đầy đủ biển số, thời gian, địa điểm, ảnh GPS cho mọi xe lạ.
- FR-009-07: Thống kê xe lạ theo tháng và theo điểm hay xuất hiện.

### Non-Functional Requirements
- NFR-009-01 (SLA phát hiện): Phương tiện dừng > 48h không khai báo → kiểm tra trong 4h.
- NFR-009-02 (Hiệu năng tra cứu): Tra cứu biển số < 30 giây.
- NFR-009-03 (SLA báo cáo): Xe trong danh sách nghi vấn báo CA huyện trong 2h.
- NFR-009-04 (Tính đầy đủ bằng chứng): Mọi ghi nhận có ảnh + GPS + thời gian.

---

## PS-E1-010 — Báo cáo Tình hình ANTT Định kỳ (Tự động Tổng hợp) — T2, Should Have

### Căn cứ pháp lý
Thông tư 17/2018/TT-BCA, Điều 8 (chế độ báo cáo Công an xã); Luật Công an nhân dân 2018, Điều 16; Quy chế báo cáo CA huyện (nội bộ ngành).

### Actor
| Actor | Nền tảng | Vai trò |
|---|---|---|
| Trưởng Công an xã Nghĩa Trụ | Web | Xem lại, bổ sung nhận xét, ký số, gửi báo cáo |
| Trưởng Công an cấp trên (CA huyện) | Web | Tiếp nhận, phê duyệt cuối cùng |

### Functional Requirements
- FR-010-01: Chọn kỳ báo cáo (tuần/tháng/quý).
- FR-010-02: Tự động tổng hợp số vụ việc, loại, trạng thái xử lý, dữ liệu đối tượng quản lý.
- FR-010-03: So sánh số liệu với kỳ trước (tăng/giảm).
- FR-010-04: Xuất báo cáo đúng mẫu CA huyện (hỗ trợ upload mẫu tùy chỉnh).
- FR-010-05: Cho phép Trưởng CA xã xem lại, bổ sung nhận xét trước khi gửi.
- FR-010-06: Ký số và gửi báo cáo qua hệ thống tới CA huyện.
- FR-010-07: Lưu trữ báo cáo theo kỳ để tra cứu lịch sử.

### Non-Functional Requirements
- NFR-010-01 (Mức độ tự động hóa): ≥ 90% số liệu tự động lấy từ CivicOS, không nhập tay.
- NFR-010-02 (Chuẩn mẫu biểu): Đúng mẫu CA huyện quy định (báo cáo tuần thứ 6, tháng ngày 25, quý ngày 20 tháng cuối quý).
- NFR-010-03 (Đúng hạn): Gửi đúng hạn từng kỳ, có cảnh báo trước hạn.
- NFR-010-04 (Toàn vẹn/xác thực): Hỗ trợ ký số để đảm bảo tính pháp lý của báo cáo.

---

## 5. Phụ thuộc Camera/LPR (chưa có quyền truy cập nguồn camera)

**Hiện trạng:** chưa có quyền truy cập bất kỳ camera an ninh nào → toàn bộ FR/NFR dưới đây phải thiết kế theo hướng "graceful degradation", không chặn phần còn lại của hệ thống.

| PS | FR/NFR bị ảnh hưởng | Cách xử lý |
|---|---|---|
| PS-001 | FR-001-01 (lớp Camera trên bản đồ) | Lớp Camera hiển thị trạng thái "Chưa kết nối nguồn camera" thay vì trống/lỗi; các lớp khác (điểm nóng, vụ việc...) hoạt động độc lập, không phụ thuộc |
| PS-003 | FR-003-06 (cảnh báo LPR biển số ban đêm) | Đưa vào Phase 2; hồ sơ đối tượng và nhật ký kiểm tra (FR-003-01→05) vẫn triển khai đầy đủ ở Phase 1 |
| PS-009 | FR-009-01, FR-009-02 (nhận cảnh báo LPR, tra cứu tự động) | Bắt buộc có luồng nhập tay: CB tự nhập biển số quan sát được → vẫn tra cứu CSDL xe nghi vấn bình thường (FR-009-02 không phụ thuộc camera, chỉ nguồn *đầu vào* biển số mới phụ thuộc) |
| PS-010 | Số liệu "camera phát hiện bao nhiêu sự kiện" trong báo cáo | Bỏ trường này khỏi báo cáo tự động cho đến khi có nguồn camera; không hiển thị số 0 gây hiểu nhầm |

**Nguyên tắc kiến trúc:**
- NFR-CAM-01 (Adapter pattern): Định nghĩa 1 interface "Camera/LPR Data Source" dùng chung cho PS-001/003/009; module nghiệp vụ gọi qua interface, không gọi thẳng API của một hãng camera cụ thể → khi có quyền truy cập chỉ cần viết adapter mới.
- NFR-CAM-02 (Mock data): Cung cấp bộ dữ liệu giả lập (sự kiện, biển số) để phát triển/kiểm thử UI và luồng cảnh báo trong lúc chưa có nguồn thật.
- NFR-CAM-03 (Fallback nhập tay): Mọi FR có nguồn dữ liệu camera đều phải có đường nhập tay tương đương, không được là điều kiện bắt buộc để dùng được tính năng.
- NFR-CAM-04 (Phân kỳ): Các FR phụ thuộc camera đưa vào Phase 2 (sau MVP), không chặn go-live của PS-001/003/009/010.

## 6. Yêu cầu Phi chức năng xuyên suốt Epic (Cross-cutting NFR)

- NFR-X-01 (Bảo mật & phân quyền): RBAC theo cấp độ bí mật dữ liệu — áp dụng nghiêm ngặt nhất cho PS-003 (đối tượng quản lý) và PS-005 (danh tính người tố giác), theo NĐ 13/2023/NĐ-CP.
- NFR-X-02 (Định vị & bản đồ): Toàn bộ dữ liệu có tọa độ (điểm nóng, vụ việc, xe lạ, cơ sở KD) phải dùng chung 1 hệ tọa độ/nền bản đồ (VietGeoX/VBDLIS) để liên thông với PS-001.
- NFR-X-03 (Mobile-first cho hiện trường): PS-005, PS-008, PS-009 đều phát sinh thao tác tại hiện trường → cần app mobile hoạt động ổn định, tối ưu thao tác nhanh.
- NFR-X-04 (Báo cáo tự động lên CA huyện): PS-002, 004, 005(gián tiếp), 006, 010 đều có luồng báo cáo định kỳ lên CA huyện → nên dùng chung 1 engine tổng hợp báo cáo, tránh xây trùng lặp.
- NFR-X-05 (Audit log): Mọi thao tác trên dữ liệu nhạy cảm (003, 004, 005) cần nhật ký truy cập phục vụ thanh tra/kiểm tra tuân thủ.

## 7. Gap đã giải quyết

**Gap 1 — Văn bản pháp lý thay thế Pháp lệnh Công an xã 2008 (PS-001, PS-002, PS-008):** đã xác nhận. Pháp lệnh Công an xã số 06/2008/PL-UBTVQH12 và Thông tư 12/2010/TT-BCA **hết hiệu lực từ 01/7/2024**, thay thế bởi **Luật Lực lượng tham gia bảo vệ an ninh, trật tự ở cơ sở (Luật số 30/2023/QH15)**. Tuy nhiên Luật 30/2023 điều chỉnh lực lượng bán chuyên trách hỗ trợ (kế thừa công an xã bán chuyên trách, bảo vệ dân phố, dân phòng), không phải công an xã chính quy. Nhiệm vụ nắm tình hình/điều hành ANTT của **công an cấp xã chính quy** hiện dựa trên **Luật Công an nhân dân 2018 (sửa đổi, bổ sung 2023)** và văn bản chỉ đạo nghiệp vụ nội bộ ngành (chưa có thông tư công khai thay thế TT 12/2010). Căn cứ pháp lý ở PS-001, PS-002, PS-008 cập nhật thành: *Luật CAND 2018 (sửa đổi 2023) + Luật số 30/2023/QH15 (phần liên quan lực lượng cơ sở phối hợp) — thay cho Pháp lệnh Công an xã 2008/TT 12/2010 đã hết hiệu lực.*

**Gap 2 — Cấp "CA huyện" trong mô hình tổ chức hiện hành:** đã xác nhận có thay đổi cần lưu ý. Từ 01/3/2025, tổ chức Công an đã **bỏ cấp huyện**, chỉ còn 3 cấp: Bộ Công an — Công an cấp tỉnh — Công an cấp xã. Do đó mọi luồng "báo cáo/chuyển hồ sơ lên CA huyện" trong PS-002, 003, 004, 005, 006, 007, 009, 010 về bản chất hiện nay là **báo cáo/chuyển lên Công an cấp tỉnh** (hoặc đầu mối nghiệp vụ tương đương do tỉnh phân công). Khuyến nghị: giữ nguyên nhãn "CA huyện" trong tài liệu vì đây là thuật ngữ nghiệp vụ gốc từ Process Story, nhưng khi thiết kế hệ thống, trường "đơn vị cấp trên nhận báo cáo" phải là **cấu hình được** (không hard-code "huyện"), để đổi tên hiển thị thành "CA tỉnh" hoặc theo mô hình tổ chức từng địa phương mà không cần sửa code.

**Gap 3 — Actor/thông tin nghiệp vụ thiếu ở PS-001, PS-002, PS-008:** giữ nguyên phần đã suy luận trong tài liệu (đã đánh dấu `[BỔ SUNG]`), chấp nhận làm baseline vì không có nguồn nào khác để đối chiếu thêm; rủi ro thấp vì đây là công cụ điều hành nội bộ, không phải TTHC có form pháp lý bắt buộc.

**Gap 4 — Đồng bộ offline khi mất sóng tại hiện trường (PS-008):** chính thức đưa vào làm yêu cầu chuẩn thay vì gap treo — đã có tại NFR-008-05.
