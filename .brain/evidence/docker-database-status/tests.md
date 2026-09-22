# Docker Desktop and database status evidence

Ticket ID used: `docker-database-status` (no ticket ID was provided).

All five requested commands were run through native Windows PowerShell from `D:\Project\CivicOS`.

## Results

1. `docker.exe info` — PASS
   - Context: `desktop-linux`
   - Server: Docker Desktop
   - Containers: 1 running
2. `docker.exe compose up -d postgres` — PASS
   - `Container civicos-postgres-1 Running`
3. `docker.exe exec civicos-postgres-1 pg_isready -U civicos -h 127.0.0.1` — PASS
   - `127.0.0.1:5432 - accepting connections`
4. `npx.cmd prisma migrate status` — PASS
   - `9 migrations found in prisma/migrations`
   - `Database schema is up to date!`
5. `npx.cmd prisma generate` — PASS
   - `Generated Prisma Client (v6.19.3) to .\\node_modules\\@prisma\\client in 222ms`

Summary: 5 passed, 0 failed.
