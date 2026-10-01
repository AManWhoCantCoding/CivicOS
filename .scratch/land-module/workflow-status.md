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
| Phase 03 — Mock sync & approval | done | `PHASE-PASS`; LND-10–LND-13 |
| Phase 04 — Public lookup & read-only clients | done | `PHASE-PASS`; LND-14–LND-16 |
| Phase 05 — Evidence & hardening | pending | frontier selection pending; EvidenceStorageAdapter flow remains a dependency |

### Effective ticket status

- **done:** LND-01, LND-02, LND-03, LND-04, LND-05, LND-06, LND-07, LND-08, LND-09, LND-10, LND-11, LND-12, LND-13, LND-14, LND-15, LND-16.
- **pending/frontier:** Phase 05 ticket selection pending.
- **blocked:** none by completed Phase 04; Phase 05 tickets still require their declared dependencies.

### Traceability notes

- LND-01: implementation commit `ea72f7f`; review/evidence under `.brain/evidence/LND-01/`.
- LND-02–LND-10: git history confirms the shared implementation commit `e81c252`; individual review/evidence where present under `.brain/evidence/LND-02/`, `LND-07/`, `LND-08/`, `LND-09/`, `LND-10/`.
- LND-11: implementation/verification commit `58e887e`; tests are in `tests/land/lnd11-sync-retry.test.ts` and contract traceability is in `T-LND-11-sync-retry-command-persistence.md`.
- LND-12: implementation/verification commit `862de7a`; tests are in `tests/land/lnd12-approval-completion.test.ts` and contract traceability is in `T-LND-12-approval-completion-transaction.md`.
- LND-13: implementation/verification commit `8ec844a`; tests are in `tests/land-ui/lnd13-application-processing-actions.test.ts` and contract traceability is in `T-LND-13-web-application-processing-actions.md`.
- LND-14: implementation/verification commit `e331951`; tests are in `tests/land/lnd14-public-lookup.test.ts` and contract traceability is in `T-LND-14-public-lookup-projection-rate-limit.md`.
- LND-15: implementation/verification commit `c661456`; tests are in `tests/land-ui/lnd15-web-public-lookup.test.ts` and contract traceability is in `T-LND-15-web-public-lookup.md`.
- LND-16: implementation/verification commit `af2132e`; tests are in `mobile/src/features/__tests__/land.test.ts` and contract traceability is in `T-LND-16-mobile-read-only.md`.
- Phase 03 gate: `PHASE-PASS`; full suite `426 passed`, land scope `154 passed`, E2E `91 passed`, build/typecheck/lint/format passed using a local backend at `http://localhost:3001`.
- Phase 04 gate: `PHASE-PASS`; full suite `440 passed`, `270 skipped`, E2E `91 passed`, build/typecheck/lint/format and Prisma generation passed; mobile tests/typecheck/Android build passed using a local backend at `http://localhost:3001`.
- `.brain/evidence/LND-10/files-changed.md:16-17` still says no commit was created; this conflicts with git history (`e81c252` contains the three LND-10 source/test files) and is preserved as an evidence discrepancy, not silently edited.
- LND-03/LND-04/LND-05: disposition explicitly recorded in their V6 ticket files; no standalone evidence directory was invented.
- Phase 02: `.brain/evidence/phase-02/gate.md` records `PHASE-PASS`.
- Known design text discrepancy (`data-model.md` says proposal while `LOCK.json` says full) is preserved and not modified.
- Migration changed workflow artifacts only; no source, database, design, research or evidence files were changed by migration. Migration commit: `e2cc9f7`.

### LND-11 contract interpretation

- **Decision date:** 2026-10-01.
- **Decision owner:** người dùng ủy quyền Techlead tự quyết.
- **Authoritative behavior for LND-11:** synchronous mock sync; `LandChangeApplication` chuyển trực tiếp `in_review → pending_approval` khi adapter success, hoặc `in_review → sync_failed` khi adapter failure. Retry success chuyển `sync_failed → pending_approval`.
- `sync_pending`/`sync_succeeded` trong `LandNationalSync` vẫn ghi nhận kết quả operation; không expose các trạng thái trung gian này trên `LandChangeApplication` trong ticket LND-11.
- API contract và LND-11 ticket acceptance được dùng làm authority cho endpoint; wording state-machine trung gian trong `data-model.md`/`domain-rules.md` được ghi nhận là follow-up contract normalization, không sửa trong implementation.
