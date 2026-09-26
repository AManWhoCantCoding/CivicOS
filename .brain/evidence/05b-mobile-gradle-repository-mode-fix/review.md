# Review — checkpoint cuối — 05b-mobile-gradle-repository-mode-fix

## Phạm vi và evidence được chọn

- Đã đọc lại ticket bản cập nhật, toàn bộ AC/Rubric, `changes.md`, `tests.md` run2, log run2 của 05b, `tests.md` run45 và log run45 của 05a.
- PASS evidence gần nhất của 05b là `tests.md:12-19`, `scope=only=mobile:build`, không có `filter`, `HEAD: 8596cf3`, `Tree: 3e66b41f`.
- Checkpoint fingerprint hiện tại: `node scripts/verify.mjs --tree` → `Tree: 3e66b41f`, khớp `tests.md:14`.
- Tester evidence do Planner cung cấp cho vòng này: exact command `node scripts/verify.mjs 05a-mobile-build-boundary-fix --only=mobile:build --timeout=1200000`, exit code `0`, output `mobile:build PASS`; repository conflict không fatal và warning `MavenRepo` non-fatal được AC-04 cho phép.
- Log build tương ứng của 05b ghi warning repository tại `run2-mobile_build.log:31-43` và `BUILD SUCCESSFUL` tại dòng 152; log 05a run45 ghi cùng kết quả tại `run45-mobile_build.log:31-43,152`.
- Không chạy test/build/lint/typecheck/format-check. Chỉ chạy ngoại lệ bắt buộc ở checkpoint cuối là lệnh fingerprint `--tree` nêu trên. Không commit.

## Bảng 1 — Spec-to-Code Traceability Matrix: Acceptance Criteria

| ID yêu cầu (AC) | Mức độ đáp ứng | File & dòng code xử lý | Test Case / evidence chứng minh |
|---|---|---|---|
| AC-01 | **PASS** | `mobile/android/settings.gradle:7`; `changes.md:17-22` mô tả implementation patch chỉ đổi một token ở file này | `changes.md:4-7,17-23` xác nhận file implementation duy nhất và không đổi phần ngoài repository-mode. `git diff` không hiện patch tracked vì file settings đang ở trạng thái untracked trong checkout; việc này được ghi nhận là giới hạn hiển thị VCS, không phủ định declaration scope của `changes.md`. |
| AC-02 | **PASS** | `mobile/android/settings.gradle:7`: `RepositoriesMode.PREFER_SETTINGS`; cùng block có `repositories { google(); mavenCentral() }` đúng thứ tự | Source hiện tại khớp enum và allow-list; `changes.md:18-21` xác nhận không thêm repository thứ ba, URL hoặc `jcenter()`. |
| AC-03 | **PASS** | `mobile/android/settings.gradle:1-6,8-10`: `pluginManagement`, React Native settings plugin, `ReactSettingsExtension`, autolinking, `rootProject.name`, `include ':app'`, hai `includeBuild` | Source hiện tại giữ nguyên các block; `changes.md:19-20` xác nhận các phần ngoài repository mode không đổi so với baseline ticket. |
| AC-04 | **PASS** | `mobile/android/settings.gradle:7`: đổi mode tối thiểu để plugin React Native thêm project repository mà không làm build fatal | Tester exact command: `node scripts/verify.mjs 05a-mobile-build-boundary-fix --only=mobile:build --timeout=1200000`; **exit code 0**, output **`mobile:build PASS`**. `run2-mobile_build.log:31-43` còn warning repository, và `:152` ghi `BUILD SUCCESSFUL`; warning `MavenRepo` non-fatal được ticket cho phép. `tests.md:12-19` khớp HEAD/Tree hiện tại. |
| AC-05 | **PASS** | Implementation source chỉ đổi repository mode ở `mobile/android/settings.gradle:7`; không có URL/dependency/plugin version mới, skip/exclude/bypass | `changes.md:20-22` xác nhận không sửa production/mobile business source, wrapper/checksum, lockfile, `node_modules`, `.env`, verifier hoặc `.scratch`; source `settings.gradle:1-10` không có khai báo ngoài scope. |
| AC-06 | **PASS** | Link blocker hiện hữu tại `.scratch/civicos-e1-clone-mvp/issues/05a-mobile-build-boundary-fix.md:4`; không sửa AC của 05a | 05a line 4 trỏ tới `05b-mobile-gradle-repository-mode-fix`; AC của 05a vẫn ở `:34-45`. Exact verifier AC-04 đã exit `0`, nên tiền đề build pass của AC-06 được đáp ứng; `05a` run45 log ghi `BUILD SUCCESSFUL` (`run45-mobile_build.log:152`). |

