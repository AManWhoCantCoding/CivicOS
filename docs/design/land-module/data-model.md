# Mô hình dữ liệu: land-module

- **Ngày lập:** 2026-09-30.
- **Bước workflow:** B4.5 — thiết kế database.
- **Trạng thái:** Bản đề xuất để người dùng duyệt; chưa chạy lệnh khóa.
- **Mục tiêu mô hình:** hỗ trợ demo một xã với dữ liệu giả lập; module và persistence nội bộ ghi dữ liệu thật vào PostgreSQL; chỉ adapter kết nối Cơ sở dữ liệu quốc gia về đất đai là mock.

## 1. Nguồn và quyết định đầu vào

| Hạng mục | Quyết định | Nguồn |
|---|---|---|
| PostgreSQL | Datasource hiện có dùng provider `postgresql` và `DATABASE_URL`. | Đã có (`prisma/schema.prisma:5-8`). |
| Identity và tổ chức | Tái sử dụng `User`, `Role`, `UserRole`, `OrganizationUnit`; `User.organizationUnitId` là phạm vi đơn vị hiện có. | Đã có (`prisma/schema.prisma:10-48`, `src/modules/identity/session.ts:16-29`). |
| Audit và event | Mutation nghiệp vụ ghi `AuditEvent` và `EventRecord` trong cùng transaction; `EventRecord` phát sinh `OutboxMessage`. | Đã có (`prisma/schema.prisma:82-122,145-158`, `src/modules/identity/audit.ts:12-78`, `src/modules/eventing/event-store.ts:109-188`). |
| Tài liệu/bằng chứng | Tái sử dụng `Evidence` theo cặp `resourceType`/`resourceId`, giữ `immutable=true` mặc định. | Đã có (`prisma/schema.prisma:160-180`, `src/modules/platform/evidence/storage-adapter.ts:11-19`). |
| Loại biến động | Demo hỗ trợ chuyển quyền, đổi thông tin, đăng ký thế chấp, tách/hợp thửa. | Mới (xác nhận với người dùng ngày 2026-09-30). |
| Luồng hồ sơ | `submitted → in_review → sync_pending → sync_succeeded → pending_approval → completed`; có nhánh `rejected` và `sync_failed`. Lãnh đạo duyệt sau khi mock đồng bộ thành công. | Mới (xác nhận với người dùng ngày 2026-09-30; tên trạng thái là đề xuất kỹ thuật B4.5). |
| Tra cứu công khai | Tra theo `applicationCode` hoặc `parcelCode`; chỉ trả dữ liệu tối thiểu, không trả thông tin nhận diện. | Mới (xác nhận với người dùng ngày 2026-09-30; tập trường trả về là đề xuất kỹ thuật B4.5). |
| Chủ thể đất đai | Tạo mô hình `LandParty` riêng, không tái sử dụng `User` hoặc `Subject` cho chủ thể quyền đất đai. | Mới (xác nhận với người dùng ngày 2026-09-30). |
| Hình học thửa đất | Lưu polygon bằng PostGIS; hệ thống hiện tại phải chuyển từ image `postgres:16-alpine` sang PostgreSQL 16 có extension PostGIS trước khi migrate. | Mới (xác nhận với người dùng ngày 2026-09-30); hiện trạng image đọc từ `docker-compose.yml:1-12`. |
| Role module | Bổ sung các role `land_officer`, `commune_leader`, `citizen` vào catalog `Role`; tra cứu công khai không bắt buộc session. | Mới (xác nhận với người dùng ngày 2026-09-30). |
| Quy ước enum | Dùng `String` + SQL `CHECK` thay vì Prisma enum, phù hợp các model hiện có. | Đã có (đối chiếu `prisma/schema.prisma:238-529` và migration `prisma/migrations/20260923090000_ps_e1004_resident_management/migration.sql:81-100`). |
| ID và concurrency | Model mới dùng `String @id @default(cuid())`, timestamp `createdAt`/`updatedAt`, và `version` cho aggregate có mutation cạnh tranh. | Đã có (đối chiếu `prisma/schema.prisma:10-18,282-300,352-372,471-488`). |

## 2. Bảng hiện có được tái sử dụng

Các bảng dưới đây không tạo lại. Cột và ràng buộc hiện có là nguồn sự thật; feature chỉ dùng chúng theo resource type đã nêu.

