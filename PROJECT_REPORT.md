---
title: 'Báo cáo khảo sát dự án CivicOS'
status: draft
owner: 'Research Agent'
created: 2026-10-17
updated: 2026-10-17
sources:
  - README.md
  - Requirement.md
  - CONTEXT.md
  - package.json
  - docs/agents/project.md
  - docs/agents/source-assessment.md
  - brain/adr/0001-land-module-boundaries.md
  - brain/adr/0005-e1-mobile-parity-boundaries.md
  - prisma/schema.prisma
  - src/
  - mobile/
  - tests/
---

# Báo cáo khảo sát dự án CivicOS

## 1. Phạm vi và phương pháp

Báo cáo này ghi nhận **AS-IS → GAP → TO-BE đề xuất** tại ngày 2026-10-17.
Đây là báo cáo khảo sát, không phải quyết định triển khai và không chứng nhận
hệ thống đã hoàn thành toàn bộ yêu cầu production.

Đã khảo sát README, yêu cầu nghiệp vụ, domain context, ADR, Prisma schema và
migration, API/page, module, worker, mobile, test, design lock và workflow
artifact. Số lượng trong báo cáo được sinh từ lệnh kiểm tra, không đếm thủ công.

Trong phiên này không sửa production source. Trước khi tạo báo cáo:

- branch: `reset/baseline`;
- HEAD: `136197c`;
- working tree đã dirty với 71 mục thay đổi/untracked;
- `PROJECT_REPORT.md` là file mới của phiên khảo sát.

## 2. Kết luận điều hành

1. CivicOS là **modular monolith**: Next.js phục vụ web/API, PostgreSQL lưu dữ
   liệu và worker xử lý outbox, projection, SLA và notification
   (`README.md:1-5`, `README.md:97-127`).
2. Các module chính đã tồn tại: `identity`, `incidents`, `inspections`,
   `vehicles`, `residents`, `land`, `map`, `platform/eventing` và mobile
   read-only (`README.md:32-44`).
3. Repo tự xác định là MVP đang mở rộng, chưa phải triển khai đầy đủ
   PS-E1-001 đến PS-E1-010. Tranche hiện nêu PS-E1-004, PS-E1-005 và PS-E1-007;
   mobile đang read-only; không có public citizen app và các tích hợp LPR/GIS/
   đất đai thật đang ở mock/adapter boundary (`README.md:46-58`).
4. Build, typecheck, Prisma Client generation và mobile lane có kết quả xanh.
   Full web test bị chặn bởi PostgreSQL; format check còn lỗi; một số design
   lock bị drift. Chưa có căn cứ để kết luận toàn bộ test pass hoặc
   production-ready.
5. Rủi ro cần quyết định trước feature work tiếp theo: môi trường DB/test,
   design lock, land workflow và trạng thái ADR mobile parity.

## 3. AS-IS — hiện trạng

### 3.1. Domain và phạm vi sản phẩm

`CONTEXT.md` định nghĩa các boundary quan trọng:

- `IntakeReport` là tin đầu vào, khác `Incident` là vụ việc nội bộ
  (`CONTEXT.md:7-19`);
- `Subject` khác `User`/`Actor`; `Assignment` chỉ cấp quyền cho một nhiệm vụ,
  không cấp quyền xem toàn bộ đơn vị (`CONTEXT.md:25-49`);
- `DomainEvent` mô tả thay đổi nghiệp vụ, còn `AuditEvent` phục vụ truy vết
  việc đọc/thay đổi (`CONTEXT.md:51-68`);
- SLA bắt đầu từ event kích hoạt và ngưỡng phải cấu hình được
  (`CONTEXT.md:105-112`).

`Requirement.md` mô tả toàn bộ Epic PS-E1-001…010 và actor web, mobile, cấp
trên, người dân, camera/AI và GIS (`Requirement.md:7-28`). README giới hạn code
hiện tại ở MVP mở rộng (`README.md:46-58`); không được suy diễn rằng mọi FR/NFR
đã hoàn tất.

### 3.2. Kiến trúc và runtime

