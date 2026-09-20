# Ticket 05 evidence — Developer changes (diagnosing-bugs + minimal fix)

## Diagnosis (Phase 1–4, read-only before edit)

- Symptom: native Windows suite 16 passed/16 failed; isolated
  `test_inspections.py::test_establishment_create_edit_and_schedule`
  shows UI `Không thể kết nối để lưu cơ sở.` while trace/network and
  Next log show `POST /api/establishments 201`.
- Preserved evidence (copied before service logs are overwritten, under
  `.brain/evidence/03-native-acceptance-gate/`):
  `diagnosis-full-suite-next-before-isolated.log`,
  `diagnosis-isolated-establishment-next-after-run.log`,
  `diagnosis-isolated-establishment-trace.network`, plus original
  `playwright/test-results/*/trace.zip`.
- Response-body proof from trace resources: POST 201 body is valid
  `{"establishment":{...}}` (exactly the client contract), subsequent
  GETs return the record. No failed request in HAR, no console error,
  Next logs clean. Transport/harness hypothesis rejected as root cause.
- Root cause R1: post-`await` `event.currentTarget.reset()` inside the
  success path throws because React nulls `currentTarget` after dispatch
  (verified in vendored `react-dom-client.development.js`
  `executeDispatch`: `event.currentTarget = null` after listener
  returns). The bare `catch` then overwrites the success message with a
  fake connection error. Same pattern in 7 forms.
- Root cause R2: `IncidentStatusActions.findApproval` treated a decided
  approval (`status rejected/approved`) as a new request, so reject
  shows `Đã gửi yêu cầu Approval.` instead of `Đã ghi nhận thao tác.`
  Proof: reject response body is `{"result":{"approval":{...,
  "status":"rejected",...}}}` with HTTP 200.

## Files changed (Ticket 05 whitelist only)

- `src/components/inspections/EstablishmentForm.tsx`: capture
  `formElement = event.currentTarget` synchronously; post-await reset
  uses `formElement`.
- `src/components/inspections/InspectionScheduleForm.tsx`: same
  capture/reset fix.
- `src/components/inspections/RecommendationForm.tsx`: same
  capture/reset fix.
- `src/components/inspections/InspectionFindingForm.tsx`: same
  capture/reset fix (offline-queue path).
- `src/components/vehicles/RegistryForm.tsx`: same capture/reset fix.
- `src/components/vehicles/VehicleObservationForm.tsx`: same
  capture/reset fix (offline-queue path).
- `src/components/vehicles/VehicleVerificationForm.tsx`: same
  capture/reset fix.
- `src/components/incidents/IncidentStatusActions.tsx`: `findApproval`
  now returns `{ id, status }`; success message is
  `Đã gửi yêu cầu Approval.` only for `pending` approvals, otherwise
  `Đã ghi nhận thao tác.`

## What was NOT changed

- No `src/app/api/**` change: response contracts proven correct.
- No `playwright/conftest.py`, `playwright/pages.py`,
  `playwright/test_*.py` change: existing assertions already assert the
  real contract and serve as the regression seam (they go green once
  the client stops throwing).
- No retries, sleeps, timeouts, `navigator.onLine` stubs, direct-API
  bypass, or weakened assertions.

## Static verification (Linux session)

- `npm run typecheck` (`tsc --noEmit`): pass, no output.
- `npx eslint` on the 8 touched files: pass, no output.
- `npx prettier --check` on the 8 touched files: pass.

## For Tester (native Windows reproduction)

```text
Set-Location "D:\Project\CivicOS\playwright"
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest --browser chromium --project desktop test_inspections.py::test_establishment_create_edit_and_schedule
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest --browser chromium --project desktop test_incidents.py::test_incident_full_lifecycle_approves_and_rejects_commands
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest --browser chromium
```

- No native test run was performed or claimed from this Linux session;
  no commit, review, or ticket status change was made.

---

# Follow-up (Ticket 05, remaining 12 failures) — Developer changes (diagnosing-bugs + implement)

## Diagnosis (read-only before edit)

