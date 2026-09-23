# Reviewer checkpoint — `00-agent-preflight-permissions-infra`

## Phạm vi review

- Đã đọc lại toàn bộ ticket, `spec.md`, `CONTEXT.md`, trạng thái/diff liên quan và evidence hiện tại, gồm mục `Scope disposition` mới trong `tests.md`.
- Không chạy test, lint, typecheck, format-check, build, Docker/npm/Gradle hay bất kỳ smoke/health command nào.
- Đánh giá ticket `00` đúng là **preflight/decision gate**: không yêu cầu live TileServer/tile-data smoke hoặc Gradle/mobile build trước khi ticket triển khai tương ứng được mở.
- `changes.md` và `files-changed.md` không có trong thư mục evidence ticket này; đây không phải một dòng AC riêng của ticket `00`, nên không dùng sự vắng mặt đó để suy diễn FAIL cho các AC bên dưới.

## Đối chiếu từng Acceptance Criteria

| AC | Kết quả | Bằng chứng đối chiếu |
|---|---|---|
| 1. Có inventory file/folder/command/service cho ticket 01–05 | **PASS** | Bảng inventory exact scope, dependency/infra, kiểm tra và kết luận cho 01–05 ở ticket `00:167-175`; trạng thái/dependency ở `00:177-182`. `tests.md:439-443` bổ sung disposition downstream. |
| 2. Mọi path dự kiến sửa nằm trong scope mặc định hoặc có quyết định user cụ thể | **PASS** | Exact implementation scope ở `00:167-175`; path cấm ở `00:9-14,46-52`; batch path/volume/command đã được user chốt ở `_infra-status.md:133-156`. |
| 3. Không có ticket nào phụ thuộc `.env`, secrets, permission policy, CI/CD hoặc source repo ngoài | **PASS** | Các path này bị cấm tại `00:9-14,46-52`; handoff xác nhận không giao Developer vào chúng tại `00:182`. Không có evidence nào cho thấy ticket `00` yêu cầu nới policy hoặc dùng source repo ngoài. |
| 4. `docker info`, `docker compose config` và trạng thái database được ghi nhận; Docker chưa chạy thì không giả định pass | **PASS** | `tests.md:24-76` ghi Docker Desktop, compose config và PostgreSQL running; `tests.md:292-320` ghi service/database listing, gồm `civicos_demo`; `_infra-status.md:5-11` ghi port, readiness và query probe. |
| 5. Dependency mới có package/version/license/reason/command và approval | **PASS** | MapLibre web/mobile có version, license và exact install command tại `_infra-status.md:148-150`; approval tại `:152-156`; metadata/integrity tại `tests.md:250-266`; không install package (`tests.md:3,220`). |
| 6. Đã chốt tile data/provider/TileServer hoặc ghi rõ blocker hạ tầng; không dùng fixture để giả đạt AC map | **PASS** — PASS ở decision gate, không phải live runtime | `tests.md:439-441` xác nhận user đã chốt OSS self-host, OSM/OpenMapTiles/PMTiles, bbox `105.93,20.91,106.03,20.99`, attribution/license, volume `./storage/tiles/cadn:/data:ro`, port `8080`, network, tối thiểu `10 GB` và effective fallback `maptiler/tileserver-gl:v5.6.0`. Evidence trực tiếp: `v5.6.0` HTTP 200/OCI tại `tests.md:400-405`; `v5.6.1` HTTP 404/no manifest tại `tests.md:242-248,279-282`. `tests.md:441` nói rõ live TileServer và tile-data smoke deferred cho ticket `01`; không giả pass bằng fixture. |
| 7. Đã chốt khả năng build mobile trên môi trường thực tế | **PASS** — PASS ở prerequisite/decision gate, không phải build output | User đã chốt Android native và scope ticket `05` tại `_infra-status.md:126,149-156`; JDK/SDK/ADB/emulator PASS tại `tests.md:322-338`. `mobile/`/Gradle wrapper chưa tồn tại là deliverable ticket `05`, được ghi rõ tại `tests.md:442`, `_infra-status.md:164` và ticket `00:150,164`; không yêu cầu mobile build trước khi ticket `05` tạo project. |
| 8. Đã chốt port, network, storage và database target cho local/staging-like verification | **PASS** — PASS ở target/preflight decision, không phải tile runtime smoke | Target `civicos_demo:5432`, Next `3000`, TileServer `8080`, volume, bbox, network và disk được chốt tại `_infra-status.md:141-147,167-175`; probe port/network/disk tại `tests.md:164-197,269-290,414-431`; database inventory tại `tests.md:312-320`. `storage/tiles/cadn` chưa có là trạng thái runtime deferred, không phải thiếu quyết định: `tests.md:441`, ticket `00:160-162` giao tile-data creation/smoke cho ticket `01`. |
| 9. Đã ghi rõ file/folder/infra bị từ chối và ticket nào bị block | **PASS** | Tag `v5.6.1` không tồn tại, tile storage/runtime chưa có, và Gradle/mobile project deferred được ghi tại `tests.md:341-355,416-437`; dependency graph 01→02–05 tại ticket `00:177-182`; không có path bị từ chối nào giao cho Developer (`00:165`). |
| 10. Planner đã đặt status/dependency 01–05 và không giao ticket bị block cho Developer | **PASS** | Ticket ghi `01` chỉ mở sau khi `00` đóng, `02–04` còn blocked bởi `01`, `05` còn blocked bởi `01–04` tại `00:177-182`; `tests.md:443` xác nhận chỉ `01` được mở sau `00`, các ticket còn lại không giao khi dependency chưa đạt. |

