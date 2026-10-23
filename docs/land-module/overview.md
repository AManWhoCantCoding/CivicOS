# Thiết kế tính năng: land-module

## Vấn đề / Giải pháp

CivicOS cần một demo kỹ thuật cho đăng ký biến động đất đai ở một xã: API và persistence nội bộ phải chạy thật trên PostgreSQL với dữ liệu giả lập, còn adapter tới Cơ sở dữ liệu quốc gia về đất đai là mock duy nhất. Hiện trạng đã có identity, `OrganizationUnit`, `Assignment`, `Approval`, `Evidence`, event store, outbox và audit; chưa có land module, bảng land hoặc route land (`prisma/schema.prisma:10-180`, `src/modules/identity/assignments.ts:22-275`, `src/modules/eventing/event-store.ts:109-188`).

Giải pháp là tạo `src/modules/land/` với `LandChangeApplication` làm aggregate workflow, tám bảng land theo `data-model.md`, REST API nội bộ và public lookup tối thiểu. Mọi thay đổi nghiệp vụ ghi event/audit; dữ liệu party nhạy cảm được mã hóa; public response luôn gắn `simulated: true`.

**Nguồn:** Hiện trạng là “Đã có” từ các file nêu trên và `brain/domains/land/research/law-summary.md:152-161`; phần giải pháp là “Mới (xác nhận với người dùng ngày 2026-09-30, B6 Q1–Q26)”.

## Phạm vi

### Trong phạm vi

- **F-01:** CRUD nội bộ cho party và parcel; đọc `LandRight`/`LandEncumbrance` qua parcel detail; PostGIS Polygon SRID 4326; không hard-delete.
- **F-02:** Tạo, thẩm tra và đọc `LandChangeApplication` cho `transfer`, `information_update`, `mortgage`, `parcel_split_merge`.
- **F-03:** Gọi adapter mock quốc gia đồng bộ, lưu `LandNationalSync`, retry cùng `requestKey`, success/failure rõ ràng.
- **F-04:** `commune_leader` approve/reject; chỉ `completed` mới mutate quyền, thửa hoặc ràng buộc.
- **F-05:** Public lookup bằng đúng một `applicationCode` hoặc `parcelCode`, không cần session, trả dữ liệu tối thiểu và `simulated: true`.
- **F-06:** Mở rộng catalog/capability cho `land_officer`, `commune_leader`, `citizen`; dùng Assignment hiện có với task `land_review`.
- **F-07:** Upload/list Evidence P1 qua `EvidenceStorageAdapter` cho application, parcel và party bằng nested internal routes; allowlist MIME và giới hạn 10 MiB.
- **UI web:** `/land`, `/land/applications`, `/land/applications/new`, `/land/applications/{applicationId}`, `/land/parcels`, `/land/parcels/{parcelId}`, `/public/land/lookup`; leader dùng chung application detail với action theo role.
- **UI mobile read-only:** tra cứu public và đọc application/parcel summary/timeline không có write flow.
- **Nguồn:** “Mới (xác nhận với người dùng ngày 2026-09-30, feature-list.md và B6 Q1–Q27; UI scope chốt sau đó)”.

### NGOÀI phạm vi

- Kết nối thật với Cơ sở dữ liệu quốc gia về đất đai, thuế, công chứng hoặc ngân hàng.
- Dữ liệu cá nhân thật, public map/polygon, chữ ký điện tử, quyết định hành chính hoặc Giấy chứng nhận có giá trị pháp lý.
- Legal-rule versioning, thanh tra, quy hoạch, định giá đất, cloud/thuê dịch vụ và xác định cấp độ an toàn thông tin chính thức.
- Mobile không có write flow; không có public map/polygon hoặc Evidence upload trên mobile.
- Chi tiết visual/component/loading/error/empty state được tạo ở B7 trong `.scratch/land-module/ui/`; không làm ticket UI trước khi có report `ui-ux`.
- **Nguồn:** “Mới (xác nhận với người dùng ngày 2026-09-30)” và `brain/domains/land/research/law-summary.md:148-161`.

## Bản đồ module

