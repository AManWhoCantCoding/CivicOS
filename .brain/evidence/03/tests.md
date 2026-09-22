# Ticket 03 — infrastructure readiness evidence

## Commands and raw results

### 1. Docker Desktop / Docker Engine readiness

```text
$ powershell.exe -NoProfile -Command "docker.exe info"
Client:
 Version:    29.6.2
 Context:    desktop-linux
 ...
Server:
 Containers: 1
  Running: 1
 ...
 Operating System: Docker Desktop
 OSType: linux
 ...
```

Result: command completed successfully.

### 2. Start PostgreSQL from the repository compose file

```text
$ powershell.exe -NoProfile -Command "Set-Location 'D:\\Project\\CivicOS'; docker.exe compose up -d postgres"
 Container civicos-postgres-1 Running
```

Result: command completed successfully.

### 3. PostgreSQL readiness

```text
$ powershell.exe -NoProfile -Command "docker.exe exec civicos-postgres-1 pg_isready -U civicos -h 127.0.0.1"
127.0.0.1:5432 - accepting connections
```

Result: command completed successfully.

### 4. Prisma migration status

```text
$ powershell.exe -NoProfile -Command "Set-Location 'D:\\Project\\CivicOS'; npx.cmd prisma migrate status"
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "civicos", schema "public" at "localhost:5432"

4 migrations found in prisma/migrations

Database schema is up to date!
```

Result: command completed successfully; database schema is up to date.

### 5. Prisma Client generation

```text
$ powershell.exe -NoProfile -Command "Set-Location 'D:\\Project\\CivicOS'; npx.cmd prisma generate"
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma

✔ Generated Prisma Client (v6.19.3) to .\node_modules\@prisma\client in 166ms
```

Result: command completed successfully.

## Summary

- Checks run: 5
- Command failures: 0
- Blocker: none observed.
