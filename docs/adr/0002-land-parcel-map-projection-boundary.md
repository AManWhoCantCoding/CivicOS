# ADR-0002 — Boundary cho map projection của thửa đất

- **Status:** accepted — người dùng xác nhận bộ design/SOW B6 ngày 2026-10-02
- **Date:** 2026-10-02
- **Feature:** `land-parcel-map`

## Context

`LandParcel` có Polygon nội bộ, còn map module hiện hữu chiếu các domain khác qua map workspace. Land detail có policy riêng theo role, OrganizationUnit và Assignment. Dùng thẳng land detail hoặc mở rộng quyền map cũ có thể làm lộ rights, party, Evidence hoặc polygon ngoài scope.

## Decision đề xuất

1. Tạo một **map read projection boundary riêng** tại `/api/map/land-parcels...`.
2. Projection chỉ trả field tối thiểu để focus/selection: parcel identity nghiệp vụ tối thiểu, status, geometry Polygon 4326, freshness và `simulated`.
3. Route dùng lại land access policy hiện hành; `land_officer`/`commune_leader` là hai role được phép trong feature, role map cũ không được suy ra quyền land.
4. Web và mobile dùng cùng projection; mobile mở từ `LandScreen` sang `MapScreen` và không cache polygon offline P0.
5. Map read-only; không có mutation, public polygon, legal-boundary claim hoặc external cadastral integration.

## Alternatives considered

### Mở rộng `/api/map/markers`

Không chọn cho P0 vì endpoint hiện hữu phục vụ projection Incident/Inspection với role map boundary khác; gộp ngay có thể làm mờ land policy và allowlist.

### Client gọi `/api/land/parcels` rồi tự render

Không chọn vì land parcel response đầy đủ hơn map projection, dễ lộ address/landUseType/national reference và làm client giữ geometry ngoài map boundary.

### Chỉ thêm map panel trong parcel detail

Không chọn làm boundary duy nhất vì không nối được workspace map hiện hữu và không đáp ứng mobile `LandScreen → MapScreen`; có thể cân nhắc như UI enhancement sau P0.

## Consequences

### Tích cực

- Authorization/privacy được kiểm soát ở một boundary rõ ràng.
- Web/mobile dùng cùng contract và không cần duplicate domain projection.
- Không biến map thành nguồn dữ liệu ghi hoặc nguồn pháp lý.

### Chi phí

- Cần API/read seam riêng và test contract riêng.
- B9 phải khảo sát geometry query, freshness, payload bound, spatial filter và audit storage.
- Map UI phải xử lý thêm geometry/provider/offline/stale states.

## DATA-MODEL-IMPACT

ADR này không quyết định table, column, index, materialized view, cache schema hoặc migration. Các quyết định đó thuộc B9 sau khi SOW/design/mockup được người dùng chốt.
