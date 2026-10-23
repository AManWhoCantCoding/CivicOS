# Glossary — `civicos-unified-web-workspace`

| Term                       | Meaning in this contract                                                                                              |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **App-level workspace**    | Web entry surface chứa module/feature navigation theo session hiện tại                                                |
| **Module**                 | Bounded functional grouping trong `MODULES`: incidents, inspections, vehicles, identity, map, residents, land         |
| **Feature**                | Một navigation/entry capability trong `FEATURES`, có role/task/route metadata                                         |
| **Role workspace**         | Projection chức năng theo `session.roles` và Assignment; không phải permission engine mới                             |
| **Navigation exclusion**   | Feature không được link từ launcher/sidebar nhưng không bị xóa route/API                                              |
| **Direct route**           | URL được mở bằng bookmark/deep link, vẫn chịu server/domain authorization                                             |
| **Assignment**             | Existing scoped task grant dùng trong `requiresTask` và organization/assignee checks                                  |
| **Hidden UI**              | UI item không xuất hiện trong navigation; không đồng nghĩa capability bị retire                                       |
| **AccessDenied**           | Existing/specified safe state cho session không có quyền/feature visible; không render module/data inventory          |
| **Land-approved baseline** | Light/Blue token/layout/state vocabulary đã được approve; không phải land business flow                               |
| **Mobile visual audit**    | Kiểm tra token, typography, state, accessibility và responsive presentation mà không đổi mobile navigation/capability |
| **Unified web**            | Một runtime web/app shell cho các module; không yêu cầu web/mobile capability parity                                  |
