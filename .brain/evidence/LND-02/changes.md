# Evidence LND-02 — Party/parcel service và API

- Mục tiêu: dựng service + API tạo/list LandParty và LandParcel cho land_officer/commune_leader cùng OrganizationUnit theo api-contract đã khóa.
- File được phép sửa: src/modules/land/**, src/app/api/land/parties/**, src/app/api/land/parcels/route.ts, tests/land/**.
- AC chính: POST parties 201 active chỉ trả identityNumberMasked; POST parcels 201 version 1 nationalRecordRef null; ngoài scope 403 LAND_FORBIDDEN không lộ dữ liệu.
- Rubric: response khớp api-contract; không trả ciphertext/storage internals; geometry SQL parameterized.
- Gate read_sensitive cho displayName fail-closed; cấp capability thuộc LND-04 nên parties hiện 403 cho role land.

## File đã sửa (lần thực thi này)

- `src/modules/land/schemas.ts`: tạo mới parse Party/Parcel/list query, DecimalString, cursor opaque base64url.
- `src/modules/land/errors.ts`: tạo mới toLandApiError map sang LAND_* tiếng Việt theo api-contract.
- `src/modules/land/parcel-geometry.ts`: tạo mới validate Polygon/vòng khép/đủ điểm, serialize GeoJSON, parse ST_AsGeoJSON.
- `src/modules/land/access.ts`: tạo mới requireLandActor role string + OU scope, assertCanViewPartySensitive qua canViewSensitive read-only, auditLandEvent best-effort không PII.
- `src/modules/land/party-repository.ts`: tạo mới CRUD LandParty ciphertext/blind-index, list scope OU qua link rights/applications, P2002 sang DUPLICATE_CODE.
- `src/modules/land/party-service.ts`: tạo mới createParty/listParties, maskIdentityNumber giữ 4 ký tự cuối, resolveDisplayName sau gate, mapper Party 8 field.
- `src/modules/land/parcel-repository.ts`: tạo mới insert/list parcel bằng $queryRaw/$executeRaw parameterized với ST_SetSRID(ST_GeomFromGeoJSON) và ST_AsGeoJSON, map P2010 duplicate/check sang DUPLICATE_CODE/GEOMETRY_INVALID.
- `src/modules/land/parcel-service.ts`: tạo mới createParcel/listParcels, validate areaSqm DecimalString > 0, toDecimalString/toParcelResponse đủ field contract.
- `src/modules/land/index.ts`: tạo mới public surface hẹp service + error mapper, che repository/geometry internals.
- `src/app/api/land/parties/route.ts`: tạo mới GET list cursor + POST 201 shape { items, nextCursor } / { party }, catch sang LAND_*.
- `src/app/api/land/parcels/route.ts`: tạo mới GET list cursor + POST 201 shape { items, nextCursor } / { parcel }, catch sang LAND_*.
- `tests/land/lnd02-party-parcel.test.ts`: tạo mới test pure mask/validate/error-map/scope/gate cộng DB-gated ciphertext/geometry/duplicate/isolation/pagination và case thiếu read_sensitive 403 không tạo row.

## Vòng sửa lỗi nội bộ

- Chạy `npx prettier --write` trên đúng 7 file ticket bị format:check gắn cờ (schemas, parcel-geometry, party-repository, party-service, parcel-repository, parcel-service, lnd02-party-parcel.test.ts); không chạm file ngoài ticket.
- `check-scope.mjs` với phase file báo nhầm 11 file mới do script chỉ đọc allowlist của ticket đầu tiên (LND-01); kiểm tra lại với section LND-02 trích ra temp cho kết quả phạm vi và route khớp thiết kế + ticket.
- Test `tests/demo/demo-now-invalid.test.ts` fail ngoài phạm vi (chỉ import scripts/demo/seed, không liên quan land); không sửa, để Mentor xử lý.

## Vòng sửa lỗi LND-02 (lần 3, theo digest lần 2)

- `src/modules/land/parcel-repository.ts`: sinh `id` bằng `randomUUID` (stdlib, theo precedent `src/modules/incidents/commands.ts` cho PK `@default(cuid())`) và đưa `"id"` vào `INSERT` parameterized; bổ sung `"createdAt", "updatedAt"` bằng `NOW()` vì migration `LandParcel.updatedAt TIMESTAMP NOT NULL` không có DB default (Prisma `@updatedAt` chỉ chạy qua client, raw SQL bypass); mở rộng map lỗi raw `P2010` thêm `23505`/`already exists` sang `DUPLICATE_CODE` và `23514` sang `GEOMETRY_INVALID`, giữ nguyên validation geometry và mapping cũ.
- Không chạm test; suite `tests/land/lnd02-party-parcel.test.ts` hiện dùng làm regression (25 test).

## Vòng sửa lỗi LND-02 (theo digest lần 5: UUID thay Cuid)

- `src/modules/land/parcel-repository.ts`: bỏ `randomUUID`, thêm `createParcelId()` dùng `randomBytes(12)` stdlib trả `c` + 24 hex (25 ký tự, khớp Cuid contract `api-contract.md:19,32`, `data-model.md:50,66`, Prisma `@default(cuid())`); giữ nguyên INSERT parameterized và timestamps `NOW()`, giữ map lỗi `23505`/`already exists` sang `DUPLICATE_CODE` và `23514` sang `GEOMETRY_INVALID`.
- `tests/land/lnd02-party-parcel.test.ts`: thêm test DB-gated `creates parcel ids in Cuid contract format` assert `/^c[a-z0-9]+$/` và không chứa `-`; test đỏ với UUID (`920dd191-...`), xanh với Cuid (TDD).
- Không chạm schema/migration/identity/design/.env; không sửa baseline `format:check` 96 file và `tests/demo/demo-now-invalid.test.ts`.

## Điểm không có trong thiết kế

không có

## Vòng sửa theo gov-code-review — 2026-09-30

- `src/modules/land/access.ts`: audit land nhận chung `Prisma.TransactionClient` và propagate lỗi thay vì nuốt lỗi.
- `src/modules/land/party-repository.ts` và `src/modules/land/parcel-repository.ts`: nhận transaction client; parcel đọc lại row trong cùng transaction.
- `src/modules/land/party-service.ts` và `src/modules/land/parcel-service.ts`: bọc create/list cùng `recordAudit` trong transaction để audit failure rollback/propagate theo DR-19.
- `tests/land/lnd02-party-parcel.test.ts`: thêm regression cho audit rollback, audit failure propagation và audit evidence.
