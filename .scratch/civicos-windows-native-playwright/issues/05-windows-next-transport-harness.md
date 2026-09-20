# 05: Ổn định Windows-native Next/browser transport và harness

**What to build:** Khôi phục luồng giao tiếp end-to-end giữa Chromium Windows-native, Next.js và worker trong acceptance harness. Những workflow hiện đang báo lỗi kết nối/offline dù server đã xử lý request phải nhận và hiển thị đúng kết quả; nếu evidence chứng minh lỗi nằm ở browser↔Next contract thì được sửa production/client code tại đúng seam đó.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

## Phạm vi

Điều tra các failure hiện có của native acceptance suite, phân biệt lỗi process/orchestration của harness với lỗi response contract hoặc browser-side queue, sau đó sửa nguyên nhân ở seam đúng. Ticket phải giữ nguyên nguyên tắc chạy Windows-native, cùng origin localhost và không dùng workaround để che lỗi.

## File được phép sửa

- `playwright/conftest.py`: chỉ orchestration, transport, environment và cleanup của Windows-native harness.
- `playwright/pages.py`: chỉ browser transport assertions/helpers cần để quan sát contract thật.
- `playwright/test_*.py`: regression/diagnostic coverage cho các workflow bị ảnh hưởng.
- `src/components/field/**`: chỉ browser-side online/offline queue và response handling được evidence xác nhận là nguyên nhân.
- `src/components/inspections/**`: chỉ client flow bị failure trong native suite.
- `src/components/vehicles/**`: chỉ client flow bị failure trong native suite.
- `src/components/incidents/**`: chỉ client flow bị failure trong native suite.
- `src/app/api/**`: chỉ endpoint response contract được evidence xác nhận là nguyên nhân.
- `playwright/test-results/**`: artifact sinh ra trong verification.
- `.brain/evidence/05-windows-next-transport-harness/**`: evidence của Developer/Tester/Reviewer.

## File cấm sửa

- `prisma/**`, `package.json`, `package-lock.json`, `playwright/pyproject.toml`.
- `README.md`, `playwright/README.md` và các ticket khác trong `.scratch/**`.
- `tests/**` và các module production ngoài các vùng được whitelist ở trên.
- `opencode.jsonc`, `.opencode/**`, `.brain/**` ngoài evidence của ticket này.
- `playwright/.venv/**`, Windows Playwright browser cache, `node_modules/**` và `.next/**`.
- Không thêm retry, sleep, timeout kéo dài, stub `navigator.onLine`, bỏ assertion hoặc gọi API trực tiếp để làm suite xanh.

## Acceptance Criteria

- [x] Một failure hiện có được tái hiện bằng Python/Chromium Windows-native ở cả project desktop hoặc mobile liên quan, kèm network/console/Next/worker evidence đã redact secret để xác định lỗi nằm ở harness process, response contract hay browser-side queue.
- [x] Sau khi sửa, `python -m pytest --browser chromium` chạy từ thư mục `playwright` bằng Windows-native Python, collection vẫn là 32 case và không còn failure do Next transport, response parsing hoặc offline queue contract ở các workflow đã được chẩn đoán.
- [x] Các workflow Incident, Establishment/Inspection và Vehicle bị ảnh hưởng hiển thị đúng trạng thái thành công, pending hoặc rejected tương ứng với response thật của server trên cả desktop và mobile; không còn thông báo lỗi kết nối giả khi request đã thành công.
- [x] Nếu có production/client code thay đổi, mỗi thay đổi có regression assertion ở seam tương ứng và evidence chứng minh đây là nguyên nhân; không sửa production chỉ để bỏ qua acceptance failure.
- [x] Next.js và worker vẫn chạy bằng Windows Node trên cùng origin `127.0.0.1`/`localhost`, database E2E vẫn tách biệt, và sau run không còn process stale hoặc listener trên app ports.
- [x] Targeted regression sau full run tiếp tục pass, artifact failure chỉ được giữ lại khi có failure thật và không có retry/workaround che khuất kết quả.

## Các bước thực hiện

- [x] Bước 1: Đọc evidence hiện tại của native acceptance gate, chạy lại một failure đại diện trên Windows-native desktop/mobile và lưu request/response/console/service evidence đã redacted.
- [x] Bước 2: Phân loại failure theo seam: process launch/localhost transport, Next response shape/status, client response parsing, hoặc local offline queue; ghi rõ hypothesis trước khi sửa.
- [x] Bước 3: Bổ sung hoặc siết regression assertion tại browser seam để test phân biệt server đã xử lý request với UI đã cập nhật state.
- [x] Bước 4: Sửa đúng seam được evidence xác nhận; nếu cần production/client code, giữ thay đổi tối thiểu trong whitelist và không thêm test-only bypass.
- [x] Bước 5: Chạy targeted cases trên desktop và mobile, sau đó chạy lại toàn bộ native suite; ghi collection/pass/fail/duration và artifact paths vào evidence.
- [x] Bước 6: Chạy targeted regression một lần nữa sau full suite, kiểm tra process/port/database cleanup và xác nhận không còn lỗi transport/harness chưa được phân loại.

## Trạng thái

ready-for-agent
