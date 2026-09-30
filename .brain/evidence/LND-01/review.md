# Review — LND-01

## Phạm vi chấm

- Gate theo quy ước người dùng xác nhận: chỉ kiểm tra file/test thuộc ticket LND-01.
- `node scripts/check-scope.mjs diff .scratch/land-module/phases/phase-01-foundation-access.md land-module`: PASS.
- `docs/design/land-module/LOCK.json`: PASS; thiết kế không bị thay đổi.
- Targeted evidence: `.brain/evidence/LND-01/tests.md:66-75`; hai test file DB chạy `20/20`, không skip.
- Lần chạy `scope=full` run 9 có format baseline ngoài ticket làm dừng trước test; không dùng lỗi đó để đánh rớt LND-01 theo gate ticket-scope mới.

## Acceptance Criteria

| ID AC | Mức độ đáp ứng | File & Dòng Code | Test Case chứng minh |
|---|---|---|---|
| AC-01 | PASS | `docker-compose.yml:1-11`; `prisma/migrations/20260930000000_lnd01_land_foundation/migration.sql:4-36,307-319`; `prisma/schema.prisma:548-566` | `tests/land/lnd01-land-foundation.test.ts:54-63,163-180`; DB targeted `13/13` tại `tests.md:71` |
| AC-02 | PASS | `prisma/migrations/20260930000000_lnd01_land_foundation/migration.sql:121-329`; `prisma/schema.prisma:598-680` | `tests/land/lnd01-land-foundation.test.ts:65-97,182-297,335-368`; targeted tổng `20/20` tại `tests.md:71` |
| AC-03 | PASS | `prisma/migrations/20260930000000_lnd01_land_foundation/migration.sql:331-334`; `scripts/demo/seed-land.ts:17-90` | `tests/land/lnd01-land-foundation.test.ts:99-109,129-140,299-333`; seed hai lần và counts `1/1/1/1` tại `tests.md:72` |

## Rubric

| Trục Rubric | Mức độ đáp ứng | Đối chiếu với | Bằng chứng |
|---|---|---|---|
| Schema/migration chỉ tham chiếu `data-model.md` | PASS | `docs/design/land-module/data-model.md:42-263` | 8 model/migration additive, PostGIS, FK `RESTRICT`, CHECK, unique/index/GiST tại `schema.prisma:531-680` và `migration.sql:4-334`; không sửa migration cũ |
| Rollback/constraint có bằng chứng | PASS | Ticket LND-01 dòng 55; `data-model.md:255-276` | `tests/land/lnd01-land-foundation.test.ts:142-150,182-368`; rollback chỉ chạm 8 bảng và transaction rollback được kiểm tra |
| API/route | Không áp dụng | LND-01 là foundation DB, không có route | `plan.md:57-63` ghi rõ không tạo route |
| Thiết kế/UI | Không áp dụng | Ticket không có UI | Không có file UI hoặc component trong diff |

## Đối chiếu thiết kế đã khóa

- Endpoint/route/mã lỗi: Không áp dụng; ticket không tạo API.
- Bảng/cột: 8 bảng đúng thứ tự và tên tại `data-model.md:255-263`; migration tạo đúng 8 bảng.
- Geometry: `Polygon,4326` và GiST khớp `data-model.md:75,258`.
- Module/trạng thái: Không tạo module/service/API; role land và seed khớp `data-model.md:20-21,260`.
- ADR: geometry dùng `Unsupported` + SQL seam; schema/migration không thêm adapter hoặc public surface.

## Round-trip check

### Bước 1 — Suy ngược từ diff và test, trước khi mở lại ticket

Yêu cầu nghiệp vụ suy ngược: xây nền persistence land additive cho một xã demo — PostgreSQL có PostGIS, tám bảng land với polygon WGS84, lịch sử không bị xóa nhờ FK `RESTRICT`, constraint/index/GiST bảo vệ toàn vẹn, ba role land được upsert, seed giả lập không PII và chạy lặp không tạo duplicate; chỉ làm foundation DB, chưa làm API/service/UI.

### Bước 2 — So khớp ticket gốc sau đó

Ticket LND-01 yêu cầu đúng migration tám bảng + PostGIS + role seed, các constraint/index/GiST, seed `land_officer`/`commune_leader`/`citizen`, và migration/schema tests; đồng thời không yêu cầu API/service/UI. Hai mô tả khớp.

### Kết luận

PASS theo gate ticket-scope đã được người dùng điều chỉnh.

## Commit

- `ea72f7f` — `feat(land): add LND-01 foundation migration`
