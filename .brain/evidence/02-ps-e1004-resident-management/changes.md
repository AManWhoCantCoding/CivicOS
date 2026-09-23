# Evidence — 02-ps-e1004-resident-management (Developer, TDD chưa chạy kiểm tra)

## Prisma
- `prisma/schema.prisma`: thêm `Subject`, `SubjectManagementRecord`, `SubjectManagementActivity`, `ResidentMonthlyReport`.
- `prisma/migrations/20260923090000_ps_e1004_resident_management/migration.sql`: additive `CREATE TABLE IF NOT EXISTS` + CHECK type + index; không reset/drop.

## Domain module
- `src/modules/residents/contracts.ts`: ba `subjectType`, SLA 24h/monthly/same-day, mask, slaBadge, reportPeriod, toApiError.
- `src/modules/residents/commands.ts`: registerSubject, createManagementRecord, assignRecord, recordActivity (idempotent), updateRecord (optimistic), raiseRisk, transferRecord, generateMonthlyReport, approveReport (snapshot bất biến + Approval), sendReport.
- `src/modules/residents/projection.ts`: resident-read-model có version/organization scope, list/detail mask theo `read_sensitive` + AuditEvent khi đọc nhạy cảm.
- `src/modules/residents/index.ts`, `src/modules/residents/seed.ts`: seed synthetic ba loại + trạng thái đúng hạn/quá hạn.

## API
- `src/app/api/residents/route.ts`: GET list, POST register.
- `src/app/api/residents/[subjectId]/route.ts`: GET detail, PATCH.
- `src/app/api/residents/[subjectId]/management-records/route.ts`: GET/POST.
- `src/app/api/residents/[subjectId]/management-records/[recordId]/route.ts`: GET/PATCH/POST assign-risk-transfer.
- `src/app/api/residents/[subjectId]/management-records/[recordId]/activities/route.ts`: GET/POST idempotent.
- `src/app/api/residents/reports/monthly/route.ts`: GET/POST.
- `src/app/api/residents/reports/[reportId]/approve/route.ts`, `.../send/route.ts`: POST.

## Web
- `src/app/residents/page.tsx` (screen-02), `src/app/residents/[subjectId]/page.tsx` (screen-03), `src/app/residents/[subjectId]/records/[recordId]/page.tsx` (screen-04), `src/app/residents/reports/page.tsx` (screen-10).
- `src/components/residents/ResidentList.tsx`, `ResidentDetail.tsx`, `ActivityForm.tsx`, `ReportPreview.tsx`: đủ loading, empty, error/retry, permission-denied, masked, SLA warning.
- `src/components/navigation/feature-registry.ts`: thêm module `residents` + feature `resident-list`, `resident-reports`; không tạo write CTA mobile.

## Tests (viết theo TDD, CHƯA CHẠY)
- `tests/residents/resident-contracts.test.ts`: unit AC, masking, SLA, snapshot mapping.
- `tests/residents/resident-workflow.postgres.test.ts`: integration Assignment, scope, idempotency, version, risk/transfer, snapshot, audit.

## Sửa targeted vòng 1 (Developer, CHƯA CHẠY kiểm tra)

- `src/modules/residents/commands.ts`: import `Prisma` dạng value (sửa lỗi `import type` dùng kèm `PrismaClientKnownRequestError`); `recordActivity` checkup tăng `version + 1` khi cập nhật `nextCheck`; `registerSubject` trả object whitelist không chứa `sensitiveProfile`/`sensitiveIndex`, mask `displayName` theo capability `read_sensitive`, giữ `AuditEvent subject.registered`; `decryptResidentProfile` dùng `actor` để chặn thiếu `read_sensitive`.
- `src/modules/residents/projection.ts`: `projectResidentEvent` thuần sync `(previous, event) => state` đúng contract, giữ version/organization scope; `applyResidentProjection` đọc previous + `upsertReadModel` với state object (không còn Promise); xóa helper `subjectState` chết; `visibleRecordIds` bỏ bypass commander, mọi role đều qua Assignment active + OrganizationUnit; `scopedRecords` luôn lọc `id in allowedIds` và `assignedOrganizationId` theo unit.
- `src/components/residents/ResidentList.tsx`, `ResidentDetail.tsx`, `ReportPreview.tsx`: effect dùng `window.setTimeout(..., 0)` + cleanup `clearTimeout`, giữ loading/empty/error/retry/permission/masked; `ReportPreview` bỏ literal `'upper-unit'`, thêm input `targetOrganizationId` runtime, chặn gửi khi trống.
- `tests/residents/resident-regression.test.ts` (mới, unit): khóa projection sync/version/scope và cấm hard-code `upper-unit` trong `ReportPreview.tsx`.
- `tests/residents/resident-scope-regression.postgres.test.ts` (mới, DB-gated): khóa commander cùng unit không assignment bị `FORBIDDEN`, register không trả PII + audit đúng, checkup tăng version + `nextCheck`, transfer/send yêu cầu target runtime, preview báo cáo đúng scope unit.
- Không sửa `scripts/demo/seed.ts`, migration, E2E ngoài scope, `.env*`, `Lesson-learned.md` (Planner cấm), `.scratch/**`, docs hay file ngoài allow-list; không chạy test/lint/typecheck/build/migration; không commit.

