# Reviewer checkpoint cuối — PS-E1-004

## Phạm vi và phương pháp

- Đã đọc lại toàn bộ ticket hiện tại `.scratch/civicos-e1-clone-mvp/issues/02-ps-e1004-resident-management.md`, `CONTEXT.md`, `spec.md`, ADR-0001–0004 từ `HEAD`, diff/code hiện tại, `changes.md` và mục cuối cùng của `tests.md` là **“Verification cuối sau format fix vòng 8”**.
- Không dùng các mục evidence cũ để phủ định mục cuối. Reviewer không chạy test, lint, typecheck, format-check, build, migration, E2E, npm, Docker hoặc bất kỳ lệnh kiểm tra nào.
- Các thay đổi nền ngoài ticket trong working tree được loại khỏi đánh giá ticket theo allow-list Planner đã giao; không biến chúng thành FAIL.
- Evidence backend authoritative gần nhất: `tests.md:1964-1978` (27/27 resident tests, 0 skip). Evidence UI/format authoritative cuối: `tests.md:2276-2347`.

## Acceptance Criteria AC1–AC12

| AC | Kết quả | Bằng chứng đối chiếu |
|---|---|---|
| AC1 — CRUD/list/detail `Subject` và nhiều `SubjectManagementRecord` | **PASS** | `changes.md:3-20` liệt kê model, command và API; schema hiện tại có `Subject.records` và record có `subject`; workflow resident 27/27 PASS tại `tests.md:1964-1978`, mapping CRUD tại `tests.md:1978`. |
| AC2 — Assignment + OrganizationUnit scope | **PASS** | `src/modules/residents/commands.ts:61-72` dùng `assertRecordAccess` cho assignment/unit; `projection.ts:100-126` lọc assignment active `resident_followup` và organization; regression kiểm tra commander cùng unit nhưng không assignment bị `FORBIDDEN` tại `tests/residents/resident-scope-regression.postgres.test.ts:123-146`; evidence 27/27 tại `tests.md:1964-1978`. |
| AC3 — Activity có Actor, thời điểm, nội dung, đánh giá, vị trí và Evidence | **PASS** | Migration `migration.sql:32-47` có các trường activity; `commands.ts:397-506` ghi actor, occurredAt, content, evaluation, latitude/longitude, assignment và evidenceIds; workflow PASS được ghi tại `tests.md:1964-1978`. |
| AC4 — `nextCheck`, overdue và cảnh báo sau checkup | **PASS** | `commands.ts:450-475` cập nhật `nextCheckAt`, version và SLA; `projection.ts:156-170` tính badge/overdue; evidence mapping activity/SLA/nextCheck tại `tests.md:1978` và 27/27 PASS tại `tests.md:1964-1978`. |
| AC5 — Intake CA huyện/cơ sở lưu trú; foreign same-day | **PASS** | `changes.md:8-11` và code command resident giữ `sourceOrganizationId`/rule foreign; targeted workflow mapping AC32 tại `tests.md:1978`, không skip, 27/27 PASS tại `tests.md:1964-1978`. |
| AC6 — High-risk và transfer lên OrganizationUnit cấp trên | **PASS** | `commands.ts:585-643` tạo SLA high-risk và event/audit; `commands.ts:645-693` bắt buộc target runtime, dùng access chung và phát event transfer; test workflow kiểm tra outsider bị từ chối rồi transfer thành công tại `resident-workflow.postgres.test.ts:315-341`; evidence PASS tại `tests.md:1978`. |
| AC7 — Monthly `PeriodicReport` và immutable snapshot | **PASS** | `migration.sql:49-67` có source/counts/snapshot/hash; `commands.ts:701-798` tạo report theo period và idempotency; `commands.ts:802-870` đóng băng `snapshotPayload`/hash khi approve; test bất biến tại `resident-workflow.postgres.test.ts:343-358`; UI snapshot/runtime target PASS tại `tests.md:2315-2332`. |
| AC8 — SLA 24h/monthly/same-day/high-risk/report đúng hạn | **PASS** | Contract/rules tại `changes.md:8-10`; targeted resident suite mapping AC31/35 tại `tests.md:1978`, thực thi đủ không skip và 27/27 PASS tại `tests.md:1964-1978`. |
| AC9 — Loading, empty, error/retry, permission-denied, masked-field trên web | **PASS** | Mục evidence cuối ghi Prettier resident PASS và Playwright 10/10 tại `tests.md:2282-2321`; mapping Chromium/mobile cho list/loading-empty, error/retry, 403 và masked tại `tests.md:2323-2331`. |
| AC10 — Không tạo write CTA E1-004 trên mobile | **PASS** | Resident Playwright cuối ghi mobile test 6–10 PASS tại `tests.md:2226-2232`; mapping no-write CTA mobile PASS tại `tests.md:2331-2332`. |
| AC11 — Đúng ba record types, không dùng địa danh làm type | **PASS** | `contracts.ts`/migration constraint chỉ cho `temporary_resident`, `foreign_resident`, `reintegration` (`migration.sql:81-90`); contract test mapping PASS tại `tests.md:1978`. |
| AC12 — Idempotency activity/report và optimistic/version check | **PASS** | Unique indexes tại `migration.sql:93-95`; `recordActivity` idempotency tại `commands.ts:420-425`; `updateRecord` kiểm tra `baseVersion`/conditional update tại `commands.ts:510-582`; workflow 27/27 PASS và mapping AC39 tại `tests.md:1964-1978`. |

