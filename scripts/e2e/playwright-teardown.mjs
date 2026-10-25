import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export default async function globalTeardown() {
  const runId = process.env.CIVICOS_E2E_RUN_ID;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      runId ?? '',
    )
  ) {
    throw new Error('Invalid E2E run ID');
  }

  const directory = resolve(
    process.cwd(),
    '.brain/evidence/03-ps-e1005-intake-report/logs',
  );
  const paths = ['started', 'stop', 'done'].map((name) =>
    resolve(directory, `${runId}.${name}`),
  );
  const [started, stop, done] = paths;
  if (existsSync(started)) {
    try {
      mkdirSync(directory, { recursive: true });
      writeFileSync(stop, 'stop\n', { flag: 'wx' });
      const deadline = Date.now() + 30_000;
      while (!existsSync(done) && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (!existsSync(done))
        throw new Error('Timed out waiting for E2E service cleanup');
      if (
        (await import('node:fs')).readFileSync(done, 'utf8').trim() !== 'ok'
      ) {
        throw new Error('E2E service cleanup failed');
      }
    } finally {
      for (const path of paths) rmSync(path, { force: true });
    }
  }
}
