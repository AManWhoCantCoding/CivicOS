import { describe, expect, it, vi } from 'vitest';

import { cleanupDemoEvidenceFiles } from '@/modules/platform/evidence/storage-adapter';
import {
  assertDemoTarget,
  resolveDemoTarget,
} from '../../scripts/demo/demo-db';
import {
  preflightDemoClock,
  preflightDemoFoundation,
} from '../../scripts/demo/clock';
import {
  DEMO_FOUNDATION_MANIFEST,
  assertFoundationKeysUnique,
  foundationStableKeys,
  preflightFoundationManifest,
} from '../../scripts/demo/manifest';
import {
  BUSINESS_TABLES,
  requireResetConfirm,
  resetDemo,
  resolveResetTarget,
} from '../../scripts/demo/reset';

const CIVICOS_URL =
  'postgresql://civicos:civicos@localhost:5432/civicos?schema=public';
const DEMO_URL =
  'postgresql://civicos:civicos@localhost:5432/civicos_demo?schema=public';
const DEMO_NOW = '2026-09-28T08:00:00.000Z';

const LAND_TABLES = [
  'LandNationalSync',
  'LandApplicationParcel',
  'LandApplicationParty',
  'LandEncumbrance',
  'LandRight',
  'LandChangeApplication',
  'LandParcel',
  'LandParty',
] as const;

function mockPrisma() {
  const calls: { truncateSql: string[]; evidenceWhere: unknown[] } = {
    truncateSql: [],
    evidenceWhere: [],
  };
  const prisma = {
    $queryRawUnsafe: vi.fn(async () => [{ count: BigInt(0) }]),
    $executeRawUnsafe: vi.fn(async (query: string) => {
      calls.truncateSql.push(query);
      return 0;
    }),
    evidence: {
      findMany: vi.fn(async (args: unknown) => {
        calls.evidenceWhere.push(args);
        return [];
      }),
    },
  };
  return { prisma, calls };
}

describe('demo foundation target boundary', () => {
  it('rejects civicos database name', () => {
    expect(() => assertDemoTarget(CIVICOS_URL)).toThrow('DEMO_RESET_REFUSED');
    expect(() => resolveDemoTarget(DEMO_URL, CIVICOS_URL)).toThrow(
      'DEMO_RESET_REFUSED',
    );
  });

  it('rejects near-miss demo database names', () => {
    expect(() =>
      assertDemoTarget(
        'postgresql://civicos:civicos@localhost:5432/civicos_demo_shadow',
      ),
    ).toThrow('DEMO_RESET_REFUSED');
  });

  it('requires an explicit database url', () => {
    expect(() => resolveDemoTarget(undefined, undefined)).toThrow(
      'DEMO_DATABASE_URL_REQUIRED',
    );
  });

  it('reset keeps explicit confirmation and demo-only target', () => {
    expect(() => resolveResetTarget({ DATABASE_URL: CIVICOS_URL })).toThrow(
      'DEMO_RESET_REFUSED',
    );
    expect(() => requireResetConfirm({})).toThrow(
      'DEMO_RESET_CONFIRM_REQUIRED',
    );
    expect(() =>
      requireResetConfirm({ DEMO_RESET_CONFIRM: '1' }),
    ).not.toThrow();
  });

  it('foundation preflight refuses wrong target before mutation', () => {
    expect(() =>
      preflightDemoFoundation({ DATABASE_URL: CIVICOS_URL, DEMO_NOW }),
    ).toThrow('DEMO_RESET_REFUSED');
  });
});

describe('demo foundation clock preflight', () => {
  it.each([undefined, '2026-09-28T08:00:00.000', 'invalid'])(
    'rejects DEMO_NOW %s before mutation',
    (demoNow) => {
      expect(() => preflightDemoClock({ DEMO_NOW: demoNow })).toThrow(
        'DEMO_NOW_INVALID',
      );
      expect(() =>
        preflightDemoFoundation({
          DATABASE_URL: DEMO_URL,
          DEMO_DATABASE_URL: DEMO_URL,
          DEMO_NOW: demoNow,
        }),
      ).toThrow('DEMO_NOW_INVALID');
    },
  );

  it('accepts timezone-qualified DEMO_NOW and repeats deterministically', () => {
    const first = preflightDemoClock({ DEMO_NOW: DEMO_NOW });
    const second = preflightDemoClock({ DEMO_NOW: DEMO_NOW });
    expect(first.now.toISOString()).toBe(DEMO_NOW);
    expect(second.now.toISOString()).toBe(first.now.toISOString());
    const foundation = preflightDemoFoundation({
      DATABASE_URL: CIVICOS_URL,
      DEMO_DATABASE_URL: DEMO_URL,
      DEMO_NOW: DEMO_NOW,
    });
    expect(foundation.target.dbName).toBe('civicos_demo');
    expect(foundation.now.toISOString()).toBe(DEMO_NOW);
  });
});

