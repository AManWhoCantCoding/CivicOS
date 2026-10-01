# LND-01 — Migration tám bảng land + PostGIS + role seed

- **Ticket ID:** LND-01
- **Status:** done
- **V6 effective status:** done
- **V3 status:** done
- **Blocked by:** không
- **Loại:** feature
- **Lane:** full
- **Gate hướng:** có
- **File được phép sửa:** `prisma/schema.prisma`, `prisma/migrations/**`, `docker-compose.yml`, `scripts/demo/**`, `tests/**`
- **File cấm sửa:** `.env`, `.brain/**`, `docs/design/**`, `docs/research/**`
- **Demo path:** Database test có PostGIS, tám bảng land, role land và seed tối thiểu.
- **Commit:** `ea72f7f` (`feat(land): add LND-01 foundation migration`)
- **Evidence:** `.brain/evidence/LND-01/{changes,tests,review,files-changed}.md`

## Mô tả

Dựng nền database land additive với PostGIS, constraint/index, role seed và dữ liệu demo idempotent; chưa tạo API/service/UI.

## Các bước thực hiện

- [x] Bổ sung schema tám bảng đúng `data-model.md`.
- [x] Cập nhật PostgreSQL image/extension PostGIS.
- [x] Tạo migration additive với FK/CHECK/unique/index/GiST.
- [x] Upsert ba role land và seed dữ liệu demo không PII.
- [x] Chạy migration/schema tests.

## Acceptance Criteria

- [x] Given PostgreSQL có PostGIS, When chạy migration, Then tám bảng land và geometry `Polygon,4326` tồn tại.
- [x] Given migration đã chạy, When kiểm tra schema, Then FK nghiệp vụ là `RESTRICT`, unique/index/CHECK theo `data-model.md`.
- [x] Given database chưa có role land, When chạy seed, Then có `land_officer`, `commune_leader`, `citizen` và không xóa role hiện có.

## Test-skeleton

- AC-01: database test + migration → tám bảng, PostGIS và GiST index tồn tại.
- AC-02: insert parent delete có child → bị `RESTRICT`; share/area invalid → bị CHECK.
- AC-03: seed chạy hai lần → role không duplicate, dữ liệu không có PII thật.

## Rubric bắt buộc

- [x] Schema/migration chỉ tham chiếu `data-model.md`; không sửa migration đã chạy; test rollback/constraint có bằng chứng.

## Traceability

- Design: `data-model.md#8-migration`, `integration-contracts.md#postgresql--postgis`, ADR-0001.
- Review: `.brain/evidence/LND-01/review.md` — PASS.
- Targeted verification: `.brain/evidence/LND-01/tests.md:66-75` — DB 20/20, typecheck/lint/format scoped PASS.

## V6 reconciliation

- Effective `done` giữ nguyên V3 status; commit và review độc lập đủ điều kiện đóng.
- Full baseline run có lỗi ngoài ticket được giữ trong evidence, không thay đổi trạng thái ticket-level.
