# Tổng hợp pháp lý 5W1H — land-module

- **Ngày tổng hợp:** 2026-09-30
- **Nguồn:** `brain/domains/land/research/law-vn.md` (B2) và `brain/domains/land/research/law-intl.md` (B3).
- **Trạng thái:** Hoàn tất bản tổng hợp; **scope_update đã cập nhật theo phản hồi người dùng và chờ người dùng chốt tại cổng B4**.
- **Phạm vi phân tích:** đăng ký biến động đất đai, tra cứu cho công dân, dữ liệu đất đai, hồ sơ điện tử, dữ liệu cá nhân, phân quyền, liên thông và an toàn thông tin.
- **Quy tắc ưu tiên:** quy định pháp luật Việt Nam là căn cứ bắt buộc; ISO, VGGT và GDPR là khung tham chiếu hoặc chỉ áp dụng theo phạm vi riêng của văn bản đó.

## 1. Tổng hợp 5W1H theo vấn đề

### L1 — Dữ liệu đất đai và Cơ sở dữ liệu quốc gia về đất đai

- **What:** Điều 165 Luật Đất đai liệt kê các nhóm dữ liệu của Cơ sở dữ liệu quốc gia về đất đai; Điều 166 quy định yêu cầu an ninh, an toàn, đầy đủ, chính xác, kịp thời, kết nối và chia sẻ.
- **Why:** Đây là yêu cầu về cấu trúc và vận hành Cơ sở dữ liệu quốc gia về đất đai theo B2, không phải căn cứ để tạo một Cơ sở dữ liệu gốc song song.
- **Who:** Cơ quan quản lý đất đai, cơ quan đăng ký đất đai và người sử dụng đất trong phạm vi khai thác thông tin của mình.
- **When:** Luật Đất đai số 31/2024/QH15 có hiệu lực từ 01/08/2024 theo Luật số 43/2024/QH15.
- **Where:** Hệ thống thông tin đất đai và các cơ sở dữ liệu được kết nối, chia sẻ theo pháp luật Việt Nam.
- **How:** Nghị định 101/2024/NĐ-CP và Thông tư 09/2024/TT-BTNMT là các nguồn về đăng ký, hồ sơ, hệ thống thông tin và cấu trúc dữ liệu; LADM là khung tham chiếu quốc tế về mô hình miền.
- **Bắt buộc:** Khi vận hành thật, tuân thủ cấu trúc, an ninh, cập nhật và kết nối theo Luật Đất đai, Nghị định 101/2024/NĐ-CP và văn bản kỹ thuật áp dụng.
- **Khuyến nghị:** Tham chiếu ISO 19152 LADM để mô hình hóa party, quyền, trách nhiệm, hạn chế, đơn vị không gian và nguồn không gian.
- **Xung đột VN–quốc tế:** Chưa ghi nhận xung đột trực tiếp; LADM không thay thế schema và quy định Việt Nam.
- **Hướng xử lý:** API của các module và cơ chế ghi DB chạy thật trên dữ liệu giả lập; chỉ API kết nối Cơ sở dữ liệu quốc gia là mock. Không đồng bộ vào hệ thống quốc gia thật và không tuyên bố hệ thống demo là Cơ sở dữ liệu quốc gia.
- **Nguồn:** B2 mục 1; B3 mục 1.

### L2 — Thẩm quyền và quy trình chính quyền địa phương hai cấp

- **What:** Nghị định 151/2025/NĐ-CP quy định phân định thẩm quyền trong lĩnh vực đất đai giữa cấp tỉnh và cấp xã; Điều 18 khoản 3 có quy định về chỉnh lý hồ sơ khi thay đổi địa giới hoặc tổ chức chính quyền.
- **Why:** Thẩm quyền và quy trình là dữ liệu pháp lý có thời hạn và có thể thay đổi theo văn bản mới.
- **Who:** UBND, Chủ tịch UBND, cơ quan đất đai cấp tỉnh/cấp xã, cơ quan đăng ký đất đai, cán bộ xử lý hồ sơ và người nộp hồ sơ.
- **When:** Nghị định 151/2025/NĐ-CP có hiệu lực từ 01/07/2025; nguồn B2 ghi nhận thời hạn chuyển tiếp đến trước 01/03/2027.
- **Where:** Cấp tỉnh và cấp xã trong phạm vi Nghị định 151/2025/NĐ-CP.
- **How:** Phân quyền, workflow và biểu mẫu phải gắn với cấu hình thẩm quyền và thời điểm hiệu lực của văn bản.
- **Bắt buộc:** Khi vận hành thật, áp dụng đúng thẩm quyền và quy định chuyển tiếp đang có hiệu lực.
- **Khuyến nghị:** Mô hình hóa thẩm quyền, workflow và biểu mẫu theo phiên bản hiệu lực thay vì gắn cứng một cấp trong mã nguồn.
- **Xung đột VN–quốc tế:** Không có chuẩn quốc tế trong B3 quy định thẩm quyền hành chính Việt Nam; không phát hiện xung đột.
- **Hướng xử lý:** Demo chỉ mô phỏng cấp xã, nhưng giữ trường cấu hình để không khóa cứng mô hình khi phạm vi được mở rộng.
- **Nguồn:** B2 mục 2; B3 không có quy định phân quyền hành chính tương đương.

