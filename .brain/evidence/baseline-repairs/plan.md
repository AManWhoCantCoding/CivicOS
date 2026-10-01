# Baseline repair plan — Phase 02 full-gate failures

- Repair only confirmed pre-existing global-gate failures after explicit owner authorization.
- Preserve locked domain policy: incident verify → confirm → convert; commander cannot perform inspection/vehicle fieldwork; seeded credential hashes remain non-plaintext.
- Do not edit design contracts, `.env`, Prisma schema, land implementation, or weaken authorization.
- Keep each repair slice small: demo/format, incidents, inspection/vehicle fixtures, identity test scope.