## Sửa fixture vòng 2 (Developer, CHƯA CHẠY kiểm tra)

- `tests/residents/resident-workflow.postgres.test.ts` checkup: assign thêm `commander` cùng `field` trước `getRecord(record.id, commander)` để phản ánh AC Assignment/scope; giữ regression deny outsider commander trong `resident-scope-regression`.
- `tests/residents/resident-workflow.postgres.test.ts` sensitive-read: tạo `SubjectManagementRecord` + `assignRecord` cho `commander` trước `getSubjectDetail`, track `trackedRecords` để cleanup, giữ assertion PII `secret` và `AuditEvent subject.sensitive_read`.
- Không sửa source authorization, không sửa test để né lỗi, không đổi domain contract; không đụng `scripts/demo/seed.ts`, E2E, `.env*`, docs, `.scratch`, `Lesson-learned`.

## Format-only vòng 3 theo canonical Prettier của Tester (Developer, CHƯA CHẠY kiểm tra)

- Áp exact canonical từ `prettier-ticket-02-20260924-030127-781` cho đúng 17 file scope: gộp import nhiều tên thành 1 dòng (`activities/route.ts`, `[subjectId]/route.ts`, `residents/route.ts`); gộp ternary/điều kiện vừa print width (`monthly/route.ts`, `reports/page.tsx`, `projection.ts`, `commands.ts` geopoint + `aggregateVersion + 1` + `createHash` chain + `records.map(({ id }) => id)`); union type 1 dòng (`feature-registry.ts` ModuleId, `contracts.ts` ResidentSubjectType); gộp JSX vừa dòng (`ActivityForm`, `ReportPreview` alert, `ResidentDetail` alert + `Link`, `ResidentList` `Link`); `ReportPreview` dedent block `reports.map` đúng indent canonical, không placeholder; test chỉ gộp `expect`/array/callback (`resident-contracts`, `resident-regression`, `resident-scope-regression`, `resident-workflow`).
- Giữ nguyên LF line-ending của repo (canonical temp là CRLF, chỉ lấy nội dung wrap/join); không đổi behavior/logic, không sửa file ngoài 17 file scope; không chạy Prettier/test/lint/typecheck/format/build/e2e/npm/Docker/migration; không commit.
- Xác minh bằng `diff --strip-trailing-cr` từng file với canonical: 17/17 khớp 0 dòng lệch.

## Sửa targeted vòng 4 — commander bypass record-level (Developer, CHƯA CHẠY kiểm tra)

- `src/modules/residents/commands.ts`: xóa `isCommander` và mọi nhánh bypass; `assertRecordAccess` giờ yêu cầu cùng OrganizationUnit VÀ active `resident_followup` Assignment cho mọi actor record-level; `canViewResidentSensitive` chỉ true khi cùng unit + active Assignment (giữ `read_sensitive` capability gate); `transferRecord` chuyển từ check `sameUnit` đơn lẻ sang `assertRecordAccess` chung với `recordActivity`/`updateRecord`/`raiseRisk`. Giữ `assignRecord` (commander cùng unit cấp Assignment) và report-level scope (`generate/approve/send`, previews) theo scope quản lý.
- `tests/residents/resident-workflow.postgres.test.ts`: stale-update thêm assertion `FORBIDDEN` cho commander chưa assignment rồi assign commander và giữ `STALE_RECORD`; risk/transfer thêm assertion `FORBIDDEN` cho outsider chưa assignment rồi assign commander, giữ `raiseRisk` + `transferRecord` pass. Giữ 3 types/SLA/idempotency/version/PII/Audit/snapshot.
- `tests/residents/resident-scope-regression.postgres.test.ts`: transfer-test assign `commander` trước khi transfer thành công; thêm assertion `outsiderCommander` transfer bị `FORBIDDEN`; giữ regression deny `getSubjectDetail`/`getRecord` cho same-unit commander không Assignment.
- Không sửa `scripts/demo/seed.ts`, migration contract, E2E ngoài scope, `.env*`, docs, `.scratch`, `Lesson-learned.md`; không chạy migration/generate/typecheck/lint/format/unit/integration/e2e/build/npm/Docker; không commit.

## UI smoke E2E vòng 5 — resident-specific Playwright spec (Developer, CHƯA CHẠY kiểm tra)