- H1 — inspection schedule `Chu kỳ` timeout (`pages.py:293`,
  8 tests incl. desktop/mobile establishment, offline checklist,
  recommendation desktop, stale-command desktop/mobile):
  real DOM is a wrapped label `Chu kỳ` + `select[name="cadenceMonths"]`
  with options `Mỗi N tháng` (`InspectionScheduleForm.tsx:169-182`).
  Exact accessible-name matching on the wrapped label is brittle;
  the select itself exists (screenshot evidence). Fix at the browser
  seam: locate `select[name="cadenceMonths"]` directly, same value `3`.
- H2 — vehicle registry strict-mode violation (desktop/mobile):
  two legitimate exact `Đã xác minh` texts — header status badge
  `<span>{statusLabel}</span>` plus verification-history
  `<p>{verification.result}</p>` where the test verifies with
  `result="Đã xác minh"` (`VehicleObservationDetail.tsx:241-243,336-338`).
  Fix at the browser seam: scope assertion to the `span` status badge.
- H3 — duplicate offline vehicle both rejected (desktop/mobile):
  `duplicate_last_offline_command` clones the queue entry with the same
  `clientCommandId`, so localStorage holds two entries with one id, and
  the test opens a second `OfflineQueueStatus` tab. `activeSync` guards
  only one JS context, so both tabs POST the same id concurrently.
  Server `markOfflineCommandSyncing` lease lets one owner through; the
  loser gets `OFFLINE_COMMAND_NOT_PENDING` (400), which the client maps
  to `rejected`, and `updateQueueItem(id)` flips both same-id entries —
  final snapshot `Chờ gửi=0, Lỗi/từ chối=2, Đã xác nhận=0`. Also, without
  dedupe, one page alone would POST the same id twice in sequence.
  Fix browser-side in `src/components/field/**` only: one network sync
  per unique id, cross-tab per-id mutual exclusion via Web Locks, and
  reconcile `OFFLINE_COMMAND_NOT_PENDING` against `GET /api/sync`
  instead of marking rejected.
- Out of scope / untouched: mobile recommendation login `0 POST`
  assertion (login seam not implicated by the three defects above);
  all server modules (`src/app/api/sync`, `field-sync`) unchanged.

## Files changed (this follow-up only)

- `playwright/pages.py` (`schedule_inspection`): cadence locator is now
  `select[name="cadenceMonths"]` + `select_option("3")` +
  `to_have_value("3")`; same selected value, no weakened behavior.
- `playwright/pages.py` (`vehicle_status`): assertion scoped to
  `locator("span").get_by_text(label, exact=True)` (current-status badge
  UI); history `<p>` no longer matched; no blind bypass.
- `src/components/field/offline-queue.ts`: `isSyncable` (same
  pending/failed/5-min-stale rule as before); `claimSyncSlot` (Web Locks
  per `clientCommandId`, direct run when unavailable); `syncOfflineQueue`
  syncs each unique id once and re-reads fresh state under the lock,
  skipping already-terminal entries; `syncQueueItem` reconciles
  `OFFLINE_COMMAND_NOT_PENDING` via `GET /api/sync` (applies authoritative
  terminal status, or `syncing` while another owner holds the lease)
  instead of marking rejected. No auto-sync disable, no sleep/retry/long
  timeout, no `navigator.onLine` stub, no direct-API test path.

## What was NOT changed

- Prior 8-file `currentTarget`/`findApproval` fix kept as-is.
- No `src/app/api/**`, `src/modules/**`, Prisma, package, README,
  conftest, or `test_*.py` change.

## Static verification (Linux session)

- `npm run typecheck` (`tsc --noEmit`): pass.
- `npx eslint src/components/field/offline-queue.ts`: pass.
- `npx prettier --check src/components/field/offline-queue.ts`: pass
  (after `--write` formatting of the same file).
- `python3 -m py_compile playwright/pages.py`: pass (`PY_COMPILE_OK`).
- No native test run was performed or claimed from this Linux session;
  no commit, review, or ticket status change was made.

---

# Follow-up 2 (Ticket 05, remaining failures) — Developer changes (diagnosing-bugs + implement)

## Diagnosis (read-only before edit; trace/snapshot replay, no native run)

- Feedback loop used (Linux-only): replay of captured native artifacts —
  `playwright/test-results/*/trace.zip` (`trace.trace` event sequence),
  `failure-0.png` screenshot, aria snapshot inside `full-suite.log` — plus
  `src` reads. No native E2E claimed; Tester owns the rerun.
