# ADR-0004 — Đồng bộ UI/UX toàn bộ CivicOS theo shared Light/Blue baseline

- **Status:** `ACCEPTED` — B12 approved by the user on 2026-10-23; the recovered
  overview was accepted as replacement for the unavailable original.
- **Proposed:** 2026-10-05; **accepted:** 2026-10-23.
- **Scope:** UI/UX presentation only.

## Context

`civicos-ui-design-system` đã chuẩn hóa một phần web/mobile nhưng còn nhiều
surface legacy dark/cyan/teal ở identity, access, vehicles, field, public
lookup, mobile auth/settings/incident và các page/component lân cận. User yêu
cầu đồng bộ tất cả UI/UX.

## Decision

Mở work item `civicos-uiux-alignment` theo route `FULL_FEATURE`, dùng lại exact
Light/Blue tokens và primitives đã được duyệt, triển khai theo dependency từ
shared foundation tới web/mobile surfaces rồi cross-surface verification.

## Consequences

- Người dùng có visual/state/accessibility language thống nhất trên toàn bộ UI.
- Shared primitives có blast radius lớn nên cần phase/ticket/file boundary và
  regression theo caller.
- Mobile vẫn read-only; UI parity không đồng nghĩa capability parity.
- Mọi thay đổi API, data, permission, route, map hoặc legal meaning phải tách
  thành contract review khác.

## Alternatives rejected

- Migrate từng module độc lập: dễ tạo token/style drift mới.
- Ép mobile parity với web: vượt mobile read-only boundary.
- Tạo design system/palette mới: trùng lặp baseline đã được user duyệt.

## Boundary

Không thay đổi business behavior, API, database/schema/seed, route destination,
permission, Assignment, masking, state machine, integration, offline policy,
map projection/provider hoặc legal/public claim.

## Acceptance record

The user explicitly chose “Duyệt cả B12” on 2026-10-23 after being told that
the overview is a non-verbatim recovery summary and the original could not be
found. The approval accepts that summary as the replacement overview; it does
not claim that the lost original was recovered. See
`.scratch/civicos-uiux-alignment/review.md`.