| Bảng | Cột/ràng buộc liên quan | Cách dùng trong land-module | Nguồn |
|---|---|---|---|
| `User` | `id String PK`; `email String UNIQUE`; `name String NULL`; `organizationUnitId String NULL`; `active Boolean DEFAULT true`; timestamp. | `LandChangeApplication.createdById` tham chiếu logic tới user cán bộ; actor của audit/event lấy từ session hiện có. | Đã có (`prisma/schema.prisma:10-22`). |
| `Role` | `id String PK`; `name String UNIQUE`; `description String NULL`. | Migration upsert `land_officer`, `commune_leader`, `citizen`; code authorization mở rộng catalog và capability ở phase triển khai. | Đã có (`prisma/schema.prisma:24-29`, `prisma/migrations/20260922_identity_role_catalog/migration.sql:1-10`). |
| `UserRole` | Composite PK `(userId, roleId)`; cả hai FK `ON DELETE CASCADE`. | Gắn role đất đai cho user nội bộ; `citizen` không cần để dùng public lookup. | Đã có (`prisma/schema.prisma:31-38`). |
| `OrganizationUnit` | `id String PK`; `name`; `level`; `parentId String NULL`; `active`; timestamp. | `organizationId` của hồ sơ và thửa đất tham chiếu logic tới đơn vị một xã; không hard-code tên xã trong bảng mới. | Đã có (`prisma/schema.prisma:40-48`, `src/modules/identity/local-provider.ts:28-55`). |
| `Assignment` | `resourceType`; `resourceId`; `task`; `assigneeUserId`; `grantedById`; `organizationId`; `status`; revoke fields; indexes resource/status và assignee/status. | Phân công `LandChangeApplication` cho cán bộ bằng resource type polymorphic; task mới `land_intake` và `land_review` được thêm ở phase authorization. | Đã có (`prisma/schema.prisma:50-69`, `src/modules/identity/authorization.ts:65-105`). |
| `Approval` | `resourceType`; `resourceId`; `action`; `status`; `organizationId`; `requestedById`; `decidedById`; `reason`; `payload`; requested/decided timestamps; unique `(resourceType,resourceId,action,status)`. | Lưu yêu cầu/quyết định của `commune_leader` cho `resourceType='LandChangeApplication'`, `action='approve'`; không tạo bảng approval riêng. | Đã có (`prisma/schema.prisma:302-318`, `src/modules/incidents/commands.ts:1981-1992`). |
| `EventRecord` | `eventId UNIQUE`; `eventType`; aggregate type/id/version; actor snapshot; organization; JSON payload/metadata; unique aggregate version. | Lưu lịch sử bất biến của `LandChangeApplication`, `LandParcel`, `LandRight`, `LandEncumbrance`; dùng optimistic concurrency qua aggregate version. | Đã có (`prisma/schema.prisma:82-105`, `src/modules/eventing/event-store.ts:109-179`). |
| `OutboxMessage` | `eventId UNIQUE`; status/attempts/availableAt/processedAt/deadLetterAt; FK tới `EventRecord ON DELETE CASCADE`. | Phát hành event sau mutation land trong transaction; worker xử lý theo outbox hiện có. | Đã có (`prisma/schema.prisma:107-122`). |
| `AuditEvent` | `actorId`; `resourceType`; `resourceId`; `operation`; `reason`; `correlationId`; `metadata`; `occurredAt`; indexes resource và actor. | Audit đọc, sửa, duyệt, tra cứu nội bộ và gọi mock national DB; metadata không chứa plaintext của trường mã hóa. | Đã có (`prisma/schema.prisma:145-158`, `src/modules/identity/audit.ts:24-57`). |
| `Evidence` | `resourceType`; `resourceId`; `storageKey`; hash; MIME/file metadata; immutable; unique `(resourceType,resourceId,originalHash)`. | Gắn hồ sơ, thửa đất hoặc party bằng resource type; không tạo `LandAttachment`. | Đã có (`prisma/schema.prisma:160-180`). |

## 3. Bảng mới

### 3.1 `LandParty`

Đại diện người hoặc tổ chức có quyền/nghĩa vụ liên quan đến thửa đất. Tên và số định danh không được lưu plaintext vì đây là dữ liệu cá nhân hoặc dữ liệu nhận diện của tổ chức.

| Cột | Kiểu, null, mặc định | PK/unique/index/ràng buộc | Hành vi | Nguồn |
|---|---|---|---|---|
| `id` | `String NOT NULL DEFAULT cuid()` | PK | Định danh party nội bộ. | Mới (đề xuất kỹ thuật B4.5, theo convention `prisma/schema.prisma:10-18`). |
| `referenceCode` | `String NOT NULL` | UNIQUE | Mã nội bộ không chứa thông tin nhận diện, dùng trong dữ liệu giả lập và quan hệ nghiệp vụ. | Mới (đề xuất kỹ thuật B4.5). |
| `partyType` | `String NOT NULL` | CHECK `individual` hoặc `organization`; index cùng `status`. | Phân biệt cá nhân và tổ chức. | Mới (đề xuất B4.5, tham chiếu nhóm party của LADM tại `docs/research/land-module/law-intl.md:10-17`). |
| `displayNameCiphertext` | `String NOT NULL` | Không index plaintext | Ciphertext tạo bằng `encryptSensitive`; chỉ giải mã ở seam được cấp quyền. | Mới (đề xuất B4.5, dùng seam đã có `src/modules/identity/encryption.ts:18-50`). |
| `identityNumberCiphertext` | `String NULL` | Không index plaintext | Số giấy tờ giả lập được mã hóa; null cho tổ chức hoặc party chưa có dữ liệu giấy tờ. | Mới (đề xuất B4.5, theo nguyên tắc dữ liệu giả lập và tối thiểu hóa tại `docs/research/land-module/law-summary.md:53-65`). |
| `identityNumberIndex` | `String NULL` | UNIQUE partial index khi khác null | Blind index để chống tạo trùng mà không lưu plaintext. | Mới (đề xuất B4.5, dùng `blindIndex` tại `src/modules/identity/encryption.ts:48-50`). |
| `status` | `String NOT NULL DEFAULT 'active'` | CHECK `active` hoặc `archived`; index `(partyType,status)`. | Không hard-delete party đã được dùng trong quyền hoặc hồ sơ; archive khi không còn dùng. | Mới (đề xuất B4.5, retention theo `docs/research/land-module/law-summary.md:123-146`). |
| `createdAt` | `DateTime NOT NULL DEFAULT now()` | — | Thời điểm tạo row. | Đã có (đối chiếu convention `prisma/schema.prisma:10-18`). |
| `updatedAt` | `DateTime NOT NULL @updatedAt` | — | Thời điểm cập nhật row. | Đã có (đối chiếu convention `prisma/schema.prisma:10-18`). |

