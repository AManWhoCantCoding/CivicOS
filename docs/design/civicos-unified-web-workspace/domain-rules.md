# Domain Rules — `civicos-unified-web-workspace`

## R1 — Role workspace is a projection, not a permission engine

Workspace chỉ trình bày projection của permission/Assignment hiện có. Nó không
được tự cấp quyền, suy luận quyền từ label module hoặc dùng visual hiding thay cho
server authorization.

## R2 — Feature visibility

Một feature đủ điều kiện navigation khi:

1. session tồn tại;
2. một role của session nằm trong `visibleRoles`;
3. nếu có `requiresTask`, assignment đang `active`, đúng assignee/organization
   scope, hoặc role thuộc `bypassTaskRoles`;
4. feature không thuộc navigation exclusion list của PS-E1-004/005/007.

Các điều kiện 1–3 phải giữ semantics của `visibleFeatures()` hiện có.

## R3 — Entry authorization remains authoritative

Navigation visibility không quyết định direct URL authorization. Các page/layout
vẫn dùng server gate và domain access checks hiện có. Hidden navigation chỉ có
nghĩa feature không được link từ workspace/sidebar.

## R4 — Hidden feature set

Navigation exclusion hiện tại được khóa ở mức feature ID:

- `resident-list`, `resident-reports`;
- `incident-queue`, `incident-intake`;
- `inspection-catalogue`, `inspection-schedule`, `inspection-workqueue`.

`incident-assignment` không nằm trong exclusion set vì là Identity/Assignment
control-plane feature.

## R5 — No visible feature

Session hợp lệ nhưng không có feature navigation hợp lệ phải render `AccessDenied`
state đã có/được contract hóa, không render danh sách module, route, data hoặc
assignment. Không coi đây là empty business dataset.

## R6 — Multi-role session

Nếu session có nhiều role, feature được phép khi bất kỳ role hiện có thỏa
`visibleRoles` và task policy tương ứng; không hiển thị trùng feature. Assignment
scope vẫn được áp dụng.

## R7 — Visual anchor does not transfer business flow

Dùng land-approved Light/Blue shell, token, state grammar và layout vocabulary
cho web. Không copy land workflow, field, state, legal wording hoặc permission
semantics sang incidents, inspections, residents, vehicles/field hay map.

## R8 — Mobile boundary

Mobile không nhận global web module switcher hoặc web write capability từ design
này. Audit chỉ kiểm tra presentation/state/accessibility consistency với web.

## R9 — Single-expanded module navigation

- Tất cả module có ít nhất một feature navigation hợp lệ có thể xuất hiện dưới
  dạng top-level module tab.
- Tại một thời điểm chỉ một module tab được active/expanded và render feature
  list của module đó.
- Click module tab chuyển active module và thay feature list đang hiển thị; các
  module khác vẫn là tab nhưng feature list của chúng bị ẩn.
- Module không còn feature hợp lệ sau role/Assignment/exclusion filtering không
  được render như tab có thể mở.
- Module/feature grouping phải theo `FEATURES.moduleId`; screenshot chỉ là
  visual interaction reference, không override registry mapping.
