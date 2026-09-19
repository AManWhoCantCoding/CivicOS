# Ticket 01 evidence

## Files and runtime artifacts

- `playwright/.venv/**` — Developer: replaced the WSL Python virtualenv with a Windows-native Python 3.13.14 virtualenv.
- `playwright/test-results/ticket01-smoke.py` — Developer: native Chromium smoke script.
- `playwright/test-results/ticket01-smoke.png` — Developer/Tester: smoke screenshot artifact.
- `.scratch/civicos-windows-native-playwright/issues/01-windows-native-runner.md` — Planner: checked implementation steps and Acceptance Criteria; set `Status: done` after review and commit.
- `.brain/evidence/01/review.md` — Reviewer: criterion-by-criterion review, PASS.

## Final result

- Developer: Windows-native Python/Chromium setup completed; smoke test passed.
- Tester: all 6 Acceptance Criteria verified PASS with native PowerShell output.
- Reviewer: PASS; no remaining blocker and no Ticket 01 scope violation.
- Commit: `04cbec6429654a1f9eb7172bd847c5858c04f506` (`chore: bootstrap Windows-native Playwright runner`).

Pre-existing dirty files were intentionally not included in the Ticket 01 commit: `opencode.jsonc`, `playwright/conftest.py`, `playwright/pages.py`, `playwright/probe_login.py`, and `playwright/civicos_playwright.egg-info/**`.
