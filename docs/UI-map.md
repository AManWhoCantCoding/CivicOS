# CivicOS — Đường đi trên giao diện

> Tài liệu này mô tả CivicOS theo cách người dùng nhìn thấy và thao tác trên
> màn hình: **đang ở đâu → bấm gì → đi đến đâu → làm bước tiếp theo**.

### Một vài từ thường gặp

- **Incident**: một vụ việc cần theo dõi và xử lý.
- **Assignment**: việc được giao cho một người hoặc một đơn vị.
- **Evidence**: ảnh, tài liệu hoặc bằng chứng gắn vào hồ sơ.
- **Approval**: yêu cầu chờ người có thẩm quyền phê duyệt.
- **Registry**: danh sách phương tiện cần theo dõi.

## 1. Sơ đồ ngắn gọn

```text
Đăng nhập
  → Trung tâm điều hành
  → Chọn một phân hệ
  → Xem danh sách hồ sơ / bản ghi
  → Bấm vào một bản ghi để mở chi tiết
  → Thực hiện nút đang được hiển thị
  → Quay lại danh sách hoặc về Trung tâm
```

Các nút thao tác có thể khác nhau tùy giai đoạn xử lý và quyền của tài khoản.
Nếu một nút không xuất hiện, thường là tài khoản chưa được giao đúng nhiệm vụ
hoặc không có quyền thực hiện bước đó.

## 2. Bắt đầu từ màn hình đăng nhập

1. Mở CivicOS và nhập **Email** cùng **Mật khẩu**.
2. Bấm `Đăng nhập`.
3. Hệ thống đưa người dùng vào **Trung tâm điều hành**.
4. Tại đây có ba thẻ công việc chính:
   - `01 / Incident` — **Hàng đợi vụ việc**;
   - `02 / Inspection` — **Cơ sở kinh doanh**;
   - `03 / Field` — **Phương tiện hiện trường**.
5. Bấm `Mở phân hệ →` trên thẻ muốn làm.

Ngoài ba thẻ chính, khu vực **Identity / Assignment** có nút `Mở
Assignment` để xem và quản lý việc phân công.

## 3. Cách đi lại trên các màn hình

### Trên máy tính

- Menu phân hệ nằm bên trái.
- Bấm `Thu gọn` hoặc `Mở rộng` để thay đổi kích thước menu.
- Bấm tên một mục trong menu để chuyển sang khu vực đó.
- Dòng điều hướng phía trên luôn có `Trung tâm`; bấm vào đó để quay về trang
  chính.
- Tên phân hệ trong dòng điều hướng đưa người dùng về màn hình chính của phân
  hệ đó.

### Trên màn hình nhỏ

- Bấm `Menu` để mở danh sách chức năng.
- Bấm `Đóng điều hướng` hoặc vùng bên ngoài để đóng menu.
- Chọn một mục trong menu sẽ mở màn hình tương ứng.

### Quy tắc chung khi bấm

- Bấm vào một **dòng hồ sơ**, **thẻ cơ sở**, **biển số** hoặc **mã thửa** để
  mở màn hình chi tiết.
- Bộ lọc, ô tìm kiếm, checkbox và nút `Thử lại` thường chỉ làm mới màn hình
  hiện tại; chúng không mở màn hình mới.
- Nút `Quay lại`, `Về hàng đợi` hoặc mũi tên `←` đưa người dùng về danh sách
  trước đó.
- `Đăng xuất` kết thúc phiên làm việc và đưa về màn hình đăng nhập.

## 4. Các công việc chính

### 4.1. Tiếp nhận tin báo và xử lý Incident

#### Đường đi để ghi nhận tin báo mới

```text
Trung tâm điều hành
  → thẻ `01 / Incident`
  → `Mở phân hệ →`
  → `Ghi nhận tin báo`
  → điền biểu mẫu
  → `Ghi nhận tin báo`
```

Trong biểu mẫu, người dùng nhập:

- `Kênh tiếp nhận`;
- `Thời điểm tiếp nhận`;
- `Nội dung tin báo`;
- vị trí nếu có;
- tên và thông tin liên hệ của nguồn tin nếu cần.

