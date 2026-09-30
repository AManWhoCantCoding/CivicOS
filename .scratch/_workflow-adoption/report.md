# Báo cáo áp dụng workflow

## Kết quả

- Workflow roles đã được đặt ở `workflow-roles/`.
- Script `check-scope.mjs` và `verify.mjs` là trọng tài khách quan.
- Evidence path dùng `.brain/evidence/<ticket-id>/`.

## Rủi ro

- Worktree có thể chứa untracked design/evidence; phải inventory trước mọi cleanup.
- Ticket nhiều module hoặc chạm schema/auth/payment phải nâng Full Lane.

## Hành động tiếp theo

- Dùng ticket ready-for-agent có design lock.
- Không chạy thao tác xóa rộng để “làm sạch” worktree.
