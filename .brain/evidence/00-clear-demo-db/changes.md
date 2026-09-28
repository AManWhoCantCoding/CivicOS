Ticket yêu cầu reset fail-closed chỉ tác động `civicos_demo`, dọn toàn bộ row application và Evidence demo.
File implementation của ticket chỉ gồm resolver/reset, helper Evidence và test demo/integration trong whitelist.
Acceptance chính: raw URL precedence/guard trước Prisma, đủ 31 model, containment file và isolation `civicos`.
README chỉ được phép chứa command/guard contract; các phần architecture/UI/mobile/seed checklist không thuộc ticket.
Boundary lần này phân biệt rõ file implementation của ticket với các thay đổi pre-existing trong working tree.

## File implementation của ticket

- `scripts/demo/demo-db.ts` — giữ raw URL theo precedence `DEMO_DATABASE_URL` rồi `DATABASE_URL`, loại bỏ rewrite database name.
- `scripts/demo/reset.ts` — thêm inventory đủ 31 model, confirmation/target guard trước dynamic import Prisma, summary count, Evidence marker cleanup trước `TRUNCATE ... RESTART IDENTITY CASCADE`.
- `src/modules/platform/evidence/storage-adapter.ts` — thêm helper chỉ gọi `LocalEvidenceStorage.remove` với key relative và containment dưới `storage/evidence`; `reset.ts` import helper trực tiếp từ file này.
- `tests/demo/demo-bootstrap.test.ts` — thêm test raw precedence, wrong target và tên database gần giống.
- `tests/integration/demo-seed-reset.integration.test.ts` — thêm test full inventory, migration preservation, physical Evidence ownership, repeat no-op và snapshot isolation.

## README và file pre-existing

- `README.md` — đã modified từ trạng thái git ban đầu của phiên. Contract hiện tại tại mục “Demo database và dữ liệu hiện có”, phần “Guard demo...” (khoảng dòng 245–255) đã có target `civicos_demo`, confirmation, precedence, full application-row clear, Evidence namespace cleanup và giữ `civicos`/`storage/tiles`. Không có hunk README mới của ticket; không chỉnh sửa hoặc tách/revert nội dung pre-existing.
- `src/modules/platform/evidence/index.ts` — không có thay đổi; không export helper và không nằm trong call path của reset.
- Các thay đổi pre-existing ngoài ticket được giữ nguyên: `scripts/verify.mjs`, `next-env.d.ts`, `tests/tooling/**`, `mobile/android/**`, `.brain/evidence/**`, `.scratch/civicos-e1-clone-mvp/**` và các generated/untracked artifacts hiện có.

## Boundary review context

- Không redo runtime implementation và không sửa source/test của ticket đã đúng.
- Không reset, checkout, clean, xóa hoặc format lại thay đổi người dùng.

## Lần sửa lỗi 1

- `tests/integration/demo-seed-reset.integration.test.ts` — sửa callback spy `remove` tại dòng 131 từ implicit return của `Array.push` sang block không trả về giá trị, bảo đảm kiểu `Promise<void>` và giữ nguyên assertion containment `expect(removed).toEqual([])` cùng production implementation.

## Lần sửa lỗi 2

- `scripts/demo/demo-db.ts` — `resolveDemoTarget` gọi `assertDemoTarget` trên raw URL đã chọn trước khi trả target; giữ precedence `DEMO_DATABASE_URL`, raw URL và thông tin database đã validate.

## Vòng sửa lỗi 1 sau Reviewer FAIL

- `scripts/demo/reset.ts` — thêm seam `resetDemo(env, database?)`; vẫn validate/log target `civicos_demo` trước, nhưng integration test có thể truyền Prisma client đã bind vào database test riêng mà không dynamic-connect tới demo target.
- `tests/integration/demo-seed-reset.integration.test.ts` — bỏ early-return; bắt buộc các URL cần thiết, assert database test không phải `civicos_demo`, giữ snapshot/sentinel read-only của `CIVICOS_DATABASE_URL`, và chuyển toàn bộ reset/read/write fixture sang client test riêng.
- `Lesson-learned.md` — ghi bài học tổng quát về việc inject isolated Prisma client và fail rõ ràng khi thiếu URL test.