Sau khi bấm `Ghi nhận tin báo`, hệ thống mở **chi tiết tin báo**. Tin báo lúc
này **chưa phải Incident**.

#### Đường đi từ tin báo đến Incident

Trên màn hình chi tiết, hệ thống đưa ra các bước theo thứ tự xử lý:

1. Chọn phân loại và ghi chú, bấm `Lưu xác minh (không tạo Incident)`.
2. Ghi kết quả, bấm `Lưu kết quả xử lý`.
3. Bấm `Xác nhận hồ sơ` để xác nhận quyết định xử lý.
4. Khi đã xác nhận, bấm `Tạo Incident` nếu tin báo cần trở thành một vụ việc.
5. Nếu tin báo không hợp lệ, nhập lý do và bấm `Từ chối`.
6. Nếu đã xử lý xong mà không tạo Incident, bấm `Đóng hồ sơ`.
7. Nếu vượt thẩm quyền, chọn đơn vị nhận rồi bấm `Chuyển đơn vị (Trưởng CA)`.

Khi Incident đã được tạo, chi tiết tin báo hiển thị liên kết đến Incident. Bấm
vào mã Incident để mở hồ sơ vụ việc.

#### Đường đi để xử lý một Incident đã có

```text
`Hàng đợi Incident`
  → bấm vào dòng vụ việc
  → màn hình chi tiết Incident
```

Trong chi tiết Incident, người dùng xử lý theo trạng thái đang có:

1. Chọn loại và mức độ, bấm `Lưu phân loại`.
2. Nhập ghi chú, bấm `Bắt đầu xác minh`.
3. Nhập kết quả, bấm `Gửi đề xuất kết quả`.
4. Nếu cần chuyển cấp, chọn đơn vị và bấm `Gửi yêu cầu chuyển`.
5. Nếu đã đủ điều kiện đóng, bấm `Gửi yêu cầu đóng Incident`.
6. Người có quyền quyết định sẽ thấy `Phê duyệt` và `Từ chối` để xử lý yêu
   cầu đang chờ.

Không phải tất cả nút xuất hiện cùng lúc. Nút hiện ra theo trạng thái hiện tại,
Assignment và quyền của người đang đăng nhập.

#### Đường đi để phân công

```text
Trung tâm điều hành → `Mở Assignment`
```

Hoặc từ hàng đợi Incident, bấm `Assignment`. Tại màn hình Assignment:

- bấm `Tạo Assignment` để giao việc;
- bấm `Thu hồi Assignment` để mở phần thu hồi;
- bấm `Xác nhận thu hồi` để hoàn tất;
- bấm `Huỷ` nếu không muốn thay đổi.

### 4.2. Quản lý cơ sở và lịch kiểm tra

#### Tạo một cơ sở kinh doanh

```text
Trung tâm điều hành
  → thẻ `02 / Inspection`
  → `Mở phân hệ →`
  → màn hình `Danh mục cơ sở`
  → biểu mẫu `Thêm cơ sở kinh doanh`
  → `Tạo cơ sở`
```

Người dùng nhập tên cơ sở, chủ cơ sở, địa chỉ, loại hình, mức Risk và tọa độ
nếu có. Khi muốn sửa cơ sở, mở thẻ cơ sở rồi bấm `Chỉnh sửa cơ sở`; sau đó bấm
`Lưu thay đổi`.

#### Lập lịch kiểm tra

Ngay trong khu vực `Lịch kiểm tra`:

1. Chọn cơ sở.
2. Chọn `Thời gian kiểm tra`.
3. Chọn chu kỳ, ví dụ `Mỗi 6 tháng`.
4. Chọn người được giao nếu cần.
5. Bấm `Tạo lịch kiểm tra`.

Danh sách lịch có thể lọc bằng `Tất cả`, `Quá hạn` hoặc `Sắp tới`. Bấm tên cơ
sở trong một lịch để mở **chi tiết kiểm tra**.

#### Thực hiện một lần kiểm tra

```text
`Lịch kiểm tra`
  → bấm tên cơ sở trong lịch
  → `Bắt đầu kiểm tra`
  → điền checklist
  → `Lưu checklist`
  → chọn kết quả hoàn tất
  → `Hoàn tất`
```

