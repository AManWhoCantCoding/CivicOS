# Trạng thái workflow v3.1 — land-module

- **B1:** Đã qua cổng — người dùng xác nhận "đúng ý"; sản phẩm `docs/research/land-module/input.md`.
- **B2:** Đã qua cổng — người dùng duyệt; sản phẩm `docs/research/land-module/law-vn.md`.
- **B3:** Đã qua cổng — người dùng duyệt; sản phẩm `docs/research/land-module/law-intl.md`.
- **B4:** Đã qua cổng — sản phẩm `docs/research/land-module/law-summary.md`; người dùng đã xác nhận `chốt scope_update`.
- **B4.5:** Đã qua cổng — `docs/design/land-module/data-model.md` đã được người dùng chốt và khóa với `LOCK.json` stage `data-model`.
- **B5:** Đã qua cổng — giai đoạn 1 và giai đoạn 2 ở chế độ tiết kiệm; sản phẩm `.scratch/land-module/council/hat-*.md` và `.scratch/land-module/feature-list.md`; người dùng xác nhận giữ nguyên 7 tính năng ngày 2026-09-30.
- **B6:** Đã qua cổng — bộ design 8 file đã full lock; SOW và UI screen inventory đã được người dùng chốt ngày 2026-09-30.
- **B7:** Đã qua cổng — `.scratch/land-module/ui/brief.md`, `report.md`, `design-tokens.md` và `screen-01.md` đến `screen-06.md` đã tạo; brief đủ thông tin và coverage state/role đã kiểm tra. Stitch timeout ở lần generate đầu tiên nên chưa có rendered screen URL; handoff markdown được giữ và ghi rõ giới hạn trong report.
- **B8:** Đã qua cổng — 5 phase files và 19 ticket contracts đã hoàn thiện; F-07 đã amend thêm nested Evidence routes cho application/parcel/party với exact policy hiện có và được người dùng chốt.
- **B9:** Đã bắt đầu ticket `LND-01`; Plan Check PASS, Developer đã tạo schema/migration PostGIS, seed và test trong evidence `.brain/evidence/LND-01/`. Chưa qua cổng verify: `check-scope.mjs diff` bị chặn bởi nhiều thay đổi ngoài phạm vi đã tồn tại trong working tree; chưa chạy `full`, chưa tick AC, chưa commit.
- **Bước hiện tại:** B9 — DO/triển khai, Mentor điều phối; đang chờ working tree sạch hoặc baseline được xác nhận để tiếp tục kiểm tra khách quan.
- **Bước tiếp theo:** tiếp tục B9 sau khi xử lý blocker phạm vi; chỉ chuyển B10 sau khi mọi ticket đã verify và đóng.
- **Ngày cập nhật:** 2026-09-30.