### 3.2 `LandParcel`

Đại diện thửa đất trong phạm vi xã demo. `geometry` là polygon PostGIS hệ tọa độ WGS84; không suy diễn polygon từ point.

| Cột | Kiểu, null, mặc định | PK/unique/index/ràng buộc | Hành vi | Nguồn |
|---|---|---|---|---|
| `id` | `String NOT NULL DEFAULT cuid()` | PK | Định danh ổn định của thửa trong module. | Mới (đề xuất kỹ thuật B4.5). |
| `parcelCode` | `String NOT NULL` | UNIQUE | Mã thửa dùng cho tra cứu công khai và liên kết với mock national DB. | Mới (đề xuất B4.5, xác nhận tra cứu theo `parcelCode` ngày 2026-09-30). |
| `mapSheetNumber` | `String NOT NULL` | Composite index cùng `parcelNumber` và `organizationId`. | Số tờ bản đồ. | Mới (đề xuất B4.5, nhóm dữ liệu địa chính theo `docs/research/land-module/law-vn.md:13-17`). |
| `parcelNumber` | `String NOT NULL` | Composite index cùng `mapSheetNumber` và `organizationId`. | Số thửa. | Mới (đề xuất B4.5, nhóm dữ liệu địa chính theo `docs/research/land-module/law-vn.md:13-17`). |
| `areaSqm` | `Decimal NOT NULL` | CHECK `areaSqm > 0`; precision triển khai `DECIMAL(14,2)`. | Diện tích nghiệp vụ; không thay bằng diện tích tự tính từ geometry. | Mới (đề xuất B4.5). |
| `landUseType` | `String NOT NULL` | CHECK chỉ nhận catalog loại đất được module cấu hình. | Loại sử dụng đất hiện tại. | Mới (đề xuất B4.5, quy định dữ liệu đất đai tại `docs/research/land-module/law-summary.md:11-22`). |
| `address` | `String NOT NULL` | Index phục vụ tra cứu nội bộ, không trả đầy đủ ở public lookup nếu chưa cần. | Địa chỉ mô tả thửa trong xã demo. | Mới (đề xuất B4.5). |
| `communeCode` | `String NOT NULL` | Index `(communeCode,status)` | Mã xã; dữ liệu demo chỉ có một xã nhưng không hard-code tên trong code. | Mới (đề xuất B4.5, phạm vi một xã do người dùng xác nhận ngày 2026-09-30). |
| `organizationId` | `String NOT NULL` | Index `(organizationId,status)`; tham chiếu logic tới `OrganizationUnit.id`. | Ràng buộc phạm vi đơn vị quản lý. | Mới (đề xuất B4.5, theo convention `Establishment.organizationId` tại `prisma/schema.prisma:320-338`). |
| `geometry` | `Unsupported("geometry(Polygon,4326)") NOT NULL` | PostGIS GiST index; CHECK `ST_IsValid(geometry)` và `ST_SRID(geometry)=4326`. | Polygon thửa đất; đọc/ghi qua raw SQL seam vì Prisma không ánh xạ trực tiếp geometry. | Mới (xác nhận lưu polygon ngày 2026-09-30; kiểu và SRID là đề xuất kỹ thuật B4.5). |
| `nationalRecordRef` | `String NULL` | Index khi khác null | Mã bản ghi trả về từ mock CSDL quốc gia; null trước lần sync thành công. | Mới (đề xuất B4.5, mock duy nhất theo `docs/research/land-module/law-summary.md:148-161`). |
| `status` | `String NOT NULL DEFAULT 'active'` | CHECK `proposed`, `active`, `retired`; index `(organizationId,status)`. | `proposed` cho thửa kết quả tách/hợp trước khi hoàn tất; `retired` không xóa row cũ. | Mới (đề xuất B4.5, retention theo `docs/research/land-module/law-summary.md:139-146`). |
| `version` | `Int NOT NULL DEFAULT 1` | — | Optimistic concurrency khi cập nhật thông tin hoặc hoàn tất split/merge. | Đã có (đối chiếu `prisma/schema.prisma:282-300,352-372`). |
| `createdAt` | `DateTime NOT NULL DEFAULT now()` | — | Thời điểm tạo row. | Đã có (đối chiếu convention `prisma/schema.prisma:10-18`). |
| `updatedAt` | `DateTime NOT NULL @updatedAt` | — | Thời điểm cập nhật row. | Đã có (đối chiếu convention `prisma/schema.prisma:10-18`). |

Ràng buộc duy nhất của thửa là `(organizationId, mapSheetNumber, parcelNumber)`; `parcelCode` vẫn unique toàn module để public lookup không mơ hồ.

### 3.3 `LandRight`

Biểu diễn quan hệ nhiều-nhiều giữa `LandParty` và `LandParcel`, theo nhóm quyền/chủ thể/đơn vị không gian của LADM nhưng giữ semantics đất đai Việt Nam.

