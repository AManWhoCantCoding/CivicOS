# Docker/Desktop database verification

Scope: Docker Desktop, PostgreSQL startup/readiness, Prisma migration status, and Prisma client generation.

## Commands and raw results

### `powershell.exe -NoProfile -Command "docker.exe info"`

Result: PASS

```text
Client:
 Version:    29.6.2
 Context:    desktop-linux
...
Server:
 Containers: 1
  Running: 1
  Paused: 0
  Stopped: 0
Operating System: Docker Desktop
```

### `powershell.exe -NoProfile -Command "docker.exe compose up -d postgres"`

Result: PASS

```text
 Container civicos-postgres-1 Running
```

### `powershell.exe -NoProfile -Command "docker.exe exec civicos-postgres-1 pg_isready -U civicos -h 127.0.0.1"`

Result: PASS

```text
127.0.0.1:5432 - accepting connections
```

### `powershell.exe -NoProfile -Command "npx prisma migrate status"`

Result: PASS

```text
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "civicos", schema "public" at "localhost:5432"

6 migrations found in prisma/migrations

Database schema is up to date!
```

### `powershell.exe -NoProfile -Command "npx prisma generate"`

Result: PASS

```text
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma

✔ Generated Prisma Client (v6.19.3) to .\node_modules\@prisma\client in 171ms
```

## Summary

5 commands passed, 0 failed. No blocker observed.