Sau đó, nếu có phát hiện hoặc đề xuất xử lý, người dùng tiếp tục ghi nhận
finding, recommendation và bằng chứng ngay trên màn hình chi tiết.

### 4.3. Ghi nhận phương tiện ngoài hiện trường

#### Ghi nhận nhanh

```text
Trung tâm điều hành
  → thẻ `03 / Field`
  → `Mở phân hệ →`
  → biểu mẫu ghi nhận phương tiện
```

Các bước chính:

1. Nhập biển số và mô tả.
2. Nhập vĩ độ, kinh độ hoặc bấm `Lấy vị trí hiện tại`.
3. Bấm `Ghi nhận phương tiện`.
4. Nếu cần, mở `Mở chi tiết quan sát →` để gắn ảnh bằng chứng.

Nếu đang mất mạng, bản ghi được giữ trong hàng đợi chờ đồng bộ. Bấm `Xem hàng
đợi offline` để xem các bản ghi chưa gửi được.

#### Xác minh một quan sát

```text
`Danh sách hiện trường`
  → bấm vào biển số
  → chi tiết quan sát
  → xác nhận match nếu có
  → biểu mẫu `Xác minh quan sát`
  → gửi kết quả và bằng chứng
```

Tại đây người dùng có thể:

- xác nhận phương tiện khớp với Registry;
- ghi kết quả xác minh, ghi chú và vị trí;
- gắn ảnh bằng chứng;
- chuyển quan sát sang đơn vị khác khi cần.

### 4.4. Tra cứu cư dân và lập báo cáo

```text
Đường dẫn trực tiếp → `Danh sách cư dân đặc biệt`
  → lọc danh sách nếu cần
  → bấm vào một người
  → màn hình chi tiết cư dân
```

Từ chi tiết cư dân:

- bấm một record để xem record đó;
- bấm `Tạo báo cáo tháng` để mở khu vực báo cáo;
- quay lại bằng `← Danh sách cư dân`.

Trong `Báo cáo tháng cư dân`, người có quyền có thể bấm:

- `Phê duyệt` để duyệt báo cáo;
- `Gửi cấp trên` để chuyển báo cáo lên cấp trên;
- `Thử lại` nếu danh sách không tải được.

### 4.5. Xem bản đồ và thông tin thửa đất

#### Từ danh sách thửa đất sang bản đồ

```text
Menu → `Thửa đất · Chủ thể`
  → lọc theo trạng thái, xã hoặc mã thửa
  → bấm mã thửa để xem chi tiết
  → `Xem trên bản đồ`
```

Trên bản đồ, người dùng có thể bật/tắt các lớp dữ liệu, tìm thửa đất và bấm
`Mở chi tiết thửa` để quay lại thông tin chi tiết. `Quay lại danh sách thửa`
đưa về danh sách ban đầu.

#### Tạo và xử lý hồ sơ biến động

```text
Menu → `Hồ sơ biến động`
  → `Tạo hồ sơ`
  → chọn loại biến động và điền biểu mẫu
  → `Gửi hồ sơ`
  → màn hình chi tiết hồ sơ
```

Trong biểu mẫu, người dùng chọn loại như chuyển nhượng, cập nhật thông tin,
thế chấp hoặc tách/gộp thửa. Sau khi gửi thành công, hệ thống mở ngay chi tiết
hồ sơ.

Trên chi tiết hồ sơ:

- cán bộ xử lý bấm `Đồng bộ mô phỏng` hoặc `Thử lại` khi hồ sơ cần xử lý lại;
- người có quyền duyệt bấm `Duyệt`;
- nếu trả lại, bấm `Từ chối`, nhập lý do, rồi bấm `Xác nhận từ chối`;
- bấm `Đóng` để đóng phần nhập lý do mà không gửi.

#### Tra cứu đất đai công khai

Màn hình tra cứu công khai cho phép chọn `Mã hồ sơ` hoặc `Mã thửa`, nhập mã và
thực hiện tra cứu. Kết quả hiển thị ngay trên cùng màn hình; đây là đường tra
cứu riêng, không đi qua menu nội bộ.

## 5. Cách thao tác trên điện thoại

