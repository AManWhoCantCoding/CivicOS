# PS-E1-005 — Ghi nhận và Theo dõi Tố giác

- **Status:** done
- **Blocked by:** 00, 01
- **File được phép sửa:**
  - `src/modules/incidents/**`
  - `src/modules/eventing/event-catalog.ts` — đăng ký các event IntakeReport, không đổi semantics
  - `src/app/intake/**`
  - `src/app/incidents/**`
  - `src/app/api/intake-reports/**`
  - `src/app/api/incidents/**`
  - `src/components/incidents/**`
  - `src/components/navigation/feature-registry.ts`
  - `prisma/schema.prisma`
  - `prisma/migrations/**`
  - `tests/incidents/**`
  - `tests/**` khi cần sửa integration liên quan
  - `scripts/demo/seed.ts` — sửa tương thích sau khi `Incident.intakeReportId` thành optional
  - `tests/demo/demo-bootstrap.test.ts` — sửa tương thích sau khi `Incident.intakeReportId` thành optional
  - Các file/flow liên quan đến các lỗi `format/full-suite/e2e` ngoài scope hiện tại, theo phạm vi cần thiết để sửa toàn bộ các lỗi đó
- **File cấm sửa:**
  - `.env`, `.env.*`
  - `.brain/**` — ngoại trừ `.brain/evidence/03-ps-e1005-intake-report/**` theo role
  - `node_modules/**`
  - `**/secrets/**`

## Mô tả

Điều chỉnh module Incident/intake hiện có để bám semantics source và PS-E1-005: cán bộ trực ban nhập `IntakeReport` trên web, bảo vệ danh tính, xác minh, theo dõi SLA và chỉ tạo `Incident` khi cán bộ chủ động confirm/convert. Mở rộng canonical `sourceChannel` nhưng giữ khả năng đọc dữ liệu legacy.

## Acceptance Criteria (bắt buộc — chặn done, PASS 100%)

- [x] Web duty officer tạo được IntakeReport với `sourceChannel`: `direct`, `phone`, `app`, `district_transfer`; API có thể map input legacy `in_person`/`telephone` trong migration.
- [x] Nhập tin không tự động tạo Incident; action confirm/convert riêng mới tạo Incident và liên kết `intakeReportId`.
- [x] Status intake giữ semantics source: `RECEIVED`, `VERIFIED`, `PROCESSED`, `CLOSED`, `REJECTED`; Incident giữ transition hợp lệ hiện có.
- [x] Có phân loại đủ cơ sở/cần xác minh, ghi chú xác minh, Evidence và kết quả.
- [x] Có SLA ghi nhận trong 24 giờ, xác minh ban đầu trong 48 giờ và thông báo kết quả trong 20 ngày; deadline chạy liên tục.
- [x] Có transfer tới OrganizationUnit cấp huyện khi vượt thẩm quyền; chuyển giao có Approval/Audit.
- [x] Danh tính người tố giác được mã hóa/mask; chỉ role có `read_sensitive` phù hợp (Trưởng CA) được reveal; list, map, notification và export mặc định không lộ PII.
- [x] Mọi create/verify/convert/transfer/close/reject/process phát DomainEvent và AuditEvent tương ứng.
- [x] Đăng ký đủ 7 event IntakeReport trong `src/modules/eventing/event-catalog.ts`, không đổi semantics event contract.
- [x] Có notification adapter mock cho kết quả xử lý; không cần public citizen app trong MVP.
- [x] Có loading, empty, error/retry, masked/permission-denied, SLA warning/overdue và approval state.
- [x] API không expose raw `sourceName`, `sourceContact` hoặc `sensitiveRef` khi Actor không có capability `read_sensitive`.
- [x] Retry cùng idempotency key trả cùng IntakeReport, không tạo duplicate Incident hoặc duplicate DomainEvent.

## Rubric (mức độ đạt)

### Bắt buộc (chặn done — phải PASS 100%, Reviewer chấm như Acceptance Criteria)

- [ ] Không dùng `Incident` thay cho `IntakeReport`, nguồn: `CONTEXT.md#9-intakereport` và `CONTEXT.md#13-incident`.
- [ ] Việc tạo Incident là command explicit sau xác minh/confirm, không phải side effect của form nhập tin, nguồn: `spec.md#42-ps-e1-005--ghi-nhận-và-theo-dõi-tố-giác`.
- [ ] Secrecy boundary được enforce ở API/domain, không chỉ ẩn field bằng UI, nguồn: `spec.md#26-bảo-mật-và-tích-hợp`.
- [ ] Idempotency và không mất intake khi retry, nguồn: hiện trạng `registerIntakeReport` và test contract hiện có.

### Khuyến nghị (không chặn done, chỉ ghi nhận — trừ khi dưới ngưỡng tối thiểu)