- F1 — `inspection_status` strict violation (establishment + stale tests,
  desktop/mobile): PROVEN. Two identical
  `<span class="rounded-full bg-cyan-400/10 ...">Đã lập lịch</span>`
  (`InspectionDetail` header badge + `ChecklistForm` status badge).
- F2 — planner-described `sync_offline_queue(expected_synced=1)` timeout:
  NOT REPRODUCED in any on-disk artifact. All 6 vehicle-lifecycle runs
  (targeted pre-fix, full-suite, regression post-fix, desktop+mobile) pass
  line 32 `sync_offline_queue` and fail deterministically at line 40
  `escalate_vehicle` — `get_by_label("OrganizationUnit đích")` 30s timeout
  (`pages.py:552`). `offline-queue.ts` left untouched (duplicate-offline
  idempotency passes; every single-command sync reaches `synced=1`).
- F2 actual — escalate label seam: PROVEN by trace (verify passes
  `call@219/221`, then `call@223` waits 30s) + `failure-0.png` (the
  `OrganizationUnit đích` select is visibly rendered while the lookup
  resolves zero nodes). Same signature as offline-checklist
  `get_by_label("Mục checklist")` select timeout: every passing label
  lookup targets input/textarea, every failing one targets a `<select>`
  inside an implicit wrapping `<label>`. Fix: explicit `htmlFor`/`id`
  association (repo precedent: `OrganizationUnitPicker.tsx`), test
  assertions unchanged in strength.
- F3 — recommendation `checklist_save` "element(s) not found": PROVEN
  mechanism via aria snapshot (old `Đã bắt đầu inspection.` message
  persists, save button enabled). The `required` completion `<select>`
  lives INSIDE `<form onSubmit={saveChecklist}>`, so native validation
  vetoes the save submit while completion is empty. Same aria dump proves
  name pollution: completion select is exposed as
  `Kết quả hoàn tất inspection Hoàn tất` (wrapped button text leaks into
  the name), breaking `checklist_complete` exact lookup. Fix: completion
  controls moved out of the save form; `htmlFor`/`id` scopes the name.
- Out of scope / untouched: `test_incident_projection` login
  `0 POST /api/auth/session` assertion (login seam, unrelated to the
  above); `src/app/api/**`, `src/modules/**`, Prisma, package, README,
  conftest, `test_*.py`, `.next`, `.venv` untouched.

## Files changed (this follow-up only, Ticket 05 whitelist)

- `src/components/inspections/InspectionDetail.tsx`: header status badge
  carries `data-testid="inspection-status"`.
- `playwright/pages.py` (`inspection_status`): asserts via
  `get_by_test_id("inspection-status")` + `to_have_text(label)` — same
  labels, single current-status node, no weakened text match.
- `src/components/vehicles/VehicleEscalationForm.tsx`: `htmlFor`/
  `id="vehicle-escalation-organization"` on the org label + select/input
  (only one renders at a time); `escalate_vehicle` page-object unchanged.
- `src/components/inspections/InspectionFindingForm.tsx`: `htmlFor`/
  `id="inspection-finding-checklist"` (`Mục checklist`) and
  `id="inspection-finding-result"` (`Kết quả`).
- `src/components/inspections/ChecklistForm.tsx`: completion select +
  `Hoàn tất` button moved out of the save `<form>` (save submit no longer
  vetoed by the empty required completion select); completion label uses
  `htmlFor`/`id="inspection-complete-result"` so its accessible name is
  exactly `Kết quả hoàn tất inspection`.

## What was NOT changed

- Prior `currentTarget` (8 files), `findApproval`, cadence-select,
  `vehicle_status` span-scope, and Web Locks/dedup fixes kept as-is.
- No `offline-queue.ts` change: sync path proven working by all artifacts.
- No sleeps/retries/longer timeouts, `navigator.onLine` stubs, API
  bypasses, weakened assertions, or new `test_*.py` cases (existing tests
  already distinguish these seams; they go green once the seams resolve).

## Static verification (Linux session)

- `npm run typecheck` (`tsc --noEmit`): pass, no output.
- `npx eslint` on the 4 touched `src` files: pass, no output.
- `npx prettier --check` on the 4 touched `src` files: pass.
- `python3 -m py_compile playwright/pages.py`: pass (`PY_COMPILE_OK`).
- No native test run was performed or claimed from this Linux session;
  no commit, review, or ticket status change was made.

