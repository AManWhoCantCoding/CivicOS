# Domain Rules — `ui-auto-demo`

## 1. Demo mode and target

1. A run is valid only when explicit demo mode is enabled and the resolved
   database target name is exactly `civicos_demo`.
2. Missing, malformed or ambiguous target is `blocked`; no best-effort fallback.
3. Demo mode does not grant permission. Existing session, role, Assignment,
   OrganizationUnit, server gate and masking remain authoritative.
4. Mobile remains read-only even when the overall run is `LIVE_DEMO`.

## 2. Run state

```text
idle → preflight → authenticating → running
running ↔ paused
running → blocked | failed | stopping
stopping → cancelled | completed-with-cleanup-pending
running → completed
```

- `blocked`: a prerequisite or contract boundary prevents the next step; no
  silent skip.
- `failed`: an unexpected component/API/native error occurred; runner stops at
  the failed step unless manifest explicitly marks a safe branch.
- `completed-with-cleanup-pending`: all planned steps ended, but live mutations
  still require operator cleanup confirmation.

Run state is orchestration state. B9 must decide whether any durable run/cleanup
record is needed; B6 does not presume a database table.

## 3. Persona rule

- A persona is an allowlisted demo alias mapped by a local/demo credential
  provider; alias is not a permission grant.
- The provider must establish a normal application session. The runner may not
  mint a session cookie, alter role claims or copy a cookie between personas.
- Switching persona is a boundary: stop in-flight action, logout/expire old
  session, authenticate new persona, reload session and assignment scope, then
  re-evaluate feature entry.
- A persona without the required Assignment must produce the existing forbidden/
  empty state, not receive a temporary assignment from the demo runner.

## 4. Web interaction rule

- Actions are performed through the visible component interaction path.
- `open-select`/focus precedes `choose-option`; an option not present/eligible
  blocks the step.
- Submit is a real submit. Client validation, server validation, confirmation,
  approval and error UI remain visible and authoritative.
- A runner cannot click hidden/disabled controls by force unless the manifest
  explicitly describes an accessibility keyboard path supported by the component.
- Navigation waits for route and component readiness before narration advances.

## 5. Live mutation rule

- Only web scenes may mutate, and only through existing domain contracts.
- Each mutation step declares `mutationClass`: `create`, `update`, `approve`,
  `reject`, `close`, `assign` or `none`.
- A mutation with no safe idempotency/fixture/cleanup policy is `blocked` in
  replayable mode; it is not retried blindly.
- Domain event, audit, outbox, worker, projection and SLA behavior are not
  bypassed or reimplemented by the runner.
- Mutation completion means the component receives the existing success/response
  state; downstream projection readiness is a separate wait/assert step.

## 6. Mobile rule

- Native steps may login, list, search, filter, select, open detail, deep-link and
  display map/context/read-only state.
- Any business write is blocked at both `WriteGuard` and server/API boundary.
- No mobile mutation is inferred from the web scene; cross-surface handoff uses
  safe resource identifiers/context allowed by existing contract.

## 7. Pacing and readiness

- After each action reaches `settled`, the runner waits 3,000ms before starting
  the next action.
- `settled` means the expected route/control/state is observable, not merely that
  a timer expired.
- A readiness wait may exceed 3,000ms or end in `blocked/failed`; it must not be
  replaced by a fixed sleep.
- Pause freezes before the next action and cancels the pacing timer. Stop prevents
  new actions but cannot undo a committed domain mutation.

## 8. Scenario coverage

- A manifest may claim coverage only for listed web/mobile surface, persona,
  state and evidence.
- Happy path and non-happy path are separate steps/scenes; a successful API call
  does not prove forbidden/offline/provider behavior.
- Synthetic/masked data only. Narrator uses stable labels and safe state copy,
  never raw payload or unmasked PII.