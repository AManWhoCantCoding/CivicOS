# Yêu cầu phi chức năng presentation: `civicos-ui-design-system`

Tài liệu này chỉ ghi các yêu cầu phi chức năng đã xuất hiện trong token,
prototype, test scenarios và ticket đã duyệt. Không đặt SLO, retention,
telemetry, security policy hoặc UX requirement mới.

## Tính nhất quán visual

- Web và mobile dùng đúng Light/Blue token values, system typography,
  monospace, spacing, radius, focus và semantic colors trong
  `.scratch/civicos-ui-design-system/ui/design-tokens.md` §§24–81.
- Mọi semantic state giữ text/icon/copy; không phụ thuộc màu duy nhất và
  không dùng gradient, neon, glow hoặc màu đen tuyệt đối.
- Nhãn `internal / simulated` và copy mô phỏng hiển thị gần surface liên quan;
  không dùng wording `official`, `certified` hoặc claim pháp lý.
- Visual reference chỉ là Stitch catalog đã approved tại
  `.scratch/civicos-ui-design-system/ui/stitch-screens.md` §§3–21.

## Accessibility và interaction

- Focus-visible dùng token `--civicos-focus` `#1D4ED8` và control chính có
  kích thước tối thiểu `44px`; mobile touch target tối thiểu `44 × 44px`.
- Loading, empty, error/conflict, forbidden/masked, stale, offline và
  simulated phải có state copy/text/icon theo artifact đã duyệt.
- Map selection, retry, back và detail actions giữ accessible name/status và
  alternative text/status surface đã có; không tạo control mới.
- Kiểm tra được thực hiện/đối chiếu theo TS-01–TS-11 và CUI-004 ở viewport
  web `1440 × 900`, mobile `390 × 844`.

## Privacy và boundary presentation

- UI tiếp tục tôn trọng identity masking, permission-aware fields, Assignment,
  map projection allowlist và safe error copy hiện có; không lộ PII, raw payload,
  sync/storage key hoặc geometry ngoài boundary.
- Forbidden, out-of-scope, provider/geometry failure và offline không được
  render polygon cũ/cache hoặc xác nhận existence ngoài scope.
- Dữ liệu mô phỏng không được trình bày như dữ liệu official/certified; không
  tạo public claim hoặc thay đổi legal meaning.

## Khả dụng và offline presentation

- Skeleton giữ kích thước tương ứng với nội dung; error/retry/reload dùng state
  surface và retry boundary đã có.
- Offline hiển thị banner/copy đã duyệt và không fake success mutation. Land
  polygon không được lưu hoặc render từ offline cache theo boundary hiện có.
- Provider/basemap availability không phải bằng chứng projection/land data đã
  sẵn sàng; presentation phải giữ state failure hiện có.

## Tương thích và phạm vi vận hành

- API paths, method, request/response/error contracts, route destinations,
  permissions, Assignment, masking, state machines, schema/migrations, seed,
  map projection và Stitch catalog không đổi; xem `api-contract.md` §§7–26,
  `data-model.md` §§7–30 và `overview.md` §§19–29.
- Không có yêu cầu hiệu năng, latency budget, availability SLO, retention,
  logging, audit schema hoặc metrics mới được tạo bởi feature này. Các policy
  hiện có tiếp tục áp dụng.
- CUI-001–CUI-004 là boundary triển khai/verification; thay đổi vượt boundary
  phải mở review mới, không được hợp thức hóa bằng một yêu cầu phi chức năng.

## Traceability

| Nhóm                                 | Nguồn                                                                                |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| Token và state presentation          | `ui/design-tokens.md` §§24–95                                                        |
| Flow/state và accessibility review   | `ui/prototype.md` §§46–100; `ui/test-scenarios.md` TS-01–TS-11                       |
| Canonical visual evidence            | `ui/stitch-screens.md` §§3–21, §§32–46                                               |
| API/data compatibility               | `api-contract.md` §§7–26; `data-model.md` §§7–30                                     |
| Implementation/verification boundary | CUI-001, CUI-002, CUI-003, CUI-004 trong `.scratch/civicos-ui-design-system/phases/` |
