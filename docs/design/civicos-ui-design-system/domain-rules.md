# Quy tắc phạm vi trình bày: `civicos-ui-design-system`

## Tính chất của tài liệu

Tài liệu này ghi lại các invariant presentation đã được duyệt cho migration
Light/Blue của CivicOS. Đây không phải là bộ quy tắc nghiệp vụ mới. Các API,
read model, quyền, Assignment, masking, state machine, map projection,
persistence và business action hiện có tiếp tục là nguồn sự thật theo
`overview.md`, `api-contract.md` và `data-model.md`.

Phạm vi được đối chiếu với:

- `docs/design/civicos-ui-design-system/overview.md` §§11–17, §§19–29;
- `.scratch/civicos-ui-design-system/ui/design-tokens.md` §§16–111;
- `.scratch/civicos-ui-design-system/ui/prototype.md` §§23–100;
- `.scratch/civicos-ui-design-system/ui/test-scenarios.md` TS-01–TS-11;
- `.scratch/civicos-ui-design-system/ui/stitch-screens.md` §§3–21, §§32–46.

## Invariant đã được duyệt

### Baseline Light/Blue là presentation contract

- Canvas, surface, text, border, focus, action, semantic state, simulated và
  map tokens phải dùng đúng giá trị trong `design-tokens.md` §§24–44.
- Typography, monospace, spacing, radius, focus ring và kích thước control
  phải dùng scale đã ghi tại `design-tokens.md` §§46–81.
- Trạng thái phải có text/icon/copy; màu không được là tín hiệu duy nhất.
  Không dùng gradient, neon, glow hoặc màu đen tuyệt đối.
- Token chỉ quyết định cách hiển thị. Token không tạo field, status, action,
  permission hoặc domain transition mới.

### Chỉ áp dụng trên surface đã được phê duyệt

Migration áp dụng cho web foundation, shell, navigation, Residents, Intake,
Inspection, Land, map và các mobile primitives/surface đã liệt kê trong
`overview.md` §§11–17 và các path trong `design-tokens.md` §§96–105. Không
được suy ra thêm surface, route hoặc screen từ tên token hay từ preview.

### Tương thích với hành vi hiện có

- Presentation phải tiếp tục đọc và hiển thị API, read model, error/status và
  route hiện có; các invariant tương ứng nằm tại `api-contract.md` §§7–26.
- Layout hoặc component presentation không được thay đổi destination,
  business action, state name, permission, Assignment hoặc masking.
- UI state chỉ là cách biểu diễn state đã có. Không ghi state UI ngược vào
  database và không tạo database status/workflow state mới.
- Nếu một thay đổi cần API, route, quyền, state machine, schema, migration,
  seed, map projection hoặc cache behavior mới thì phải dừng migration này và
  mở review riêng theo `overview.md` §§19–26.

### Privacy và nhãn dữ liệu mô phỏng

- Các masked values, permission-aware fields và boundary hiện có phải được
  giữ nguyên; tài liệu này không quyết định actor nào được reveal.
- Nhãn `internal / simulated` và copy dữ liệu mô phỏng phải được giữ gần
  surface liên quan theo `design-tokens.md` §§83–95 và `prototype.md`
  §§77–100.
- Presentation không được đổi dữ liệu mô phỏng thành `official`, `certified`
  hoặc một public/legal claim.

### Map và offline boundary không đổi

Map ready/loading/empty/forbidden/not-found/geometry/provider/stale/offline
chỉ được trình bày theo boundary đã có trong `prototype.md` §§85–92 và
`test-scenarios.md` TS-06–TS-10. Đặc biệt, migration không render polygon cũ
hoặc polygon offline và không dùng basemap cache như bằng chứng land data đã
sẵn sàng. Đây là bảo toàn boundary hiện có, không phải thiết kế thêm offline
storage hay map behavior.

### Accessibility và responsive presentation đã chốt

Keyboard focus, text/icon/state copy, skeleton có kích thước tương ứng và
control/touch target tối thiểu `44px`/`44 × 44px` được đối chiếu theo
`design-tokens.md` §§59–81, `test-scenarios.md` TS-01–TS-11 và các acceptance
criteria của CUI-001–CUI-004. Không tạo control, flow hoặc UX requirement mới
ngoài các artifact đó.

## Các nội dung không được suy ra từ tài liệu này

Tài liệu không tạo hoặc thay đổi:

- legal rule, legal status, public claim hoặc retention rule;
- role, permission, OrganizationUnit, Assignment, masking hoặc audit policy;
- API endpoint, method, payload, error code, route hoặc navigation destination;
- domain state machine, business action, database table/field/relation/index,
  migration, seed, cache hoặc offline store;
- Stitch screen/resource mới hoặc production behavior từ screenshot/HTML.

Nếu phát sinh một trong các nội dung trên, phạm vi UI-only không còn đủ và
phải mở contract review mới thay vì mở rộng tài liệu này.

## Traceability

| Invariant                            | Nguồn đã duyệt                                                                                                  |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Token, typography, shape, state copy | `.scratch/civicos-ui-design-system/ui/design-tokens.md` §§24–95; TS-11                                          |
| Web foundation/shell/navigation      | `overview.md` §§11–17; CUI-001; TS-01, TS-11                                                                    |
| Web domain/map presentation          | `overview.md` §§11–17; CUI-002; TS-02–TS-08                                                                     |
| Mobile presentation                  | `overview.md` §§14–17; CUI-003; TS-09–TS-11                                                                     |
| Cross-surface compatibility boundary | `overview.md` §§19–29; `api-contract.md` §§7–26; `data-model.md` §§7–30; CUI-004                                |
| Visual reference                     | Stitch project `projects/3369879313583874807`, catalog `.scratch/civicos-ui-design-system/ui/stitch-screens.md` |
