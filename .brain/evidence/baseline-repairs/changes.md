# Baseline repair changes

## Demo and formatter

- `scripts/demo/seed.ts:12,20-26`: validate `DEMO_NOW` before target mutation or dynamic domain imports.
- `.prettierignore:32-35`: ignore generated Android `.gradle`, `.cxx`, `build` output and one pre-existing locked design artifact; no generated/design file edited.

## Incidents

- `src/modules/incidents/commands.ts:363-375,413-425`: unauthorized approval lookup now fails closed with `FORBIDDEN` before exposing `APPROVAL_NOT_FOUND`.
- Incident integration fixtures now explicitly perform `confirmIntakeReport` before conversion and use an independent commander approver where required.

## Inspection and vehicles

- Integration fixtures now create the required field-officer users/roles and invoke fieldwork commands with field actors.
- Vehicle authorization fixture uses a deterministic future observation and drains projection before command-scope list assertion.
- No inspection/vehicle authorization source policy was changed.

## Identity

- `tests/identity/session-seed-boundary.postgres.test.ts:26-38,139-153`: credential assertion is limited to the 11 known development seed users and explicitly invokes `ensureDevelopmentUsers`; unrelated nullable fixture users are excluded.
