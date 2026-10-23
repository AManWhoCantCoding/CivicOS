# Law / Compliance Summary — `ui-auto-demo`

## Kết luận phạm vi hiện tại

Chưa có yêu cầu pháp lý riêng được người dùng nêu cho capability này. Đây là
control trình diễn giao diện, không phải một nghiệp vụ mới và không được trở
thành kênh nhập liệu công khai hoặc cơ chế cấp quyền.

## Ràng buộc phải giữ

- Chỉ dùng dữ liệu synthetic/masked trong demo; không đưa PII thật, secret,
  token hoặc raw payload vào narrator, log hay accessibility text.
- Không dùng nút demo để vượt qua session, role, Assignment, OrganizationUnit,
  masking, audit hoặc server authorization.
- Không diễn giải `simulated`, map fallback hoặc mobile read-only như dữ liệu
  pháp lý/kết nối quốc gia thật.

## Trạng thái

`NO_SEPARATE_LEGAL_DECISION` trong phạm vi hiện tại. Nếu người dùng muốn chạy
trên dữ liệu thật, tự động đăng nhập bằng tài khoản thật, hoặc trình diễn public
lookup như nguồn pháp lý, phải mở lại contract/compliance review trước khi thiết
kế.