### L3 — Hồ sơ điện tử, chữ ký điện tử và Giấy chứng nhận điện tử

- **What:** Luật Giao dịch điện tử số 20/2023/QH15 quy định giá trị pháp lý của thông điệp dữ liệu, chữ ký điện tử và giao dịch điện tử của cơ quan nhà nước; Nghị định 101/2024/NĐ-CP bao quát đăng ký và cấp Giấy chứng nhận.
- **Why:** Hồ sơ điện tử và xác thực điện tử là thành phần của quy trình đăng ký đất đai khi triển khai thật.
- **Who:** Cơ quan xử lý hồ sơ, cán bộ, công dân, doanh nghiệp và các chủ thể liên quan đến giao dịch.
- **When:** Luật Giao dịch điện tử có hiệu lực từ 01/07/2024; Nghị định 101/2024/NĐ-CP áp dụng theo điều khoản thi hành của Nghị định.
- **Where:** Quy trình đăng ký đất đai và Hệ thống thông tin đất đai.
- **How:** Dữ liệu, hồ sơ, chữ ký và trạng thái xử lý phải phân biệt giữa bản mô phỏng và giao dịch có giá trị pháp lý.
- **Bắt buộc:** Khi vận hành thật, thực hiện theo Luật Giao dịch điện tử, Nghị định 101/2024/NĐ-CP và yêu cầu xác thực tương ứng.
- **Khuyến nghị:** Với demo, hiển thị rõ trạng thái mô phỏng và không tạo tuyên bố về giá trị pháp lý.
- **Xung đột VN–quốc tế:** GDPR và LADM không quy định giá trị pháp lý của chữ ký hoặc Giấy chứng nhận Việt Nam; không phát hiện xung đột.
- **Hướng xử lý:** Các API và trạng thái hồ sơ được đưa vào scope phải chạy thật và ghi DB thật trên dữ liệu giả lập; chữ ký/GCN mô phỏng, nếu có, phải ghi rõ không có giá trị pháp lý. Dữ liệu demo không được dùng ra quyết định hành chính.
- **Nguồn:** B2 mục 3; B3 không có quy định tương đương về giá trị pháp lý tại Việt Nam.

### L4 — Dữ liệu cá nhân của người sử dụng đất

- **What:** Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 quy định về dữ liệu cá nhân, quyền của chủ thể dữ liệu và trách nhiệm của chủ thể liên quan đến xử lý dữ liệu; Điều 4 được nguồn B2 tóm lược gồm các quyền biết, đồng ý, truy cập, chỉnh sửa, xóa, hạn chế và phản đối theo điều kiện luật định.
- **Why:** Thông tin nhận diện, giấy tờ, địa chỉ và thông tin gắn với cá nhân có thể là dữ liệu cá nhân.
- **Who:** Chủ thể dữ liệu; bên kiểm soát; bên kiểm soát và xử lý; bên xử lý; cơ quan, tổ chức, cá nhân tham gia xử lý.
- **When:** Luật số 91/2025/QH15 có hiệu lực từ 01/01/2026. Nghĩa vụ cụ thể phụ thuộc dữ liệu và hoạt động xử lý thực tế.
- **Where:** Trong lưu trữ, xử lý, hiển thị, chia sẻ và ghi log dữ liệu người sử dụng đất.
- **How:** Luật Việt Nam là căn cứ chính; GDPR Điều 5, 6 và 25 là khung tham chiếu khi điều kiện áp dụng GDPR được thỏa mãn.
- **Bắt buộc:** Khi dùng dữ liệu thật, phải đánh giá và tuân thủ Luật Bảo vệ dữ liệu cá nhân cùng văn bản hướng dẫn áp dụng.
- **Khuyến nghị:** Áp dụng tối thiểu hóa dữ liệu, riêng tư mặc định, giới hạn truy cập và audit log theo nguyên tắc GDPR.
- **Xung đột VN–quốc tế:** Chưa phát hiện xung đột trực tiếp; GDPR không tự thay thế Luật Bảo vệ dữ liệu cá nhân của Việt Nam.
- **Hướng xử lý:** Demo dùng dữ liệu giả lập; không dùng thông tin nhận diện thật, không mở luồng yêu cầu quyền chủ thể ngoài scope đã chốt.
- **Nguồn:** B2 mục 3; B3 mục 3.