| Cột | Kiểu, null, mặc định | PK/unique/index/ràng buộc | Hành vi | Nguồn |
|---|---|---|---|---|
| `id` | `String NOT NULL DEFAULT cuid()` | PK | Định danh phiên bản quyền. | Mới (đề xuất kỹ thuật B4.5). |
| `parcelId` | `String NOT NULL` | FK `LandParcel.id` `ON DELETE RESTRICT`; index `(parcelId,status)`. | Không cho xóa thửa khi còn quyền. | Mới (đề xuất B4.5; quan hệ parcel từ LADM `docs/research/land-module/law-intl.md:10-17`). |
| `partyId` | `String NOT NULL` | FK `LandParty.id` `ON DELETE RESTRICT`; index `(partyId,status)`. | Không cho xóa party đã có quyền. | Mới (đề xuất B4.5). |
| `rightType` | `String NOT NULL DEFAULT 'land_use_right'` | CHECK `land_use_right`; mở rộng bằng migration riêng. | Phân biệt loại quyền mà module demo quản lý. | Mới (đề xuất B4.5, căn cứ phạm vi quyền sử dụng đất tại `docs/research/land-module/law-vn.md:13-17`). |
| `sharePercent` | `Decimal NOT NULL DEFAULT 100` | CHECK `sharePercent > 0 AND sharePercent <= 100`; precision `DECIMAL(5,2)`. | Tỷ lệ quyền của party; tổng active của một thửa được kiểm tra trong transaction. | Mới (đề xuất B4.5). |
| `status` | `String NOT NULL DEFAULT 'active'` | CHECK `active` hoặc `ended`. | Quyền cũ chuyển `ended`, không bị xóa khi chuyển quyền. | Mới (đề xuất B4.5, retention theo `docs/research/land-module/law-summary.md:123-146`). |
| `validFrom` | `DateTime NOT NULL` | — | Thời điểm quyền có hiệu lực trong dữ liệu demo. | Mới (đề xuất B4.5). |
| `validTo` | `DateTime NULL` | CHECK null hoặc `validTo > validFrom`. | Điền khi quyền kết thúc. | Mới (đề xuất B4.5). |
| `sourceApplicationId` | `String NULL` | Logical reference tới `LandChangeApplication.id`; index. | Hồ sơ làm phát sinh hoặc kết thúc quyền. | Mới (đề xuất B4.5). |
| `createdAt` | `DateTime NOT NULL DEFAULT now()` | — | Thời điểm tạo row. | Đã có (đối chiếu convention `prisma/schema.prisma:10-18`). |
| `updatedAt` | `DateTime NOT NULL @updatedAt` | — | Thời điểm cập nhật row. | Đã có (đối chiếu convention `prisma/schema.prisma:10-18`). |

### 3.4 `LandEncumbrance`

Lưu trạng thái ràng buộc thế chấp hiện tại/lịch sử để loại biến động đăng ký thế chấp không bị biến thành JSON không có quan hệ.

| Cột | Kiểu, null, mặc định | PK/unique/index/ràng buộc | Hành vi | Nguồn |
|---|---|---|---|---|
| `id` | `String NOT NULL DEFAULT cuid()` | PK | Định danh ràng buộc. | Mới (đề xuất kỹ thuật B4.5). |
| `parcelId` | `String NOT NULL` | FK `LandParcel.id` `ON DELETE RESTRICT`; index `(parcelId,status)`. | Gắn ràng buộc với thửa. | Mới (đề xuất B4.5). |
| `securedPartyId` | `String NULL` | FK `LandParty.id` `ON DELETE RESTRICT`; index. | Party nhận bảo đảm; null khi dữ liệu mock không có party đối tác. | Mới (đề xuất B4.5). |
| `encumbranceType` | `String NOT NULL DEFAULT 'mortgage'` | CHECK `mortgage`. | Loại ràng buộc trong scope hiện tại. | Mới (xác nhận loại đăng ký thế chấp ngày 2026-09-30). |
| `status` | `String NOT NULL DEFAULT 'active'` | CHECK `active` hoặc `released`; index `(parcelId,status)`. | Hồ sơ release chuyển row sang `released`, không xóa. | Mới (đề xuất B4.5). |
| `externalReference` | `String NULL` | Index khi khác null | Mã tham chiếu do mock national DB trả về. | Mới (đề xuất B4.5). |
| `registeredAt` | `DateTime NOT NULL` | — | Thời điểm ghi nhận thế chấp. | Mới (đề xuất B4.5). |
| `releasedAt` | `DateTime NULL` | CHECK null khi active, not null khi released. | Thời điểm giải chấp. | Mới (đề xuất B4.5). |
| `sourceApplicationId` | `String NOT NULL` | Logical reference tới `LandChangeApplication.id`; index. | Hồ sơ tạo hoặc giải chấp ràng buộc. | Mới (đề xuất B4.5). |
| `createdAt` | `DateTime NOT NULL DEFAULT now()` | — | Thời điểm tạo row. | Đã có (đối chiếu convention `prisma/schema.prisma:10-18`). |
| `updatedAt` | `DateTime NOT NULL @updatedAt` | — | Thời điểm cập nhật row. | Đã có (đối chiếu convention `prisma/schema.prisma:10-18`). |

### 3.5 `LandChangeApplication`

Aggregate chính của quy trình đăng ký biến động. Các quan hệ party/thửa nằm ở hai bảng liên kết để một hồ sơ có thể mô tả chuyển quyền hoặc tách/hợp nhiều thửa.

