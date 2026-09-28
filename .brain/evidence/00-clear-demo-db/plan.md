# Kế hoạch — 00-clear-demo-db

## 1. File dự định sửa/tạo

Chỉ các file trong whitelist của ticket:

- `scripts/demo/demo-db.ts` — sửa resolver target để chọn raw URL theo precedence `DEMO_DATABASE_URL` rồi `DATABASE_URL`, không rewrite database name và validate chính URL được chọn trước khi bind/import.
- `scripts/demo/reset.ts` — sửa guard reset, inventory toàn bộ model ứng dụng, cleanup Evidence và flow truncate.
- `src/modules/platform/evidence/storage-adapter.ts` — thêm helper cleanup tối thiểu để chỉ gọi `LocalEvidenceStorage.remove` với relative storage key đã resolve containment dưới `storage/evidence`.
- `tests/demo/demo-bootstrap.test.ts` — bổ sung/điều chỉnh test contract cho raw URL precedence, reset target, confirmation và boundary dynamic import.
- `tests/integration/demo-seed-reset.integration.test.ts` — tạo test integration theo test skeleton hiện có cho full clear, Evidence physical ownership, target isolation và repeat reset.
- `README.md` — cập nhật command/guard contract, inventory không giữ nhầm identity và quy tắc Evidence/tile.

Không sửa `prisma/schema.prisma`, migration, `.env*`, `storage/tiles/**` hoặc UI/domain behavior. `storage/evidence/**` chỉ được test tạo file synthetic runtime, không đưa binary vào diff.

## 2. Hàm/interface sẽ đổi

- `scripts/demo/reset.ts`
   - `resolveResetTarget`: chọn raw URL theo precedence `DEMO_DATABASE_URL` rồi `DATABASE_URL`; không tự biến URL đang trỏ `civicos`/database khác thành `civicos_demo`; parse và gọi `assertDemoTarget` trên chính URL được chọn.
  - `requireResetConfirm`: giữ contract `DEMO_RESET_CONFIRM=1` hoặc `--confirm`, lỗi `DEMO_RESET_CONFIRM_REQUIRED` trước thao tác phá hủy.
  - `resetDemo`: giữ thứ tự resolve/validate → log target → confirmation → bind target vào `process.env.DATABASE_URL` → dynamic import Prisma; thêm thu thập Evidence demo, cleanup physical file, truncate inventory và summary trước/sau.
   - `BUSINESS_TABLES` (đổi tên hoặc mở rộng inventory tương ứng): whitelist chính xác đủ 31 model ứng dụng từ schema: `Assignment`, `OutboxMessage`, `EventRecord`, `ProjectionCheckpoint`, `ProjectionRecord`, `AuditEvent`, `Evidence`, `SlaInstance`, `Notification`, `OfflineCommand`, `IntakeReport`, `IntakeCommand`, `Incident`, `Approval`, `Establishment`, `ChecklistTemplate`, `Inspection`, `InspectionFinding`, `EnforcementRecommendation`, `SuspiciousVehicleEntry`, `VehicleObservation`, `VehicleVerification`, `SubjectManagementActivity`, `SubjectManagementRecord`, `Subject`, `ResidentMonthlyReport`, `Session`, `UserRole`, `Role`, `User`, `OrganizationUnit`; không gồm `_prisma_migrations` hoặc schema.
  - helper nội bộ `collectDemoEvidence`/`countApplicationRows` nếu cần để tách rõ bước query marker và summary; chỉ nhận bảng/key từ constant whitelist, không nhận table name tùy ý từ user input.
- `src/modules/platform/evidence/storage-adapter.ts`
   - thêm helper cleanup batch tối thiểu: chỉ nhận relative `storageKey`, reject absolute path, `..` traversal và mọi key resolve out-of-root; chỉ sau containment dưới `storage/evidence` mới gọi `LocalEvidenceStorage.remove` (giữ xử lý idempotent `ENOENT` hiện có). Helper không tự quét thư mục và không chạm `storage/tiles`.
- `tests/demo/demo-bootstrap.test.ts`
   - bổ sung assertion resolver từ chối URL `civicos`/`civicos_demo_shadow`, không rewrite fallback, ưu tiên `DEMO_DATABASE_URL` và vẫn từ chối khi biến ưu tiên sai dù `DATABASE_URL` đúng; giữ confirmation contract và không bind/mở Prisma khi guard thất bại.