### L5 — Phân loại dữ liệu và chia sẻ liên ngành

- **What:** Luật Dữ liệu số 60/2024/QH15 được nguồn B2 ghi nhận có nội dung về phân loại, lưu trữ an toàn, phân quyền truy cập, kết nối và chia sẻ dữ liệu; Điều 166 Luật Đất đai quy định kết nối, chia sẻ Cơ sở dữ liệu quốc gia về đất đai.
- **Why:** Chia sẻ dữ liệu đất đai phải gắn với quyền truy cập, phạm vi dữ liệu và căn cứ pháp lý của bên nhận.
- **Who:** Cơ quan nhà nước, cơ quan đất đai, cơ quan thuế, tổ chức công chứng, tổ chức tín dụng và các chủ thể được pháp luật cho phép.
- **When:** Luật Dữ liệu số 60/2024/QH15 có hiệu lực từ 01/07/2025 theo nguồn B2.
- **Where:** Cơ sở dữ liệu đất đai và các kênh kết nối/chia sẻ liên ngành theo thẩm quyền.
- **How:** Xác định loại dữ liệu, vai trò bên truy cập, mục đích, phạm vi trường dữ liệu và nhật ký truy cập trước khi chia sẻ.
- **Bắt buộc:** Khi triển khai thật, áp dụng phân loại và phân quyền theo Luật Dữ liệu, Luật Đất đai và pháp luật dữ liệu cá nhân.
- **Khuyến nghị:** LADM cung cấp từ vựng về quyền, trách nhiệm và hạn chế; GDPR cung cấp nguyên tắc tối thiểu hóa và giới hạn mục đích.
- **Xung đột VN–quốc tế:** Chưa ghi nhận xung đột trực tiếp; chuẩn quốc tế không mở rộng quyền chia sẻ vượt quá luật Việt Nam.
- **Hướng xử lý:** API nội bộ/module và persistence chạy thật; chỉ API Cơ sở dữ liệu quốc gia là mock. Không kết nối thật tới Cơ sở dữ liệu quốc gia, thuế, công chứng hoặc ngân hàng.
- **Nguồn:** B2 mục 1 và mục 3; B3 mục 1 và mục 3.

### L6 — An toàn thông tin và bảo mật hệ thống

- **What:** Luật Đất đai và Nghị định 101/2024/NĐ-CP có các yêu cầu về an ninh, an toàn của hệ thống thông tin đất đai; ISO/IEC 27001:2022 là tiêu chuẩn về hệ thống quản lý an toàn thông tin.
- **Why:** Dữ liệu đất đai, hồ sơ và dữ liệu cá nhân cần được bảo vệ trong lưu trữ, truyền nhận và truy cập.
- **Who:** Chủ quản hệ thống, đơn vị vận hành, nhà cung cấp dịch vụ, người quản trị và người dùng có quyền truy cập.
- **When:** Nghĩa vụ cụ thể phụ thuộc mô hình triển khai, dữ liệu thật và văn bản chuyên ngành có hiệu lực.
- **Where:** Hạ tầng, ứng dụng, cơ sở dữ liệu, API, thiết bị người dùng, log và bản sao lưu.
- **How:** Việt Nam quy định nghĩa vụ pháp lý; ISO/IEC 27001 cung cấp khung ISMS; các chi tiết cấp độ an toàn mạng chưa được xác nhận đầy đủ trong B2.
- **Bắt buộc:** Khi vận hành thật, xác định và thực hiện nghĩa vụ an toàn thông tin theo luật và văn bản hướng dẫn áp dụng.
- **Khuyến nghị:** Dùng ISO/IEC 27001 làm khung tham chiếu cho quản lý truy cập, thay đổi, nhà cung cấp, giám sát và sao lưu.
- **Xung đột VN–quốc tế:** Không phát hiện xung đột; ISO/IEC 27001 không thay thế yêu cầu pháp luật Việt Nam.
- **Hướng xử lý:** Backend API và DB thật áp dụng baseline bảo mật phù hợp dữ liệu giả lập; không tuyên bố đã đạt cấp độ hoặc chứng nhận an toàn thông tin chính thức.
- **Nguồn:** B2 mục 1 và khoảng trống an ninh mạng; B3 mục 4.

