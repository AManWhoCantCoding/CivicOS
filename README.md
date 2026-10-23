# CivicOS OpenCode harness — merged candidate (2026-10-21)

This package is a **candidate overlay**, not a live installation or validated runtime deployment.

## Inputs
- User's original `AGENTS.md` (retained, with section 13 added)
- User's `.agents.zip` (extracted unchanged)
- Previously drafted Ponytail harness (`opencode.jsonc`, `.opencode/agent/`, `.autonomy/`, `scripts/`)

## Integration
1. Create a separate Git branch / disposable clone. Back up actual config and worktree.
2. Compare the packaged `AGENTS.md`, `.agents/`, `.opencode/`, `opencode.jsonc` with your repo. Do not copy global configs or overwrite live modified files blindly.
3. Ensure OpenCode version/supported config format agrees with `opencode.jsonc`; confirm agent delegation and active skill lookup.
4. Inspect pre-existing hooks and register/enable for your runtime; the presence of `.agents/hooks/` **does not enable them**.
5. Use a genuine OS sandbox with repo write access and explicitly approved external reference mounts read-only. Restrict secrets, network and sensitive paths.
6. Confirm commit scope controls in real Git repo. Do not enable unattended commits without an enforced repo/working-tree isolation and precommit gate.
7. Test one bug and one feature through RED→GREEN→Ponytail review→standards/spec→scoped commit→resume.

## Known blockers/ambiguities
- Root policy currently says `status: proposed`; only PO can accept business/architecture decisions.
- Original `.agents/README.md` says hooks/lessons/index not enabled: inventory is not execution.
- `tdd/SKILL.md` requires test seams be confirmed with the user; a continuous, unsupervised workflow must reuse previously approved public seams, otherwise request a decision.
- OpenCode `permission.bash` and `external_directory` do not by themselves enforce 'read outside, never write outside'.
- No real OpenCode or repository runtime was supplied; config compatibility, hooks, worker spawning and Git commit gates have NOT been tested.

## Static check
The candidate's `scripts/audit-bundle.py` has not been adapted to the active Lean Harness configuration and currently fails. Do not treat it as a verified check.

## Non-goals
- No automatic push, image build/push, Rancher redeploy, production migrations.
- No rewriting accepted business requirements, no inventing API/schema semantics.