| Cột | Kiểu, null, mặc định | PK/unique/index/ràng buộc | Hành vi | Nguồn |
|---|---|---|---|---|
| `id` | `String NOT NULL DEFAULT cuid()` | PK | Aggregate ID dùng trong event/audit/approval. | Mới (đề xuất kỹ thuật B4.5). |
| `applicationCode` | `String NOT NULL` | UNIQUE; public lookup key. | Mã hồ sơ có thể chia sẻ cho công dân tra cứu. | Mới (đề xuất B4.5, xác nhận tra cứu theo mã hồ sơ ngày 2026-09-30). |
| `organizationId` | `String NOT NULL` | Index `(organizationId,status)`; logical reference tới `OrganizationUnit.id`. | Giới hạn hồ sơ ở xã demo. | Mới (đề xuất B4.5). |
| `changeType` | `String NOT NULL` | CHECK `transfer`, `information_update`, `mortgage`, `parcel_split_merge`; index `(changeType,status)`. | Phân loại bốn loại biến động đã chốt. | Mới (xác nhận với người dùng ngày 2026-09-30; mã kỹ thuật cụ thể là đề xuất B4.5). |
| `status` | `String NOT NULL DEFAULT 'submitted'` | CHECK `submitted`, `in_review`, `sync_pending`, `sync_succeeded`, `sync_failed`, `pending_approval`, `rejected`, `completed`; index `(organizationId,status,updatedAt)`. | Máy trạng thái tại mục 6. | Mới (xác nhận luồng lãnh đạo duyệt ngày 2026-09-30; mã trạng thái là đề xuất B4.5). |
| `changePayload` | `Json NOT NULL` | JSON shape được cố định theo `changeType`; không chứa party/parcel ID thay cho FK. | Chứa thuộc tính thay đổi không có quan hệ: `information_update.field/newValue`, `mortgage.action`, `parcel_split_merge.operation`, và tham số share của transfer. | Mới (đề xuất B4.5). |
| `createdById` | `String NOT NULL` | Logical reference tới `User.id`; index `(createdById,createdAt)`. | Cán bộ tạo/tiếp nhận hồ sơ; không phải chủ thể đất đai. | Mới (đề xuất B4.5, actor hiện có tại `src/modules/identity/session.ts:43-52`). |
| `idempotencyKey` | `String NULL` | UNIQUE partial index khi khác null. | Retry cùng command không tạo hồ sơ thứ hai. | Mới (đề xuất B4.5, theo pattern `IntakeReport.idempotencyKey` tại `prisma/schema.prisma:238-268`). |
| `version` | `Int NOT NULL DEFAULT 1` | — | Optimistic concurrency khi transition hoặc cập nhật payload. | Đã có (đối chiếu `prisma/schema.prisma:282-300,352-372`). |
| `submittedAt` | `DateTime NOT NULL DEFAULT now()` | Index | Mốc tiếp nhận hồ sơ. | Mới (đề xuất B4.5). |
| `completedAt` | `DateTime NULL` | CHECK chỉ điền khi `status='completed'`. | Mốc hoàn tất sau approval. | Mới (đề xuất B4.5). |
| `rejectionReason` | `String NULL` | — | Lý do nghiệp vụ khi review hoặc leader reject; không chứa thông tin định danh chưa mã hóa. | Mới (đề xuất B4.5). |
| `createdAt` | `DateTime NOT NULL DEFAULT now()` | — | Thời điểm tạo row. | Đã có (đối chiếu convention `prisma/schema.prisma:10-18`). |
| `updatedAt` | `DateTime NOT NULL @updatedAt` | — | Thời điểm cập nhật row. | Đã có (đối chiếu convention `prisma/schema.prisma:10-18`). |

`changePayload` dùng các shape sau; ID party/thửa bắt buộc nằm ở bảng liên kết:

| `changeType` | Shape tối thiểu của `changePayload` | Nguồn |
|---|---|---|
| `transfer` | `{ "shareChanges": [{ "partyRole": "proposed_holder", "sharePercent": number }] }` | Mới (đề xuất B4.5). |
| `information_update` | `{ "field": "address" | "landUseType", "newValue": string }` | Mới (đề xuất B4.5; field giới hạn để tránh mutation tùy ý). |
| `mortgage` | `{ "action": "register" | "release" }` | Mới (xác nhận đăng ký thế chấp ngày 2026-09-30; shape là đề xuất B4.5). |
| `parcel_split_merge` | `{ "operation": "split" | "merge" }` | Mới (xác nhận tách/hợp thửa ngày 2026-09-30; shape là đề xuất B4.5). |

### 3.6 `LandApplicationParty`

Bảng liên kết party với hồ sơ, cho phép một hồ sơ có nhiều bên chuyển quyền hoặc bên nhận bảo đảm.

| Cột | Kiểu, null, mặc định | PK/unique/index/ràng buộc | Hành vi | Nguồn |
|---|---|---|---|---|
| `applicationId` | `String NOT NULL` | Composite PK với `partyId` và `partyRole`; FK `LandChangeApplication.id` `ON DELETE RESTRICT`. | Hồ sơ không bị xóa khi đã có party. | Mới (đề xuất B4.5). |
| `partyId` | `String NOT NULL` | Composite PK; FK `LandParty.id` `ON DELETE RESTRICT`; index `(partyId,partyRole)`. | Party tham gia hồ sơ. | Mới (đề xuất B4.5). |
| `partyRole` | `String NOT NULL` | CHECK `applicant`, `current_holder`, `proposed_holder`, `secured_party`, `representative`. | Ràng buộc vai trò party theo từng hồ sơ. | Mới (đề xuất B4.5, party/role theo LADM tại `docs/research/land-module/law-intl.md:10-17`). |
| `sharePercent` | `Decimal NULL` | CHECK null hoặc `>0 AND <=100`; precision `DECIMAL(5,2)`. | Tỷ lệ mới của `proposed_holder` khi transfer; null với role khác. | Mới (đề xuất B4.5). |
| `createdAt` | `DateTime NOT NULL DEFAULT now()` | — | Thời điểm gắn party vào hồ sơ. | Đã có (đối chiếu convention `prisma/schema.prisma:10-18`). |