### L7 — Thuê dịch vụ và quyền sở hữu dữ liệu

- **What:** Nghị định 49/2026/NĐ-CP được nguồn B2 ghi nhận bổ sung Điều 64a Nghị định 101/2024/NĐ-CP về thuê dịch vụ công nghệ thông tin vận hành, cập nhật Cơ sở dữ liệu đất đai ở địa phương; quyền sở hữu dữ liệu không thay đổi.
- **Why:** Mô hình thuê dịch vụ tách quyền vận hành khỏi quyền sở hữu dữ liệu.
- **Who:** Địa phương, chủ quản dữ liệu và nhà cung cấp dịch vụ.
- **When:** Nghị định 49/2026/NĐ-CP được nguồn B2 ghi nhận ban hành ngày 31/01/2026.
- **Where:** Mô hình vận hành Cơ sở dữ liệu đất đai ở địa phương.
- **How:** Hợp đồng, quyền truy cập, bảo mật, bàn giao và chấm dứt dịch vụ phải tuân theo văn bản áp dụng.
- **Bắt buộc:** Nếu triển khai thuê dịch vụ thật, quyền sở hữu dữ liệu phải được xác định theo pháp luật và hợp đồng áp dụng.
- **Khuyến nghị:** ISO/IEC 27001 có thể làm khung tham chiếu khi đánh giá nhà cung cấp và dịch vụ.
- **Xung đột VN–quốc tế:** Không phát hiện xung đột trực tiếp.
- **Hướng xử lý:** Ngoài scope demo; không chọn nhà cung cấp cloud hoặc mô hình thuê dịch vụ trong vòng này.
- **Nguồn:** B2 mục 3; B3 mục 4.

### L8 — Thay đổi pháp luật và phiên bản quy tắc

- **What:** B2 ghi nhận thời hạn chuyển tiếp của Nghị định 151/2025/NĐ-CP, các khoảng trống về văn bản hướng dẫn an ninh mạng, phí khai thác và chia sẻ dữ liệu; LADM Edition II đã thay thế phiên bản LADM 2012 bị rút trạng thái.
- **Why:** Văn bản, thẩm quyền, schema kỹ thuật và tiêu chuẩn có thể thay đổi theo thời gian.
- **Who:** Chủ quản sản phẩm, cơ quan quản lý, đơn vị vận hành và người chịu trách nhiệm cập nhật pháp lý.
- **When:** Các mốc hiệu lực và thời hạn chuyển tiếp được nêu trong B2; tiêu chuẩn LADM mới có các năm xuất bản 2024–2025.
- **Where:** Cấu hình thẩm quyền, workflow, biểu mẫu, schema, API và tài liệu tuân thủ.
- **How:** Theo dõi phiên bản văn bản, ngày hiệu lực và thay đổi schema; ghi nhận khoảng trống thay vì coi nguồn chưa xác minh là căn cứ bắt buộc.
- **Bắt buộc:** Khi vận hành thật, chỉ áp dụng văn bản đã xác minh và còn hiệu lực.
- **Khuyến nghị:** Tách cấu hình quy tắc và phiên bản dữ liệu khỏi logic cố định; duy trì nhật ký thay đổi pháp lý.
- **Xung đột VN–quốc tế:** Không phát hiện xung đột; việc LADM 2012 bị rút không làm thay đổi hiệu lực của luật Việt Nam.
- **Hướng xử lý:** Demo ghi rõ ngày dữ liệu và trạng thái mô phỏng; các thay đổi pháp lý được đưa vào backlog xác minh trước khi mở rộng phạm vi.
- **Nguồn:** B2 khoảng trống tra cứu và mục 2; B3 mục 1.

## 2. Yêu cầu bắt buộc, khuyến nghị và rủi ro

### Yêu cầu bắt buộc khi dùng dữ liệu thật hoặc vận hành thật