## Bảng 2 — Spec-to-Code Traceability Matrix: Rubric độc lập

### Rubric bắt buộc

| Trục Rubric | Mức độ đáp ứng | Đối chiếu với | Bằng chứng |
|---|---|---|---|
| Allow-list repository chỉ `google()` + `mavenCentral()` trong `dependencyResolutionManagement` | **PASS** | Ticket:56; `.scratch/civicos-e1-clone-mvp/spec.md:222-227` | `settings.gradle:7` chỉ có `google()` rồi `mavenCentral()` trong dependency repositories. `gradlePluginPortal()` tại `settings.gradle:3` thuộc `pluginManagement`, không phải dependency allow-list. |
| React Native settings plugin/autolinking vẫn hoạt động; build pass bằng thay đổi repository mode tối thiểu | **PASS** | Ticket:57; `05a-mobile-build-boundary-fix.md:77-79` và AC-04 | `settings.gradle:2-6,10` giữ plugin/autolinking/includeBuild; log có các task autolinking tại `run2-mobile_build.log:45-49`; exact verifier của Tester exit `0`, `mobile:build PASS`; `run2-mobile_build.log:152` là `BUILD SUCCESSFUL`. |
| Không né build/hạ boundary bằng repository tùy tiện, skip/exclude/bypass hoặc sửa ngoài allow-list | **PASS** | Ticket:58; `.scratch/civicos-e1-clone-mvp/spec.md:222-227` và AC-05 | `changes.md:20-22` xác nhận không thêm repository/dependency/URL, không sửa verifier/05a; source chỉ đổi enum mode tại dòng 7. |

### Rubric khuyến nghị

| Trục Rubric | Mức độ đáp ứng | Đối chiếu với | Bằng chứng |
|---|---|---|---|
| Tối thiểu hóa thay đổi | **PASS — 2/2** | Ticket:64 | `changes.md:17-20` và `settings.gradle:7`: chỉ đổi một enum token, không format hoặc chỉnh unrelated config. |
| Provenance repository | **PASS — 2/2** | Ticket:65 | `settings.gradle:3,7` phân biệt plugin allow-list với dependency allow-list; `changes.md:19-21` xác nhận không có repository/dependency mới. |
| Tính tái lập | **PASS — 2/2** | Ticket:66 và AC-04 | Tester đã chạy exact verifier command với exit code `0`, `mobile:build PASS`; warning `MavenRepo` non-fatal được chấp nhận. Tree hiện tại `3e66b41f` khớp `tests.md:14` và fingerprint checkpoint. |

## Gate hướng `không` — checklist boundary module / CONTEXT.md / ADR

| Hạng mục | Mức độ đáp ứng | Bằng chứng |
|---|---|---|
| Boundary module/package | **PASS** | `spec.md:74-79` xác định `mobile/` là package độc lập với Next.js; ticket chỉ cho sửa `mobile/android/settings.gradle`; patch không thêm mobile business flow và không chạm source nghiệp vụ. |
| `CONTEXT.md` | **PASS** | `CONTEXT.md:1-3` mô tả domain CivicOS; các boundary nghiệp vụ tại `CONTEXT.md:43-49` không bị thay đổi. Thay đổi chỉ là Gradle repository mode, không thêm route, quyền hay domain behavior. |
| ADR liên quan | **PASS — không có ADR áp dụng** | `docs/adr/` đã được enumerate và hiện không có tài liệu; không có ADR để đối chiếu/xung đột. Quyết định kỹ thuật được đối chiếu trực tiếp với ticket:36-41. |

## Kết luận checkpoint