## For Tester (native Windows rerun)

```text
Set-Location "D:\Project\CivicOS\playwright"
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest test_inspections.py::test_establishment_create_edit_and_schedule test_vehicles.py::test_vehicle_registry_observation_match_confirm_verify_evidence_and_escalate test_vehicles.py::test_duplicate_offline_vehicle_command_is_idempotent test_incidents.py::test_incident_full_lifecycle_approves_and_rejects_commands --browser chromium --project desktop
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest test_inspections.py::test_establishment_create_edit_and_schedule test_vehicles.py::test_vehicle_registry_observation_match_confirm_verify_evidence_and_escalate test_vehicles.py::test_duplicate_offline_vehicle_command_is_idempotent test_incidents.py::test_incident_full_lifecycle_approves_and_rejects_commands --browser chromium --project mobile
D:\Project\CivicOS\playwright\.venv\Scripts\python.exe -m pytest --browser chromium
```

---

# Follow-up 3 (Ticket 05, page/test seam only) — Developer changes (/implement)

- `playwright/pages.py` (`record_finding`): `Mục checklist` lookup now targets verified `#inspection-finding-checklist`; `Kết quả` lookup now targets verified `#inspection-finding-result`; same `select_option("license")` / `select_option("needs_action")` values.
- `playwright/pages.py` (`escalate_vehicle`): field lookup now targets verified `#vehicle-escalation-organization`; select-or-input branch (`SELECT` → `select_option(value=...)` else `fill`) preserved.
- `playwright/test_inspections.py` (`test_stale_offline_inspection_command_is_rejected`): removed Python Playwright `expect.poll` block; replaced with `stale_app.wait_for_offline_queue_error("STALE_OFFLINE_COMMAND")`; `expect_queue_count("Lỗi/từ chối", "1")` retained.

## Static verification (Linux session)

- `python3 -m py_compile playwright/pages.py playwright/test_inspections.py`: pass (`PY_COMPILE_OK`).
- `AST parse` both files: pass (`AST_OK`).
- `expect` import in `test_inspections.py` still used (lines 65, 66, 68, 94, 105); no import change needed.
- No native test run was performed or claimed from this Linux session; no commit, review, or ticket status change was made.

---

# Follow-up 4 (Ticket 05, 5 remaining failures) — Developer changes (/diagnosing-bugs + /implement, native Windows verification)

## Diagnosis evidence (all from real native artifacts, no guessing)

- F1 — offline checklist `#inspection-finding-checklist` disabled (desktop+mobile): PROVEN by trace response bodies + screenshot. Offline `inspection.start` (baseV1) queued, accepted locally, parent went optimistic `in_progress`; during the evidence-retry online window the queue auto-synced start+save (server v2→v3, `{"result":{"status":"in_progress","version":2/3}}`) while `InspectionDetail`'s online-transition refetch returned a pre-sync snapshot (v1/scheduled) that clobbered the newer optimistic state. Hypothesis "transport/harness" rejected: all POSTs 200/201, no failed request, no console error.
- F1b — same test, next seam after F1 fix: `inspection.complete` (baseV4) rejected `STALE_OFFLINE_COMMAND` (server 409). PROVEN by `next.log` (`POST /api/sync 409` before the final 200) + trace bodies. Cause: two tabs (`/field/offline` in inspection tab + still-open offline-status tab) drain the shared queue concurrently on reconnect; per-id Web Locks don't protect cross-id version chains, so the status tab POSTed `complete` while the inspection tab's `finding` was still in flight.
- F1c — same test, next seam after F1b fix: `InspectionScheduleBoard` shows `ESTABLISHMENTS_FAILED` as field_officer. PROVEN by server stack in `next.log`: `Error: FORBIDDEN at requireRole → listEstablishments (projection.ts:222) → GET route.ts:13`. `listEstablishments` correctly requires commander/office_officer; the test asserted a commander surface as field_officer.
- F1d — `checklist_complete` exact-label timeout: wrapping `<label>` leaks the select's dynamic option text into its accessible name, so `get_by_label(..., exact=True)` can never match. Same defect class as follow-up 2/3 (record_finding/escalate selects); fixed at the same ID seam.
- F2 — recommendation `Duyệt` click intercepted (mobile only): PROVEN by trace `input` geometry — the button box oscillated (`x:54↔x:0`, `y:740↔y:810`) between hit-checks, i.e. the page scrolled on both axes under the click. Root: 24-char inspection id in `h1.text-3xl` (~400px) overflows the 390px viewport content box (~358px) → horizontal overflow → scrollIntoView fighting on mobile. Desktop (1440px) unaffected, which matches pass/fail split.
- F2-flake (mid-session): after the F2 fix, 2 runs failed at `submit_recommendation` ("Chưa có phát hiện") while 2 passed. Cause: my first version-guard discarded the whole refetch when the projection-lagged inspection version was older, vetoing the write-model-fresh findings list (`prisma.inspectionFinding.findMany` is strongly consistent; only the projection version lags). Refined to a merge (below); 4/4 subsequent mobile runs green.
- F3 — vehicle `wait_for_projection` sees `{"error":"FORBIDDEN"}` (desktop+mobile): PROVEN by code (`src/app/api/health/worker/route.ts` requires commander/supervisor) + `next.log` (`GET /api/health/worker 403` as field_officer). Server contract is deliberate and respected by every other caller (incident projection, identity health tests all run as commander); the vehicle test was the only outlier.