1. Tuân thủ cấu trúc, cập nhật, an ninh, an toàn và quyền khai thác dữ liệu theo Luật Đất đai, Nghị định 101/2024/NĐ-CP và văn bản kỹ thuật có hiệu lực.
2. Áp dụng đúng thẩm quyền, quy trình và thời hạn chuyển tiếp theo văn bản đất đai hiện hành.
3. Tuân thủ quy định về hồ sơ điện tử, chữ ký điện tử, dữ liệu, dữ liệu cá nhân và phân quyền truy cập.
4. Xác định nghĩa vụ an toàn thông tin và mô hình sở hữu dữ liệu trước khi kết nối hoặc thuê dịch vụ thật.

### Khuyến nghị từ khung quốc tế

1. Dùng ISO 19152 LADM làm từ vựng tham chiếu cho bên liên quan, quyền, trách nhiệm, hạn chế, đơn vị không gian và nguồn không gian.
2. Dùng nguyên tắc GDPR về tối thiểu hóa, giới hạn mục đích và bảo vệ dữ liệu ngay từ thiết kế như chuẩn tham chiếu bổ sung.
3. Dùng ISO/IEC 27001:2022 làm khung tham chiếu cho ISMS và kiểm soát an toàn thông tin.
4. Dùng VGGT làm khung tham chiếu về minh bạch, tham vấn và quyền sử dụng đất hợp pháp.

### Rủi ro tuân thủ cần theo dõi

1. Áp dụng nhầm văn bản hoặc mốc hiệu lực chưa được đối chiếu bản gốc.
2. Cấu hình cứng thẩm quyền, biểu mẫu hoặc workflow trong khi Nghị định 151/2025/NĐ-CP có thời hạn chuyển tiếp.
3. Dùng dữ liệu cá nhân thật trong demo hoặc hiển thị rộng hơn quyền truy cập được phép.
4. Kết nối hệ thống thật hoặc tạo dữ liệu gốc song song ngoài phạm vi demo.
5. Gọi kết quả mô phỏng là hồ sơ, chữ ký hoặc Giấy chứng nhận có giá trị pháp lý.
6. Mở rộng sang thuê dịch vụ, chia sẻ liên ngành hoặc xác định cấp độ an toàn thông tin khi chưa có thiết kế và căn cứ pháp lý tương ứng.

## 3. Scope update chờ người dùng chốt tại cổng B4

Các quyết định dưới đây đã được ghi trong hồ sơ research hiện có và được đưa vào bản tổng hợp để người dùng xác nhận lại:

- **Mục đích:** demo kỹ thuật, không vận hành nhà nước thật; API module, cơ chế nghiệp vụ và DB chạy thật trên dữ liệu giả lập.
- **Địa bàn:** một xã.
- **Dữ liệu:** dữ liệu giả lập; API module, cơ chế nghiệp vụ và ghi DB hoạt động thật; không dùng kết quả để ra quyết định hành chính.
- **Chức năng lõi:** đăng ký biến động đất đai và tra cứu cho công dân; các API thuộc scope phải xử lý thật và ghi được bản ghi vào DB thật.
- **Vai trò module:** lớp nghiệp vụ kết nối Cơ sở dữ liệu quốc gia về đất đai bằng mock API; đây là ngoại lệ mock duy nhất trong các API kết nối đã nêu.
- **Đối tượng:** cán bộ xã, công dân và lãnh đạo xã.
- **Mô hình triển khai:** không áp dụng thuê dịch vụ trong demo.
- **Ngoài phạm vi vòng này:** kết nối thật với Cơ sở dữ liệu quốc gia, thuế, công chứng, ngân hàng; dữ liệu cá nhân thật; quyết định hành chính; vận hành cloud/thuê dịch vụ; xác định cấp độ an toàn thông tin chính thức; mở rộng sang thanh tra, quy hoạch, định giá đất.
- **Điều kiện quay lại:** nếu chuyển sang dữ liệu thật, kết nối Cơ sở dữ liệu quốc gia thật hoặc triển khai production, phải rà soát lại các mục L4–L7 và các khoảng trống B2 trước khi xây dựng.
- **Cập nhật theo phản hồi người dùng ngày 2026-09-30:** loại bỏ giả định "mọi API đều mock"; giữ mock duy nhất cho API Cơ sở dữ liệu quốc gia, còn module/API/persistence nội bộ phải chạy thật trên DB thật với dữ liệu giả lập.

## 4. Cổng B4

- **Sản phẩm:** bản tổng hợp 5W1H và scope update trong file này.
- **Cần người dùng chốt:** phạm vi demo ở mục 3 có đúng không.
- **Nếu chốt:** bước tiếp theo là B4.5 — thiết kế database; chưa thực hiện B4.5 trong lượt này.
