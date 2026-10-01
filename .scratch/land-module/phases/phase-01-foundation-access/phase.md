# Phase 01 — Foundation & access

- **Workflow version:** V6
- **Effective status:** done
- **V3 source:** `phase-01-foundation-access.md` (migrated; ticket contracts split below)
- **Gate status:** reconciled from the shared implementation batch and targeted/phase evidence; no standalone Phase 01 gate artifact exists.

## Phạm vi phase

Tạo nền database/PostGIS, party/parcel nội bộ, seed giả lập và authorization/Assignment land. Phase này hoàn thiện F-01 và phần nền F-06; không tạo application workflow, sync, approval hoặc public lookup.

## Tính năng thuộc phase

- F-01 — quản lý party, parcel, geometry, rights/encumbrances read projection.
- F-06 — role/capability land, OrganizationUnit scope, Assignment `land_review` và audit nền.

## SOW và phụ thuộc phase

- SOW mapping: F-01 và phần nền F-06 trong `.scratch/land-module/sow.md` mục 3–5.
- Phụ thuộc trước: `docs/design/land-module/LOCK.json` stage `full`; PostgreSQL image phải cung cấp PostGIS.
- Mở khóa cho: Phase 02 dùng `LandParty`, `LandParcel`, identity scope và `land_review` Assignment.
- UI constraint: `ui/screen-04.md` là nguồn duy nhất; Stitch chưa có rendered URL theo `ui/report.md`.

## Phase DoD

- PostgreSQL có PostGIS, tám bảng land, FK `RESTRICT`, CHECK, unique/index và GiST index.
- Party hợp lệ được mã hóa; response không chứa ciphertext hoặc identity number plaintext.
- Polygon invalid/SRID sai bị từ chối với `LAND_GEOMETRY_INVALID`.
- Leader cùng OrganizationUnit tạo được Assignment `land_review`; officer thiếu Assignment bị từ chối.
- Parcel detail có rights/encumbrances projection và không có direct mutation control.
- Screen-04 xử lý loading/error/empty/forbidden/offline mà không lộ resource ngoài scope.

## Ticket index

| ID | File V6 | Effective status | V3 status | Blocked by |
|---|---|---|---|---|
| LND-01 | `T-LND-01-migration-eight-land-tables.md` | done | done | không |
| LND-02 | `T-LND-02-party-parcel-service-api.md` | done | needs-triage | LND-01 |
| LND-03 | `T-LND-03-parcel-detail-rights-encumbrances.md` | done | needs-triage | LND-01, LND-02 |
| LND-04 | `T-LND-04-land-role-capability-assignment-policy.md` | done | needs-triage | LND-01 |
| LND-05 | `T-LND-05-web-parcel-party-workspace.md` | done | needs-triage | LND-02, LND-03, LND-04 |

## V6 reconciliation

- `e81c252` là shared implementation batch cho LND-02–LND-10 theo quyết định migration của người dùng.
- LND-03/LND-04 được chấp nhận theo source/test trong shared batch và targeted regression references tại LND-07/LND-08 cùng phase gate.
- LND-05 được chấp nhận theo source/test trong shared batch và LND-09 UI evidence (`LND-09 + LND-05 UI`).
- V3 status và checklist gốc được giữ trong trường `V3 status`/contract của từng ticket; effective status V6 là trạng thái reconciled.