### 3.7 `LandApplicationParcel`

Bảng liên kết hồ sơ với thửa, hỗ trợ một thửa cho transfer/update/mortgage và nhiều thửa nguồn/kết quả cho split/merge.

| Cột | Kiểu, null, mặc định | PK/unique/index/ràng buộc | Hành vi | Nguồn |
|---|---|---|---|---|
| `applicationId` | `String NOT NULL` | Composite PK với `parcelId` và `parcelRole`; FK `LandChangeApplication.id` `ON DELETE RESTRICT`. | Giữ quan hệ hồ sơ kể cả sau khi hồ sơ completed. | Mới (đề xuất B4.5). |
| `parcelId` | `String NOT NULL` | Composite PK; FK `LandParcel.id` `ON DELETE RESTRICT`; index `(parcelId,parcelRole)`. | Không cho xóa thửa đang nằm trong hồ sơ. | Mới (đề xuất B4.5). |
| `parcelRole` | `String NOT NULL` | CHECK `subject`, `source`, `result`. | `subject` cho ba loại đơn một thửa; `source/result` cho tách/hợp. | Mới (đề xuất B4.5). |
| `createdAt` | `DateTime NOT NULL DEFAULT now()` | — | Thời điểm gắn thửa vào hồ sơ. | Đã có (đối chiếu convention `prisma/schema.prisma:10-18`). |

### 3.8 `LandNationalSync`

Lưu trạng thái và payload của lần gọi mock Cơ sở dữ liệu quốc gia về đất đai. Bảng này không phải bản sao của cơ sở dữ liệu quốc gia và không được dùng để tuyên bố kết nối thật.

| Cột | Kiểu, null, mặc định | PK/unique/index/ràng buộc | Hành vi | Nguồn |
|---|---|---|---|---|
| `id` | `String NOT NULL DEFAULT cuid()` | PK | Định danh lần sync logical. | Mới (đề xuất kỹ thuật B4.5). |
| `applicationId` | `String NOT NULL` | UNIQUE cùng `operation`; FK `LandChangeApplication.id` `ON DELETE RESTRICT`; index `(applicationId,status)`. | Một operation logical có một row, retry tăng `attempts`. | Mới (đề xuất B4.5). |
| `operation` | `String NOT NULL DEFAULT 'register_change'` | CHECK `register_change`. | Giới hạn integration duy nhất trong scope. | Mới (xác nhận mock duy nhất ngày 2026-09-30). |
| `requestKey` | `String NOT NULL` | UNIQUE | Idempotency key gửi adapter mock. | Mới (đề xuất B4.5). |
| `status` | `String NOT NULL DEFAULT 'pending'` | CHECK `pending`, `succeeded`, `failed`; index `(status,updatedAt)`. | `failed` cho phép retry; chỉ `succeeded` mới chuyển hồ sơ sang `pending_approval`. | Mới (đề xuất B4.5). |
| `remoteReference` | `String NULL` | Index khi khác null | Mã giả lập trả về từ adapter. | Mới (đề xuất B4.5). |
| `requestPayload` | `Json NOT NULL` | — | Snapshot request giả lập, không chứa secret. | Mới (đề xuất B4.5). |
| `responsePayload` | `Json NULL` | — | Snapshot response giả lập khi thành công hoặc lỗi. | Mới (đề xuất B4.5). |
| `failureCode` | `String NULL` | — | Mã lỗi nội bộ của mock khi `status='failed'`; không đại diện mã lỗi quốc gia. | Mới (đề xuất B4.5). |
| `attempts` | `Int NOT NULL DEFAULT 0` | CHECK `attempts >= 0` | Số lần gọi adapter. | Mới (đề xuất B4.5, theo retry fields của `OutboxMessage` tại `prisma/schema.prisma:107-122`). |
| `requestedAt` | `DateTime NOT NULL DEFAULT now()` | — | Mốc bắt đầu gọi mock. | Mới (đề xuất B4.5). |
| `completedAt` | `DateTime NULL` | CHECK null khi pending, not null khi succeeded/failed. | Mốc kết thúc attempt cuối. | Mới (đề xuất B4.5). |
| `createdAt` | `DateTime NOT NULL DEFAULT now()` | — | Thời điểm tạo row. | Đã có (đối chiếu convention `prisma/schema.prisma:10-18`). |
| `updatedAt` | `DateTime NOT NULL @updatedAt` | — | Thời điểm cập nhật row. | Đã có (đối chiếu convention `prisma/schema.prisma:10-18`). |

## 4. Quan hệ

