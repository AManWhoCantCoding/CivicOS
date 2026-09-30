# Yêu cầu phi chức năng: land-module

## Hiệu năng

- Public lookup và API nội bộ có mục tiêu p95 dưới `500 ms` trên dataset demo tối đa `10.000` `LandParcel`; mục tiêu này là demo baseline, không phải SLA production. **Nguồn:** “Mới (xác nhận với người dùng ngày 2026-09-30, B6 Q18)”.
- List API bắt buộc cursor pagination; `limit` mặc định `50`, tối đa `100`; query nóng có index theo `applicationCode`, `parcelCode`, `(organizationId,status,updatedAt)`, `(parcelId,parcelRole)`. **Nguồn:** `data-model.md:82,127,180,241-243`; Q15.
- Geometry query không dùng public map; internal parcel detail dùng row geometry đã index GiST. **Nguồn:** `data-model.md:75,242`; Q6.

## Bảo mật

- Endpoint nội bộ gọi `getCurrentUser`; thiếu session trả `401 LAND_UNAUTHENTICATED`; capability/scope/Assignment kiểm tra trước service mutation. **Nguồn:** `src/modules/identity/session.ts:43-52`; `src/modules/identity/authorization.ts:108-120`; Q3/Q13.
- `land_officer` và `commune_leader` có `read`, `mutate`, `read_sensitive` theo phạm vi `OrganizationUnit`; chỉ leader có `approve` và quản lý Assignment; `citizen` không cần session cho public lookup. **Nguồn:** Q3/Q19.
- `displayName`/`identityNumber` lưu ciphertext; identity number chỉ trả masked nội bộ; không ghi plaintext vào event/audit hoặc public response. **Nguồn:** `law-summary.md:53-65`; `data-model.md:46-56,248`; DR-03.
- Request không được chứa secret adapter; `requestPayload`/`responsePayload` chỉ giữ dữ liệu giả lập. **Nguồn:** `data-model.md:185-187,253`; Q14.
- Không expose storage path `storageKey`, polygon hoặc evidence metadata cho public. **Nguồn:** Q23/Q24 và DR-20/DR-21.

## Khả dụng & phục hồi

- Mỗi transition và side effect land/audit/event chạy trong transaction; lỗi giữa chừng rollback toàn transaction. **Nguồn:** `src/modules/identity/audit.ts:24-77`; `src/modules/eventing/event-store.ts:109-188`; DR-19.
- PostgreSQL phải cung cấp PostGIS trước migration; thiếu extension là lỗi triển khai chặn feature, không fallback sang Point hoặc JSON. **Nguồn:** `data-model.md:255-263`; Q10.
- Demo không cam kết uptime production, backup production hoặc RTO/RPO; retention demo là giữ lịch sử vô thời hạn trong database, không hard-delete nghiệp vụ. **Nguồn:** `data-model.md:246-253`; Q18 và scope ngoài `law-summary.md:158-160`.
- Mock sync không có automatic retry vô hạn; lỗi được lưu `sync_failed`, người dùng gọi retry thủ công. **Nguồn:** Q5/Q14; DR-17.

## Logging & audit trail

- Ghi `AuditEvent` cho create/read sensitive/mutation/review/sync/retry/approve/reject/lookup nội bộ/Assignment/Evidence; public lookup không ghi party identity vào metadata. **Nguồn:** `data-model.md:37-40,235-236`; DR-19/DR-20.
- Ghi `EventRecord` bất biến cho application state, sync, approval, land aggregate và Assignment; `OutboxMessage` phát hành sau event. **Nguồn:** `data-model.md:37-39`; `src/modules/eventing/event-store.ts:109-188`.
- Timeline nội bộ đọc các trường event đã lưu; public chỉ đọc projection lookup hiện tại, không đọc event detail. **Nguồn:** Q9/Q24.

## Giới hạn

- JSON request body tối đa `1 MiB`; Evidence upload tối đa `10 MiB`. **Nguồn:** Q16/Q18.
- Evidence chỉ nhận `application/pdf`, `image/jpeg`, `image/png`. **Nguồn:** Q16.
- Public lookup tối đa `60 requests/minute/IP`; vượt ngưỡng trả `429 LAND_RATE_LIMITED`. **Nguồn:** Q18.
- Cursor `limit` tối đa `100`; query cả hai hoặc không có lookup key bị từ chối trước khi truy vấn database. **Nguồn:** Q15/Q24.
