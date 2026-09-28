# 00: Clear toàn bộ `civicos_demo` an toàn

- **Status:** done
- **Blocked by:** không
- **Loại:** feature
- **Gate hướng:** có
- **File được phép sửa:**
  - `scripts/demo/demo-db.ts`
  - `scripts/demo/reset.ts`
  - `src/modules/platform/evidence/**` (chỉ helper cleanup được gọi bởi demo reset)
  - `tests/demo/**`
  - `tests/integration/**` (chỉ test reset/target isolation)
  - `README.md` (chỉ command/guard contract)
  - `storage/evidence/**` (chỉ file synthetic do test tạo; không commit binary)
- **File cấm sửa:**
  - `.env`, `.env.*`, secrets, CI/CD và permission policy
  - `storage/tiles/**`
  - database `civicos`
  - business UI/domain behavior không cần cho reset

## Mô tả

Thay reset hiện tại bằng destructive reset có whitelist đủ mọi bảng ứng dụng, gồm identity/reference, business, eventing, projection, session và Evidence physical file của namespace `civicos-demo`. Guard phải chặn mọi target khác `civicos_demo` trước khi mở Prisma connection.

## Acceptance Criteria

- [x] **AC-00-01:** Given `DATABASE_URL` hoặc `DEMO_DATABASE_URL` trỏ tới `civicos` hoặc database bất kỳ khác `civicos_demo`, When chạy reset, Then command trả `DEMO_RESET_REFUSED` trước khi import Prisma và không thay đổi row nào.
- [x] **AC-00-02:** Given `civicos_demo` có row trong `Role`, `User`, `UserRole`, `OrganizationUnit`, `Session` và mọi bảng business/derived, When chạy `DEMO_RESET_CONFIRM=1 npm run demo:reset`, Then count của mọi model ứng dụng bằng `0`, còn `_prisma_migrations` và schema vẫn tồn tại.
- [x] **AC-00-03:** Given `Evidence` demo có `metadata.demoNamespace = "civicos-demo"` và file vật lý tồn tại, đồng thời có một Evidence/file không mang marker và một file dưới `storage/tiles/`, When reset thành công, Then chỉ file Evidence demo bị xóa; file ngoài namespace và tile file vẫn tồn tại.
- [x] **AC-00-04:** Given snapshot read-only của `civicos` trước reset, When reset `civicos_demo` thành công, Then snapshot row count và một bản ghi sentinel trong `civicos` giữ nguyên.
- [x] **AC-00-05:** Given `civicos_demo` đã rỗng, When chạy reset lần thứ hai với confirmation, Then command exit `0`, không phát sinh row/file mới và log target vẫn là `civicos_demo`.

## Rubric

### Bắt buộc

- [ ] Reset đủ ownership theo `.scratch/demo-seed-complete/spec.md#quy-tắc-clear-và-test-isolation`.
- [ ] Guard target chạy trước dynamic import Prisma, giữ contract `DEMO_RESET_REFUSED` và `DEMO_RESET_CONFIRM_REQUIRED`.
- [ ] Không xóa tile asset hoặc Evidence không thuộc namespace demo.
- [ ] Test chứng minh database `civicos` không bị chạm.

### Khuyến nghị

| Trục | Mô tả kỳ vọng | Thang điểm | Ngưỡng tối thiểu |
|---|---|---:|---:|
| Quy trình | Log rõ target, confirmation và số nhóm bảng/file đã dọn | 0–2 | 1 |
| An toàn | Whitelist table/file, không dùng target do user input chưa validate | 0–2 | 2 |

## Các bước thực hiện

- [x] Liệt kê đầy đủ model Prisma vào reset inventory, bao gồm identity, `Session`, `IntakeCommand`, các bảng `Subject*`, `ResidentMonthlyReport` và toàn bộ event/projection.
- [x] Tách bước thu thập Evidence demo theo `metadata.demoNamespace` và gọi `LocalEvidenceStorage.remove` trước khi truncate row.
- [x] Giữ guard `civicos_demo` và confirmation trước khi mở Prisma; không sửa `.env`.
- [x] Thực hiện truncate trong một flow deterministic, `RESTART IDENTITY CASCADE`, không đụng database `civicos`.
- [x] Viết test đỏ cho target sai/thiếu confirmation, full clear, physical file ownership và database isolation; sau đó triển khai tối thiểu để test xanh.
- [x] Cập nhật command/runbook trong `README.md` và trả summary count trước/sau reset.

## Đang chờ Research

Không.

## Trạng thái cuối

done — Reviewer PASS; test scoped của ticket PASS; full E2E sẽ chạy sau khi ticket 00–08 hoàn tất.
