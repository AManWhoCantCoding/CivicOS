# ADR-0003 — Shared CivicOS UI design tokens

- **Status:** token baseline approved by user — B8 screen visual approval pending
- **Date:** 2026-10-03
- **Scope:** UI/UX only

## Context

CivicOS hiện có nhiều palette khác nhau: global dark/cyan trong source, light/teal trong E1 và land-module handoff, và light/blue trong bộ prototype `land-parcel-map`. Shared shell đã tồn tại nhưng chưa có visual token duy nhất cho web/mobile.

## Decision đề xuất

1. Dùng light neutral workspace làm nền chung.
2. Dùng bộ token light/blue đã được user chốt làm baseline chung, kế thừa bộ token đã được duyệt trực quan cho `land-parcel-map`:
   - canvas `#F8FAFC`;
   - surface `#FFFFFF`;
   - text `#172033` / `#475569`;
   - action `#075985`;
   - focus `#1D4ED8`.
3. Chuẩn hóa typography về system sans; dùng monospace cho mã, timestamp và version.
4. Chuẩn hóa spacing, radius, 44px touch target và semantic state colors.
5. Không thay đổi API, database, permissions, masking, state machine, navigation hoặc data behavior.

## Alternatives không chọn

- Giữ global dark/cyan: không phù hợp với các design baseline đã có và làm land map lệch visual.
- Giữ teal E1/land-module: chưa có rendered visual validation; `land-parcel-map` là baseline mới nhất đã qua B8.
- Mỗi module giữ palette riêng: không đạt mục tiêu shared design token.

## Consequences

- Web/mobile có thể dùng cùng semantic names và giá trị màu.
- Cần một implementation pass thay raw Tailwind/inline styles bằng shared tokens.
- Cần B8 visual review trước khi thay đổi production UI.

## Boundary

Đây là design contract. Việc sửa `src/` và `mobile/` thuộc implementation phase; Research agent không chỉnh application source trong bước này.
