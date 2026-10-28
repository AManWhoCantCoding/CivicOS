import { readFileSync } from 'node:fs';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DEMO_LABELS,
  applyDemoTargetToEnv,
  assertDemoTarget,
  resolveDemoTarget,
} from '../../scripts/demo/demo-db';
import { resolveSeedTarget, seedDemo } from '../../scripts/demo/seed';
import { requireResetConfirm, resetDemo } from '../../scripts/demo/reset';

const DEMO_URL =
  'postgresql://civicos:civicos@localhost:5432/civicos?schema=public';
const STALE_DEMO_URL =
  'postgresql://civicos:civicos@localhost:5432/civicos_demo?schema=public';

describe('demo bootstrap migration preflight', () => {
  it('runs a pure preflight before the migration command', () => {
    const packageJson = JSON.parse(
      readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
    ) as { scripts: Record<string, string> };

    expect(packageJson.scripts['predemo:bootstrap']).toBe(
      'node --env-file=.env --import=tsx scripts/demo/preflight.ts',
    );
    expect(packageJson.scripts['demo:bootstrap']).toBe(
      'prisma migrate deploy && node --env-file=.env --import=tsx scripts/demo/seed.ts',
    );
  });
});

const savedDatabaseUrl = process.env.DATABASE_URL;
afterEach(() => {
  process.env.DATABASE_URL = savedDatabaseUrl;
});

// Hoi quy: DATABASE_URL la canonical (Prisma runtime doc chinh no); alias
// DEMO_DATABASE_URL chi duoc chap nhan neu khop target da validate.
describe('demo target binding', () => {
  it('seed resolve sang civicos (canonical DATABASE_URL)', () => {
    const target = resolveSeedTarget({
      DATABASE_URL: DEMO_URL,
      DEMO_DATABASE_URL: DEMO_URL,
    });
    expect(target.dbName).toBe('civicos');
    expect(target.url).toBe(DEMO_URL);
  });

  it('seed ap target da validate vao connection truoc khi nap Prisma/domain', () => {
    process.env.DATABASE_URL = STALE_DEMO_URL;
    const target = resolveSeedTarget({
      DATABASE_URL: DEMO_URL,
      DEMO_DATABASE_URL: DEMO_URL,
    });
    applyDemoTargetToEnv(target);
    expect(process.env.DATABASE_URL).toBe(DEMO_URL);
  });

  it('reset tu choi DATABASE_URL mac dinh ngoai target demo', () => {
    expect(() => assertDemoTarget(STALE_DEMO_URL)).toThrow(
      'DEMO_RESET_REFUSED',
    );
  });

  it('DB-CONSOLIDATION Task 4: resetDemo retired — rejects for the accepted civicos target even with confirmation; confirm guard stays pure', async () => {
    expect(() => requireResetConfirm({})).toThrow(
      'DEMO_RESET_CONFIRM_REQUIRED',
    );
    expect(() =>
      requireResetConfirm({ DEMO_RESET_CONFIRM: '1' }),
    ).not.toThrow();

    const noop = vi.fn();
    const fakePrisma = {
      $queryRawUnsafe: noop,
      $executeRawUnsafe: noop,
      evidence: { findMany: noop },
    };
    await expect(
      resetDemo(
        { DATABASE_URL: DEMO_URL, DEMO_RESET_CONFIRM: '1' },
        fakePrisma as never,
      ),
    ).rejects.toThrow('DEMO_RESET_RETIRED_USE_E2E_LIFECYCLE');
    expect(noop).not.toHaveBeenCalled();
  });

  it('DATABASE_URL la canonical; alias DEMO_DATABASE_URL khong duoc chiem doat target', () => {
    const target = resolveDemoTarget(DEMO_URL, DEMO_URL);
    expect(target.url).toBe(DEMO_URL);
    expect(() => resolveDemoTarget(DEMO_URL, STALE_DEMO_URL)).toThrow(
      'DEMO_TARGET_CONFLICT',
    );
  });

  it('tu choi DATABASE_URL ngoai target demo du alias dung', () => {
    expect(() => resolveDemoTarget(STALE_DEMO_URL, DEMO_URL)).toThrow(
      'DEMO_RESET_REFUSED',
    );
  });

  it('tu choi database name gan giong civicos ke ca khi alias khop', () => {
    expect(() =>
      assertDemoTarget(
        'postgresql://civicos:civicos@localhost:5432/civicos_demo_shadow',
      ),
    ).toThrow('DEMO_RESET_REFUSED');
    expect(() =>
      resolveDemoTarget(
        'postgresql://civicos:civicos@localhost:5432/civicos_demo_shadow',
        'postgresql://civicos:civicos@localhost:5432/civicos_demo_shadow',
      ),
    ).toThrow('DEMO_RESET_REFUSED');
  });

  it('alias DEMO_DATABASE_URL sai dinh dang bi tu choi', () => {
    expect(() => resolveDemoTarget(DEMO_URL, '::not-a-url::')).toThrow(
      'DEMO_TARGET_CONFLICT',
    );
  });
});

