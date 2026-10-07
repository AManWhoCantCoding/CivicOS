import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

import { cleanupDemoEvidenceFiles } from '@/modules/platform/evidence/storage-adapter';
import { BUSINESS_TABLES, resetDemo } from '../../scripts/demo/reset';

const enabled = process.env.RUN_DB_TESTS === '1';
const demoUrl = process.env.DEMO_DATABASE_URL ?? process.env.DATABASE_URL;
const testDatabaseUrl =
  process.env.CIVICOS_TEST_DATABASE_URL ?? process.env.CIVICOS_E2E_DATABASE_URL;
const civicosUrl = process.env.CIVICOS_DATABASE_URL;

const applicationModels: readonly string[] = BUSINESS_TABLES;

describe.skipIf(!enabled)('demo reset integration', () => {
  let prisma: PrismaClient;
  let civicos: PrismaClient;

  beforeAll(async () => {
    if (!demoUrl) {
      throw new Error(
        'CIVICOS_DATABASE_URL or DEMO_DATABASE_URL is required for demo reset integration',
      );
    }
    if (!testDatabaseUrl) {
      throw new Error(
        'CIVICOS_TEST_DATABASE_URL or CIVICOS_E2E_DATABASE_URL is required for demo reset integration',
      );
    }
    if (!civicosUrl) {
      throw new Error(
        'CIVICOS_DATABASE_URL is required for demo reset integration',
      );
    }
    expect(new URL(demoUrl).pathname).toMatch(/\/civicos_demo$/);
    expect(new URL(civicosUrl).pathname).not.toMatch(/\/civicos_demo$/);
    prisma = new PrismaClient({
      datasources: { db: { url: testDatabaseUrl } },
    });
    civicos = new PrismaClient({
      datasources: { db: { url: civicosUrl } },
    });
    const database = await prisma.$queryRaw<[{ database: string }]>`
      SELECT current_database() AS database
    `;
    expect(database[0]?.database).not.toBe('civicos_demo');
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await civicos?.$disconnect();
  });

  it('clears every application model and preserves migration schema', async () => {
    await resetDemo(
      {
        DATABASE_URL: demoUrl,
        DEMO_RESET_CONFIRM: '1',
      },
      prisma,
    );

    for (const model of applicationModels) {
      const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count FROM "${model}"`,
      );
      expect(Number(rows[0]?.count ?? 0)).toBe(0);
    }
    expect(
      await prisma.$queryRaw<Array<{ exists: boolean }>>`
        SELECT to_regclass('_prisma_migrations') IS NOT NULL AS exists
      `,
    ).toEqual([{ exists: true }]);
  });

  it('dọn file Evidence demo, giữ file non-marker va tiles', async () => {
    const evidenceRoot = path.join(process.cwd(), 'storage', 'evidence');
    const tileRoot = path.join(process.cwd(), 'storage', 'tiles');
    const demoKey = 'demo/resource/file.jpg';
    const otherKey = 'other/resource/file.jpg';
    const tilePath = path.join(tileRoot, 'sentinel.pbf');
    await mkdir(path.join(evidenceRoot, 'demo/resource'), { recursive: true });
    await mkdir(path.join(evidenceRoot, 'other/resource'), { recursive: true });
    await mkdir(tileRoot, { recursive: true });
    await writeFile(path.join(evidenceRoot, demoKey), 'demo');
    await writeFile(path.join(evidenceRoot, otherKey), 'other');
    await writeFile(tilePath, 'tile');
    await prisma.evidence.createMany({
      data: [
        {
          resourceType: 'demo',
          resourceId: 'marker',
          storageKey: demoKey,
          originalHash: 'demo-marker-hash',
          mimeType: 'image/jpeg',
          fileName: 'file.jpg',
          sizeBytes: 4,
          capturedAt: new Date('2026-09-28T08:00:00.000Z'),
          metadata: { demoNamespace: 'civicos-demo' },
        },
        {
          resourceType: 'demo',
          resourceId: 'other',
          storageKey: otherKey,
          originalHash: 'demo-other-hash',
          mimeType: 'image/jpeg',
          fileName: 'file.jpg',
          sizeBytes: 5,
          capturedAt: new Date('2026-09-28T08:00:00.000Z'),
          metadata: { source: 'non-demo' },
        },
      ],
    });

    try {
      await resetDemo(
        { DATABASE_URL: demoUrl, DEMO_RESET_CONFIRM: '1' },
        prisma,
      );
      await expect(access(path.join(evidenceRoot, demoKey))).rejects.toThrow();
      await expect(
        access(path.join(evidenceRoot, otherKey)),
      ).resolves.toBeUndefined();
      await expect(access(tilePath)).resolves.toBeUndefined();
      const removed: string[] = [];
      await cleanupDemoEvidenceFiles(
        {
          remove: async (storageKey) => {
            removed.push(storageKey);
          },
        },
        ['/absolute/file.jpg', '../outside.jpg', '../../tiles/tile.pbf'],
      );
      expect(removed).toEqual([]);
    } finally {
      await rm(path.join(evidenceRoot, 'demo'), {
        recursive: true,
        force: true,
      });
      await rm(path.join(evidenceRoot, 'other'), {
        recursive: true,
        force: true,
      });
      await rm(tileRoot, { recursive: true, force: true });
    }
  });

  it('chay lap lai tren database demo rong thanh no-op', async () => {
    await resetDemo({ DATABASE_URL: demoUrl, DEMO_RESET_CONFIRM: '1' }, prisma);
    await resetDemo({ DATABASE_URL: demoUrl, DEMO_RESET_CONFIRM: '1' }, prisma);
    expect(await prisma.user.count()).toBe(0);
  });

  it('chi mutate civicos_demo va giu snapshot civicos', async () => {
    const before = await civicos.$queryRaw<
      Array<{ database: string; users: bigint }>
    >`SELECT current_database() AS database, COUNT(*)::bigint AS users FROM "User"`;
    const sentinel = await civicos.user.findFirst({ orderBy: { id: 'asc' } });
    await resetDemo({ DATABASE_URL: demoUrl, DEMO_RESET_CONFIRM: '1' }, prisma);
    const after = await civicos.$queryRaw<
      Array<{ database: string; users: bigint }>
    >`SELECT current_database() AS database, COUNT(*)::bigint AS users FROM "User"`;
    expect(after).toEqual(before);
    expect(await civicos.user.findFirst({ orderBy: { id: 'asc' } })).toEqual(
      sentinel,
    );
  });
});
