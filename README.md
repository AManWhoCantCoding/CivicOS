# CivicOS

CivicOS is an event-first operational platform for Công an xã Nghĩa Trụ. The first implementation wave contains the Incident, conditional-business Inspection and field VehicleObservation vertical slices.

## Getting Started

### 1. Start PostgreSQL

Copy `.env.example` to `.env`, then start the local database:

```bash
docker compose up -d postgres
```

If Docker Desktop is installed but WSL does not expose the `docker` command,
use `docker.exe compose up -d postgres` or enable WSL integration for this
distribution in Docker Desktop.

### 2. Generate Prisma Client and migrate

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
```

### 3. Run the application and worker

```bash
npm run dev
npm run worker
```

Open <http://localhost:3000>. Development login accounts are seeded by the login route; the default password is `civicos-dev`.

## Verification

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:e2e
npm run build
```

The PostgreSQL-backed event-kernel tests are opt-in so the default unit suite can run without infrastructure. With PostgreSQL and the migration applied, run `RUN_DB_TESTS=1 npm test` to execute the durable transaction/outbox checks. End-to-end tests require the Playwright browsers. The application uses a transactional outbox; run the worker for asynchronous projections, SLA timers and notifications.

For a deployment-style migration run:

```bash
npm run prisma:migrate:deploy
```

## First-wave routes

- `/`: operational entry surface.
- `/incidents`: PS-E1-005 Incident work queue.
- `/intake`: manual IntakeReport entry.
- `/inspections/establishments`: PS-E1-007 establishment catalog.
- `/vehicles/registry`: PS-E1-009 SuspiciousVehicleRegistry.
- `/field/vehicles`: mobile-first VehicleObservation entry.
- `/field/offline`: shared field sync status.
