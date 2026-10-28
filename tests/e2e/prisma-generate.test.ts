import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ensurePrismaGenerated } from '../../scripts/e2e/prisma-generate.mjs';

const dirs: string[] = [];
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'prisma-generate-'));
  dirs.push(root);
  await mkdir(join(root, 'prisma'));
  await writeFile(join(root, 'prisma', 'schema.prisma'), 'datasource db {}');
  return root;
}

afterEach(async () => {
  await Promise.all(
    dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe('ensurePrismaGenerated', () => {
  it('skips generation when stamp and client are current', async () => {
    const root = await fixture();
    await mkdir(join(root, 'node_modules', '.prisma', 'client'), {
      recursive: true,
    });
    const { createHash } = await import('node:crypto');
    const fingerprint = createHash('sha256')
      .update('datasource db {}')
      .digest('hex');
    await writeFile(
      join(root, 'node_modules', '.prisma', '.prisma-generate.stamp'),
      fingerprint,
    );
    let calls = 0;
    await ensurePrismaGenerated({
      root,
      runGenerate: async () => {
        calls++;
      },
    });
    expect(calls).toBe(0);
  });

  it('generates for a missing client and writes the schema fingerprint stamp', async () => {
    const root = await fixture();
    let calls = 0;
    await ensurePrismaGenerated({
      root,
      runGenerate: async () => {
        calls++;
        await mkdir(join(root, 'node_modules', '.prisma', 'client'), {
          recursive: true,
        });
      },
    });
    const { createHash } = await import('node:crypto');
    expect(calls).toBe(1);
    expect(
      await readFile(
        join(root, 'node_modules', '.prisma', '.prisma-generate.stamp'),
        'utf8',
      ),
    ).toBe(createHash('sha256').update('datasource db {}').digest('hex'));
  });

  it('serializes concurrent callers to one generation', async () => {
    const root = await fixture();
    let calls = 0;
    const generate = async () => {
      calls++;
      await new Promise((resolve) => setTimeout(resolve, 30));
      await mkdir(join(root, 'node_modules', '.prisma', 'client'), {
        recursive: true,
      });
    };
    await Promise.all([
      ensurePrismaGenerated({ root, runGenerate: generate }),
      ensurePrismaGenerated({ root, runGenerate: generate }),
    ]);
    expect(calls).toBe(1);
  });
});