describe('demo foundation manifest', () => {
  it('exposes only new stable keys with the demo evidence namespace', () => {
    expect(DEMO_FOUNDATION_MANIFEST.evidenceNamespace).toBe('civicos-demo');
    expect(foundationStableKeys()).toEqual([
      'demo-seed-restart-incident-01',
      'demo-seed-restart-observation-01',
      'DEMO-SEED-RESTART-PARTY-01',
      'DEMO-SEED-RESTART-PARCEL-01',
    ]);
  });

  it('does not reuse closed work-item fixture keys', () => {
    const legacy = new Set([
      'demo-incident-01',
      'demo-observation-01',
      'DEMO-PARTY-001',
      'DEMO-PARCEL-001',
    ]);
    for (const key of foundationStableKeys()) {
      expect(legacy.has(key)).toBe(false);
    }
  });

  it('repeat preflight keeps stable keys without duplicates', () => {
    const first = preflightFoundationManifest();
    const second = preflightFoundationManifest([...first]);
    expect(second).toEqual(first);
    expect(() =>
      assertFoundationKeysUnique([...first, first[0] as string]),
    ).toThrow('DEMO_MANIFEST_DUPLICATE_KEY');
  });
});

describe('demo reset land boundary', () => {
  it('covers every land model in dependency-safe order', () => {
    for (const table of LAND_TABLES) {
      expect(BUSINESS_TABLES).toContain(table);
    }
    const indexOf = (name: string) =>
      (BUSINESS_TABLES as readonly string[]).indexOf(name);
    expect(indexOf('LandNationalSync')).toBeLessThan(
      indexOf('LandChangeApplication'),
    );
    expect(indexOf('LandApplicationParcel')).toBeLessThan(
      indexOf('LandChangeApplication'),
    );
    expect(indexOf('LandApplicationParty')).toBeLessThan(
      indexOf('LandChangeApplication'),
    );
    expect(indexOf('LandApplicationParcel')).toBeLessThan(
      indexOf('LandParcel'),
    );
    expect(indexOf('LandApplicationParty')).toBeLessThan(indexOf('LandParty'));
    expect(indexOf('LandRight')).toBeLessThan(indexOf('LandParcel'));
    expect(indexOf('LandRight')).toBeLessThan(indexOf('LandParty'));
    expect(indexOf('LandEncumbrance')).toBeLessThan(indexOf('LandParcel'));
  });

  it('truncates land tables, scopes evidence to civicos-demo, keeps migrations', async () => {
    const { prisma, calls } = mockPrisma();
    await resetDemo(
      { DATABASE_URL: DEMO_URL, DEMO_RESET_CONFIRM: '1' },
      prisma as never,
    );
    expect(prisma.$executeRawUnsafe).toHaveBeenCalledOnce();
    const sql = calls.truncateSql[0] as string;
    for (const table of LAND_TABLES) {
      expect(sql).toContain(`"${table}"`);
    }
    expect(sql).not.toContain('_prisma_migrations');
    expect(prisma.evidence.findMany).toHaveBeenCalledOnce();
    expect(calls.evidenceWhere[0]).toMatchObject({
      where: { metadata: { path: ['demoNamespace'], equals: 'civicos-demo' } },
    });
  });

  it('re-running reset on empty inventory stays a deterministic no-op', async () => {
    const first = mockPrisma();
    await resetDemo(
      { DATABASE_URL: DEMO_URL, DEMO_RESET_CONFIRM: '1' },
      first.prisma as never,
    );
    const second = mockPrisma();
    await resetDemo(
      { DATABASE_URL: DEMO_URL, DEMO_RESET_CONFIRM: '1' },
      second.prisma as never,
    );
    expect(second.calls.truncateSql[0]).toBe(first.calls.truncateSql[0]);
  });

  it('evidence cleanup never leaves the storage root or touches tiles', async () => {
    const removed: string[] = [];
    await cleanupDemoEvidenceFiles(
      {
        remove: async (storageKey: string) => {
          removed.push(storageKey);
        },
      },
      ['/absolute/file.jpg', '../outside.jpg', '../../tiles/tile.pbf'],
    );
    expect(removed).toEqual([]);
  });
});
