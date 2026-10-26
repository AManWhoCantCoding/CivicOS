import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

import { cleanupDemoEvidenceFiles } from '@/modules/platform/evidence/storage-adapter';
import { BUSINESS_TABLES, resetDemo } from '../../scripts/demo/reset';
import { dbNameFromUrl } from '../../scripts/demo/demo-db';

const enabled = process.env.RUN_DB_TESTS === '1';
const demoUrl = process.env.DEMO_DATABASE_URL ?? process.env.DATABASE_URL;
const testDatabaseUrl =
  process.env.CIVICOS_TEST_DATABASE_URL ?? process.env.CIVICOS_E2E_DATABASE_URL;
const civicosUrl = process.env.CIVICOS_DATABASE_URL;

const applicationModels: readonly string[] = BUSINESS_TABLES;

// Tạo thư mục per-run duy nhất: mkdir KHÔNG recursive (throw EEXIST nếu tên
// đã tồn tại) nên run này sở hữu chắc chắn một thư mục mới, không trùng với
// nội dung evidence có sẵn.
async function createRunRoot(parent: string): Promise<string> {
  await mkdir(parent, { recursive: true });
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = path.join(
      parent,
      `demo-reset-integration-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
    );
    try {
      await mkdir(candidate);
      return candidate;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
  }
  throw new Error('demo reset integration: het ten thu muc run unique');
}

describe.skipIf(!enabled)('demo reset integration', () => {
  let prisma: PrismaClient;
  let civicos: PrismaClient;

  beforeAll(async () => {
    if (!demoUrl) {
      throw new Error(
        'DATABASE_URL or DEMO_DATABASE_URL is required for demo reset integration',
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
    // Fail-closed boundary (dbNameFromUrl tu choi scheme khong phai PostgreSQL):
    // - demoUrl phai tro dung target demo canonical "civicos";
    // - civicosUrl (snapshot chi doc) phai la primary "civicos";
    // - client test duoc inject KHONG duoc la "civicos".
    expect(dbNameFromUrl(demoUrl)).toBe('civicos');
    expect(dbNameFromUrl(civicosUrl)).toBe('civicos');
    const testDbName = dbNameFromUrl(testDatabaseUrl);
    expect(testDbName).not.toBe('civicos');
    prisma = new PrismaClient({
      datasources: { db: { url: testDatabaseUrl } },
    });
    civicos = new PrismaClient({
      datasources: { db: { url: civicosUrl } },
    });
    const database = await prisma.$queryRaw<[{ database: string }]>`
      SELECT current_database() AS database
    `;
    expect(database[0]?.database).toBe(testDbName);
    expect(database[0]?.database).not.toBe('civicos');
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
    const runRoot = await createRunRoot(evidenceRoot);
    const runId = path.basename(runRoot);
    const demoKey = `${runId}/demo/resource/file.jpg`;
    const otherKey = `${runId}/other/resource/file.jpg`;
    // Tile fixture cung per-run unique: chi ghi/tao dung tep nay.
    const tilePath = path.join(tileRoot, `${runId}.pbf`);
    await mkdir(path.join(runRoot, 'demo', 'resource'), { recursive: true });
    await mkdir(path.join(runRoot, 'other', 'resource'), { recursive: true });
    await mkdir(tileRoot, { recursive: true });
    await writeFile(path.join(runRoot, 'demo', 'resource', 'file.jpg'), 'demo');
    await writeFile(path.join(runRoot, 'other', 'resource', 'file.jpg'), 'other');
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
      // Chi don dep dung fixture cua run nay: thu muc run duy nhat + dung tep
      // tile. Khong rm storage/tiles, storage/evidence goc hay thu muc nao co
      // noi dung san.
      await rm(runRoot, { recursive: true, force: true });
      await rm(tilePath, { force: true });
    }
  });

  it('chay lap lai tren database demo rong thanh no-op', async () => {
    await resetDemo({ DATABASE_URL: demoUrl, DEMO_RESET_CONFIRM: '1' }, prisma);
    await resetDemo({ DATABASE_URL: demoUrl, DEMO_RESET_CONFIRM: '1' }, prisma);
    expect(await prisma.user.count()).toBe(0);
  });

  it('chi mutate target demo (civicos) va giu snapshot civicos', async () => {
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

// T-007 AC-3 operator reset boundary: the web runner never imports or calls
// the destructive reset, and a settled mutation ends cleanup-pending through
// the existing stopping state. No database is touched here.
describe('T-007 operator reset boundary without a database', () => {
  it('keeps reset operator-only: no runner or DemoCenter reset path', () => {
    for (const file of [
      'src/modules/demo/live-mutation.ts',
      'src/modules/demo/runner.ts',
      'src/modules/demo/web-actions.ts',
      'src/components/demo/DemoCenter.tsx',
    ]) {
      const source = readFileSync(path.join(process.cwd(), file), 'utf8');
      expect(source).not.toContain('resetDemo');
      expect(source).not.toContain('scripts/demo/reset');
      expect(source).not.toContain('demo:reset');
    }
    const runner = readFileSync(
      path.join(process.cwd(), 'src/modules/demo/runner.ts'),
      'utf8',
    );
    expect(runner).toContain('completed-with-cleanup-pending');
  });
});
