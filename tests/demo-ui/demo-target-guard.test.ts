import { describe, expect, it } from 'vitest';

import { evaluateDemoTargetGuard } from '@/modules/demo/target-guard';

const DEMO_URL =
  'postgresql://demo-user:s3cret-token@localhost:5432/civicos?schema=public';
const STALE_URL =
  'postgresql://demo-user:s3cret-token@localhost:5432/civicos_demo?schema=public';
const WRONG_URL =
  'postgresql://demo-user:s3cret-token@localhost:5432/civicos_demo_shadow?schema=public';
const PROD_URL =
  'postgresql://app-user:prod-secret@db.example:5432/civicos?schema=public';

describe('T-001 demo target guard matrix', () => {
  it('AC-1: demo mode disabled blocks before parsing target', () => {
    const result = evaluateDemoTargetGuard({
      demoModeEnabled: false,
      demoDatabaseUrl: DEMO_URL,
      databaseUrl: DEMO_URL,
    });
    expect(result.state).toBe('blocked');
    expect(result.canStart).toBe(false);
    expect(result.web).toBe('unavailable');
  });

  it('AC-3: exact civicos plus valid mode returns sanitized ready', () => {
    const result = evaluateDemoTargetGuard({
      demoModeEnabled: true,
      demoDatabaseUrl: DEMO_URL,
      databaseUrl: DEMO_URL,
    });
    expect(result.state).toBe('ready');
    expect(result.target).toBe('civicos');
    expect(result.canStart).toBe(true);
    expect(result.web).toBe('ready');
  });

  it('canonical DATABASE_URL wins; a stale DEMO_DATABASE_URL alias blocks', () => {
    // Runtime Prisma reads DATABASE_URL, so the alias may never diverge: it
    // must be forbidden even though the alias itself looks demo.
    const result = evaluateDemoTargetGuard({
      demoModeEnabled: true,
      demoDatabaseUrl: DEMO_URL,
      databaseUrl: STALE_URL,
    });
    expect(result.state).toBe('blocked');
    expect(result.target).toBe('forbidden');
    expect(result.canStart).toBe(false);
    expect(result.reason).toBe('DEMO_TARGET_FORBIDDEN');
  });

  it('AC-2: wrong target returns safe forbidden blocked without connection', () => {
    const result = evaluateDemoTargetGuard({
      demoModeEnabled: true,
      demoDatabaseUrl: undefined,
      databaseUrl: WRONG_URL,
    });
    expect(result.state).toBe('blocked');
    expect(result.target).toBe('forbidden');
    expect(result.canStart).toBe(false);
    expect(result.web).toBe('unavailable');
  });

  it('AC-2: production target fails closed as forbidden', () => {
    const result = evaluateDemoTargetGuard({
      demoModeEnabled: true,
      demoDatabaseUrl: undefined,
      databaseUrl: PROD_URL,
    });
    expect(result.state).toBe('blocked');
    expect(result.target).toBe('forbidden');
    expect(result.canStart).toBe(false);
  });

  it('rejects loopback URLs on any port other than Compose 5432', () => {
    const result = evaluateDemoTargetGuard({
      demoModeEnabled: true,
      demoDatabaseUrl: undefined,
      databaseUrl:
        'postgresql://demo-user:s3cret-token@localhost:55432/civicos?schema=public',
    });
    expect(result).toMatchObject({
      state: 'blocked',
      target: 'forbidden',
      canStart: false,
      reason: 'DEMO_TARGET_LOCAL_ONLY',
    });
  });

  it.each([[undefined], [''], ['not-a-url'], ['://missing-host']])(
    'missing/malformed target %s blocks safe without throwing',
    (raw) => {
      const before = process.env.DATABASE_URL;
      let result;
      expect(() => {
        result = evaluateDemoTargetGuard({
          demoModeEnabled: true,
          demoDatabaseUrl: raw,
          databaseUrl: undefined,
        });
      }).not.toThrow();
      expect(result!.state).toBe('blocked');
      expect(result!.target).toBe('unknown');
      expect(result!.canStart).toBe(false);
      expect(process.env.DATABASE_URL).toBe(before);
    },
  );

  it('never exposes password, token, raw url or raw thrown database name', () => {
    const cases = [
      evaluateDemoTargetGuard({
        demoModeEnabled: true,
        demoDatabaseUrl: DEMO_URL,
        databaseUrl: undefined,
      }),
      evaluateDemoTargetGuard({
        demoModeEnabled: true,
        demoDatabaseUrl: WRONG_URL,
        databaseUrl: undefined,
      }),
      evaluateDemoTargetGuard({
        demoModeEnabled: true,
        demoDatabaseUrl: undefined,
        databaseUrl: undefined,
      }),
      evaluateDemoTargetGuard({ demoModeEnabled: false }),
    ];
    for (const result of cases) {
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain('s3cret-token');
      expect(serialized).not.toContain('prod-secret');
      expect(serialized).not.toContain('postgresql://');
      expect(serialized).not.toContain('civicos_demo_shadow');
      expect(serialized).not.toContain('DEMO_RESET_REFUSED');
    }
  });

  it('does not mutate process.env and has no connection/domain side effect', async () => {
    const before = { ...process.env };
    evaluateDemoTargetGuard({
      demoModeEnabled: true,
      demoDatabaseUrl: DEMO_URL,
      databaseUrl: undefined,
    });
    evaluateDemoTargetGuard({
      demoModeEnabled: true,
      demoDatabaseUrl: WRONG_URL,
      databaseUrl: undefined,
    });
    expect(process.env).toEqual(before);

    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const source = readFileSync(
      join(process.cwd(), 'src/modules/demo/target-guard.ts'),
      'utf8',
    );
    expect(source).not.toContain('applyDemoTargetToEnv');
    expect(source).not.toContain('@/lib/prisma');
    expect(source).not.toContain('process.env');
    expect(source).not.toMatch(/import\(/);
  });
});
