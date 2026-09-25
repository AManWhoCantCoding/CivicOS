# Quy trình hệ thống Agent CivicOS

## 1. Phạm vi và nguồn sự thật

Tài liệu này mô tả **cấu hình agent đang có trong repo**, không mô tả một workflow giả định.

Các nguồn cần đối chiếu để hiểu đầy đủ hệ thống:

1. `opencode.jsonc` — agent mặc định, model, permission và quyền gọi agent khác.
2. `.opencode/agent/*.md` — quy tắc vận hành của từng agent.
3. `CONTEXT.md` — domain vocabulary và boundary của CivicOS. Repo hiện dùng file ở **root**, không phải `docs/CONTEXT.md`.
4. `.scratch/<feature>/` — spec, ticket, dependency và trạng thái công việc.
5. `.brain/PROTOCOL.md` — ranh giới evidence; tên file evidence đang vận hành được ghi ở mục 8.
6. `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md` và các ADR liên quan trong `docs/adr/` nếu có.

`docs/adr/` hiện không có file ADR trên working tree. Khi ADR được bổ sung, Planner/Reviewer vẫn phải đọc ADR chạm tới phạm vi ticket.

## 2. Kiến trúc hai team

```text
Người dùng
   ↓
Research — Team Thiết kế (agent mặc định)
   ├─ hỏi/làm rõ nghiệp vụ bằng question
   ├─ nếu có UI: brief → ui-ux → file thiết kế trong .scratch
   └─ tạo spec/ticket trong .scratch/<feature>/
   ↓  người dùng chuyển sang Planner
Planner — Team Dev (bộ não điều phối)
   ↓
Developer ───────────────┐
   │ nếu lỗi hạ tầng model: developer-fallback
   ↓                      │
Reviewer: gate hướng      │
   ↓                      │
Tester: toàn bộ kiểm tra  │
   ├─ FAIL → Developer → Tester (tối đa 5 vòng cùng lỗi)
   └─ PASS
   ↓
Reviewer: gate cuối theo Acceptance Criteria/evidence
   ├─ thiếu evidence → Tester bổ sung
   ├─ lỗi code → Developer → Tester → Reviewer
   └─ PASS → Reviewer commit theo lệnh chính xác của Planner
   ↓
Planner cập nhật ticket + files-changed.md và báo cáo người dùng
```

### Ranh giới gọi agent

- `research` là agent mặc định và là điểm giao tiếp đầu tiên với người dùng.
- Research **không gọi trực tiếp** Planner, Developer, Tester hoặc Reviewer. Sau khi ticket đủ rõ, Research thông báo để người dùng chuyển sang Planner.
- Planner là agent duy nhất của Team Dev được phép gọi Developer, `developer-fallback`, Tester, Reviewer và — chỉ khi thiếu quyết định nghiệp vụ — Research.
- Research là agent duy nhất được gọi `ui-ux`.
- Developer, Tester, Reviewer và `ui-ux` không được gọi agent khác.

## 3. Các agent hiện tại

| Agent | Team / model | Được gọi bởi | Quyền và trách nhiệm chính |
|---|---|---|---|
| `research` | Thiết kế / `openai/gpt-5.6-luna` | Mặc định; người dùng | Làm rõ nghiệp vụ, đọc context/source, tạo spec/ticket; ghi `docs/**`, `research/**`, `.scratch/**`, `README.md`; không sửa code/evidence. |
| `ui-ux` | Thiết kế / `openai/gpt-5.6-luna` | Research | Dùng Google Stitch để tạo design-only artifact trong `.scratch/<feature>/ui/`; không đọc/sửa source và không lấy screen code. |
| `planner` | Dev / `openai/gpt-5.6-luna` | Người dùng sau handoff | Đọc ticket, kiểm soát dependency, điều phối mọi bước, cập nhật trạng thái `.scratch/**` và evidence tổng kết; không sửa source và không tự chạy kiểm tra. |
| `developer` | Dev / `opencode/muse-spark-1.3-contributor-free` | Planner | Viết implementation/test theo ticket; không tự chạy test/lint/typecheck/build, không commit, không sửa `.scratch`. |
| `developer-fallback` | Dev / `openai/gpt-5.6-luna` | Planner | Thực hiện cùng vai trò Developer khi model chính gặp rate-limit/quota/overload/timeout từ provider. |
| `tester` | Dev / `openai/gpt-5.6-luna` | Planner | Agent duy nhất chạy test, lint, typecheck, format-check, E2E và build theo phạm vi được giao; ghi evidence kiểm tra; không sửa product code. |
| `reviewer` | Dev / `openai/gpt-5.6-luna` | Planner | Đọc diff/ticket/evidence, chấm `PASS`/`FAIL`/`THIẾU EVIDENCE`; không tự chạy kiểm tra; chỉ commit khi Planner ra lệnh chính xác. |