```text
OrganizationUnit 1 ── n LandParcel
OrganizationUnit 1 ── n LandChangeApplication
LandParty        n ── n LandParcel       qua LandRight
LandParty        n ── n LandChangeApplication qua LandApplicationParty
LandParcel       n ── n LandChangeApplication qua LandApplicationParcel
LandParcel       1 ── n LandEncumbrance
LandChangeApplication 1 ── 1 LandNationalSync
LandChangeApplication 1 ── n Approval       qua resourceType/resourceId
mọi aggregate land 1 ── n EventRecord      qua aggregateType/aggregateId
mọi resource land 1 ── n AuditEvent        qua resourceType/resourceId
```

- Quan hệ FK giữa bảng land mới dùng `ON DELETE RESTRICT` cho parent nghiệp vụ; không xóa party, parcel hoặc application đã có lịch sử.
- `organizationId`, `createdById`, `sourceApplicationId` và actor fields là logical reference theo convention hiện có; các bảng dùng polymorphic resource (`Approval`, `Assignment`, `Evidence`, `AuditEvent`) không thêm FK trực tiếp.
- `LandApplicationParty` và `LandApplicationParcel` là bảng liên kết có parent retention; không dùng cascade để che mất lịch sử hồ sơ.

## 5. Máy trạng thái và toàn vẹn

### 5.1 `LandChangeApplication.status`

| Trạng thái | Chuyển hợp lệ | Điều kiện dữ liệu | Nguồn |
|---|---|---|---|
| `submitted` | `in_review`, `rejected` | Có `applicationCode`, party/parcel liên kết và `createdById`. | Mới (đề xuất B4.5 từ luồng người dùng chốt ngày 2026-09-30). |
| `in_review` | `sync_pending`, `rejected` | Cán bộ có quyền `land_review`; payload và quan hệ đã validate. | Mới (đề xuất B4.5). |
| `sync_pending` | `sync_succeeded`, `sync_failed` | Có `LandNationalSync.status='pending'`. | Mới (đề xuất B4.5). |
| `sync_failed` | `sync_pending`, `rejected` | Retry dùng cùng application và `requestKey`; không tạo hồ sơ mới. | Mới (đề xuất B4.5). |
| `sync_succeeded` | `pending_approval` | Có `remoteReference` và response mock hợp lệ. | Mới (đề xuất B4.5). |
| `pending_approval` | `completed`, `rejected` | Có `Approval` `action='approve'` với quyết định của `commune_leader`. | Mới (xác nhận có lãnh đạo duyệt ngày 2026-09-30; mã trạng thái là đề xuất B4.5). |
| `completed` | Không chuyển tiếp | `completedAt` not null; quyền/thửa/ràng buộc đã cập nhật trong cùng transaction. | Mới (đề xuất B4.5). |
| `rejected` | Không chuyển tiếp | `rejectionReason` not null; không áp dụng thay đổi vào quyền/thửa/ràng buộc. | Mới (đề xuất B4.5). |

### 5.2 Ràng buộc nghiệp vụ

- `transfer` phải có ít nhất một `current_holder`, một `proposed_holder`, một `subject` parcel và tổng share active của thửa sau khi hoàn tất bằng `100`.
- `information_update` chỉ sửa `address` hoặc `landUseType` trong vòng này; `changePayload` không được dùng để cập nhật tùy ý cột khác.
- `mortgage` phải có `subject` parcel và `secured_party` khi action là `register`; action `release` phải tham chiếu một `LandEncumbrance` active qua dữ liệu domain trước khi completed.
- `parcel_split_merge` phải có ít nhất một `source` và một `result`; result parcel dùng `status='proposed'` cho đến khi hồ sơ completed.
- Chỉ hồ sơ `completed` mới tạo/cập nhật `LandRight`, `LandParcel` hoặc `LandEncumbrance`; sync thành công tự nó không thay đổi quyền đất.
- Mỗi mutation land append một `EventRecord` và một `AuditEvent` trong cùng transaction; event payload ghi before/after tối thiểu, không ghi ciphertext plaintext sau khi giải mã.
- Public lookup chỉ đọc; không tạo `AuditEvent` chứa mã định danh party, không trả `displayNameCiphertext`, identity fields, `changePayload`, sync payload hoặc evidence metadata.

## 6. Tra cứu công khai

- Không tạo bảng public-read riêng; query join `LandChangeApplication`, `LandApplicationParcel` và `LandParcel` theo `applicationCode` hoặc `parcelCode`.
- Tập dữ liệu tối thiểu được đề xuất cho public lookup: `applicationCode`, `parcelCode`, `mapSheetNumber`, `parcelNumber`, `status`, `submittedAt`, `updatedAt`, `completedAt`.
- Không trả `LandParty`, địa chỉ đầy đủ, polygon, `changePayload`, `LandNationalSync`, `Approval`, `AuditEvent` hoặc `Evidence`; cán bộ nội bộ dùng read seam có authorization riêng.
- Index bắt buộc cho lookup: `LandChangeApplication.applicationCode UNIQUE`, `LandParcel.parcelCode UNIQUE`, `LandApplicationParcel(parcelId,parcelRole)`, `LandChangeApplication(organizationId,status,updatedAt)`.
- Quyết định không public polygon là biện pháp tối thiểu hóa dữ liệu ở B4.5; endpoint cụ thể và response JSON sẽ được chốt ở B6 sau khi có feature list.

## 7. Bảo mật, retention và hành vi xóa

