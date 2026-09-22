# Infrastructure status check

Runner: native Windows PowerShell via `powershell.exe -NoProfile`, working directory `D:\Project\CivicOS`.

Commands and raw results:

```text
docker.exe info
Client: Version 29.6.2; Context: desktop-linux
Server: Docker Desktop; Containers: 1; Running: 1
exit 0

docker.exe compose up -d postgres
Container civicos-postgres-1 Running
exit 0

docker.exe exec civicos-postgres-1 pg_isready -U civicos -h 127.0.0.1
127.0.0.1:5432 - accepting connections
exit 0

npx.cmd prisma migrate status
9 migrations found in prisma/migrations
Database schema is up to date!
exit 0

npx.cmd prisma generate
Generated Prisma Client (v6.19.3) to .\node_modules\@prisma\client
exit 0
```

Pass/fail: 5 pass, 0 fail.

Trục trặc gặp phải: The first PowerShell invocation failed to parse because the WSL shell expanded `$LASTEXITCODE` before PowerShell received it. Retried with the variable escaped; all five requested commands then completed with exit code 0.

## 2026-09-22 run

Commands and raw results:

```text
docker info
The command 'docker' could not be found in this WSL 2 distro.
We recommend to activate the WSL integration in Docker Desktop settings.
exit 127

powershell.exe -NoProfile -Command "Start-Process 'Docker Desktop'"
Start-Process : This command cannot be run due to the error: The system cannot find the file specified.
FullyQualifiedErrorId : InvalidOperationException
exit 1

docker info (polled every 5 seconds, 12 attempts / approximately 60 seconds)
The command 'docker' could not be found in this WSL 2 distro.
exit 1
```

Pass/fail: 0 pass, 3 fail.

Expected: Docker Desktop is running and the database is started from `docker-compose.yml`.
Actual: Docker CLI is unavailable in this WSL distro; the requested Docker Desktop start command could not find the application; database startup was not attempted because Docker Desktop could not be confirmed running.

Trục trặc gặp phải: Docker CLI/WSL integration was unavailable, and `Start-Process 'Docker Desktop'` reported that the application could not be found. Docker Desktop did not become available during the retry window.

## 2026-09-22 native rerun

Runner: native Windows PowerShell via `powershell.exe -NoProfile -Command`, working directory `D:\Project\CivicOS`. No application tests were run and no infrastructure files were modified.

Commands and raw results:

```text
docker.exe info
Context: desktop-linux
Server: Docker Desktop
Containers: 1; Running: 1; Stopped: 0
exit 0

docker.exe compose ps
NAME                 IMAGE                COMMAND                  SERVICE    CREATED      STATUS       PORTS
civicos-postgres-1   postgres:16-alpine   "docker-entrypoint.s…"   postgres   3 days ago   Up 5 hours   0.0.0.0:5432->5432/tcp, [::]:5432->5432/tcp
exit 0

docker.exe inspect -f "{{.State.Status}}" civicos-postgres-1
container_status=running
exit 0

Initial read-only query:
docker.exe exec civicos-postgres-1 psql -U postgres -d postgres -v ON_ERROR_STOP=1 -tAc "SELECT current_database() AS database_name, current_user AS user_name, 1 AS read_only_probe;"
psql: error: connection to server on socket "/var/run/postgresql/.s.PGSQL.5432" failed: FATAL:  role "postgres" does not exist

Configured identity check:
POSTGRES_USER=civicos
POSTGRES_DB=civicos

Read-only query with configured identity:
docker.exe exec civicos-postgres-1 psql -U civicos -d civicos -v ON_ERROR_STOP=1 -tAc "SELECT current_database() AS database_name, current_user AS user_name, 1 AS read_only_probe;"
civicos|civicos|1
exit 0
```

Pass/fail: 4 requested infrastructure checks pass after using the configured PostgreSQL identity; the initial query using the nonexistent `postgres` role failed as shown above.

Trục trặc gặp phải: The first PostgreSQL probe used `postgres`, but this container is configured with `POSTGRES_USER=civicos` and `POSTGRES_DB=civicos`; the corrected native query succeeded. No retry was needed for Docker Desktop.
