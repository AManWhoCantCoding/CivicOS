# Trạng thái kiến trúc hiện tại (AS-IS)

> **Bản snapshot code-derived, không phải yêu cầu/phê duyệt/chứng nhận production.**
> Mọi nội dung dưới đây được suy ra **trực tiếp từ source code** tại nhánh hiện hành, baseline commit
> `567380b3c6fea42d359a99d41a8fe4e60134ffa9`, ngày chụp **2026-10-28**. Đây mô tả những gì code đang làm,
> chứ không mô tả yêu cầu tương lai, không phải tài liệu nghiệm thu, và không xác nhận sẵn sàng vận hành thật.
>
> Thư mục `docs/architecture/design-canon/` (2026-10-23) là tổng hợp thiết kế, **không** được cập nhật theo baseline này và không bị thay thế bởi bộ tài liệu này.
>
> Giới hạn quan trọng lặp lại trong toàn bộ bộ tài liệu: đây là hệ thống **local/demo** (xem `README.md` gốc),
> **chưa có dữ liệu production**, seed chỉ là dữ liệu synthetic; lớp projection thửa đất trên bản đồ và public land lookup
> trả `simulated: true`. Provider style/tile nền là TileServer GL được cấu hình riêng nhưng chưa kiểm tra runtime;
> adapter "cơ sở dữ liệu quốc gia" là **mock không gọi mạng**, adapter camera là **fixture**.
> Điều hướng web chỉ là **lọc hiển thị**, quyền thực tế được server enforce.

## Bộ tài liệu và thứ tự đọc đề nghị

| # | Tài liệu | Nội dung | Nên đọc khi |
|---|----------|----------|-------------|
| 1 | [c4.md](c4.md) | C4 Level 1 (System Context), Level 2 (Container), Level 3 (Component) | Muốn nhìn tổng thể kiến trúc trước |
| 2 | [business-flows.md](business-flows.md) | Luồng nghiệp vụ chính (tin báo → incident, kiểm tra, phương tiện, cư dân, đất đai) | Muốn hiểu nghiệp vụ chạy trong code |
| 3 | [screen-flows.md](screen-flows.md) | Luồng màn hình web và mobile | Muốn biết user nhìn thấy gì và đi đâu |
| 4 | [deployment.md](deployment.md) | Topology triển khai local (repository-backed), giới hạn | Muốn chạy hoặc hiểu cách hệ thống dựng local |
| 5 | [data-model.md](data-model.md) | Thiết kế dữ liệu Prisma + PostGIS, quan hệ | Muốn hiểu dữ liệu được lưu trữ |
| 6 | [module-status.md](module-status.md) | Mô tả module/nghiệp vụ + trạng thái triển khai theo bằng chứng code | Muốn biết cái gì đã code, cái gì mô phỏng |
| 7 | [interfaces-apis.md](interfaces-apis.md) | Danh mục API route (Next.js) theo method và seam nội bộ | Muốn tích hợp hoặc audit interface |

Thứ tự đọc khuyến nghị: **c4 → module-status → business-flows → data-model → interfaces-apis → screen-flows → deployment**.
Người đọc lần đầu chỉ cần: `c4.md` → `module-status.md` → phần giới hạn ở đầu trang này.

## Quy ước chung

- **Nhãn trạng thái bằng chứng** (dùng thống nhất trong `module-status.md`):
  - *Có luồng code* — code tham chiếu đầy đủ từ route → service → persistence.
  - *Một phần/giới hạn* — có code nhưng phạm vi bị giới hạn có chủ đích.
  - *Mô phỏng* — adapter/trả về dữ liệu mô phỏng, không phải tích hợp thật.
  - *Chưa đủ bằng chứng* — hiện diện trong source nhưng chưa được kiểm chứng runtime trong snapshot này.
- **Không xác nhận runtime:** snapshot này không chạy app/worker/test; trạng thái dựa trên đọc code; sự hiện diện của test definitions (`tests/**`) chỉ có nghĩa là "test đã được định nghĩa", không phải "đã chạy qua nghiệm thu".
- Tất cả đường dẫn source được trích "path[:line-range]" để đối chiếu trực tiếp với baseline branch.
