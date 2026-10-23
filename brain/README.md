---
title: CivicOS — bộ thiết kế hợp nhất
status: draft
owner: project
created: 2026-10-23
updated: 2026-10-23
sources:
  - ../CONTEXT.md
  - ../Requirement.md
  - ../docs/agents/project.md
  - ../docs/agents/domain.md
  - adr/
  - ../docs/<feature>/
  - domains/*/research/
  - ../.scratch/
---

# CivicOS — bộ thiết kế hợp nhất

> Bản tổng hợp thiết kế theo snapshot working tree ngày 23/10/2026. Đây là tài liệu **draft**, không phải bằng chứng rằng mọi nội dung đã được PO duyệt hoặc mọi `LOCK.json` còn hợp lệ.

## Mục đích và ranh giới

Bộ tài liệu này gom các thiết kế liên quan thành một điểm vào thống nhất, giúp phân biệt yêu cầu, quyết định, contract, nghiên cứu và trạng thái triển khai. Agrios chỉ được dùng làm tham khảo về cách trình bày: metadata rõ, câu ngắn, bảng có mục đích, quyết định truy vết được và trạng thái minh bạch. Không có nội dung nghiệp vụ của Agrios được áp dụng cho CivicOS.

Các feature contract hiện ở `docs/<feature>/`, quyết định ở `brain/adr/`, research/kiến thức miền ở `brain/domains/`, cùng workflow trong `.scratch/`, runbook và các nguồn rải rác. Tài liệu này **không** thay thế contract hoặc đổi nghĩa nghiệp vụ; tham chiếu hiện hành được trỏ tới các đích mới. Khi cần triển khai một feature, tiếp tục đọc contract liên quan và `LOCK.json` theo `docs/agents/domain.md`.

## Điểm vào theo chủ đề

| Tài liệu | Bao quát | Nguồn chính |
|---|---|---|
| [product-context.md](product-context.md) | Bối cảnh CivicOS, thuật ngữ, phạm vi sản phẩm và thứ tự đọc nguồn | `CONTEXT.md`, `Requirement.md`, `docs/agents/` |
| [e1-operations.md](e1-operations.md) | E1-004/005/007, role mapping, ranh giới web/mobile và quyết định còn chờ | `docs/civicos-e1-*`, ADR-0005, role matrix v2, `.scratch/` |
| [land.md](land.md) | Land module, tra cứu công khai và projection thửa đất trên bản đồ | `docs/land-*`, `brain/adr/0001-0002`, `brain/domains/land/research/` |
| [ui-experience.md](ui-experience.md) | Shared UI baseline, alignment, unified web workspace và bản đồ đường đi UI | `docs/civicos-ui-*`, `docs/civicos-unified-web-workspace`, UI map |
| [demo-data.md](demo-data.md) | Phân biệt work item seed đã đóng với thiết kế seed hiện hành | `docs/demo-seed-*`, `.scratch/demo-seed-*`, runbook |
| [demo-runner.md](demo-runner.md) | Guided UI demo, giới hạn an toàn và trạng thái handoff | `docs/ui-auto-demo`, `.scratch/ui-auto-demo`, demo script |
| [research-and-decisions.md](research-and-decisions.md) | ADR, research, nguồn rải rác và các bất nhất cần giữ hiển thị | `brain/adr/`, `brain/domains/*/research/`, role matrices và design briefs |

## Thứ tự nguồn và cách giải quyết khác biệt

1. Dùng `CONTEXT.md` cho thuật ngữ nghiệp vụ chuẩn; không đổi nghĩa của `IntakeReport`, `Incident`, `Subject`, `Actor`, `User`, `Evidence`, `Assignment`, `DomainEvent`, `AuditEvent`, `SLA` hoặc `Approval`.
2. Đối chiếu yêu cầu gốc `Requirement.md`, quyết định ADR có trạng thái phù hợp, contract feature và lock tương ứng. `docs/agents/project.md` ghi rõ thứ tự nguồn mà agent phải dùng.
3. Dùng research để truy nguồn và ghi giới hạn xác minh; dùng workflow/SOW/ticket trong `.scratch/` để biết trạng thái và bằng chứng của work item, không biến chúng thành luật chung.
4. Nếu status hoặc nội dung mâu thuẫn, ghi rõ hai nguồn, bằng chứng và phần chưa chốt. Không tự đổi status ADR, sửa contract locked, hoặc kết luận từ code đang dirty.

`docs/reset/**` là hồ sơ census/audit theo thời điểm; các tài liệu workflow trong `docs/archive/**` là lịch sử. Chúng hữu ích để truy vết nguồn nhưng không tự trở thành policy hay quyết định sản phẩm hiện hành.

## Quy ước trạng thái

| Trạng thái | Ý nghĩa trong bộ tổng hợp |
|---|---|
| `draft` | Bản tổng hợp chưa được duyệt như một contract mới. |
| `proposed` | Có đề xuất/ADR chờ cổng quyết định; không được triển khai như quyết định đã chấp thuận. |
| `approved` / `accepted` | Chỉ ghi khi nguồn người dùng/ADR/workflow xác nhận rõ; không suy ra từ việc có file hoặc lock. |
| `complete` | Một phạm vi triển khai/verification đã hoàn tất; không đồng nghĩa toàn sản phẩm hoàn chỉnh. |
| `closed` | Work item đóng; không tái sử dụng manifest, ticket hoặc status của nó như scope hiện hành. |
| `pending` / `blocked` | Còn cổng, phụ thuộc hoặc câu hỏi chưa xử lý. |

## Giới hạn snapshot

- Git status được đọc trước khi tạo bộ tài liệu cho thấy working tree có nhiều thay đổi staged/unstaged/untracked, bao gồm cả một số design files và `LOCK.json`. Vì vậy nội dung dưới đây là tổng hợp từ snapshot hiện tại; không khẳng định tương ứng với `HEAD`, không chạy `verify-lock`, và không ghi đè các thay đổi đó.
- Các status workflow được ghi lại theo tài liệu đang có trong working tree; ngày/commit/evidence cũ trong `.scratch/` được giữ như nguồn lịch sử, không coi là lần kiểm tra runtime mới.
- Không có test, build hoặc kiểm tra pháp lý mới được thực hiện trong lần tổng hợp này.