## Files changed (this follow-up only, Ticket 05 whitelist)

- `src/components/inspections/InspectionDetail.tsx`: fetch-apply is now a merge — fetched payload (write-model-fresh findings/recommendations) always applies; `version` keeps `max(local, fetched)` and `status` keeps the furthest lifecycle stage (`inspectionStage`: scheduled 0 < in_progress 1 < completed 2; transitions are forward-only server-side). Stale snapshots can no longer regress optimistic offline state, and projection lag can no longer veto fresh lists. Plus `break-all` on the inspection-id `h1` (kills 390px horizontal overflow).
- `src/components/field/offline-queue.ts`: `syncOfflineQueue` drain loop now runs under one global Web-Lock slot (`civicos:offline-sync:queue`) so cross-tab drains serialize and version-chained commands (finding→complete) apply in order. Per-id locks/dedupe/reconcile kept as-is.
- `playwright/pages.py` (`checklist_complete` only): targets verified `#inspection-complete-result` + `select_option("pass")`; Hoàn tất click and message assertions unchanged.
- `playwright/test_vehicles.py` (vehicle lifecycle only): `logout` + `login(commander)` before `wait_for_projection` (worker health is a commander/supervisor seam; precedent: incident projection + identity health tests).
- `playwright/test_inspections.py` (offline checklist only): `logout` + `login(commander)` before the `/inspections/establishments` recurring-schedule article assertion (registry board is a commander/office_officer surface).

## What was NOT changed

- No `src/app/api/**` change: 403/500 responses observed are the true contracts (health RBAC deliberate; establishments 500-on-FORBIDDEN left untouched as out of scope for green — no test hits it after the auth-context fix).
- No `playwright/conftest.py`, package, prisma, README, `.scratch`, `tests/**` change.
- No retries, sleeps, longer timeouts, `navigator.onLine` stubs, API bypasses, or weakened assertions (same selects/values, same queue counts, same articles, added logins only establish the contract-required role).

## Static verification (Linux session)

- `npm run typecheck` (`tsc --noEmit`): pass.
- `npx eslint` + `prettier --check` on `InspectionDetail.tsx`, `offline-queue.ts`: pass.
- `python -m py_compile pages.py` (Windows venv): pass.

## Native verification (Windows: `D:\Project\CivicOS\playwright\.venv\Scripts\python.exe`, `--browser chromium`)

- `test_inspection_offline_checklist_...` desktop: PASS (32s); mobile: PASS (32s).
- `test_inspection_recommendation_...` mobile: PASS x4 (35s each); desktop: PASS (in sweep).
- `test_vehicle_registry_...` desktop: PASS (25s); mobile: PASS (25s).
- Sweep `test_inspections.py + test_vehicles.py` desktop: 7 passed; mobile: 7 passed.
- Sanity `test_incidents.py` desktop: 2 passed.
- Raw per-run tails preserved in session transcript; failure artifacts for still-green runs overwritten by design (trace kept only on failure).