```text
Browser / mobile
  -> Next.js page hoặc API Route Handler
  -> domain module command/read model
  -> Prisma transaction -> EventRecord + OutboxMessage
  -> src/worker.ts -> projection / event history / SLA / notification
```

Flow này được ghi tại `README.md:97-127` và `docs/agents/project.md:34-45`.
Worker đăng ký event history, incident, inspection, notification và vehicle
projections (`src/worker.ts:1-18`). Event worker xử lý outbox, đánh dấu SLA quá
hạn và chống tick chồng lấn (`src/modules/eventing/worker.ts:1-35`).

`event-store.ts` có aggregate version, duplicate-event check và replay
idempotent; source assessment ghi nhận event store là nơi gắn
`EventRecord`/`OutboxMessage` (`docs/agents/source-assessment.md:11-18`).

### 3.3. Stack và inventory

| Lớp                | Hiện trạng                                                    |
| ------------------ | ------------------------------------------------------------- |
| Web/backend        | Next.js `16.3.5`, React `19.2.8`, TypeScript `5`, Node.js/tsx |
| UI/map             | Tailwind CSS `4`, MapLibre GL JS                              |
| Persistence        | Prisma `6.19`, PostgreSQL/PostGIS `16`                        |
| Web test           | Vitest và TypeScript Playwright                               |
| Browser acceptance | Python `pytest`/`pytest-playwright` trong `playwright/`       |
| Mobile             | React Native `0.85.3`, MapLibre React Native `11.4.0`         |

Nguồn: `README.md:129-146` và `docs/agents/project.md:14-27`.

| Hạng mục                                  |              Số lượng |
| ----------------------------------------- | --------------------: |
| Prisma model trong `prisma/schema.prisma` |                    39 |
| Migration directory                       |                    16 |
| API handler `src/app/api/**/route.ts`     |                    62 |
| Web page `src/app/**/page.tsx`            |                    28 |
| Web layout `src/app/**/layout.tsx`        |                     7 |
| Vitest file trong `tests/`                |                   179 |
| Mobile test execution                     | 17 suites / 122 tests |

### 3.4. Module và boundary

`docs/agents/project.md:47-59` xác nhận các module sau: `identity` (User,
Role, OrganizationUnit, Assignment, session, authorization, audit, masking);
`incidents` (IntakeReport/Incident, Approval, SLA); `inspections` (Establishment,
Inspection, checklist, Finding, Evidence); `vehicles`; `residents` (Subject,
SubjectManagementRecord); `platform/eventing`; `mobile-readonly`; và `land`
(party/parcel foundation cùng access/audit helpers).

Các coupling cần giữ visibility:

- API map phụ thuộc UI feature registry;
- API sync điều phối nhiều module;
- public entrypoint giữa các module chưa đồng nhất;
- feature registry/README chưa expose land UI module;
- event catalog chưa có land event family.

Các điểm này được ghi tại `docs/agents/source-assessment.md:31-39` và cần plan
riêng, không phải ủy quyền sửa source trong báo cáo.

### 3.5. Identity, authorization và audit

- `IdentityUser` mang id, email, tên, role và organization unit
  (`src/modules/identity/contracts.ts:1-42`).
- Session lưu hash SHA-256 của token và kiểm tra hết hạn
  (`src/modules/identity/session.ts:1-28`, `:43-52`).
- Policy seam hợp nhất capability theo role, organization scope và Assignment;
  các boundary read/mutate/assign/approve/`read_sensitive` dùng `canAccess`
  (`src/modules/identity/authorization.ts:133-162`, `:359-459`).
- `recordAudit` ghi `AuditEvent` và append `AuditEventRecorded` trong cùng
  transaction khi cần (`src/modules/identity/audit.ts:12-77`).
- Land actor yêu cầu role và organization unit; parcel detail kiểm tra thêm
  unit/assignment (`src/modules/land/access.ts:12-39`, `:136-171`). Evidence
  land được validate và audit khi upload/list
  (`src/modules/land/evidence-service.ts:102-110`, `:199-275`).

Đây là evidence về control đang có, không phải security audit độc lập.

### 3.6. Land, map và mock boundary

