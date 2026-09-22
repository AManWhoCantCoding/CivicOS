# Docker/database check

## Commands and raw results

### `powershell.exe -NoProfile -Command "docker.exe info"`

Result: PASS

Relevant output:

```text
Context:    desktop-linux
Server Version: 29.6.2
Operating System: Docker Desktop
Containers: 1
 Running: 1
```

### `powershell.exe -NoProfile -Command "Set-Location 'D:\Project\CivicOS'; docker.exe compose up -d postgres"`

Result: PASS

```text
Container civicos-postgres-1 Running
```

### `powershell.exe -NoProfile -Command "docker.exe exec civicos-postgres-1 pg_isready -U civicos -h 127.0.0.1"`

Result: PASS

```text
127.0.0.1:5432 - accepting connections
```

### `powershell.exe -NoProfile -Command "Set-Location 'D:\Project\CivicOS'; npx prisma migrate status"`

Result: PASS

```text
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "civicos", schema "public" at "localhost:5432"

6 migrations found in prisma/migrations

Database schema is up to date!
```

### `powershell.exe -NoProfile -Command "Set-Location 'D:\Project\CivicOS'; npx prisma generate"`

Result: PASS

```text
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma

✔ Generated Prisma Client (v6.19.3) to .\node_modules\@prisma\client in 180ms
```

## Blocker

None observed.