| Trục | Mô tả kỳ vọng | Thang điểm | Ngưỡng tối thiểu |
|---|---|---|---|
| Thiết kế/UI | Bám screen-05 và screen-06; Stitch chưa khả dụng nên textual spec là baseline | 0–2 | 1 |
| Thao tác/UX | Cán bộ biết rõ action nào chỉ verify, action nào tạo Incident, deadline nào sắp hạn | 0–2 | 1 |
| Quy trình | Đúng B1–B7 và AC PS-E1-005, không mở public citizen app | 0–2 | 1 |

## Các bước thực hiện

- [x] Tách lifecycle IntakeReport khỏi Incident trong command, schema và projection; thêm migration status/sourceChannel nếu cần.
- [x] Thêm explicit convert/confirm command và liên kết Incident.
- [x] Bổ sung masking/encryption/reveal authorization, AuditEvent và notification/SLA.
- [x] Cập nhật API/form/list/detail, giữ route/navigation source-compatible.
- [x] Đăng ký 7 event IntakeReport trong event catalog; giữ `POST /api/incidents` source-compatible và chỉ thực hiện thay đổi route/API cần thiết trong scope hiện có.
- [x] Viết regression tests chứng minh nhập tin không tạo Incident tự động và confirm tạo đúng một Incident.
- [x] Viết integration tests cho 24h/48h/20 ngày, transfer, masking và idempotency.
- [x] Chạy `npm run prisma:generate`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run test:e2e` và `npm run build`; incident tests phải có trong log.

## Hợp đồng triển khai

### Canonical write model

- `IntakeReport`: `id`, `sourceChannel`, `receivedAt`, `content`, encrypted `sourceName/sourceContact/sensitiveRef`, `sensitiveRefIndex`, `status`, `createdById`, optional `incidentId`, `idempotencyKey`, `createdAt`, `updatedAt`, `version`.
- Canonical `sourceChannel`: `direct | phone | app | district_transfer`.
- Compatibility mapping chỉ ở boundary: `in_person → direct`, `telephone → phone`; không lưu field legacy mới.
- Status: `RECEIVED | VERIFIED | PROCESSED | CLOSED | REJECTED`.

### HTTP surface tối thiểu

- `POST /api/intake-reports`: create only IntakeReport; trả `reportId`, không trả `incidentId` nếu chưa convert.
- `GET /api/intake-reports`: filter status/sourceChannel/SLA, scope theo role/OrganizationUnit, masked list.
- `GET /api/intake-reports/:reportId`: masked detail + audit/history theo quyền.
- `POST /api/intake-reports/:reportId/commands` với command `verify`, `process`, `reject`, `close`, `convert_to_incident`, `transfer`.
- `GET/POST /api/incidents` và `/api/incidents/:incidentId/commands` giữ route source-compatible; `convert_to_incident` là nơi duy nhất liên kết Incident mới.

### Transition và event contract

- `RECEIVED → VERIFIED → PROCESSED → CLOSED`.
- `RECEIVED/VERIFIED → REJECTED` theo quyền; transition invalid trả error code ổn định.
- Convert chỉ hợp lệ sau verify/confirm và phải transactionally set `incidentId` + create `Incident` + append event.
- Event tối thiểu: `IntakeReportReceived`, `IntakeReportVerified`, `IntakeReportProcessed`, `IntakeReportRejected`, `IntakeReportClosed`, `IntakeReportConvertedToIncident`, `IntakeReportTransferred`.
- SLA tối thiểu: `intake_recording_24h`, `intake_verification_48h`, `intake_result_notification_20d`; tất cả là continuous elapsed time.

## Đang chờ Research

Không.

## Lý do wontfix trước khi mở lại

Sau hơn 3 vòng sửa cùng một lỗi `format:check`, ticket không thể đi tiếp trong phiên này. `typecheck` và `lint` đã PASS ở các vòng gần nhất, nhưng `format:check` vẫn FAIL lặp lại với cùng nhóm file; vì script dừng tại bước format nên Unit/Integration test chưa được chạy lại ở các vòng fast cuối. Đã thử các hướng: (1) chuẩn hóa thủ công 26 file theo output đầu, (2) sửa lỗi trailing comma TypeScript làm typecheck fail, (3) tiếp tục chuẩn hóa thủ công theo danh sách 22/19/15 file qua Developer và developer-fallback, (4) chạy format-only để xác nhận; vòng cuối vẫn FAIL với cùng 19 file, log: `.brain/evidence/03-ps-e1005-intake-report/logs/run7-format_check.log`. Developer chính hết quota; developer-fallback không xác định thêm hunk chắc chắn để sửa mà không chạy formatter, nên tiếp tục vá mù có rủi ro làm hỏng semantics.

## Lý do wontfix — phiên xử lý sau khi mở lại

Sau khi mở lại, cùng lỗi E2E read-model tiếp tục FAIL quá 3 vòng sửa lỗi nên ticket được tự động chuyển `wontfix` theo quy định. Bằng chứng cuối: `run45-test_e2e.log` — ba test trong `tests/e2e/parallel-wave-read-model.spec.ts` (`converted intake` list/detail và `establishment and inspection`) đều timeout 90 giây tại `waitForReadModel`; kết quả `88 passed, 3 failed, 1 skipped`, `build` chưa chạy.

Các vòng đã thử: (1) sửa lifecycle app/worker E2E, actor fixture và canonical assignment; (2) thêm worker-health/readiness gate và interval E2E 100ms; (3) bỏ global backlog gate để polling trực tiếp target read-model endpoint, giữ nguyên timeout/predicate/assertion. Fast run 44 PASS nhưng full run 45 vẫn giữ nguyên nhóm lỗi read-model. Hạ tầng Docker/PostgreSQL đã PASS; đây không phải điểm dừng do database.

## Lý do wontfix — vòng bounded worker sau khi mở lại

Sau khi mở lại, đã thử thêm 3 vòng sửa lỗi cùng nhóm timeout read-model nhưng full E2E vẫn thất bại. Cả ba test `tests/e2e/parallel-wave-read-model.spec.ts` (`converted intake` list/detail và `establishment and inspection`) đều timeout tại `waitForReadModel` sau `90000ms`; lần cuối `run55-test_e2e.log` ghi `88 passed, 1 skipped, 3 failed`, `build` là `NOT_RUN`. Fast verification gần nhất vẫn PASS (lần 54).

Các hướng đã thử trong vòng này: (1) thêm bounded outbox batch E2E `10`, production mặc định vẫn `1`; (2) xử lý outbox trước `markOverdue` và tăng batch E2E lên `100`; (3) tăng bounded E2E catch-up lên `1000`. Tất cả đều giữ nguyên timeout/predicate/assertion, không query DB từ test, không reset/drop/seed, không xóa/skip pending message, và giữ lease/claim/retry/error handling cùng event/projection semantics. Docker/PostgreSQL đã PASS; đây không phải lỗi hạ tầng.

Theo quy tắc quá 3 vòng cùng lỗi, ticket được tự động chuyển `wontfix`. Acceptance Criteria và Các bước thực hiện chưa tick; chưa chạy được `build`, chưa gọi Reviewer checkpoint cuối/round-trip và chưa có commit. Evidence cuối: `.brain/evidence/03-ps-e1005-intake-report/tests.md` và `.brain/evidence/03-ps-e1005-intake-report/logs/run55-test_e2e.log`.

## Tiến độ dở dang khi dừng

- Đã hoàn thành phần implementation và test contract ticket-specific trước đó: unit 18/18 và DB integration 12/12, zero skipped ở lần chạy riêng; typecheck/lint/prisma:generate PASS ở các vòng fast gần nhất.
- Chưa tick Acceptance Criteria nào.
- Chưa tick bước thực hiện nào.
- Chưa đạt điều kiện đóng `done`: format gate FAIL, Unit/Integration full verification gần nhất chưa PASS, Playwright checkpoint cuối chưa chạy, Reviewer cuối chưa PASS và chưa có commit.

## Tiến độ dở dang khi dừng — phiên xử lý sau khi mở lại

- Fast run 44: `prisma:generate`, `typecheck`, `lint`, `format:check`, `test` PASS.
- Full run 45: các bước trên PASS; `test:e2e` FAIL với 3 timeout read-model; `build` NOT_RUN.
- Chưa tick Acceptance Criteria hoặc Các bước thực hiện; chưa gọi Reviewer checkpoint cuối/round-trip và chưa có commit.

## Comments

- Người dùng chấp thuận mở rộng file scope để sửa `src/modules/eventing/event-catalog.ts` nhằm đăng ký các event IntakeReport, không đổi semantics; đồng thời giữ các thay đổi route/API cần thiết trong scope hiện có.
- Người dùng chấp thuận mở rộng file scope ticket 03 để sửa tương thích `scripts/demo/seed.ts` và `tests/demo/demo-bootstrap.test.ts`, nhằm đưa `typecheck/build` về xanh sau khi `Incident.intakeReportId` thành optional.
- Người dùng chấp thuận mở rộng thêm scope để sửa toàn bộ các file/flow gây lỗi `format/full-suite/e2e` ngoài scope đã tồn tại; không chỉ ghi nhận các lỗi này là baseline blocker. Việc mở rộng toàn repo có thể kéo theo ticket khác.

## Lịch sử mở lại

- 2026-09-24: Người dùng yêu cầu mở lại ticket sau khi Developer chính hết quota. Hạ tầng Docker/PostgreSQL/TileServer đã được Tester xác nhận sẵn sàng; tiếp tục bằng `developer-fallback` và giữ nguyên Acceptance Criteria, scope cùng tiến độ dở dang ở trên.
- 2026-09-25: Người dùng yêu cầu thử lại sau lần tự động chuyển `wontfix`; Planner mở lại ticket, giữ nguyên Acceptance Criteria/evidence và bắt đầu một vòng chẩn đoán mới trước khi sửa tiếp.
- 2026-09-25: Người dùng yêu cầu tiếp tục sửa nhưng phải tìm root cause, lập kế hoạch và chờ Reviewer PASS kế hoạch trước khi Developer viết code; giữ nguyên Acceptance Criteria.

## Trạng thái cuối

done