## Bốn rubric bắt buộc

| Rubric | Kết quả | Bằng chứng đối chiếu |
|---|---|---|
| Subject/User/Actor tách biệt; record có purpose và quyền riêng | **PASS** | `CONTEXT.md:27-40`; ADR-0003 từ `HEAD` yêu cầu shared Subject identity nhưng tách management records; schema tách `Subject`/`SubjectManagementRecord`, record có `purpose`; evidence workflow/CRUD PASS tại `tests.md:1964-1978`. |
| Assignment least privilege | **PASS** | `CONTEXT.md:43-45`; ADR-0004 từ `HEAD` yêu cầu resource assignment chính xác. `commands.ts:61-72` không còn commander bypass ở record-level; `projection.ts:100-126` áp cùng assignment/unit scope khi đọc; regression unassigned commander bị `FORBIDDEN` tại `resident-scope-regression.postgres.test.ts:123-146`. `bypassTaskRoles` còn trong `feature-registry.ts:19,38,195-211` chỉ là seam hiển thị/điều hướng module, không phải bypass authorization cho Assignment/resource record. |
| Report snapshot bất biến | **PASS** | `CONTEXT.md:65-67`; `commands.ts:813-830` ghi snapshot/hash tại approval; `resident-workflow.postgres.test.ts:343-358` xác nhận payload lưu không đổi sau send; targeted suite PASS tại `tests.md:1964-1978`, UI snapshot PASS tại `tests.md:2315-2332`. |
| PII qua `read_sensitive` và có AuditEvent | **PASS** | `commands.ts:155-170` trả whitelist, không trả encrypted fields; `projection.ts:213-258` chỉ giải mã khi capability + assignment/unit pass và ghi `subject.sensitive_read` tại `231-237`; regression kiểm tra không trả raw/encrypted PII và audit tại `resident-scope-regression.postgres.test.ts:148-172`; sensitive-read audit tại `resident-workflow.postgres.test.ts:360-390`; browser masking PASS tại `tests.md:2224-2230`. |

## Các gate và phạm vi failure

- **Migration/target:** **PASS trong phạm vi ticket** — evidence xác nhận `civicos_demo`, không pending tại `tests.md:1948-1955`; migration additive tại `migration.sql:3-100`.
- **Resident format:** **PASS** — `npx prettier --check tests/e2e/ps004-resident.spec.ts` PASS tại `tests.md:2282-2288`; full format-check còn đúng 15 warning ngoài scope, resident spec không nằm trong danh sách tại `tests.md:2290-2313`.
- **Lint:** **PASS** theo resident verification tại `tests.md:1994-2000`.
- **Typecheck/build/full npm test/full E2E:** lệnh toàn repo có failure/giới hạn ngoài scope đã được Tester ghi tại `tests.md:1980-2111`; không có resident failure trong các resident suite và không dùng các failure ngoài scope để phủ định AC resident. Đây là kết quả toàn repo ngoài scope, không phải FAIL của ticket.
- **Allow-list:** diff/code ticket-specific được đối chiếu trong các path Planner nêu: schema + migration, residents module/API/web/components, navigation registry, resident tests, resident E2E và evidence ticket. Các README/.env.example/docs/.scratch/evidence/infrastructure/playwright/scripts và thay đổi nền khác không được quy cho ticket 02.
- **Kết luận:** tất cả AC1–AC12 và bốn rubric bắt buộc **PASS** theo evidence + code hiện tại. Ticket có thể chuyển sang bước tick ticket/commit; Reviewer chưa stage và chưa commit trong lượt này.

## Trục trặc gặp phải

- Một lần đọc ban đầu dùng path có ký tự điều khiển/tab do escape separator, nên công cụ từ chối trước khi đọc. Đã dùng path repo đã xác minh bằng slash và đọc lại thành công; không ảnh hưởng review.
- Đã cập nhật mục **Verified-path reads** trong `Lesson-learned.md` để bổ sung biến thể ký tự tab/control character và cách phòng ngừa.

## Evidence

- Review này được cập nhật tại `.brain/evidence/02-ps-e1004-resident-management/review.md`.
- Chưa commit.
