---
title: CivicOS — Land và bản đồ thửa đất
status: draft
owner: project
created: 2026-10-23
updated: 2026-10-23
sources:
  - ../../../docs/land-module/overview.md
  - ../../../docs/land-module/data-model.md
  - ../../../docs/land-module/api-contract.md
  - ../../../docs/land-module/LOCK.json
  - ../../../docs/land-parcel-map/overview.md
  - ../../../docs/land-parcel-map/LOCK.json
  - ../../../brain/adr/0001-land-module-boundaries.md
  - ../../../brain/adr/0002-land-parcel-map-projection-boundary.md
  - ../../../brain/domains/land/research/law-summary.md
  - ../../../brain/domains/land/research/law-vn.md
  - ../../../brain/domains/land/research/law-intl.md
  - ../../../.scratch/land-module/workflow-status.md
  - ../../../.scratch/land-parcel-map/workflow-status.md
---

# CivicOS — Land và bản đồ thửa đất

## Trạng thái

- `land-module`: design có `LOCK.json`; workflow ghi B6/B9 đã qua, B11 implementation/phase gates hoàn tất và B12 đang chờ human review. Workflow cũng ghi một bất nhất giữa `data-model.md` và lock; Git status ngày 23/10 cho thấy nhiều land design/lock files đã sửa sẵn. Tài liệu này không xác minh lock integrity.
- `land-parcel-map`: workflow ghi B9 approved, P0/P1 được phân biệt, B11 phase gates và B12 accepted; `LOCK.json` tồn tại. Không chạy kiểm tra lock trong lượt tổng hợp.
- Các trạng thái trên được chép theo workflow artifacts hiện có, không phải kiểm tra mới hoặc xác nhận rằng source runtime chưa đổi.

## Bounded context và aggregate

Land là miền riêng, không phải phần mở rộng của generic E1 map hoặc role policy.

- `LandChangeApplication` điều phối vòng đời hồ sơ biến động.
- `LandRight`, `LandParcel` và `LandEncumbrance` chỉ được cập nhật khi application chuyển sang `completed`, trong cùng transaction với `EventRecord` và `AuditEvent` theo ADR-0001.
- Kết nối Cơ sở dữ liệu quốc gia về đất đai là adapter mock; module không tạo nguồn dữ liệu quốc gia song song và không nhận outcome mock do client quyết định.
- Geometry thửa nội bộ dùng PostGIS Polygon SRID 4326, qua SQL parameterized seam; public projection không trả polygon.
- Dữ liệu demo là synthetic; `simulated`/`internal` không được diễn giải thành tính pháp lý, chứng nhận hoặc dữ liệu chính thức.

## Năng lực trong contract land-module

| Slice           | Contract đã ghi nhận                                                                                                              |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Party/parcel    | CRUD nội bộ có policy OU/Assignment; party nhạy cảm được mã hóa; không hard-delete                                                |
| Application     | Tạo/đọc hồ sơ biến động; idempotency và version precondition; các loại nghiệp vụ được liệt kê trong API/data-model contract       |
| National sync   | Mock đồng bộ có `requestKey`, attempt tracking và retry; lỗi không được làm mutation land dở dang                                 |
| Review/approval | `commune_leader` xử lý theo Land contract; chỉ trạng thái `completed` áp dụng thay đổi land                                       |
| Public lookup   | Tìm bằng đúng một mã hồ sơ hoặc mã thửa; trả projection tối thiểu, `simulated: true`, không trả PII/polygon/Evidence/sync payload |
| Evidence        | Internal nested routes theo contract; MIME/size allowlist, hash/provenance, không lộ storage key                                  |
| Mobile          | Contract land ghi read-only; không upload Evidence, không mutation và không public polygon trên mobile                            |

Chi tiết state, schema, API errors, versioning, pagination và edge cases nằm trong bộ `docs/land-module/`; bảng này chỉ định hướng, không thay thế contract locked.

## Parcel map projection

ADR-0002 tách land map projection khỏi `/api/map/markers`:

- Server dùng Land access policy hiện hành; không suy quyền từ role map cũ.
- P0 tập trung parcel được chọn; web/mobile dùng projection scoped chung và read-only.
- Map chỉ trả allowlist tối thiểu gồm identity nghiệp vụ cần focus, status, geometry 4326, freshness và cờ mô phỏng; không trả party, address, rights, Evidence, payload sync hoặc audit payload.
- P0 không cache LandParcel polygon offline. Basemap cache không cho phép tái sử dụng polygon cũ.
- Public lookup không được dùng làm nguồn polygon; public/citizen map, geometry edit và tuyên bố ranh giới pháp lý nằm ngoài scope.
- P1 discovery được mô tả riêng trong `docs/land-parcel-map/overview.md`; filter/bbox/cursor/overflow rules phải kiểm tra đúng lock/ticket trước khi dùng.

## Căn cứ và giới hạn research

Research Land ưu tiên văn bản Việt Nam; ISO LADM/VGGT/GDPR/ISO 27001 chỉ là tham chiếu theo phạm vi được ghi, không tự tạo nghĩa vụ pháp lý tại Việt Nam. Research hiện ghi các nguồn chính như Luật Đất đai 31/2024/QH15 và sửa đổi 43/2024/QH15, Nghị định 101/2024/NĐ-CP, 151/2025/NĐ-CP, Luật Giao dịch điện tử, Luật Dữ liệu và Luật Bảo vệ dữ liệu cá nhân.

`law-vn.md` và `law-summary.md` liệt kê các khoảng trống: một số điều khoản, văn bản kỹ thuật, phí, quy định an ninh mạng/chia sẻ dữ liệu và văn bản mới chưa được đối chiếu toàn văn. Vì vậy không dùng bản tổng hợp này để tuyên bố tuân thủ, chốt thẩm quyền hiện hành hoặc triển khai trên dữ liệu thật. Research summary còn giữ status “chờ B4” trong khi workflow Land ghi B4 đã qua; đây là discrepancy cần giữ rõ, không âm thầm sửa.

## Nguồn thực thi

- Design/API/data model: `docs/land-module/` và `docs/land-parcel-map/`.
- Quyết định: `brain/adr/0001-land-module-boundaries.md`, `brain/adr/0002-land-parcel-map-projection-boundary.md`.
- Nghiên cứu: `brain/domains/land/research/`.
- Tiến độ/evidence: `.scratch/land-module/`, `.scratch/land-parcel-map/`, `.brain/evidence/`.