- `LandParty.displayNameCiphertext` và `identityNumberCiphertext` mã hóa bằng `encryptSensitive`; `identityNumberIndex` chỉ là blind index phục vụ chống trùng.
- Dữ liệu demo không chứa thông tin nhận diện thật. Nếu chuyển sang dữ liệu thật, phải rà soát lại L4–L7 và các khoảng trống B2 trước khi triển khai production. Nguồn: `docs/research/land-module/law-summary.md:148-161`.
- Không có hard-delete nghiệp vụ cho `LandParty`, `LandParcel`, `LandRight`, `LandEncumbrance`, `LandChangeApplication` hoặc `LandNationalSync`; dùng `status`, `validTo`, `releasedAt`, `retired` hoặc `archived`.
- FK nghiệp vụ dùng `RESTRICT`; xóa user không xóa lịch sử land vì `createdById` là logical reference. `EventRecord`, `AuditEvent`, `Approval` và evidence immutable không bị module land xóa.
- `Evidence` physical file tuân theo `EvidenceStorageAdapter`; module land không tự xóa file chỉ vì hồ sơ đổi trạng thái.
- `requestPayload`/`responsePayload` của mock chỉ chứa dữ liệu giả lập; secret adapter không lưu trong database.

## 8. Migration

1. Dùng một migration Prisma additive mới; không sửa migration đã chạy trong `prisma/migrations/`.
2. Deployment PostgreSQL phải cung cấp PostGIS trước khi tạo bảng; migration chạy `CREATE EXTENSION IF NOT EXISTS postgis` rồi tạo cột `geometry(Polygon,4326)` và GiST index.
3. Tạo tám bảng mới theo thứ tự: `LandParty`, `LandParcel`, `LandChangeApplication`, `LandRight`, `LandEncumbrance`, `LandApplicationParty`, `LandApplicationParcel`, `LandNationalSync`; thêm FK `RESTRICT`, CHECK và index sau khi tạo bảng.
4. Upsert ba role `land_officer`, `commune_leader`, `citizen` vào bảng `Role`; không xóa role hoặc UserRole hiện có.
5. Không backfill từ các bảng ANTT hiện có; không chuyển `Subject` sang `LandParty`; dữ liệu demo land được tạo ở phase seed/implementation sau khi schema deploy.
6. `prisma generate` cần dùng field `Unsupported` đúng với PostGIS; thao tác geometry dùng SQL parameterized qua adapter, không nối chuỗi SQL từ input.
7. Rollback không hard-delete dữ liệu nghiệp vụ; nếu phải vô hiệu hóa feature, dừng migration/adapter và giữ bảng cùng lịch sử để tránh mất audit.

## 9. Seam kiểm thử cho data model

| Seam | Assertion bắt buộc | Nguồn |
|---|---|---|
| Migration | PostGIS tồn tại; tám bảng, CHECK, FK, unique và GiST index tạo được trên database test. | Mới (đề xuất B4.5, hạ tầng hiện tại đọc từ `docker-compose.yml:1-12`). |
| Party privacy | Row chỉ có ciphertext; tra cứu bằng `identityNumberIndex` không trả plaintext; public lookup không trả party. | Mới (đề xuất B4.5, encryption seam `src/modules/identity/encryption.ts:18-50`). |
| Parcel geometry | Polygon sai SRID hoặc invalid bị từ chối; polygon hợp lệ SRID 4326 ghi/đọc được; point không được chấp nhận thay polygon. | Mới (xác nhận lưu polygon ngày 2026-09-30; phần validation là đề xuất B4.5). |
| Application idempotency | Hai command cùng `idempotencyKey` trả cùng hồ sơ; payload khác bị từ chối; không có row thứ hai. | Mới (đề xuất B4.5, pattern `IntakeReport.idempotencyKey` tại `prisma/schema.prisma:238-268`). |
| State machine | Transition ngoài bảng mục 5.1 bị từ chối; `completed` chỉ sau Approval approved; rejected không mutate quyền/thửa. | Mới (xác nhận workflow ngày 2026-09-30; transition cụ thể là đề xuất B4.5). |
| National mock | `sync_failed` không tạo Approval; retry dùng cùng request key; `sync_succeeded` tạo được Approval pending nhưng chưa đổi quyền. | Mới (xác nhận mock duy nhất ngày 2026-09-30; behavior là đề xuất B4.5). |
| Audit/event | Mỗi completed/rejected/sync/approval mutation có AuditEvent và EventRecord trong transaction; rollback không để row một nửa. | Đã có seam (`src/modules/identity/audit.ts:24-77`, `src/modules/eventing/event-store.ts:109-188`). |
| Public lookup | Tìm được bằng applicationCode hoặc parcelCode; response không có party, PII, polygon, sync payload, approval hoặc evidence. | Mới (xác nhận tra cứu cả hai mã tối thiểu ngày 2026-09-30; tập trường là đề xuất B4.5). |

## 10. Phạm vi không được suy ra từ data model này

- Không tạo kết nối thật hoặc dữ liệu đồng bộ thật với Cơ sở dữ liệu quốc gia về đất đai.
- Không mở rộng sang thuế, công chứng, ngân hàng, cloud/thuê dịch vụ, thanh tra, quy hoạch, định giá đất hoặc cấp độ an toàn thông tin chính thức.
- Không coi `LandNationalSync.remoteReference` là mã pháp lý thật; đây chỉ là response của mock.
- Không coi hồ sơ, chữ ký, kết quả approval hoặc Giấy chứng nhận mô phỏng là quyết định hành chính hay chứng thư có giá trị pháp lý.