`opencode.jsonc` đặt `default_agent` là `research`; `planner` là agent `primary` của Team Dev. Permission của harness là lớp chặn kỹ thuật; ticket và prompt agent là lớp giới hạn nghiệp vụ/phạm vi hẹp hơn.

Các MCP đang khai báo:

- `codegraph`: tra cứu symbol/call path; Planner phải sync sau mỗi lần có file thay đổi.
- `stitch`: chỉ `ui-ux` được dùng để tạo design artifact.
- `postgres`: được cấp cho Developer và Tester theo `opencode.jsonc`; Planner/Reviewer không tự truy vấn database trong workflow.

## 4. Giai đoạn thiết kế — Research

### 4.1. Tiếp nhận và khảo sát

Research:

- đọc `CONTEXT.md`, ADR liên quan, tài liệu trong `docs/**` và source liên quan; không đọc cả codebase nếu không cần;
- xác định mục tiêu nghiệp vụ, boundary trong/ngoài phạm vi và có cần UI hay không;
- không tự suy diễn khi thiếu quyết định nghiệp vụ — phải dùng `question` hỏi người dùng;
- chỉ chạy skill khi người dùng tự gọi, ví dụ `/grill-me`, `/grill-with-docs`, `/to-spec`, `/to-tickets`, `/wayfinder`;
- giữ mọi tài liệu thiết kế bằng Tiếng Việt; tên field, API, route, error/log và stack trace giữ nguyên convention gốc.

### 4.2. Tạo ticket

Cấu trúc chuẩn:

```text
.scratch/<feature>/
├── spec.md
├── readiness-review.md          # nếu feature có preflight
├── issues/
│   ├── 00-*.md
│   ├── 01-*.md
│   └── ...
└── ui/                          # chỉ khi feature có UI
    ├── brief.md
    ├── design-tokens.md
    ├── screen-XX-*.md
    └── report.md
```

Mỗi ticket phải có:

- `Status` và `Blocked by`;
- file được phép sửa và file cấm sửa;
- mô tả ngắn;
- Acceptance Criteria dạng checklist `- [ ]`;
- Rubric bắt buộc/khuyến nghị;
- các bước thực hiện dạng checklist;
- mục `## Đang chờ Research` khi thật sự thiếu quyết định nghiệp vụ;
- trạng thái cuối và lý do nếu `wontfix`.

Research tạo/cập nhật nội dung ticket nhưng **không tự chuyển trạng thái**. Planner là người tick bước/Acceptance Criteria và cập nhật trạng thái sau khi có evidence.

### 4.3. Khi feature có UI

Research phải gọi `ui-ux` **trước khi hoàn thiện ticket cuối cùng** nếu có route/màn hình mới, thay đổi layout/component đáng kể hoặc người dùng yêu cầu UI/UX.

Quy trình:

1. Copy `.scratch/_templates/brief-template.md` thành `.scratch/<feature>/ui/brief.md`.
2. Brief phải nêu màn hình, luồng chuyển màn, component bắt buộc và loading/empty/error/success.
3. Gọi `ui-ux` bằng đường dẫn `brief.md`, không dán brief trực tiếp vào prompt.
4. Đọc `report.md`; nếu thiếu thông tin thì bổ sung brief và chỉ gọi lại phần thiếu.
5. Rubric UI trong ticket trỏ trực tiếp tới `screen-XX-*.md`.

`ui-ux` chạy theo chuỗi `create-project` → `generate-design` → `extract-design-context` → generate các màn còn lại → `design-viewer`, tối đa 2 lần generate lại cho một màn. Output là token/mô tả/link Stitch; không gọi `fetch_screen_code`.

Research chỉ kết thúc thiết kế khi ticket có đủ AC/Rubric, không còn câu hỏi mở, và — nếu có UI — có `report.md` cùng các screen file liên quan.

## 5. Giai đoạn triển khai — Planner

### 5.1. Nhận ticket và preflight

Trước khi gọi agent thực thi, Planner phải:

1. đọc toàn bộ ticket và Rubric từ đĩa;
2. đọc lại ticket trước **mọi quyết định tiếp theo**, không dùng bản ghi nhớ của vòng trước;
3. đọc `CONTEXT.md`, ADR/dependency liên quan;
4. từ chối làm việc thiết kế hoặc tự tạo ticket nếu feature chưa có ticket phù hợp;
5. kiểm tra file thay đổi sẵn có và không reset/xóa thay đổi của người dùng;
6. kiểm tra Docker/database theo cadence 60 phút qua Tester nếu ticket cần hạ tầng;
7. chạy `codegraph sync` ngay sau mỗi lần xác nhận có file được sửa/thêm, trước bước kế tiếp.

Nếu feature có preflight, ví dụ PS-E1 hiện tại, ticket preflight phải hoàn tất trước các ticket phụ thuộc. Không tự đổi AC để né thiếu package, SDK, Docker, database, network, port hoặc tile data.

### 5.2. Gọi Developer

- Planner giao **toàn bộ** các bước thực hiện trong một lần gọi, dùng `/implement` hoặc `/tdd` theo ticket.
- Developer bắt buộc áp dụng `/ponytail`, chỉ sửa phần được giao và trả diff thô.
- Developer ghi `.brain/evidence/<ticket-id>/changes.md` sau mỗi lần thực thi.
- Developer không chạy bất kỳ test/lint/typecheck/format/build nào. Kết quả “tự thấy compile/pass” không phải evidence.

#### Fallback model

Chỉ chuyển sang `developer-fallback` khi kết quả có tín hiệu lỗi hạ tầng model như rate-limit, quota, `service_overloaded`, provider timeout hoặc lỗi tương đương. Nếu người dùng chủ động ngắt rồi yêu cầu tiếp tục, phải tiếp tục đúng agent đang chạy dở, không tự chuyển fallback.

Sau khi một ticket đã được xử lý bởi fallback, các vòng sửa tiếp theo của **cùng ticket** tiếp tục dùng fallback. Ticket mới quay lại `developer` mặc định.

### 5.3. Gate hướng triển khai

Sau Developer, Planner gọi Reviewer kiểm tra riêng:

- boundary module;
- domain model và `CONTEXT.md`;
- ADR;
- phạm vi ticket;
- hướng triển khai tổng thể.

Gate này chưa chấm toàn bộ AC và chưa thay Tester chạy kiểm tra. Nếu `FAIL` vì sai hướng, Developer phải redo toàn bộ ticket theo hướng Reviewer nêu, không vá cục bộ. Nếu `PASS`, mới chuyển sang Tester.

### 5.4. Tester và vòng sửa lỗi

Tester chạy toàn bộ loại kiểm tra áp dụng cho ticket:

- unit/integration test;
- E2E/Playwright;
- lint;
- typecheck;
- format-check;
- build nếu Planner giao hoặc ticket yêu cầu.

Tester phải đọc `Lesson-learned.md` trước khi chạy, ghi lệnh/kết quả/log nguyên văn vào `.brain/evidence/<ticket-id>/tests.md`, và mô tả đủ bước tái hiện khi có FAIL. Tester không tự gọi agent khác và không tự sửa product code.

Nếu FAIL: Planner giao Developer sửa đúng lỗi, rồi gọi Tester chạy lại **toàn bộ** phạm vi kiểm tra. Đếm chung lỗi do Tester phát hiện và lỗi do Reviewer phát hiện; quá 5 vòng cùng lỗi kỹ thuật thì Planner tự động chuyển `wontfix`, phải ghi rõ lý do và tiếp tục ticket khác.

Với tranche PS-E1 hiện tại, spec đặt thứ tự kiểm tra tối thiểu:

```text
npm run prisma:generate
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:e2e
npm run build
```

Mobile build/test chỉ chạy khi ticket mobile giao và môi trường native đã được preflight.

### 5.5. Thiếu quyết định nghiệp vụ

Nếu phát hiện ticket thiếu dữ kiện chỉ người dùng mới quyết định:

1. Planner gọi Research qua `task` và nêu chính xác câu hỏi còn thiếu.
2. Research dùng `question` hỏi người dùng, sau đó cập nhật spec/ticket.
3. Planner đọc lại ticket từ đĩa rồi tiếp tục.

Nếu Research không thể hỏi được người dùng, ghi `## Đang chờ Research`, không chuyển `wontfix`, và Planner xử lý ticket khác nếu có.

## 6. Gate cuối, commit và đóng ticket

### 6.1. Review cuối

Khi Tester PASS toàn bộ:

1. Planner tick các bước thực hiện trong ticket.
2. Planner gọi Reviewer đối chiếu **từng** Acceptance Criteria với diff, ticket và evidence.
3. Reviewer chỉ trả `PASS`, `FAIL` hoặc `THIẾU EVIDENCE` cho từng tiêu chí và ghi `.brain/evidence/<ticket-id>/review.md`.
4. Reviewer không tự chạy lại test. Nếu thiếu evidence, Planner gọi Tester bổ sung; nếu có lỗi code, Planner quay lại Developer → Tester.

Reviewer PASS toàn bộ thì Planner tick AC và gọi Reviewer lần cuối bằng lệnh rõ ràng dạng:

```text
commit với message: <commit message>
```

Chỉ Reviewer được commit. Reviewer phải dùng git identity của người dùng thật; không thêm trailer nhận diện AI/agent.

### 6.2. Trạng thái ticket

Các nhãn triage chuẩn:

- `needs-triage`: maintainer cần đánh giá;
- `needs-info`: đang chờ thông tin/quyết định;
- `ready-for-agent`: đủ rõ để Planner giao agent;
- `ready-for-human`: cần Developer con người;
- `wontfix`: không triển khai.

Trạng thái cuối của ticket chỉ là:

- **`done`**: toàn bộ AC và bước thực hiện đã tick, Tester PASS, Reviewer PASS và đã commit;
- **`wontfix`**: không thể/không nên hoàn thành vì bế tắc kỹ thuật, quá 5 vòng cùng lỗi, lỗi thời hoặc xung đột thiết kế; bắt buộc ghi lý do cụ thể.

Thiếu quyết định nghiệp vụ không phải `wontfix`; dùng `needs-info`/`## Đang chờ Research` cho đến khi có câu trả lời.

## 7. Hạ tầng và quy tắc an toàn

- Trước ticket cần database, Planner đọc `.brain/evidence/_infra-status.md`; đủ 60 phút mới gọi Tester kiểm tra lại.
- Tester chạy `docker info`. Nếu Docker Desktop chưa chạy, Tester dừng và yêu cầu người dùng tự mở; không tự khởi động ứng dụng.
- Khi Docker Desktop đã chạy, Tester được phép chạy `docker compose up -d` theo compose đã duyệt.
- Không dùng WSL, Podman hoặc container engine khác thay Docker Desktop của quy trình này.
- Không sửa `.env`/`.env.*`, secrets, credentials, CI/CD workflow hoặc permission policy nếu ticket không cấp rõ; được đọc `.env` khi cần nhưng không in giá trị bí mật.
- Không tự cài package lạ. Dependency mới phải có package/version/license/reason/command và approval trước khi Developer cài.
- Không force-push, `rm -rf`, `git reset --hard` hoặc lệnh phá hoại tương đương.

## 8. Evidence và bài học

### 8.1. Evidence theo ticket

Tên file đang được prompt agent, ticket PS-E1 và evidence hiện hành sử dụng:

```text
.brain/evidence/<ticket-id>/
├── changes.md       # Developer: file và thay đổi của lần thực thi
├── tests.md         # Tester: lệnh, kết quả, testcase, log lỗi
├── review.md        # Reviewer: PASS/FAIL/THIẾU EVIDENCE; hash nếu commit
└── files-changed.md # Planner: tổng kết sau khi đóng ticket
```

`.brain/` chỉ chứa evidence, không chứa thiết kế, nội dung ticket hay file điều phối trung gian. Nếu `wontfix`, `files-changed.md` ghi lý do, tiến độ dở dang và file đã đổi.

### 8.2. `Lesson-learned.md`

- Mọi agent đọc `Lesson-learned.md` trước khi thực thi.
- Developer/Tester/Reviewer ghi bài học khi tự gặp và xử lý xong bug/trục trặc của mình.
- Planner ghi bài học cho các quyết định điều phối bất thường: fallback model, redo sai hướng, quá 5 vòng, Research không hỏi được user hoặc bế tắc tương tự.
- Bài học phải tổng quát, không ghi secret, PII, tên ticket hoặc chi tiết đặc thù không tái sử dụng được.

## 9. Quyền ghi thực tế