| Module                                                                            | Trạng thái                          | Nguồn                                                                                       | Ghi chú                                                                                          |
| --------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `src/modules/identity`                                                            | Đã có                               | `src/modules/identity/session.ts:43-52`; `src/modules/identity/authorization.ts:108-120`    | Tái sử dụng session, role, capability và scope đơn vị; mở rộng catalog land.                     |
| `src/modules/identity/assignments.ts`                                             | Đã có                               | `src/modules/identity/assignments.ts:22-275`                                                | Tái sử dụng Assignment; thêm task `land_review` và quyền `commune_leader`.                       |
| `src/modules/eventing`                                                            | Đã có                               | `src/modules/eventing/event-store.ts:109-188`; `prisma/schema.prisma:82-122`                | Event bất biến và outbox trong transaction.                                                      |
| `src/modules/platform/evidence`                                                   | Đã có                               | `src/modules/platform/evidence/storage-adapter.ts:11-19,41-80`                              | Tái sử dụng storage adapter, hash và immutable metadata.                                         |
| `src/modules/land`                                                                | Mới                                 | “Mới (xác nhận với người dùng ngày 2026-09-30)”                                             | Aggregate, commands, queries, mock adapter và SQL geometry seam.                                 |
| `src/app/api/land`                                                                | Mới                                 | “Mới (xác nhận với người dùng ngày 2026-09-30, B6 Q12)”                                     | Route nội bộ theo `api-contract.md`.                                                             |
| `src/app/api/public/land/lookup`                                                  | Mới                                 | “Mới (xác nhận với người dùng ngày 2026-09-30, B6 Q12/Q24)”                                 | Route read-only không session.                                                                   |
| `src/app/api/identity/assignments`                                                | Đã có                               | `src/app/api/identity/assignments/route.ts:11-105`                                          | Không tạo route Assignment mới; mở rộng policy cho land.                                         |
| `prisma/schema.prisma`                                                            | Đã có                               | `prisma/schema.prisma:5-180`                                                                | Bảng dùng lại; tám bảng mới và PostGIS theo `data-model.md`.                                     |
| PostgreSQL image                                                                  | Đã có nhưng cần thay đổi triển khai | `docker-compose.yml:1-12`                                                                   | Bổ sung PostGIS trước migration; không sửa trong design lock này.                                |
| `src/components/shell/ModuleShell.tsx` và `src/components/shell/ModuleStatus.tsx` | Đã có                               | `src/components/shell/ModuleShell.tsx:71-330`; `src/components/shell/ModuleStatus.tsx:5-61` | Tái sử dụng navigation, breadcrumb, loading/error/empty/offline cho web land.                    |
| `src/app/land/**`                                                                 | Mới                                 | “Mới (xác nhận với người dùng ngày 2026-09-30, UI route B7)”                                | Web workspace, applications, parcels và detail theo screen brief.                                |
| `src/app/public/land/lookup/**`                                                   | Mới                                 | “Mới (xác nhận với người dùng ngày 2026-09-30, UI route B7)”                                | Web public lookup, không session.                                                                |
| `mobile/src/features/land/**`                                                     | Mới                                 | “Mới (xác nhận với người dùng ngày 2026-09-30, mobile UI B7)”                               | Read-only lookup/application/parcel; tái sử dụng `StateMessage`, `OfflineBanner`, `MaskedValue`. |

## Luồng chính (kèm nhánh lỗi)

1. `land_officer` tạo/đọc party và parcel trong `OrganizationUnit`; party được mã hóa và parcel phải là Polygon hợp lệ SRID 4326.
2. `land_officer` tạo application với `Idempotency-Key`; hệ thống tạo `submitted`, lưu links party/parcel, event và audit.
3. `commune_leader` dùng Assignment hiện có để giao task `land_review`; officer có Assignment active thẩm tra `submitted → in_review`.
4. Officer gọi sync; hệ thống tạo `LandNationalSync`, gọi adapter mock đồng bộ, rồi chuyển `sync_succeeded` hoặc `sync_failed`.
   - Nếu payload/fixture lỗi: giữ application `sync_failed`, không tạo approval và không mutate land aggregate.
   - Nếu retry: dùng cùng `requestKey`, tăng `attempts`, không tạo application hoặc sync operation trùng.
5. Khi sync thành công, application chuyển `sync_succeeded → pending_approval`; `commune_leader` approve hoặc reject.
   - Approve: trong một transaction chuyển `completed`, cập nhật quyền/thửa/ràng buộc và ghi Approval, EventRecord, AuditEvent.
   - Reject: bắt buộc reason, chuyển `rejected`, không cập nhật quyền/thửa/ràng buộc.
6. Public client gọi lookup bằng đúng một mã; query chỉ đọc, không giải mã party, không trả polygon, evidence hoặc sync payload.
7. Officer có Assignment hoặc leader cùng đơn vị đọc parcel detail, timeline và Evidence; public web/mobile chỉ dùng lookup projection, không truy cập các resource nội bộ.
8. Web UI điều hướng qua ModuleShell; mobile dùng state surface hiện có và chỉ cho read-only. Loading/error/empty/forbidden/offline/masked là các trạng thái bắt buộc của screen brief B7.

**Nguồn:** Trạng thái và điều kiện nền từ `docs/land-module/data-model.md:215-244`; actor/route là “Mới (xác nhận với người dùng ngày 2026-09-30, B6 Q3/Q4/Q12/Q22)”.

## Quy tắc nghiệp vụ & máy trạng thái

Các quy tắc chi tiết nằm ở `domain-rules.md` với mã DR-01 đến DR-22. Máy trạng thái chính:

