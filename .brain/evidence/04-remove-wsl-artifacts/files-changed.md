# Ticket 04 — Files changed

## Final result

- Removed only the approved WSL/generated paths: `~/.cache/ms-playwright`, `~/.playwright-deps`, `playwright/__pycache__`, `playwright/.pytest_cache`, and `playwright/civicos_playwright.egg-info`.
- Native targeted login after the main cleanup: `14 collected, 14 passed, 0 failed` on desktop/mobile Chromium.
- Native Python `3.13.14`, Windows browser cache, Docker PostgreSQL, `test-results/`, and prior evidence preserved.
- Final probes: WSL caches and repo generated caches absent; `LD_LIBRARY_PATH` empty; no stale test processes/listeners.
- Reviewer: PASS for AC1–AC7 and steps 1–6.
- Commit: `6f8ed251baa9ce7fb990a343d42418e6636815fc` (`chore: remove WSL Playwright artifacts`).

## Files and agents

### Developer

- `.brain/evidence/04-remove-wsl-artifacts/changes.md`
- Deleted only the five approved generated/cache path groups listed above.

### Tester

- `.brain/evidence/04-remove-wsl-artifacts/tests.md`

### Reviewer

- `.brain/evidence/04-remove-wsl-artifacts/review.md`
- Committed the scoped Ticket 04 cleanup evidence and tracker state.

### Planner

- `.scratch/civicos-windows-native-playwright/issues/04-remove-wsl-artifacts.md`
- `.brain/evidence/04-remove-wsl-artifacts/files-changed.md`
