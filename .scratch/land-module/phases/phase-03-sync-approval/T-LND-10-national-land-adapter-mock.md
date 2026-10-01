# LND-10 — NationalLandAdapter mock

- **Ticket ID:** LND-10
- **Status:** done
- **V6 effective status:** done
- **V3 status:** needs-triage
- **Blocked by:** LND-06, LND-08
- **Loại:** feature
- **Lane:** full
- **Gate hướng:** có
- **File được phép sửa:** `src/modules/land/**`, `tests/land/**`
- **File cấm sửa:** `.env`, `.brain/**`, `docs/design/**`, `docs/research/**`
- **Demo path:** Adapter local trả fixture success/failure cho application review, không gọi network.
- **Shared commit:** `e81c252`
- **Evidence:** `.brain/evidence/LND-10/{changes,tests,review,files-changed,digest}.md`

## Mô tả

Tạo boundary `NationalLandAdapter` mock local, chuẩn hóa success/failure, fixture configuration và exception mapping; không có network/secret/endpoint thật.

## Các bước thực hiện

- [x] Tạo `NationalLandAdapter` interface và mock implementation.
- [x] Chuẩn hóa request/response success/failure.
- [x] Chọn fixture từ test/server configuration, không nhận client outcome.
- [x] Map exception thành failure fixture và viết adapter tests.

## Acceptance Criteria

- [x] Given request hợp lệ, When adapter fixture success, Then response có `succeeded`, remote reference và `simulated=true`.
- [x] Given fixture failure, When adapter được gọi, Then response có `failed`/failureCode và không có network call.

## Test-skeleton

- AC-01: mock request + success fixture → `status=succeeded`, `remoteReference` non-null.
- AC-02: failure fixture/adapter exception → `status=failed`, failureCode non-null, network spy count 0.

## Rubric bắt buộc

- [x] Adapter boundary đúng ADR-0001; không tạo secret/endpoint quốc gia thật.

## Traceability

- Design: `integration-contracts.md#mock-adapter-cơ-sở-dữ-liệu-quốc-gia-về-đất-đai`; ADR-0001.
- Review: `.brain/evidence/LND-10/review.md` — `REVIEW-PASS`.
- Verification: `.brain/evidence/LND-10/tests.md` — focused adapter suite and scoped checks PASS.

## V6 reconciliation

- Effective `done` dùng ticket review/evidence và shared commit `e81c252`; LND-11/12/13 behavior không được suy diễn đã hoàn tất.
