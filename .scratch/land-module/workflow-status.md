# Trạng thái workflow v3.1 — land-module

- **B1:** Đã qua cổng — người dùng xác nhận "đúng ý" trong phiên hiện tại; sản phẩm `docs/research/land-module/input.md`.
- **B2:** Đã qua cổng — người dùng chốt toàn bộ các bước sau B1 trong phiên hiện tại; sản phẩm `docs/research/land-module/law-vn.md` được giữ nguyên.
- **B3:** Đã qua cổng — người dùng chốt toàn bộ các bước sau B1; sản phẩm `docs/research/land-module/law-intl.md` được giữ nguyên.
- **B4:** Đã qua cổng — người dùng chốt toàn bộ các bước sau B1; sản phẩm `docs/research/land-module/law-summary.md` được giữ nguyên.
- **B4.5:** Đã qua cổng — `docs/design/land-module/LOCK.json` tồn tại với `stage: full` và được kiểm tra khớp lock.
- **B5:** Đã qua cổng — feature-list và biên bản đồng thuận đã có; người dùng chốt toàn bộ các bước sau B1.
- **B6:** Đã qua cổng — bộ design 8 file, SOW và full lock đã được người dùng chốt.
- **B7:** Đã qua cổng theo xác nhận người dùng; `ui/report.md` vẫn ghi Stitch timeout/no rendered URL, nên B9 phải dùng textual handoff và không coi timeout là visual evidence.
- **B8:** Đã qua cổng — 5 phase files và ticket contracts đã có; người dùng chốt toàn bộ các bước sau B1.
- **B9:** `LND-01` đã triển khai và commit; ticket kế tiếp đủ dependency là `LND-02`, cần Plan Check rồi mới giao Developer.
- **Bước hiện tại:** B9 — Mentor điều phối triển khai.
- **Bước tiếp theo:** thực hiện Plan Check cho `LND-02`, sau đó triển khai đúng ticket và dừng tại cổng verify.
- **Ngày cập nhật:** 2026-09-30.

## V6 migration checkpoint

- **Trạng thái:** `MIGRATED`.
- **Ngày migration:** 2026-10-01.
- **Quy tắc authoritative:** theo quyết định người dùng option 2 — reconcile bằng evidence/review, git history của `e81c252` là shared implementation batch cho LND-02–LND-10, và `.brain/evidence/phase-02/gate.md` là phase gate cho LND-06–LND-09.
- **Lịch sử V3:** giữ nguyên trong các trường `V3 status` và phần lịch sử workflow; không xóa/sửa nội dung lịch sử B1–B9.

### Effective phase status

| Phase | Effective status | Gate/frontier |
|---|---|---|
| Phase 01 — Foundation & access | done | LND-01–LND-05 reconciled; no standalone Phase 01 gate artifact |
| Phase 02 — Intake & review | done | `PHASE-PASS`; LND-06–LND-09 |
| Phase 03 — Mock sync & approval | in-progress | current frontier: LND-11; LND-10 done |
| Phase 04 — Public lookup & read-only clients | pending/blocked | blocked by Phase 03/LND-11/LND-12 |
| Phase 05 — Evidence & hardening | pending/blocked | blocked by Phase 01–04 and EvidenceStorageAdapter flow |

### Effective ticket status

- **done:** LND-01, LND-02, LND-03, LND-04, LND-05, LND-06, LND-07, LND-08, LND-09, LND-10.
- **pending/frontier:** LND-11.
- **blocked:** LND-12, LND-13, LND-14, LND-15, LND-16, LND-17, LND-18, LND-19.

### Traceability notes

- LND-01: implementation commit `ea72f7f`; review/evidence under `.brain/evidence/LND-01/`.
- LND-02–LND-10: git history confirms the shared implementation commit `e81c252`; individual review/evidence where present under `.brain/evidence/LND-02/`, `LND-07/`, `LND-08/`, `LND-09/`, `LND-10/`.
- `.brain/evidence/LND-10/files-changed.md:16-17` still says no commit was created; this conflicts with git history (`e81c252` contains the three LND-10 source/test files) and is preserved as an evidence discrepancy, not silently edited.
- LND-03/LND-04/LND-05: disposition explicitly recorded in their V6 ticket files; no standalone evidence directory was invented.
- Phase 02: `.brain/evidence/phase-02/gate.md` records `PHASE-PASS`.
- Known design text discrepancy (`data-model.md` says proposal while `LOCK.json` says full) is preserved and not modified.
- Migration changed workflow artifacts only; no source, database, design, research or evidence files were changed by migration. No commit was created.