```text
submitted ──review──> in_review ──sync──> sync_pending
    │                    │                    ├──success──> sync_succeeded ──> pending_approval
    └────reject───────────┘                    └──failure───> sync_failed ──retry──> sync_pending
submitted/in_review/pending_approval ──reject──> rejected
pending_approval ──approve──> completed
completed, rejected: terminal
```

Chỉ `completed` được mutate `LandRight`, `LandParcel` hoặc `LandEncumbrance`; mọi mutation land có EventRecord và AuditEvent cùng transaction. **Nguồn:** “Mới (xác nhận với người dùng ngày 2026-09-30)” và data model đã khóa ở B4.5.

## Quyết định kỹ thuật

- `LandChangeApplication` là aggregate workflow; boundary và transaction rule nằm trong `brain/adr/0001-land-module-boundaries.md`.
- Adapter mock quốc gia là integration seam thay thế được; không nhận outcome mô phỏng từ client.
- Geometry dùng PostGIS `geometry(Polygon,4326)` và SQL parameterized seam; API nhận GeoJSON Polygon.
- API dùng error code ổn định `LAND_*` và message tiếng Việt; field `error` là message, field `code` là mã.
- API dùng cursor pagination với default `50`, max `100`; mutation dùng `Idempotency-Key` và `If-Match-Version`.
- Web dùng ModuleShell/ModuleStatus hiện có; mobile dùng `StateMessage`, `OfflineBanner`, `MaskedValue`; không tạo design system hoặc write flow mobile mới.
- **Nguồn:** các quyết định trên là “Mới (xác nhận với người dùng ngày 2026-09-30, B6 Q1–Q27 và UI scope)”; convention API và event/audit là “Đã có” từ các file bản đồ module.

## Seam kiểm thử

| Seam                                    | Assertion chính                                                                                          | Nguồn                                                                                          |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `LandChangeApplication` command service | Transition ngoài máy trạng thái bị từ chối; version tăng đúng một lần.                                   | Mới, tham chiếu `data-model.md:215-235`.                                                       |
| `NationalLandAdapter`                   | Fixture success/failure; retry cùng request key; không gọi network thật.                                 | Mới, B6 Q4/Q14.                                                                                |
| `LandGeometryRepository`                | Polygon invalid/SRID sai bị từ chối; Polygon hợp lệ ghi/đọc được.                                        | Mới, B6 Q20 và `data-model.md:75`.                                                             |
| Party privacy seam                      | DB chỉ giữ ciphertext; identity index không trả plaintext; response mask identity number.                | Đã có encryption seam `src/modules/identity/encryption.ts:18-50`; hành vi land mới.            |
| Assignment policy                       | Leader giao được `land_review`; officer không có Assignment bị 403; revoke chặn thao tác mới.            | Đã có `src/modules/identity/assignments.ts:22-104,180-237`; mở rộng role land là mới.          |
| Transaction event/audit                 | Mutation completed/rejected/sync/approval tạo row event/audit đồng bộ; rollback không để row nửa chừng.  | Đã có `src/modules/identity/audit.ts:24-77` và `src/modules/eventing/event-store.ts:109-188`.  |
| Public lookup                           | Một mã trả đúng 8 trường lookup và `simulated=true`; không trả PII/polygon/sync/evidence.                | Mới, B6 Q6/Q24.                                                                                |
| Evidence adapter                        | MIME/size allowlist; hash SHA-256; immutable metadata; không lộ storageKey.                              | Đã có `src/modules/platform/evidence/storage-adapter.ts:11-19,46-67`; giới hạn mới B6 Q16/Q23. |
| Web screen states                       | Mỗi route có loading/error/empty/forbidden/offline phù hợp; action approve/reject chỉ visible theo role. | Đã có state components; UI behavior mới B7.                                                    |
| Mobile read-only states                 | Lookup/application/parcel có loading/empty/error/forbidden/masked/offline; không có mutation control.    | Đã có `mobile/src/components/States.tsx:4-52`; UI flow mới B7.                                 |

## Nhật ký thay đổi

| Ngày       | Đổi gì                                                                                                                                                         | Lý do                                                                                                                                   | Người xác nhận                                    |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 2026-09-30 | Tạo bộ design B6, giữ nguyên `data-model.md` đã khóa ở B4.5; bổ sung UI web/mobile và route/screen inventory.                                                  | Người dùng xác nhận cần web cán bộ, web lãnh đạo, web public, quản lý parcel/party và mobile read-only.                                 | Người dùng                                        |
| 2026-09-30 | Bổ sung nested Evidence routes cho application, parcel và party; dùng cùng policy multipart, MIME/size, SHA-256, immutable metadata và không trả `storageKey`. | Làm rõ F-07 sau khi phát hiện feature-list/data-model đã cho phép resource polymorphic nhưng API mới chỉ có application Evidence route. | Người dùng xác nhận qua hội thoại ngày 2026-09-30 |