## Đối chiếu từng bước thực hiện

| Bước | Kết quả | Bằng chứng đối chiếu |
|---|---|---|
| 1. Planner đọc ticket/spec/dependency, kiểm tra working tree, không reset/xóa | **PASS** | Quy trình bắt buộc tại `00:54-57`; ticket ghi giữ nguyên thay đổi có sẵn, không reset/xóa tại `00:165`; status hiện tại cho thấy các thay đổi rộng ngoài ticket `00` vẫn được giữ. |
| 2. Lập bảng toàn bộ file/folder dự kiến cho 01–05 | **PASS** | Bảng inventory đầy đủ implementation path và dependency/infra/check tại ticket `00:167-175`. |
| 3. Tester chạy runtime preflight được giao | **PASS** trong phạm vi ticket `00`; deferred đúng scope | Node/npm/Python, Docker/compose/PostgreSQL, package inventory, port/network/storage, JDK/SDK/ADB/emulator có output tại `tests.md:9-197,284-355`. Live TileServer/tile-data smoke không chạy vì thuộc ticket `01` (`tests.md:441`); Gradle/mobile build không chạy vì project thuộc ticket `05` (`tests.md:442`). Đây là không chạy đúng boundary, không phải giả pass. |
| 4. Nếu Docker chưa chạy thì dừng, không dùng WSL/Podman | **PASS** | Docker Desktop/context và PostgreSQL running tại `tests.md:24-76,292-320`; native Windows boundary và không dùng WSL/Podman tại `tests.md:235-236,377`. |
| 5. Dependency thiếu phải có approval; không tự install | **PASS** | Version/license/command/approval MapLibre tại `_infra-status.md:148-156`; metadata tại `tests.md:250-266`; phạm vi read-only, không install tại `tests.md:3,220`. |
| 6. Thiếu SDK/tile/network/port phải ghi blocker, không đổi AC | **PASS** | Fallback image, tile storage và Gradle boundary được ghi rõ tại `tests.md:341-355,416-437`; decision mới phân biệt approval của preflight với runtime deliverable của ticket `01`/`05` tại `tests.md:439-443`. |
| 7. User decision phải được Research ghi, không tự hỏi/sửa scratch | **PASS** | Batch user decision, exact tag/port/volume/network/dependency và trạng thái approval tại `_infra-status.md:118-156`; Reviewer không sửa ticket/spec. |
| 8. Chỉ PASS/APPROVED mới gỡ blocker/giao dependency | **PASS** — theo decision gate, không giả pass downstream | `tests.md:441-443` xác nhận tile live smoke và tile data là deliverable ticket `01`, mobile project/Gradle build là deliverable ticket `05`; `tests.md:443` chỉ cho mở `01` sau khi `00` đóng và giữ `02–05` blocked theo graph. Cơ chế đúng là tách “đã chốt/approved để mở ticket triển khai” khỏi “đã chạy runtime/build”; vì vậy không dùng `BLOCKED` runtime deferred để kết luận ticket `00` fail, cũng không tuyên bố các downstream smoke/build đã pass. |

## Xác nhận bắt buộc của checkpoint

- **Fallback image:** PASS — `v5.6.0` HTTP 200, active OCI index và manifest hợp lệ (`tests.md:400-405`); `v5.6.1` HTTP 404/no manifest (`tests.md:242-248,279-282`).
- **Inventory/status:** PASS — inventory 01–05 (`00:167-175`), dependency/status (`00:177-182`), disposition (`tests.md:439-443`).
- **Path cấm:** PASS — `.env*`, secrets, `.opencode`, permission policy, CI/CD và source repo ngoài bị cấm (`00:9-14,46-52`), không giao Developer vào (`00:182`).
- **Docker/DB/network/mobile prerequisites:** PASS — Docker/compose/PostgreSQL/database target (`tests.md:24-76,292-320`), network/disk/ports (`tests.md:164-197,269-290,414-431`), JDK/SDK/ADB/emulator (`tests.md:322-338`).
- **Phạm vi deferred:** PASS — không yêu cầu live TileServer/tile-data smoke của ticket `01` hoặc Gradle/mobile build của ticket `05` để đóng preflight `00`; evidence ghi rõ đây là deliverable ticket tương ứng (`tests.md:441-443`).

## Kết luận gửi Planner

- **PASS — đủ điều kiện tick AC và commit.**
- Không commit trong lần gọi này theo yêu cầu.
- Không có tiêu chí **FAIL** hoặc **THIẾU EVIDENCE** sau khi đối chiếu mục `Scope disposition`; các evidence runtime/build deferred được phân biệt rõ với approval/preflight decision, không giả pass.

## Trục trặc gặp phải

- Không gặp trục trặc công cụ/hạ tầng cần tự xử lý trong vòng review này.
- Không phát sinh cập nhật mới cho `Lesson-learned.md`.