- AC-01..AC-06: **PASS** độc lập.
- Rubric bắt buộc: cả 3 trục **PASS**.
- Rubric khuyến nghị: cả 3 trục đạt ngưỡng, tổng điểm ghi nhận **6/6**.
- Gate hướng `không`: boundary module, `CONTEXT.md`, ADR checklist đều **PASS**.
- Round-trip check được thực hiện theo đúng thứ tự: suy ngược từ diff/evidence PASS trước, sau đó mới mở ticket hiện tại để đối chiếu.
- Reviewer không tự đặt trạng thái ticket và không commit.

## Round-trip check — suy ngược trước, đối chiếu ticket sau

### Bước 1 — Suy ngược yêu cầu từ diff và evidence PASS (trước khi mở ticket)

Nguyên văn phần suy ngược:

> Yêu cầu ban đầu nhiều khả năng là đổi tối thiểu một token repository mode trong `mobile/android/settings.gradle`, từ chế độ fail cứng khi React Native settings plugin thêm project repository sang chế độ ưu tiên settings nhưng không fail, để plugin/settings autolinking và `mobile:build` chạy được. Danh sách dependency repository trong `dependencyResolutionManagement` phải giữ nguyên allow-list `google()` rồi `mavenCentral()` và provenance; `pluginManagement`, React Native settings plugin, `ReactSettingsExtension`, `autolinkLibrariesFromCommand()` và các `includeBuild` phải được giữ nguyên. Không được thêm repository/URL/dependency, skip/exclude/bypass hoặc mở rộng boundary; implementation chỉ nằm ở file settings. Warning repository `MavenRepo` nếu còn nhưng non-fatal có thể chấp nhận khi exact build pass.

Bằng chứng đã đọc trước ticket: `mobile/android/settings.gradle:1-10`, `changes.md:17-23`, `tests.md:999-1006`, `run45-mobile_build.log:31-49,152`, và review evidence hiện có tại `review.md:16-21,27-39`.

### Bước 2 — Đối chiếu với ticket/Rubric hiện tại

- **Kết luận: PASS.** AC-01 khớp phạm vi một file và chỉ đổi repository mode; AC-02 khớp `PREFER_SETTINGS` cùng allow-list đúng thứ tự `google()`/`mavenCentral()`; AC-03 khớp việc giữ nguyên plugin management, React Native settings/autolinking và include builds.
- **Kết luận: PASS.** AC-04 khớp exact verifier command, `exit code 0`, `mobile:build PASS`, các task autolinking đã chạy, và warning `MavenRepo` được chấp nhận khi không còn fatal; AC-05 khớp việc không thêm repository/URL/dependency hoặc bypass; AC-06 khớp việc giữ liên kết blocker và không sửa AC của `05a`.
- **Kết luận: PASS.** Ba Rubric bắt buộc khớp phần suy ngược: allow-list/provenance được giữ, RN plugin/autolinking build pass bằng thay đổi mode tối thiểu, và không hạ boundary bằng workaround. Ba trục khuyến nghị cũng cùng hướng: tối thiểu hóa thay đổi, provenance repository, và tái lập bằng exact verifier.

**Kết luận Round-trip: PASS — phần suy ngược khớp AC và toàn bộ Rubric hiện tại; không phát hiện diễn giải lệch yêu cầu nghiệp vụ.**

## Trục trặc gặp phải

- Lệnh shell lọc danh sách `git ls-files | findstr` bị lỗi cú pháp/diễn giải tham số; đã bỏ cách lọc đó và dùng `git`/read theo path trực tiếp. Không ảnh hưởng evidence review.
- `git diff` không hiển thị nội dung settings vì `mobile/android/settings.gradle` đang là file untracked; đã đối chiếu source hiện tại, `changes.md`, evidence build và ghi rõ giới hạn này ở AC-01 thay vì suy luận từ diff rỗng.
- Đã cập nhật mục **“Hidden-path candidate verification”** trong `Lesson-learned.md` với biến thể lọc shell không tương thích.
- CodeGraph không nhận diện file settings đang untracked và trả về symbol không liên quan; đã dùng source settings/evidence đã xác nhận thay thế, không dùng kết quả không liên quan để kết luận. Đã đối chiếu và dùng lại mục **“CodeGraph không định vị được file cấu hình ngoài phạm vi lập chỉ mục”** đã có trong `Lesson-learned.md`, không tạo mục trùng.

## Artifact

- Review đã ghi tại `.brain/evidence/05b-mobile-gradle-repository-mode-fix/review.md`.
- Không commit.
