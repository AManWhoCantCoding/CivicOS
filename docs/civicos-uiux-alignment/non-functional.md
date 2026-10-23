# Yêu cầu phi chức năng presentation: `civicos-uiux-alignment`

## Visual consistency

- Dùng exact Light/Blue values trong
  `.scratch/civicos-ui-design-system/ui/design-tokens.md`.
- Canvas `#F8FAFC`, surface `#FFFFFF`, text `#172033`/`#475569`, accent
  `#075985`, focus `#1D4ED8` và semantic tokens hiện có.
- Typography system sans; monospace cho code/timestamp/version.
- Spacing `4/8/12/16/24/32/48px`, radius `6/10/16px`, control tối thiểu
  `44px`; mobile touch target `44 × 44px`.
- Không gradient, neon, glow, màu đen tuyệt đối hoặc state chỉ bằng màu.

## Accessibility and interaction

- Focus-visible dùng `--civicos-focus`; keyboard navigation và accessible name
  của control/action không đổi hoặc bị mất.
- Loading, empty, ready, warning/stale, error/conflict, forbidden/masked,
  offline và simulated có text/icon/copy rõ ràng.
- Responsive review tại web `1440 × 900` và mobile `390 × 844`; kiểm tra thêm
  long labels, narrow width và reduced-motion behavior nếu surface hiện có hỗ trợ.
- Không làm mất back, retry, reload, confirmation hoặc online-required guard.

## Privacy and safety

- Không lộ PII, raw payload, storage/sync key, geometry hoặc existence ngoài
  scope qua UI, error, tooltip, log preview hoặc accessibility label.
- Giữ masking, forbidden copy, simulated label và public lookup disclaimer.

## Compatibility and performance

- Không thêm dependency, API call, cache/store, telemetry, SLO hoặc persistence
  requirement mới để phục vụ visual parity.
- Loading/skeleton không được làm dữ liệu cũ trông như ready; retry không được
  thành retry vô hạn.
- Giữ current browser/mobile runtime support và build boundaries của repo.

## Verification

- Lock check, root typecheck/lint/build và targeted web regression.
- Mobile typecheck/test/build và readonly/navigation/state regression.
- E2E cho login/access, module shell, incident, resident, inspection, vehicle,
  land/map và field surface khi ticket chạm các route đó.
- Manual visual/accessibility review theo surface matrix; Stitch preview chỉ là
  reference, không thay thế runtime verification.
