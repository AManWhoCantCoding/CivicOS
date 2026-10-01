# LND-03 — Parcel detail rights/encumbrances projection

- **Ticket ID:** LND-03
- **Status:** done
- **V6 effective status:** done
- **V3 status:** needs-triage
- **Blocked by:** LND-01, LND-02
- **Loại:** feature
- **Lane:** full
- **Gate hướng:** có
- **File được phép sửa:** `src/modules/land/**`, `src/app/api/land/parcels/[parcelId]/**`, `tests/land/**`
- **File cấm sửa:** `.env`, `.brain/**`, `docs/design/**`, `prisma/schema.prisma`
- **Demo path:** Internal actor mở parcel detail và đọc rights/encumbrances summary, không có mutation trực tiếp.
- **Shared commit:** `e81c252`
- **Evidence:** shared implementation/test batch; Phase 02 full gate `.brain/evidence/phase-02/gate.md`.

## Mô tả

Expose parcel detail projection gồm parcel, rights và encumbrances theo scope; không tạo direct mutation endpoint.

## Các bước thực hiện

- [x] Tạo query projection cho parcel detail.
- [x] Join right/encumbrance theo nullable/active history contract.
- [x] Áp dụng OrganizationUnit/Assignment policy.
- [x] Tạo route GET parcel detail và audit read.
- [x] Viết projection/privacy tests.

## Acceptance Criteria

- [x] Given parcel có right active và encumbrance released, When GET detail đúng scope, Then response có hai summary đúng kiểu/nullable.
- [x] Given actor ngoài scope, When GET detail, Then `403 LAND_FORBIDDEN` và không trả geometry/rights/encumbrances.
- [x] Given response detail, When kiểm tra JSON, Then không có direct mutation command hoặc plaintext identity.

## Test-skeleton

- AC-01: parcel + right + released encumbrance → `rights.length=1`, `encumbrances[0].status=released`.
- AC-02: other OU → HTTP 403, body không chứa `parcel`.
- AC-03: detail response → có `geometry`, không có ciphertext/direct mutation field.

## Rubric bắt buộc

- [x] Projection chỉ dùng fields đã lock trong `api-contract.md`; không thêm endpoint/bảng.

## Traceability

- Design: `api-contract.md#get-apilandparcelsparcelid`; DR-14, DR-22.
- Implementation/test: shared commit `e81c252`.
- Phase verification: `.brain/evidence/phase-02/gate.md` — full land/land-ui gate PASS.

## V6 reconciliation

- Effective `done` được reconcile theo source/test trong shared commit và full phase gate theo option 2.
- Không có thư mục evidence riêng LND-03; đây là thiếu artifact phân mục, không phải lý do hạ status sau khi user cho phép dùng shared batch/phase gate.
