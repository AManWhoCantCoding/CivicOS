# Thuật ngữ presentation: `civicos-ui-design-system`

| Thuật ngữ | Định nghĩa trong feature | Không đồng nghĩa với |
|---|---|---|
| **CivicOS UI design system** | Bộ baseline Light/Blue và quy tắc presentation dùng để migrate các web/mobile surface đã được duyệt. | Một domain module, API mới hoặc data model mới. |
| **Light/Blue baseline** | Bộ màu, typography, spacing, shape, focus và semantic state values đã ghi trong `ui/design-tokens.md`. | Palette hoặc brand claim mới ngoài artifact. |
| **Design token** | Tên và giá trị presentation có thể dùng lại, ví dụ `--civicos-accent` hoặc `space.4`. | Field, permission, status nghiệp vụ hoặc schema column. |
| **Semantic state presentation** | Cách hiển thị loading, empty, ready, warning/stale, error/conflict, forbidden/masked, offline và simulated từ state contract hiện có. | Một state machine hoặc database status mới. |
| **UI-only / presentation migration** | Thay đổi token, layout và component rendering trong path được ticket cho phép, giữ nguyên behavior và contract hiện hữu. | Thay đổi API, route, persistence, authorization hoặc domain action. |
| **Surface** | Một web/mobile screen, shell, list, detail, map hoặc primitive đã có trong scope được duyệt. | Một screen/resource tự phát sinh từ prototype. |
| **Existing contract** | API path/method/shape/status, read model, route, permission, masking, Assignment, state và map boundary đang có. | Hợp đồng được suy ra từ màu, screenshot hoặc tên component. |
| **Masked value** | Giá trị đã được biểu diễn theo masking/permission policy hiện hành. | Dữ liệu được reveal mặc định hoặc policy mới. |
| **Internal / simulated** | Nhãn và copy cho dữ liệu mô phỏng nội bộ; không phải public hoặc legal claim. | `official`, `certified` hoặc nguồn pháp lý chính thức. |
| **No-offline-polygon** | Boundary đã duyệt: land polygon không được lưu/render từ offline cache trong flow hiện tại. | Basemap cache hoặc một offline storage contract mới. |
| **Canonical Stitch catalog** | Catalog 7 screen resources trong project `projects/3369879313583874807`, gồm composite board `fdb8b9704dd14acaa6000f342f921c14`. | Runtime click-through, production route hoặc source code. |
| **Composite board** | Screen resource tổng hợp dùng làm visual reference cho các surface/states chưa có resource riêng. | Một screen production hoặc một flow runtime đã được Stitch liên kết. |
| **B8 visual approval** | Human Gate đã được chốt bằng user message `Được tôi chốt` cho Light/Blue baseline và composite board. | Approval cho API, schema, source code hoặc các canonical docs mới. |
| **B9 no data-model impact** | Kết luận đã duyệt rằng feature không tạo/thay đổi table, field, relation, index, migration, seed, read model hoặc offline store. | Quyền tự thay đổi database trong implementation. |
| **Contract artifact completion** | Việc bổ sung các tài liệu canonical còn thiếu để bộ contract đủ cấu trúc; nội dung mới vẫn cần approval/lock phù hợp. | Việc tự động mở rộng approval metadata hoặc coi docs mới đã được lock. |

## Quy tắc dùng thuật ngữ

- Dùng `Light/Blue`, `UI-only`, `internal / simulated`, `masked`, `stale`,
  `offline` và `no-offline-polygon` theo các định nghĩa trên.
- Dùng `canonical` cho reference đã ghi trong `stitch-screens.md`, không dùng
  để suy ra production behavior.
- Không gọi dữ liệu mô phỏng là `official`, `certified` hoặc ranh giới pháp
  lý; không dùng thuật ngữ mới để ngầm mở rộng quyền hay data model.