Land parcel map dùng logical projection, allowlist cột và PostGIS
`ST_AsGeoJSON`; không tạo bảng/index/cache mới
(`src/modules/land/parcel-map-projection.ts:13-18`, `:33-45`, `:58-103`).
Mobile kiểm tra projection, giữ `simulated: true` và fail closed khi geometry
không hợp lệ (`mobile/src/api/land-map.ts:20-27`, `:45-105`, `:167-176`). Public
lookup cũng là projection `simulated: true` với rate limit process-local
(`src/modules/land/public-lookup-service.ts:11-21`, `:34-77`).

ADR-0001 đã accepted: `LandChangeApplication` là aggregate điều phối; land
rights/parcel/encumbrance mutate cùng transaction khi application completed; kết
nối hệ thống đất đai quốc gia qua mock adapter (`brain/adr/0001-land-module-boundaries.md:1-5`).
Schema/API/test tồn tại không đủ để kết luận toàn bộ land workflow hoàn thiện.

### 3.7. Mobile và tài liệu quyết định

Mobile hiện có read-only HTTP boundary (`docs/agents/source-assessment.md:11-18`).
ADR-0005 vẫn là **PROPOSED**, đề xuất parity có kiểm soát cho E1-004/E1-005/E1-007,
chỉ allowlist một số offline action và giữ approval/transfer/sensitive mutation
online-only (`brain/adr/0005-e1-mobile-parity-boundaries.md:1-19`, `:21-35`).

## 4. GAP — khoảng cách và rủi ro

| Mức | Khoảng cách                     | Bằng chứng / tác động                                                                                                                                               |
| --- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0  | Full web test chưa xác minh     | `npm test` timeout 120 giây vì PostgreSQL `localhost:5432` không khả dụng                                                                                           |
| P0  | Design contract drift           | 5 lock drift, 1 feature thiếu `LOCK.json`; tiếp tục code dễ sai contract                                                                                            |
| P0  | Land completion chưa chốt       | ADR, lock, design text, source và workflow không đồng nhất; source assessment đánh dấu land-contract decisions `BLOCKED` (`docs/agents/source-assessment.md:67-68`) |
| P1  | Mobile target chưa chốt         | AS-IS read-only nhưng ADR-0005 mới `PROPOSED`                                                                                                                       |
| P1  | Format baseline chưa sạch       | `format:check` thất bại trên 36 file                                                                                                                                |
| P1  | Acceptance chưa đầy đủ          | Chưa chạy TypeScript E2E và Python Playwright acceptance                                                                                                            |
| P1  | Chưa thấy CI workflow           | `.github/` có 0 file; local verification/evidence là delivery contract (`source-assessment.md:49-56`)                                                               |
| P2  | Coupling/catalog chưa đồng nhất | API-to-UI dependency, module surface không đều, thiếu land event family                                                                                             |
| P2  | Tích hợp thật chưa có trong MVP | Camera/LPR, public citizen app, VietGeoX/VBDLIS và ký số là mock/adapter boundary                                                                                   |

Không giải quyết gap bằng cách sửa business requirement hoặc nới design contract
cho khớp source. Điểm mâu thuẫn cần quyết định riêng.

## 5. Kiểm chứng đã chạy

### 5.1. Lệnh và kết quả

| Lệnh                                 | Kết quả thực tế                                 | Trạng thái        |
| ------------------------------------ | ----------------------------------------------- | ----------------- |
| `npm run typecheck`                  | exit 0                                          | PASS              |
| `npm run build`                      | exit 0                                          | PASS              |
| `npm run prisma:generate`            | exit 0                                          | PASS              |
| `npm run mobile:typecheck`           | exit 0                                          | PASS              |
| `npm run mobile:test -- --runInBand` | exit 0; 17 suites, 122 tests                    | PASS              |
| `npm run lint`                       | exit 0; 3 warnings                              | PASS có cảnh báo  |
| `npm test`                           | timeout sau 120 giây; PostgreSQL không khả dụng | BLOCKED           |
| `npm run format:check`               | thất bại trên 36 file                           | FAIL              |
| `npm run test:e2e`                   | chưa chạy                                       | CHƯA CHẠY         |
| Python suite `playwright/`           | chưa chạy; Docker/PostgreSQL không khả dụng     | CHƯA CHẠY/BLOCKED |

