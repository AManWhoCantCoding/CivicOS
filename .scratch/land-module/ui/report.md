# Báo cáo handoff UI — land-module

- Số màn hình trong brief: 6 (4 web nội bộ, 1 web public, 1 mobile read-only).
- Số file handoff textual: 6.
- Số màn hình Stitch đã render/kiểm chứng: 0.
- Nguyên nhân: Stitch MCP timeout trong lần generate; chưa có rendered screen URL.
- Baseline implementation: `brief.md`, `design-tokens.md`, `screen-01.md`–`screen-06.md`.

## Coverage

| Nhóm | Coverage |
|---|---|
| Role/scope/Assignment | Screen-01, 03, 04 |
| Four change types | Screen-02 |
| State machine/sync/approval | Screen-03 |
| Rights/encumbrances/Evidence | Screen-03, 04 |
| Public redaction/simulated | Screen-05 |
| Mobile read-only/masked/offline | Screen-06 |

## Hạn chế

- Không được coi timeout là visual pass.
- Developer phải bám textual handoff; không thêm control/field ngoài API contract.
- Khi Stitch khả dụng, chạy lại generate/extract/viewer và cập nhật link cùng chênh lệch visual.
