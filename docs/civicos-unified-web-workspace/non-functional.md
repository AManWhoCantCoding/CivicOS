# Non-functional Requirements — `civicos-unified-web-workspace`

## Accessibility

- Giữ keyboard navigation, visible focus, `aria-current`, drawer focus trap,
  Escape close và touch/control target tối thiểu `44px`.
- Module switcher và feature list phải có accessible name; không truyền ý nghĩa
  permission chỉ bằng màu/icon.
- `AccessDenied`, loading, error, offline và no-assignment states phải có text
  rõ ràng và semantic role phù hợp.
- Giữ reduced-motion behavior của shared web baseline.

## Security and privacy

- Navigation filtering không được thay thế server/domain authorization.
- Không liệt kê module/data cho session không có feature visible.
- Không làm lộ role-sensitive route, assignment, masked value, PII, raw payload,
  storage key hoặc geometry qua launcher.
- Giữ organization scope, Assignment scope, masking và forbidden non-disclosure.

## Compatibility

- Deep links tới route hiện tại phải tiếp tục hoạt động theo authorization hiện
  tại, kể cả khi feature không còn trong navigation.
- Không đổi URL/API contract, browser back/forward, route destination hoặc
  existing domain page state transitions.
- Không thay đổi mobile deep links, native navigation hoặc read-only capability.

## Performance and resilience

- Workspace không được gọi một endpoint mới chỉ để dựng navigation.
- Có thể reuse session/assignment reads; tránh fetch lặp cho từng module nếu
  không cần, nhưng không cache vượt quá semantics hiện có.
- Loading/error/offline state phải xác định rõ khi session hoặc assignment read
  chưa hoàn tất.
- Assignment read failure phải fail closed cho feature task-gated.

## Responsive behavior

- Desktop và narrow web viewport dùng cùng navigation contract; drawer/switcher
  giữ focus and touch behavior của `ModuleShell`.
- Mobile native không bị ép vào layout web; chỉ đánh giá visual vocabulary và
  state parity ở kích thước mobile hiện hành.

## Verification targets

- Web: route/role/deep-link regression và accessibility tại baseline hiện hành,
  bao gồm desktop và narrow viewport.
- Mobile: typecheck/test/build và visual/state audit tại viewport hiện hành;
  không thêm capability test ngoài read-only contract.