- `tests/e2e/ps004-resident.spec.ts` (mới): targeted UI/API smoke cho AC9/AC10, mock `page.route` có kiểm soát, không phụ thuộc seed ngẫu nhiên ngoài login fixture `truong@civicos.local`/`civicos-dev`; chạy được cả Chromium/mobile qua projects hiện có.
- Scenario 1: `/residents` mock `subjects: []` render heading + empty state; mock 1 subject render row link trong `table`; assert không có write CTA E1-004 trong `main` (button/link `Tạo|Thêm|Đăng ký|Ghi nhận` count 0).
- Scenario 2: `/api/residents` lần đầu 503 hiện error alert + nút retry trong alert; retry trả 200 empty và empty state xuất hiện (counter trong route handler, không gọi API thật).
- Scenario 3: `/api/residents` 403 hiện permission-denied state qua `role=alert`.
- Scenario 4: `/residents/<subjectId>` mock masked subject (`masked: true`, `sensitiveProfile: null`, record tối thiểu) hiện `Danh tính đã che theo quyền.`, sentinel raw PII count 0, record link visible.
- Scenario 5: `/residents/reports` mock delayed empty (loading `Đang tải báo cáo tháng…` rồi empty), mock draft/approved snapshot (period/status, `Snapshot bất biến:`, nút `Phê duyệt`/`Gửi cấp trên`); input target rỗng mặc định, không literal `upper-unit`; click send khi trống bị chặn trước POST, fill runtime target rồi send và assert body `targetOrganizationId` bằng runtime value qua `waitForResponse`.
- Assertions accessible (`heading`/`status`/`alert`/`button`/`link`/`table`/`label`), không sleep; không sửa production source, `playwright/conftest.py` (không tồn tại/không đụng), fixture DB, `.env`, docs, `.scratch`, `Lesson-learned`; không chạy npm/Playwright/test/lint/typecheck/format/build/Docker/migration; không commit; không gọi Tester/Reviewer.

## Sửa selector vòng 6 — scope alert 403 tránh route announcer (Developer, CHƯA CHẠY kiểm tra)

- `tests/e2e/ps004-resident.spec.ts` scenario permission-denied 403: `page.getByRole('alert')` trần khớp 2 phần tử (alert nội dung + Next route announcer rỗng) nên `toContainText` fail strict-mode trên Chromium/mobile; scope thành `page.getByRole('alert').filter({ hasText: 'Tài khoản không có quyền xem hồ sơ cư dân trong phạm vi này.' })` rồi mới `toContainText` cùng message, loại route announcer rỗng mà không phụ thuộc text announcer.
- Giữ nguyên message assertion, giữ nguyên toàn bộ scenario/coverage khác (error/retry đã scoped sẵn, mobile projects giữ nguyên); không sửa production source, không nới lỏng assertion, không bỏ scenario.
- Không chạy test/Playwright/lint/typecheck/format/build/npm/Docker/migration; không commit; không gọi Tester/Reviewer.

## Sửa format-only vòng 7 — `tests/e2e/ps004-resident.spec.ts` (Developer, CHƯA CHẠY kiểm tra)

- `tests/e2e/ps004-resident.spec.ts` scenario masked-PII: gộp `await expect(page.getByText('Danh tính đã che theo quyền.')).toBeVisible();` thành 1 dòng (ước lượng ~77 ký tự gồm indent, vừa print width 80); dạng expanded 3 dòng trước đó dư thừa theo canonical Prettier (chỉ expand khi joined vượt width).
- Giữ nguyên `heading 'Hồ sơ cư dân'` và `link /foreign_resident/` ở dạng expanded vì joined vượt 80; giữ nguyên logic, route mocks, 5 scenario, accessible assertions, mobile coverage.
- Không sửa production source hay file ngoài `tests/e2e/ps004-resident.spec.ts`; không chạy Prettier/format-check/test/Playwright/lint/typecheck/build/npm/Docker/migration; không dùng `--write`; không commit; không gọi Tester/Reviewer.

## Sửa format-only vòng 8 — `tests/e2e/ps004-resident.spec.ts` locator 403 (Developer, CHƯA CHẠY kiểm tra)

- `tests/e2e/ps004-resident.spec.ts` scenario permission-denied 403 (dòng 125–131): gộp `page.getByRole('alert').filter({ hasText: ... })` thành chain 1 dòng đầu theo canonical Prettier, thay dạng expanded `page` + `.getByRole` + `.filter` tách dòng; giữ nguyên `hasText`/`toContainText` message, logic, assertions, coverage.
- Không sửa production source hay file khác ngoài `tests/e2e/ps004-resident.spec.ts`; không chạy Prettier/format-check/test/Playwright/lint/typecheck/build/npm/Docker/migration; không commit; không gọi Tester/Reviewer.

## Ghi chú
- Không dùng shared `canAccess` cho assignment cư dân vì `TASK_ALLOWED_ROLES` chưa có `resident_followup` (ngoài scope sửa); module tự kiểm tra Assignment + OrganizationUnit scope.
- Không sửa `.env`, secrets, `.scratch`, `docs`, `Lesson-learned.md`; không commit; không chạy test/lint/typecheck/build/migration.