Scripts được khai báo tại `package.json:5-25`; verify profiles fast/full/mobile tại
`package.json:27-47`. PASS độc lập không được gộp thành “verification đầy đủ”.

### 5.2. Inventory command output

```text
rg -c '^model ' prisma/schema.prisma                         -> 39
find prisma/migrations -mindepth 1 -maxdepth 1 -type d | wc -l -> 16
find src/app/api -name route.ts | wc -l                      -> 62
find src/app -name page.tsx | wc -l                          -> 28
find src/app -name layout.tsx | wc -l                        -> 7
rg --files tests -g '*.test.ts' -g '*.test.tsx' | wc -l      -> 179
```

### 5.3. Design lock output

`node scripts/check-scope.mjs verify-lock <feature>` cho kết quả:

- **PASS:** `civicos-unified-web-workspace`, `demo-seed-restart`, `ui-auto-demo`;
- **DRIFT:** `civicos-ui-design-system` (7 file), `civicos-uiux-alignment`
  (5), `demo-seed-complete` (3), `land-module` (7), `land-parcel-map` (6);
- **BLOCKED:** `civicos-e1-clone-mvp` thiếu `LOCK.json`.

`docs/agents/source-assessment.md:81-88` còn ghi nhận tham chiếu tới
`docs/agents/workflow.md` nhưng file không có trong inventory hiện tại, tài liệu
workflow cũ phủ nhận ADR dù `brain/adr/0001-land-module-boundaries.md` tồn tại,
và evidence protocol cũ khác tên convention hiện hành.

## 6. TO-BE đề xuất — chưa triển khai

### P0 — khôi phục kiểm chứng

1. Khởi động PostgreSQL/PostGIS được phê duyệt, chạy migration/seed theo README,
   rồi chạy lại `npm test` và các DB integration test.
2. Tách evidence cho unit/integration, TypeScript E2E và Python acceptance; giữ
   `BLOCKED` khác `PASS`.
3. Xác định owner của 36 file format drift trước khi format.

### P0 — reconcile contract

1. Đối chiếu từng design drift với `LOCK.json`, ticket và requirement đã xác
   nhận; chỉ sau khi owner chốt mới cập nhật lock hoặc phục hồi tài liệu.
2. Bổ sung contract hợp lệ cho `civicos-e1-clone-mvp` trước triển khai.
3. Reconcile ADR-0001, land design, source, event catalog, UI surface và
   workflow; không đánh dấu land complete chỉ vì schema/API/test tồn tại.

### P1 — mobile và coverage

1. Chấp thuận hoặc từ chối ADR-0005. Nếu chấp thuận, lập capability matrix cho
   action, Assignment, masking, Evidence/GPS, idempotency, conflict và audit.
2. Lập ma trận FR/NFR PS-E1-001…010 → source route/module → test → acceptance
   status. Mục chưa có evidence giữ là GAP/CHƯA KIỂM CHỨNG.

### P1/P2 — vận hành và cấu trúc

1. Bổ sung CI cho typecheck, lint, format, test có PostgreSQL service, build và
   các lane mobile/E2E phù hợp.
2. Tách capability metadata dùng chung khỏi UI feature registry để API không
   phụ thuộc component/navigation; đây là structural change riêng cần plan,
   ticket, test và approval.
3. Chuẩn hóa module entrypoint và error/authorization mapping sau khi có quyết
   định phạm vi.

## 7. Trạng thái bàn giao

- Báo cáo đã tạo tại root: `PROJECT_REPORT.md`.
- Production source không thay đổi trong phiên khảo sát.
- Có PASS độc lập; full web test và acceptance chưa được xác minh do dependency
  DB/môi trường.
- Cần owner/user quyết định: design lock drift, land contract, ADR-0005 và phạm
  vi xử lý format/working-tree dirty.
- Không được suy ra từ báo cáo rằng toàn bộ PS-E1 đã hoàn tất, land workflow đã
  production-ready hoặc mọi test đã pass.
