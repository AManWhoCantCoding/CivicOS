import { createHash, randomUUID } from 'node:crypto';
import {
  mkdir,
  open,
  readFile,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';

const LOCK = 'prisma-generate.lock';
const STAMP = '.prisma-generate.stamp';

export async function ensurePrismaGenerated({
  root = process.cwd(),
  runGenerate,
}) {
  if (typeof runGenerate !== 'function')
    throw new TypeError('runGenerate must be a function');
  const prismaDir = join(root, 'node_modules', '.prisma');
  const clientDir = join(prismaDir, 'client');
  const stampPath = join(prismaDir, STAMP);
  const lockPath = join(prismaDir, LOCK);
  const fingerprint = createHash('sha256')
    .update(await readFile(join(root, 'prisma', 'schema.prisma')))
    .digest('hex');
  const ready = async () => {
    try {
      return (
        (await stat(clientDir)).isDirectory() &&
        (await readFile(stampPath, 'utf8')).trim() === fingerprint
      );
    } catch {
      return false;
    }
  };
  if (await ready()) return;
  await mkdir(prismaDir, { recursive: true });
  const token = randomUUID().replaceAll('-', '');
  const deadline = Date.now() + 300_000;
  while (true) {
    try {
      const handle = await open(lockPath, 'wx');
      await handle.writeFile(JSON.stringify({ pid: process.pid, token }));
      await handle.close();
      break;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      try {
        if (Date.now() - (await stat(lockPath)).mtimeMs > 600_000) {
          const owner = JSON.parse(await readFile(lockPath, 'utf8'));
          try {
            process.kill(Number(owner.pid), 0);
          } catch (probeError) {
            if (probeError.code === 'ESRCH') {
              await unlink(lockPath);
              continue;
            }
          }
        }
      } catch {
        /* Match Python: malformed or unreadable lock is not reclaimed. */
      }
      if (Date.now() >= deadline)
        throw new Error(
          `Timed out waiting for Prisma generate lock: ${lockPath}`,
        );
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  try {
    if (await ready()) return;
    let lastError;
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        await runGenerate();
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error;
        if (!/EPERM|EBUSY/.test(String(error)) || attempt === 5) throw error;
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(2 ** attempt, 15) * 1000),
        );
      }
    }
    if (lastError) throw lastError;
    try {
      await writeFile(stampPath, fingerprint);
    } catch {
      /* Python's stamp write is best-effort. */
    }
  } finally {
    try {
      const owner = JSON.parse(await readFile(lockPath, 'utf8'));
      if (owner.pid === process.pid && owner.token === token)
        await unlink(lockPath);
    } catch {
      /* Never remove a lock we cannot prove is ours. */
    }
  }
}