- `tests/integration/demo-seed-reset.integration.test.ts`
   - thêm fixture/query helpers chỉ trong test để tạo row synthetic theo đủ 31 model, snapshot database `civicos`, tạo Evidence marker hợp lệ, marker có absolute/`..`/out-of-root key, non-marker sentinel và tile sentinel; các assertion bám AC-00-01..05, trong đó key không hợp lệ không được chuyển tới `LocalEvidenceStorage.remove`.
- `README.md`
  - sửa hướng dẫn reset để yêu cầu target explicit `civicos_demo`, confirmation, nêu full application-row clear, Evidence namespace cleanup và giữ tile/`civicos`.

## 3. Luồng xử lý chi tiết

1. Chọn raw target URL theo precedence `DEMO_DATABASE_URL` nếu biến này được cung cấp, nếu không dùng `DATABASE_URL`; tuyệt đối không rewrite path/database name của URL fallback. Parse và validate chính URL được chọn, từ chối mọi tên khác `civicos_demo` bằng `DEMO_RESET_REFUSED`. Không static-import Prisma/domain trước bước này. Test riêng trường hợp `DEMO_DATABASE_URL` sai nhưng `DATABASE_URL` đúng phải vẫn bị từ chối.
2. Kiểm tra confirmation (`DEMO_RESET_CONFIRM=1` hoặc `--confirm`). Nếu thiếu, trả `DEMO_RESET_CONFIRM_REQUIRED` và không mở connection.
3. Log URL đã sanitize, database name và confirmation; gán URL đã validate vào `process.env.DATABASE_URL`, sau đó mới `await import('@/lib/prisma')`.
4. Query các row `Evidence` có `metadata.demoNamespace = "civicos-demo"`, chỉ lấy `storageKey`; không quét/xóa toàn bộ thư mục và không coi Evidence thiếu marker là file demo.
5. Trước khi gọi `LocalEvidenceStorage.remove`, helper phải nhận key tương đối, reject absolute path và mọi `..` traversal, resolve candidate rồi kiểm tra containment thật sự dưới `storage/evidence`; key absolute/traversal/out-of-root không được gọi remove. Sau đó gọi helper batch cho các key marker hợp lệ **trước** khi truncate row. File không thuộc namespace và mọi path dưới `storage/tiles/**` không nằm trong danh sách nên giữ nguyên.
6. Dùng một câu `TRUNCATE TABLE` được dựng từ constant inventory đã whitelist, `RESTART IDENTITY CASCADE`, deterministic. Inventory chính xác đủ 31 model gồm: `Assignment`, `OutboxMessage`, `EventRecord`, `ProjectionCheckpoint`, `ProjectionRecord`, `AuditEvent`, `Evidence`, `SlaInstance`, `Notification`, `OfflineCommand`, `IntakeReport`, `IntakeCommand`, `Incident`, `Approval`, `Establishment`, `ChecklistTemplate`, `Inspection`, `InspectionFinding`, `EnforcementRecommendation`, `SuspiciousVehicleEntry`, `VehicleObservation`, `VehicleVerification`, `SubjectManagementActivity`, `SubjectManagementRecord`, `Subject`, `ResidentMonthlyReport`, `Session`, `UserRole`, `Role`, `User`, `OrganizationUnit`. `_prisma_migrations` và schema luôn ngoài whitelist.
7. Log summary count trước/sau theo nhóm bảng/file; bảng `_prisma_migrations` và schema không nằm trong truncate. Chạy lại trên database rỗng phải là no-op, exit `0`, không tạo row/file.
8. Integration tests dùng database test được cấu hình riêng cho test; target isolation test chỉ đọc snapshot/sentinel của `civicos` và reset target `civicos_demo`, không gửi mutation tới `civicos`. Test physical file tạo synthetic runtime rồi cleanup trong teardown.

## 4. Mapping thay đổi dự kiến với Acceptance Criteria