| Khu vực | Research | Planner | Developer / fallback | Tester | Reviewer | ui-ux |
|---|---:|---:|---:|---:|---:|---:|
| `docs/**`, `research/**` | ghi | không | không theo prompt | không | không | không |
| `.scratch/**` | tạo/cập nhật nội dung | cập nhật trạng thái/evidence điều phối | cấm | cấm | cấm | chỉ `.scratch/**/ui/**` |
| Source implementation | cấm | cấm | chỉ file ticket cho phép | cấm | cấm | cấm |
| `tests/**`, `playwright/**` | cấm | cấm | chỉ khi ticket giao viết test | được tạo/sửa trong phạm vi test | cấm | cấm |
| `.brain/evidence/**` | cấm | tổng kết | `changes.md` | `tests.md` | `review.md` | cấm |
| `git commit` | cấm | cấm | cấm | cấm | chỉ khi Planner ra lệnh | cấm |

Permission trong `opencode.jsonc` còn khóa `.env`, secrets, workflow và các lệnh nguy hiểm ở lớp harness. Bảng trên mô tả **quy trình được phép**, không phải lời mời mở rộng phạm vi ticket.

## 10. Báo cáo và handoff

### Developer

Trả diff thô, danh sách file đã đổi, đường dẫn `changes.md`, nguyên nhân lỗi/trục trặc nếu có; không báo cáo kết quả test.

### Tester

Trả kết quả thô riêng cho từng loại kiểm tra, log lỗi nguyên văn khi FAIL, đường dẫn `tests.md`; không tự khuyến nghị cách sửa.

### Reviewer

Trả bảng từng tiêu chí với `PASS`/`FAIL`/`THIẾU EVIDENCE`, bằng chứng cụ thể, đường dẫn `review.md`; nếu được lệnh commit thì trả hash commit.

### Planner

Cuối phiên báo cáo theo bốn nhóm:

- `done` và commit hash;
- ticket tự chuyển `wontfix` cùng lý do;
- ticket đang chờ Research cùng câu hỏi còn thiếu;
- ticket bị hạ tầng chặn và việc người dùng cần làm.

## 11. Các điểm lệch cần biết trong cấu hình hiện tại

Đây là các khác biệt giữa tài liệu/cấu hình hiện có; không được âm thầm coi chúng là đã giải quyết:

1. **Đường dẫn context:** một số prompt cũ ghi `docs/CONTEXT.md` hoặc `docs/contexts/*/CONTEXT.md`, nhưng repo hiện có `CONTEXT.md` ở root. Khi đọc domain, dùng file root.
2. **Tên evidence trong protocol:** `.brain/PROTOCOL.md` còn mô tả biến thể `bug-reports/` và `review-log.md`; prompt agent, ticket hiện tại và evidence đang dùng `changes.md`, `tests.md`, `review.md`, `files-changed.md`. Workflow này dùng bộ tên thứ hai.
3. **Quyền ghi `Lesson-learned.md`:** prompt yêu cầu Planner/Tester có thể ghi bài học, nhưng permission edit hiện tại của Planner/Tester không whitelist file root này. Không bypass permission; nếu gặp, ghi nhận blocker/evidence và để người có quyền xử lý.
4. **TDD và nơi chạy kiểm tra:** `AGENTS.md` yêu cầu Red → Green → Refactor và verification trước khi kết luận; prompt Team Dev tách việc viết code/test cho Developer và việc chạy mọi kiểm tra cho Tester. Vì vậy chỉ kết quả từ Tester mới là evidence pass/fail; Planner phải điều phối thứ tự để không dùng báo cáo tự kiểm tra của Developer.
5. **Whitelist file:** permission của Developer khá rộng ở lớp harness, nhưng ticket vẫn là giới hạn nghiệp vụ bắt buộc. Reviewer/Planner phải đối chiếu diff với mục “File được phép sửa”, không dựa riêng vào permission.

## 12. File cấu hình/quy ước liên quan

- `opencode.jsonc`: default agent, model, MCP và permission.
- `.opencode/agent/research.md`: Team Thiết kế.
- `.opencode/agent/ui-ux.md`: thiết kế màn hình qua Stitch.
- `.opencode/agent/planner.md`: điều phối Team Dev.
- `.opencode/agent/developer.md`: triển khai thuần.
- `.opencode/agent/tester.md`: kiểm tra và evidence test.
- `.opencode/agent/reviewer.md`: review và commit có điều kiện.
- `CONTEXT.md`: domain vocabulary ở root.
- `AGENTS.md`: guardrail chung của repo.
- `.brain/PROTOCOL.md`: boundary của evidence.
- `docs/agents/issue-tracker.md`: cấu trúc tracker local Markdown.
- `docs/agents/triage-labels.md`: nhãn triage chuẩn.
- `.scratch/_templates/ticket-template.md`: template ticket.
- `.scratch/_templates/brief-template.md`: template UI brief.