Sau khi đăng nhập, thanh nút ở cuối màn hình có:

`Map` · `RelatedInfo` · `Alarms` · `Dispatches` · `Tasks` · `Incident` ·
`Đất đai` · `Settings` · `Đăng xuất`

### Xem thông tin liên quan trên bản đồ

```text
`Map`
  → chạm một điểm hoặc lớp dữ liệu
  → `RelatedInfo`
  → chạm một dòng để xem chi tiết
  → `Mở trên bản đồ` nếu muốn quay lại vị trí đó
```

Trong `RelatedInfo`, người dùng có thể `Tìm kiếm`, bấm `Bộ lọc`, chọn nhóm
`ALL`, `RESIDENT`, `BUSINESS`, `HOTSPOT` hoặc `VIOLATION`, rồi bấm `Tải thêm`.

### Xử lý cảnh báo, điều phối và nhiệm vụ

Ba màn hình `Alarms`, `Dispatches` và `Tasks` đều đi theo một cách:

```text
Chọn một dòng
  → xem chi tiết
  → bấm nút liên kết tài nguyên
  → đi đến Incident, RelatedInfo hoặc Map tùy loại dữ liệu
```

- Trong `Alarms`, nút là `Mở liên kết tài nguyên`.
- Trong `Dispatches` và `Tasks`, nút là `Mở bản đồ/RelatedInfo`.
- Bấm `‹ Quay lại` để trở về danh sách.

### Tra cứu đất đai trên điện thoại

```text
`Đất đai`
  → chọn `Mã hồ sơ` hoặc `Mã thửa`
  → nhập mã
  → `Tra cứu`
  → xem tóm tắt hồ sơ, thửa và lịch sử xử lý
  → `Xem trên bản đồ`
```

### Xem một Incident trên điện thoại

Khi mở Incident từ một cảnh báo, điều phối hoặc nhiệm vụ, màn hình Incident chỉ
hiển thị thông tin đọc. Bấm `Mở trên bản đồ` để xem vị trí liên quan.

## 6. Khi không thấy nút hoặc thao tác bị lỗi

- Không thấy một mục trong menu: tài khoản có thể chưa có quyền hoặc chưa được
  giao nhiệm vụ tương ứng.
- Danh sách không tải được: bấm `Thử tải lại`.
- Đang offline: dữ liệu đã nhập có thể được giữ lại; các thao tác cần máy chủ
  sẽ chờ đến khi có mạng.
- Màn hình chi tiết báo không được phép xem: quay lại danh sách và làm việc
  trong phạm vi hồ sơ được giao.
- Muốn bỏ thao tác đang nhập: bấm `Huỷ`, `Đóng` hoặc quay lại danh sách; dữ
  liệu chưa gửi sẽ không thay đổi hồ sơ.

## 7. Ví dụ trọn vẹn: từ cuộc gọi đến một Incident

```text
Đăng nhập
  → Trung tâm điều hành
  → 01 / Incident
  → Mở phân hệ →
  → Ghi nhận tin báo
  → nhập nội dung cuộc gọi
  → Ghi nhận tin báo
  → Lưu xác minh (không tạo Incident)
  → Lưu kết quả xử lý
  → Xác nhận hồ sơ
  → Tạo Incident
  → Lưu phân loại
  → Bắt đầu xác minh
  → Gửi đề xuất kết quả
  → Phê duyệt
  → Gửi yêu cầu đóng Incident
```

Điểm quan trọng: **tin báo**, **Incident**, **Assignment**, **Evidence** và
**Approval** là các bước khác nhau trên giao diện. Người dùng chỉ đi tiếp khi
nút của bước đó xuất hiện và tài khoản có quyền thực hiện.

## 8. Nguồn đối chiếu cho đội phát triển

Click map này được đối chiếu với các màn hình runtime trong:

- `src/app/page.tsx` và `src/components/navigation/feature-registry.ts`;
- `src/components/shell/ModuleShell.tsx`;
- `src/components/incidents/`;
- `src/components/inspections/`;
- `src/components/vehicles/`;
- `src/components/residents/`;
- `src/components/land/` và `src/components/map/`;
- `mobile/src/navigation/AppNavigator.tsx` và `mobile/src/features/`.