| Thay đổi/luồng | AC phục vụ | Đối chiếu cụ thể |
|---|---|---|
| Raw URL precedence + `resolveResetTarget` chấp nhận đúng database name `civicos_demo`, từ chối `civicos` và target khác; guard chạy trước dynamic import | AC-00-01; Rubric bắt buộc dòng 38; Rubric An toàn | Chứng minh `DEMO_DATABASE_URL` được ưu tiên, không rewrite URL; trường hợp biến ưu tiên sai dù `DATABASE_URL` đúng vẫn trả `DEMO_RESET_REFUSED`, Prisma import không xảy ra và row `civicos` không đổi. |
| `requireResetConfirm` giữ `DEMO_RESET_CONFIRM_REQUIRED` và chạy trước connection/destructive query | AC-00-01 (contract guard); Rubric dòng 38; bước 55 | Khóa thao tác phá hủy khi thiếu confirmation; test unit và integration dùng đúng mã lỗi. |
| Bind URL đã validate trước dynamic import Prisma | AC-00-01, AC-00-04; Rubric dòng 38, 40; bước 53 | Ngăn Prisma singleton lấy nhầm `DATABASE_URL` ambient và bảo đảm mutation chỉ chạy trên demo target. |
| Mở rộng `BUSINESS_TABLES` chính xác đủ 31 model, bao gồm `Session`, `Role`, `UserRole`, `User`, `OrganizationUnit`, toàn bộ `Subject*`, `ResidentMonthlyReport` và derived/eventing | AC-00-02; Rubric dòng 37; bước 51, 54 | Assert count `0` cho từng model trong inventory; assert `_prisma_migrations` và schema vẫn tồn tại vì nằm ngoài whitelist. |
| `RESTART IDENTITY CASCADE` trong một flow deterministic | AC-00-02, AC-00-05; bước 54 | Xóa row và reset sequence, đồng thời repeat trên DB rỗng không tạo dữ liệu hay lỗi do thứ tự FK. |
| Query Evidence theo `metadata.demoNamespace`, validate relative key + containment dưới `storage/evidence`, rồi gọi `LocalEvidenceStorage.remove` trước truncate | AC-00-03; Rubric dòng 39; Rubric An toàn | Chỉ physical file Evidence demo có key hợp lệ bị xóa; marker với absolute/`..`/out-of-root bị từ chối trước remove; row Evidence vẫn bị truncate cùng inventory; non-marker và tile giữ nguyên. |
| Helper batch Evidence trong `storage-adapter.ts` | AC-00-03; Rubric dòng 39; Rubric An toàn | Dependency kỹ thuật bắt buộc để reset gọi đúng `LocalEvidenceStorage.remove`; helper không tự quét, không nhận absolute/traversal/out-of-root key và không xóa ngoài `storage/evidence`. |
| Snapshot/sentinel test của `civicos` và reset target `civicos_demo` | AC-00-04; Rubric dòng 40 | Chứng minh database production/development không đổi cả row count và sentinel, không chỉ kiểm tra URL hiển thị. |
| Test reset hai lần trên demo rỗng, assert exit `0`, count/file không tăng và log target | AC-00-05 | Khóa idempotent/no-op behavior và target log. |
| Cập nhật `tests/demo/demo-bootstrap.test.ts` và tạo `tests/integration/demo-seed-reset.integration.test.ts` theo skeleton | AC-00-01..05; Rubric An toàn; bước 55 | Bao phủ contract precedence/wrong target/thiếu confirmation, full clear đủ 31 model, Evidence marker hợp lệ và boundary absolute/`..`/out-of-root, non-marker/tile ownership, isolation và repeat. |
| Cập nhật README command/guard contract | AC-00-01..05 (vận hành); Rubric khuyến nghị dòng 46–47; bước 56 | Runbook không hướng dẫn reset `civicos`, nêu target/confirmation và phạm vi file/table rõ ràng. Đây là tài liệu vận hành bắt buộc, không phải thay đổi runtime độc lập. |

Không có thay đổi dự kiến nào ngoài mapping trên. Việc thêm helper batch là refactor kỹ thuật tối thiểu để thực hiện AC-00-03 qua `LocalEvidenceStorage.remove`; việc thêm test integration là bằng chứng bắt buộc cho các AC và không thay đổi production behavior.

## Phạm vi thực thi lần sau

- Chưa viết code/test và chưa chạy test, lint, typecheck, format hoặc build.
- Chưa commit.
