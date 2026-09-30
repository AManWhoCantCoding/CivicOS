# Design tokens — land-module

## Trạng thái handoff

Stitch MCP timeout trong phiên B7; chưa có rendered screen URL. Các token và screen handoff dưới đây là baseline textual để triển khai và phải được kiểm chứng trực quan khi Stitch khả dụng.

## Màu

| Token | Mã | Sử dụng |
|---|---|---|
| `canvas` | `#F4F6F8` | Nền workspace |
| `surface` | `#FFFFFF` | Panel, table, form |
| `ink` | `#17212B` | Nội dung chính |
| `muted` | `#65727E` | Metadata/helper |
| `line` | `#D8E0E6` | Border/divider |
| `accent` | `#0F6B67` | CTA/focus/active |
| `info` | `#2E6F95` | Sync/simulated info |
| `warning` | `#B7791F` | Pending/retry |
| `danger` | `#B54747` | Error/rejected/conflict |
| `success` | `#2F7D50` | Completed/approved |

Không dùng gradient, neon, glow hoặc màu đen tuyệt đối.

## Typography

- `Geist`, fallback `system-ui, sans-serif`.
- `Geist Mono` cho application code, parcel code, version và timestamp.
- `12px` metadata, `14px` helper, `16px` body, `20px` section, `28px` page title.
- Body line-height `1.5`, heading line-height `1.15`.

## Layout/interaction

- Spacing `4/8/12/16/24/32/48px`.
- Desktop dùng ModuleShell và panel rõ border; không dùng card lồng card.
- Control chạm tối thiểu `44px`; dưới `768px` chuyển sang sheet/list.
- Status chip luôn có text, không dùng màu đơn độc để truyền tải trạng thái.
- Loading dùng skeleton; lỗi dùng inline message kèm retry; focus ring dùng `accent`.

## Nội dung

- Dùng tiếng Việt cho label/error; mã và timestamp dùng monospace.
- Hiển thị `Mô phỏng`/`simulated` gần public result và sync fixture.
- Không dùng “chính thức”, “đã cấp”, “government record” cho dữ liệu demo.