// DB-CONSOLIDATION SLICE (Task 3): the DB-backed demo bootstrap smoke suite is
// explicitly disabled — it seeds against the production/demo `civicos`
// database (its demo-target guard only permits demo), which the approved
// Vitest DB runner (127.0.0.1:5432/civicos_e2e) must never touch. The suite
// remains here until a dedicated E2E-safe demo fixture/reset seam exists
// (later consolidation task). The pure preflight blocks above stay active.

let bound = false;

async function demoModules() {
  if (!bound) {
    applyDemoTargetToEnv(resolveSeedTarget());
    bound = true;
  }
  const prismaModule = await import('@/lib/prisma');
  const identity = await import('@/modules/identity');
  const eventing = await import('@/modules/eventing');
  return { prisma: prismaModule.prisma, identity, eventing };
}

// DB-CONSOLIDATION SLICE (Task 3): DB-backed suite disabled (see note above
// `demoModules`). Explicit skip — do not re-enable via RUN_DB_TESTS.
describe.skip('demo bootstrap smoke', () => {
  it('seed idempotent: chay hai lan khong tao ban ghi trung', async () => {
    const first = await seedDemo();
    const second = await seedDemo();
    expect(second.incidentId).toBe(first.incidentId);
    expect(second.inspectionId).toBe(first.inspectionId);
    expect(second.observationId).toBe(first.observationId);
    const { prisma } = await demoModules();
    expect(
      await prisma.intakeReport.count({
        where: { idempotencyKey: DEMO_LABELS.incidentKey },
      }),
    ).toBe(1);
    expect(
      await prisma.vehicleObservation.count({
        where: { clientCommandId: DEMO_LABELS.observationKey },
      }),
    ).toBe(1);
  }, 120_000); // Two full seedDemo runs (now including identity/residents fixtures).

  it('dang nhap duoc bang mot Role nghiep vu', async () => {
    const { identity } = await demoModules();
    const duty = await identity.authenticateLocal(
      'trucban@civicos.local',
      'civicos-dev',
    );
    expect(duty?.roles).toContain('duty_officer');
  });

  it('doc duoc ba kich ban demo de tiep tuc', async () => {
    const seeded = await seedDemo();
    const { prisma } = await demoModules();
    const incident = await prisma.incident.findUniqueOrThrow({
      where: { id: seeded.incidentId },
    });
    expect(incident.description).toContain(DEMO_LABELS.incident);
    const inspection = await prisma.inspection.findFirstOrThrow({
      where: { id: seeded.inspectionId },
    });
    expect(inspection.status).toBe('scheduled');
    const observation = await prisma.vehicleObservation.findFirstOrThrow({
      where: { clientCommandId: DEMO_LABELS.observationKey },
    });
    expect(observation.plate).toBe(DEMO_LABELS.plate);
  });

  it('worker health khong ton pending/processing/dead-letter', async () => {
    const { eventing } = await demoModules();
    const health = await eventing.getOutboxHealth();
    expect(health.pendingCount).toBe(0);
    expect(health.processingCount).toBe(0);
    expect(health.deadLetterCount).toBe(0);
  });
});
