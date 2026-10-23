# Legal/Compliance Summary — `civicos-uiux-alignment`

## Kết luận sơ bộ

`NO_NEW_LEGAL_RULE` — request hiện được giới hạn ở presentation/UI/UX và không
định nghĩa, thay đổi hoặc suy diễn quy tắc pháp lý/nghiệp vụ mới.

## Boundary phải giữ

- Không đổi permission, Assignment scope, masking, audit/privacy behavior hoặc
  trạng thái nghiệp vụ.
- Không đổi nội dung public land lookup thành `official`, `certified` hoặc
  tuyên bố ranh giới pháp lý.
- Giữ nhãn `internal / simulated` và thông điệp không phải ranh giới pháp lý.
- Error/forbidden/offline states không được làm lộ PII, geometry hoặc resource
  existence ngoài scope.

- `docs/civicos-ui-design-system/overview.md` §§19–29.
- `.scratch/civicos-ui-design-system/ui/design-tokens.md` §§16–23, §§83–94.
- `.scratch/feature-map.md` — mobile read-only và server-enforced scope.
