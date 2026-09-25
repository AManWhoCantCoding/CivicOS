# Design tokens — CivicOS PS-E1 MVP

## Trạng thái

MCP Google Stitch không khả dụng trong phiên này, nên chưa thể tạo project/screen link Stitch hoặc chạy `generate-design`, `extract-design-context` và `design-viewer`. Các token dưới đây là định hướng UI bám theo `spec.md`; cần đối chiếu lại bằng Stitch khi MCP được cấp.

## Bảng màu

| Token | Mã màu | Mục đích |
|---|---|---|
| `canvas` | `#F4F6F8` | Nền workspace sáng, giảm mỏi mắt khi xem bản đồ và bảng dữ liệu |
| `surface` | `#FFFFFF` | Panel, bảng, form và sheet |
| `ink` | `#17212B` | Tiêu đề và nội dung chính |
| `muted` | `#65727E` | Metadata, helper text, attribution |
| `line` | `#D8E0E6` | Đường phân cách và viền input |
| `accent` | `#0F6B67` | CTA chính, marker đang chọn, focus và trạng thái active |
| `warning` | `#B7791F` | SLA sắp hạn, nhắc nhở |
| `danger` | `#B54747` | Quá hạn, lỗi, vi phạm nghiêm trọng |
| `success` | `#2F7D50` | Đã xác minh, đạt, đã phê duyệt |

Không dùng gradient, neon, glow hoặc màu đen tuyệt đối. `accent` là màu nhấn duy nhất.

## Typography

- `font-family`: `Geist`, fallback `system-ui, sans-serif`.
- `font-mono`: `Geist Mono`, dùng cho mã hồ sơ, timestamp, SLA và số liệu mật độ cao.
- Scale: `12px` metadata, `14px` body phụ, `16px` body, `20px` section, `28px` page title.
- Line-height body: `1.5`; tiêu đề: `1.15`.

## Spacing và layout

- Scale: `4 / 8 / 12 / 16 / 24 / 32 / 48px`.
- Desktop: shell hai vùng gồm navigation cố định và workspace; map có panel nổi nhưng không che thao tác chính.
- Bảng và form ưu tiên border/divider, chỉ dùng elevation để phân biệt panel với map.
- Breakpoint mobile: dưới `768px` chuyển thành bottom sheet/list sheet; vùng chạm tối thiểu `44px`.
- Loading dùng skeleton đúng kích thước; lỗi dùng inline message kèm retry; empty state nêu cách có dữ liệu.

## Link Stitch

Chưa có link — Stitch MCP không được expose trong phiên này.
